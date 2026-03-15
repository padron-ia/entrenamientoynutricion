import React, { useState, useEffect } from 'react';
import { User, Client } from '../types';
import { supabase } from '../services/supabaseClient';
import {
    Video, Type, Mic, Image as ImageIcon,
    Send, Calendar, Link as LinkIcon,
    CheckCircle2, MessageSquare, Plus, ExternalLink, Clock,
    Eye, Heart, MessageCircle, Share2, TrendingUp,
    Sparkles, ChevronRight, Loader2, RefreshCw,
    FileCheck, X, User as UserIcon
} from 'lucide-react';

interface Testimonial {
    id: string;
    created_at: string;
    coach_id: string;
    coach_name: string;
    client_name: string;
    client_surname: string;
    client_phone: string;
    testimonial_type: 'video' | 'text' | 'audio' | 'image';
    media_url: string;
    notes: string;
    status: string;
    is_published: boolean;
    published_at: string | null;
    notion_page_id?: string;
    notion_status?: string;
    // Social metrics
    likes_count?: number;
    views_count?: number;
    comments_count?: number;
    shares_count?: number;
}


interface ClientTestimonialManagerProps {
    client: Client;
    currentUser: User;
}

export function ClientTestimonialManager({ client, currentUser }: ClientTestimonialManagerProps) {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        testimonial_type: 'video' as 'video' | 'image' | 'text' | 'audio',
        media_url: '',
        notes: ''
    });

    useEffect(() => {
        fetchData();
    }, [client.id]);

    const fetchData = async () => {
        setLoading(true);
        await fetchTestimonials();
        setLoading(false);
    };

    const fetchTestimonials = async () => {
        try {
            // Try by phone first
            let { data, error } = await supabase
                .from('testimonials')
                .select('*')
                .eq('client_phone', client.phone || '')
                .order('created_at', { ascending: false });

            // If no results by phone, try by name and surname
            if (!data || data.length === 0) {
                const { data: dataByName } = await supabase
                    .from('testimonials')
                    .select('*')
                    .eq('client_name', client.firstName)
                    .eq('client_surname', client.surname)
                    .order('created_at', { ascending: false });

                if (dataByName) setTestimonials(dataByName as Testimonial[]);
            } else {
                setTestimonials(data as Testimonial[]);
            }
        } catch (err) {
            console.error("Error fetching testimonials:", err);
        }
    };

    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { data: insertedData, error } = await supabase.from('testimonials').insert({
                coach_id: currentUser.id,
                coach_name: currentUser.name,
                client_name: client.firstName,
                client_surname: client.surname,
                client_phone: client.phone || '',
                testimonial_type: formData.testimonial_type,
                media_url: formData.media_url,
                notes: formData.notes
            }).select().single();

            if (error) throw error;

            // Trigger Notion & Slack Automation
            try {
                await supabase.functions.invoke('notion-testimonials', {
                    body: {
                        clientName: `${client.firstName} ${client.surname}`,
                        coachName: currentUser.name,
                        mediaUrl: formData.media_url,
                        type: formData.testimonial_type,
                        notes: formData.notes
                    }
                });
            } catch (edgeError) {
                console.error("Notion automation error:", edgeError);
            }

            alert('✅ Testimonio registrado correctamente y enviado a RRSS.');
            setIsAdding(false);
            setFormData({ testimonial_type: 'video', media_url: '', notes: '' });
            fetchTestimonials();

        } catch (error: any) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const syncNotionStatus = async () => {
        setSyncing(true);
        try {
            const pageIds = testimonials
                .filter(t => t.notion_page_id)
                .map(t => ({ id: t.id, pageId: t.notion_page_id }));

            const searchCandidates = testimonials
                .filter(t => !t.notion_page_id)
                .map(t => ({ id: t.id, clientName: `${t.client_name} ${t.client_surname}` }));

            if (pageIds.length === 0 && searchCandidates.length === 0) {
                alert('No hay testimonios para sincronizar');
                setSyncing(false);
                return;
            }

            const { data, error } = await supabase.functions.invoke('check-notion-status', {
                body: { pageIds, searchCandidates }
            });

            if (error) throw error;

            // Update local state with new statuses
            if (data?.updates) {
                for (const update of data.updates) {
                    await supabase
                        .from('testimonials')
                        .update({
                            notion_page_id: update.notion_page_id,
                            notion_status: update.notion_status
                        })
                        .eq('id', update.id);
                }
            }

            await fetchTestimonials();
            alert('✅ Estados sincronizados correctamente');
        } catch (err: any) {
            console.error("Sync error:", err);
            alert('Error al sincronizar: ' + err.message);
        } finally {
            setSyncing(false);
        }
    };

    const getIconByType = (type: string) => {
        switch (type) {
            case 'video': return <Video size={18} className="text-purple-600" />;
            case 'audio': return <Mic size={18} className="text-blue-600" />;
            case 'image': return <ImageIcon size={18} className="text-pink-600" />;
            default: return <Type size={18} className="text-slate-600" />;
        }
    };

    const getStatusBadge = (t: Testimonial) => {
        if (t.is_published) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm">
                    <CheckCircle2 className="w-3 h-3" /> Publicado
                </span>
            );
        }

        const statusColors: Record<string, string> = {
            'Revision': 'bg-amber-100 text-amber-700 border-amber-200',
            'En Proceso': 'bg-blue-100 text-blue-700 border-blue-200',
            'Completado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        };

        const status = t.notion_status || 'Pendiente';
        const colorClass = statusColors[status] || 'bg-slate-100 text-slate-600 border-slate-200';

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${colorClass}`}>
                <Clock className="w-3 h-3" /> {status}
            </span>
        );
    };

    
    const totalMetrics = testimonials
        .filter(t => t.is_published)
        .reduce((acc, t) => ({
            likes: acc.likes + (t.likes_count || 0),
            views: acc.views + (t.views_count || 0),
            comments: acc.comments + (t.comments_count || 0),
            shares: acc.shares + (t.shares_count || 0)
        }), { likes: 0, views: 0, comments: 0, shares: 0 });

    const hasMetrics = totalMetrics.likes > 0 || totalMetrics.views > 0;
    const publishedCount = testimonials.filter(t => t.is_published).length;

    return (
        <div className="space-y-6">
            {/* Header Premium */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 shadow-sm">
                        <MessageSquare className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                            Testimonios
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                            {testimonials.length} testimonio{testimonials.length !== 1 ? 's' : ''} registrado{testimonials.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={syncNotionStatus}
                        disabled={syncing}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                        title="Sincronizar con Notion"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    </button>
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all text-xs font-bold shadow-md shadow-pink-200"
                        >
                            <Plus className="w-3.5 h-3.5" /> Nuevo Testimonio
                        </button>
                    )}
                </div>
            </div>

            {/* Metrics Summary (if published) */}
            {publishedCount > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 rounded-2xl p-4 border border-indigo-100/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                            Rendimiento en RRSS ({publishedCount} publicados)
                        </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        <div className="bg-white/80 rounded-xl p-3 text-center border border-indigo-100/50">
                            <Eye className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                            <p className="text-lg font-bold text-slate-800">{totalMetrics.views.toLocaleString()}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-bold">Vistas</p>
                        </div>
                        <div className="bg-white/80 rounded-xl p-3 text-center border border-indigo-100/50">
                            <Heart className="w-4 h-4 text-red-500 mx-auto mb-1" />
                            <p className="text-lg font-bold text-slate-800">{totalMetrics.likes.toLocaleString()}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-bold">Likes</p>
                        </div>
                        <div className="bg-white/80 rounded-xl p-3 text-center border border-indigo-100/50">
                            <MessageCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
                            <p className="text-lg font-bold text-slate-800">{totalMetrics.comments.toLocaleString()}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-bold">Comentarios</p>
                        </div>
                        <div className="bg-white/80 rounded-xl p-3 text-center border border-indigo-100/50">
                            <Share2 className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                            <p className="text-lg font-bold text-slate-800">{totalMetrics.shares.toLocaleString()}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-bold">Compartidos</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Add New Form */}
            {isAdding && (
                <div className="bg-gradient-to-br from-slate-50 to-pink-50/30 p-5 rounded-2xl border border-slate-200/80 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-pink-500" /> Registrar Nuevo Material
                        </span>
                        <button onClick={() => setIsAdding(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Material</label>
                                <div className="flex gap-2 mt-2">
                                    {[
                                        { id: 'video', label: 'Vídeo', icon: Video, color: 'purple' },
                                        { id: 'image', label: 'Foto', icon: ImageIcon, color: 'pink' },
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, testimonial_type: type.id as any })}
                                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${formData.testimonial_type === type.id
                                                ? `bg-${type.color}-500 text-white border-${type.color}-500 shadow-lg shadow-${type.color}-200`
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <type.icon size={16} />
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Enlace Drive/Dropbox</label>
                                <div className="relative mt-2">
                                    <LinkIcon className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                                    <input
                                        required
                                        type="url"
                                        placeholder="https://drive.google.com/..."
                                        className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 bg-white transition-all"
                                        value={formData.media_url}
                                        onChange={e => setFormData({ ...formData, media_url: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notas para el equipo RRSS</label>
                            <textarea
                                className="w-full mt-2 px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 bg-white transition-all"
                                rows={3}
                                placeholder="Indica contexto, frases clave del cliente, o instrucciones de edición..."
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-pink-200 hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-50"
                            >
                                {submitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                                ) : (
                                    <><Send className="w-4 h-4" /> Enviar a RRSS</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-pink-500 mx-auto mb-2" />
                    <p className="text-slate-400 text-xs">Cargando...</p>
                </div>
            ) : (
                testimonials.length === 0 ? (
                    <div className="text-center py-12 bg-gradient-to-br from-slate-50 to-pink-50/30 rounded-2xl border border-dashed border-slate-200">
                        <Video className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm font-medium">No hay testimonios registrados</p>
                        <p className="text-slate-400 text-xs mt-1">Añade el primer testimonio de este cliente</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {testimonials.map(t => (
                            <div
                                key={t.id}
                                className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md ${expandedId === t.id ? 'border-pink-200 shadow-md' : 'border-slate-200'
                                    }`}
                            >
                                {/* Main Row */}
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${t.is_published
                                            ? 'bg-gradient-to-br from-emerald-100 to-green-100'
                                            : 'bg-gradient-to-br from-slate-100 to-slate-50'
                                            }`}>
                                            {getIconByType(t.testimonial_type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-800 capitalize">
                                                    {t.testimonial_type}
                                                </span>
                                                {getStatusBadge(t)}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(t.created_at).toLocaleDateString('es-ES')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <UserIcon className="w-3 h-3" />
                                                    {t.coach_name}
                                                </span>
                                                {t.is_published && t.published_at && (
                                                    <span className="flex items-center gap-1 text-emerald-600">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Publicado {new Date(t.published_at).toLocaleDateString('es-ES')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Mini Metrics */}
                                        {t.is_published && (t.views_count || t.likes_count) && (
                                            <div className="hidden md:flex items-center gap-3 text-slate-400 text-xs">
                                                {t.views_count ? (
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="w-3.5 h-3.5" /> {t.views_count}
                                                    </span>
                                                ) : null}
                                                {t.likes_count ? (
                                                    <span className="flex items-center gap-1">
                                                        <Heart className="w-3.5 h-3.5" /> {t.likes_count}
                                                    </span>
                                                ) : null}
                                            </div>
                                        )}
                                        <a
                                            href={t.media_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Ver Material"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expandedId === t.id ? 'rotate-90' : ''}`} />
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedId === t.id && (
                                    <div className="border-t border-slate-100 p-4 bg-slate-50/50 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Notes */}
                                            {t.notes && (
                                                <div className="bg-white p-4 rounded-xl border border-slate-100">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Notas para RRSS</p>
                                                    <p className="text-sm text-slate-700 leading-relaxed">{t.notes}</p>
                                                </div>
                                            )}

                                            {/* Metrics if published */}
                                            {t.is_published && (
                                                <div className="bg-white p-4 rounded-xl border border-slate-100">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Métricas Sociales</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Eye className="w-4 h-4 text-blue-500" />
                                                            <span className="font-bold text-slate-800">{(t.views_count || 0).toLocaleString()}</span>
                                                            <span className="text-slate-400">vistas</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Heart className="w-4 h-4 text-red-500" />
                                                            <span className="font-bold text-slate-800">{(t.likes_count || 0).toLocaleString()}</span>
                                                            <span className="text-slate-400">likes</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <MessageCircle className="w-4 h-4 text-green-500" />
                                                            <span className="font-bold text-slate-800">{(t.comments_count || 0).toLocaleString()}</span>
                                                            <span className="text-slate-400">comentarios</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Share2 className="w-4 h-4 text-purple-500" />
                                                            <span className="font-bold text-slate-800">{(t.shares_count || 0).toLocaleString()}</span>
                                                            <span className="text-slate-400">compartidos</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Workflow Status */}
                                            <div className={`bg-white p-4 rounded-xl border border-slate-100 ${!t.notes && !t.is_published ? 'md:col-span-2' : ''}`}>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Estado del Workflow</p>
                                                <div className="flex items-center gap-2">
                                                    {/* Workflow steps */}
                                                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${t.notion_status === 'Revision' || !t.notion_status
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-slate-100 text-slate-400'
                                                        }`}>
                                                        <FileCheck className="w-3 h-3" /> Revisión
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${t.notion_status === 'En Proceso'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-slate-100 text-slate-400'
                                                        }`}>
                                                        <Clock className="w-3 h-3" /> En Proceso
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${t.is_published
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-400'
                                                        }`}>
                                                        <CheckCircle2 className="w-3 h-3" /> Publicado
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
