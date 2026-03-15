import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import {
  Activity,
  CheckCircle2,
  Scale,
  Droplets,
  Footprints,
  Trophy,
  Star,
  FileHeart,
  Target,
  Utensils,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'checkin' | 'checkin_reviewed' | 'weight' | 'glucose' | 'steps' | 'achievement' | 'coach_review' | 'medical' | 'goal_achieved' | 'nutrition_plan';
  title: string;
  detail?: string;
  timestamp: Date;
  icon: React.FC<any>;
  color: string;
  bg: string;
}

interface ActivityFeedProps {
  clientId: string;
  refreshKey?: number;
}

const ACTIVITY_CONFIG: Record<ActivityItem['type'], { icon: React.FC<any>; color: string; bg: string }> = {
  checkin: { icon: CheckCircle2, color: 'text-accent-600', bg: 'bg-accent-50' },
  checkin_reviewed: { icon: Star, color: 'text-sea-600', bg: 'bg-sea-50' },
  weight: { icon: Scale, color: 'text-blue-600', bg: 'bg-blue-50' },
  glucose: { icon: Droplets, color: 'text-rose-500', bg: 'bg-rose-50' },
  steps: { icon: Footprints, color: 'text-green-600', bg: 'bg-green-50' },
  achievement: { icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
  coach_review: { icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' },
  medical: { icon: FileHeart, color: 'text-sea-600', bg: 'bg-sea-50' },
  goal_achieved: { icon: Target, color: 'text-accent-600', bg: 'bg-accent-50' },
  nutrition_plan: { icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50' },
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} sem`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function groupByDate(items: ActivityItem[]): { label: string; items: ActivityItem[] }[] {
  const groups: Map<string, ActivityItem[]> = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const item of items) {
    const d = new Date(item.timestamp);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) {
      label = 'Hoy';
    } else if (d.getTime() === yesterday.getTime()) {
      label = 'Ayer';
    } else {
      // Solo mostrar hoy y ayer
      continue;
    }

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export function ActivityFeed({ clientId, refreshKey }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [clientId, refreshKey]);

  async function loadActivities() {
    setLoading(true);
    try {
      const yesterdayStart = new Date();
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      yesterdayStart.setHours(0, 0, 0, 0);
      const since = yesterdayStart.toISOString();

      const [checkins, weights, glucose, steps, achievements, coachReviews, goals, nutritionAssignments] = await Promise.all([
        supabase
          .from('weekly_checkins')
          .select('id, created_at, status, coach_notes')
          .eq('client_id', clientId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('weight_history')
          .select('id, weight, date, created_at')
          .eq('client_id', clientId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('glucose_history')
          .select('id, glucose_value, measurement_type, measured_at')
          .eq('client_id', clientId)
          .gte('measured_at', since)
          .order('measured_at', { ascending: false })
          .limit(20),
        supabase
          .from('steps_history')
          .select('id, steps, date, created_at')
          .eq('client_id', clientId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('client_achievements')
          .select('id, unlocked_at, achievement:achievements(title, icon)')
          .eq('client_id', clientId)
          .gte('unlocked_at', since)
          .order('unlocked_at', { ascending: false })
          .limit(10),
        supabase
          .from('weekly_coach_review')
          .select('id, created_at, feeling, coach_note')
          .eq('client_id', clientId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('coach_goals')
          .select('id, title, completed_at, status')
          .eq('client_id', clientId)
          .eq('status', 'achieved')
          .gte('completed_at', since)
          .order('completed_at', { ascending: false })
          .limit(10),
        supabase
          .from('client_nutrition_assignments')
          .select('id, assigned_at, plan:nutrition_plans(name)')
          .eq('client_id', clientId)
          .gte('assigned_at', since)
          .order('assigned_at', { ascending: false })
          .limit(5),
      ]);


      const items: ActivityItem[] = [];
      const cfg = ACTIVITY_CONFIG;

      // Checkins
      for (const c of checkins.data || []) {
        items.push({
          id: `checkin-${c.id}`,
          type: 'checkin',
          title: 'Completaste tu check-in semanal',
          timestamp: new Date(c.created_at),
          ...cfg.checkin,
        });
        if (c.status === 'reviewed' && c.coach_notes) {
          items.push({
            id: `checkin-rev-${c.id}`,
            type: 'checkin_reviewed',
            title: 'Tu coach revisó tu check-in',
            detail: c.coach_notes.length > 80 ? c.coach_notes.slice(0, 80) + '…' : c.coach_notes,
            timestamp: new Date(c.created_at), // approximate
            ...cfg.checkin_reviewed,
          });
        }
      }

      // Weight
      for (const w of weights.data || []) {
        items.push({
          id: `weight-${w.id}`,
          type: 'weight',
          title: `Registraste peso: ${w.weight} kg`,
          timestamp: new Date(w.created_at || w.date),
          ...cfg.weight,
        });
      }

      // Glucose
      const glucoseLabels: Record<string, string> = {
        fasting: 'en ayunas',
        post_meal: 'post-comida',
        before_meal: 'pre-comida',
        random: 'aleatorio',
      };
      for (const g of glucose.data || []) {
        const label = glucoseLabels[g.measurement_type] || g.measurement_type;
        items.push({
          id: `glucose-${g.id}`,
          type: 'glucose',
          title: `Glucosa: ${g.glucose_value} mg/dL`,
          detail: label,
          timestamp: new Date(g.measured_at),
          ...cfg.glucose,
        });
      }

      // Steps
      for (const s of steps.data || []) {
        items.push({
          id: `steps-${s.id}`,
          type: 'steps',
          title: `${s.steps.toLocaleString()} pasos registrados`,
          timestamp: new Date(s.created_at || s.date),
          ...cfg.steps,
        });
      }

      // Achievements
      for (const a of achievements.data || []) {
        const achievement = a.achievement as any;
        items.push({
          id: `ach-${a.id}`,
          type: 'achievement',
          title: `¡Logro desbloqueado!`,
          detail: achievement?.title || 'Nuevo logro',
          timestamp: new Date(a.unlocked_at),
          ...cfg.achievement,
        });
      }

      // Coach reviews
      const feelingLabels: Record<string, string> = {
        green: 'Excelente semana',
        yellow: 'Semana regular',
        red: 'Semana difícil',
      };
      for (const r of coachReviews.data || []) {
        items.push({
          id: `review-${r.id}`,
          type: 'coach_review',
          title: 'Tu coach evaluó tu semana',
          detail: feelingLabels[r.feeling] || r.feeling,
          timestamp: new Date(r.created_at),
          ...cfg.coach_review,
        });
      }

      // Goals achieved
      for (const g of goals.data || []) {
        items.push({
          id: `goal-${g.id}`,
          type: 'goal_achieved',
          title: `Meta cumplida: ${g.title}`,
          timestamp: new Date(g.completed_at),
          ...cfg.goal_achieved,
        });
      }

      // Nutrition plan assignments
      for (const n of nutritionAssignments.data || []) {
        const plan = n.plan as any;
        items.push({
          id: `nutr-${n.id}`,
          type: 'nutrition_plan',
          title: 'Nuevo plan nutricional asignado',
          detail: plan?.name || '',
          timestamp: new Date(n.assigned_at),
          ...cfg.nutrition_plan,
        });
      }

      // Sort by timestamp descending
      items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(items);
    } catch (err) {
      console.error('ActivityFeed load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-3xl p-6 shadow-card flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-sea-400 animate-spin" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="glass rounded-3xl p-6 shadow-card text-center py-10">
        <Activity className="w-10 h-10 text-sea-300 mx-auto mb-3" />
        <p className="text-sea-500 font-bold">Sin actividad reciente</p>
        <p className="text-sea-400 text-sm mt-1">Tus registros y logros aparecerán aquí</p>
      </div>
    );
  }

  const grouped = groupByDate(activities);

  return (
    <div className="glass rounded-3xl p-5 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-sea-500" />
        <p className="text-xs text-sea-500 font-black uppercase tracking-wider">Actividad reciente</p>
      </div>

      <div className="space-y-5">
        {grouped.map(group => (
          <div key={group.label}>
            <p className="text-[11px] font-bold text-sea-400 uppercase tracking-wider mb-2.5 pl-1">
              {group.label}
            </p>
            <div className="space-y-2">
              {group.items.map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-2xl hover:bg-sea-50/50 transition-colors"
                  >
                    <div className={`p-2 rounded-xl ${item.bg} shrink-0`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-sea-800 leading-tight">{item.title}</p>
                      {item.detail && (
                        <p className="text-xs text-sea-500 mt-0.5 truncate">{item.detail}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-sea-400 font-medium whitespace-nowrap shrink-0 mt-0.5">
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
