import React, { useState, useEffect } from 'react';
import {
    MessageSquare, Tag, Clock, CheckCircle2,
    Plus, Filter, Search, User, Calendar,
    AlertCircle, AlertTriangle, ArrowRight,
    Loader2, X, Briefcase
} from 'lucide-react';
import { SupportTicket, SupportTicketComment, User as UserType, Client, UserRole } from '../types';
import { mockEvolution } from '../services/mockSupabase';
import { supabase } from '../services/supabaseClient';

interface SupportTicketsViewProps {
    user: UserType;
    clients: Client[];
}

export function SupportTicketsView({ user, clients }: SupportTicketsViewProps) {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [viewTeamTickets, setViewTeamTickets] = useState(user.role === 'admin' || user.role === 'head_coach');
    const [staff, setStaff] = useState<UserType[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [comments, setComments] = useState<SupportTicketComment[]>([]);
    const [newCommentText, setNewCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    const [newTicket, setNewTicket] = useState({
        target_type: 'client' as 'client' | 'staff',
        client_id: '',
        staff_id: '',
        assigned_to: '',
        subject: '',
        description: '',
        priority: 'medium' as const,
        category: 'tecnico_app' as any
    });
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadTickets();
        loadStaff();

        // ⚡ REALTIME TICKETS SUBSCRIPTION (Global for the list)
        console.log('⚡ Conectando a Realtime para la lista de tickets...');
        const ticketsChannel = supabase
            .channel('global_tickets_changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'support_tickets'
                },
                async (payload) => {
                    console.log('⚡ Cambio detectado en tickets via Realtime:', payload.eventType, payload.new);

                    if (payload.eventType === 'INSERT') {
                        const newTicket = payload.new as SupportTicket;
                        // Reload or just add? Reload is safer for joins (names)
                        loadTickets();
                    }
                    else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as SupportTicket;

                        setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));

                        // Si es el ticket que tenemos abierto, actualizar su estado localmente
                        setSelectedTicket(prev => {
                            if (prev && prev.id === updated.id) {
                                return { ...prev, ...updated };
                            }
                            return prev;
                        });
                    }
                    else if (payload.eventType === 'DELETE') {
                        const deletedId = payload.old.id;
                        setTickets(prev => prev.filter(t => t.id !== deletedId));
                        setSelectedTicket(prev => prev?.id === deletedId ? null : prev);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(ticketsChannel);
        };
    }, []);

    const loadStaff = async () => {
        try {
            const { data } = await mockEvolution.tasks.getStaff();
            setStaff(data || []);
        } catch (e) {
            console.error('Error loading staff:', e);
        }
    };

    useEffect(() => {
        if (selectedTicket) {
            loadComments(selectedTicket.id);
        } else {
            setComments([]);
            setNewCommentText('');
        }
    }, [selectedTicket]);

    // ⚡ REALTIME COMMENTS SUBSCRIPTION
    useEffect(() => {
        if (!selectedTicket) return;

        console.log('⚡ Conectando a Realtime para ticket:', selectedTicket.id);

        const channel = supabase
            .channel(`chat_${selectedTicket.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ticket_comments'
                },
                async (payload) => {
                    const newComment = payload.new as any;

                    // Filtrar manualmente por ticket_id para asegurar que pertenece a este ticket
                    if (newComment.ticket_id !== selectedTicket.id) return;

                    console.log('⚡ Nuevo mensaje recibido vía Realtime:', newComment);

                    try {
                        // Obtener detalles del autor (nombre y foto)
                        const { data: userData, error } = await supabase
                            .from('users')
                            .select('name, photo_url')
                            .eq('id', newComment.user_id)
                            .single();

                        if (error) throw error;

                        const fullComment: SupportTicketComment = {
                            ...newComment,
                            user_name: userData?.name || 'Usuario',
                            user_photo: userData?.photo_url
                        };

                        setComments(prev => {
                            if (prev.some(c => c.id === fullComment.id)) return prev;
                            const updated = [...prev, fullComment];
                            console.log('⚡ Lista de comentarios actualizada:', updated.length);
                            return updated;
                        });
                    } catch (err) {
                        console.error('❌ Error al procesar mensaje Realtime:', err);
                        // Fallback: añadir mensaje sin nombre si falla el fetch
                        setComments(prev => {
                            if (prev.some(c => c.id === newComment.id)) return prev;
                            return [...prev, { ...newComment, user_name: 'Usuario' }];
                        });
                    }
                }
            )
            .subscribe((status) => {
                console.log(`📡 Estado de la conexión Realtime (${selectedTicket.id}):`, status);
                if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Error crítico en el canal Realtime. Posible problema de RLS o configuración.');
                }
            });

        return () => {
            console.log('⚡ Cerrando canal Realtime para:', selectedTicket.id);
            supabase.removeChannel(channel);
        };
    }, [selectedTicket?.id]); // Usar solo el ID como dependencia para evitar reinicios innecesarios

    // 🧹 AUTO-MARK NOTIFICATIONS AS READ WHEN TICKET IS OPEN
    useEffect(() => {
        if (!selectedTicket || !user.id) return;

        const markTicketNotifsRead = async () => {
            console.log('🧹 Limpiando notificaciones para ticket:', selectedTicket.id);
            const { error } = await supabase
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .match({
                    user_id: user.id,
                    type: 'ticket'
                })
                .is('read_at', null)
                .or(`link.eq.support-tickets?id=${selectedTicket.id},link.eq.support-tickets`);

            if (error) console.error('Error auto-marking notifications as read:', error);
        };

        markTicketNotifsRead();
    }, [selectedTicket?.id]); // Solo ejecutar al abrir o cambiar de ticket, NO en cada comentario nuevo

    const handleAddComment = async (text?: string) => {
        const messageToSave = text || newCommentText;
        if (!messageToSave.trim() || !selectedTicket || isSubmittingComment) return;

        setIsSubmittingComment(true);
        try {
            console.log('📝 Guardando comentario...', {
                ticket_id: selectedTicket.id,
                user_id: user.id,
                message: messageToSave.trim()
            });

            const comment = await (mockEvolution.tickets as any).comments.create({
                ticket_id: selectedTicket.id,
                user_id: user.id,
                message: messageToSave.trim()
            });

            console.log('✅ Comentario guardado con éxito:', comment);

            setComments(prev => [...prev, {
                ...comment,
                user_name: user.name,
                user_photo: user.photo_url
            }]);

            // 🔔 NOTIFICACIÓN: Ahora se gestiona automáticamente vía Trigger en la base de datos
            // para evitar duplicados y asegurar fiabilidad.

            setNewCommentText('');
            return true;
        } catch (e) {
            console.error('Error saving comment:', e);
            alert('Error al guardar comentario');
            return false;
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const loadComments = async (ticketId: string) => {
        try {
            const data = await (mockEvolution.tickets as any).comments.getByTicket(ticketId);
            setComments(data);
        } catch (e) {
            console.error('Error loading comments:', e);
        }
    };


    const loadTickets = async () => {
        setIsLoading(true);
        try {
            const data = await mockEvolution.tickets.getAll();
            setTickets(data);
        } catch (error) {
            console.error('Error loading tickets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newTicket.target_type === 'client' && !newTicket.client_id) {
            alert('Debes seleccionar un alumno');
            return;
        }
        if (newTicket.target_type === 'staff' && !newTicket.staff_id) {
            alert('Debes seleccionar un miembro del staff');
            return;
        }
        setIsCreating(true);
        console.log('Opening ticket with data:', { ...newTicket, created_by: user.id });

        try {
            // Determine assigned_to logic
            let assignedUserId = newTicket.assigned_to;

            // If Client ticket and no assignee, default to HEAD_COACH
            if (newTicket.target_type === 'client' && !assignedUserId) {
                const headCoach = staff.find(s => s.role === 'head_coach');
                if (headCoach) assignedUserId = headCoach.id;
            }

            const ticketData = {
                subject: newTicket.subject,
                description: newTicket.description,
                priority: newTicket.priority,
                category: newTicket.category,
                client_id: newTicket.target_type === 'client' ? newTicket.client_id : null,
                staff_id: newTicket.target_type === 'staff' ? newTicket.staff_id : null,
                assigned_to: assignedUserId || null,
                created_by: user.id,
                status: 'open'
            };

            const ticket = await mockEvolution.tickets.create(ticketData as any);
            console.log('Ticket created successfully:', ticket);

            // 🔔 NOTIFICACIÓN: Ahora se gestiona automáticamente vía Trigger en la base de datos.

            // Reload to get properly merged client name
            await loadTickets();
            setShowCreateModal(false);
            setNewTicket({ target_type: 'client', client_id: '', staff_id: '', assigned_to: '', subject: '', description: '', priority: 'medium', category: 'tecnico_app' });
        } catch (error: any) {
            console.error('Error in handleCreateTicket:', error);
            alert(`Error al crear el ticket: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsCreating(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'resolved': return 'bg-green-100 text-green-700 border-green-200';
            case 'closed': return 'bg-slate-100 text-slate-600 border-slate-200';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
            case 'low': return <ArrowRight className="w-4 h-4 text-slate-400" />;
            default: return <AlertCircle className="w-4 h-4 text-blue-500" />;
        }
    };

    const filteredTickets = tickets.filter(t => {
        // Data Isolation: If not Admin/HC/Accounting, only see tickets you created or are assigned to you
        const hasOversight = [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.CONTABILIDAD].includes(user.role as any);
        const canSeeAll = hasOversight && viewTeamTickets;

        const canSee = canSeeAll || t.assigned_to === user.id || (t as any).created_by === user.id || t.staff_id === user.id || (t as any).target_staff?.email === user.email;

        if (!canSee) return false;

        const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.staff_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                        <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Centro de Soporte</h1>
                        <p className="text-slate-500 font-medium">Gestión de incidencias y dudas de los alumnos</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span>Abrir Nuevo Ticket</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[300px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por asunto, descripción o cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-4">
                    {([UserRole.ADMIN, UserRole.HEAD_COACH].includes(user.role as any)) && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                            <input
                                type="checkbox"
                                id="teamView"
                                checked={viewTeamTickets}
                                onChange={e => setViewTeamTickets(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="teamView" className="text-xs font-black text-indigo-700 uppercase tracking-widest cursor-pointer">Vista de Equipo</label>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="open">Abiertos</option>
                            <option value="in_progress">En progreso</option>
                            <option value="resolved">Resueltos</option>
                            <option value="closed">Cerrados</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-4">
                {isLoading ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando tickets...</p>
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No hay tickets activos</h3>
                        <p className="text-slate-500 max-w-xs mx-auto">Cuando los alumnos abran incidencias aparecerán aquí para ser gestionadas.</p>
                    </div>
                ) : (
                    filteredTickets.map(ticket => (
                        <div
                            key={ticket.id}
                            onClick={() => setSelectedTicket(ticket)}
                            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl border ${getStatusStyle(ticket.status)}`}>
                                        {ticket.status === 'open' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${getStatusStyle(ticket.status)}`}>
                                                {ticket.status.replace('_', ' ')}
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                <Tag className="w-3 h-3" />
                                                {ticket.category}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{ticket.subject}</h3>
                                        <div className="mt-2 flex items-center gap-4 text-xs font-bold text-slate-400">
                                            <span className="flex items-center gap-1.5">
                                                {ticket.staff_id ? (
                                                    <>
                                                        <Briefcase className="w-3.5 h-3.5 text-orange-500" />
                                                        <span className="text-orange-600">Staff: {ticket.staff_name || 'Desconocido'}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <User className="w-3.5 h-3.5" />
                                                        <span>Alumno: {ticket.client_name || 'Desconocido'}</span>
                                                    </>
                                                )}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </span>
                                            {ticket.creator_name && (
                                                <span className="flex items-center gap-1.5 text-slate-500 italic">
                                                    <User className="w-3.5 h-3.5" />
                                                    Abierto por: {ticket.creator_name}
                                                </span>
                                            )}
                                            {ticket.assigned_to && (
                                                <span className="flex items-center gap-1.5 text-indigo-500">
                                                    <Briefcase className="w-3.5 h-3.5" />
                                                    Asignado: {staff.find(s => s.id === ticket.assigned_to)?.name || 'Especialista'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden md:block">
                                        <div className="flex items-center gap-1 justify-end mb-1">
                                            {getPriorityIcon(ticket.priority)}
                                            <span className="text-[10px] font-black uppercase text-slate-400">Prioridad {ticket.priority}</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Última act.: {new Date(ticket.updated_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="p-2 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-xl transition-all">
                                        <ArrowRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal para Crear Ticket */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Abrir Incidencia</h3>
                            <p className="text-sm text-slate-500 font-medium">Describe el problema para que el equipo pueda ayudarte</p>
                        </div>
                        <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block text-center">Tipo de Incidencia</label>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                                        <button
                                            type="button"
                                            onClick={() => setNewTicket({ ...newTicket, target_type: 'client' })}
                                            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${newTicket.target_type === 'client' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <User className="w-3.5 h-3.5" />
                                                Alumno
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewTicket({ ...newTicket, target_type: 'staff' })}
                                            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${newTicket.target_type === 'staff' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <Briefcase className="w-3.5 h-3.5" />
                                                Staff / Interno
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {newTicket.target_type === 'client' ? (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block tracking-tight">Seleccionar Alumno</label>
                                        <select
                                            required={newTicket.target_type === 'client'}
                                            value={newTicket.client_id}
                                            onChange={(e) => setNewTicket({ ...newTicket, client_id: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                        >
                                            <option value="">Buscar alumno...</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block tracking-tight">Seleccionar Miembro del Staff</label>
                                        <select
                                            required={newTicket.target_type === 'staff'}
                                            value={newTicket.staff_id}
                                            onChange={(e) => setNewTicket({ ...newTicket, staff_id: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 font-mono"
                                        >
                                            <option value="">Seleccionar compañero...</option>
                                            {staff.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.role.toUpperCase()})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>



                            {/* ASSIGNMENT FOR CLIENT TICKETS */}
                            {newTicket.target_type === 'client' && (
                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-4">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">
                                        Asignar Responsable (Opcional)
                                    </label>
                                    <select
                                        value={newTicket.assigned_to}
                                        onChange={(e) => setNewTicket({ ...newTicket, assigned_to: e.target.value })}
                                        className="w-full px-4 py-2 bg-white border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-indigo-900 text-sm"
                                    >
                                        <option value="">Automático (Notificar a Head Coach)</option>
                                        {staff.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-indigo-400 mt-2 font-medium">
                                        * Si lo dejas en blanco, se asignará automáticamente al Head Coach.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Área Dirigida</label>
                                    <select
                                        value={newTicket.category}
                                        onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                    >
                                        <option value="tecnico_app">Técnico / App</option>
                                        <option value="nutricion">Nutrición</option>
                                        <option value="entrenamiento">Entrenamiento</option>
                                        <option value="facturacion">Pagos / Facturación</option>
                                        <option value="medico">Médico / Endocrino</option>
                                        <option value="otros">Otros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Prioridad</label>
                                    <select
                                        value={newTicket.priority}
                                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                    >
                                        <option value="low">Baja</option>
                                        <option value="medium">Media</option>
                                        <option value="high">Alta</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Asunto</label>
                                <input
                                    required
                                    value={newTicket.subject}
                                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                    placeholder="Ej: No puedo ver mis recibos de diciembre"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Descripción Detallada</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={newTicket.description}
                                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                    placeholder="Explica detalladamente qué sucede..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-50 rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className={`flex-1 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95 ${isCreating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Abriendo...
                                        </>
                                    ) : 'Abrir Ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )
            }

            {/* Modal Detalle de Ticket */}
            {
                selectedTicket && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
                        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                            <div className={`p-8 border-b ${getStatusStyle(selectedTicket.status)}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current">
                                        Ticket #{selectedTicket.id.slice(0, 8)}
                                    </span>
                                    <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                <h3 className="text-2xl font-black tracking-tight">{selectedTicket.subject}</h3>
                                <div className="flex items-center gap-4 mt-4 text-sm font-bold opacity-80">
                                    <span className="flex items-center gap-1.5">
                                        {selectedTicket.staff_id ? (
                                            <>
                                                <Briefcase className="w-4 h-4" />
                                                Staff Afectado: {selectedTicket.staff_name || 'Desconocido'}
                                            </>
                                        ) : (
                                            <>
                                                <User className="w-4 h-4" />
                                                Alumno: {selectedTicket.client_name || 'Desconocido'}
                                            </>
                                        )}
                                    </span>
                                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(selectedTicket.created_at).toLocaleString()}</span>
                                    {selectedTicket.creator_name && (
                                        <span className="flex items-center gap-1.5 text-indigo-600">
                                            <Briefcase className="w-4 h-4" />
                                            Generado por: {selectedTicket.creator_name}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Descripción del Problema</h4>
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed font-medium">
                                        {selectedTicket.description}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Cambiar Estado</h4>
                                        <select
                                            value={selectedTicket.status}
                                            onChange={async (e) => {
                                                const newStatus = e.target.value as any;
                                                try {
                                                    // Si hay texto en el cuadro de comentario, guardarlo automáticamente
                                                    if (newCommentText.trim()) {
                                                        await handleAddComment(`[Estado cambiado a ${newStatus}] ${newCommentText}`);
                                                    }

                                                    await mockEvolution.tickets.update(selectedTicket.id, { status: newStatus });

                                                    // 🔔 NOTIFICACIÓN: Ahora se gestiona automáticamente vía Trigger en la base de datos.

                                                    setSelectedTicket({ ...selectedTicket, status: newStatus });
                                                    setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: newStatus } : t));
                                                } catch (e) {
                                                    alert('Error al actualizar estado');
                                                }
                                            }}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        >
                                            <option value="open">Abierto</option>
                                            <option value="in_progress">En progreso</option>
                                            <option value="resolved">Resuelto</option>
                                            <option value="closed">Cerrado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Prioridad</h4>
                                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-500 uppercase text-xs flex items-center gap-2">
                                            {getPriorityIcon(selectedTicket.priority)}
                                            {selectedTicket.priority}
                                        </div>
                                    </div>
                                    {/* RESPONSABLE / RE-ASIGNACIÓN */}
                                    {([UserRole.ADMIN, UserRole.HEAD_COACH].includes(user.role as any) || selectedTicket.assigned_to === user.id) && (
                                        <div className="col-span-2">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                                {selectedTicket.assigned_to === user.id ? '✅ Eres el Responsable (Puedes delegar)' : '👤 Responsable Asignado'}
                                            </h4>
                                            <select
                                                value={selectedTicket.assigned_to || ''}
                                                onChange={async (e) => {
                                                    const newAssignedId = e.target.value;
                                                    try {
                                                        await mockEvolution.tickets.update(selectedTicket.id, { assigned_to: newAssignedId });

                                                        // 🔔 NOTIFICACIÓN: Ahora vía Trigger en la DB

                                                        setSelectedTicket({ ...selectedTicket, assigned_to: newAssignedId });
                                                        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, assigned_to: newAssignedId } : t));
                                                    } catch (e) {
                                                        alert('Error al asignar responsable');
                                                    }
                                                }}
                                                className="w-full px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            >
                                                <option value="">Sin asignar / En cola general</option>
                                                {staff.map(member => (
                                                    <option key={member.id} value={member.id}>
                                                        {member.name} ({member.role.toUpperCase()})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <MessageSquare className="w-3 h-3" />
                                        Historial de Comentarios / Respuesta
                                    </h4>

                                    <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {/* Mensaje Original */}
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 shrink-0 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-black text-indigo-600">
                                                {selectedTicket.creator_name?.substring(0, 1).toUpperCase() || 'E'}
                                            </div>
                                            <div className="max-w-[80%] p-3 rounded-2xl text-sm bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200">
                                                <div className="flex justify-between items-center gap-4 mb-1">
                                                    <span className="text-[10px] font-black uppercase opacity-70 tracking-tight">
                                                        {selectedTicket.creator_name || 'Emisor'} (Original)
                                                    </span>
                                                    <span className="text-[9px] opacity-60">
                                                        {new Date(selectedTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="leading-relaxed whitespace-pre-line">{selectedTicket.description}</p>
                                            </div>
                                        </div>

                                        {comments.map((comment) => (

                                            <div key={comment.id} className={`flex gap-3 ${comment.user_id === user.id ? 'flex-row-reverse' : ''}`}>
                                                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 overflow-hidden border-2 border-white shadow-sm">
                                                    {comment.user_photo ? (
                                                        <img src={comment.user_photo} alt={comment.user_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-500">
                                                            {comment.user_name?.substring(0, 1).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${comment.user_id === user.id
                                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                                    : 'bg-slate-100 text-slate-700 rounded-tl-none'
                                                    }`}>
                                                    <div className="flex justify-between items-center gap-4 mb-1">
                                                        <span className="text-[10px] font-black uppercase opacity-70 tracking-tight">
                                                            {comment.user_id === user.id ? 'Tú' : comment.user_name}
                                                        </span>
                                                        <span className="text-[9px] opacity-60">
                                                            {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="leading-relaxed whitespace-pre-line">{comment.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>


                                    <div className="relative group">
                                        <textarea
                                            value={newCommentText}
                                            onChange={(e) => setNewCommentText(e.target.value)}
                                            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[2rem] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none shadow-sm"
                                            rows={2}
                                            placeholder="Escribe una actualización o respuesta..."
                                            disabled={isSubmittingComment}
                                        />
                                        <button
                                            onClick={() => handleAddComment()}
                                            disabled={!newCommentText.trim() || isSubmittingComment}
                                            className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-400 transition-all shadow-lg active:scale-95"
                                        >
                                            {isSubmittingComment ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <ArrowRight className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-4">
                                {(['resolved', 'closed'].includes(selectedTicket.status)) && (
                                    <button
                                        onClick={async () => {
                                            if (!confirm('¿Seguro que quieres reabrir este ticket? El responsable recibirá un aviso.')) return;
                                            try {
                                                const newStatus = 'open';
                                                await mockEvolution.tickets.update(selectedTicket.id, { status: newStatus });

                                                // 🔔 NOTIFICACIÓN: Ahora vía Trigger en la DB

                                                setSelectedTicket({ ...selectedTicket, status: newStatus });
                                                setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: newStatus } : t));
                                                alert('Ticket re-abierto correctamente.');
                                            } catch (e) {
                                                alert('Error al reabrir ticket');
                                            }
                                        }}
                                        className="px-6 py-3 bg-amber-100 text-amber-700 font-black uppercase tracking-widest text-[10px] rounded-xl border border-amber-200 hover:bg-amber-200 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <AlertCircle className="w-4 h-4" />
                                        Reabrir Ticket
                                    </button>
                                )}

                                <div className="flex-1" />

                                <button
                                    onClick={async () => {
                                        if (newCommentText.trim()) {
                                            const saved = await handleAddComment();
                                            if (!saved) return; // Don't close if save failed
                                        }
                                        setSelectedTicket(null);
                                    }}
                                    className="px-8 py-3 bg-slate-800 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:bg-slate-900 transition-all active:scale-95"
                                >
                                    Guardar y Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
