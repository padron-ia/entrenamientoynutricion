import React, { useEffect, useState } from 'react';
import { ChevronRight, CircleHelp, Dumbbell, PlayCircle, Save, TrendingUp } from 'lucide-react';
import { ClientBenchmarkWithProgress, strengthService, STRENGTH_PROTOCOL_META } from '../../services/strengthService';
import { trainingService } from '../../services/trainingService';
import { Exercise, StrengthProtocolType } from '../../types';
import { ExerciseMediaUtils } from '../../utils/exerciseMedia';

interface StrengthProgressViewProps {
  clientId: string;
  onBack?: () => void;
  embedded?: boolean;
}

const PHASE_LABELS = {
  baseline: 'Medicion inicial',
  monthly: 'Revision mensual',
  checkpoint: 'Seguimiento',
} as const;

const PROTOCOL_FORM_CONFIG: Record<StrengthProtocolType, {
  mainLabel: string;
  mainPlaceholder: string;
  showReps: boolean;
  showLoadKg: boolean;
  showDuration: boolean;
  helper: string;
}> = {
  rm_load: {
    mainLabel: 'Resultado principal (kg)',
    mainPlaceholder: 'Ejemplo: 32.5',
    showReps: false,
    showLoadKg: false,
    showDuration: false,
    helper: 'Introduce el peso maximo que moviste segun el protocolo indicado por tu coach.',
  },
  amrap_reps: {
    mainLabel: 'Resultado principal (reps)',
    mainPlaceholder: 'Ejemplo: 14',
    showReps: false,
    showLoadKg: true,
    showDuration: false,
    helper: 'Introduce cuantas repeticiones hiciste. Si usaste carga, anadela en "Carga usada".',
  },
  hold_seconds: {
    mainLabel: 'Resultado principal (segundos)',
    mainPlaceholder: 'Ejemplo: 45',
    showReps: false,
    showLoadKg: false,
    showDuration: false,
    helper: 'Introduce cuantos segundos mantuviste la posicion.',
  },
  reps_60s: {
    mainLabel: 'Resultado principal (reps)',
    mainPlaceholder: 'Ejemplo: 22',
    showReps: false,
    showLoadKg: false,
    showDuration: false,
    helper: 'Introduce cuantas repeticiones completaste en 60 segundos.',
  },
};

export function StrengthProgressView({ clientId, onBack, embedded = false }: StrengthProgressViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [benchmarks, setBenchmarks] = useState<ClientBenchmarkWithProgress[]>([]);
  const [exerciseByBenchmark, setExerciseByBenchmark] = useState<Record<string, Exercise | null>>({});
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState<string | null>(null);

  const [phase, setPhase] = useState<'baseline' | 'monthly' | 'checkpoint'>('monthly');
  const [metric, setMetric] = useState('');
  const [reps, setReps] = useState('');
  const [loadKg, setLoadKg] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [recordedOn, setRecordedOn] = useState(() => new Date().toISOString().split('T')[0]);

  const normalizeName = (value: string) =>
    (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await strengthService.getClientBenchmarksWithProgress(clientId);
      const exercises = await trainingService.getExercises();

      const indexedExercises = new Map<string, Exercise>();
      (exercises || []).forEach((exercise) => {
        const normalized = normalizeName(exercise.name);
        if (!indexedExercises.has(normalized)) indexedExercises.set(normalized, exercise);
      });

      const nextExerciseMap: Record<string, Exercise | null> = {};
      data.forEach((benchmark) => {
        nextExerciseMap[benchmark.id] = indexedExercises.get(normalizeName(benchmark.test_name)) || null;
      });

      setBenchmarks(data);
      setExerciseByBenchmark(nextExerciseMap);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar tu progreso de fuerza.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const resetForm = () => {
    setPhase('monthly');
    setMetric('');
    setReps('');
    setLoadKg('');
    setDuration('');
    setNotes('');
    setRecordedOn(new Date().toISOString().split('T')[0]);
  };

  const submitRecord = async (benchmark: ClientBenchmarkWithProgress) => {
    const config = PROTOCOL_FORM_CONFIG[benchmark.protocol_type];
    const metricValue = Number(metric);
    if (!metricValue || Number.isNaN(metricValue)) {
      setError('Introduce un valor valido antes de guardar.');
      return;
    }
    try {
      setSaving(true);
      await strengthService.addRecord({
        clientId,
        benchmarkId: benchmark.id,
        phase,
        metricValue,
        metricUnit: benchmark.metric_unit,
        source: 'client',
        notes: notes.trim() || undefined,
        reps: config.showReps && reps ? Number(reps) : undefined,
        loadKg: config.showLoadKg && loadKg ? Number(loadKg) : undefined,
        durationSeconds: config.showDuration && duration ? Number(duration) : undefined,
        recordedOn,
      });
      resetForm();
      setActiveForm(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar tu registro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 space-y-5">
      {!embedded && (
        <button onClick={onBack} className="flex items-center gap-2 text-sea-400 hover:text-sea-800 transition-colors font-bold group">
          <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
        </button>
      )}

      <div className="glass rounded-3xl p-6 shadow-card border border-sea-100/60">
        <p className="text-xs font-black uppercase tracking-wider text-sea-500">Progreso de fuerza</p>
        <h2 className="text-2xl font-black text-sea-900 mt-1">Tus ejercicios guia</h2>
        <p className="text-sm text-sea-600 mt-2">Sigue este orden: 1) mira la demostracion, 2) haz el test, 3) registra tu resultado.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      {loading ? (
        <div className="glass rounded-2xl p-5 text-sm text-sea-500">Cargando tus tests de fuerza...</div>
      ) : benchmarks.length === 0 ? (
        <div className="glass rounded-2xl p-5 text-sm text-sea-500">Tu coach aun no te ha asignado ejercicios guia de fuerza.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {benchmarks.map((benchmark) => {
            const delta = benchmark.improvement_pct;
            const hasDelta = typeof delta === 'number' && benchmark.baseline_record && benchmark.latest_record;
            const config = PROTOCOL_FORM_CONFIG[benchmark.protocol_type];
            const linkedExercise = exerciseByBenchmark[benchmark.id];
            const thumbnail = linkedExercise ? ExerciseMediaUtils.getThumbnail(linkedExercise.media_url, linkedExercise.media_type) : null;
            const rawEmbed = linkedExercise?.media_url && linkedExercise.media_type !== 'image'
              ? ExerciseMediaUtils.getEmbedUrl(linkedExercise.media_url, linkedExercise.media_type)
              : null;
            const embedUrl = rawEmbed ? rawEmbed.replace('autoplay=1', 'autoplay=0') : null;
            const isMediaOpen = activeMedia === benchmark.id;
            const history = [...(benchmark.records || [])].sort((a, b) => (b.recorded_on || '').localeCompare(a.recorded_on || ''));

            return (
              <div key={benchmark.id} className="glass rounded-2xl p-5 shadow-card border border-sea-100/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-sea-900 flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-sea-600" /> {benchmark.test_name}
                    </p>
                    <p className="text-xs text-sea-500 mt-1">{STRENGTH_PROTOCOL_META[benchmark.protocol_type].label}</p>
                  </div>
                  {hasDelta && (
                    <span className={`text-xs font-black px-2 py-1 rounded-full inline-flex items-center gap-1 ${delta! >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      <TrendingUp className="w-3 h-3" /> {delta! >= 0 ? '+' : ''}{delta}%
                    </span>
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-sea-100 bg-white/70 p-3">
                  {linkedExercise ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            {thumbnail ? (
                              <img src={thumbnail} alt={linkedExercise.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Sin vista</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-sea-800 truncate">Demostracion: {linkedExercise.name}</p>
                            <p className="text-[11px] text-sea-500 truncate">{linkedExercise.instructions || 'Sigue la tecnica indicada por tu coach.'}</p>
                          </div>
                        </div>
                        {linkedExercise.media_url && (
                          <button
                            onClick={() => setActiveMedia(isMediaOpen ? null : benchmark.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sea-600 hover:bg-sea-500 text-white text-xs font-bold"
                          >
                            <PlayCircle className="w-3 h-3" /> {isMediaOpen ? 'Ocultar' : 'Ver video'}
                          </button>
                        )}
                      </div>

                      {isMediaOpen && linkedExercise.media_url && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 bg-black/5">
                          {linkedExercise.media_type === 'image' ? (
                            <img src={linkedExercise.media_url} alt={linkedExercise.name} className="w-full max-h-72 object-cover" />
                          ) : embedUrl ? (
                            <iframe
                              src={embedUrl}
                              title={`Demostracion ${linkedExercise.name}`}
                              className="w-full aspect-video"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <div className="p-4 text-sm text-slate-600">No se pudo cargar el video de este ejercicio.</div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
                      Este test aun no esta vinculado a un ejercicio de biblioteca con video. Pide a tu coach que lo asigne desde la biblioteca de ejercicios.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div className="rounded-xl bg-white/70 border border-sea-100 p-3">
                    <p className="text-xs text-sea-500">Medicion inicial</p>
                    <p className="font-black text-sea-900">
                      {benchmark.baseline_record ? `${benchmark.baseline_record.metric_value} ${benchmark.metric_unit}` : '--'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/70 border border-sea-100 p-3">
                    <p className="text-xs text-sea-500">Ultimo</p>
                    <p className="font-black text-sea-900">
                      {benchmark.latest_record ? `${benchmark.latest_record.metric_value} ${benchmark.metric_unit}` : '--'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-sea-100 bg-white/70 p-3">
                  <p className="text-xs font-black uppercase tracking-wider text-sea-600 mb-2">Historial completo</p>
                  {history.length === 0 ? (
                    <p className="text-xs text-sea-500">Aun no hay resultados guardados.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {history.map((record) => (
                        <div key={record.id} className="flex items-center justify-between gap-3 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                          <span className="text-slate-600">{record.recorded_on}</span>
                          <span className="text-slate-500">{PHASE_LABELS[record.phase]}</span>
                          <span className="font-bold text-sea-900">{record.metric_value} {record.metric_unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setActiveForm(activeForm === benchmark.id ? null : benchmark.id);
                    resetForm();
                  }}
                  className="mt-4 w-full rounded-xl bg-sea-600 hover:bg-sea-500 text-white text-sm font-bold py-2"
                >
                  Registrar resultado
                </button>

                {activeForm === benchmark.id && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded-xl bg-white border border-sea-100">
                    <label className="text-xs font-bold text-sea-700">Tipo de control</label>
                    <label className="text-xs font-bold text-sea-700">Fecha del resultado</label>
                    <select value={phase} onChange={(e) => setPhase(e.target.value as any)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">
                      <option value="baseline">{PHASE_LABELS.baseline}</option>
                      <option value="monthly">{PHASE_LABELS.monthly}</option>
                      <option value="checkpoint">{PHASE_LABELS.checkpoint}</option>
                    </select>
                    <input
                      type="date"
                      value={recordedOn}
                      onChange={(e) => setRecordedOn(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                    <div className="md:col-span-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-sea-700">{config.mainLabel}</p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] text-sea-600 hover:text-sea-700"
                        title={config.helper}
                      >
                        <CircleHelp className="w-3.5 h-3.5" /> Que tengo que escribir aqui?
                      </button>
                    </div>
                    <input
                      value={metric}
                      onChange={(e) => setMetric(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      placeholder={config.mainPlaceholder}
                    />
                    {config.showReps && (
                      <input value={reps} onChange={(e) => setReps(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm" placeholder="Repeticiones (opcional)" />
                    )}
                    {config.showLoadKg && (
                      <input value={loadKg} onChange={(e) => setLoadKg(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm" placeholder="Carga usada (kg, opcional)" />
                    )}
                    {config.showDuration && (
                      <input value={duration} onChange={(e) => setDuration(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm" placeholder="Duracion (segundos, opcional)" />
                    )}
                    <input value={notes} onChange={(e) => setNotes(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm" placeholder="Notas (como te sentiste)" />
                    <p className="md:col-span-2 text-xs text-sea-600 bg-sea-50 border border-sea-100 rounded-lg px-3 py-2">
                      {config.helper}
                    </p>
                    <button
                      onClick={() => submitRecord(benchmark)}
                      disabled={saving}
                      className="md:col-span-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold"
                    >
                      <Save className="w-4 h-4" /> Guardar registro
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StrengthProgressView;
