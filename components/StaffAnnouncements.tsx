import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Info, BellRing, CheckCircle2, AlertTriangle, ChevronRight, User as UserIcon, Calendar } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { User, UserRole, UnifiedNotification } from '../types';
import { useToast } from './ToastProvider';

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
    action_url: string;
    action_label: string;
    show_as_modal: boolean;
    expires_at: string;
    target_audience: string;
    coach_filter?: string | null;
}

// Unified Feed Item Type
type FeedItem = (Announcement & { feedType: 'announcement' }) | (UnifiedNotification & { feedType: 'notification' });

interface StaffAnnouncementsProps {
    user: User;
    onNavigate?: (view: 'dashboard' | 'clients' | 'renewals' | 'analytics' | 'profile' | 'settings' | 'classes' | 'client-portal' | 'reviews' | 'food-plans' | 'invoices' | 'testimonials' | 'payment-links' | 'team-directory' | 'medical-reviews' | 'new-sale' | 'closer-dashboard' | 'coach-capacity' | 'accounting-dashboard' | 'team-announcements' | 'contracts' | 'support-tickets' | 'coach-tasks') => void;
}

export function StaffAnnouncements({ user, onNavigate }: StaffAnnouncementsProps) {
    const toast = useToast();
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [modalAnnouncement, setModalAnnouncement] = useState<Announcement | null>(null);
    const [showFeed, setShowFeed] = useState(false);
    const [status, setStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR'>('CONNECTING');
    const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(new Set());

    const isRelevant = (a: Announcement) => {
        const userRole = (user.role || '').toLowerCase();

        // 1. All team
        if (a.target_audience === 'all_team') return true;

        // 2. Role specific
        if (a.target_audience === 'only_coaches' && userRole === 'coach') {
            // If there is a coach_filter, it must match the current user
            if (a.coach_filter) return a.coach_filter === user.id;
            return true;
        }
        if (a.target_audience === 'only_closers' && userRole === 'closer') return true;

        return false;
    };

    useEffect(() => {
        loadData();

        // 🔔 REALTIME SUBSCRIPTION
        const sanitizedId = String(user.id || '').replace(/[^\w]/g, '').slice(0, 10);
        const channelId = `staff_feed_${sanitizedId}`;
        console.log("Subscribing to channel:", channelId);

        const channel = supabase
            .channel(channelId)
            // 1. Listen for PUBLIC ANNOUNCEMENTS
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'announcements' },
                (payload) => {
                    const newAnnouncement = payload.new as Announcement;
                    if (isRelevant(newAnnouncement)) {
                        console.log('📢 Nuevo anuncio recibido:', newAnnouncement.title);
                        const item: FeedItem = { ...newAnnouncement, feedType: 'announcement' };
                        setFeedItems(prev => [item, ...prev]);
                        setUnreadCount(prev => prev + 1);

                        if (newAnnouncement.show_as_modal) {
                            playNotificationSound();
                            setModalAnnouncement(newAnnouncement);
                            setShowModal(true);
                        }
                    }
                }
            )
            // 2. Listen for PERSONAL NOTIFICATIONS (New and read status updates)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT and UPDATE
                    schema: 'public',
                    table: 'notifications'
                    // No filter here for maximum reliability, we filter in the callback
                },
                (payload) => {
                    const changedNotif = (payload.new || payload.old) as UnifiedNotification;

                    const notifUser = String(changedNotif.user_id || '').trim().toLowerCase();
                    const currentUser = String(user.id || '').trim().toLowerCase();

                    console.log(`🔔 EVENTO [${payload.eventType}] en notifications. Destinatario: [${notifUser}], Tú: [${currentUser}]`);

                    // Solo procesar si la notificación es para el usuario actual
                    if (notifUser !== currentUser) {
                        console.log(`⏭️ Notificación ignorada: user_id [${notifUser}] no coincide con el usuario actual [${currentUser}]`);
                        return;
                    }

                    if (payload.eventType === 'INSERT') {
                        const newNotification = payload.new as UnifiedNotification;
                        console.log('✅ Notificación confirmada para ti:', newNotification.title);

                        setFeedItems(prev => {
                            // Evitar duplicados si el polling ya lo pilló
                            if (prev.some(i => i.id === newNotification.id)) return prev;

                            // 🔔 MOSTRAR TOAST: Esto confirma que el código está capturando el aviso
                            toast.info(`🔔 ${newNotification.title}: ${newNotification.message}`);

                            const item: FeedItem = { ...newNotification, feedType: 'notification' };
                            return [item, ...prev];
                        });

                        setUnreadCount(prev => prev + 1);
                        playNotificationSound();
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as UnifiedNotification;
                        setFeedItems(prev => {
                            const next = prev.map(i =>
                                (i.feedType === 'notification' && i.id === updated.id)
                                    ? { ...i, ...updated }
                                    : i
                            );

                            // Recalcular el contador de no leídos localmente
                            const unreadAnn = next.filter(i => i.feedType === 'announcement' && !readAnnouncementIds.has(i.id)).length;
                            const unreadNotif = next.filter(i => i.feedType === 'notification' && !i.read_at).length;
                            setUnreadCount(unreadAnn + unreadNotif);

                            return next;
                        });
                    }
                }
            )
            .subscribe((status) => {
                console.log(`📡 Conectando Realtime para [${user.email}] en canal [${channelId}]. Estado:`, status);
                setStatus(status as any);
            });

        // 🔄 Polling Fallback: Cada 30 segundos por si Realtime falla
        const pollInterval = setInterval(() => {
            console.log('🔄 Sincronización en segundo plano (Polling)...');
            loadData();
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [user.id, user.role]);

    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio play failed interaction", e));
    };

    const loadData = async () => {
        try {
            // 1. Fetch Class Announcements
            const { data: allAnnouncements } = await supabase
                .from('announcements')
                .select('*')
                .eq('is_active', true)
                .order('published_at', { ascending: false });

            // 2. Fetch Personal Notifications
            const { data: notifications } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50); // Limit distinct personal notifs

            // 3. Fetch Read Receipts for Announcements
            let readIds = new Set<string>();
            try {
                const { data: reads } = await supabase
                    .from('staff_reads')
                    .select('announcement_id')
                    .eq('user_id', user.id);

                if (reads) readIds = new Set(reads.map((r: any) => r.announcement_id));
            } catch (e) { console.warn(e); }

            setReadAnnouncementIds(readIds);

            // 4. Merge & Process
            const combined: FeedItem[] = [];

            if (allAnnouncements) {
                const targeted = allAnnouncements.filter(isRelevant);
                const now = new Date();
                const active = targeted.filter(a => !a.expires_at || new Date(a.expires_at) > now);

                active.forEach(a => {
                    combined.push({ ...a, feedType: 'announcement' });
                });

                // Check urgent modal
                const unreadAnnouncements = active.filter(a => !readIds.has(a.id));
                const urgent = unreadAnnouncements.find(a => a.show_as_modal && a.priority >= 1);
                if (urgent) {
                    setModalAnnouncement(urgent);
                    setShowModal(true);
                }
            }

            if (notifications) {
                notifications.forEach(n => {
                    combined.push({ ...n, feedType: 'notification' });
                });
            }

            // Sort by Date (Newest first)
            combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setFeedItems(combined);

            // Calc Unread
            const unreadAnn = combined.filter(i => i.feedType === 'announcement' && !readIds.has(i.id)).length;
            const unreadNotif = combined.filter(i => i.feedType === 'notification' && !i.read_at).length;
            setUnreadCount(unreadAnn + unreadNotif);

        } catch (error) {
            console.error('Error loading feed:', error);
        }
    };

    const markAsRead = async (item: FeedItem) => {
        // Optimistic UI
        setUnreadCount(prev => Math.max(0, prev - 1));

        if (item.feedType === 'announcement') {
            setReadAnnouncementIds(prev => {
                const next = new Set(prev);
                next.add(item.id);
                return next;
            });

            const { error } = await supabase.from('staff_reads')
                .upsert({
                    user_id: user.id,
                    announcement_id: item.id
                }, { onConflict: 'user_id,announcement_id', ignoreDuplicates: true });

            if (error) console.error('Error marking announcement read', error);

        } else {
            // Notification
            setFeedItems(prev => prev.map(i =>
                (i.id === item.id && i.feedType === 'notification')
                    ? { ...i, read_at: new Date().toISOString() }
                    : i
            ));

            const { error } = await supabase
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('id', item.id);

            if (error) console.error('Error marking notification read', error);

            // 🚀 NAVIGATION LOGIC
            if (item.feedType === 'notification' && item.link && onNavigate) {
                // Map legacy/SQL links to internal view names
                const linkMap: Record<string, any> = {
                    '/support': 'support-tickets',
                    '/admin/tickets': 'support-tickets',
                    '/tasks': 'coach-tasks',
                    '/invoices': 'invoices',
                    '/clients': 'clients',
                    '/renewals': 'renewals',
                    'support-tickets': 'support-tickets'
                };

                const cleanLink = item.link.split('?')[0];
                const targetView = linkMap[cleanLink] || cleanLink.replace(/^\//, '');

                // Close feed and navigate
                setShowFeed(false);
                onNavigate(targetView as any);
            }
        }
    };

    const markAllAsRead = async () => {
        // 1. Announcements
        const unreadAnn = feedItems.filter(i => i.feedType === 'announcement' && !readAnnouncementIds.has(i.id));
        if (unreadAnn.length > 0) {
            const inserts = unreadAnn.map(a => ({ user_id: user.id, announcement_id: a.id }));
            const next = new Set(readAnnouncementIds);
            unreadAnn.forEach(a => next.add(a.id));
            setReadAnnouncementIds(next);
            await supabase.from('staff_reads').upsert(inserts, { onConflict: 'user_id,announcement_id', ignoreDuplicates: true });
        }

        // 2. Notifications
        const unreadNotif = feedItems.filter(i => i.feedType === 'notification' && !i.read_at);
        if (unreadNotif.length > 0) {
            // Update local
            setFeedItems(prev => prev.map(i => i.feedType === 'notification' ? { ...i, read_at: new Date().toISOString() } : i));
            // Update DB (batch update not supported easily in supbase-js v1/v2 simple query, doing loops or single RPC ideal, but loop ok for small num)
            const ids = unreadNotif.map(n => n.id);
            await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
        }

        setUnreadCount(0);
        toast.success("Todos marcados como leídos");
    };

    const dismissModal = () => {
        if (modalAnnouncement) {
            // We assume modal is always an announcement type
            const fakeItem: FeedItem = { ...modalAnnouncement, feedType: 'announcement' };
            markAsRead(fakeItem);
        }
        setShowModal(false);
        setModalAnnouncement(null);
    };

    const getFeedItemStyle = (item: FeedItem) => {
        if (item.feedType === 'notification') {
            const styles = {
                system: { bg: 'bg-indigo-50', text: 'text-indigo-800', icon: <Info className="w-5 h-5" />, border: 'border-indigo-100' },
                assignment: { bg: 'bg-emerald-50', text: 'text-emerald-800', icon: <CheckCircle2 className="w-5 h-5" />, border: 'border-emerald-100' },
                task: { bg: 'bg-amber-50', text: 'text-amber-800', icon: <BellRing className="w-5 h-5" />, border: 'border-amber-100' },
                checkin: { bg: 'bg-blue-50', text: 'text-blue-800', icon: <Calendar className="w-5 h-5" />, border: 'border-blue-100' },
                ticket: { bg: 'bg-rose-50', text: 'text-rose-800', icon: <AlertTriangle className="w-5 h-5" />, border: 'border-rose-100' },
            };
            // Default fallback
            return styles[item.type] || styles.system;
        }

        // Announcement
        const styles = {
            info: {
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                text: 'text-blue-800',
                icon: <Info className="w-5 h-5" />
            },
            important: {
                bg: 'bg-purple-50',
                border: 'border-purple-200',
                text: 'text-purple-800',
                icon: <BellRing className="w-5 h-5" />
            },
            warning: {
                bg: 'bg-yellow-50',
                border: 'border-yellow-200',
                text: 'text-yellow-800',
                icon: <AlertTriangle className="w-5 h-5" />
            },
            success: {
                bg: 'bg-green-50',
                border: 'border-green-200',
                text: 'text-green-800',
                icon: <CheckCircle2 className="w-5 h-5" />
            }
        };

        return styles[item.announcement_type] || styles.info;
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowFeed(!showFeed)}
                className={`group relative p-3 rounded-2xl transition-all duration-500 ${showFeed
                    ? 'bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.3)] scale-110'
                    : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
                    }`}
                title="Avisos del Equipo"
            >
                <Bell className={`w-5 h-5 transition-transform duration-500 ${showFeed ? 'rotate-12' : 'group-hover:rotate-12'}`} />

                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in duration-300">
                        {unreadCount}
                    </span>
                )}
            </button>

            {showFeed && createPortal(
                <div
                    className="fixed inset-0 z-[99998]"
                    onClick={() => setShowFeed(false)}
                >
                    <div
                        className="absolute right-4 md:right-8 top-16 md:top-20 w-[calc(100vw-2rem)] md:w-[450px] bg-white rounded-[2.5rem] shadow-[0_30px_90px_-12px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden z-[99999] animate-in zoom-in-95 slide-in-from-top-4 duration-400 ease-out origin-top-right"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Premium */}
                        <div className="p-7 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
                                        <BellRing className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black tracking-tight leading-none">Equipo PT</h3>
                                        <p className="text-[9px] text-blue-300 mt-1.5 uppercase tracking-[0.2em] font-black opacity-80">Canal de Comunicación</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-[9px] font-black bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-all text-blue-200 hover:text-white uppercase tracking-wider border border-white/5 active:scale-95"
                                        >
                                            Marcar todo
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowFeed(false)}
                                        className="p-2.5 bg-white/5 hover:bg-white/20 rounded-xl transition-all text-slate-300 hover:text-white border border-white/10 active:scale-95"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="overflow-y-auto max-h-[520px] bg-[#F8FAFC]">
                            {feedItems.length === 0 ? (
                                <div className="p-16 text-center">
                                    <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50 border border-slate-50">
                                        <BellRing className="w-10 h-10 text-slate-200" />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-800 leading-tight">Sin avisos nuevos</h4>
                                    <p className="text-sm text-slate-400 mt-2 px-4 leading-relaxed font-medium italic">¡Estás al día con todas las novedades del equipo!</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100/60">
                                    {feedItems.map((item, idx) => {
                                        const style = getFeedItemStyle(item);
                                        let isUnread = false;
                                        let creatorName = 'Sistema';

                                        if (item.feedType === 'announcement') {
                                            isUnread = !readAnnouncementIds.has(item.id);
                                            creatorName = item.created_by;
                                        } else {
                                            isUnread = !item.read_at;
                                        }

                                        return (
                                            <div
                                                key={item.id}
                                                className={`group p-6 transition-all cursor-pointer hover:bg-white relative overflow-hidden ${isUnread ? 'bg-blue-50/20' : ''}`}
                                                onClick={() => markAsRead(item)}
                                                style={{ animationDelay: `${idx * 100}ms` }}
                                            >
                                                <div className="flex gap-5 relative z-10">
                                                    <div className={`p-3.5 rounded-2xl shrink-0 h-fit ${style.bg} ${style.text} shadow-lg shadow-current/5 group-hover:scale-110 transition-transform duration-500`}>
                                                        {style.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-2 gap-3">
                                                            <h4 className={`font-black text-[15px] leading-snug tracking-tight ${isUnread ? 'text-slate-900' : 'text-slate-500'}`}>
                                                                {item.title}
                                                            </h4>
                                                            {isUnread && (
                                                                <div className="shrink-0 w-2.5 h-2.5 bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.6)] animate-pulse mt-1" />
                                                            )}
                                                        </div>
                                                        <p className={`text-sm leading-relaxed mb-5 ${isUnread ? 'text-slate-600' : 'text-slate-400 font-medium'}`}>
                                                            {item.message}
                                                        </p>
                                                        <div className="flex items-center justify-between text-[10px] font-black text-slate-400 mt-4 pt-4 border-t border-slate-100/80">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 border border-slate-200/50">
                                                                    <UserIcon className="w-3.5 h-3.5" />
                                                                </div>
                                                                <span className="uppercase tracking-widest">{creatorName.split(' ')[0]}</span>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <span className="text-slate-400/80">
                                                                    {new Date(item.created_at).toLocaleDateString('es-ES', {
                                                                        day: 'numeric',
                                                                        month: 'short',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </span>
                                                                {!isUnread ? (
                                                                    <span className="flex items-center gap-1.5 text-emerald-600 font-black bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/50 uppercase tracking-tighter">
                                                                        <CheckCircle2 className="w-3 h-3" /> Leído
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-amber-600 font-black bg-amber-50 px-2.5 py-1 rounded-lg uppercase tracking-[0.1em] text-[8px] border border-amber-100/50">
                                                                        Nuevo
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {isUnread && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-r-full shadow-[0_0_15px_rgba(37,99,235,0.3)]" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer Premium */}
                        <div className="p-6 bg-white border-t border-slate-50 flex gap-3">
                            <button
                                onClick={() => {
                                    onNavigate?.('team-announcements');
                                    setShowFeed(false);
                                }}
                                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] hover:bg-black transition-all hover:shadow-2xl hover:shadow-slate-900/30 active:scale-95 flex items-center justify-center gap-3 group"
                            >
                                <span>Histórico del Equipo</span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showModal && modalAnnouncement && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        {(() => {
                            if (!modalAnnouncement) return null;
                            // Modal only for announcements, style reuse
                            const style = getFeedItemStyle({ ...modalAnnouncement, feedType: 'announcement' });
                            return (
                                <>
                                    <div className={`p-6 ${style.bg} ${style.text} border-b ${style.border}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white/50 rounded-xl">
                                                {style.icon}
                                            </div>
                                            <h3 className="text-xl font-bold">{modalAnnouncement.title}</h3>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                                            {modalAnnouncement.message}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                                        <button
                                            onClick={dismissModal}
                                            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-200"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                            Confirmar Lectura
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
