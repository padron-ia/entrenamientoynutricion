import React, { useState, useEffect } from 'react';
import { X, Eye, CheckCircle2, Clock, Users, TrendingUp } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface ReadAnalytics {
    announcement_id: string;
    announcement_title: string;
    total_recipients: number;
    total_reads: number;
    read_percentage: number;
    readers: {
        user_id: string;
        user_name: string;
        user_email: string;
        read_at: string;
    }[];
    non_readers: {
        user_id: string;
        user_name: string;
        user_email: string;
    }[];
}

interface AnnouncementAnalyticsModalProps {
    announcementId: string;
    announcementTitle: string;
    targetAudience: string;
    coachFilter?: string | null;
    onClose: () => void;
}

export function AnnouncementAnalyticsModal({
    announcementId,
    announcementTitle,
    targetAudience,
    coachFilter,
    onClose
}: AnnouncementAnalyticsModalProps) {
    const [analytics, setAnalytics] = useState<ReadAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, [announcementId]);

    const loadAnalytics = async () => {
        setIsLoading(true);
        try {
            // 1. Obtener todos los usuarios que deberían ver este anuncio
            let targetUsersQuery = supabase
                .from('users')
                .select('id, name, email, role');

            // Filtrar según la audiencia
            if (targetAudience === 'only_coaches') {
                targetUsersQuery = targetUsersQuery.eq('role', 'coach');
                if (coachFilter) {
                    targetUsersQuery = targetUsersQuery.eq('id', coachFilter);
                }
            } else if (targetAudience === 'only_closers') {
                targetUsersQuery = targetUsersQuery.eq('role', 'closer');
            }
            // Si es 'all_team', no filtramos por rol

            const { data: targetUsers, error: usersError } = await targetUsersQuery;
            if (usersError) throw usersError;

            // 2. Obtener las lecturas de este anuncio
            const { data: reads, error: readsError } = await supabase
                .from('staff_reads')
                .select('user_id, read_at')
                .eq('announcement_id', announcementId);

            if (readsError) throw readsError;

            // 3. Crear un mapa de lecturas
            const readMap = new Map(reads?.map(r => [r.user_id, r.read_at]) || []);

            // 4. Separar usuarios que han leído vs no han leído
            const readers: ReadAnalytics['readers'] = [];
            const nonReaders: ReadAnalytics['non_readers'] = [];

            targetUsers?.forEach(user => {
                const readAt = readMap.get(user.id);
                if (readAt && typeof readAt === 'string') {
                    readers.push({
                        user_id: user.id,
                        user_name: user.name,
                        user_email: user.email,
                        read_at: readAt
                    });
                } else {
                    nonReaders.push({
                        user_id: user.id,
                        user_name: user.name,
                        user_email: user.email
                    });
                }
            });

            // 5. Calcular estadísticas
            const totalRecipients = targetUsers?.length || 0;
            const totalReads = readers.length;
            const readPercentage = totalRecipients > 0
                ? Math.round((totalReads / totalRecipients) * 100)
                : 0;

            setAnalytics({
                announcement_id: announcementId,
                announcement_title: announcementTitle,
                total_recipients: totalRecipients,
                total_reads: totalReads,
                read_percentage: readPercentage,
                readers: readers.sort((a, b) =>
                    new Date(b.read_at).getTime() - new Date(a.read_at).getTime()
                ),
                non_readers: nonReaders.sort((a, b) =>
                    a.user_name.localeCompare(b.user_name)
                )
            });

        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatReadTime = (readAt: string) => {
        const date = new Date(readAt);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Hace un momento';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;

        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20">
                                    <Eye className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black tracking-tight">Analíticas de Lectura</h2>
                                    <p className="text-white/80 font-medium mt-1">Seguimiento de visualizaciones</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-xl transition-all text-white/80 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                            <h3 className="font-bold text-lg mb-1 truncate">{announcementTitle}</h3>
                            <p className="text-white/70 text-sm">
                                Audiencia: <span className="font-bold">{targetAudience.replace(/_/g, ' ')}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                {!isLoading && analytics && (
                    <div className="grid grid-cols-3 gap-4 p-6 bg-slate-50 border-b border-slate-200">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-50 rounded-xl">
                                    <Users className="w-5 h-5 text-blue-600" />
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Destinatarios</span>
                            </div>
                            <p className="text-3xl font-black text-slate-800">{analytics.total_recipients}</p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-50 rounded-xl">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Han Leído</span>
                            </div>
                            <p className="text-3xl font-black text-emerald-600">{analytics.total_reads}</p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-50 rounded-xl">
                                    <TrendingUp className="w-5 h-5 text-purple-600" />
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasa de Lectura</span>
                            </div>
                            <p className="text-3xl font-black text-purple-600">{analytics.read_percentage}%</p>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-400px)]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-slate-500 font-medium">Cargando analíticas...</p>
                        </div>
                    ) : analytics ? (
                        <div className="space-y-6">
                            {/* Progress Bar */}
                            <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${analytics.read_percentage}%` }}
                                />
                            </div>

                            {/* Han Leído */}
                            <div>
                                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    Han Leído ({analytics.total_reads})
                                </h3>
                                {analytics.readers.length === 0 ? (
                                    <div className="bg-slate-50 rounded-2xl p-8 text-center border-2 border-dashed border-slate-200">
                                        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 font-medium">Nadie ha leído este anuncio todavía</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {analytics.readers.map((reader) => (
                                            <div
                                                key={reader.user_id}
                                                className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                                                        {reader.user_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{reader.user_name}</p>
                                                        <p className="text-xs text-slate-500">{reader.user_email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-emerald-700">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span className="text-xs font-bold">{formatReadTime(reader.read_at)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Pendientes de Leer */}
                            {analytics.non_readers.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-amber-600" />
                                        Pendientes de Leer ({analytics.non_readers.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {analytics.non_readers.map((user) => (
                                            <div
                                                key={user.user_id}
                                                className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                                                        {user.user_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{user.user_name}</p>
                                                        <p className="text-xs text-slate-500">{user.user_email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-amber-700">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="text-xs font-bold">Sin leer</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <p className="text-slate-500">No se pudieron cargar las analíticas</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all hover:shadow-xl active:scale-95"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
