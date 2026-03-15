import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  QuarterlyReview, GoalEvaluation, Client, MonthlyReview
} from '../types';
import {
  saveQuarterlyReview, getQuarterlyReview, getQuarterlyReviews,
  getCurrentProgramPhase, getDefinitiveGoals, getMonthlyReviews
} from '../services/processTrackingService';
import {
  Save, Loader2, Target, CheckCircle2, XCircle, Edit3, Calendar, ClipboardList
} from 'lucide-react';
import { useToast } from './ToastProvider';

interface QuarterlyReviewPanelProps {
  client: Client;
  coachId: string;
  renewalCallId?: string;
  periodStart: string;
  periodEnd: string;
  onSaved?: () => void;
  onNavigateToRoadmap?: () => void;
}

const QuarterlyReviewPanel: React.FC<QuarterlyReviewPanelProps> = ({
  client, coachId, renewalCallId, periodStart, periodEnd, onSaved, onNavigateToRoadmap
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingReview, setExistingReview] = useState<QuarterlyReview | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const [monthlyReviews, setMonthlyReviews] = useState<MonthlyReview[]>([]);

  // Form state - SIMPLIFIED
  const [goalEvaluations, setGoalEvaluations] = useState<GoalEvaluation[]>([]);
  const [actionPlan, setActionPlan] = useState('');

  const phaseInfo = useMemo(() => getCurrentProgramPhase(client.created_at), [client.created_at]);
  const definitiveGoals = useMemo(() => getDefinitiveGoals(client.goals?.roadmap_data, client.goals), [client.goals]);

  useEffect(() => {
    loadData();
  }, [client.id, renewalCallId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load monthly reviews for this quarter
      const allMonthly = await getMonthlyReviews(client.id);
      setMonthlyReviews(allMonthly.filter(r => {
        const rDate = new Date(r.month + '-15');
        return rDate >= new Date(periodStart) && rDate <= new Date(periodEnd);
      }));

      // Check for existing quarterly review
      const allReviews = await getQuarterlyReviews(client.id);
      let review: QuarterlyReview | null = null;

      if (renewalCallId) {
        review = await getQuarterlyReview(client.id, renewalCallId);
      }
      if (!review && allReviews.length > 0) {
        review = allReviews.find(r => {
          const rStart = new Date(r.period_start).getTime();
          const pStart = new Date(periodStart).getTime();
          return Math.abs(rStart - pStart) < 30 * 24 * 3600 * 1000;
        }) || null;
      }

      if (review) {
        setExistingReview(review);
        setCollapsed(true);
        setGoalEvaluations(review.goal_evaluations || []);
        setActionPlan(review.post_call_notes || '');
      } else {
        // Initialize goal evaluations from Camino al Éxito
        const initialEvals: GoalEvaluation[] = [];
        const monthsIn = phaseInfo.monthsInProgram;

        if (definitiveGoals.goal_3_months && monthsIn <= 4) {
          initialEvals.push({ goal_text: `[3M] ${definitiveGoals.goal_3_months}`, status: 'partial' });
        }
        if (definitiveGoals.goal_6_months && monthsIn > 3 && monthsIn <= 7) {
          initialEvals.push({ goal_text: `[6M] ${definitiveGoals.goal_6_months}`, status: 'partial' });
        }
        if (definitiveGoals.goal_1_year && monthsIn > 6) {
          initialEvals.push({ goal_text: `[1A] ${definitiveGoals.goal_1_year}`, status: 'partial' });
        }

        // If no goals matched, add all available
        if (initialEvals.length === 0) {
          if (definitiveGoals.goal_3_months) initialEvals.push({ goal_text: `[3M] ${definitiveGoals.goal_3_months}`, status: 'partial' });
          if (definitiveGoals.goal_6_months) initialEvals.push({ goal_text: `[6M] ${definitiveGoals.goal_6_months}`, status: 'partial' });
          if (definitiveGoals.goal_1_year) initialEvals.push({ goal_text: `[1A] ${definitiveGoals.goal_1_year}`, status: 'partial' });
        }

        setGoalEvaluations(initialEvals);
      }
    } catch (err) {
      console.error('Error loading quarterly review:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateGoalEval = (idx: number, field: keyof GoalEvaluation, value: string) => {
    setGoalEvaluations(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const reviewData = {
        client_id: client.id,
        coach_id: coachId,
        renewal_call_id: renewalCallId || undefined,
        period_start: periodStart,
        period_end: periodEnd,
        goal_evaluations: goalEvaluations,
        post_call_notes: actionPlan.trim() || undefined,
        process_score: 0,
      };

      if (existingReview) {
        const { error } = await supabase
          .from('quarterly_reviews')
          .update(reviewData)
          .eq('id', existingReview.id);
        if (error) throw error;
      } else {
        await saveQuarterlyReview(reviewData);
      }

      toast.success('Revisión trimestral guardada.');
      onSaved?.();
      loadData();
    } catch (err) {
      console.error('Error saving quarterly review:', err);
      toast.error('Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="ml-2 text-sm text-slate-500">Cargando datos del trimestre...</span>
      </div>
    );
  }

  // ─── COLLAPSED SUMMARY ───
  if (collapsed && existingReview) {
    const goalsOk = (existingReview.goal_evaluations || []).filter(g => g.status === 'on_track').length;
    const goalsTotal = (existingReview.goal_evaluations || []).length;
    const goalsFailed = (existingReview.goal_evaluations || []).filter(g => g.status !== 'on_track');

    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="bg-gradient-to-br from-emerald-50 to-indigo-50 rounded-2xl p-5 border border-emerald-200/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Revisión Trimestral Completada</h3>
                <p className="text-[10px] text-slate-500">
                  {new Date(existingReview.period_start).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} — {new Date(existingReview.period_end).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCollapsed(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-600 rounded-lg text-xs font-bold border border-indigo-200 hover:bg-indigo-50 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" /> Editar
            </button>
          </div>

          {/* Results */}
          <div className="space-y-2 mb-3">
            <p className="text-xs font-bold text-slate-600">Objetivos: {goalsOk}/{goalsTotal} conseguidos</p>
            {goalsFailed.map((g, i) => (
              <div key={i} className="flex items-start gap-2 text-xs bg-white/80 rounded-lg p-2 border border-slate-100">
                <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">{g.goal_text}</span>
                  {g.reason && <p className="text-slate-500 text-[10px] mt-0.5">Motivo: {g.reason}</p>}
                </div>
              </div>
            ))}
          </div>

          {existingReview.post_call_notes && (
            <div className="bg-indigo-50/80 rounded-lg p-3 border border-indigo-200/50">
              <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Plan de Acción</p>
              <p className="text-xs text-slate-700">{existingReview.post_call_notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
          <Target className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800">Revisión Trimestral</h3>
          <p className="text-xs text-slate-400">
            {new Date(periodStart).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })} — {new Date(periodEnd).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Camino al Éxito - Objetivos de referencia */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
        <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Target className="w-3.5 h-3.5" /> Objetivos Camino al Éxito (Referencia)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {definitiveGoals.goal_3_months && (
            <div className={`bg-white rounded-xl p-3 border ${phaseInfo.monthsInProgram <= 3 ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-100'}`}>
              <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">3 Meses</p>
              <p className="text-sm text-slate-700 font-medium">{definitiveGoals.goal_3_months}</p>
            </div>
          )}
          {definitiveGoals.goal_6_months && (
            <div className={`bg-white rounded-xl p-3 border ${phaseInfo.monthsInProgram > 3 && phaseInfo.monthsInProgram <= 6 ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-100'}`}>
              <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">6 Meses</p>
              <p className="text-sm text-slate-700 font-medium">{definitiveGoals.goal_6_months}</p>
            </div>
          )}
          {definitiveGoals.goal_1_year && (
            <div className={`bg-white rounded-xl p-3 border ${phaseInfo.monthsInProgram > 6 ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-100'}`}>
              <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">1 Año</p>
              <p className="text-sm text-slate-700 font-medium">{definitiveGoals.goal_1_year}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de revisiones mensuales del trimestre */}
      {monthlyReviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ClipboardList className="w-3.5 h-3.5" /> Revisiones mensuales del trimestre
            </h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase py-2 px-4">Mes</th>
                <th className="text-center text-[10px] font-bold text-slate-400 uppercase py-2 px-3">¿Conseguido?</th>
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase py-2 px-3">Motivo / Plan</th>
              </tr>
            </thead>
            <tbody>
              {monthlyReviews
                .sort((a, b) => a.month.localeCompare(b.month))
                .map((rev, idx) => {
                  const monthDate = new Date(rev.month + '-15');
                  const isAchieved = rev.direction_status === 'on_track';
                  return (
                    <tr key={rev.id || idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-2.5 px-4">
                        <span className="text-xs font-bold text-slate-700 capitalize">
                          {monthDate.toLocaleDateString('es-ES', { month: 'long' })}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isAchieved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600">
                            <CheckCircle2 className="w-4 h-4" /> Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500">
                            <XCircle className="w-4 h-4" /> No
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 max-w-[300px]">
                        <div className="space-y-0.5">
                          {rev.achievements && (
                            <p className="text-[11px] text-slate-600 truncate">Motivo: {rev.achievements}</p>
                          )}
                          {rev.next_month_change && (
                            <p className="text-[11px] text-indigo-600 truncate">Plan: {rev.next_month_change}</p>
                          )}
                          {!rev.achievements && !rev.next_month_change && <span className="text-slate-300">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Evaluación de objetivos del trimestre */}
      {goalEvaluations.length > 0 && (
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" /> ¿Se han conseguido los objetivos del trimestre?
          </h4>

          {goalEvaluations.map((goal, idx) => (
            <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
              <p className="text-sm font-bold text-slate-800">"{goal.goal_text}"</p>

              <div className="flex gap-2">
                <button
                  onClick={() => updateGoalEval(idx, 'status', 'on_track')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-2 rounded-lg transition-all ${goal.status === 'on_track'
                    ? 'bg-green-100 border-green-400 text-green-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-green-300'
                    }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Conseguido
                </button>
                <button
                  onClick={() => updateGoalEval(idx, 'status', 'not_achieved')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-2 rounded-lg transition-all ${goal.status === 'not_achieved'
                    ? 'bg-red-100 border-red-400 text-red-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-red-300'
                    }`}
                >
                  <XCircle className="w-4 h-4" /> No conseguido
                </button>
              </div>

              {(goal.status === 'not_achieved' || goal.status === 'partial') && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-[10px] text-slate-500 font-medium block mb-1">¿Por qué no se consiguió?</label>
                  <input
                    type="text"
                    value={goal.reason || ''}
                    onChange={e => updateGoalEval(idx, 'reason', e.target.value)}
                    placeholder="Motivo..."
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:border-indigo-400 outline-none bg-white"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Plan de acción */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-3">
        <label className="block text-sm font-bold text-slate-700">Plan de acción para el siguiente trimestre</label>
        <textarea
          rows={3}
          value={actionPlan}
          onChange={e => setActionPlan(e.target.value)}
          placeholder="¿Qué vamos a hacer en los próximos 3 meses?"
          className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:border-indigo-400 outline-none resize-none bg-white"
        />
      </div>

      {/* Save */}
      <div className="flex items-center justify-between pt-2">
        {onNavigateToRoadmap && (
          <button
            onClick={onNavigateToRoadmap}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
          >
            <Target className="w-3.5 h-3.5" /> Ir al Camino al Éxito
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 ml-auto"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {existingReview ? 'Actualizar Revisión' : 'Guardar Revisión'}
        </button>
      </div>
    </div>
  );
};

export default QuarterlyReviewPanel;
