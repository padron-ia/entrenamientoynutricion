import { supabase } from './supabaseClient';
import {
  ClientStrengthBenchmark,
  ClientStrengthRecord,
  ClientStrengthTestTemplate,
  StrengthProtocolType,
} from '../types';

export const STRENGTH_PROTOCOL_META: Record<StrengthProtocolType, { label: string; unit: string; helper: string }> = {
  rm_load: {
    label: 'RM por carga',
    unit: 'kg',
    helper: 'Ejemplo: Press de pecho 6RM. Se guarda la carga levantada.',
  },
  amrap_reps: {
    label: 'AMRAP repeticiones',
    unit: 'reps',
    helper: 'Maximo de repeticiones con una carga definida o con peso corporal.',
  },
  hold_seconds: {
    label: 'Isometrico por tiempo',
    unit: 's',
    helper: 'Ejemplo: tiempo colgado o sentadilla en pared.',
  },
  reps_60s: {
    label: 'Repeticiones en 60s',
    unit: 'reps',
    helper: 'Ejemplo: sentadillas en 60 segundos.',
  },
};

export interface ClientBenchmarkWithProgress extends ClientStrengthBenchmark {
  records: ClientStrengthRecord[];
  baseline_record?: ClientStrengthRecord;
  latest_record?: ClientStrengthRecord;
  improvement_pct?: number;
}

function computeImprovement(baseline?: ClientStrengthRecord, latest?: ClientStrengthRecord): number | undefined {
  if (!baseline || !latest) return undefined;
  const base = Number(baseline.metric_value);
  const last = Number(latest.metric_value);
  if (!base || Number.isNaN(base) || Number.isNaN(last)) return undefined;
  return Number((((last - base) / base) * 100).toFixed(1));
}

export const strengthService = {
  async getLibraryTemplates(): Promise<ClientStrengthTestTemplate[]> {
    const { data, error } = await supabase
      .from('training_strength_test_library')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createClientBenchmark(input: {
    clientId: string;
    name: string;
    protocolType: StrengthProtocolType;
    targetNotes?: string;
    createdBy: string;
  }): Promise<ClientStrengthBenchmark> {
    const meta = STRENGTH_PROTOCOL_META[input.protocolType];
    const { data, error } = await supabase
      .from('client_strength_benchmarks')
      .insert({
        client_id: input.clientId,
        test_name: input.name,
        protocol_type: input.protocolType,
        metric_unit: meta.unit,
        target_notes: input.targetNotes || null,
        is_active: true,
        created_by: input.createdBy,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async archiveClientBenchmark(benchmarkId: string): Promise<void> {
    const { error } = await supabase
      .from('client_strength_benchmarks')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', benchmarkId);

    if (error) throw error;
  },

  async addRecord(input: {
    clientId: string;
    benchmarkId: string;
    phase: 'baseline' | 'monthly' | 'checkpoint';
    metricValue: number;
    metricUnit: string;
    recordedBy?: string;
    source: 'coach' | 'client';
    notes?: string;
    reps?: number;
    loadKg?: number;
    durationSeconds?: number;
    recordedOn?: string;
  }): Promise<ClientStrengthRecord> {
    const { data, error } = await supabase
      .from('client_strength_records')
      .insert({
        client_id: input.clientId,
        benchmark_id: input.benchmarkId,
        phase: input.phase,
        metric_value: input.metricValue,
        metric_unit: input.metricUnit,
        source: input.source,
        recorded_by: input.recordedBy || null,
        recorded_on: input.recordedOn || new Date().toISOString().split('T')[0],
        notes: input.notes || null,
        reps: input.reps || null,
        load_kg: input.loadKg || null,
        duration_seconds: input.durationSeconds || null,
        is_validated: input.source === 'coach',
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async validateRecord(recordId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('client_strength_records')
      .update({
        is_validated: true,
        validated_by: userId,
        validated_at: new Date().toISOString(),
      })
      .eq('id', recordId);

    if (error) throw error;
  },

  async getClientBenchmarksWithProgress(clientId: string): Promise<ClientBenchmarkWithProgress[]> {
    const { data: benchmarks, error: benchmarkError } = await supabase
      .from('client_strength_benchmarks')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (benchmarkError) throw benchmarkError;
    if (!benchmarks || benchmarks.length === 0) return [];

    const benchmarkIds = benchmarks.map((b: any) => b.id);
    const { data: records, error: recordsError } = await supabase
      .from('client_strength_records')
      .select('*')
      .in('benchmark_id', benchmarkIds)
      .order('recorded_on', { ascending: true })
      .order('created_at', { ascending: true });

    if (recordsError) throw recordsError;

    const grouped = new Map<string, ClientStrengthRecord[]>();
    (records || []).forEach((record: any) => {
      const list = grouped.get(record.benchmark_id) || [];
      list.push(record);
      grouped.set(record.benchmark_id, list);
    });

    return (benchmarks as ClientStrengthBenchmark[]).map((benchmark) => {
      const benchmarkRecords = grouped.get(benchmark.id) || [];
      const baseline = benchmarkRecords.find(r => r.phase === 'baseline') || benchmarkRecords[0];
      const latest = benchmarkRecords.length > 0 ? benchmarkRecords[benchmarkRecords.length - 1] : undefined;

      return {
        ...benchmark,
        records: benchmarkRecords,
        baseline_record: baseline,
        latest_record: latest,
        improvement_pct: computeImprovement(baseline, latest),
      };
    });
  },
};

export default strengthService;
