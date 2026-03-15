import React, { useState, useEffect } from 'react';
import { Mail, Users, Calendar, CheckCircle2, XCircle, Clock, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface Communication {
    id: string;
    created_at: string;
    created_by: string;
    sender_role: string;
    subject: string;
    message: string;
    target_audience: string;
    total_recipients: number;
    emails_sent: number;
    emails_failed: number;
    status: string;
    sent_at: string;
}

interface CommunicationHistoryProps {
    currentUser: string;
    isAdmin: boolean;
}

export function CommunicationHistory({ currentUser, isAdmin }: CommunicationHistoryProps) {
    const [communications, setCommunications] = useState<Communication[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        loadCommunications();
    }, [currentUser, isAdmin]);

    const loadCommunications = async () => {
        try {
            let query = supabase
                .from('mass_communications')
                .select('*')
                .order('created_at', { ascending: false });

            // If not admin, filter by coach
            if (!isAdmin) {
                query = query.eq('created_by', currentUser);
            }

            const { data, error } = await query;

            if (error) throw error;
            if (data) setCommunications(data);
        } catch (error) {
            console.error('Error loading communications:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'sent': return 'bg-green-100 text-green-700';
            case 'sending': return 'bg-blue-100 text-blue-700';
            case 'failed': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent': return <CheckCircle2 className="w-4 h-4" />;
            case 'sending': return <Clock className="w-4 h-4 animate-spin" />;
            case 'failed': return <XCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Cargando historial...</p>
                </div>
            </div>
        );
    }

    if (communications.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No hay comunicaciones enviadas aún</p>
                <p className="text-slate-400 text-sm mt-1">Las comunicaciones que envíes aparecerán aquí</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Historial de Comunicaciones</h3>
                    <p className="text-sm text-slate-500">{communications.length} comunicaciones enviadas</p>
                </div>
            </div>

            <div className="space-y-3">
                {communications.map((comm) => (
                    <div
                        key={comm.id}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all"
                    >
                        {/* Header */}
                        <div
                            className="p-4 cursor-pointer"
                            onClick={() => setExpandedId(expandedId === comm.id ? null : comm.id)}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-bold text-slate-800">{comm.subject}</h4>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${getStatusColor(comm.status)}`}>
                                            {getStatusIcon(comm.status)}
                                            {comm.status === 'sent' ? 'Enviado' : comm.status === 'sending' ? 'Enviando' : 'Error'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(comm.created_at).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {comm.total_recipients} destinatarios
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Mail className="w-3 h-3" />
                                            {comm.emails_sent} enviados
                                            {comm.emails_failed > 0 && `, ${comm.emails_failed} fallidos`}
                                        </span>
                                    </div>
                                </div>
                                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                    {expandedId === comm.id ? (
                                        <ChevronUp className="w-5 h-5 text-slate-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedId === comm.id && (
                            <div className="border-t border-slate-100 p-4 bg-slate-50">
                                <div className="mb-3">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Mensaje</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200">
                                        {comm.message}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <p className="text-slate-500 font-medium">Enviado por</p>
                                        <p className="text-slate-800 font-bold">{comm.created_by}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 font-medium">Audiencia</p>
                                        <p className="text-slate-800 font-bold">
                                            {comm.target_audience === 'my_clients' ? 'Mis Clientes' : 'Todos los Clientes Activos'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
