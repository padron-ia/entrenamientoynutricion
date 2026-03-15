import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { Flame, Scale, Droplets, Footprints, CheckCircle2, Star, Zap } from 'lucide-react';

interface StreakCardProps {
    clientId: string;
    refreshKey?: number;
}

interface StreakData {
    weightStreak: number;
    glucoseStreak: number;
    stepsStreak: number;
    weeklyScore: number;
    weeklyActions: {
        weight: boolean;
        glucose: boolean;
        steps: boolean;
        checkin: boolean;
        wellness: boolean;
    };
}

function getStreakDays(dates: string[]): number {
    if (dates.length === 0) return 0;
    const uniqueDays = [...new Set(dates.map(d => {
        const dt = new Date(d);
        return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    }))].sort().reverse();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

    // Streak must start from today or yesterday
    if (uniqueDays[0] !== todayKey && uniqueDays[0] !== yesterdayKey) return 0;

    let streak = 1;
    let currentDate = new Date(uniqueDays[0] === todayKey ? today : yesterday);

    for (let i = 1; i < uniqueDays.length; i++) {
        currentDate.setDate(currentDate.getDate() - 1);
        const expectedKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
        if (uniqueDays[i] === expectedKey) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

export function StreakCard({ clientId, refreshKey }: StreakCardProps) {
    const [data, setData] = useState<StreakData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStreaks();
    }, [clientId, refreshKey]);

    async function loadStreaks() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const since = thirtyDaysAgo.toISOString();

        // Current week boundaries (Monday-based)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - mondayOffset);
        monday.setHours(0, 0, 0, 0);
        const weekSince = monday.toISOString();

        try {
            const [weights, glucose, steps, weekCheckins, weekWellness] = await Promise.all([
                supabase.from('weight_history').select('created_at').eq('client_id', clientId)
                    .gte('created_at', since).order('created_at', { ascending: false }),
                supabase.from('glucose_history').select('measured_at').eq('client_id', clientId)
                    .gte('measured_at', since).order('measured_at', { ascending: false }),
                supabase.from('steps_history').select('created_at').eq('client_id', clientId)
                    .gte('created_at', since).order('created_at', { ascending: false }),
                supabase.from('weekly_checkins').select('id').eq('client_id', clientId)
                    .gte('created_at', weekSince).limit(1),
                supabase.from('wellness_entries').select('id').eq('client_id', clientId)
                    .gte('created_at', weekSince).limit(1),
            ]);

            const weightDates = (weights.data || []).map(w => w.created_at);
            const glucoseDates = (glucose.data || []).map(g => g.measured_at);
            const stepsDates = (steps.data || []).map(s => s.created_at);

            const hasWeightThisWeek = (weights.data || []).some(w => new Date(w.created_at) >= monday);
            const hasGlucoseThisWeek = (glucose.data || []).some(g => new Date(g.measured_at) >= monday);
            const hasStepsThisWeek = (steps.data || []).some(s => new Date(s.created_at) >= monday);
            const hasCheckin = (weekCheckins.data || []).length > 0;
            const hasWellness = (weekWellness.data || []).length > 0;

            const actions = {
                weight: hasWeightThisWeek,
                glucose: hasGlucoseThisWeek,
                steps: hasStepsThisWeek,
                checkin: hasCheckin,
                wellness: hasWellness,
            };

            const score = Object.values(actions).filter(Boolean).length * 20;

            setData({
                weightStreak: getStreakDays(weightDates),
                glucoseStreak: getStreakDays(glucoseDates),
                stepsStreak: getStreakDays(stepsDates),
                weeklyScore: score,
                weeklyActions: actions,
            });
        } catch (err) {
            console.error('StreakCard error:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading || !data) return null;

    const bestStreak = Math.max(data.weightStreak, data.glucoseStreak, data.stepsStreak);

    const actionItems = [
        { key: 'weight', label: 'Peso', icon: Scale, done: data.weeklyActions.weight, color: 'text-blue-500' },
        { key: 'glucose', label: 'Glucosa', icon: Droplets, done: data.weeklyActions.glucose, color: 'text-rose-500' },
        { key: 'steps', label: 'Pasos', icon: Footprints, done: data.weeklyActions.steps, color: 'text-green-500' },
        { key: 'checkin', label: 'Check-in', icon: CheckCircle2, done: data.weeklyActions.checkin, color: 'text-accent-500' },
        { key: 'wellness', label: 'Bienestar', icon: Star, done: data.weeklyActions.wellness, color: 'text-purple-500' },
    ];

    return (
        <div className="glass rounded-3xl p-5 shadow-card">
            {/* Streak header */}
            {bestStreak > 0 && (
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-2xl ${bestStreak >= 7 ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-orange-50'}`}>
                        <Flame className={`w-6 h-6 ${bestStreak >= 7 ? 'text-white' : 'text-orange-500'}`} />
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-sea-900">{bestStreak}</span>
                            <span className="text-sm font-bold text-sea-500">dias de racha</span>
                        </div>
                        <p className="text-xs text-sea-400">
                            {bestStreak >= 14 ? 'Increible constancia!' :
                             bestStreak >= 7 ? 'Una semana completa!' :
                             bestStreak >= 3 ? 'Buen ritmo, sigue asi!' :
                             'Cada dia suma'}
                        </p>
                    </div>
                </div>
            )}

            {/* Individual streaks */}
            {bestStreak > 0 && (
                <div className="flex gap-3 mb-4">
                    {data.weightStreak > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-xl">
                            <Scale className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs font-bold text-blue-600">{data.weightStreak}d</span>
                        </div>
                    )}
                    {data.glucoseStreak > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 rounded-xl">
                            <Droplets className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-xs font-bold text-rose-600">{data.glucoseStreak}d</span>
                        </div>
                    )}
                    {data.stepsStreak > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-xl">
                            <Footprints className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-xs font-bold text-green-600">{data.stepsStreak}d</span>
                        </div>
                    )}
                </div>
            )}

            {/* Weekly score */}
            <div className="border-t border-sea-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-black text-sea-500 uppercase tracking-wider">Puntos de la semana</span>
                    </div>
                    <span className={`text-lg font-black ${
                        data.weeklyScore === 100 ? 'text-accent-600' :
                        data.weeklyScore >= 60 ? 'text-sea-700' : 'text-sea-400'
                    }`}>{data.weeklyScore}/100</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-sea-100 rounded-full h-2 mb-3 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${
                            data.weeklyScore === 100 ? 'bg-gradient-to-r from-accent-400 to-accent-500' :
                            data.weeklyScore >= 60 ? 'bg-gradient-to-r from-sea-400 to-sea-500' :
                            'bg-sea-300'
                        }`}
                        style={{ width: `${data.weeklyScore}%` }}
                    />
                </div>

                {/* Action checklist */}
                <div className="flex flex-wrap gap-2">
                    {actionItems.map(item => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={item.key}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                    item.done
                                        ? 'bg-accent-50 text-accent-600 border border-accent-200'
                                        : 'bg-slate-50 text-slate-400 border border-slate-200'
                                }`}
                            >
                                <Icon className={`w-3.5 h-3.5 ${item.done ? item.color : 'text-slate-300'}`} />
                                {item.label}
                                {item.done && <CheckCircle2 className="w-3 h-3 text-accent-500" />}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
