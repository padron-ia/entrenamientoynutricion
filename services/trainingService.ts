import { supabase } from './supabaseClient';
import {
    Exercise,
    Workout,
    WorkoutBlock,
    WorkoutExercise,
    TrainingProgram,
    ProgramDay,
    ProgramActivity,
    ClientTrainingAssignment,
    ClientDayLog,
    ClientExerciseLog,
    ClientActivityLog
} from '../types';

const DAY_NAMES_ES = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

export const trainingService = {
    // --- EXERCISES ---
    async getExercises(): Promise<Exercise[]> {
        const { data, error } = await supabase
            .from('training_exercises')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async createExercise(exercise: Partial<Exercise>): Promise<Exercise> {
        const { data, error } = await supabase
            .from('training_exercises')
            .insert({
                ...exercise,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateExercise(id: string, updates: Partial<Exercise>): Promise<Exercise> {
        const { data, error } = await supabase
            .from('training_exercises')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteExercise(id: string): Promise<void> {
        const { error } = await supabase
            .from('training_exercises')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async findOrCreateExercise(name: string): Promise<Exercise> {
        // Try to find existing first
        const { data: existing, error: findError } = await supabase
            .from('training_exercises')
            .select('*')
            .ilike('name', name)
            .limit(1)
            .maybeSingle();

        if (existing) return existing;

        // Create new if not found
        return this.createExercise({
            name,
            equipment: ['Gimnasio'],
            muscle_main: 'Varios'
        });
    },

    // --- WORKOUTS ---
    async getWorkouts(): Promise<Workout[]> {
        const { data: workouts, error } = await supabase
            .from('training_workouts')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        if (!workouts || workouts.length === 0) return [];

        // Get all blocks for these workouts
        const workoutIds = workouts.map((w: any) => w.id);
        const { data: allBlocks } = await supabase
            .from('training_workout_blocks')
            .select('*')
            .in('workout_id', workoutIds)
            .order('position', { ascending: true });

        if (!allBlocks || allBlocks.length === 0) {
            return workouts.map((w: any) => ({ ...w, blocks: [] }));
        }

        // Get all exercises for these blocks
        const allBlockIds = allBlocks.map((b: any) => b.id);
        const { data: allWorkoutExercises } = await supabase
            .from('training_workout_exercises')
            .select('*')
            .in('block_id', allBlockIds)
            .order('position', { ascending: true });

        // Get exercise details
        const exerciseIds = [...new Set(
            (allWorkoutExercises || []).map((we: any) => we.exercise_id).filter(Boolean)
        )];
        const { data: exercises } = exerciseIds.length > 0
            ? await supabase.from('training_exercises').select('*').in('id', exerciseIds)
            : { data: [] };

        const exerciseMap: Record<string, any> = Object.fromEntries(
            (exercises || []).map((e: any) => [e.id, e])
        );

        return workouts.map((workout: any) => ({
            ...workout,
            blocks: (allBlocks || [])
                .filter((b: any) => b.workout_id === workout.id)
                .map((block: any) => ({
                    ...block,
                    exercises: (allWorkoutExercises || [])
                        .filter((we: any) => we.block_id === block.id)
                        .map((we: any) => ({ ...we, exercise: exerciseMap[we.exercise_id] || null }))
                }))
        }));
    },

    async saveWorkout(workout: Partial<Workout>): Promise<Workout> {
        const isNew = !workout.id || workout.id === '';

        // 1. Save main workout info
        const workoutData = {
            name: workout.name,
            description: workout.description,
            goal: workout.goal,
            notes: workout.notes,
            updated_at: new Date().toISOString()
        };

        let savedWorkout: any;

        if (isNew) {
            const { data, error } = await supabase
                .from('training_workouts')
                .insert({ ...workoutData, created_at: new Date().toISOString() })
                .select()
                .single();
            if (error) throw error;
            savedWorkout = data;
        } else {
            const { data, error } = await supabase
                .from('training_workouts')
                .update(workoutData)
                .eq('id', workout.id)
                .select()
                .single();
            if (error) throw error;
            savedWorkout = data;
        }

        // 2. Handle Blocks and Exercises
        if (workout.blocks) {
            // Delete existing blocks to simplify (or update smartly, but delete/re-insert is safer for templates)
            if (!isNew) {
                await supabase.from('training_workout_blocks').delete().eq('workout_id', savedWorkout.id);
            }

            for (let i = 0; i < workout.blocks.length; i++) {
                const block = workout.blocks[i];
                const { data: savedBlock, error: blockError } = await supabase
                    .from('training_workout_blocks')
                    .insert({
                        workout_id: savedWorkout.id,
                        name: block.name,
                        description: block.description,
                        structure_type: (block as any).structure_type || 'lineal',
                        position: i
                    })
                    .select()
                    .single();

                if (blockError) throw blockError;

                if (block.exercises && block.exercises.length > 0) {
                    const exerciseInserts = block.exercises.map((we, index) => {
                        const sRounds = we.superset_rounds || we.sets || 3;
                        return {
                            block_id: savedBlock.id,
                            exercise_id: we.exercise_id || we.exercise?.id,
                            sets: we.superset_id ? sRounds : (we.sets || 3),
                            reps: we.reps,
                            rest_seconds: we.rest_seconds,
                            notes: we.notes,
                            superset_id: we.superset_id || null,
                            superset_rounds: we.superset_id ? sRounds : null,
                            position: index
                        };
                    });

                    const { error: exError } = await supabase
                        .from('training_workout_exercises')
                        .insert(exerciseInserts);

                    if (exError) throw exError;
                }
            }
        }

        return this.getWorkoutById(savedWorkout.id) as Promise<Workout>;
    },

    async getWorkoutById(id: string): Promise<Workout | null> {
        // 1. Get workout header
        const { data: workout, error } = await supabase
            .from('training_workouts')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !workout) return null;

        // 2. Get blocks (explicit query, no FK join dependency)
        const { data: blocks } = await supabase
            .from('training_workout_blocks')
            .select('*')
            .eq('workout_id', id)
            .order('position', { ascending: true });

        if (!blocks || blocks.length === 0) {
            return { ...workout, blocks: [] };
        }

        // 3. Get all workout exercises for these blocks
        const blockIds = blocks.map((b: any) => b.id);
        const { data: workoutExercises } = await supabase
            .from('training_workout_exercises')
            .select('*')
            .in('block_id', blockIds)
            .order('position', { ascending: true });

        if (!workoutExercises || workoutExercises.length === 0) {
            return { ...workout, blocks: blocks.map((b: any) => ({ ...b, exercises: [] })) };
        }

        // 4. Get exercise details
        const exerciseIds = [...new Set(
            workoutExercises.map((we: any) => we.exercise_id).filter(Boolean)
        )];
        const { data: exercises } = exerciseIds.length > 0
            ? await supabase.from('training_exercises').select('*').in('id', exerciseIds)
            : { data: [] };

        const exerciseMap: Record<string, any> = Object.fromEntries(
            (exercises || []).map((e: any) => [e.id, e])
        );

        return {
            ...workout,
            blocks: blocks.map((block: any) => ({
                ...block,
                exercises: workoutExercises
                    .filter((we: any) => we.block_id === block.id)
                    .map((we: any) => ({ ...we, exercise: exerciseMap[we.exercise_id] || null }))
            }))
        };
    },

    async deleteWorkout(id: string): Promise<void> {
        const { error } = await supabase
            .from('training_workouts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- PROGRAMS ---
    async getPrograms(): Promise<TrainingProgram[]> {
        const { data, error } = await supabase
            .from('training_programs')
            .select(`
                *,
                training_program_days (
                    *,
                    training_program_activities (*)
                )
            `)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(program => ({
            ...program,
            days: (program.training_program_days || []).map((day: any) => ({
                ...day,
                activities: (day.training_program_activities || []).sort((a: any, b: any) => a.position - b.position)
            }))
        }));
    },

    async saveProgram(program: Partial<TrainingProgram>): Promise<TrainingProgram> {
        const isNew = !program.id || program.id === '';

        const programData = {
            name: program.name,
            description: program.description,
            weeks_count: program.weeks_count,
            updated_at: new Date().toISOString()
        };

        let savedProgram: any;

        if (isNew) {
            const { data, error } = await supabase
                .from('training_programs')
                .insert({ ...programData, created_at: new Date().toISOString() })
                .select()
                .single();
            if (error) throw error;
            savedProgram = data;
        } else {
            const { data, error } = await supabase
                .from('training_programs')
                .update(programData)
                .eq('id', program.id)
                .select()
                .single();
            if (error) throw error;
            savedProgram = data;
        }

        // Handle Days and Activities
        if (program.days) {
            if (!isNew) {
                await supabase.from('training_program_days').delete().eq('program_id', savedProgram.id);
            }

            for (const day of program.days) {
                const { data: savedDay, error: dayError } = await supabase
                    .from('training_program_days')
                    .insert({
                        program_id: savedProgram.id,
                        week_number: day.week_number,
                        day_number: day.day_number
                    })
                    .select()
                    .single();

                if (dayError) throw dayError;

                if (day.activities && day.activities.length > 0) {
                    const activityInserts = day.activities.map((act, index) => ({
                        day_id: savedDay.id,
                        type: act.type,
                        activity_id: act.activity_id,
                        title: act.title,
                        description: act.description,
                        position: index,
                        color: act.color,
                        config: act.config || {}
                    }));

                    await supabase.from('training_program_activities').insert(activityInserts);
                }
            }
        }

        return this.getProgramById(savedProgram.id) as Promise<TrainingProgram>;
    },

    async getProgramById(id: string): Promise<TrainingProgram | null> {
        const { data, error } = await supabase
            .from('training_programs')
            .select(`
                *,
                training_program_days (
                    *,
                    training_program_activities (*)
                )
            `)
            .eq('id', id)
            .single();

        if (error) return null;

        return {
            ...data,
            days: (data.training_program_days || []).map((day: any) => ({
                ...day,
                activities: (day.training_program_activities || []).sort((a: any, b: any) => a.position - b.position)
            }))
        };
    },

    async addProgramDay(programId: string, day: Partial<ProgramDay>): Promise<ProgramDay> {
        const { data: savedDay, error: dayError } = await supabase
            .from('training_program_days')
            .insert({
                program_id: programId,
                week_number: day.week_number,
                day_number: day.day_number
            })
            .select()
            .single();

        if (dayError) throw dayError;

        if (day.activities && day.activities.length > 0) {
            const activityInserts = day.activities.map((act, index) => ({
                day_id: savedDay.id,
                type: act.type,
                activity_id: act.activity_id,
                title: act.title,
                description: act.description,
                position: index,
                color: act.color
            }));

            const { error: actError } = await supabase.from('training_program_activities').insert(activityInserts);
            if (actError) throw actError;
        }

        return savedDay;
    },

    async deleteProgram(id: string): Promise<void> {
        const { error } = await supabase
            .from('training_programs')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getClientAssignment(clientId: string): Promise<ClientTrainingAssignment | null> {
        const { data, error } = await supabase
            .from('client_training_assignments')
            .select('*')
            .eq('client_id', clientId)
            .order('assigned_at', { ascending: false })
            .limit(1)
            .single();

        if (error) return null;
        return data;
    },

    async getClientProgram(clientId: string): Promise<{ assignment: ClientTrainingAssignment; program: TrainingProgram } | null> {
        const assignment = await this.getClientAssignment(clientId);
        if (!assignment) return null;

        const program = await this.getProgramById(assignment.program_id);
        if (!program) return null;

        const workoutIds = [...new Set(
            (program.days || [])
                .flatMap(day => day.activities || [])
                .filter(activity => activity.type === 'workout')
                .map(activity => activity.workout_id || activity.activity_id)
                .filter(Boolean)
        )] as string[];

        if (workoutIds.length > 0) {
            const workouts = await Promise.all(workoutIds.map(id => this.getWorkoutById(id)));
            const workoutMap: Record<string, Workout> = {};
            workouts.forEach(workout => {
                if (workout?.id) workoutMap[workout.id] = workout;
            });

            program.days = (program.days || []).map(day => ({
                ...day,
                activities: (day.activities || []).map(activity => {
                    const workoutId = activity.workout_id || activity.activity_id;
                    if (activity.type === 'workout' && workoutId && workoutMap[workoutId]) {
                        return {
                            ...activity,
                            workout_id: workoutId,
                            workout: workoutMap[workoutId],
                            title: activity.title || workoutMap[workoutId].name,
                        };
                    }
                    return activity;
                })
            }));
        }

        return { assignment, program };
    },

    async assignProgramToClient(
        clientId: string,
        programId: string,
        startDate: string,
        assignedBy: string
    ): Promise<void> {
        // Delete any existing assignment first, then insert fresh
        await supabase
            .from('client_training_assignments')
            .delete()
            .eq('client_id', clientId);

        const { error } = await supabase
            .from('client_training_assignments')
            .insert({
                client_id: clientId,
                program_id: programId,
                start_date: startDate,
                assigned_at: new Date().toISOString()
            });

        if (error) throw error;
    },

    async removeClientAssignment(clientId: string): Promise<void> {
        const { error } = await supabase
            .from('client_training_assignments')
            .delete()
            .eq('client_id', clientId);

        if (error) throw error;
    },

    // --- CLIENT LOGS ---
    async saveClientDayLog(log: Omit<ClientDayLog, 'id'>, exercises: Omit<ClientExerciseLog, 'id' | 'log_id'>[]): Promise<void> {
        // 1. Save Header
        const { data: savedLog, error: logError } = await supabase
            .from('training_client_day_logs')
            .upsert({
                client_id: log.client_id,
                day_id: log.day_id,
                completed_at: log.completed_at || new Date().toISOString(),
                effort_rating: log.effort_rating,
                notes: log.notes,
                duration_minutes: log.duration_minutes
            })
            .select()
            .single();

        if (logError || !savedLog) throw logError || new Error('Error saving log header');

        // 2. Save Exercises
        if (exercises.length > 0) {
            const exercisesToUpsert = exercises.map(ex => ({
                log_id: savedLog.id,
                workout_exercise_id: ex.workout_exercise_id,
                sets_completed: ex.sets_completed,
                reps_completed: ex.reps_completed,
                weight_used: ex.weight_used,
                is_completed: ex.is_completed
            }));

            const { error: exercisesError } = await supabase
                .from('training_client_exercise_logs')
                .upsert(exercisesToUpsert);

            if (exercisesError) throw exercisesError;
        }
    },

    async getClientDayLog(clientId: string, dayId: string): Promise<ClientDayLog | null> {
        const { data: log, error } = await supabase
            .from('training_client_day_logs')
            .select('*')
            .eq('client_id', clientId)
            .eq('day_id', dayId)
            .single();

        if (error || !log) return null;

        const { data: exercises } = await supabase
            .from('training_client_exercise_logs')
            .select('*')
            .eq('log_id', log.id);

        return {
            ...log,
            exercises: exercises || []
        };
    },

    // --- CLIENT ACTIVITY LOGS ---
    async saveClientActivityLog(log: Omit<ClientActivityLog, 'id' | 'created_at'>): Promise<void> {
        const { error } = await supabase
            .from('training_client_activity_logs')
            .upsert({
                client_id: log.client_id,
                activity_id: log.activity_id,
                day_id: log.day_id,
                completed_at: log.completed_at || new Date().toISOString(),
                data: log.data
            }, { onConflict: 'client_id,activity_id,day_id' });

        if (error) throw error;
    },

    async getClientActivityLogs(clientId: string, dayId: string): Promise<ClientActivityLog[]> {
        const { data, error } = await supabase
            .from('training_client_activity_logs')
            .select('*')
            .eq('client_id', clientId)
            .eq('day_id', dayId);

        if (error) throw error;
        return data || [];
    },

    async getClientAllDayLogs(clientId: string): Promise<(ClientDayLog & { day_name?: string; week_number?: number; exerciseDetails?: { name: string; sets_completed?: number; reps_completed?: string; weight_used?: string; is_completed: boolean }[] })[]> {
        const { data: logs, error } = await supabase
            .from('training_client_day_logs')
            .select('*')
            .eq('client_id', clientId)
            .order('completed_at', { ascending: false });

        if (error) throw error;
        if (!logs || logs.length === 0) return [];

        // Get exercise logs for all day logs
        const logIds = logs.map(l => l.id);
        const { data: exerciseLogs } = await supabase
            .from('training_client_exercise_logs')
            .select('*')
            .in('log_id', logIds);

        // Get day info for names
        const dayIds = [...new Set(logs.map(l => l.day_id))];
        const { data: days } = await supabase
            .from('training_program_days')
            .select('id, week_number, day_number')
            .in('id', dayIds);

        // Get workout exercise IDs to resolve exercise names
        const weIds = [...new Set((exerciseLogs || []).map(el => el.workout_exercise_id))];
        let exerciseNames: Record<string, string> = {};
        if (weIds.length > 0) {
            const { data: wExercises } = await supabase
                .from('training_workout_exercises')
                .select('id, exercise_id')
                .in('id', weIds);

            if (wExercises && wExercises.length > 0) {
                const exIds = [...new Set(wExercises.map(we => we.exercise_id))];
                const { data: exercises } = await supabase
                    .from('training_exercises')
                    .select('id, name')
                    .in('id', exIds);

                const exNameMap: Record<string, string> = {};
                (exercises || []).forEach(ex => { exNameMap[ex.id] = ex.name; });
                wExercises.forEach(we => { exerciseNames[we.id] = exNameMap[we.exercise_id] || 'Ejercicio'; });
            }
        }

        const dayMap: Record<string, { name: string; week_number: number }> = {};
        (days || []).forEach(d => {
            const idx = Math.max(0, Math.min(6, (Number(d.day_number) || 1) - 1));
            dayMap[d.id] = { name: DAY_NAMES_ES[idx], week_number: d.week_number };
        });

        return logs.map(log => {
            const logExercises = (exerciseLogs || []).filter(el => el.log_id === log.id);
            return {
                ...log,
                day_name: dayMap[log.day_id]?.name,
                week_number: dayMap[log.day_id]?.week_number,
                exercises: logExercises,
                exerciseDetails: logExercises.map(el => ({
                    name: exerciseNames[el.workout_exercise_id] || 'Ejercicio',
                    sets_completed: el.sets_completed,
                    reps_completed: el.reps_completed,
                    weight_used: el.weight_used,
                    is_completed: el.is_completed
                }))
            };
        });
    }
};

export default trainingService;
