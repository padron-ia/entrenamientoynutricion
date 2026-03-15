import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import {
    Users, Edit2, Save, X, Plus, Trash2, AlertCircle,
    CheckCircle2, Loader2, Calendar, UserCheck, UserX, Info,
    TrendingUp, TrendingDown, Zap, Shield, AlertTriangle,
    PauseCircle, Briefcase, Activity, BarChart3, Settings,
    ChevronDown, ChevronUp, Clock, Star, Target, Eye, EyeOff
} from 'lucide-react';

interface Coach {
    id: string;
    name: string;
    email: string;
    role: string;
    max_clients: number;
    current_clients: number;
    status: 'active' | 'vacation' | 'sick_leave' | 'inactive';
    status_notes: string | null;
    assignment_notes: string | null;
    available_for_assignment: boolean;
    specialty: string[] | null;
    start_date: string | null;
    end_date: string | null;
    actual_active_clients?: number;
    actual_paused_clients?: number;
}

interface AssignmentNote {
    id: string;
    coach_id: string;
    note_type: 'restriction' | 'preference' | 'temporary_hold' | 'capacity_limit';
    note: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    active: boolean;
    valid_from: string | null;
    valid_until: string | null;
    created_at: string;
}

// ============================================================
// COMPONENTES AUXILIARES PREMIUM
// ============================================================

const CapacityRing: React.FC<{ current: number; max: number; size?: number }> = ({ current, max, size = 80 }) => {
    const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const getColor = () => {
        if (percentage >= 95) return { stroke: '#ef4444', bg: '#fef2f2', text: '#991b1b' };
        if (percentage >= 80) return { stroke: '#f59e0b', bg: '#fffbeb', text: '#92400e' };
        if (percentage >= 50) return { stroke: '#10b981', bg: '#ecfdf5', text: '#065f46' };
        return { stroke: '#6366f1', bg: '#eef2ff', text: '#3730a3' };
    };

    const colors = getColor();

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black" style={{ color: colors.text }}>{current}</span>
                <span className="text-[10px] text-slate-400 font-medium">de {max}</span>
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string; available: boolean }> = ({ status, available }) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
        active: {
            bg: 'bg-emerald-100',
            text: 'text-emerald-800',
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
            label: 'Activo'
        },
        vacation: {
            bg: 'bg-blue-100',
            text: 'text-blue-800',
            icon: <Calendar className="w-3.5 h-3.5" />,
            label: 'Vacaciones'
        },
        sick_leave: {
            bg: 'bg-rose-100',
            text: 'text-rose-800',
            icon: <AlertCircle className="w-3.5 h-3.5" />,
            label: 'Baja Médica'
        },
        inactive: {
            bg: 'bg-slate-100',
            text: 'text-slate-800',
            icon: <PauseCircle className="w-3.5 h-3.5" />,
            label: 'Inactivo'
        }
    };

    const config = statusConfig[status] || statusConfig.inactive;

    return (
        <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
                {config.icon}
                {config.label}
            </span>
            {status === 'active' && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${available
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-300 text-slate-600'
                    }`}>
                    {available ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                    {available ? 'Asignable' : 'No Asignable'}
                </span>
            )}
        </div>
    );
};

const CapacityBar: React.FC<{ active: number; paused: number; max: number }> = ({ active, paused, max }) => {
    const total = active + paused;
    const activePercent = max > 0 ? (active / max) * 100 : 0;
    const pausedPercent = max > 0 ? (paused / max) * 100 : 0;
    const freePercent = max > 0 ? Math.max(0, ((max - total) / max) * 100) : 0;

    return (
        <div className="space-y-2">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                    className="bg-emerald-500 transition-all duration-500"
                    style={{ width: `${activePercent}%` }}
                />
                <div
                    className="bg-amber-400 transition-all duration-500"
                    style={{ width: `${pausedPercent}%` }}
                />
                <div
                    className="bg-slate-200 transition-all duration-500"
                    style={{ width: `${freePercent}%` }}
                />
            </div>
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-600">Activos: <strong className="text-emerald-700">{active}</strong></span>
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-slate-600">Pausados: <strong className="text-amber-700">{paused}</strong></span>
                    </span>
                </div>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-200" />
                    <span className="text-slate-600">Disponibles: <strong className="text-indigo-700">{Math.max(0, max - total)}</strong></span>
                </span>
            </div>
        </div>
    );
};

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
    const config: Record<string, { bg: string; text: string }> = {
        low: { bg: 'bg-slate-100', text: 'text-slate-700' },
        normal: { bg: 'bg-blue-100', text: 'text-blue-700' },
        high: { bg: 'bg-orange-100', text: 'text-orange-700' },
        critical: { bg: 'bg-red-100', text: 'text-red-700' }
    };
    const { bg, text } = config[priority] || config.normal;
    const labels: Record<string, string> = {
        low: 'Baja',
        normal: 'Normal',
        high: 'Alta',
        critical: 'Crítica'
    };

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${bg} ${text}`}>
            {labels[priority] || priority}
        </span>
    );
};

const NoteTypeBadge: React.FC<{ type: string }> = ({ type }) => {
    const config: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
        restriction: { icon: <Shield className="w-3 h-3" />, label: 'Restricción', color: 'text-rose-600' },
        preference: { icon: <Star className="w-3 h-3" />, label: 'Preferencia', color: 'text-blue-600' },
        temporary_hold: { icon: <Clock className="w-3 h-3" />, label: 'Retención', color: 'text-amber-600' },
        capacity_limit: { icon: <Target className="w-3 h-3" />, label: 'Límite', color: 'text-purple-600' }
    };
    const { icon, label, color } = config[type] || config.preference;

    return (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
            {icon}
            {label}
        </span>
    );
};

const SummaryCard: React.FC<{
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    trend?: 'up' | 'down' | 'neutral';
}> = ({ title, value, subtitle, icon, color, trend }) => {
    const colorStyles: Record<string, string> = {
        emerald: 'from-emerald-500 to-emerald-600',
        blue: 'from-blue-500 to-blue-600',
        purple: 'from-purple-500 to-purple-600',
        amber: 'from-amber-500 to-amber-600',
        rose: 'from-rose-500 to-rose-600',
        indigo: 'from-indigo-500 to-indigo-600'
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <div className={`bg-gradient-to-r ${colorStyles[color]} p-4 text-white`}>
                <div className="flex items-center justify-between">
                    <div className="p-2 bg-white/20 rounded-xl">
                        {icon}
                    </div>
                    {trend && (
                        <div className={`flex items-center gap-1 text-xs font-bold ${trend === 'up' ? 'text-white' : trend === 'down' ? 'text-white/70' : ''
                            }`}>
                            {trend === 'up' && <TrendingUp className="w-4 h-4" />}
                            {trend === 'down' && <TrendingDown className="w-4 h-4" />}
                        </div>
                    )}
                </div>
            </div>
            <div className="p-4">
                <p className="text-xs text-slate-500 font-medium mb-1">{title}</p>
                <p className="text-2xl font-black text-slate-800">{value}</p>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export function CoachCapacityManagement() {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [notes, setNotes] = useState<AssignmentNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCoach, setEditingCoach] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Coach>>({});
    const [showAddNote, setShowAddNote] = useState<string | null>(null);
    const [expandedCoach, setExpandedCoach] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [newNote, setNewNote] = useState({
        note_type: 'preference' as const,
        note: '',
        priority: 'normal' as const,
        valid_from: '',
        valid_until: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: coachesData, error: coachesError } = await supabase
                .from('coach_capacity_view')
                .select('*')
                .in('role', ['coach', 'nutritionist', 'psychologist'])
                .order('name');

            if (coachesError) throw coachesError;
            setCoaches(coachesData || []);

            const { data: notesData, error: notesError } = await supabase
                .from('assignment_notes')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false });

            if (notesError) throw notesError;
            setNotes(notesData || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Métricas calculadas
    const metrics = useMemo(() => {
        const totalActive = coaches.filter(c => c.status === 'active').length;
        const totalCapacity = coaches.reduce((acc, c) => acc + (c.max_clients || 0), 0);
        const totalClients = coaches.reduce((acc, c) => acc + (c.actual_active_clients || 0), 0);
        const totalPaused = coaches.reduce((acc, c) => acc + (c.actual_paused_clients || 0), 0);
        const availableSlots = totalCapacity - totalClients - totalPaused;
        const utilizationRate = totalCapacity > 0 ? Math.round((totalClients / totalCapacity) * 100) : 0;
        const availableCoaches = coaches.filter(c => c.status === 'active' && c.available_for_assignment).length;
        const onVacation = coaches.filter(c => c.status === 'vacation').length;
        const overloaded = coaches.filter(c => {
            const total = (c.actual_active_clients || 0) + (c.actual_paused_clients || 0);
            return total >= (c.max_clients || 0) * 0.95;
        }).length;

        return {
            totalActive,
            totalCapacity,
            totalClients,
            totalPaused,
            availableSlots,
            utilizationRate,
            availableCoaches,
            onVacation,
            overloaded
        };
    }, [coaches]);

    // Filtrar coaches
    const filteredCoaches = useMemo(() => {
        if (filterStatus === 'all') return coaches;
        if (filterStatus === 'available') return coaches.filter(c => c.status === 'active' && c.available_for_assignment);
        if (filterStatus === 'overloaded') return coaches.filter(c => {
            const total = (c.actual_active_clients || 0) + (c.actual_paused_clients || 0);
            return total >= (c.max_clients || 0) * 0.95;
        });
        return coaches.filter(c => c.status === filterStatus);
    }, [coaches, filterStatus]);

    const startEdit = (coach: Coach) => {
        setEditingCoach(coach.id);
        setEditForm(coach);
    };

    const cancelEdit = () => {
        setEditingCoach(null);
        setEditForm({});
    };

    const saveCoach = async () => {
        if (!editingCoach) return;

        try {
            // Solo enviar campos que existen en la tabla users (no los calculados de la vista)
            const updateData: Record<string, any> = {};
            const allowedFields = [
                'max_clients', 'current_clients', 'status', 'status_notes',
                'assignment_notes', 'available_for_assignment', 'specialty',
                'start_date', 'end_date'
            ];

            for (const field of allowedFields) {
                if (editForm[field as keyof typeof editForm] !== undefined) {
                    updateData[field] = editForm[field as keyof typeof editForm];
                }
            }

            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', editingCoach);

            if (error) throw error;

            await loadData();
            setEditingCoach(null);
            setEditForm({});
        } catch (error: any) {
            console.error('Error saving coach:', error);
            alert('❌ Error al guardar: ' + error.message);
        }
    };

    const addNote = async (coachId: string) => {
        try {
            const { error } = await supabase
                .from('assignment_notes')
                .insert([{
                    coach_id: coachId,
                    ...newNote,
                    valid_from: newNote.valid_from || null,
                    valid_until: newNote.valid_until || null
                }]);

            if (error) throw error;

            await loadData();
            setShowAddNote(null);
            setNewNote({
                note_type: 'preference',
                note: '',
                priority: 'normal',
                valid_from: '',
                valid_until: ''
            });
        } catch (error: any) {
            console.error('Error adding note:', error);
            alert('❌ Error al añadir nota: ' + error.message);
        }
    };

    const deleteNote = async (noteId: string) => {
        if (!confirm('¿Eliminar esta nota?')) return;

        try {
            const { error } = await supabase
                .from('assignment_notes')
                .update({ active: false })
                .eq('id', noteId);

            if (error) throw error;
            await loadData();
        } catch (error: any) {
            console.error('Error deleting note:', error);
            alert('❌ Error al eliminar nota: ' + error.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Cargando datos de capacidad...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl text-white">
                                <Users className="w-6 h-6" />
                            </div>
                            Gestión de Capacidad
                        </h1>
                        <p className="text-slate-500 mt-1">Administra la carga de trabajo y disponibilidad del equipo</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="all">Todos los coaches</option>
                            <option value="available">Disponibles para asignar</option>
                            <option value="overloaded">Sobrecargados</option>
                            <option value="active">Activos</option>
                            <option value="vacation">Vacaciones</option>
                            <option value="sick_leave">Baja médica</option>
                        </select>
                        <div className="flex bg-slate-100 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'grid'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <BarChart3 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'list'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <SummaryCard
                        title="Coaches Activos"
                        value={metrics.totalActive}
                        icon={<Users className="w-5 h-5" />}
                        color="emerald"
                    />
                    <SummaryCard
                        title="Utilización"
                        value={`${metrics.utilizationRate}%`}
                        subtitle={`${metrics.totalClients} de ${metrics.totalCapacity}`}
                        icon={<Activity className="w-5 h-5" />}
                        color="blue"
                        trend={metrics.utilizationRate > 80 ? 'up' : 'neutral'}
                    />
                    <SummaryCard
                        title="Plazas Libres"
                        value={metrics.availableSlots}
                        icon={<Target className="w-5 h-5" />}
                        color="indigo"
                    />
                    <SummaryCard
                        title="Disponibles"
                        value={metrics.availableCoaches}
                        subtitle="para asignar"
                        icon={<UserCheck className="w-5 h-5" />}
                        color="purple"
                    />
                    <SummaryCard
                        title="Vacaciones"
                        value={metrics.onVacation}
                        icon={<Calendar className="w-5 h-5" />}
                        color="amber"
                    />
                    <SummaryCard
                        title="Sobrecargados"
                        value={metrics.overloaded}
                        icon={<AlertTriangle className="w-5 h-5" />}
                        color="rose"
                    />
                </div>
            </div>

            {/* Coaches Grid/List */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredCoaches.map(coach => {
                        const coachNotes = notes.filter(n => n.coach_id === coach.id);
                        const total = (coach.actual_active_clients || 0) + (coach.actual_paused_clients || 0);
                        const isOverloaded = total >= (coach.max_clients || 0) * 0.95;
                        const isExpanded = expandedCoach === coach.id;

                        return (
                            <div
                                key={coach.id}
                                className={`bg-white rounded-2xl border shadow-lg overflow-hidden transition-all hover:shadow-xl ${isOverloaded ? 'border-rose-200' : 'border-slate-100'
                                    }`}
                            >
                                {/* Header del Coach */}
                                <div className={`p-4 ${isOverloaded
                                    ? 'bg-gradient-to-r from-rose-50 to-rose-100'
                                    : 'bg-gradient-to-r from-slate-50 to-slate-100'
                                    }`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <CapacityRing
                                                current={total}
                                                max={coach.max_clients || 50}
                                                size={70}
                                            />
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900">{coach.name}</h3>
                                                <p className="text-xs text-slate-500 capitalize">{coach.role}</p>
                                                <StatusBadge status={coach.status} available={coach.available_for_assignment} />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => startEdit(coach)}
                                            className="p-2 bg-white/80 hover:bg-white text-slate-600 rounded-xl transition-colors shadow-sm"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Barra de Capacidad */}
                                <div className="p-4 border-b border-slate-100">
                                    <CapacityBar
                                        active={coach.actual_active_clients || 0}
                                        paused={coach.actual_paused_clients || 0}
                                        max={coach.max_clients || 50}
                                    />
                                </div>

                                {/* Notas y Alertas */}
                                <div className="p-4">
                                    {coach.assignment_notes && (
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
                                            <p className="text-xs text-blue-800">
                                                <Info className="w-3.5 h-3.5 inline mr-1" />
                                                {coach.assignment_notes}
                                            </p>
                                        </div>
                                    )}

                                    {coachNotes.length > 0 && (
                                        <div className="space-y-2">
                                            {coachNotes.slice(0, isExpanded ? undefined : 2).map(note => (
                                                <div
                                                    key={note.id}
                                                    className="flex items-start justify-between bg-slate-50 rounded-lg p-2"
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <NoteTypeBadge type={note.note_type} />
                                                            <PriorityBadge priority={note.priority} />
                                                        </div>
                                                        <p className="text-xs text-slate-700">{note.note}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteNote(note.id)}
                                                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {coachNotes.length > 2 && (
                                        <button
                                            onClick={() => setExpandedCoach(isExpanded ? null : coach.id)}
                                            className="w-full mt-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1"
                                        >
                                            {isExpanded ? (
                                                <>
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                    Ver menos
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                    Ver {coachNotes.length - 2} más
                                                </>
                                            )}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setShowAddNote(coach.id)}
                                        className="w-full mt-3 py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-medium text-slate-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Añadir nota
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Vista de Lista Detallada */
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Coach</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Capacidad</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Activos</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Pausados</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Disponibles</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Asignable</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Notas</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCoaches.map(coach => {
                                    const coachNotes = notes.filter(n => n.coach_id === coach.id);
                                    const active = coach.actual_active_clients || 0;
                                    const paused = coach.actual_paused_clients || 0;
                                    const total = active + paused;
                                    const available = Math.max(0, (coach.max_clients || 0) - total);
                                    const isOverloaded = total >= (coach.max_clients || 0) * 0.95;

                                    return (
                                        <tr key={coach.id} className={`hover:bg-slate-50 transition-colors ${isOverloaded ? 'bg-rose-50/50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-slate-900">{coach.name}</p>
                                                    <p className="text-xs text-slate-500">{coach.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <StatusBadge status={coach.status} available={false} />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <CapacityRing current={total} max={coach.max_clients || 50} size={50} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-sm">
                                                    {active}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold text-sm">
                                                    {paused}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-sm ${available > 0
                                                    ? 'bg-indigo-100 text-indigo-800'
                                                    : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {available}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {coach.available_for_assignment ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-slate-300 mx-auto" />
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {coachNotes.length > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                                                        <Info className="w-3 h-3" />
                                                        {coachNotes.length}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setShowAddNote(coach.id)}
                                                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Añadir nota"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => startEdit(coach)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Edición */}
            {editingCoach && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">
                                Editar Coach: {coaches.find(c => c.id === editingCoach)?.name}
                            </h2>
                            <button
                                onClick={cancelEdit}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Capacidad */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Clientes Actuales
                                    </label>
                                    <input
                                        type="number"
                                        value={editForm.current_clients || 0}
                                        onChange={(e) => setEditForm({ ...editForm, current_clients: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Máximo de Clientes
                                    </label>
                                    <input
                                        type="number"
                                        value={editForm.max_clients || 0}
                                        onChange={(e) => setEditForm({ ...editForm, max_clients: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Estado y Disponibilidad */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Estado
                                    </label>
                                    <select
                                        value={editForm.status || 'active'}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    >
                                        <option value="active">Activo</option>
                                        <option value="vacation">Vacaciones</option>
                                        <option value="sick_leave">Baja Médica</option>
                                        <option value="inactive">Inactivo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Disponible para Asignación
                                    </label>
                                    <div className="flex gap-3 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, available_for_assignment: true })}
                                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${editForm.available_for_assignment
                                                ? 'bg-emerald-500 text-white shadow-lg'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            <UserCheck className="w-4 h-4 inline mr-2" />
                                            Sí
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, available_for_assignment: false })}
                                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${!editForm.available_for_assignment
                                                ? 'bg-rose-500 text-white shadow-lg'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            <UserX className="w-4 h-4 inline mr-2" />
                                            No
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Notas */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Notas de Estado
                                </label>
                                <textarea
                                    value={editForm.status_notes || ''}
                                    onChange={(e) => setEditForm({ ...editForm, status_notes: e.target.value })}
                                    rows={2}
                                    placeholder="Notas sobre el estado actual del coach..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Instrucciones para Closers
                                </label>
                                <textarea
                                    value={editForm.assignment_notes || ''}
                                    onChange={(e) => setEditForm({ ...editForm, assignment_notes: e.target.value })}
                                    rows={2}
                                    placeholder="Instrucciones para closers sobre asignación de clientes..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-6 flex items-center justify-end gap-3">
                            <button
                                onClick={cancelEdit}
                                className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveCoach}
                                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Añadir Nota */}
            {showAddNote && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                        <div className="border-b border-slate-100 p-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">
                                Nueva Nota para {coaches.find(c => c.id === showAddNote)?.name}
                            </h2>
                            <button
                                onClick={() => setShowAddNote(null)}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Tipo</label>
                                    <select
                                        value={newNote.note_type}
                                        onChange={(e) => setNewNote({ ...newNote, note_type: e.target.value as any })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="preference">Preferencia</option>
                                        <option value="restriction">Restricción</option>
                                        <option value="temporary_hold">Retención Temporal</option>
                                        <option value="capacity_limit">Límite de Capacidad</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Prioridad</label>
                                    <select
                                        value={newNote.priority}
                                        onChange={(e) => setNewNote({ ...newNote, priority: e.target.value as any })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="low">Baja</option>
                                        <option value="normal">Normal</option>
                                        <option value="high">Alta</option>
                                        <option value="critical">Crítica</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nota</label>
                                <textarea
                                    value={newNote.note}
                                    onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
                                    placeholder="Escribe la nota..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Válido desde</label>
                                    <input
                                        type="date"
                                        value={newNote.valid_from}
                                        onChange={(e) => setNewNote({ ...newNote, valid_from: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Válido hasta</label>
                                    <input
                                        type="date"
                                        value={newNote.valid_until}
                                        onChange={(e) => setNewNote({ ...newNote, valid_until: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 p-6 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowAddNote(null)}
                                className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => addNote(showAddNote)}
                                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Añadir Nota
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
