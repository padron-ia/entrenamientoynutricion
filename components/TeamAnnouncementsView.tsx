import React, { useState, useEffect } from 'react';
import {
    Bell, Search, Filter, Calendar, User,
    ArrowRight, Info, AlertTriangle, CheckCircle2,
    BellRing, Trash2, Eye, MessageSquare
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { User as UserType, UserRole, Client } from '../types';
import { CreateAnnouncement } from './MassCommunication';
import { AnnouncementAnalyticsModal } from './AnnouncementAnalyticsModal';


interface Announcement {
    id: string;
    created_at: string;
    created_by: string;
    title: string;
    message: string;
    announcement_type: 'info' | 'important' | 'warning' | 'success';
    priority: number;
    icon: string;
    color: string;
    target_audience: string;
    is_active: boolean;
    expires_at?: string;
    coach_filter?: string | null;
}

interface TeamAnnouncementsViewProps {
    user: UserType;
    clients: Client[];
}

export function TeamAnnouncementsView({ user, clients }: TeamAnnouncementsViewProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [analyticsAnnouncementId, setAnalyticsAnnouncementId] = useState<string | null>(null);



    useEffect(() => {
        console.log('👤 TeamAnnouncementsView - User role:', user.role, 'Is Admin?', user.role === UserRole.ADMIN || user.role?.toLowerCase() === 'admin');
        loadAnnouncements();
    }, [user.role]);

    const loadAnnouncements = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });

            // If not admin, filter by relevance
            if (user.role !== UserRole.ADMIN) {
                // This is a simpler client-side filter for now to avoid complex SQL for the demo
                // but in production we'd use .or() or a specialized RPC
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data) {
                // Filter for staff relevance if not admin
                const filtered = user.role === UserRole.ADMIN
                    ? data
                    : data.filter(a => {
                        if (a.target_audience === 'all_team') return true;

                        // Coach specific with filter
                        if (a.target_audience === 'only_coaches' && user.role === UserRole.COACH) {
                            if (a.coach_filter) return a.coach_filter === user.id;
                            return true;
                        }

                        if (a.target_audience === 'only_closers' && user.role === UserRole.CLOSER) return true;
                        return false;
                    });

                setAnnouncements(filtered);
            }
        } catch (error) {
            console.error('Error loading announcements:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getAnnouncementStyle = (type: string) => {
        const styles: Record<string, any> = {
            info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: <Info className="w-5 h-5" /> },
            important: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', icon: <BellRing className="w-5 h-5" /> },
            warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100', icon: <AlertTriangle className="w-5 h-5" /> },
            success: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', icon: <CheckCircle2 className="w-5 h-5" /> },
        };
        return styles[type] || styles.info;
    };

    const filteredAnnouncements = announcements.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.message.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || a.announcement_type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-200">
                        <Bell className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Tablón de Anuncios</h1>
                        <p className="text-slate-500 font-medium">Comunicación interna y avisos para el equipo</p>
                    </div>
                </div>

                {/* New Announcement Button */}
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 active:scale-95"
                >
                    <BellRing className="w-5 h-5" />
                    <span>Nuevo Anuncio</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[300px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar anuncios..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="important">Importante</option>
                        <option value="info">Información</option>
                        <option value="warning">Avisos</option>
                        <option value="success">Buenas Noticias</option>
                    </select>
                </div>
                <button
                    onClick={loadAnnouncements}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Actualizar"
                >
                    <ArrowRight className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List of Announcements */}
                <div className="lg:col-span-2 space-y-4">
                    {isLoading ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-500 font-medium">Cargando anuncios...</p>
                        </div>
                    ) : filteredAnnouncements.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Bell className="w-10 h-10 text-slate-200" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No hay anuncios</h3>
                            <p className="text-slate-500">No se encontraron anuncios que coincidan con tu búsqueda.</p>
                        </div>
                    ) : (
                        filteredAnnouncements.map((announcement) => {
                            const style = getAnnouncementStyle(announcement.announcement_type);
                            const isSelected = selectedAnnouncement?.id === announcement.id;

                            return (
                                <div
                                    key={announcement.id}
                                    onClick={() => setSelectedAnnouncement(announcement)}
                                    className={`
                                        group relative bg-white p-5 rounded-2xl border-2 transition-all cursor-pointer
                                        ${isSelected ? 'border-indigo-500 shadow-lg shadow-indigo-100' : 'border-slate-100 hover:border-slate-300 shadow-sm'}
                                    `}
                                >
                                    <div className="flex gap-4">
                                        <div className={`p-3 rounded-xl shrink-0 ${style.bg} ${style.text} group-hover:scale-110 transition-transform`}>
                                            {style.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-black text-slate-800 truncate pr-4">{announcement.title}</h3>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {(user.role === UserRole.ADMIN || user.role === UserRole.HEAD_COACH) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setAnalyticsAnnouncementId(announcement.id);
                                                                setShowAnalyticsModal(true);
                                                            }}
                                                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all hover:scale-110 active:scale-95"
                                                            title="Ver analíticas de lectura"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                                                        {new Date(announcement.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed mb-4">
                                                {announcement.message}
                                            </p>
                                            <div className="flex items-center justify-between text-xs font-bold">
                                                <div className="flex items-center gap-4">
                                                    <span className="flex items-center gap-1.5 text-slate-400">
                                                        <User className="w-3.5 h-3.5" />
                                                        {announcement.created_by}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-slate-400 capitalize">
                                                        <Target className="w-3.5 h-3.5" />
                                                        {announcement.target_audience.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                <span className="text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                                    Leer más <ArrowRight className="w-3 h-3" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Detail Sidebar / Preview */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8 space-y-6">
                        {selectedAnnouncement ? (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-right-4 duration-300">
                                <div className={`p-6 bg-gradient-to-br ${selectedAnnouncement.announcement_type === 'important' ? 'from-purple-600 to-indigo-600' :
                                    selectedAnnouncement.announcement_type === 'warning' ? 'from-amber-500 to-orange-600' :
                                        selectedAnnouncement.announcement_type === 'success' ? 'from-emerald-500 to-green-600' :
                                            'from-blue-600 to-indigo-600'
                                    } text-white`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                                            {getAnnouncementStyle(selectedAnnouncement.announcement_type).icon}
                                        </div>
                                        <button
                                            onClick={() => setSelectedAnnouncement(null)}
                                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <h2 className="text-2xl font-black leading-tight mb-2">{selectedAnnouncement.title}</h2>
                                    <div className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-wider">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(selectedAnnouncement.created_at).toLocaleString('es-ES')}
                                    </div>
                                </div>
                                <div className="p-8">
                                    <div className="flex items-center gap-3 mb-8 p-3 bg-slate-50 rounded-xl">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                            {selectedAnnouncement.created_by[0]}
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Publicado por</p>
                                            <p className="text-slate-800 font-bold">{selectedAnnouncement.created_by}</p>
                                        </div>
                                    </div>
                                    <div className="prose prose-slate max-w-none">
                                        <p className="text-slate-700 whitespace-pre-line leading-relaxed text-lg">
                                            {selectedAnnouncement.message}
                                        </p>
                                    </div>

                                    <div className="mt-12 pt-6 border-t border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Información de Destinatarios</h4>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                                                Audiencia: {selectedAnnouncement.target_audience}
                                            </span>
                                            {selectedAnnouncement.expires_at && (
                                                <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold">
                                                    Expira: {new Date(selectedAnnouncement.expires_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center h-[500px] flex flex-col items-center justify-center">
                                <MessageSquare className="w-16 h-16 text-slate-200 mb-4" />
                                <h3 className="text-lg font-bold text-slate-400">Selecciona un anuncio</h3>
                                <p className="text-sm text-slate-400 max-w-[200px] mx-auto">Haz clic en cualquier anuncio de la lista para ver el contenido completo.</p>
                            </div>
                        )}

                        {/* Admin Stats Widget (Visual Only - can be improved later) */}
                        {(user.role === UserRole.ADMIN || user.role === UserRole.HEAD_COACH) && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                                    Alcance de la Comunicación
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500 font-medium">Anuncios activos</span>
                                        <span className="text-xs font-black text-slate-800">{announcements.filter(a => a.is_active).length}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500 font-medium">Total este mes</span>
                                        <span className="text-xs font-black text-slate-800">{announcements.length}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                                        <div className="h-full bg-indigo-600 w-3/4 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Create Announcement Modal */}
            {showCreateModal && (
                <CreateAnnouncement
                    currentUser={user.name}
                    isAdmin={user.role === UserRole.ADMIN || user.role === UserRole.HEAD_COACH}
                    clients={clients}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadAnnouncements();
                    }}
                />
            )}

            {/* Analytics Modal */}
            {showAnalyticsModal && analyticsAnnouncementId && (
                <AnnouncementAnalyticsModal
                    announcementId={analyticsAnnouncementId}
                    announcementTitle={
                        announcements.find(a => a.id === analyticsAnnouncementId)?.title || 'Anuncio'
                    }
                    targetAudience={
                        announcements.find(a => a.id === analyticsAnnouncementId)?.target_audience || 'all_team'
                    }
                    coachFilter={
                        announcements.find(a => a.id === analyticsAnnouncementId)?.coach_filter
                    }
                    onClose={() => {
                        setShowAnalyticsModal(false);
                        setAnalyticsAnnouncementId(null);
                    }}
                />
            )}
        </div>
    );
}

// Additional missing icons for the view
const Target = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
);

const TrendingUp = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

const X = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
