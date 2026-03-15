import { supabase } from './supabaseClient';
import {
  WeeklyCoachReview, MonthlyReview, QuarterlyReview,
  CoachGoal, GoalCompletionStatus, GoalReasonCategory, GoalReasonDetail,
  WeekFeeling, NextWeekDecision, SuccessMilestone, RoadmapData, StrategicAlignment,
  GoalsData, AdjustedGoals
} from '../types';

// ─── Week Number Calculation ────────────────────────────────
// Week runs Friday to Thursday (matching existing CRM convention)

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const daysBackToFriday = (day + 2) % 7;
  d.setDate(d.getDate() - daysBackToFriday);
  return d;
}

export function getWeekNumber(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const weekStart = getWeekStart(date);
  const diff = weekStart.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export function formatWeekStart(date: Date = new Date()): string {
  return getWeekStart(date).toISOString().split('T')[0];
}

// ─── Reason Labels (for display) ────────────────────────────

export const REASON_CATEGORY_LABELS: Record<GoalReasonCategory, string> = {
  client: 'Del cliente',
  goal: 'Del objetivo',
  context: 'Del contexto',
  plan: 'Del plan/enfoque',
};

export const REASON_DETAIL_LABELS: Record<GoalReasonDetail, string> = {
  // Client
  not_actioned: 'No ha accionado',
  poor_organization: 'Falta de organización / tiempo',
  demotivation: 'Desmotivación / bloqueo mental',
  not_understood: 'No ha entendido qué hacer',
  // Goal
  too_ambitious: 'Demasiado ambicioso',
  too_vague: 'Poco concreto / difuso',
  uncontrollable: 'Dependía de algo no controlable',
  not_priority: 'No era prioritario',
  // Context
  travel_event: 'Viaje / evento social',
  illness_injury: 'Enfermedad / lesión',
  work_personal_stress: 'Estrés laboral / personal',
  routine_change: 'Cambio de rutina puntual',
  // Plan
  nutrition_plan_mismatch: 'El plan nutricional no encaja',
  training_not_viable: 'El entrenamiento no es viable',
  lack_tools: 'Falta de herramientas / conocimiento',
  needs_more_support: 'Necesita más acompañamiento',
};

export const REASON_DETAILS_BY_CATEGORY: Record<GoalReasonCategory, GoalReasonDetail[]> = {
  client: ['not_actioned', 'poor_organization', 'demotivation', 'not_understood'],
  goal: ['too_ambitious', 'too_vague', 'uncontrollable', 'not_priority'],
  context: ['travel_event', 'illness_injury', 'work_personal_stress', 'routine_change'],
  plan: ['nutrition_plan_mismatch', 'training_not_viable', 'lack_tools', 'needs_more_support'],
};

export const FEELING_LABELS: Record<WeekFeeling, string> = {
  green: 'Bien',
  yellow: 'Regular',
  red: 'Mal',
};

export const DECISION_LABELS: Record<NextWeekDecision, string> = {
  maintain: 'Mantener',
  simplify: 'Simplificar',
  change_approach: 'Cambiar enfoque',
};

export const COMPLETION_STATUS_LABELS: Record<GoalCompletionStatus, string> = {
  fulfilled: 'Cumplido',
  partial: 'Parcial',
  not_fulfilled: 'No cumplido',
};

// ─── CRUD: Weekly Coach Reviews ─────────────────────────────

export async function saveWeeklyCoachReview(review: Omit<WeeklyCoachReview, 'id' | 'created_at'>): Promise<WeeklyCoachReview | null> {
  const { data, error } = await supabase
    .from('weekly_coach_reviews')
    .upsert({
      client_id: review.client_id,
      coach_id: review.coach_id,
      checkin_id: review.checkin_id || null,
      week_start: review.week_start,
      week_number: review.week_number,
      feeling: review.feeling,
      next_week_decision: review.next_week_decision,
      coach_note: review.coach_note || null,
      goals_fulfilled: review.goals_fulfilled,
      goals_partial: review.goals_partial,
      goals_not_fulfilled: review.goals_not_fulfilled,
    }, { onConflict: 'client_id,week_start' })
    .select()
    .single();

  if (error) {
    console.error('Error saving weekly coach review:', error);
    return null;
  }
  return data;
}

export async function getWeeklyCoachReviews(clientId: string, fromDate?: string, toDate?: string): Promise<WeeklyCoachReview[]> {
  let query = supabase
    .from('weekly_coach_reviews')
    .select('*')
    .eq('client_id', clientId)
    .order('week_start', { ascending: true });

  if (fromDate) query = query.gte('week_start', fromDate);
  if (toDate) query = query.lte('week_start', toDate);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching weekly reviews:', error);
    return [];
  }
  return data || [];
}

// ─── CRUD: Update Coach Goal with Assessment ────────────────

export async function updateGoalAssessment(
  goalId: string,
  completionStatus: GoalCompletionStatus,
  reasonCategory?: GoalReasonCategory,
  reasonDetail?: GoalReasonDetail,
  weekNumber?: number
): Promise<boolean> {
  const now = new Date().toISOString();
  const newStatus = completionStatus === 'fulfilled' ? 'achieved' : 'failed';

  const updateData: Record<string, any> = {
    status: newStatus,
    completion_status: completionStatus,
    completed_at: now,
  };

  if (weekNumber !== undefined) updateData.week_number = weekNumber;
  if (reasonCategory) updateData.reason_category = reasonCategory;
  if (reasonDetail) updateData.reason_detail = reasonDetail;

  const { error } = await supabase
    .from('coach_goals')
    .update(updateData)
    .eq('id', goalId);

  if (error) {
    console.error('Error updating goal assessment:', error);
    return false;
  }
  return true;
}

// ─── CRUD: Monthly Reviews ──────────────────────────────────

export async function saveMonthlyReview(review: Omit<MonthlyReview, 'id' | 'created_at'>): Promise<MonthlyReview | null> {
  const { data, error } = await supabase
    .from('monthly_reviews')
    .upsert({
      client_id: review.client_id,
      coach_id: review.coach_id,
      month: review.month,
      direction_status: review.direction_status,
      alignment: review.alignment,
      main_reason: review.main_reason,
      achievements: review.achievements || null,
      next_month_change: review.next_month_change || null,
      weeks_reviewed: review.weeks_reviewed,
      weeks_green: review.weeks_green,
      weeks_yellow: review.weeks_yellow,
      weeks_red: review.weeks_red,
      total_goals: review.total_goals,
      goals_fulfilled: review.goals_fulfilled,
      goals_partial: review.goals_partial,
      goals_not_fulfilled: review.goals_not_fulfilled,
      process_score: review.process_score,
    }, { onConflict: 'client_id,month' })
    .select()
    .single();

  if (error) {
    console.error('Error saving monthly review:', error);
    return null;
  }
  return data;
}

export async function getMonthlyReviews(clientId: string): Promise<MonthlyReview[]> {
  const { data, error } = await supabase
    .from('monthly_reviews')
    .select('*')
    .eq('client_id', clientId)
    .order('month', { ascending: true });

  if (error) {
    console.error('Error fetching monthly reviews:', error);
    return [];
  }
  return data || [];
}

export async function getMonthlyReview(clientId: string, month: string): Promise<MonthlyReview | null> {
  const { data, error } = await supabase
    .from('monthly_reviews')
    .select('*')
    .eq('client_id', clientId)
    .eq('month', month)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching monthly review:', error);
  }
  return data || null;
}

// ─── CRUD: Quarterly Reviews ────────────────────────────────

export async function saveQuarterlyReview(review: Omit<QuarterlyReview, 'id' | 'created_at'>): Promise<QuarterlyReview | null> {
  const { data, error } = await supabase
    .from('quarterly_reviews')
    .upsert({
      client_id: review.client_id,
      coach_id: review.coach_id,
      renewal_call_id: review.renewal_call_id || null,
      period_start: review.period_start,
      period_end: review.period_end,
      goal_evaluations: review.goal_evaluations,
      client_classification: review.client_classification || null,
      recommendation: review.recommendation || null,
      pre_call_notes: review.pre_call_notes || null,
      post_call_notes: review.post_call_notes || null,
      process_score: review.process_score,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving quarterly review:', error);
    return null;
  }
  return data;
}

export async function getQuarterlyReview(clientId: string, renewalCallId: string): Promise<QuarterlyReview | null> {
  const { data, error } = await supabase
    .from('quarterly_reviews')
    .select('*')
    .eq('client_id', clientId)
    .eq('renewal_call_id', renewalCallId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching quarterly review:', error);
  }
  return data || null;
}

export async function getQuarterlyReviews(clientId: string): Promise<QuarterlyReview[]> {
  const { data, error } = await supabase
    .from('quarterly_reviews')
    .select('*')
    .eq('client_id', clientId)
    .order('period_start', { ascending: true });

  if (error) {
    console.error('Error fetching quarterly reviews:', error);
    return [];
  }
  return data || [];
}

// ─── Process Score Calculation ──────────────────────────────

export function calculateProcessScore(
  weeklyReviews: WeeklyCoachReview[],
  goals: CoachGoal[],
  checkinsSent: number,
  totalWeeks: number
): number {
  if (totalWeeks === 0) return 0;

  // 1. Goal fulfillment rate (40%)
  const closedGoals = goals.filter(g => g.completion_status);
  const goalScore = closedGoals.length > 0
    ? (closedGoals.filter(g => g.completion_status === 'fulfilled').length / closedGoals.length) * 100
    : 50; // neutral if no goals

  // 2. Feeling average (20%): green=100, yellow=50, red=0
  const feelingMap: Record<WeekFeeling, number> = { green: 100, yellow: 50, red: 0 };
  const feelingScore = weeklyReviews.length > 0
    ? weeklyReviews.reduce((sum, r) => sum + feelingMap[r.feeling], 0) / weeklyReviews.length
    : 50;

  // 3. Direction consistency from monthly reviews (25%) - calculated externally
  // For now, use feeling trend as proxy
  const directionScore = feelingScore;

  // 4. Check-in consistency (15%)
  const checkinScore = totalWeeks > 0 ? (checkinsSent / totalWeeks) * 100 : 50;

  const score = Math.round(
    goalScore * 0.40 +
    feelingScore * 0.20 +
    directionScore * 0.25 +
    checkinScore * 0.15
  );

  return Math.min(100, Math.max(0, score));
}

// ─── Aggregate Monthly Data from Weekly Reviews ─────────────

export function aggregateMonthlyData(
  weeklyReviews: WeeklyCoachReview[],
  goals: CoachGoal[]
) {
  const weeks_reviewed = weeklyReviews.length;
  const weeks_green = weeklyReviews.filter(r => r.feeling === 'green').length;
  const weeks_yellow = weeklyReviews.filter(r => r.feeling === 'yellow').length;
  const weeks_red = weeklyReviews.filter(r => r.feeling === 'red').length;

  const closedGoals = goals.filter(g => g.completion_status);
  const total_goals = closedGoals.length;
  const goals_fulfilled = closedGoals.filter(g => g.completion_status === 'fulfilled').length;
  const goals_partial = closedGoals.filter(g => g.completion_status === 'partial').length;
  const goals_not_fulfilled = closedGoals.filter(g => g.completion_status === 'not_fulfilled').length;

  return {
    weeks_reviewed,
    weeks_green,
    weeks_yellow,
    weeks_red,
    total_goals,
    goals_fulfilled,
    goals_partial,
    goals_not_fulfilled,
  };
}

// ─── Pattern Analysis (for renewal ficha) ───────────────────

export interface PatternAnalysis {
  totalGoals: number;
  fulfilled: number;
  partial: number;
  notFulfilled: number;
  fulfillmentRate: number;
  reasonBreakdown: { category: GoalReasonCategory; count: number; percentage: number }[];
  detailBreakdown: { detail: GoalReasonDetail; count: number }[];
  monthlyTrend: { month: string; fulfillmentRate: number; score?: number }[];
}

export function analyzePatterns(
  goals: CoachGoal[],
  monthlyReviews: MonthlyReview[]
): PatternAnalysis {
  const closedGoals = goals.filter(g => g.completion_status);
  const totalGoals = closedGoals.length;
  const fulfilled = closedGoals.filter(g => g.completion_status === 'fulfilled').length;
  const partial = closedGoals.filter(g => g.completion_status === 'partial').length;
  const notFulfilled = closedGoals.filter(g => g.completion_status === 'not_fulfilled').length;
  const fulfillmentRate = totalGoals > 0 ? Math.round((fulfilled / totalGoals) * 100) : 0;

  // Reason breakdown
  const failedGoals = closedGoals.filter(g => g.reason_category);
  const reasonCounts: Record<string, number> = {};
  const detailCounts: Record<string, number> = {};

  failedGoals.forEach(g => {
    if (g.reason_category) {
      reasonCounts[g.reason_category] = (reasonCounts[g.reason_category] || 0) + 1;
    }
    if (g.reason_detail) {
      detailCounts[g.reason_detail] = (detailCounts[g.reason_detail] || 0) + 1;
    }
  });

  const totalReasons = failedGoals.length || 1;
  const reasonBreakdown = Object.entries(reasonCounts)
    .map(([category, count]) => ({
      category: category as GoalReasonCategory,
      count,
      percentage: Math.round((count / totalReasons) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const detailBreakdown = Object.entries(detailCounts)
    .map(([detail, count]) => ({
      detail: detail as GoalReasonDetail,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Monthly trend
  const monthlyTrend = monthlyReviews.map(mr => ({
    month: mr.month,
    fulfillmentRate: mr.total_goals > 0 ? Math.round((mr.goals_fulfilled / mr.total_goals) * 100) : 0,
    score: mr.process_score,
  }));

  return {
    totalGoals,
    fulfilled,
    partial,
    notFulfilled,
    fulfillmentRate,
    reasonBreakdown,
    detailBreakdown,
    monthlyTrend,
  };
}

// ─── Get Pending Monthly Reviews for Coach ──────────────────

export function getPendingMonthlyReviewMonth(): string | null {
  const now = new Date();
  const day = now.getDate();
  // Only show pending during first 7 days of month
  if (day > 7) return null;
  // Return previous month
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

export async function getClientsWithPendingMonthlyReview(
  clientIds: string[],
  month: string
): Promise<string[]> {
  if (clientIds.length === 0) return [];

  const { data, error } = await supabase
    .from('monthly_reviews')
    .select('client_id')
    .eq('month', month)
    .in('client_id', clientIds);

  if (error) {
    console.error('Error checking pending monthly reviews:', error);
    return clientIds; // Assume all pending on error
  }

  const reviewedIds = new Set((data || []).map(r => r.client_id));
  return clientIds.filter(id => !reviewedIds.has(id));
}

// ─── Strategic Alignment & Deviation ─────────────────────────

export function analyzeStrategicAlignment(
  roadmapData: RoadmapData,
  weeklyReviews: WeeklyCoachReview[]
): StrategicAlignment {
  const milestones = roadmapData?.milestones || [];
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;

  // Calculate base alignment from milestones (50%)
  const milestoneScore = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  // Calculate adherence alignment from last 4 weekly reviews (50%)
  const recentReviews = weeklyReviews.slice(-4);
  const adherenceScore = recentReviews.length > 0
    ? (recentReviews.filter(r => r.feeling === 'green').length / recentReviews.length) * 100
    : 50;

  const alignmentPercent = Math.round(milestoneScore * 0.5 + adherenceScore * 0.5);

  // Detect active phase based on current milestone or timing
  const activePhaseIndex = milestones.findIndex(m => m.status === 'current');

  // Basic track detection
  const isOnTrack = alignmentPercent >= 70;

  let deviationAlert;
  if (alignmentPercent < 50) {
    deviationAlert = 'Desvío crítico: Baja adherencia y falta de progreso en hitos.';
  } else if (!isOnTrack && completedMilestones === 0 && weeklyReviews.length > 4) {
    deviationAlert = 'Desvío leve: No se han completado hitos en el primer mes.';
  }

  return {
    alignmentPercent,
    completedMilestones,
    totalMilestones,
    isOnTrack,
    activePhaseIndex: activePhaseIndex !== -1 ? activePhaseIndex : 0,
    deviationAlert
  };
}

export function detectStrategicDeviation(
  alignment: StrategicAlignment,
  lastFeeling: WeekFeeling
): string | null {
  if (alignment.alignmentPercent < 40) return 'RED_ALERT: Trayectoria crítica fuera de rumbo';
  if (lastFeeling === 'red' && !alignment.isOnTrack) return 'YELLOW_ALERT: Riesgo de abandono por falta de resultados';
  return null;
}

// ─── Program Phase Detection ─────────────────────────────

export const PROGRAM_PHASES_INFO = [
  { name: "Fase 1: Inicial", duration: "Mes 1-3", monthStart: 1, monthEnd: 3, targets: ["Perder 5-7 kg", "HbA1c -0.5-1%"] },
  { name: "Fase 2: Afianzamiento", duration: "Mes 4-6", monthStart: 4, monthEnd: 6, targets: ["Perder 7-11 kg total", "HbA1c -1-2%"] },
  { name: "Fase 3: Consolidación", duration: "Mes 7-12", monthStart: 7, monthEnd: 12, targets: ["Perder 11-20 kg total", "Normalizar HbA1c"] },
  { name: "Fase 4: Mantenimiento", duration: "+12 Meses", monthStart: 13, monthEnd: 999, targets: ["Objetivo final", "Posible reversión T2D"] },
];

export interface CurrentPhaseInfo {
  phaseIndex: number;
  phaseName: string;
  monthsInProgram: number;
  targets: string[];
}

export function getCurrentProgramPhase(startDate: string | undefined): CurrentPhaseInfo {
  if (!startDate) {
    return { phaseIndex: 0, phaseName: PROGRAM_PHASES_INFO[0].name, monthsInProgram: 0, targets: PROGRAM_PHASES_INFO[0].targets };
  }
  const start = new Date(startDate);
  const now = new Date();
  const monthsInProgram = Math.max(1,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1
  );
  const phase = PROGRAM_PHASES_INFO.find(p => monthsInProgram >= p.monthStart && monthsInProgram <= p.monthEnd)
    || PROGRAM_PHASES_INFO[PROGRAM_PHASES_INFO.length - 1];
  const phaseIndex = PROGRAM_PHASES_INFO.indexOf(phase);
  return { phaseIndex, phaseName: phase.name, monthsInProgram, targets: phase.targets };
}

// ─── Goal Filtering ──────────────────────────────────────

export function filterValidGoals<T extends { text: string }>(goals: T[]): T[] {
  return goals.filter(g =>
    g.text &&
    g.text.trim() !== '' &&
    g.text.trim().toLowerCase() !== 'ninguno' &&
    g.text.trim().toLowerCase() !== 'ninguna' &&
    g.text.trim().toLowerCase() !== 'n/a'
  );
}

// ─── Definitive Goals (Single Source of Truth) ──────────────

export interface DefinitiveGoals {
  goal_3_months: string;
  goal_3_months_status: 'pending' | 'achieved' | 'failed';
  goal_6_months: string;
  goal_6_months_status: 'pending' | 'achieved' | 'failed';
  goal_1_year: string;
  goal_1_year_status: 'pending' | 'achieved' | 'failed';
  source: 'roadmap' | 'anamnesis';
}

/**
 * Returns the definitive 3/6/12M goals.
 * Priority: Camino al Éxito (adjusted_goals) > Anamnesis (GoalsData)
 */
export function getDefinitiveGoals(
  roadmapData?: RoadmapData,
  goalsData?: GoalsData
): DefinitiveGoals {
  if (roadmapData?.adjusted_goals) {
    const ag = roadmapData.adjusted_goals;
    return {
      goal_3_months: ag.goal_3_months,
      goal_3_months_status: ag.goal_3_months_status,
      goal_6_months: ag.goal_6_months,
      goal_6_months_status: ag.goal_6_months_status,
      goal_1_year: ag.goal_1_year,
      goal_1_year_status: ag.goal_1_year_status,
      source: 'roadmap',
    };
  }
  return {
    goal_3_months: goalsData?.goal_3_months || '',
    goal_3_months_status: goalsData?.goal_3_months_status || 'pending',
    goal_6_months: goalsData?.goal_6_months || '',
    goal_6_months_status: goalsData?.goal_6_months_status || 'pending',
    goal_1_year: goalsData?.goal_1_year || '',
    goal_1_year_status: goalsData?.goal_1_year_status || 'pending',
    source: 'anamnesis',
  };
}
