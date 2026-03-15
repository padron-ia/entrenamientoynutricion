import React, { useState, useEffect } from 'react';
import { ClientRiskAlert, Client, User, RiskReasonCategory } from '../types';
import { riskAlertService, RISK_CATEGORIES } from '../services/riskAlertService';
import { ShieldAlert, AlertTriangle, Clock, ChevronRight, Users, ArrowUpCircle } from 'lucide-react';

interface RiskAlertsPanelProps {
    clients: Client[];
    coaches: User[];
    onNavigateToView: (view: string) => void;
    onNavigateToClient: (client: Client) => void;
}

export function RiskAlertsPanel({ clients, coaches, onNavigateToView, onNavigateToClient }: RiskAlertsPanelProps) {
    const [alerts, setAlerts] = useState<ClientRiskAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ active: 0, escalated: 0, thisWeek: 0 });

    useEffect(() => {
        loadAlerts();
    }, []);

    const loadAlerts = async () => {
        setLoading(true);
        try {
            const activeAlerts = await riskAlertService.getActiveAlerts();
            setAlerts(activeAlerts.slice(0, 5)); // Show only last 5

            // Calculate stats
            const escalatedCount = activeAlerts.filter(a => a.status === 'escalated').length;
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const thisWeekCount = activeAlerts.filter(a => new Date(a.created_at) >= oneWeekAgo).length;

            setStats({
                active: activeAlerts.length,
                escalated: escalatedCount,
                thisWeek: thisWeekCount
            });
        } catch (error) {
            console.error('Error loading risk alerts:', error);
        } finally {
            setLoading(false);
        }
    };

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
        const date = new Date(dateStr);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffHours < 1) return 'Hace unos minutos';
        if (diffHours < 24) return `Hace ${diffHours}h`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    if (loading) {
        return (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                <div className="animate-pulse">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
                        <div className="flex-1">
                            <div className="h-5 bg-slate-200 rounded w-1/3 mb-2"></div>
                            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-slate-100 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden relative">
            {/* Background decoration */}
            {stats.active > 0 && (
                <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.active > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900">Clientes en Riesgo</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sistema Antiabandono</p>
                    </div>
                </div>
                {stats.active > 0 && (
                    <button
                        onClick={() => onNavigateToView('risk-alerts')}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-sm font-bold transition-colors"
                    >
                        Ver todas
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className={`p-4 rounded-2xl border ${stats.active > 0 ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Activas</p>
                    <p className={`text-2xl font-black ${stats.active > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{stats.active}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${stats.escalated > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Escaladas</p>
                    <p className={`text-2xl font-black ${stats.escalated > 0 ? 'text-red-600' : 'text-slate-400'}`}>{stats.escalated}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${stats.thisWeek > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Esta Semana</p>
                    <p className={`text-2xl font-black ${stats.thisWeek > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{stats.thisWeek}</p>
                </div>
            </div>

            {/* Alerts List */}
            {alerts.length === 0 ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">No hay alertas activas</p>
                    <p className="text-xs text-slate-400 mt-1">Todos los clientes están en buen estado</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {alerts.map(alert => {
                        const client = getClient(alert.client_id);
                        return (
                            <div
                                key={alert.id}
                                onClick={() => client && onNavigateToClient(client)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${alert.status === 'escalated'
                                        ? 'bg-red-50 border-red-100 hover:border-red-200'
                                        : 'bg-orange-50 border-orange-100 hover:border-orange-200'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">
                                        {RISK_CATEGORIES[alert.reason_category as RiskReasonCategory]?.icon || '?'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-800 truncate">
                                                {getClientName(alert.client_id)}
                                            </p>
                                            {alert.status === 'escalated' && (
                                                <ArrowUpCircle className="w-4 h-4 text-red-500 shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {RISK_CATEGORIES[alert.reason_category as RiskReasonCategory]?.label || alert.reason_category}
                                            <span className="mx-1">·</span>
                                            {getCoachName(alert.coach_id)}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(alert.created_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            {stats.active > 5 && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                    <button
                        onClick={() => onNavigateToView('risk-alerts')}
                        className="text-sm text-orange-600 hover:text-orange-700 font-bold"
                    >
                        Ver {stats.active - 5} alertas más
                    </button>
                </div>
            )}
        </div>
    );
}
