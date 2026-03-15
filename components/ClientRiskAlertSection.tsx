import React, { useState, useEffect } from 'react';
import { ClientRiskAlert, RiskReasonCategory, User } from '../types';
import { riskAlertService, RISK_CATEGORIES, RiskAlertComment } from '../services/riskAlertService';
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp, Plus, X, Send, ArrowUpCircle, MessageSquare, User as UserIcon } from 'lucide-react';

interface ClientRiskAlertSectionProps {
    clientId: string;
    clientName: string;
    currentUser: User;
}

export function ClientRiskAlertSection({ clientId, clientName, currentUser }: ClientRiskAlertSectionProps) {
    const [activeAlerts, setActiveAlerts] = useState<ClientRiskAlert[]>([]);
    const [alertHistory, setAlertHistory] = useState<ClientRiskAlert[]>([]);
    const [comments, setComments] = useState<RiskAlertComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [resolvingAlert, setResolvingAlert] = useState<ClientRiskAlert | null>(null);

    // Form state
    const [selectedCategory, setSelectedCategory] = useState<RiskReasonCategory>('no_response');
    const [notes, setNotes] = useState('');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [addingComment, setAddingComment] = useState(false);

    useEffect(() => {
        loadAlerts();
    }, [clientId]);

    // Load comments for the most recent active alert if any
    useEffect(() => {
        if (activeAlerts.length > 0) {
            loadComments(activeAlerts[0].id);
        } else {
            setComments([]);
        }
    }, [activeAlerts.length > 0 ? activeAlerts[0].id : null]);

    const loadAlerts = async () => {
        setLoading(true);
        try {
            const [active, history] = await Promise.all([
                riskAlertService.getActiveAlertsForClient(clientId),
                riskAlertService.getClientAlerts(clientId)
            ]);
            setActiveAlerts(active);
            setAlertHistory(history);
        } catch (error) {
            console.error('Error loading risk alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadComments = async (alertId: string) => {
        try {
            const data = await riskAlertService.getAlertComments(alertId);
            setComments(data);
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    };

    const handleCreateAlert = async () => {
        if (!selectedCategory) return;
        setSubmitting(true);
        try {
            const newAlert = await riskAlertService.createAlert(clientId, currentUser.id, selectedCategory, notes);

            // Add initial comment for traceability
            await riskAlertService.addComment(
                newAlert.id,
                currentUser.id,
                currentUser.name,
                currentUser.role,
                `🚩 Alerta creada: ${RISK_CATEGORIES[selectedCategory].label}. ${notes ? `Nota inicial: ${notes}` : ''}`
            );

            setShowCreateModal(false);
            setNotes('');
            setSelectedCategory('no_response');
            await loadAlerts();
        } catch (error) {
            console.error('Error creating alert:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolveAlert = async () => {
        if (!resolvingAlert) return;
        setSubmitting(true);
        try {
            await riskAlertService.resolveAlert(resolvingAlert.id, currentUser.id, resolutionNotes);

            // Add automatic comment when resolving for better traceability
            await riskAlertService.addComment(
                resolvingAlert.id,
                currentUser.id,
                currentUser.name,
                currentUser.role,
                `✅ Alerta resuelta. Nota de resolución: ${resolutionNotes || 'Sin notas adicionales'}`
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

    const handleEscalateAlert = async (alertId: string) => {
        setSubmitting(true);
        try {
            await riskAlertService.escalateAlert(alertId);
            // Add automatic comment when escalating
            await riskAlertService.addComment(
                alertId,
                currentUser.id,
                currentUser.name,
                currentUser.role,
                '⚠️ Alerta escalada - Se requiere atención de dirección'
            );
            await loadAlerts();
        } catch (error) {
            console.error('Error escalating alert:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddComment = async () => {
        if (activeAlerts.length === 0 || !newComment.trim()) return;
        setAddingComment(true);
        try {
            // Always add comment to the most recent active alert
            const targetAlertId = activeAlerts[0].id;
            await riskAlertService.addComment(
                targetAlertId,
                currentUser.id,
                currentUser.name,
                currentUser.role,
                newComment.trim()
            );
            setNewComment('');
            await loadComments(targetAlertId);
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setAddingComment(false);
        }
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

    const getRoleBadge = (role?: string) => {
        if (!role) return null;
        const r = role.toLowerCase();
        if (r === 'admin' || r === 'head_coach') {
            return <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold uppercase">Dirección</span>;
        }
        if (r === 'coach') {
            return <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold uppercase">Coach</span>;
        }
        return <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase">{role}</span>;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold uppercase">Activa</span>;
            case 'escalated':
                return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold uppercase">Escalada</span>;
            case 'resolved':
                return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">Resuelta</span>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="animate-pulse flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
                    <div className="flex-1">
                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        );
    }

    const hasEscalated = activeAlerts.some(a => a.status === 'escalated');

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-4 border-b ${activeAlerts.length > 0 ? (hasEscalated ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100') : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeAlerts.length > 0 ? (hasEscalated ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600') : 'bg-slate-100 text-slate-400'}`}>
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Alertas de Riesgo</h3>
                            <p className="text-xs text-slate-500">
                                {activeAlerts.length > 0 ? `${activeAlerts.length} motivo(s) activos de riesgo` : 'Sin alertas activas'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {activeAlerts.length > 0 ? 'Añadir Motivo' : 'Marcar en Riesgo'}
                    </button>
                </div>
            </div>

            {/* Active Alerts List */}
            {activeAlerts.length > 0 && (
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        {activeAlerts.map(alert => (
                            <div key={alert.id} className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{RISK_CATEGORIES[alert.reason_category as RiskReasonCategory]?.icon || '?'}</span>
                                        <div>
                                            <p className="font-bold text-slate-800">
                                                {RISK_CATEGORIES[alert.reason_category as RiskReasonCategory]?.label || alert.reason_category}
                                            </p>
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(alert.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(alert.status)}
                                        <button
                                            onClick={() => setResolvingAlert(alert)}
                                            className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg transition-colors border border-green-100"
                                            title="Resolver este motivo"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                        {alert.status !== 'escalated' && (
                                            <button
                                                onClick={() => handleEscalateAlert(alert.id)}
                                                className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-red-100"
                                                title="Escalar este motivo"
                                            >
                                                <ArrowUpCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {alert.notes && (
                                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg italic">"{alert.notes}"</p>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold text-slate-700">Canal de Seguimiento</span>
                        </div>

                        {/* Mixed Comments feed from latest alert */}
                        <div className="space-y-4 mb-4 max-h-80 overflow-y-auto pr-2">
                            {comments.length > 0 ? (
                                comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                            <UserIcon className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <div className="flex-1 min-w-0 bg-slate-50 rounded-2xl p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-800">{comment.user_name || 'Usuario'}</span>
                                                {getRoleBadge(comment.user_role)}
                                                <span className="text-[9px] text-slate-400">{formatDate(comment.created_at)}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{comment.message}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-4 text-xs text-slate-400">No hay comentarios en este hilo aún.</p>
                            )}
                        </div>

                        {/* Add Comment Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Añadir comentario o actualización..."
                                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                            />
                            <button
                                onClick={handleAddComment}
                                disabled={addingComment || !newComment.trim()}
                                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {addingComment ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Toggle */}
            {alertHistory.length > 0 && (
                <div className="border-t border-slate-100">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full px-6 py-3 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <span className="font-medium">
                            Historial completo de alertas ({alertHistory.length})
                        </span>
                        {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showHistory && (
                        <div className="px-6 pb-4 space-y-3 mt-2">
                            {alertHistory.map(alert => (
                                <AlertHistoryItem
                                    key={alert.id}
                                    alert={alert}
                                    formatDate={formatDate}
                                    getStatusBadge={getStatusBadge}
                                    getRoleBadge={getRoleBadge}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create Alert Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 bg-orange-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">Añadir Motivo de Riesgo</h3>
                                        <p className="text-xs text-slate-500">{clientName}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Selecciona la categoría</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.entries(RISK_CATEGORIES) as [RiskReasonCategory, { label: string; icon: string }][]).map(([key, { label, icon }]) => (
                                        <button
                                            key={key}
                                            onClick={() => setSelectedCategory(key)}
                                            className={`p-3 rounded-xl border-2 text-left transition-all ${selectedCategory === key
                                                ? 'border-orange-500 bg-orange-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <span className="text-lg mr-2">{icon}</span>
                                            <span className="text-xs font-medium text-slate-700">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Notas específicas sobre este motivo</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Explica qué has detectado..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateAlert}
                                disabled={submitting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {submitting ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Crear Alerta
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resolve Alert Modal */}
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
                                        <h3 className="font-bold text-slate-800">Resolver Motivo</h3>
                                        <p className="text-xs text-slate-500">{RISK_CATEGORIES[resolvingAlert.reason_category as RiskReasonCategory]?.label}</p>
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
                                onClick={handleResolveAlert}
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
        </div>
    );
}

// Sub-component for history items with their own comments
interface AlertHistoryItemProps {
    alert: ClientRiskAlert;
    formatDate: (date: string) => string;
    getStatusBadge: (status: string) => React.ReactNode;
    getRoleBadge: (role?: string) => React.ReactNode;
}

function AlertHistoryItem({ alert, formatDate, getStatusBadge, getRoleBadge }: AlertHistoryItemProps) {
    const [comments, setComments] = useState<RiskAlertComment[]>([]);
    const [showComments, setShowComments] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);

    const loadComments = async () => {
        if (comments.length > 0) {
            setShowComments(!showComments);
            return;
        }
        setLoadingComments(true);
        try {
            const data = await riskAlertService.getAlertComments(alert.id);
            setComments(data);
            setShowComments(true);
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    return (
        <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-start gap-3">
                <span className="text-lg">{RISK_CATEGORIES[alert.reason_category as RiskReasonCategory]?.icon || '?'}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-700">
                            {RISK_CATEGORIES[alert.reason_category as RiskReasonCategory]?.label || alert.reason_category}
                        </span>
                        {getStatusBadge(alert.status)}
                    </div>
                    <p className="text-xs text-slate-500">
                        Creada: {formatDate(alert.created_at)}
                        {alert.resolved_at && ` | Resuelta: ${formatDate(alert.resolved_at)}`}
                    </p>
                    {alert.notes && (
                        <p className="text-xs text-slate-600 mt-1">{alert.notes}</p>
                    )}
                    {alert.resolution_notes && (
                        <p className="text-xs text-green-600 mt-1 italic">Resolución: {alert.resolution_notes}</p>
                    )}

                    {/* Toggle comments */}
                    <button
                        onClick={loadComments}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                        <MessageSquare className="w-3 h-3" />
                        {loadingComments ? 'Cargando...' : showComments ? 'Ocultar seguimiento' : 'Ver seguimiento'}
                    </button>

                    {showComments && comments.length > 0 && (
                        <div className="mt-2 space-y-2 pl-2 border-l-2 border-slate-200">
                            {comments.map(comment => (
                                <div key={comment.id} className="text-xs">
                                    <div className="flex items-center gap-1 flex-wrap">
                                        <span className="font-bold text-slate-700">{comment.user_name}</span>
                                        {getRoleBadge(comment.user_role)}
                                        <span className="text-slate-400">· {formatDate(comment.created_at)}</span>
                                    </div>
                                    <p className="text-slate-600 mt-0.5">{comment.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
