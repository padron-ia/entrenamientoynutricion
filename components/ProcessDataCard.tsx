import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  WeeklyCoachReview, MonthlyReview, CoachGoal, GoalReasonCategory,
  RoadmapData, GoalsData
} from '../types';
import {
  getWeeklyCoachReviews, getMonthlyReviews,
  calculateProcessScore, analyzePatterns, PatternAnalysis,
  analyzeStrategicAlignment,
  REASON_CATEGORY_LABELS, REASON_DETAIL_LABELS, FEELING_LABELS,
  getCurrentProgramPhase, filterValidGoals, PROGRAM_PHASES_INFO,
  getDefinitiveGoals
} from '../services/processTrackingService';
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, Loader2, MessageSquare, Compass } from 'lucide-react';

interface ProcessDataCardProps {
  clientId: string;
  periodStart?: string;
  periodEnd?: string;
  compact?: boolean;
  startDate?: string;
  roadmapData?: RoadmapData;
  goals?: GoalsData;
  showObjectives?: boolean;
  initialWeight?: number;
  currentWeight?: number;
  targetWeight?: number;
  lastHba1c?: string;
  initialHba1c?: string;
}

const ProcessDataCard: React.FC<ProcessDataCardProps> = ({ clientId, periodStart, periodEnd, compact = false, startDate, roadmapData, goals, showObjectives = false, initialWeight, currentWeight, targetWeight, lastHba1c, initialHba1c }) => {
  const [loading, setLoading] = useState(true);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyCoachReview[]>([]);
  const [monthlyReviews, setMonthlyReviews] = useState<MonthlyReview[]>([]);
  const [coachGoals, setCoachGoals] = useState<CoachGoal[]>([]);
  const [processScore, setProcessScore] = useState(0);
  const [patterns, setPatterns] = useState<PatternAnalysis | null>(null);

  useEffect(() => {
    loadData();
  }, [clientId, periodStart, periodEnd]);

  const loadData = async () => {
    setLoading(true);
    try {
      const reviews = await getWeeklyCoachReviews(clientId, periodStart, periodEnd);
      setWeeklyReviews(reviews);

      const monthly = await getMonthlyReviews(clientId);
      setMonthlyReviews(monthly);

      let allGoals: any[] = [];
      try {
        const { data: goalsData, error } = await supabase
          .from('coach_goals')
          .select('*')
          .eq('client_id', clientId)
          .not('completion_status', 'is', null);
        if (!error) allGoals = goalsData || [];
      } catch (e) {
        console.warn('coach_goals query failed:', e);
      }
      setCoachGoals(allGoals);

      const score = calculateProcessScore(reviews, allGoals, reviews.length, reviews.length || 1);
      setProcessScore(score);

      const analysis = analyzePatterns(allGoals, monthly);
      setPatterns(analysis);
    } catch (err) {
      console.error('Error loading process data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
        <span className="ml-2 text-xs text-slate-500">Cargando datos del proceso...</span>
      </div>
    );
  }

  if (weeklyReviews.length === 0 && coachGoals.length === 0) {
    return (
      <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <BarChart3 className="w-6 h-6 text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-400">No hay datos de proceso todavía.</p>
        <p className="text-[10px] text-slate-400">Los datos aparecerán tras las primeras valoraciones semanales.</p>
      </div>
    );
  }

  // Trend calculation
  const getTrend = () => {
    if (patterns && patterns.monthlyTrend.length >= 2) {
      const last = patterns.monthlyTrend[patterns.monthlyTrend.length - 1];
      const prev = patterns.monthlyTrend[patterns.monthlyTrend.length - 2];
      if (last.fulfillmentRate > prev.fulfillmentRate) return 'up';
      if (last.fulfillmentRate < prev.fulfillmentRate) return 'down';
    }
    return 'stable';
  };
  const trend = getTrend();
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500';
  const trendLabel = trend === 'up' ? 'Mejorando' : trend === 'down' ? 'Empeorando' : 'Estable';

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
        <div className="text-center">
          <p className="text-lg font-black text-indigo-700">{processScore}</p>
          <p className="text-[9px] text-indigo-500 font-medium">/100</p>
        </div>
        <div className="h-8 w-px bg-indigo-200" />
        <div className="flex items-center gap-1">
          <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
          <span className={`text-[10px] font-bold ${trendColor}`}>{trendLabel}</span>
        </div>
        <div className="h-8 w-px bg-indigo-200" />
        <div className="text-[10px] text-slate-600">
          {patterns?.fulfillmentRate ?? 0}% objetivos cumplidos
        </div>
      </div>
    );
  }

  const phaseInfo = getCurrentProgramPhase(startDate);
  const alignment = roadmapData ? analyzeStrategicAlignment(roadmapData, weeklyReviews) : null;

  // Evolution header calculations
  const weightChange = (currentWeight && initialWeight) ? currentWeight - initialWeight : null;
  const weightProgress = (initialWeight && currentWeight && targetWeight && initialWeight !== targetWeight)
    ? Math.min(100, Math.max(0, Math.round(((initialWeight - currentWeight) / (initialWeight - targetWeight)) * 100)))
    : null;
  const definitiveGoals = getDefinitiveGoals(roadmapData, goals);

  return (
    <div className="space-y-4">
      {/* Evolution Header: Where started → Where now → Where going */}
      {(initialWeight || currentWeight || targetWeight) && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Punto de Partida</p>
            <p className="text-2xl font-black text-slate-800">{initialWeight ? `${initialWeight}` : '—'}<span className="text-sm text-slate-400 ml-0.5">kg</span></p>
            {initialHba1c && <p className="text-[10px] text-slate-500">HbA1c: {initialHba1c}%</p>}
            {startDate && <p className="text-[10px] text-slate-400 mt-0.5">{new Date(startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
          </div>
          <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-200 text-center relative">
            <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 text-indigo-300 text-sm font-bold">→</div>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hoy</p>
            <p className="text-2xl font-black text-indigo-800">{currentWeight ? `${currentWeight}` : '—'}<span className="text-sm text-indigo-400 ml-0.5">kg</span></p>
            {lastHba1c && <p className="text-[10px] text-indigo-500">HbA1c: {lastHba1c}%</p>}
            {weightChange !== null && (
              <p className={`text-xs font-bold mt-0.5 ${weightChange <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {weightChange <= 0 ? '' : '+'}{weightChange.toFixed(1)} kg
              </p>
            )}
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-center relative">
            <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 text-emerald-300 text-sm font-bold">→</div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Objetivo</p>
            <p className="text-2xl font-black text-emerald-800">{targetWeight ? `${targetWeight}` : '—'}<span className="text-sm text-emerald-400 ml-0.5">kg</span></p>
            {definitiveGoals.goal_1_year && definitiveGoals.goal_1_year.trim() !== '' && (
              <p className="text-[10px] text-emerald-600 truncate">{definitiveGoals.goal_1_year}</p>
            )}
            {weightProgress !== null && (
              <p className="text-xs font-bold text-emerald-700 mt-0.5">{weightProgress}% completado</p>
            )}
          </div>
        </div>
      )}

      {/* Process Score Header - Enriched with Phase & Alignment */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Process Score
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-indigo-800">{processScore}</span>
              <span className="text-sm text-indigo-500 font-medium">/100</span>
              {alignment && (
                <>
                  <span className="text-slate-300 mx-1">|</span>
                  <Compass className={`w-3.5 h-3.5 ${alignment.isOnTrack ? 'text-emerald-500' : alignment.alignmentPercent < 50 ? 'text-rose-500' : 'text-amber-500'}`} />
                  <span className={`text-sm font-bold ${alignment.isOnTrack ? 'text-emerald-600' : alignment.alignmentPercent < 50 ? 'text-rose-600' : 'text-amber-600'}`}>
                    {alignment.alignmentPercent}% alineado
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className={`flex items-center gap-1 justify-end ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-sm font-bold">{trendLabel}</span>
            </div>
            <p className="text-[10px] text-slate-500">{weeklyReviews.length} semanas analizadas</p>
            {startDate && (
              <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">
                {phaseInfo.phaseName} (Mes {phaseInfo.monthsInProgram})
              </span>
            )}
          </div>
        </div>

        {roadmapData?.dream_result?.goal && (
          <p className="text-xs text-indigo-600/70 mt-2 italic truncate">
            Meta: &ldquo;{roadmapData.dream_result.goal}&rdquo;
          </p>
        )}

        {/* Score bar */}
        <div className="mt-3 h-2 bg-indigo-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${processScore >= 70 ? 'bg-green-500' : processScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
              }`}
            style={{ width: `${processScore}%` }}
          />
        </div>
      </div>

      {/* Objectives (only when showObjectives is true) */}
      {showObjectives && (() => {
        const dg = getDefinitiveGoals(roadmapData, goals);
        const rawGoals = [
          { text: dg.goal_3_months, label: '3M', status: dg.goal_3_months_status },
          { text: dg.goal_6_months, label: '6M', status: dg.goal_6_months_status },
          { text: dg.goal_1_year, label: '1A', status: dg.goal_1_year_status },
        ];
        const goalsSource = dg.source;
        const validGoals = filterValidGoals(rawGoals);
        if (validGoals.length === 0) return null;

        return (
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/20 p-4 rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-500" /> Objetivos a Largo Plazo
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${goalsSource === 'roadmap' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                {goalsSource === 'roadmap' ? 'Camino al Éxito' : 'Pendiente de ajuste'}
              </span>
            </p>
            <div className={`grid grid-cols-1 ${validGoals.length > 1 ? `md:grid-cols-${Math.min(validGoals.length, 3)}` : ''} gap-3`}>
              {validGoals.map((g, i) => {
                const labels: Record<string, string> = { '3M': '🎯 3 Meses', '6M': '🚀 6 Meses', '1A': '🏆 1 Año' };
                const phaseRef = g.label === '3M' ? PROGRAM_PHASES_INFO[0].targets[0]
                  : g.label === '6M' ? PROGRAM_PHASES_INFO[1].targets[0]
                    : g.label === '1A' ? PROGRAM_PHASES_INFO[2].targets[0]
                      : null;

                return (
                  <div key={i} className={`p-3 rounded-xl border shadow-sm ${g.status === 'achieved' ? 'bg-emerald-50 border-emerald-200' :
                      g.status === 'failed' ? 'bg-red-50 border-red-200' :
                        'bg-white border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{labels[g.label] || g.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${g.status === 'achieved' ? 'bg-emerald-100 text-emerald-700' :
                          g.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'}`}>
                        {g.status === 'achieved' ? 'Conseguido' : g.status === 'failed' ? 'No conseguido' : 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{g.text}</p>
                    {phaseRef && (
                      <p className="text-[10px] text-indigo-400 mt-1">Ref. fase: {phaseRef}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-indigo-500" /> Timeline semana a semana
        </p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {weeklyReviews.map((review, idx) => {
            const emoji = review.feeling === 'green' ? '🟢' : review.feeling === 'yellow' ? '🟡' : '🔴';
            const total = review.goals_fulfilled + review.goals_partial + review.goals_not_fulfilled;
            const weekDate = new Date(review.week_start).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

            return (
              <div key={review.id || idx} className="flex items-start gap-2 text-xs">
                <span className="font-mono text-slate-400 w-16 shrink-0">Sem {idx + 1}</span>
                <span>{emoji}</span>
                <span className="text-slate-600">
                  {review.goals_fulfilled > 0 && <span className="text-green-600">✅{review.goals_fulfilled}</span>}
                  {review.goals_partial > 0 && <span className="text-amber-600 ml-1">⚠️{review.goals_partial}</span>}
                  {review.goals_not_fulfilled > 0 && <span className="text-red-600 ml-1">❌{review.goals_not_fulfilled}</span>}
                  {total === 0 && <span className="text-slate-400">sin objetivos</span>}
                </span>
                <span className="text-slate-400 ml-auto">{weekDate}</span>
                {review.coach_note && (
                  <span className="text-slate-400" title={review.coach_note}>
                    <MessageSquare className="w-3 h-3" />
                  </span>
                )}
              </div>
            );
          })}
          {weeklyReviews.length === 0 && (
            <p className="text-xs text-slate-400 italic py-2">Sin valoraciones semanales registradas.</p>
          )}
        </div>
      </div>

      {/* Pattern Analysis */}
      {patterns && patterns.totalGoals > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-700 mb-3">Análisis de patrones</p>

          {/* Goal breakdown */}
          <div className="flex gap-4 mb-3">
            <div className="text-center">
              <p className="text-lg font-black text-slate-800">{patterns.totalGoals}</p>
              <p className="text-[9px] text-slate-500">Total</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-green-600">{patterns.fulfillmentRate}%</p>
              <p className="text-[9px] text-slate-500">Cumplidos</p>
            </div>
          </div>

          {/* Reason breakdown */}
          {patterns.reasonBreakdown.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-slate-500 font-medium mb-1.5">Cuando fallan, ¿de quién es?</p>
              <div className="flex flex-wrap gap-1.5">
                {patterns.reasonBreakdown.map(r => (
                  <span key={r.category} className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                    {REASON_CATEGORY_LABELS[r.category]} {r.percentage}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detail breakdown */}
          {patterns.detailBreakdown.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-slate-500 font-medium mb-1.5">Motivos específicos:</p>
              <div className="flex flex-wrap gap-1.5">
                {patterns.detailBreakdown.slice(0, 5).map(d => (
                  <span key={d.detail} className="text-[10px] font-medium bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-100">
                    {REASON_DETAIL_LABELS[d.detail]} ({d.count}x)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Monthly trend */}
          {patterns.monthlyTrend.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 font-medium mb-1.5">Tendencia mensual:</p>
              <div className="flex items-end gap-2">
                {patterns.monthlyTrend.map((m, i) => {
                  const isLast = i === patterns.monthlyTrend.length - 1;
                  const prev = i > 0 ? patterns.monthlyTrend[i - 1].fulfillmentRate : m.fulfillmentRate;
                  const arrow = m.fulfillmentRate > prev ? '↗️' : m.fulfillmentRate < prev ? '↘️' : '→';
                  return (
                    <div key={m.month} className={`text-center ${isLast ? 'font-bold' : ''}`}>
                      <p className="text-xs text-slate-700">{m.fulfillmentRate}%</p>
                      <p className="text-[9px] text-slate-400">{m.month.split('-')[1]}/{m.month.split('-')[0].slice(2)}</p>
                      {i > 0 && <span className="text-[10px]">{arrow}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Reviews Summary */}
      {monthlyReviews.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-700 mb-3">Resúmenes mensuales</p>
          <div className="space-y-2">
            {monthlyReviews.map(mr => {
              const dirEmoji = mr.direction_status === 'on_track' ? '🟢' : mr.direction_status === 'at_risk' ? '🟡' : '🔴';
              const dirLabel = mr.direction_status === 'on_track' ? 'En línea' : mr.direction_status === 'at_risk' ? 'En riesgo' : 'Desviado';
              const [y, m] = mr.month.split('-');
              const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
              const label = `${MONTHS[parseInt(m) - 1]} ${y}`;
              return (
                <div key={mr.id} className="flex items-start gap-2 text-xs py-1 border-b border-slate-100 last:border-0">
                  <span className="font-medium text-slate-600 w-16 shrink-0">{label}</span>
                  <span>{dirEmoji} {dirLabel}</span>
                  {mr.achievements && <span className="text-slate-500 truncate flex-1">| {mr.achievements}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessDataCard;
