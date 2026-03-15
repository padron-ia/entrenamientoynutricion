import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  MonthlyReview, DirectionStatus, WeeklyCoachReview, CoachGoal, RoadmapData, GoalsData
} from '../types';
import {
  getWeeklyCoachReviews, getMonthlyReview, saveMonthlyReview,
  aggregateMonthlyData, getDefinitiveGoals, getCurrentProgramPhase
} from '../services/processTrackingService';
import {
  Save, BarChart3, Target, CheckCircle2, XCircle, Loader2, Calendar
} from 'lucide-react';
import { useToast } from './ToastProvider';

interface MonthlyReviewPanelProps {
  clientId: string;
  coachId: string;
  month: string; // 'YYYY-MM'
  onSaved?: () => void;
  roadmapData?: RoadmapData;
  goalsData?: GoalsData;
  startDate?: string;
  currentWeight?: number;
  initialWeight?: number;
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const MonthlyReviewPanel: React.FC<MonthlyReviewPanelProps> = ({
  clientId, coachId, month, onSaved, roadmapData, goalsData, startDate
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingReview, setExistingReview] = useState<MonthlyReview | null>(null);

  // Weekly data
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyCoachReview[]>([]);
  const [monthGoals, setMonthGoals] = useState<CoachGoal[]>([]);

  // Form state - SIMPLIFIED
  const [achieved, setAchieved] = useState<boolean | null>(null);
  const [reason, setReason] = useState('');
  const [actionPlan, setActionPlan] = useState('');

  const [year, monthNum] = month.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[monthNum - 1]} ${year}`;
  const monthStart = `${month}-01`;
  const monthEnd = new Date(year, monthNum, 0).toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, [clientId, month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const review = await getMonthlyReview(clientId, month);
      if (review) {
        setExistingReview(review);
        setAchieved(review.direction_status === 'on_track');
        setReason(review.achievements || '');
        setActionPlan(review.next_month_change || '');
      }

      const reviews = await getWeeklyCoachReviews(clientId, monthStart, monthEnd);
      setWeeklyReviews(reviews);

      const { data: goals } = await supabase
        .from('coach_goals')
        .select('*')
        .eq('client_id', clientId)
        .gte('completed_at', `${monthStart}T00:00:00`)
        .lte('completed_at', `${monthEnd}T23:59:59`);
      setMonthGoals(goals || []);
    } catch (err) {
      console.error('Error loading monthly data:', err);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    return aggregateMonthlyData(weeklyReviews, monthGoals);
  }, [weeklyReviews, monthGoals]);

  const handleSave = async () => {
    if (achieved === null) return toast.error('Indica si el objetivo del mes se ha conseguido o no.');

    setSaving(true);
    try {
      await saveMonthlyReview({
        client_id: clientId,
        coach_id: coachId,
        month,
        direction_status: achieved ? 'on_track' as DirectionStatus : 'off_track' as DirectionStatus,
        alignment: 'aligned',
        main_reason: 'mixed',
        achievements: !achieved ? reason.trim() || undefined : undefined,
        next_month_change: actionPlan.trim() || undefined,
        ...summary,
        process_score: 0,
      });

      toast.success('Revisión mensual guardada.');
      onSaved?.();
    } catch (err) {
      console.error('Error saving monthly review:', err);
      toast.error('Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  // Camino al Éxito goals
  const definitiveGoals = useMemo(() => getDefinitiveGoals(roadmapData, goalsData), [roadmapData, goalsData]);
  const phaseInfo = useMemo(() => getCurrentProgramPhase(startDate), [startDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="ml-2 text-sm text-slate-500">Cargando datos del mes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Revisión Mensual</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{monthLabel}</p>
          </div>
        </div>
        {existingReview && (
          <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase">Completada</span>
          </div>
        )}
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
        {phaseInfo.monthsInProgram > 0 && (
          <p className="text-[10px] text-indigo-400 mt-2">Mes {phaseInfo.monthsInProgram} del programa — El objetivo resaltado es el relevante ahora</p>
        )}
      </div>

      {/* Tabla de semanas del mes */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Resumen semanal del mes
          </h4>
        </div>
        {weeklyReviews.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase py-2 px-4">Semana</th>
                <th className="text-center text-[10px] font-bold text-slate-400 uppercase py-2 px-3">Objetivos</th>
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase py-2 px-3">Notas</th>
              </tr>
            </thead>
            <tbody>
              {weeklyReviews
                .sort((a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime())
                .map((review, i) => {
                  const weekDate = new Date(review.week_start);
                  return (
                    <tr key={review.id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-2.5 px-4">
                        <span className="text-xs font-bold text-slate-700">
                          {weekDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {review.goals_fulfilled > 0 && <span className="text-xs font-bold text-emerald-600">✅ {review.goals_fulfilled}</span>}
                          {(review.goals_not_fulfilled > 0 || review.goals_partial > 0) && (
                            <span className="text-xs font-bold text-red-500">❌ {review.goals_not_fulfilled + review.goals_partial}</span>
                          )}
                          {review.goals_fulfilled === 0 && review.goals_partial === 0 && review.goals_not_fulfilled === 0 && (
                            <span className="text-slate-300">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 max-w-[250px]">
                        {review.coach_note ? (
                          <span className="text-[11px] text-slate-500 truncate block">{review.coach_note}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            No hay revisiones semanales para este mes
          </div>
        )}
      </div>

      {/* Formulario simplificado */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-5">
        <h4 className="text-sm font-bold text-slate-700">¿Se ha conseguido el objetivo del mes?</h4>

        <div className="flex gap-3">
          <button
            onClick={() => setAchieved(true)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-2 rounded-xl transition-all ${achieved === true
                ? 'bg-green-100 border-green-400 text-green-700 shadow-md'
                : 'bg-white border-slate-200 text-slate-400 hover:border-green-300'
              }`}
          >
            <CheckCircle2 className="w-5 h-5" /> Sí, conseguido
          </button>
          <button
            onClick={() => setAchieved(false)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-2 rounded-xl transition-all ${achieved === false
                ? 'bg-red-100 border-red-400 text-red-700 shadow-md'
                : 'bg-white border-slate-200 text-slate-400 hover:border-red-300'
              }`}
          >
            <XCircle className="w-5 h-5" /> No conseguido
          </button>
        </div>

        {achieved === false && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">¿Por qué no se ha conseguido?</label>
              <textarea
                rows={2}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Describe brevemente el motivo..."
                className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:border-indigo-400 outline-none resize-none bg-white"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Plan de acción para el siguiente mes</label>
          <textarea
            rows={2}
            value={actionPlan}
            onChange={e => setActionPlan(e.target.value)}
            placeholder="¿Qué vamos a hacer diferente o mantener?"
            className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:border-indigo-400 outline-none resize-none bg-white"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {existingReview ? 'Actualizar Revisión' : 'Guardar Revisión'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReviewPanel;
