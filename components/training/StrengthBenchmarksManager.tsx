import React, { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Plus, Save, Trash2, TrendingUp, AlertCircle, CheckCircle2, CircleHelp } from 'lucide-react';
import { StrengthProtocolType, User } from '../../types';
import { ClientBenchmarkWithProgress, strengthService, STRENGTH_PROTOCOL_META } from '../../services/strengthService';
import { trainingService } from '../../services/trainingService';

interface StrengthBenchmarksManagerProps {
  clientId: string;
  currentUser: User;
}

const PROTOCOL_OPTIONS = Object.entries(STRENGTH_PROTOCOL_META) as Array<[keyof typeof STRENGTH_PROTOCOL_META, { label: string; unit: string; helper: string }]>;

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
}> = {
  rm_load: {
    mainLabel: 'Resultado principal (kg)',
    mainPlaceholder: 'Ejemplo: 35',
    showReps: false,
    showLoadKg: false,
    showDuration: false,
  },
  amrap_reps: {
    mainLabel: 'Resultado principal (reps)',
    mainPlaceholder: 'Ejemplo: 12',
    showReps: false,
    showLoadKg: true,
    showDuration: false,
  },
  hold_seconds: {
    mainLabel: 'Resultado principal (segundos)',
    mainPlaceholder: 'Ejemplo: 40',
    showReps: false,
    showLoadKg: false,
    showDuration: false,
  },
  reps_60s: {
    mainLabel: 'Resultado principal (reps)',
    mainPlaceholder: 'Ejemplo: 22',
    showReps: false,
    showLoadKg: false,
    showDuration: false,
  },
};

export function StrengthBenchmarksManager({ clientId, currentUser }: StrengthBenchmarksManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [benchmarks, setBenchmarks] = useState<ClientBenchmarkWithProgress[]>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; protocol_type: keyof typeof STRENGTH_PROTOCOL_META; metric_unit: string; equipment?: string }>>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<Array<{ id: string; name: string; equipment?: string[] }>>([]);
  const [selectedLibraryExerciseId, setSelectedLibraryExerciseId] = useState('');
  const [newName, setNewName] = useState('');
  const [newProtocol, setNewProtocol] = useState<keyof typeof STRENGTH_PROTOCOL_META>('rm_load');
  const [newNotes, setNewNotes] = useState('');
  const [activeRecordForm, setActiveRecordForm] = useState<string | null>(null);

  const [recordPhase, setRecordPhase] = useState<'baseline' | 'monthly' | 'checkpoint'>('monthly');
  const [recordMetric, setRecordMetric] = useState('');
  const [recordReps, setRecordReps] = useState('');
  const [recordLoad, setRecordLoad] = useState('');
  const [recordDuration, setRecordDuration] = useState('');
  const [recordNotes, setRecordNotes] = useState('');

  const pendingValidations = useMemo(
    () => benchmarks.flatMap(b => b.records.filter(r => r.source === 'client' && !r.is_validated).map(r => ({ ...r, test_name: b.test_name }))),
    [benchmarks]
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await strengthService.getClientBenchmarksWithProgress(clientId);
      setBenchmarks(data);
      const lib = await strengthService.getLibraryTemplates();
      setTemplates((lib || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        protocol_type: t.protocol_type,
        metric_unit: t.metric_unit,
        equipment: t.equipment,
      })));
      const exercises = await trainingService.getExercises();
      setExerciseLibrary((exercises || []).map((exercise: any) => ({
        id: exercise.id,
        name: exercise.name,
        equipment: exercise.equipment,
      })));
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar la valoracion de fuerza.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const resetRecordForm = () => {
    setRecordPhase('monthly');
    setRecordMetric('');
    setRecordReps('');
    setRecordLoad('');
    setRecordDuration('');
    setRecordNotes('');
  };

  const handleCreateBenchmark = async () => {
    if (!newName.trim()) return;
    try {
      setSaving(true);
      await strengthService.createClientBenchmark({
        clientId,
        name: newName.trim(),
        protocolType: newProtocol,
        targetNotes: newNotes.trim() || undefined,
        createdBy: currentUser.id,
      });
      setNewName('');
      setNewNotes('');
      setSelectedLibraryExerciseId('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'No se pudo crear el ejercicio guia.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecord = async (benchmark: ClientBenchmarkWithProgress) => {
    const config = PROTOCOL_FORM_CONFIG[benchmark.protocol_type];
    const metricValue = Number(recordMetric);
    if (!metricValue || Number.isNaN(metricValue)) {
      setError('Introduce un valor principal valido para guardar el registro.');
      return;
    }

    try {
      setSaving(true);
      await strengthService.addRecord({
        clientId,
        benchmarkId: benchmark.id,
        phase: recordPhase,
        metricValue,
        metricUnit: benchmark.metric_unit,
        source: 'coach',
        recordedBy: currentUser.id,
        notes: recordNotes.trim() || undefined,
        reps: config.showReps && recordReps ? Number(recordReps) : undefined,
        loadKg: config.showLoadKg && recordLoad ? Number(recordLoad) : undefined,
        durationSeconds: config.showDuration && recordDuration ? Number(recordDuration) : undefined,
      });
      resetRecordForm();
      setActiveRecordForm(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el registro.');
    } finally {
      setSaving(false);
    }
  };

  const handleValidateRecord = async (recordId: string) => {
    try {
      setSaving(true);
      await strengthService.validateRecord(recordId, currentUser.id);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'No se pudo validar el registro del cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      setSaving(true);
      await strengthService.archiveClientBenchmark(id);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'No se pudo archivar el ejercicio guia.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-sea-500">Valoracion de fuerza</p>
          <h3 className="text-lg font-bold text-slate-800">Ejercicios guia del cliente</h3>
          <p className="text-xs text-slate-500 mt-1">Recomendado: 3-6 ejercicios. Medicion inicial en semana 1 y retest mensual.</p>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-sea-50 text-sea-700 text-xs font-bold">
          {benchmarks.length} activos
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <select
          value={selectedLibraryExerciseId}
          onChange={(e) => {
            const selectedId = e.target.value;
            setSelectedLibraryExerciseId(selectedId);
            const selectedExercise = exerciseLibrary.find(exercise => exercise.id === selectedId);
            if (!selectedExercise) return;
            setNewName(selectedExercise.name);
            if (selectedExercise.equipment && selectedExercise.equipment.length > 0) {
              setNewNotes(`Material: ${selectedExercise.equipment.join(', ')}`);
            }
          }}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
        >
          <option value="">Elegir de biblioteca de ejercicios</option>
          {exerciseLibrary.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
          ))}
        </select>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ejercicio guia (ej: Press militar)"
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
        />
        <select
          value={newProtocol}
          onChange={(e) => setNewProtocol(e.target.value as keyof typeof STRENGTH_PROTOCOL_META)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
        >
          {PROTOCOL_OPTIONS.map(([key, val]) => (
            <option key={key} value={key}>{val.label} ({val.unit})</option>
          ))}
        </select>
        <button
          onClick={handleCreateBenchmark}
          disabled={saving || !newName.trim()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sea-600 hover:bg-sea-500 text-white text-sm font-bold disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Anadir
        </button>
        <textarea
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          placeholder={STRENGTH_PROTOCOL_META[newProtocol].helper}
          className="md:col-span-3 px-3 py-2 rounded-lg border border-slate-300 text-sm resize-none"
          rows={2}
        />
      </div>

      {templates.length > 0 && (
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Banco rapido de ejercicios guia</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  setNewName(template.name);
                  setNewProtocol(template.protocol_type);
                  setNewNotes(template.equipment ? `Material: ${template.equipment}` : '');
                  setSelectedLibraryExerciseId('');
                }}
                className="px-3 py-1.5 rounded-full bg-sea-50 text-sea-700 text-xs font-bold hover:bg-sea-100"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {pendingValidations.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-2">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">Pendiente de revision del coach</p>
          {pendingValidations.slice(0, 5).map((record) => (
            <div key={record.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-amber-900">
                {record.test_name}: {record.metric_value} {record.metric_unit} ({record.recorded_on})
              </span>
              <button
                onClick={() => handleValidateRecord(record.id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-600 text-white text-xs font-bold"
              >
                <CheckCircle2 className="w-3 h-3" /> Validar
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando ejercicios guia...</p>
      ) : benchmarks.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-500">
          Aun no hay ejercicios guia para este cliente.
        </div>
      ) : (
        <div className="space-y-3">
          {benchmarks.map((benchmark) => {
            const delta = benchmark.improvement_pct;
            const hasProgress = typeof delta === 'number' && benchmark.baseline_record && benchmark.latest_record;
            const config = PROTOCOL_FORM_CONFIG[benchmark.protocol_type];

            return (
              <div key={benchmark.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-sea-600" /> {benchmark.test_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {STRENGTH_PROTOCOL_META[benchmark.protocol_type].label} - unidad: {benchmark.metric_unit}
                    </p>
                    {benchmark.target_notes && <p className="text-xs text-slate-600 mt-2">{benchmark.target_notes}</p>}
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Ultimo registro</p>
                    <p className="text-sm font-black text-slate-800">
                      {benchmark.latest_record ? `${benchmark.latest_record.metric_value} ${benchmark.metric_unit}` : 'Sin datos'}
                    </p>
                    {hasProgress && (
                      <p className={`text-xs font-bold mt-1 inline-flex items-center gap-1 ${delta! >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        <TrendingUp className="w-3 h-3" /> {delta! >= 0 ? '+' : ''}{delta}%
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setActiveRecordForm(activeRecordForm === benchmark.id ? null : benchmark.id);
                      resetRecordForm();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-sea-50 text-sea-700 text-xs font-bold"
                  >
                    Registrar resultado
                  </button>
                  <button
                    onClick={() => handleArchive(benchmark.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Archivar
                  </button>
                </div>

                {activeRecordForm === benchmark.id && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <select
                      value={recordPhase}
                      onChange={(e) => setRecordPhase(e.target.value as any)}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    >
                      <option value="baseline">{PHASE_LABELS.baseline}</option>
                      <option value="monthly">{PHASE_LABELS.monthly}</option>
                      <option value="checkpoint">{PHASE_LABELS.checkpoint}</option>
                    </select>
                    <div className="md:col-span-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-700">{config.mainLabel}</p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] text-sea-600 hover:text-sea-700"
                        title={`Guia: ${config.mainLabel}. ${config.mainPlaceholder}`}
                      >
                        <CircleHelp className="w-3.5 h-3.5" /> Que poner aqui?
                      </button>
                    </div>
                    <input
                      value={recordMetric}
                      onChange={(e) => setRecordMetric(e.target.value)}
                      placeholder={config.mainPlaceholder}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                    {config.showReps && (
                      <input
                        value={recordReps}
                        onChange={(e) => setRecordReps(e.target.value)}
                        placeholder="Repeticiones (opcional)"
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    )}
                    {config.showLoadKg && (
                      <input
                        value={recordLoad}
                        onChange={(e) => setRecordLoad(e.target.value)}
                        placeholder="Carga usada (kg, opcional)"
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    )}
                    {config.showDuration && (
                      <input
                        value={recordDuration}
                        onChange={(e) => setRecordDuration(e.target.value)}
                        placeholder="Duracion (segundos, opcional)"
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    )}
                    <input
                      value={recordNotes}
                      onChange={(e) => setRecordNotes(e.target.value)}
                      placeholder="Notas (como se sintio)"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                    <button
                      onClick={() => handleAddRecord(benchmark)}
                      disabled={saving}
                      className="md:col-span-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sea-600 hover:bg-sea-500 text-white text-sm font-bold"
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

export default StrengthBenchmarksManager;
