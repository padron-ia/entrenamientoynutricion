
import React, { useMemo, useState, useEffect } from 'react';
import { User, UserRole, Client } from '../types';
import { supabase } from '../services/supabaseClient';
import {
    MessageCircle, Star, Users, Award,
    TrendingUp, Eye, ThumbsUp, Share2,
    MessageSquare, Calendar, ChevronRight, Activity,
    Clock, CheckCircle2, AlertCircle, Sparkles,
    Instagram, Youtube, Facebook, Twitter, Plus, Trash2, Edit2, XCircle, Save
} from 'lucide-react';

interface RRSSDashboardProps {
    user: User;
    onNavigateToView: (view: string) => void;
    onNavigateToClient: (client: Client) => void;
}

const RRSSDashboard: React.FC<RRSSDashboardProps> = ({ user, onNavigateToView, onNavigateToClient }) => {
    const [testimonials, setTestimonials] = useState<any[]>([]);
    const [successCases, setSuccessCases] = useState<any[]>([]);
    const [channels, setChannels] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [snapshot, setSnapshot] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showChannelModal, setShowChannelModal] = useState(false);
    const [editingChannel, setEditingChannel] = useState<any>(null);
    const [channelForm, setChannelForm] = useState({ name: '', platform: 'instagram', followers_count: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: testData } = await supabase
                .from('testimonials')
                .select('*')
                .order('created_at', { ascending: false });

            const { data: casesData } = await supabase
                .from('success_cases')
                .select('*')
                .order('created_at', { ascending: false });

            const { data: channelsData } = await supabase
                .from('rrss_channels')
                .select('*')
                .order('followers_count', { ascending: false });

            const { data: historyData } = await supabase
                .from('rrss_metrics_history')
                .select('*')
                .order('snapshot_date', { ascending: false });

            const { data: snapshotData } = await supabase
                .from('business_snapshots')
                .select('*')
                .order('snapshot_date', { ascending: false })
                .limit(1)
                .maybeSingle();

            setTestimonials(testData || []);
            setSuccessCases(casesData || []);
            setChannels(channelsData || []);
            setHistory(historyData || []);
            setSnapshot(snapshotData);
        } catch (error) {
            console.error('Error fetching RRSS data:', error);
        } finally {
            setLoading(false);
        }
    };

    const metrics = useMemo(() => {
        const total = testimonials.length;
        const published = testimonials.filter(t => t.is_published);
        const publishedCount = published.length;
        const pending = total - publishedCount;

        // Real social metrics from published testimonials
        const totalLikes = published.reduce((sum, t) => sum + (t.likes_count || 0), 0);
        const totalViews = published.reduce((sum, t) => sum + (t.views_count || 0), 0);
        const totalComments = published.reduce((sum, t) => sum + (t.comments_count || 0), 0);
        const totalShares = published.reduce((sum, t) => sum + (t.shares_count || 0), 0);

        // Coach Ranking grouped by NAME to avoid duplicates if ID changes
        const coachCounts: Record<string, { count: number, name: string }> = {};
        testimonials.forEach(t => {
            const rawName = t.coach_name || 'Sin Asignar';
            const normalizedName = rawName.trim().toLowerCase();

            if (!coachCounts[normalizedName]) {
                coachCounts[normalizedName] = { count: 0, name: rawName.trim() };
            }
            coachCounts[normalizedName].count++;
        });

        const ranking = Object.values(coachCounts)
            .sort((a, b) => b.count - a.count);

        // Individual Testimonial Performance (Top Performers)
        const topTestimonials = [...published]
            .sort((a, b) => ((b.likes_count || 0) + (b.views_count || 0)) - ((a.likes_count || 0) + (a.views_count || 0)))
            .slice(0, 3);

        const formatNumber = (num: number) => {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
            return num.toString();
        };

        const totalFollowers = channels.reduce((sum, ch) => sum + (ch.followers_count || 0), 0);

        // Calculate growth trends per channel
        const channelsWithGrowth = channels.map(channel => {
            const channelHistory = history.filter(h => h.channel_id === channel.id);
            // Latest is at index 0, previous is index 1
            const previous = channelHistory.length > 1 ? channelHistory[1] : null;

            let growth = 0;
            if (previous) {
                growth = channel.followers_count - previous.followers_count;
            }

            return { ...channel, growth };
        });

        return {
            total,
            published: publishedCount,
            pending,
            successCasesCount: successCases.length,
            ranking,
            topTestimonials,
            totalFollowers,
            channels: channelsWithGrowth,
            marketing: snapshot ? {
                investment: snapshot.ad_investment || 0,
                leads: snapshot.leads_count || 0,
                cpl: snapshot.leads_count > 0 ? (snapshot.ad_investment / snapshot.leads_count).toFixed(2) : 0
            } : null,
            social: [
                { label: 'Likes', icon: ThumbsUp, value: formatNumber(totalLikes), color: 'text-blue-400' },
                { label: 'Visitas', icon: Eye, value: formatNumber(totalViews), color: 'text-purple-400' },
                { label: 'Comments', icon: MessageCircle, value: formatNumber(totalComments), color: 'text-amber-400' },
                { label: 'Shared', icon: Share2, value: formatNumber(totalShares), color: 'text-pink-400' },
            ]
        };
    }, [testimonials, successCases, channels, history]);

    const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }: any) => (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:scale-150 transition-transform ${colorClass.split(' ')[0]}`}></div>
            <div className="relative z-10 flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${colorClass}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h4 className="text-2xl font-black text-slate-800">{value}</h4>
                        {subtitle && <span className="text-[10px] text-slate-400 font-medium">{subtitle}</span>}
                    </div>
                </div>
            </div>
        </div>
    );

    const startEditChannel = (channel: any) => {
        setEditingChannel(channel);
        setChannelForm({
            name: channel.name,
            platform: channel.platform,
            followers_count: channel.followers_count
        });
        setShowChannelModal(true);
    };

    const handleSaveChannel = async () => {
        try {
            let channelId = editingChannel?.id;

            if (editingChannel) {
                const { error } = await supabase
                    .from('rrss_channels')
                    .update({
                        ...channelForm,
                        last_updated_at: new Date().toISOString()
                    })
                    .eq('id', channelId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('rrss_channels')
                    .insert([channelForm])
                    .select()
                    .single();
                if (error) throw error;
                channelId = data.id;
            }

            // Save snapshot to history for evolution tracking
            await supabase.from('rrss_metrics_history').upsert({
                channel_id: channelId,
                followers_count: channelForm.followers_count,
                snapshot_date: new Date().toISOString().split('T')[0]
            }, {
                onConflict: 'channel_id,snapshot_date'
            });

            setShowChannelModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving channel:', error);
        }
    };

    const deleteChannel = async (id: string) => {
        if (!window.confirm('¿Seguro que quieres eliminar este canal?')) return;
        try {
            const { error } = await supabase.from('rrss_channels').delete().eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error deleting channel:', error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        Gestión <span className="text-pink-600">RRSS</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Panel de control de prueba social y contenido.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-pink-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Modo Estratégico</span>
                    </div>
                </div>
            </div>

            {/* METRICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Testimonios"
                    value={metrics.total}
                    icon={MessageSquare}
                    colorClass="bg-pink-100 text-pink-600"
                    subtitle={`${metrics.published} publicados`}
                />
                <StatCard
                    title="Pendientes"
                    value={metrics.pending}
                    icon={Clock}
                    colorClass="bg-amber-100 text-amber-600"
                />
                <StatCard
                    title="Casos de Éxito"
                    value={metrics.successCasesCount}
                    icon={Sparkles}
                    colorClass="bg-purple-100 text-purple-600"
                />
                <StatCard
                    title="Nivel Impacto"
                    value="ALTO"
                    icon={Award}
                    colorClass="bg-blue-100 text-blue-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* COACH RANKING */}
                <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Award className="w-6 h-6 text-amber-500" />
                            Ranking de Coaches
                        </h3>
                    </div>
                    <div className="space-y-6">
                        {metrics.ranking.map((coach, idx) => (
                            <div key={coach.name} className="flex items-center gap-4 group">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${idx === 0 ? 'bg-amber-100 text-amber-600 scale-110' :
                                    idx === 1 ? 'bg-slate-100 text-slate-600' :
                                        'bg-slate-50 text-slate-400'
                                    }`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="font-bold text-slate-800 text-sm">{coach.name}</span>
                                        <span className="text-xs font-black text-slate-600">{coach.count} aportados</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-pink-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${(coach.count / (metrics.total || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {metrics.ranking.length === 0 && (
                            <p className="text-slate-400 italic text-sm text-center py-10">No hay datos de testimonios aún.</p>
                        )}
                    </div>
                </div>

                {/* GLOBAL GROWTH & CHANNELS */}
                <div className="lg:col-span-2 space-y-8">
                    {/* SOCIAL METRICS TOTALS */}
                    <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-1000"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black flex items-center gap-2">
                                    <TrendingUp className="w-6 h-6 text-pink-400" />
                                    Impacto Global
                                </h3>
                                <div className="flex gap-4">
                                    {metrics.marketing && (
                                        <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                                            <div className="text-right">
                                                <p className="text-[8px] text-slate-400 font-bold uppercase">Inversión Ads</p>
                                                <p className="text-xs font-black text-pink-400">{metrics.marketing.investment.toLocaleString()} €</p>
                                            </div>
                                            <div className="w-px h-6 bg-white/10"></div>
                                            <div className="text-right">
                                                <p className="text-[8px] text-slate-400 font-bold uppercase">CPL</p>
                                                <p className="text-xs font-black text-emerald-400">{metrics.marketing.cpl} €</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Seguidores:</span>
                                        <span className="text-sm font-black text-pink-400">{metrics.totalFollowers.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                {metrics.social.map((m, i) => (
                                    <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-3xl hover:bg-white/10 transition-all flex flex-col items-center justify-center text-center">
                                        <m.icon className={`w-6 h-6 mb-2 ${m.color}`} />
                                        <p className="text-xl font-black text-white">{m.value}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CHANNEL MANAGEMENT */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Crecimiento RRSS</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestión de canales y evolución</p>
                            </div>
                            <button
                                onClick={() => { setEditingChannel(null); setChannelForm({ name: '', platform: 'instagram', followers_count: 0 }); setShowChannelModal(true); }}
                                className="p-2 bg-pink-50 text-pink-600 rounded-xl hover:bg-pink-600 hover:text-white transition-all shadow-sm"
                                title="Añadir Red Social"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {metrics.channels.map(channel => (
                                <div key={channel.id} className="p-4 bg-slate-50 rounded-3xl border border-transparent hover:border-pink-200 transition-all group/card relative">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm text-pink-500">
                                            {channel.platform === 'instagram' ? <Instagram size={20} /> :
                                                channel.platform === 'tiktok' ? <Activity size={20} /> :
                                                    channel.platform === 'youtube' ? <Youtube size={20} /> :
                                                        channel.platform === 'facebook' ? <Facebook size={20} /> :
                                                            <TrendingUp size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-slate-800 truncate">{channel.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{channel.platform}</p>
                                                {channel.growth !== 0 && (
                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 ${channel.growth > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                        {channel.growth > 0 ? '+' : ''}{channel.growth.toLocaleString()}
                                                        <TrendingUp size={10} className={channel.growth < 0 ? 'rotate-180' : ''} />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-800">{channel.followers_count.toLocaleString()}</p>
                                            <p className="text-[10px] font-bold text-emerald-500">FOLLOWERS</p>
                                        </div>
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                        <button onClick={() => startEditChannel(channel)} className="p-1.5 bg-white text-slate-400 hover:text-blue-500 rounded-lg shadow-sm border border-slate-100"><Edit2 size={12} /></button>
                                        <button onClick={() => deleteChannel(channel.id)} className="p-1.5 bg-white text-slate-400 hover:text-red-500 rounded-lg shadow-sm border border-slate-100"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            ))}
                            {channels.length === 0 && (
                                <div className="col-span-2 py-10 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">No has configurado redes sociales aún</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* TOP PERFORMERS SPOTLIGHT */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-amber-500" />
                                    Testimonios Estrella
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Contenido con mayor rendimiento</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {metrics.topTestimonials.map((t, i) => (
                                <div key={t.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl hover:bg-pink-50 transition-colors cursor-pointer group/star" onClick={() => onNavigateToView('testimonials')}>
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-lg text-slate-800 shadow-sm group-hover/star:scale-110 transition-transform">
                                        {i === 0 ? '🏆' : i === 1 ? '🥈' : '🥉'}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-black text-slate-800">{t.client_name} {t.client_surname}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{t.coach_name}</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <p className="text-xs font-black text-slate-800">{(t.views_count || 0).toLocaleString()}</p>
                                            <p className="text-[8px] font-bold text-purple-500 uppercase">Visitas</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-black text-slate-800">{(t.likes_count || 0).toLocaleString()}</p>
                                            <p className="text-[8px] font-bold text-blue-500 uppercase">Likes</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {metrics.topTestimonials.length === 0 && (
                                <p className="text-slate-400 italic text-sm text-center py-10">Publica testimonios para ver el ranking</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CHANNEL MODAL */}
            {showChannelModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">{editingChannel ? 'Editar Red' : 'Añadir Red'}</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configuración de Canal</p>
                            </div>
                            <button onClick={() => setShowChannelModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="space-y-4 text-slate-700">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nombre de la Cuenta</label>
                                <input
                                    type="text"
                                    value={channelForm.name}
                                    onChange={e => setChannelForm({ ...channelForm, name: e.target.value })}
                                    placeholder="Ej: Academia Diabete Instagram"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Plataforma</label>
                                    <select
                                        value={channelForm.platform}
                                        onChange={e => setChannelForm({ ...channelForm, platform: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all appearance-none"
                                    >
                                        <option value="instagram">Instagram</option>
                                        <option value="tiktok">TikTok</option>
                                        <option value="youtube">YouTube</option>
                                        <option value="facebook">Facebook</option>
                                        <option value="twitter">X / Twitter</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Seguidores</label>
                                    <input
                                        type="number"
                                        value={channelForm.followers_count}
                                        onChange={e => setChannelForm({ ...channelForm, followers_count: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => setShowChannelModal(false)}
                                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-400 font-bold py-3 rounded-2xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveChannel}
                                className="flex-[2] bg-pink-600 hover:bg-pink-700 text-white font-black py-3 rounded-2xl shadow-lg shadow-pink-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                {editingChannel ? 'Guardar Cambios' : 'Crear Canal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RECENT TESTIMONIALS */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">Testimonios Recientes</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Cola de publicación y revisión</p>
                    </div>
                    <button
                        onClick={() => onNavigateToView('testimonials')}
                        className="flex items-center gap-2 text-pink-600 font-black text-xs hover:gap-3 transition-all uppercase tracking-widest px-4 py-2 hover:bg-pink-50 rounded-xl"
                    >
                        Ver catálogo completo <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white border-b text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-4">Fecha</th>
                                <th className="px-8 py-4">Cliente</th>
                                <th className="px-8 py-4">Coach</th>
                                <th className="px-8 py-4">Estado</th>
                                <th className="px-8 py-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400">Analizando datos...</td></tr>
                            ) : testimonials.slice(0, 5).map((t, idx) => (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700">{new Date(t.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                                            <span className="text-[10px] text-slate-400">{new Date(t.created_at).getFullYear()}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="font-black text-slate-800">{t.client_name} {t.client_surname}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-bold text-slate-500">{t.coach_name}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        {t.is_published ? (
                                            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-full">
                                                <CheckCircle2 className="w-3 h-3" /> Publicado
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-amber-600 font-black text-[10px] uppercase tracking-wider bg-amber-50 px-3 py-1.5 rounded-full">
                                                <Clock className="w-3 h-3 animate-pulse" /> Pendiente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => onNavigateToView('testimonials')}
                                            className="bg-white border-2 border-slate-100 hover:border-pink-500 hover:text-pink-600 text-slate-400 w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {testimonials.length === 0 && !loading && (
                                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium">Empieza por pedir testimonios a tus mejores clientes.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RRSSDashboard;
