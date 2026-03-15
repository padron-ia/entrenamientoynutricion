import React, { useState, useEffect, useMemo } from 'react';
import { ClientRiskAlert, Client, User, RiskReasonCategory, RiskAlertStatus, UserRole } from '../types';
import { riskAlertService, RISK_CATEGORIES } from '../services/riskAlertService';
import {
    ShieldAlert, AlertTriangle, Clock, ChevronRight, Users, ArrowUpCircle,
    CheckCircle2, Filter, Search, X, ExternalLink, RefreshCw, MessageSquare, Send, User as UserIcon
} from 'lucide-react';

interface RiskAlertsViewProps {
    clients: Client[];
    coaches: User[];
    currentUser: User;
    onNavigateToClient: (client: Client) => void;
}

export function RiskAlertsView({ clients, coaches, currentUser, onNavigateToClient }: RiskAlertsViewProps) {
    const [alerts, setAlerts] = useState<ClientRiskAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    // Filters
    const [statusFilter, setStatusFilter] = useState<RiskAlertStatus | 'all'>('all');
    const [coachFilter, setCoachFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<RiskReasonCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Resolve modal
    const [resolvingAlert, setResolvingAlert] = useState<ClientRiskAlert | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    // Comment modal
    const [viewingAlert, setViewingAlert] = useState<ClientRiskAlert | null>(null);
    const [alertComments, setAlertComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);

    const canSeeAllAlerts = [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.DIRECCION].includes(currentUser.role);

    useEffect(() => {
        loadAlerts();
    }, [statusFilter, coachFilter, categoryFilter]);

    const loadAlerts = async () => {
        setLoading(true);
        try {
            const filters: any = {};

            if (statusFilter !== 'all') {
                filters.status = statusFilter;
            }
            if (coachFilter !== 'all') {
                filters.coach_id = coachFilter;
            }
            if (categoryFilter !== 'all') {
                filters.category = categoryFilter;
            }

            // Solo admin, head_coach, dirección ven todas. Coaches solo las suyas.
            if (!canSeeAllAlerts) {
                filters.coach_id = currentUser.id;
            }

            const result = await riskAlertService.getAllAlerts(filters);
            setAlerts(result.alerts);
            setTotal(result.total);
        } catch (error) {
            console.error('Error loading risk alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAlerts = useMemo(() => {
        if (!searchQuery.trim()) return alerts;

        const query = searchQuery.toLowerCase();
        return alerts.filter(alert => {
            const client = clients.find(c => c.id === alert.client_id);
            const clientName = client?.name || client?.firstName || '';
            const coach = coaches.find(c => c.id === alert.coach_id);
            const coachName = coach?.name || '';

            return (
                clientName.toLowerCase().includes(query) ||
                coachName.toLowerCase().includes(query) ||
                (alert.notes || '').toLowerCase().includes(query)
            );
        });
    }, [alerts, searchQuery, clients, coaches]);

    const getClientName = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        return client?.name || client?.firstName || 'Cliente desconocido';
    };

    const getCoachName = (coachId: string) => {
        const coach = coaches.find(c => c.id === coachId);
        return coach?.name || 'Coach desconocido';
    };

    const getClient = (clientId: string) => {
        return clients.find(c => c.id === clientId);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleResolve = async () => {
        if (!resolvingAlert) return;
        setSubmitting(true);
        try {
            await riskAlertService.resolveAlert(resolvingAlert.id, currentUser.id, resolutionNotes);

            // Add automatic comment for better traceability
            await riskAlertService.addComment(
                resolvingAlert.id,
                currentUser.id,
                currentUser.name,
                currentUser.role,
                `✅ Alerta resuelta desde el panel. Nota: ${resolutionNotes || 'Sin notas adicionales'}`
            );

            setResolvingAlert(null);
            setResolutionNotes('');
            await loadAlerts();
        } catch (error) {
            console.error('Error resolving alert:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEscalate = async (alertId: string) => {
        try {
            await riskAlertService.escalateAlert(alertId);

            // Add automatic comment when escalating
            await riskAlertService.addComment(
                alertId,
                currentUser.id,
                currentUser.name,
                currentUser.role,
                '⚠️ Alerta escalada desde el panel - Se requiere atención de dirección'
            );

            await loadAlerts();
        } catch (error) {
            console.error('Error escalating alert:', error);
        }
    };

    const handleViewComments = async (alert: ClientRiskAlert) => {
        setViewingAlert(alert);
        setLoadingComments(true);
        try {
            const data = await riskAlertService.getAlertComments(alert.id);
            setAlertComments(data);
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleAddComment = async () => {
        if (!viewingAlert || !newComment.trim()) return;
        setSubmitting(true);
        try {
            await riskAlertService.addComment(
                viewingAlert.id,
                currentUser.id,
                currentUser.name,
                currentUser.role,
                newComment.trim()
            );
            setNewComment('');
            // Reload comments
            const data = await riskAlertService.getAlertComments(viewingAlert.id);
            setAlertComments(data);
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold">Activa</span>;
            case 'escalated':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">Escalada</span>;
            case 'resolved':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">Resuelta</span>;
            default:
                return null;
        }
    };

    // Get unique coaches from alerts for filter
    const alertCoaches = useMemo(() => {
        const coachIds = [...new Set(alerts.map(a => a.coach_id))];
        return coaches.filter(c => coachIds.includes(c.id));
    }, [alerts, coaches]);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                        <ShieldAlert className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Alertas de Riesgo</h1>
                        <p className="text-sm text-slate-500">Sistema de prevención de abandonos</p>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, coach o notas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as RiskAlertStatus | 'all')}
                        className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="active">Activas</option>
                        <option value="escalated">Escaladas</option>
                        <option value="resolved">Resueltas</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value as RiskReasonCategory | 'all')}
                        className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                        <option value="all">Todas las categorías</option>
                        {Object.entries(RISK_CATEGORIES).map(([key, { label, icon }]) => (
                            <option key={key} value={key}>{icon} {label}</option>
                        ))}
                    </select>

                    {/* Coach Filter (only for staff that can see all) */}
                    {canSeeAllAlerts && (
                        <select
                            value={coachFilter}
                            onChange={(e) => setCoachFilter(e.target.value)}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        >
                            <option value="all">Todos los coaches</option>
                            {coaches
                                .filter(c => c.role === UserRole.COACH || c.role === UserRole.HEAD_COACH)
                                .map(coach => (
                                    <option key={coach.id} value={coach.id}>{coach.name}</option>
                                ))}
                        </select>
                    )}

                    {/* Refresh */}
                    <button
                        onClick={loadAlerts}
                        disabled={loading}
                        className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-2xl font-black text-slate-800">{total}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Activas</p>
                    <p className="text-2xl font-black text-orange-600">
                        {filteredAlerts.filter(a => a.status === 'active').length}
                    </p>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Escaladas</p>
                    <p className="text-2xl font-black text-red-600">
                        {filteredAlerts.filter(a => a.status === 'escalated').length}
                    </p>
                </div>
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Resueltas</p>
                    <p className="text-2xl font-black text-green-600">
                        {filteredAlerts.filter(a => a.status === 'resolved').length}
                    </p>
                </div>
            </div>

            {/* Alerts Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500">Cargando alertas...</p>
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">No hay alertas que mostrar</p>
                        <p className="text-xs text-slate-400 mt-1">Prueba ajustando los filtros</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cliente</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categoría</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Coach</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Strikes</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAlerts.map(alert => {
                                    const client = getClient(alert.client_id);
                                    const category = RISK_CATEGORIES[alert.reason_category as RiskReasonCategory];

                                    return (
                                        <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg">
                                                        {category?.icon || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{getClientName(alert.client_id)}</p>
                                                        {alert.notes && (
                                                            <p className="text-xs text-slate-500 line-clamp-1 max-w-[200px]">{alert.notes}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600">{category?.label || alert.reason_category}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600">{getCoachName(alert.coach_id)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(alert.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {client?.missed_checkins_count ? (
                                                    <span className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-black border border-red-100">
                                                        {client.missed_checkins_count}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm text-slate-600">{formatDate(alert.created_at)}</p>
                                                    {alert.resolved_at && (
                                                        <p className="text-xs text-green-600">Resuelta: {formatDate(alert.resolved_at)}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewComments(alert)}
                                                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors relative"
                                                        title="Ver comentarios"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                    </button>
                                                    {client && (
                                                        <button
                                                            onClick={() => onNavigateToClient(client)}
                                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                            title="Ver ficha"
                                                        >
                                                            <ExternalLink className="w-4 h-4 text-slate-500" />
                                                        </button>
                                                    )}
                                                    {alert.status !== 'resolved' && (
                                                        <>
                                                            <button
                                                                onClick={() => setResolvingAlert(alert)}
                                                                className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                                                title="Resolver"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </button>
                                                            {alert.status !== 'escalated' && (
                                                                <button
                                                                    onClick={() => handleEscalate(alert.id)}
                                                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                                    title="Escalar"
                                                                >
                                                                    <ArrowUpCircle className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Resolve Modal */}
            {resolvingAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setResolvingAlert(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-green-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">Resolver Alerta</h3>
                                        <p className="text-xs text-slate-500">{getClientName(resolvingAlert.client_id)}</p>
                                    </div>
                                </div>
                                <button onClick={() => setResolvingAlert(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Notas de resolución (opcional)</label>
                            <textarea
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                placeholder="Describe cómo se resolvió la situación..."
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none"
                                rows={3}
                            />
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button
                                onClick={() => setResolvingAlert(null)}
                                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleResolve}
                                disabled={submitting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {submitting ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Marcar como Resuelta
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Comments Modal */}
            {viewingAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setViewingAlert(null)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Comentarios de Seguimiento</h3>
                                    <p className="text-xs text-slate-500">{getClientName(viewingAlert.client_id)}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingAlert(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {loadingComments ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="animate-pulse flex gap-3">
                                            <div className="w-8 h-8 bg-slate-100 rounded-full" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 bg-slate-100 rounded w-1/4" />
                                                <div className="h-8 bg-slate-50 rounded w-full" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : alertComments.length === 0 ? (
                                <div className="text-center py-10">
                                    <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">No hay comentarios aún</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {alertComments.map((comment, idx) => (
                                        <div key={comment.id || idx} className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                                                <UserIcon size={14} className="text-slate-400" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-[11px] font-black text-slate-900 uppercase">
                                                        {comment.user_name}
                                                        {comment.user_role && (
                                                            <span className="ml-2 text-[9px] text-blue-500 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">
                                                                {comment.user_role}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 font-medium">{formatDate(comment.created_at)}</span>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 italic text-slate-600 text-[13px] leading-relaxed">
                                                    {comment.message}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Escribe un comentario..."
                                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={submitting || !newComment.trim()}
                                    className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 text-center font-bold uppercase tracking-widest">
                                * Justifica el motivo por el cual el alumno no envió el check-in.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
