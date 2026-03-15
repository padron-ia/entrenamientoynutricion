import React, { useState, useEffect } from 'react';
import {
    CheckCircle2, Circle, Clock, AlertCircle,
    Plus, Trash2, Calendar, User, ListTodo,
    ChevronDown, ChevronUp, MoreVertical,
    Check, Pencil
} from 'lucide-react';
import { CoachTask, User as UserType, UserRole } from '../types';
import { mockEvolution } from '../services/mockSupabase';

interface CoachTasksDashboardProps {
    user: UserType;
}

export function CoachTasksDashboard({ user }: CoachTasksDashboardProps) {
    const [tasks, setTasks] = useState<CoachTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
    const [staff, setStaff] = useState<UserType[]>([]);
    const [isAssigning, setIsAssigning] = useState(false);
    const [viewTeamTasks, setViewTeamTasks] = useState(user.role === 'admin' || user.role === 'head_coach');
    const [editingTask, setEditingTask] = useState<CoachTask | null>(null);

    useEffect(() => {
        loadTasks();
        if (canAssign) loadStaff();
    }, [user.id, viewTeamTasks]);

    const canAssign = user.role === 'admin' || user.role === 'head_coach';

    const loadStaff = async () => {
        try {
            const { data } = await mockEvolution.tasks.getStaff();
            setStaff(data || []);
        } catch (e) {
            console.error('Error loading staff:', e);
        }
    };

    const loadTasks = async () => {
        setIsLoading(true);
        try {
            const hasOversight = user.role === 'admin' || user.role === 'head_coach';
            const data = (hasOversight && viewTeamTasks)
                ? await (mockEvolution.tasks as any).getAll()
                : await mockEvolution.tasks.getByCoach(user.id);
            setTasks(data);
        } catch (error) {
            console.error('Error loading tasks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTaskStatus = async (task: CoachTask) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';

        // Optimistic update
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

        try {
            await mockEvolution.tasks.update(task.id, { status: newStatus });
        } catch (error) {
            console.error('Error updating task:', error);
            // Revert on error
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
        }
    };

    const deleteTask = async (taskId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;

        setTasks(prev => prev.filter(t => t.id !== taskId));
        try {
            await mockEvolution.tasks.delete(taskId);
        } catch (error) {
            console.error('Error deleting task:', error);
            loadTasks();
        }
    };

    const filteredTasks = tasks.filter(t => {
        if (filter === 'all') return true;
        if (filter === 'pending') return t.status !== 'completed';
        if (filter === 'completed') return t.status === 'completed';
        return true;
    });

    const priorityColors = {
        low: 'bg-slate-100 text-slate-600',
        medium: 'bg-blue-100 text-blue-600',
        high: 'bg-orange-100 text-orange-600',
        urgent: 'bg-red-100 text-red-600 border border-red-200 animate-pulse'
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col transition-all hover:shadow-md">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <ListTodo className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Mis Tareas Pendientes</h3>
                        <p className="text-xs text-slate-500">{tasks.filter(t => t.status !== 'completed').length} pendientes</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                    {([UserRole.ADMIN, UserRole.HEAD_COACH].includes(user.role as any)) && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100">
                            <input
                                type="checkbox"
                                id="teamTasksView"
                                checked={viewTeamTasks}
                                onChange={e => setViewTeamTasks(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="teamTasksView" className="text-[10px] font-black text-indigo-700 uppercase tracking-widest cursor-pointer">Vista Equipo</label>
                        </div>
                    )}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="px-6 py-3 border-b border-slate-50 flex items-center gap-2 overflow-x-auto no-scrollbar">
                {(['pending', 'all', 'completed'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`
                            px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap
                            ${filter === f
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'text-slate-500 hover:bg-slate-100'}
                        `}
                    >
                        {f === 'pending' ? 'Pendientes' : f === 'all' ? 'Todas' : 'Completadas'}
                    </button>
                ))}
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto max-h-[400px]">
                {isLoading ? (
                    <div className="p-12 text-center text-slate-400">
                        <Clock className="w-8 h-8 animate-spin mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Cargando tareas...</p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-10" />
                        <p className="font-medium">No hay tareas aquí</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredTasks.map((task) => (
                            <div key={task.id} className="group p-4 hover:bg-slate-50/80 transition-all flex items-start gap-4">
                                <button
                                    onClick={() => toggleTaskStatus(task)}
                                    className={`mt-0.5 transition-all ${task.status === 'completed' ? 'text-green-500' : 'text-slate-300 hover:text-indigo-500'}`}
                                >
                                    {task.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className={`font-bold text-sm truncate ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                            {task.title}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${priorityColors[task.priority]}`}>
                                                {task.priority === 'urgent' ? '¡URGENTE!' : task.priority}
                                            </span>
                                            {task.coach_id !== user.id && (
                                                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                                                    Para: {staff.find(s => s.id === task.coach_id)?.name || 'Especialista'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                                        {task.description}
                                    </p>

                                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {task.due_date && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(task.due_date).toLocaleDateString()}
                                            </span>
                                        )}
                                        {task.due_time && (
                                            <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                <Clock className="w-3 h-3" />
                                                {task.due_time}
                                            </span>
                                        )}
                                        {task.client_name && (
                                            <span className="flex items-center gap-1 text-indigo-500/70">
                                                <User className="w-3 h-3" />
                                                {task.client_name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => setEditingTask(task)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => deleteTask(task.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal para Crear Tarea */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800">Nueva Tarea</h3>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const assignedId = (formData.get('assigned_to') as string) || user.id;

                            const newTask = {
                                title: formData.get('title') as string,
                                description: formData.get('description') as string,
                                priority: formData.get('priority') as any,
                                due_date: (formData.get('due_date') as string) || undefined,
                                due_time: (formData.get('due_time') as string) || undefined,
                                coach_id: assignedId,
                                status: 'pending' as const
                            };

                            try {
                                const created = await mockEvolution.tasks.create(newTask);
                                // Solo añadir a la lista si me la he asignado a mi o soy admin viendo todo
                                if (assignedId === user.id || canAssign) {
                                    setTasks(prev => [created, ...prev]);
                                }
                                setShowCreateModal(false);
                            } catch (error: any) {
                                console.error('Error creating task:', error);
                                alert(`Error al crear la tarea: ${error.message || 'Error desconocido'}`);
                            }
                        }} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título</label>
                                <input name="title" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Ej: Llamar a Juan..." />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descripción</label>
                                <textarea name="description" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" rows={3} placeholder="Detalles de la tarea..." />
                            </div>

                            {canAssign && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Asignar a</label>
                                    <select name="assigned_to" defaultValue={user.id} className="w-full px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-indigo-700">
                                        <option value={user.id}>Mí mismo ({user.name})</option>
                                        <optgroup label="Equipo de Staff">
                                            {staff.filter(s => s.id !== user.id).map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Prioridad</label>
                                <select name="priority" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20">
                                    <option value="low">Baja</option>
                                    <option value="medium" selected>Media</option>
                                    <option value="high">Alta</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fecha Límite</label>
                                    <input name="due_date" type="date" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Hora</label>
                                    <input name="due_time" type="time" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Crear Tarea</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Editar Tarea */}
            {editingTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 bg-indigo-50/30">
                            <h3 className="text-xl font-bold text-slate-800">Editar Tarea</h3>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);

                            const updates = {
                                title: formData.get('title') as string,
                                description: formData.get('description') as string,
                                priority: formData.get('priority') as any,
                                due_date: (formData.get('due_date') as string) || undefined,
                                due_time: (formData.get('due_time') as string) || undefined,
                                status: formData.get('status') as any
                            };

                            try {
                                await mockEvolution.tasks.update(editingTask.id, updates);
                                setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...updates } : t));
                                setEditingTask(null);
                            } catch (error: any) {
                                console.error('Error updating task:', error);
                                alert(`Error al actualizar la tarea: ${error.message || 'Error desconocido'}`);
                            }
                        }} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título</label>
                                <input name="title" required defaultValue={editingTask.title} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descripción</label>
                                <textarea name="description" defaultValue={editingTask.description} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" rows={3} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Estado</label>
                                    <select name="status" defaultValue={editingTask.status} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20">
                                        <option value="pending">Pendiente</option>
                                        <option value="in_progress">En Progreso</option>
                                        <option value="completed">Completada</option>
                                        <option value="cancelled">Cancelada</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Prioridad</label>
                                    <select name="priority" defaultValue={editingTask.priority} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20">
                                        <option value="low">Baja</option>
                                        <option value="medium">Media</option>
                                        <option value="high">Alta</option>
                                        <option value="urgent">Urgente</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fecha Límite</label>
                                    <input
                                        name="due_date"
                                        type="date"
                                        defaultValue={editingTask.due_date ? new Date(editingTask.due_date).toISOString().split('T')[0] : ''}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Hora</label>
                                    <input
                                        name="due_time"
                                        type="time"
                                        defaultValue={editingTask.due_time || ''}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setEditingTask(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
