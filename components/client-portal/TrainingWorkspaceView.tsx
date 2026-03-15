import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Clock, Dumbbell, Loader2, PlayCircle, Save, CheckCircle2, CalendarDays, Star, ClipboardCheck, Pause, Play, RotateCcw, ExternalLink, Volume2, VolumeX, Footprints, Camera, FileText } from 'lucide-react';
import { ClientActivityLog, ClientDayLog, ProgramActivity, ProgramDay, WorkoutExercise } from '../../types';
import { trainingService } from '../../services/trainingService';
import { ExerciseMediaUtils } from '../../utils/exerciseMedia';
import { ClientWorkoutHistory } from '../training/ClientWorkoutHistory';

interface TrainingWorkspaceViewProps {
  clientId: string;
  onBack?: () => void;
  embedded?: boolean;
}

interface ExerciseSetEntry {
  done: boolean;
  reps: string;
  weight: string;
}

interface ActivityEntry {
  done: boolean;
  notes: string;
}

interface ExerciseGroup {
  type: 'single' | 'superset';
  id: string;
  items: WorkoutExercise[];
}

interface GuidedExerciseStep {
  key: string;
  exerciseId: string;
  blockId: string;
  blockName: string;
  exerciseName: string;
  roundIndex: number | null;
  restSeconds: number;
  completed: boolean;
}

interface VideoState {
  embedUrl: string;
  externalUrl?: string;
  title: string;
}

const dayName = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

const blockStructureLabel: Record<string, string> = {
  lineal: 'Lineal',
  superserie: 'Superserie',
  circuito: 'Circuito',
};

const calendarDayShort = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const activityTypeMeta: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  workout: { icon: Dumbbell, color: 'text-sea-700', bg: 'bg-sea-100', label: 'Entrenamiento' },
  walking: { icon: Footprints, color: 'text-pink-700', bg: 'bg-pink-100', label: 'Caminata' },
  metrics: { icon: Star, color: 'text-amber-700', bg: 'bg-amber-100', label: 'Metricas' },
  photo: { icon: Camera, color: 'text-cyan-700', bg: 'bg-cyan-100', label: 'Foto' },
  form: { icon: FileText, color: 'text-indigo-700', bg: 'bg-indigo-100', label: 'Formulario' },
  custom: { icon: CalendarDays, color: 'text-violet-700', bg: 'bg-violet-100', label: 'Tarea' },
};

const getIsoDay = () => {
  const today = new Date().getDay();
  return today === 0 ? 7 : today;
};

const getCurrentWeekNumber = (startDate: string, weeksCount: number) => {
  const start = new Date(startDate);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.floor(Math.max(0, diffDays) / 7) + 1;
  return Math.max(1, Math.min(week, Math.max(1, weeksCount || 1)));
};

const getExerciseTargetSets = (exercise: WorkoutExercise) => (
  exercise.superset_id ? (exercise.superset_rounds || exercise.sets || 3) : (exercise.sets || 3)
);

const groupBlockExercises = (exercises: WorkoutExercise[]): ExerciseGroup[] => {
  const groups: ExerciseGroup[] = [];

  exercises.forEach((exercise) => {
    if (exercise.superset_id) {
      const existing = groups.find((group) => group.type === 'superset' && group.id === exercise.superset_id);
      if (existing) {
        existing.items.push(exercise);
      } else {
        groups.push({ type: 'superset', id: exercise.superset_id, items: [exercise] });
      }
      return;
    }

    groups.push({ type: 'single', id: exercise.id, items: [exercise] });
  });

  return groups;
};

const getBlockRounds = (exercises: WorkoutExercise[]) => {
  if (!exercises || exercises.length === 0) return 1;
  return Math.max(1, ...exercises.map(getExerciseTargetSets));
};

const formatSeconds = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const isExerciseFullyDone = (exercise: WorkoutExercise, sets: ExerciseSetEntry[]) => {
  const targetSets = getExerciseTargetSets(exercise);
  if (sets.length === 0) return false;
  const doneSets = sets.slice(0, targetSets).filter((setEntry) => setEntry.done).length;
  return doneSets >= targetSets;
};

export function TrainingWorkspaceView({ clientId, onBack, embedded = false }: TrainingWorkspaceViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wakeLockRef = React.useRef<WakeLockSentinel | null>(null);

  // Wake Lock: mantener pantalla encendida durante entrenamiento
  useEffect(() => {
    let released = false;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => { wakeLockRef.current = null; });
        }
      } catch { /* silenciar */ }
    };
    requestWakeLock();
    const handleVisibility = () => { if (document.visibilityState === 'visible' && !released) requestWakeLock(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) { wakeLockRef.current.release().catch(() => {}); wakeLockRef.current = null; }
    };
  }, []);

  const [programDays, setProgramDays] = useState<ProgramDay[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [completedDayIds, setCompletedDayIds] = useState<Set<string>>(new Set());

  const [effort, setEffort] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState<string>('');

  const [exerciseState, setExerciseState] = useState<Record<string, ExerciseSetEntry[]>>({});
  const [activityState, setActivityState] = useState<Record<string, ActivityEntry>>({});
  const [videoState, setVideoState] = useState<VideoState | null>(null);
  const [blockRoundState, setBlockRoundState] = useState<Record<string, number>>({});
  const [supersetRoundState, setSupersetRoundState] = useState<Record<string, number>>({});
  const [restSeconds, setRestSeconds] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [restSoundEnabled, setRestSoundEnabled] = useState(true);
  const [activeStepKey, setActiveStepKey] = useState<string>('');
  const [focusMode, setFocusMode] = useState(true);

  const selectedDay = useMemo(
    () => programDays.find((day) => day.id === selectedDayId),
    [programDays, selectedDayId]
  );

  useEffect(() => {
    if (!restRunning || restSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRestSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setRestRunning(false);
          if (restSoundEnabled && typeof window !== 'undefined' && 'AudioContext' in window) {
            const audioCtx = new window.AudioContext();
            const oscillator = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            oscillator.connect(gain);
            gain.connect(audioCtx.destination);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.18);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [restRunning, restSeconds, restSoundEnabled]);

  const loadTrainingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await trainingService.getClientProgram(clientId);
      if (!payload) {
        setProgramDays([]);
        setSelectedDayId('');
        return;
      }

      const sortedDays = (payload.program.days || []).sort((a, b) => {
        if (a.week_number !== b.week_number) return a.week_number - b.week_number;
        return a.day_number - b.day_number;
      });

      setProgramDays(sortedDays);

      const allDayLogs = await trainingService.getClientAllDayLogs(clientId);
      setCompletedDayIds(new Set(allDayLogs.map((log) => log.day_id)));

      const currentWeek = getCurrentWeekNumber(payload.assignment.start_date, payload.program.weeks_count);
      setSelectedWeek(currentWeek);
      const todayIsoDay = getIsoDay();

      const todayDay = sortedDays.find(d => d.week_number === currentWeek && d.day_number === todayIsoDay)
        || sortedDays.find(d => d.week_number === currentWeek)
        || sortedDays[0];

      setSelectedDayId(todayDay?.id || '');
    } catch (err) {
      console.error('Error loading training workspace:', err);
      setError('No se pudo cargar tu plan de entrenamiento.');
    } finally {
      setLoading(false);
    }
  };

  const initDayState = async (day: ProgramDay) => {
    try {
      const [dayLog, activityLogs] = await Promise.all([
        trainingService.getClientDayLog(clientId, day.id),
        trainingService.getClientActivityLogs(clientId, day.id),
      ]);

      setEffort(dayLog?.effort_rating ? String(dayLog.effort_rating) : '');
      setNotes(dayLog?.notes || '');
      setDuration(dayLog?.duration_minutes ? String(dayLog.duration_minutes) : '');

      const exerciseMap: Record<string, ExerciseSetEntry[]> = {};
      const logMap = new Map((dayLog?.exercises || []).map((entry) => [entry.workout_exercise_id, entry]));

      (day.activities || []).forEach((activity) => {
        if (activity.type === 'workout' && activity.workout) {
          activity.workout.blocks.forEach(block => {
            block.exercises.forEach((exercise: WorkoutExercise) => {
              const targetSets = exercise.superset_id ? (exercise.superset_rounds || exercise.sets || 3) : (exercise.sets || 3);
              const existing = logMap.get(exercise.id);
              const repsArr = (existing?.reps_completed || '').split(',').map(v => v.trim());
              const weightArr = (existing?.weight_used || '').split(',').map(v => v.trim());

              exerciseMap[exercise.id] = Array.from({ length: targetSets }).map((_, idx) => ({
                done: existing?.is_completed ? true : Boolean(repsArr[idx] || weightArr[idx]),
                reps: repsArr[idx] || '',
                weight: weightArr[idx] || '',
              }));
            });
          });
        }
      });

      const activityMap: Record<string, ActivityEntry> = {};
      const activityLogMap = new Map(activityLogs.map((a: ClientActivityLog) => [a.activity_id, a]));
      (day.activities || []).forEach((activity) => {
        if (activity.type !== 'workout') {
          const current = activityLogMap.get(activity.id);
          activityMap[activity.id] = {
            done: Boolean(current?.completed_at),
            notes: String(current?.data?.notes || ''),
          };
        }
      });

      setExerciseState(exerciseMap);
      setActivityState(activityMap);
      setBlockRoundState({});
      setSupersetRoundState({});
      setRestSeconds(0);
      setRestRunning(false);
      setActiveStepKey('');
    } catch (err) {
      console.error('Error initializing day state:', err);
    }
  };

  useEffect(() => {
    loadTrainingData();
  }, [clientId]);

  useEffect(() => {
    if (selectedDay) initDayState(selectedDay);
  }, [selectedDayId]);

  useEffect(() => {
    if (!programDays.length) return;
    const currentSelected = programDays.find((day) => day.id === selectedDayId);
    if (currentSelected && currentSelected.week_number === selectedWeek) return;

    const firstDayInWeek = programDays.find((day) => day.week_number === selectedWeek)
      || programDays[0];
    if (firstDayInWeek?.id) {
      setSelectedDayId(firstDayInWeek.id);
    }
  }, [selectedWeek, programDays, selectedDayId]);

  const getExerciseSets = (exercise: WorkoutExercise): ExerciseSetEntry[] => {
    const existingSets = exerciseState[exercise.id];
    if (existingSets) return existingSets;
    const targetSets = getExerciseTargetSets(exercise);
    return Array.from({ length: targetSets }).map(() => ({ done: false, reps: '', weight: '' }));
  };

  const updateExerciseSet = (
    exercise: WorkoutExercise,
    setIndex: number,
    changes: Partial<ExerciseSetEntry>
  ) => {
    setExerciseState((prev) => {
      const existingSets = prev[exercise.id] || getExerciseSets(exercise);
      const nextSets = [...existingSets];
      const current = nextSets[setIndex] || { done: false, reps: '', weight: '' };
      nextSets[setIndex] = { ...current, ...changes };
      return { ...prev, [exercise.id]: nextSets };
    });

    if (changes.done === true) {
      startRestTimer(exercise.rest_seconds || 60);
    }
  };

  const isExerciseRoundDone = (exercise: WorkoutExercise, roundIndex: number) => {
    const setEntry = getExerciseSets(exercise)[roundIndex];
    return Boolean(setEntry?.done);
  };

  const guidedSteps = useMemo<GuidedExerciseStep[]>(() => {
    if (!selectedDay) return [];
    const steps: GuidedExerciseStep[] = [];
    let stopAfterPendingBlock = false;

    for (const activity of (selectedDay.activities || [])) {
      if (activity.type !== 'workout' || !activity.workout) continue;
      if (stopAfterPendingBlock) break;

      for (const block of activity.workout.blocks) {
        if (stopAfterPendingBlock) break;
        const structureType = (block as any).structure_type || 'lineal';

        if (structureType === 'superserie') {
          const groups = groupBlockExercises(block.exercises || []);

          for (const group of groups) {
            if (group.type === 'single') {
              const exercise = group.items[0];
              const sets = getExerciseSets(exercise);
              const singleStep: GuidedExerciseStep = {
                key: `${block.id}:${exercise.id}`,
                exerciseId: exercise.id,
                blockId: block.id,
                blockName: block.name,
                exerciseName: exercise.exercise?.name || 'Ejercicio',
                roundIndex: null,
                restSeconds: exercise.rest_seconds || 60,
                completed: isExerciseFullyDone(exercise, sets),
              };
              steps.push(singleStep);
              if (!singleStep.completed) {
                stopAfterPendingBlock = true;
                break;
              }
              continue;
            }

            const rounds = Math.max(1, ...group.items.map(getExerciseTargetSets));
            let firstIncompleteRound = 0;
            for (let round = 0; round < rounds; round += 1) {
              const roundDone = group.items.every((exercise) => isExerciseRoundDone(exercise, round));
              if (!roundDone) {
                firstIncompleteRound = round;
                break;
              }
              firstIncompleteRound = round;
            }

            const supersetKey = `${block.id}:${group.id}`;
            group.items.forEach((exercise) => {
              steps.push({
                key: `${supersetKey}:${exercise.id}:${firstIncompleteRound}`,
                exerciseId: exercise.id,
                blockId: block.id,
                blockName: block.name,
                exerciseName: exercise.exercise?.name || 'Ejercicio',
                roundIndex: firstIncompleteRound,
                restSeconds: exercise.rest_seconds || 60,
                completed: isExerciseRoundDone(exercise, firstIncompleteRound),
              });
            });

            const pendingInThisSuperset = group.items.some((exercise) => !isExerciseRoundDone(exercise, firstIncompleteRound));
            if (pendingInThisSuperset) {
              stopAfterPendingBlock = true;
              break;
            }
          }

          continue;
        }

        if (structureType === 'circuito') {
          const rounds = getBlockRounds(block.exercises || []);
          let firstIncompleteRound = 0;
          for (let round = 0; round < rounds; round += 1) {
            const roundDone = (block.exercises || []).every((exercise) => isExerciseRoundDone(exercise, round));
            if (!roundDone) {
              firstIncompleteRound = round;
              break;
            }
            firstIncompleteRound = round;
          }

          (block.exercises || []).forEach((exercise) => {
            steps.push({
              key: `${block.id}:${exercise.id}:${firstIncompleteRound}`,
              exerciseId: exercise.id,
              blockId: block.id,
              blockName: block.name,
              exerciseName: exercise.exercise?.name || 'Ejercicio',
              roundIndex: firstIncompleteRound,
              restSeconds: exercise.rest_seconds || 60,
              completed: isExerciseRoundDone(exercise, firstIncompleteRound),
            });
          });

          const pendingInCircuitRound = (block.exercises || []).some((exercise) => !isExerciseRoundDone(exercise, firstIncompleteRound));
          if (pendingInCircuitRound) {
            stopAfterPendingBlock = true;
          }
          continue;
        }

        for (const exercise of (block.exercises || [])) {
          const sets = getExerciseSets(exercise);
          const linealStep: GuidedExerciseStep = {
            key: `${block.id}:${exercise.id}`,
            exerciseId: exercise.id,
            blockId: block.id,
            blockName: block.name,
            exerciseName: exercise.exercise?.name || 'Ejercicio',
            roundIndex: null,
            restSeconds: exercise.rest_seconds || 60,
            completed: isExerciseFullyDone(exercise, sets),
          };
          steps.push(linealStep);
          if (!linealStep.completed) {
            stopAfterPendingBlock = true;
            break;
          }
        }
      }
    }

    return steps;
  }, [selectedDay, blockRoundState, supersetRoundState, exerciseState]);

  useEffect(() => {
    if (guidedSteps.length === 0) {
      if (activeStepKey) setActiveStepKey('');
      return;
    }

    const hasCurrent = activeStepKey && guidedSteps.some((step) => step.key === activeStepKey);
    if (hasCurrent) return;

    // Key is stale (e.g. after round change) — find best match
    const firstPending = guidedSteps.find((step) => !step.completed);
    const fallback = firstPending || guidedSteps[guidedSteps.length - 1];
    if (fallback) setActiveStepKey(fallback.key);
  }, [guidedSteps, activeStepKey]);

  const trainingProgress = useMemo(() => {
    if (!selectedDay) return { percent: 0, completed: 0, total: 0, pendingText: '' };

    let totalExerciseSets = 0;
    let completedExerciseSets = 0;

    (selectedDay.activities || []).forEach((activity) => {
      if (activity.type !== 'workout' || !activity.workout) return;
      activity.workout.blocks.forEach((block) => {
        block.exercises.forEach((exercise) => {
          const targetSets = getExerciseTargetSets(exercise);
          const sets = getExerciseSets(exercise);
          totalExerciseSets += targetSets;
          completedExerciseSets += sets.slice(0, targetSets).filter((setEntry) => setEntry.done).length;
        });
      });
    });

    const nonWorkoutActivities = (selectedDay.activities || []).filter((activity) => activity.type !== 'workout');
    const totalActivities = nonWorkoutActivities.length;
    const completedActivities = nonWorkoutActivities.filter((activity) => activityState[activity.id]?.done).length;

    const total = totalExerciseSets + totalActivities;
    const completed = completedExerciseSets + completedActivities;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const pendingUnits = Math.max(0, total - completed);
    const pendingText = pendingUnits === 0
      ? 'Todo completado para hoy.'
      : `Te faltan ${pendingUnits} registro${pendingUnits === 1 ? '' : 's'} por completar.`;

    return { percent, completed, total, pendingText };
  }, [selectedDay, exerciseState, activityState, guidedSteps]);

  const currentStepIndex = useMemo(() => {
    if (!activeStepKey) return -1;
    return guidedSteps.findIndex((step) => step.key === activeStepKey);
  }, [guidedSteps, activeStepKey]);

  const activeStep = currentStepIndex >= 0 ? guidedSteps[currentStepIndex] : null;
  const nextPendingStep = currentStepIndex >= 0
    ? guidedSteps.slice(currentStepIndex + 1).find((step) => !step.completed) || null
    : guidedSteps.find((step) => !step.completed) || null;

  const weekNumbers = useMemo(
    () => [...new Set(programDays.map((day) => day.week_number))].sort((a, b) => a - b),
    [programDays]
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, idx) => {
      const dayNumber = idx + 1;
      const day = programDays.find((entry) => entry.week_number === selectedWeek && entry.day_number === dayNumber) || null;
      const activities = day?.activities || [];
      return {
        dayNumber,
        day,
        hasActivities: activities.length > 0,
        activities,
        isSelected: day?.id === selectedDayId,
        isCompleted: day ? completedDayIds.has(day.id) : false,
      };
    }),
    [programDays, selectedWeek, selectedDayId, completedDayIds]
  );

  const sessionSummary = useMemo(() => {
    const doneSteps = guidedSteps.filter((step) => step.completed).length;
    const totalSteps = guidedSteps.length;
    const completion = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
    const doneActivities = Object.values(activityState).filter((entry) => entry.done).length;
    return {
      doneSteps,
      totalSteps,
      completion,
      doneActivities,
    };
  }, [guidedSteps, activityState]);

  const completeGuidedStep = (step: GuidedExerciseStep) => {
    if (!selectedDay) return;

    let targetExercise: WorkoutExercise | null = null;
    let targetStructureType: 'lineal' | 'superserie' | 'circuito' = 'lineal';
    (selectedDay.activities || []).forEach((activity) => {
      if (activity.type !== 'workout' || !activity.workout || targetExercise) return;
      activity.workout.blocks.forEach((block) => {
        if (targetExercise) return;
        const found = (block.exercises || []).find((exercise) => exercise.id === step.exerciseId && block.id === step.blockId);
        if (found) {
          targetExercise = found;
          targetStructureType = ((block as any).structure_type || 'lineal') as 'lineal' | 'superserie' | 'circuito';
        }
      });
    });
    if (!targetExercise) return;

    const exercise = targetExercise;
    const targetSets = getExerciseTargetSets(exercise);

    const current = exerciseState[exercise.id] || Array.from({ length: targetSets }).map(() => ({ done: false, reps: '', weight: '' }));
    const nextSets = [...current];

    if (step.roundIndex !== null) {
      const idx = step.roundIndex;
      const currentEntry = nextSets[idx] || { done: false, reps: '', weight: '' };
      nextSets[idx] = { ...currentEntry, done: true };
    } else {
      for (let idx = 0; idx < targetSets; idx += 1) {
        const currentEntry = nextSets[idx] || { done: false, reps: '', weight: '' };
        nextSets[idx] = { ...currentEntry, done: true };
      }
    }

    const predictedExerciseState = { ...exerciseState, [exercise.id]: nextSets };
    setExerciseState(predictedExerciseState);

    if (step.roundIndex !== null) {
      if (targetStructureType === 'superserie') {
        const supersetKey = `${step.blockId}:${exercise.superset_id || ''}`;
        const block = (selectedDay.activities || [])
          .flatMap((activity) => activity.type === 'workout' && activity.workout ? activity.workout.blocks : [])
          .find((entry) => entry.id === step.blockId);
        const groupExercises = (block?.exercises || []).filter((entry) => entry.superset_id && entry.superset_id === exercise.superset_id);
        const allRoundDone = groupExercises.length > 0 && groupExercises.every((entry) => {
          const sets = predictedExerciseState[entry.id] || [];
          const round = step.roundIndex as number;
          return Boolean(sets[round]?.done);
        });
        if (allRoundDone) {
          const rounds = Math.max(1, ...groupExercises.map(getExerciseTargetSets));
          if ((step.roundIndex as number) < rounds - 1) {
            setSupersetRoundState((prev) => ({ ...prev, [supersetKey]: (step.roundIndex as number) + 1 }));
          }
        }
      }

      if (targetStructureType === 'circuito') {
        const block = (selectedDay.activities || [])
          .flatMap((activity) => activity.type === 'workout' && activity.workout ? activity.workout.blocks : [])
          .find((entry) => entry.id === step.blockId);
        const allRoundDone = (block?.exercises || []).length > 0 && (block?.exercises || []).every((entry) => {
          const sets = predictedExerciseState[entry.id] || [];
          const round = step.roundIndex as number;
          return Boolean(sets[round]?.done);
        });
        if (allRoundDone) {
          const rounds = getBlockRounds(block?.exercises || []);
          if ((step.roundIndex as number) < rounds - 1) {
            setBlockRoundState((prev) => ({ ...prev, [step.blockId]: (step.roundIndex as number) + 1 }));
          }
        }
      }
    }

    startRestTimer(step.restSeconds || 60);
    setActiveStepKey('');
  };

  const startRestTimer = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds || 0);
    setRestSeconds(safeSeconds);
    setRestRunning(safeSeconds > 0);
  };

  const renderExerciseCard = (exercise: WorkoutExercise, options?: {
    singleRound?: boolean;
    roundIndex?: number;
    label?: string;
    highlight?: 'superset' | 'circuit';
    stepKey?: string;
  }) => {
    const media = exercise.exercise;
    const thumbnail = media ? ExerciseMediaUtils.getThumbnail(media.media_url, media.media_type) : null;
    const embedUrl = media?.media_url && media?.media_type ? ExerciseMediaUtils.getEmbedUrl(media.media_url, media.media_type) : null;
    const externalUrl = media?.media_url;
    const allSets = getExerciseSets(exercise);
    const singleRound = options?.singleRound;
    const isActive = !!options?.stepKey && options.stepKey === activeStepKey;
    const fallbackKey = options?.stepKey || exercise.id;
    const canEdit = focusMode;

    if (focusMode && options?.stepKey && !isActive) {
      return null;
    }

    return (
      <div key={fallbackKey} className={`bg-slate-50 border rounded-xl p-3 transition-all ${isActive ? 'border-sea-400 ring-2 ring-sea-200' : 'border-slate-200'}`}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => {
              if (!embedUrl) return;
              setVideoState({
                embedUrl,
                externalUrl,
                title: exercise.exercise?.name || 'Video ejercicio',
              });
            }}
            className="w-20 h-14 rounded-lg overflow-hidden bg-slate-200 shrink-0 relative"
            disabled={!embedUrl}
          >
            {thumbnail ? <img src={thumbnail} alt={exercise.exercise?.name || 'Ejercicio'} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-300" />}
            {embedUrl && <PlayCircle className="w-5 h-5 text-white absolute bottom-1 right-1 drop-shadow" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-slate-800">{exercise.exercise?.name || 'Ejercicio'}</p>
              {options?.highlight === 'superset' && <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Superserie</span>}
              {options?.highlight === 'circuit' && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Circuito</span>}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Objetivo coach: {getExerciseTargetSets(exercise)} series · {exercise.reps} reps · descanso {exercise.rest_seconds || 60}s</p>
            {!embedUrl && (
              <p className="text-[11px] text-amber-700 mt-1">Sin video embebido disponible para este ejercicio.</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          {externalUrl ? (
            <button
              onClick={() => window.open(externalUrl, '_blank', 'noopener,noreferrer')}
              className="text-[11px] font-semibold text-sea-700 hover:text-sea-900 inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Abrir fuente del video
            </button>
          ) : <span className="text-[11px] text-slate-400">Sin enlace externo</span>}
          {options?.stepKey && !focusMode && (
            <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ${isActive ? 'bg-sea-100 text-sea-800' : 'bg-white text-slate-500 border border-slate-200'}`}>
              {isActive ? 'Paso actual' : 'Vista de referencia'}
            </span>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {singleRound && typeof options?.roundIndex === 'number' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-600 shrink-0">{options?.label || `Ronda ${options.roundIndex + 1}`}</span>
              <input
                value={(allSets[options.roundIndex] || { done: false, reps: '', weight: '' }).weight}
                onChange={(e) => {
                  if (!canEdit) return;
                  updateExerciseSet(exercise, options.roundIndex!, { weight: e.target.value });
                }}
                placeholder="Kg"
                className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                readOnly={!canEdit}
              />
              <input
                value={(allSets[options.roundIndex] || { done: false, reps: '', weight: '' }).reps}
                onChange={(e) => {
                  if (!canEdit) return;
                  updateExerciseSet(exercise, options.roundIndex!, { reps: e.target.value });
                }}
                placeholder="Reps"
                className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                readOnly={!canEdit}
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-600 ml-auto">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded"
                  checked={(allSets[options.roundIndex] || { done: false, reps: '', weight: '' }).done}
                  onChange={(e) => {
                    if (!canEdit) return;
                    updateExerciseSet(exercise, options.roundIndex!, { done: e.target.checked });
                  }}
                  disabled={!canEdit}
                />
                Hecha
              </label>
            </div>
          ) : (
            allSets.map((setEntry, idx) => (
              <div key={`${exercise.id}-${idx}`} className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-600 shrink-0">Serie {idx + 1}</span>
                <input
                  value={setEntry.weight}
                  onChange={(e) => {
                    if (!canEdit) return;
                    updateExerciseSet(exercise, idx, { weight: e.target.value });
                  }}
                  placeholder="Kg"
                  className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                  readOnly={!canEdit}
                />
                <input
                  value={setEntry.reps}
                  onChange={(e) => {
                    if (!canEdit) return;
                    updateExerciseSet(exercise, idx, { reps: e.target.value });
                  }}
                  placeholder="Reps"
                  className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                  readOnly={!canEdit}
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-600 ml-auto">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded"
                    checked={setEntry.done}
                    onChange={(e) => {
                      if (!canEdit) return;
                      updateExerciseSet(exercise, idx, { done: e.target.checked });
                    }}
                    disabled={!canEdit}
                  />
                  Hecha
                </label>
              </div>
            ))
          )}
        </div>

        {focusMode && isActive && activeStep && activeStep.key === options?.stepKey && (
          <div className="mt-3 flex gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={() => setActiveStepKey(guidedSteps[currentStepIndex - 1].key)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-sm font-bold"
              >
                Anterior
              </button>
            )}
            <button
              onClick={() => completeGuidedStep(activeStep)}
              className="flex-1 px-3 py-2 rounded-lg bg-sea-600 hover:bg-sea-700 text-white text-sm font-bold"
            >
              Realizado y siguiente
            </button>
          </div>
        )}
      </div>
    );
  };

  const saveSession = async () => {
    if (!selectedDay) return;
    if (!effort || Number(effort) < 1 || Number(effort) > 10) {
      alert('Debes registrar una valoración de esfuerzo entre 1 y 10.');
      return;
    }
    if (!notes.trim() || notes.trim().length < 8) {
      alert('Añade unas notas sobre cómo te has sentido al entrenar.');
      return;
    }

    try {
      setSaving(true);

      const exercisesToPersist: Array<Omit<any, 'id' | 'log_id'>> = [];

      (selectedDay.activities || []).forEach((activity) => {
        if (activity.type === 'workout' && activity.workout) {
          activity.workout.blocks.forEach(block => {
            block.exercises.forEach((exercise: WorkoutExercise) => {
              const setEntries = exerciseState[exercise.id] || [];
              const completedSets = setEntries.filter(set => set.done).length;
              exercisesToPersist.push({
                workout_exercise_id: exercise.id,
                sets_completed: completedSets,
                reps_completed: setEntries.map(set => set.reps || '').join(','),
                weight_used: setEntries.map(set => set.weight || '').join(','),
                is_completed: completedSets > 0 && completedSets === setEntries.length,
              });
            });
          });
        }
      });

      await trainingService.saveClientDayLog({
        client_id: clientId,
        day_id: selectedDay.id,
        completed_at: new Date().toISOString(),
        effort_rating: Number(effort),
        notes: notes.trim(),
        duration_minutes: duration ? Number(duration) : undefined,
      } as Omit<ClientDayLog, 'id'>, exercisesToPersist);

      const activitySaves = (selectedDay.activities || [])
        .filter(activity => activity.type !== 'workout')
        .map(activity => trainingService.saveClientActivityLog({
          client_id: clientId,
          activity_id: activity.id,
          day_id: selectedDay.id,
          completed_at: activityState[activity.id]?.done ? new Date().toISOString() : undefined,
          data: {
            done: activityState[activity.id]?.done || false,
            notes: activityState[activity.id]?.notes || '',
          }
        }));

      await Promise.all(activitySaves);
      alert('Entrenamiento guardado correctamente.');
      setCompletedDayIds((prev) => new Set([...prev, selectedDay.id]));
      await initDayState(selectedDay);
    } catch (err) {
      console.error('Error saving training session:', err);
      alert('No se pudo guardar el entrenamiento.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4">
        {!embedded && (
          <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sea-400 hover:text-sea-800 transition-colors font-bold group">
            <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
          </button>
        )}
        <div className="glass rounded-3xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-sea-500 mb-2" />
          <p className="text-sm text-sea-500">Cargando tu espacio de entrenamiento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!embedded && (
          <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sea-400 hover:text-sea-800 transition-colors font-bold group">
            <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
          </button>
        )}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>
      </div>
    );
  }

  if (!selectedDay || programDays.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!embedded && (
          <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sea-400 hover:text-sea-800 transition-colors font-bold group">
            <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
          </button>
        )}
        <div className="glass rounded-3xl p-8 text-center">
          <Dumbbell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500">Todavía no tienes un programa de entrenamiento asignado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 space-y-6">
      {!embedded && (
        <button onClick={onBack} className="flex items-center gap-2 text-sea-400 hover:text-sea-800 transition-colors font-bold group">
          <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
        </button>
      )}

      <div className="glass rounded-3xl p-5 md:p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-sea-900 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-sea-600" /> Mi Entrenamiento
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFocusMode((prev) => !prev)}
              className={`text-xs px-3 py-1 rounded-full font-semibold border transition-all ${focusMode ? 'bg-sea-600 border-sea-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              {focusMode ? 'Modo enfoque' : 'Ver todo (lectura)'}
            </button>
            <div className="text-xs text-sea-500 bg-sea-50 px-3 py-1 rounded-full font-semibold">
              {dayName[(selectedDay.day_number || 1) - 1]} · Semana {selectedDay.week_number}
            </div>
          </div>
        </div>

        {weekNumbers.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {weekNumbers.map((week) => (
              <button
                key={week}
                onClick={() => setSelectedWeek(week)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedWeek === week ? 'bg-sea-600 text-white border-sea-600' : 'bg-white text-slate-600 border-slate-200 hover:border-sea-300'}`}
              >
                Semana {week}
              </button>
            ))}
          </div>
        )}

        <div className="mb-4 bg-white border border-slate-200 rounded-2xl p-3">
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((dayEntry, idx) => {
              const day = dayEntry.day;
              const hasContent = dayEntry.hasActivities;
              const isSelected = dayEntry.isSelected;

              return (
                <button
                  key={`calendar-day-${idx}`}
                  onClick={() => day && setSelectedDayId(day.id)}
                  disabled={!day}
                  className={`relative rounded-xl p-2 min-h-[76px] text-left border transition-all ${isSelected
                    ? 'bg-sea-600 text-white border-sea-600'
                    : dayEntry.isCompleted
                      ? 'bg-emerald-50 border-emerald-200 text-slate-700'
                      : hasContent
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-sea-300'
                        : 'bg-white border-slate-100 text-slate-300'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase">{calendarDayShort[idx]}</span>
                    {dayEntry.isCompleted && <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {hasContent ? dayEntry.activities.slice(0, 3).map((activity, activityIdx) => {
                      const meta = activityTypeMeta[activity.type] || activityTypeMeta.custom;
                      const Icon = meta.icon;
                      return (
                        <span key={`act-${activityIdx}`} className={`w-5 h-5 rounded-md inline-flex items-center justify-center ${isSelected ? 'bg-white/20 text-white' : `${meta.bg} ${meta.color}`}`} title={meta.label}>
                          <Icon className="w-3 h-3" />
                        </span>
                      );
                    }) : <span className="text-[10px] text-slate-400">Descanso</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 bg-sea-50 border border-sea-100 rounded-2xl p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-sea-900">Progreso del entrenamiento</p>
              <span className="text-xs font-semibold text-sea-700">{trainingProgress.completed}/{trainingProgress.total} · {trainingProgress.percent}%</span>
            </div>
            <div className="mt-2 h-2.5 bg-white rounded-full overflow-hidden border border-sea-100">
              <div className="h-full bg-sea-500 transition-all duration-500" style={{ width: `${trainingProgress.percent}%` }} />
            </div>
            <p className="text-xs text-sea-700 mt-2">{trainingProgress.pendingText}</p>
            {activeStep && (
              <div className="mt-2 p-2.5 rounded-xl bg-white border border-sea-100">
                <p className="text-[11px] text-sea-600 font-semibold">Paso guiado actual</p>
                <p className="text-sm font-bold text-sea-900">{activeStep.exerciseName}</p>
                <p className="text-[11px] text-slate-500">
                  {activeStep.blockName}{activeStep.roundIndex !== null ? ` · ronda ${activeStep.roundIndex + 1}` : ''}
                </p>
                {nextPendingStep && nextPendingStep.key !== activeStep.key && (
                  <p className="text-[11px] text-slate-400 mt-1">Siguiente: {nextPendingStep.exerciseName}</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Descanso</p>
              <button
                onClick={() => setRestSoundEnabled((prev) => !prev)}
                className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center gap-1"
              >
                {restSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />} {restSoundEnabled ? 'Sonido on' : 'Sonido off'}
              </button>
            </div>
            <p className="mt-2 text-3xl font-black text-slate-900 tracking-tight">{formatSeconds(restSeconds)}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setRestRunning((prev) => !prev)}
                disabled={restSeconds === 0}
                className="px-2.5 py-1.5 rounded-md bg-sea-600 hover:bg-sea-700 text-white text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
              >
                {restRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />} {restRunning ? 'Pausar' : 'Iniciar'}
              </button>
              <button
                onClick={() => { setRestSeconds(0); setRestRunning(false); }}
                className="px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {[30, 45, 60].map((quick) => (
                <button
                  key={quick}
                  onClick={() => startRestTimer(quick)}
                  className="px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:border-sea-300"
                >
                  {quick}s
                </button>
              ))}
            </div>
            {activeStep && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500">Sugerido para este paso: {activeStep.restSeconds}s</p>
                <button
                  onClick={() => startRestTimer(activeStep.restSeconds)}
                  className="text-[11px] font-semibold text-sea-700 hover:text-sea-900"
                >
                  Aplicar sugerido
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {!focusMode && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-600 font-semibold">
              Vista de referencia: para mantener la secuencia del entrenamiento, el marcado de series y avance de pasos solo se permite en Modo enfoque.
            </div>
          )}

          {focusMode && !activeStep && guidedSteps.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <p className="text-emerald-700 text-sm font-semibold">Excelente. No quedan ejercicios pendientes en este dia.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFocusMode(false)} className="text-xs px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-700 font-semibold hover:bg-emerald-100">Ver todos los ejercicios</button>
                {guidedSteps.length > 0 && <button onClick={() => setActiveStepKey(guidedSteps[0].key)} className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 font-semibold hover:bg-slate-100">Volver al inicio</button>}
              </div>
            </div>
          )}

          {(selectedDay.activities || []).map((activity: ProgramActivity) => {
            if (activity.type === 'workout' && activity.workout) {
              const activityHasActiveStep = !!activeStep && activity.workout.blocks.some((block) =>
                block.id === activeStep.blockId && block.exercises.some((exercise) => exercise.id === activeStep.exerciseId)
              );

              if (focusMode && activeStep && !activityHasActiveStep) {
                return null;
              }

              return (
                <div key={activity.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <h3 className="font-bold text-slate-800">{activity.title || activity.workout.name}</h3>

                  {activity.workout.blocks.map(block => {
                    const structureType = (block as any).structure_type || 'lineal';

                    if (focusMode && activeStep && activeStep.blockId !== block.id) {
                      return null;
                    }

                    const groupedExercises = groupBlockExercises(block.exercises || []);
                    const blockRounds = getBlockRounds(block.exercises || []);
                    const currentBlockRound = Math.min(blockRoundState[block.id] || 0, Math.max(0, blockRounds - 1));
                    const completedCircuitRounds = Array.from({ length: blockRounds }).filter((_, roundIdx) =>
                      (block.exercises || []).every((exercise) => isExerciseRoundDone(exercise, roundIdx))
                    ).length;
                    const allCircuitRoundsComplete = completedCircuitRounds === blockRounds;

                    return (
                      <div key={block.id} className="border border-slate-100 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">{block.name}</p>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {blockStructureLabel[structureType] || 'Lineal'}
                          </span>
                        </div>

                        {structureType === 'superserie' ? (
                          <div className="space-y-3">
                            {groupedExercises.map((group) => {
                              if (group.type === 'single') {
                                return renderExerciseCard(group.items[0], {
                                  stepKey: `${block.id}:${group.items[0].id}`,
                                });
                              }

                              const rounds = Math.max(1, ...group.items.map(getExerciseTargetSets));
                              const supersetKey = `${block.id}:${group.id}`;
                              const currentRound = Math.min(supersetRoundState[supersetKey] || 0, Math.max(0, rounds - 1));
                              const completedRounds = Array.from({ length: rounds }).filter((_, roundIdx) =>
                                group.items.every((exercise) => isExerciseRoundDone(exercise, roundIdx))
                              ).length;
                              const allRoundsComplete = completedRounds === rounds;

                              return (
                                <div key={supersetKey} className="bg-white border border-violet-200 rounded-xl p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-violet-700">Superserie</span>
                                    <span className="text-[10px] font-bold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">Ronda {currentRound + 1}/{rounds}</span>
                                  </div>

                                  {!focusMode && (
                                    <div className="flex items-center justify-center gap-2 mb-3">
                                      {Array.from({ length: rounds }).map((_, roundIdx) => {
                                        const thisRoundDone = group.items.every((exercise) => isExerciseRoundDone(exercise, roundIdx));
                                        return (
                                          <span
                                            key={`${supersetKey}-dot-${roundIdx}`}
                                            className={`w-7 h-7 rounded-full text-[11px] font-bold transition-all ${roundIdx === currentRound
                                              ? 'bg-violet-600 text-white'
                                              : thisRoundDone
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-500'
                                              }`}
                                          >
                                            {roundIdx + 1}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    {group.items.map((exercise) => renderExerciseCard(exercise, {
                                      singleRound: true,
                                      roundIndex: currentRound,
                                      label: `Ronda ${currentRound + 1}`,
                                      highlight: 'superset',
                                      stepKey: `${supersetKey}:${exercise.id}:${currentRound}`,
                                    }))}
                                  </div>

                                  {!focusMode && allRoundsComplete && (
                                    <div className="mt-3 w-full px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-bold text-center">
                                      Superserie completada ({completedRounds}/{rounds})
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : structureType === 'circuito' ? (
                          <div className="space-y-3">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-black uppercase tracking-widest text-amber-700">Circuito</span>
                                <span className="text-[10px] font-bold bg-white text-amber-700 px-2 py-0.5 rounded-full">Vuelta {currentBlockRound + 1}/{blockRounds}</span>
                              </div>
                              {!focusMode && (
                                <div className="flex items-center justify-center gap-2">
                                  {Array.from({ length: blockRounds }).map((_, roundIdx) => {
                                    const thisRoundDone = (block.exercises || []).every((exercise) => isExerciseRoundDone(exercise, roundIdx));
                                    return (
                                      <span
                                        key={`${block.id}-round-${roundIdx}`}
                                        className={`w-7 h-7 rounded-full text-[11px] font-bold transition-all ${roundIdx === currentBlockRound
                                          ? 'bg-amber-600 text-white'
                                          : thisRoundDone
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-white text-slate-500 border border-amber-200'
                                          }`}
                                      >
                                        {roundIdx + 1}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {(block.exercises || []).map((exercise) => renderExerciseCard(exercise, {
                              singleRound: true,
                              roundIndex: currentBlockRound,
                              label: `Vuelta ${currentBlockRound + 1}`,
                              highlight: 'circuit',
                              stepKey: `${block.id}:${exercise.id}:${currentBlockRound}`,
                            }))}

                            {!focusMode && (allCircuitRoundsComplete ? (
                              <div className="w-full px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-bold text-center">
                                Circuito completado ({completedCircuitRounds}/{blockRounds})
                              </div>
                            ) : null)}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(block.exercises || []).map((exercise) => renderExerciseCard(exercise, {
                              stepKey: `${block.id}:${exercise.id}`,
                            }))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }

            const state = activityState[activity.id] || { done: false, notes: '' };
            return (
              <div key={activity.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{activity.title || 'Actividad'}</p>
                    <p className="text-xs text-slate-500">{activity.description || 'Marca la actividad al completarla.'}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={state.done}
                      onChange={(e) => setActivityState(prev => ({
                        ...prev,
                        [activity.id]: { ...state, done: e.target.checked }
                      }))}
                    />
                    Completada
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={state.notes}
                  onChange={(e) => setActivityState(prev => ({
                    ...prev,
                    [activity.id]: { ...state, notes: e.target.value }
                  }))}
                  placeholder="Notas de esta actividad..."
                  className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            );
          })}

          {/* Safety net: si focusMode oculta todo, mostrar botón de recuperación */}
          {focusMode && guidedSteps.length > 0 && !activeStep && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-amber-700">
                Semana {selectedDay.week_number} · {dayName[(selectedDay.day_number || 1) - 1]} — {guidedSteps.filter((s: GuidedExerciseStep) => s.completed).length}/{guidedSteps.length} pasos completados
              </p>
              <button onClick={() => setFocusMode(false)} className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 shrink-0">
                Reabrir entrenamiento
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 bg-sea-50 border border-sea-100 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-sea-900 flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> Cierre de sesión</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-white rounded-xl border border-sea-100 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Pasos</p>
              <p className="text-sm font-black text-sea-900">{sessionSummary.doneSteps}/{sessionSummary.totalSteps}</p>
            </div>
            <div className="bg-white rounded-xl border border-sea-100 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Completado</p>
              <p className="text-sm font-black text-sea-900">{sessionSummary.completion}%</p>
            </div>
            <div className="bg-white rounded-xl border border-sea-100 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Actividades</p>
              <p className="text-sm font-black text-sea-900">{sessionSummary.doneActivities}</p>
            </div>
            <div className="bg-white rounded-xl border border-sea-100 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Descanso</p>
              <p className="text-sm font-black text-sea-900">{formatSeconds(restSeconds)}</p>
            </div>
          </div>
          {sessionSummary.completion < 70 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Tip: completa al menos el 70% de pasos antes de cerrar para mantener la adherencia semanal.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Esfuerzo (1-10) *</label>
              <input type="number" min={1} max={10} value={effort} onChange={(e) => setEffort(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Duración (min)</label>
              <input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div className="flex items-end">
              <button
                onClick={saveSession}
                disabled={saving}
                className="w-full px-4 py-2.5 rounded-lg bg-sea-600 hover:bg-sea-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Finalizar y Guardar
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Notas de sensaciones *</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cómo te has sentido, energía, dolor, técnica, etc."
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          {effort && <p className="text-xs text-sea-700 inline-flex items-center gap-1"><Star className="w-3.5 h-3.5" /> RPE actual: {effort}/10</p>}
        </div>
      </div>

      <div className="glass rounded-3xl p-5 md:p-6 shadow-card">
        <h3 className="text-lg font-black text-sea-900 mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Historial de entrenamientos</h3>
        <ClientWorkoutHistory clientId={clientId} />
      </div>

      {videoState && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4" onClick={() => setVideoState(null)}>
          <div className="w-full max-w-3xl bg-black rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video">
              <iframe title={videoState.title} src={videoState.embedUrl} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
            </div>
            <div className="p-2 bg-slate-900 flex items-center justify-between gap-2">
              {videoState.externalUrl ? (
                <button
                  onClick={() => window.open(videoState.externalUrl, '_blank', 'noopener,noreferrer')}
                  className="text-sm text-white/80 hover:text-white inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" /> Abrir en pestaña nueva
                </button>
              ) : <span className="text-xs text-white/50">Sin enlace externo disponible</span>}
              <button onClick={() => setVideoState(null)} className="text-sm text-white/80 hover:text-white inline-flex items-center gap-1">
                <Clock className="w-4 h-4" /> Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
