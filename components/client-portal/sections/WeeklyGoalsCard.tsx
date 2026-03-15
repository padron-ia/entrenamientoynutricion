import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Clock, Trophy, XCircle, MessageSquareX, ClipboardList } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { CoachGoal } from '../../../types';

interface WeeklyGoalsCardProps {
    clientId: string;
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDuration = (startDate?: string, endDate?: string): string | null => {
    if (!startDate || !endDate) return null;
    const days = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 0) return null;
    if (days === 1) return '1 día';
    if (days < 7) return `${days} días`;
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 semana' : `${weeks} semanas`;
};

const getDaysLeft = (deadline?: string): number | null => {
    if (!deadline) return null;
    return Math.ceil(
        (new Date(deadline).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
    );
};

const getTypeLabel = (type: string) => {
    if (type === 'weekly') return 'Semanal';
    if (type === 'monthly') return 'Mensual';
    return 'Personalizado';
};

function GoalCard({ goal }: { goal: CoachGoal }) {
    const isActive = goal.status === 'pending';
    const isAchieved = goal.status === 'achieved';
    const daysLeft = isActive ? getDaysLeft(goal.deadline) : null;
    const isOverdue = daysLeft !== null && daysLeft < 0;
    const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;

    // Duration: for active goals use start→deadline, for closed use start→completed_at
    const endForDuration = isActive ? goal.deadline : (goal.completed_at || goal.deadline);
    const duration = getDuration(goal.start_date || goal.created_at, endForDuration);

    const borderColor = isActive
        ? isOverdue ? 'border-red-200 bg-red-50/30'
            : isUrgent ? 'border-amber-200 bg-amber-50/30'
                : 'border-sea-100 bg-white'
        : isAchieved
            ? 'border-green-200 bg-green-50/30'
            : 'border-red-200 bg-red-50/20';

    return (
        <div className={`rounded-2xl border-2 p-5 space-y-4 ${borderColor}`}>

            {/* Fila superior: tipo + estado */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sea-400 bg-sea-50 px-2 py-1 rounded-lg">
                    {getTypeLabel(goal.goal_type)}
                </span>

                {isActive ? (
                    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${isOverdue ? 'bg-red-100 text-red-700'
                            : isUrgent ? 'bg-amber-100 text-amber-700'
                                : 'bg-sea-100 text-sea-700'
                        }`}>
                        <Clock className="w-3 h-3" />
                        {isOverdue
                            ? `Vencido hace ${Math.abs(daysLeft!)} días`
                            : daysLeft === 0 ? 'Vence hoy'
                                : `${daysLeft} días restantes`}
                    </span>
                ) : (
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${isAchieved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {isAchieved
                            ? <><Trophy className="w-3 h-3" /> Conseguido</>
                            : <><XCircle className="w-3 h-3" /> No conseguido</>
                        }
                    </span>
                )}
            </div>

            {/* Título */}
            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-sea-400 mb-1">Título</p>
                <h4 className="font-bold text-sea-900 text-base leading-snug">{goal.title}</h4>
            </div>

            {/* Objetivo / Descripción */}
            {goal.description && (
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sea-400 mb-1">Objetivo</p>
                    <p className="text-sm text-sea-700 leading-relaxed">{goal.description}</p>
                </div>
            )}

            {/* Plan de acción */}
            {goal.action_plan && (
                <div className="p-3 bg-white/70 rounded-xl border border-sea-100">
                    <div className="flex items-center gap-1.5 mb-1">
                        <ClipboardList className="w-3.5 h-3.5 text-sea-500" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-sea-500">Plan de acción</p>
                    </div>
                    <p className="text-sm text-sea-700">{goal.action_plan}</p>
                </div>
            )}

            {/* Fecha inicio + Duración */}
            <div className="flex items-center gap-6 flex-wrap">
                {(goal.start_date || goal.created_at) && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-sea-400 mb-0.5">Fecha inicio</p>
                        <p className="text-sm font-semibold text-sea-800">
                            {formatDate(goal.start_date || goal.created_at)}
                        </p>
                    </div>
                )}
                {duration && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-sea-400 mb-0.5">Duración</p>
                        <p className="text-sm font-semibold text-sea-800">{duration}</p>
                    </div>
                )}
                {goal.deadline && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-sea-400 mb-0.5">Fecha fin</p>
                        <p className="text-sm font-semibold text-sea-800">{formatDate(goal.deadline)}</p>
                    </div>
                )}
            </div>

            {/* Resultado: motivo de no consecución (solo si failed) */}
            {!isActive && !isAchieved && goal.failure_reason && (
                <div className="p-3 bg-red-100/60 rounded-xl border border-red-200">
                    <div className="flex items-center gap-1.5 mb-1">
                        <MessageSquareX className="w-3.5 h-3.5 text-red-500" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">Motivo</p>
                    </div>
                    <p className="text-sm text-red-700">{goal.failure_reason}</p>
                </div>
            )}
        </div>
    );
}

export function WeeklyGoalsCard({ clientId }: WeeklyGoalsCardProps) {
    const [goals, setGoals] = useState<CoachGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const { data, error } = await supabase
                    .from('coach_goals')
                    .select('*')
                    .eq('client_id', clientId)
                    .order('created_at', { ascending: false });
                if (error) console.error('[WeeklyGoalsCard] Supabase error:', error);
                setGoals(data ?? []);
            } catch (e) {
                console.error('[WeeklyGoalsCard] Fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchGoals();
    }, [clientId]);

    if (loading) return null;

    const activeGoals = goals.filter(g => g.status === 'pending');
    const closedGoals = goals.filter(g => g.status === 'achieved' || g.status === 'failed');

    if (activeGoals.length === 0 && closedGoals.length === 0) return null;

    return (
        <div className="glass rounded-3xl p-6 shadow-card space-y-4">
            <h3 className="text-base font-bold text-sea-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                {activeGoals.length > 0 ? 'Tu objetivo esta semana' : 'Objetivos'}
            </h3>

            {/* Objetivos activos */}
            {activeGoals.length > 0 ? (
                <div className="space-y-3">
                    {activeGoals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
                </div>
            ) : (
                <div className="text-center py-5 bg-sea-50/30 rounded-2xl border border-dashed border-sea-200">
                    <CheckCircle2 className="w-6 h-6 text-accent-400 mx-auto mb-1" />
                    <p className="text-sm text-sea-400 font-medium">Sin objetivos activos esta semana</p>
                </div>
            )}

            {/* Historial de objetivos cerrados */}
            {closedGoals.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-xs font-bold text-sea-400 hover:text-sea-600 transition-colors flex items-center gap-1.5"
                    >
                        <span>{showHistory ? '▲' : '▼'}</span>
                        Historial ({closedGoals.length})
                    </button>

                    {showHistory && (
                        <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1">
                            {closedGoals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
