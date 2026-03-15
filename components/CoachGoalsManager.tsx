import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { CoachGoal } from '../types';
import { Plus, Trash2, CheckCircle2, XCircle, Clock, Target, Calendar, ChevronDown, ChevronUp, AlertTriangle, Trophy, ClipboardList, AlertCircle } from 'lucide-react';
import { REASON_CATEGORY_LABELS, REASON_DETAIL_LABELS, COMPLETION_STATUS_LABELS } from '../services/processTrackingService';
import { useToast } from './ToastProvider';

interface CoachGoalsManagerProps {
    clientId: string;
    isCoach: boolean;
    readOnly?: boolean;
}

const CoachGoalsManager: React.FC<CoachGoalsManagerProps> = ({ clientId, isCoach, readOnly = false }) => {
    const { toast } = useToast();
    const [goals, setGoals] = useState<CoachGoal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [failingGoalId, setFailingGoalId] = useState<string | null>(null);
    const [failureForm, setFailureForm] = useState({ failure_reason: '', action_plan: '' });

    const today = new Date().toISOString().split('T')[0];

    // New Goal State
    const [newGoal, setNewGoal] = useState<Partial<CoachGoal>>({
        title: '',
        description: '',
        goal_type: 'weekly',
        status: 'pending',
        start_date: today,
        deadline: '',
        action_plan: ''
    });

    const fetchGoals = async () => {
        try {
            const { data, error } = await supabase
                .from('coach_goals')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setGoals(data || []);
        } catch (error) {
            console.error('Error fetching goals:', error);
            toast.error('Error al cargar objetivos');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGoals();
    }, [clientId]);

    const handleAddGoal = async () => {
        if (!newGoal.title) return toast.error('El titulo es obligatorio');

        // Máximo 3 objetivos semanales activos
        if (newGoal.goal_type === 'weekly') {
            const activeWeekly = activeGoals.filter(g => g.goal_type === 'weekly');
            if (activeWeekly.length >= 3) {
                return toast.error('Máximo 3 objetivos semanales activos. Cierra alguno antes de crear uno nuevo.');
            }
        }

        try {
            const { data, error } = await supabase
                .from('coach_goals')
                .insert([{
                    client_id: clientId,
                    title: newGoal.title,
                    description: newGoal.description || null,
                    goal_type: newGoal.goal_type,
                    status: 'pending',
                    start_date: newGoal.start_date || today,
                    deadline: newGoal.deadline || null,
                    action_plan: newGoal.action_plan || null
                }])
                .select()
                .single();

            if (error) throw error;

            setGoals([data, ...goals]);
            setIsAdding(false);
            setNewGoal({ title: '', description: '', goal_type: 'weekly', status: 'pending', start_date: today, deadline: '', action_plan: '' });
            toast.success('Objetivo creado correctamente');
        } catch (error) {
            console.error('Error adding goal:', error);
            toast.error('Error al crear objetivo');
        }
    };

    const handleMarkAchieved = async (goal: CoachGoal) => {
        try {
            const now = new Date().toISOString();
            const { error } = await supabase
                .from('coach_goals')
                .update({
                    status: 'achieved',
                    completed_at: now
                })
                .eq('id', goal.id);

            if (error) throw error;

            setGoals(goals.map(g => g.id === goal.id ? { ...g, status: 'achieved' as const, completed_at: now } : g));
            toast.success('Objetivo marcado como conseguido');
        } catch (error) {
            console.error('Error marking achieved:', error);
            toast.error('Error al actualizar objetivo');
        }
    };

    const handleMarkFailed = async (goalId: string) => {
        if (!failureForm.failure_reason.trim()) {
            return toast.error('Indica el motivo por el que no se consiguio');
        }

        try {
            const now = new Date().toISOString();
            const { error } = await supabase
                .from('coach_goals')
                .update({
                    status: 'failed',
                    completed_at: now,
                    failure_reason: failureForm.failure_reason,
                    action_plan: failureForm.action_plan || null
                })
                .eq('id', goalId);

            if (error) throw error;

            setGoals(goals.map(g => g.id === goalId ? {
                ...g,
                status: 'failed' as const,
                completed_at: now,
                failure_reason: failureForm.failure_reason,
                action_plan: failureForm.action_plan || g.action_plan
            } : g));
            setFailingGoalId(null);
            setFailureForm({ failure_reason: '', action_plan: '' });
            toast.success('Objetivo marcado como no conseguido');
        } catch (error) {
            console.error('Error marking failed:', error);
            toast.error('Error al actualizar objetivo');
        }
    };

    const handleDeleteGoal = async (id: string) => {
        if (!confirm('¿Seguro que quieres eliminar este objetivo?')) return;

        try {
            const { error } = await supabase
                .from('coach_goals')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setGoals(goals.filter(g => g.id !== id));
            toast.success('Objetivo eliminado');
        } catch (error) {
            console.error('Error deleting goal:', error);
            toast.error('Error al eliminar');
        }
    };

    // Helpers
    const activeGoals = goals.filter(g => g.status === 'pending');
    const closedGoals = goals.filter(g => g.status === 'achieved' || g.status === 'failed');

    const getDaysInfo = (goal: CoachGoal) => {
        if (!goal.deadline) return null;
        const deadlineDate = new Date(goal.deadline);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        deadlineDate.setHours(0, 0, 0, 0);
        const diffMs = deadlineDate.getTime() - todayDate.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getDurationDays = (goal: CoachGoal) => {
        const start = goal.start_date || goal.created_at?.split('T')[0];
        const end = goal.completed_at?.split('T')[0] || goal.deadline;
        if (!start || !end) return null;
        const diffMs = new Date(end).getTime() - new Date(start).getTime();
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getGoalTypeLabel = (type: string) => {
        switch (type) {
            case 'weekly': return 'Semanal';
            case 'monthly': return 'Mensual';
            default: return 'Personalizado';
        }
    };

    if (isLoading) return <div className="text-center py-4 text-slate-400">Cargando objetivos...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    Objetivos Semanales
                </h3>
                {isCoach && !readOnly && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Objetivo
                    </button>
                )}
            </div>

            {/* ============= FORM: New Goal ============= */}
            {isAdding && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 gap-3 mb-3">
                        <input
                            type="text"
                            placeholder="Titulo del objetivo *"
                            className="w-full text-sm p-2 border border-slate-300 rounded-lg"
                            value={newGoal.title}
                            onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                        />
                        <textarea
                            placeholder="Descripcion (opcional)"
                            rows={2}
                            className="w-full text-sm p-2 border border-slate-300 rounded-lg"
                            value={newGoal.description}
                            onChange={e => setNewGoal({ ...newGoal, description: e.target.value })}
                        />
                        <textarea
                            placeholder="Plan de accion: ¿que debe hacer el cliente para conseguirlo?"
                            rows={2}
                            className="w-full text-sm p-2 border border-slate-300 rounded-lg"
                            value={newGoal.action_plan}
                            onChange={e => setNewGoal({ ...newGoal, action_plan: e.target.value })}
                        />
                        <div className="flex gap-3 flex-wrap">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-500 font-medium">Fecha inicio</label>
                                <input
                                    type="date"
                                    className="text-sm p-2 border border-slate-300 rounded-lg"
                                    value={newGoal.start_date}
                                    onChange={e => setNewGoal({ ...newGoal, start_date: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-500 font-medium">Fecha limite</label>
                                <input
                                    type="date"
                                    className="text-sm p-2 border border-slate-300 rounded-lg"
                                    value={newGoal.deadline}
                                    onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                                <label className="text-xs text-slate-500 font-medium">Tipo</label>
                                <select
                                    className="text-sm p-2 border border-slate-300 rounded-lg"
                                    value={newGoal.goal_type}
                                    onChange={e => setNewGoal({ ...newGoal, goal_type: e.target.value as any })}
                                >
                                    <option value="weekly">Semanal</option>
                                    <option value="monthly">Mensual</option>
                                    <option value="custom">Personalizado</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => { setIsAdding(false); setNewGoal({ title: '', description: '', goal_type: 'weekly', status: 'pending', start_date: today, deadline: '', action_plan: '' }); }} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                        <button onClick={handleAddGoal} className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Guardar</button>
                    </div>
                </div>
            )}

            {/* ============= ACTIVE GOALS ============= */}
            <div className="space-y-3">
                {activeGoals.length === 0 && closedGoals.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No hay objetivos asignados</p>
                    </div>
                ) : activeGoals.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <CheckCircle2 className="w-6 h-6 text-green-300 mx-auto mb-1" />
                        <p className="text-sm text-slate-400">No hay objetivos activos</p>
                    </div>
                ) : (
                    activeGoals.map(goal => {
                        const daysLeft = getDaysInfo(goal);
                        const isOverdue = daysLeft !== null && daysLeft < 0;
                        const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;

                        return (
                            <div key={goal.id} className={`bg-white p-4 rounded-xl border transition-all ${isOverdue ? 'border-red-300 bg-red-50/30' : isUrgent ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
                                {/* Title + Delete */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-slate-800">{goal.title}</h4>
                                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                {getGoalTypeLabel(goal.goal_type)}
                                            </span>
                                        </div>
                                        {goal.description && <p className="text-sm text-slate-600 mt-1">{goal.description}</p>}

                                        {/* Action Plan */}
                                        {goal.action_plan && (
                                            <div className="mt-2 p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
                                                    <span className="text-xs font-bold text-indigo-700">Plan de accion</span>
                                                </div>
                                                <p className="text-xs text-indigo-600">{goal.action_plan}</p>
                                            </div>
                                        )}

                                        {/* Dates row */}
                                        <div className="flex flex-wrap items-center gap-3 mt-3">
                                            {goal.start_date && (
                                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                                    <Calendar className="w-3 h-3" /> Inicio: {formatDate(goal.start_date)}
                                                </span>
                                            )}
                                            {goal.deadline && (
                                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                                    <Calendar className="w-3 h-3" /> Limite: {formatDate(goal.deadline)}
                                                </span>
                                            )}
                                            {daysLeft !== null && (
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-100 text-red-700' : isUrgent ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                    {isOverdue ? (
                                                        <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Vencido hace {Math.abs(daysLeft)} dias</span>
                                                    ) : daysLeft === 0 ? (
                                                        'Vence hoy'
                                                    ) : (
                                                        `${daysLeft} dias restantes`
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        {/* Coach feedback (legacy field) */}
                                        {goal.feedback && (
                                            <div className="mt-2 p-2 bg-white/60 rounded border border-slate-100 text-xs italic text-slate-600">
                                                <strong>Notas del coach:</strong> {goal.feedback}
                                            </div>
                                        )}
                                    </div>

                                    {isCoach && !readOnly && (
                                        <button
                                            onClick={() => handleDeleteGoal(goal.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* ===== Action Buttons (Coach only) ===== */}
                                {isCoach && !readOnly && failingGoalId !== goal.id && (
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                                        <button
                                            onClick={() => handleMarkAchieved(goal)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                                        >
                                            <Trophy className="w-3.5 h-3.5" /> Conseguido
                                        </button>
                                        <button
                                            onClick={() => { setFailingGoalId(goal.id); setFailureForm({ failure_reason: '', action_plan: goal.action_plan || '' }); }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <XCircle className="w-3.5 h-3.5" /> No Conseguido
                                        </button>
                                    </div>
                                )}

                                {/* ===== Failure Form (inline) ===== */}
                                {failingGoalId === goal.id && (
                                    <div className="mt-3 pt-3 border-t border-red-200 space-y-2 animate-in fade-in slide-in-from-top-1">
                                        <p className="text-xs font-bold text-red-700">¿Por que no se consiguio?</p>
                                        <textarea
                                            placeholder="Motivo por el que no se alcanzo el objetivo *"
                                            rows={2}
                                            className="w-full text-sm p-2 border border-red-200 rounded-lg bg-red-50/50 focus:ring-red-300 focus:border-red-300"
                                            value={failureForm.failure_reason}
                                            onChange={e => setFailureForm({ ...failureForm, failure_reason: e.target.value })}
                                            autoFocus
                                        />
                                        <textarea
                                            placeholder="Nuevo plan de accion / accion correctiva (opcional)"
                                            rows={2}
                                            className="w-full text-sm p-2 border border-slate-200 rounded-lg"
                                            value={failureForm.action_plan}
                                            onChange={e => setFailureForm({ ...failureForm, action_plan: e.target.value })}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => { setFailingGoalId(null); setFailureForm({ failure_reason: '', action_plan: '' }); }} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                                            <button onClick={() => handleMarkFailed(goal.id)} className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700">Confirmar</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* ============= HISTORY (Collapsed) ============= */}
            {closedGoals.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors w-full"
                    >
                        {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Historial de Objetivos ({closedGoals.length})
                    </button>

                    {showHistory && (
                        <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1">
                            {closedGoals.map(goal => {
                                const duration = getDurationDays(goal);
                                const cs = goal.completion_status;
                                const isAchieved = cs === 'fulfilled' || goal.status === 'achieved';
                                const isPartial = cs === 'partial';
                                const colorClass = isAchieved ? 'bg-green-50/50 border-green-200' : isPartial ? 'bg-amber-50/50 border-amber-200' : 'bg-red-50/50 border-red-200';
                                const statusLabel = cs ? COMPLETION_STATUS_LABELS[cs] : (goal.status === 'achieved' ? 'Completado' : 'No alcanzado');
                                const statusBadge = isAchieved ? 'bg-green-200 text-green-800' : isPartial ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800';
                                const StatusIcon = isAchieved ? CheckCircle2 : isPartial ? AlertCircle : XCircle;

                                return (
                                    <div key={goal.id} className={`p-3 rounded-xl border ${colorClass}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`flex items-center gap-1 text-xs font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {statusLabel}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {getGoalTypeLabel(goal.goal_type)}
                                                    </span>
                                                </div>
                                                <h4 className={`font-bold text-sm mt-1 ${isAchieved ? 'text-green-800' : isPartial ? 'text-amber-800' : 'text-red-800'}`}>{goal.title}</h4>
                                                {goal.description && <p className="text-xs text-slate-500 mt-0.5">{goal.description}</p>}

                                                {/* Dates */}
                                                <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-400">
                                                    {goal.start_date && <span>Inicio: {formatDate(goal.start_date)}</span>}
                                                    {goal.deadline && <span>Limite: {formatDate(goal.deadline)}</span>}
                                                    {goal.completed_at && <span>Cerrado: {formatDate(goal.completed_at)}</span>}
                                                    {duration !== null && <span>Duracion: {duration} dias</span>}
                                                </div>

                                                {/* Structured reason (new system) */}
                                                {goal.reason_category && (
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                                            {REASON_CATEGORY_LABELS[goal.reason_category]}
                                                        </span>
                                                        {goal.reason_detail && (
                                                            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                                                {REASON_DETAIL_LABELS[goal.reason_detail]}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Legacy failure reason (old system) */}
                                                {!goal.reason_category && goal.failure_reason && (
                                                    <div className="mt-2 p-2 bg-red-100/60 rounded border border-red-200 text-xs text-red-700">
                                                        <strong>Motivo:</strong> {goal.failure_reason}
                                                    </div>
                                                )}

                                                {/* Action plan */}
                                                {goal.action_plan && (
                                                    <div className="mt-1.5 p-2 bg-slate-100/60 rounded border border-slate-200 text-xs text-slate-600">
                                                        <strong>Plan de accion:</strong> {goal.action_plan}
                                                    </div>
                                                )}

                                                {/* Legacy feedback */}
                                                {goal.feedback && (
                                                    <div className="mt-1.5 p-2 bg-white/60 rounded border border-slate-100 text-xs italic text-slate-500">
                                                        <strong>Notas:</strong> {goal.feedback}
                                                    </div>
                                                )}
                                            </div>

                                            {isCoach && !readOnly && (
                                                <button
                                                    onClick={() => handleDeleteGoal(goal.id)}
                                                    className="p-1 text-slate-300 hover:text-red-400 rounded transition-colors flex-shrink-0"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CoachGoalsManager;
