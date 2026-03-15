import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import {
    MessageCircle, Video, Type, Mic, Image as ImageIcon,
    Send, Calendar, User as UserIcon, Phone, Link as LinkIcon, FileText,
    CheckCircle2, Clock, MessageSquare, X, Save,
    ThumbsUp, Eye, Share2, Trash2
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
    likes_count?: number;
    views_count?: number;
    comments_count?: number;
    shares_count?: number;
    notion_page_id?: string;
    notion_status?: string;
}

interface TestimonialsManagerProps {
    currentUser: User;
    onNavigate?: (view: string) => void;
}

export function TestimonialsManager({ currentUser, onNavigate }: TestimonialsManagerProps) {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNotes, setEditNotes] = useState('');
    const [editPublishedAt, setEditPublishedAt] = useState('');
    const [editMetrics, setEditMetrics] = useState({
        likes_count: 0,
        views_count: 0,
        comments_count: 0,
        shares_count: 0
    });

    // Form State
    const [formData, setFormData] = useState({
        client_name: '',
        client_surname: '',
        client_phone: '',
        testimonial_type: 'video' as const,
        media_url: '',
        notes: ''
    });

    const isRRSS = currentUser.role === UserRole.RRSS;
    const isCoach = currentUser.role === UserRole.COACH;
    const canSeeAllTestimonials = [UserRole.ADMIN, UserRole.RRSS, UserRole.HEAD_COACH, UserRole.DIRECCION].includes(currentUser.role);
    const isRRSSorAdmin = [UserRole.ADMIN, UserRole.RRSS].includes(currentUser.role);

    useEffect(() => {
        fetchTestimonials();
    }, [currentUser]);

    const fetchTestimonials = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('testimonials')
                .select('*')
                .order('created_at', { ascending: false });

            // Solo admin, head_coach, rrss, dirección ven todos. Coaches solo los suyos.
            if (!canSeeAllTestimonials) {
                query = query.eq('coach_id', currentUser.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            setTestimonials((data || []).map(t => ({
                ...t,
                is_published: t.is_published ?? false,
                published_at: t.published_at ?? null
            })) as Testimonial[]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const refreshNotionStatuses = async () => {
        const connectedTestimonials = testimonials.filter(t => t.notion_page_id);
        const disconnectedTestimonials = testimonials.filter(t => !t.notion_page_id);

        if (connectedTestimonials.length === 0 && disconnectedTestimonials.length === 0) {
            alert("No hay testimonios para verificar.");
            return;
        }

        const confirmUpdate = window.confirm(
            `Resumen de Sincronización:\n\n` +
            `• Verificando estado: ${connectedTestimonials.length} testimonios\n` +
            `• Buscando enlace: ${disconnectedTestimonials.length} testimonios sin conexión\n\n` +
            `¿Continuar?`
        );
        if (!confirmUpdate) return;

        setLoading(true);
        try {
            const pageIds = connectedTestimonials.map(t => t.notion_page_id);
            const searchCandidates = disconnectedTestimonials.map(t => ({
                id: t.id,
                clientName: `${t.client_name} ${t.client_surname}`.trim()
            }));

            const { data, error } = await supabase.functions.invoke('check-notion-status', {
                body: { pageIds, searchCandidates }
            });

            if (error) throw error;

            let linkedCount = 0;

            // 1. Update Statuses for Connected Testimonials
            if (data.statuses) {
                setTestimonials(prev => prev.map(t => {
                    const newStatus = data.statuses[t.notion_page_id || ''];
                    return newStatus ? { ...t, notion_status: newStatus } : t;
                }));

                for (const [pageId, status] of Object.entries(data.statuses)) {
                    await supabase.from('testimonials')
                        .update({ notion_status: status })
                        .eq('notion_page_id', pageId);
                }
            }

            // 2. Link Found Testimonials
            if (data.foundLinks) {
                const updates = Object.entries(data.foundLinks);
                linkedCount = updates.length;

                for (const [crmId, info] of updates) {
                    const typedInfo = info as { pageId: string, status: string };

                    // Update DB
                    await supabase.from('testimonials')
                        .update({
                            notion_page_id: typedInfo.pageId,
                            notion_status: typedInfo.status
                        })
                        .eq('id', crmId);

                    // Update Local State
                    setTestimonials(prev => prev.map(t =>
                        t.id === crmId
                            ? { ...t, notion_page_id: typedInfo.pageId, notion_status: typedInfo.status }
                            : t
                    ));
                }
            }

            alert(`✅ Sincronización completada.\n\n• Estados actualizados: ${Object.keys(data.statuses || {}).length}\n• Nuevos enlaces encontrados: ${linkedCount}`);

        } catch (error: any) {
            console.error("Error checking Notion status:", error);
            alert("Error al verificar estados: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const [schedulingInfo, setSchedulingInfo] = useState<{ date: string; loading: boolean } | null>(null);

    // Sugerir la próxima fecha de Notion al abrir el formulario o cambiar datos
    useEffect(() => {
        calculateNextNotionDate();
    }, []);

    const calculateNextNotionDate = () => {
        let target = new Date();
        target.setDate(target.getDate() + 1);
        while (target.getDay() !== 0 && target.getDay() !== 3) {
            target.setDate(target.getDate() + 1);
        }
        setSchedulingInfo({ date: target.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }), loading: false });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const confirmSchedule = window.confirm(`📅 El testimonio se programará en Notion para el próximo: ${schedulingInfo?.date}.\n\n¿Estás de acuerdo?`);
        if (!confirmSchedule) return;

        setSubmitting(true);
        try {
            // 1. Insert in Supabase and GET THE ID
            const { data: insertedData, error } = await supabase.from('testimonials').insert({
                coach_id: currentUser.id,
                coach_name: currentUser.name,
                client_name: formData.client_name,
                client_surname: formData.client_surname,
                client_phone: formData.client_phone,
                testimonial_type: formData.testimonial_type,
                media_url: formData.media_url,
                notes: formData.notes
            }).select().single();

            if (error) throw error;
            const newTestimonialId = insertedData.id;

            // Trigger Notion & Slack Automation via Edge Function with RETRIES
            let notionSuccess = false;
            let notionError = null;
            const maxRetries = 3;
            let notionPageId = null;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`Intento ${attempt}/${maxRetries} de automatización Notion/Slack...`);
                    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('notion-testimonials', {
                        body: {
                            clientName: `${formData.client_name} ${formData.client_surname}`,
                            coachName: currentUser.name,
                            mediaUrl: formData.media_url,
                            type: formData.testimonial_type,
                            notes: formData.notes
                        }
                    });

                    if (edgeError) {
                        console.error(`Intento ${attempt} falló:`, edgeError);
                        notionError = edgeError;
                        if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 1000));
                    } else if (edgeData?.success) {
                        console.log("✅ Automatización completada:", edgeData);
                        notionSuccess = true;
                        notionPageId = edgeData.notionPageId;
                        break; // Success
                    } else {
                        console.warn("Respuesta inesperada:", edgeData);
                        notionError = edgeData?.error || 'Respuesta inesperada';
                        if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (err: any) {
                    console.error(`Intento ${attempt} error:`, err);
                    notionError = err.message;
                    if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // 2. If Notion success, update Supabase record with Notion Page ID
            if (notionSuccess && notionPageId) {
                await supabase.from('testimonials')
                    .update({ notion_page_id: notionPageId, notion_status: 'Revision' }) // Default status
                    .eq('id', newTestimonialId);
            }

            // Show appropriate message based on result
            if (notionSuccess) {
                alert('✅ Testimonio registrado y agendado en Notion correctamente.\n\n📣 Mario Segura ha sido notificado por Slack.');
            } else {
                alert(`⚠️ Testimonio guardado en el CRM, pero hubo un problema al sincronizar con Notion/Slack.\n\nError: ${notionError || 'Desconocido'}\n\nContacta con soporte técnico si el problema persiste.`);
            }

            setFormData({
                client_name: '',
                client_surname: '',
                client_phone: '',
                testimonial_type: 'video',
                media_url: '',
                notes: ''
            });
            fetchTestimonials();

        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const togglePublished = async (testimonial: Testimonial) => {
        const newIsPublished = !testimonial.is_published;
        const newPublishedAt = newIsPublished ? new Date().toISOString() : null;

        try {
            const { error } = await supabase
                .from('testimonials')
                .update({
                    is_published: newIsPublished,
                    published_at: newPublishedAt
                })
                .eq('id', testimonial.id);

            if (error) throw error;

            setTestimonials(prev => prev.map(t =>
                t.id === testimonial.id
                    ? { ...t, is_published: newIsPublished, published_at: newPublishedAt }
                    : t
            ));
        } catch (error: any) {
            alert('Error al actualizar: ' + error.message);
        }
    };

    const [editType, setEditType] = useState<Testimonial['testimonial_type']>('video');
    const [editMediaUrl, setEditMediaUrl] = useState('');
    const [editClientName, setEditClientName] = useState('');
    const [editClientSurname, setEditClientSurname] = useState('');
    const [editClientPhone, setEditClientPhone] = useState('');

    const startEditing = (testimonial: Testimonial) => {
        setEditingId(testimonial.id);
        setEditNotes(testimonial.notes || '');
        setEditPublishedAt(testimonial.published_at ? testimonial.published_at.split('T')[0] : '');
        setEditMetrics({
            likes_count: testimonial.likes_count || 0,
            views_count: testimonial.views_count || 0,
            comments_count: testimonial.comments_count || 0,
            shares_count: testimonial.shares_count || 0
        });
        setEditType(testimonial.testimonial_type);
        setEditMediaUrl(testimonial.media_url || '');
        setEditClientName(testimonial.client_name || '');
        setEditClientSurname(testimonial.client_surname || '');
        setEditClientPhone(testimonial.client_phone || '');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditNotes('');
        setEditPublishedAt('');
    };

    const saveEditing = async (testimonialId: string) => {
        try {
            const updateData: any = {
                notes: editNotes,
                likes_count: editMetrics.likes_count,
                views_count: editMetrics.views_count,
                comments_count: editMetrics.comments_count,
                shares_count: editMetrics.shares_count,
                testimonial_type: editType,
                media_url: editMediaUrl,
                client_name: editClientName,
                client_surname: editClientSurname,
                client_phone: editClientPhone
            };

            if (editPublishedAt) {
                updateData.published_at = new Date(editPublishedAt).toISOString();
                updateData.is_published = true;
            }

            const { error } = await supabase
                .from('testimonials')
                .update(updateData)
                .eq('id', testimonialId);

            if (error) throw error;

            setTestimonials(prev => prev.map(t =>
                t.id === testimonialId
                    ? {
                        ...t,
                        notes: editNotes,
                        published_at: editPublishedAt ? new Date(editPublishedAt).toISOString() : t.published_at,
                        is_published: editPublishedAt ? true : t.is_published,
                        likes_count: editMetrics.likes_count,
                        views_count: editMetrics.views_count,
                        comments_count: editMetrics.comments_count,
                        shares_count: editMetrics.shares_count,
                        testimonial_type: editType,
                        media_url: editMediaUrl,
                        client_name: editClientName,
                        client_surname: editClientSurname,
                        client_phone: editClientPhone
                    }
                    : t
            ));

            setEditingId(null);
            setEditNotes('');
            setEditPublishedAt('');
        } catch (error: any) {
            alert('Error al guardar: ' + error.message);
        }
    };

    const handleDelete = async (testimonialId: string) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este testimonio permanentemente? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('testimonials')
                .delete()
                .eq('id', testimonialId);

            if (error) throw error;

            setTestimonials(prev => prev.filter(t => t.id !== testimonialId));
        } catch (error: any) {
            alert('Error al eliminar: ' + error.message);
        }
    };

    const handleOpenChat = (coachId: string, coachName: string) => {
        // Guardar el destinatario en localStorage para que ChatView lo recoja
        localStorage.setItem('chat_open_with', JSON.stringify({ id: coachId, name: coachName }));

        if (onNavigate) {
            onNavigate('chat');
        }
    };

    const getIconByType = (type: string) => {
        switch (type) {
            case 'video': return <Video size={16} className="text-purple-600" />;
            case 'audio': return <Mic size={16} className="text-blue-600" />;
            case 'image': return <ImageIcon size={16} className="text-pink-600" />;
            default: return <Type size={16} className="text-slate-600" />;
        }
    };

    const canModify = (testimonial: Testimonial) => {
        return isRRSSorAdmin || testimonial.coach_id === currentUser.id;
    };

    return (
        <div className="space-y-8">

            {/* HEADER */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <MessageCircle className="text-pink-600" />
                    {isRRSS ? 'Gestión de Testimonios' : 'Registro de Testimonios'}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    {isRRSS
                        ? 'Revisa, publica y gestiona el material subido por el equipo de coaches.'
                        : isRRSSorAdmin
                            ? 'Gestiona y descarga el material subido por el equipo.'
                            : 'Sube aquí los testimonios tras grabar con tus clientes.'}
                </p>
            </div>
            {isRRSSorAdmin && (
                <div className="flex justify-end -mt-6 mb-2">
                    <button
                        onClick={refreshNotionStatuses}
                        disabled={loading}
                        className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                        <Clock size={14} className={loading ? 'animate-spin' : ''} />
                        Sincronizar Estados Notion
                    </button>
                </div>
            )}


            {/* FORMULARIO DE SUBIDA (Oculto para RRSS) */}
            {
                !isRRSS && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Send size={20} className="text-blue-600" />
                            Nuevo Testimonio
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre Cliente</label>
                                    <div className="relative mt-1">
                                        <UserIcon className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                                        <input
                                            required
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors"
                                            placeholder="Ej. Elena"
                                            value={formData.client_name}
                                            onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Apellidos</label>
                                    <input
                                        required
                                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors"
                                        placeholder="Ej. Nebreda"
                                        value={formData.client_surname}
                                        onChange={e => setFormData({ ...formData, client_surname: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                                    <div className="relative mt-1">
                                        <Phone className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                                        <input
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors"
                                            placeholder="+34 600..."
                                            value={formData.client_phone}
                                            onChange={e => setFormData({ ...formData, client_phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                                    <div className="flex gap-4 mt-2">
                                        {[
                                            { id: 'video', label: 'Vídeo', icon: Video },
                                            { id: 'image', label: 'Foto', icon: ImageIcon },
                                            { id: 'text', label: 'Texto', icon: Type },
                                            { id: 'audio', label: 'Audio', icon: Mic },
                                        ].map(type => (
                                            <label key={type.id} className={`
                                flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all
                                ${formData.testimonial_type === type.id
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                                                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'}
                            `}>
                                                <input
                                                    type="radio"
                                                    name="type"
                                                    className="hidden"
                                                    checked={formData.testimonial_type === type.id}
                                                    onChange={() => setFormData({ ...formData, testimonial_type: type.id as any })}
                                                />
                                                <type.icon size={18} />
                                                <span className="text-sm font-medium">{type.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Enlace Carpeta (Drive/Dropbox)</label>
                                    <div className="relative mt-1">
                                        <LinkIcon className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                                        <input
                                            required
                                            type="url"
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors"
                                            placeholder="https://drive.google.com/..."
                                            value={formData.media_url}
                                            onChange={e => setFormData({ ...formData, media_url: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Notas Adicionales</label>
                                <div className="relative mt-1">
                                    <FileText className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                                    <textarea
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors"
                                        rows={3}
                                        placeholder="Contexto del testimonio, frases clave, o instrucciones..."
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    disabled={submitting}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {submitting ? 'Guardando...' : 'Registrar Testimonio'}
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }

            {/* LISTADO (Histórico) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b font-bold text-slate-700 flex items-center justify-between">
                    <span>📚 {isRRSS ? 'Testimonios para Publicar' : 'Historial de Testimonios'}</span>
                    {isRRSSorAdmin && (
                        <div className="flex items-center gap-4 text-sm font-normal">
                            <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 size={14} /> Publicados: {testimonials.filter(t => t.is_published).length}
                            </span>
                            <span className="flex items-center gap-1 text-amber-600">
                                <Clock size={14} /> Pendientes: {testimonials.filter(t => !t.is_published).length}
                            </span>
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-slate-500 bg-white border-b">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Fecha Subida</th>
                                <th className="px-4 py-3 font-semibold">Tipo</th>
                                <th className="px-4 py-3 font-semibold">Cliente</th>
                                <th className="px-4 py-3 font-semibold">Coach</th>
                                <th className="px-4 py-3 font-semibold">Enlace</th>
                                <th className="px-4 py-3 font-semibold text-center">Estado Notion</th>
                                <th className="px-4 py-3 font-semibold">Publicado CRM</th>
                                <th className="px-4 py-3 font-semibold">Fecha Publicación</th>
                                <th className="px-4 py-3 font-semibold">Notas</th>
                                <th className="px-4 py-3 font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={10} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                            ) : testimonials.length === 0 ? (
                                <tr><td colSpan={10} className="p-8 text-center text-slate-400">No hay testimonios registrados aún.</td></tr>
                            ) : (
                                testimonials.map(t => (
                                    <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${!t.is_published && isRRSS ? 'bg-amber-50/50' : ''}`}>
                                        <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} />
                                                {new Date(t.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {editingId === t.id ? (
                                                <select
                                                    value={editType}
                                                    onChange={e => setEditType(e.target.value as any)}
                                                    className="w-full border rounded text-xs p-1"
                                                >
                                                    <option value="video">VIDEO</option>
                                                    <option value="image">FOTO</option>
                                                    <option value="text">TEXTO</option>
                                                    <option value="audio">AUDIO</option>
                                                </select>
                                            ) : (
                                                <div className="flex items-center gap-2 uppercase text-xs font-bold text-slate-700">
                                                    {getIconByType(t.testimonial_type)}
                                                    {t.testimonial_type}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 font-medium text-slate-800">
                                            {editingId === t.id ? (
                                                <div className="space-y-1">
                                                    <input
                                                        className="w-full border rounded px-1 py-0.5 text-xs"
                                                        value={editClientName}
                                                        onChange={e => setEditClientName(e.target.value)}
                                                        placeholder="Nombre"
                                                    />
                                                    <input
                                                        className="w-full border rounded px-1 py-0.5 text-xs"
                                                        value={editClientSurname}
                                                        onChange={e => setEditClientSurname(e.target.value)}
                                                        placeholder="Apellidos"
                                                    />
                                                    <input
                                                        className="w-full border rounded px-1 py-0.5 text-xs"
                                                        value={editClientPhone}
                                                        onChange={e => setEditClientPhone(e.target.value)}
                                                        placeholder="Teléfono"
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    {t.client_name} {t.client_surname}
                                                    <div className="text-xs text-slate-400 font-normal">{t.client_phone}</div>
                                                </>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-medium text-slate-600">
                                                {t.coach_name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {editingId === t.id ? (
                                                <input
                                                    className="w-full border rounded px-1 py-0.5 text-xs"
                                                    value={editMediaUrl}
                                                    onChange={e => setEditMediaUrl(e.target.value)}
                                                    placeholder="URL Drive/Dropbox"
                                                />
                                            ) : (
                                                <a href={t.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                                                    <LinkIcon size={14} /> Abrir
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {t.notion_status ? (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${['Revision', 'Revisión'].includes(t.notion_status) ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                    ['En proceso', 'En Proceso'].includes(t.notion_status) ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                        ['Done', 'Publicado', 'Completado'].includes(t.notion_status) ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                            'bg-slate-50 text-slate-500 border-slate-200'
                                                    }`}>
                                                    {['Revision', 'Revisión'].includes(t.notion_status) && <Clock size={10} />}
                                                    {['En proceso', 'En Proceso'].includes(t.notion_status) && <FileText size={10} />}
                                                    {['Done', 'Publicado', 'Completado'].includes(t.notion_status) && <CheckCircle2 size={10} />}
                                                    {t.notion_status}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-[10px] italic">No Conectado</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            {isRRSSorAdmin ? (
                                                <button
                                                    onClick={() => togglePublished(t)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${t.is_published
                                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                        }`}
                                                >
                                                    {t.is_published ? (
                                                        <>
                                                            <CheckCircle2 size={14} />
                                                            Publicado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock size={14} />
                                                            Pendiente
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${t.is_published
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {t.is_published ? (
                                                        <>
                                                            <CheckCircle2 size={14} />
                                                            Publicado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock size={14} />
                                                            Pendiente
                                                        </>
                                                    )}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                                            {editingId === t.id ? (
                                                <input
                                                    type="date"
                                                    value={editPublishedAt}
                                                    onChange={(e) => setEditPublishedAt(e.target.value)}
                                                    className="border rounded px-2 py-1 text-sm"
                                                />
                                            ) : t.published_at ? (
                                                <div className="flex items-center gap-1 text-emerald-600">
                                                    <Calendar size={14} />
                                                    {new Date(t.published_at).toLocaleDateString()}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-slate-500 max-w-[200px]">
                                            {editingId === t.id ? (
                                                <div className="space-y-3">
                                                    <textarea
                                                        value={editNotes}
                                                        onChange={(e) => setEditNotes(e.target.value)}
                                                        className="w-full border rounded px-2 py-1 text-sm bg-slate-50"
                                                        rows={2}
                                                        placeholder="Notas..."
                                                    />
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex flex-col">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Likes</label>
                                                            <input
                                                                type="number"
                                                                value={editMetrics.likes_count}
                                                                onChange={e => setEditMetrics({ ...editMetrics, likes_count: parseInt(e.target.value) || 0 })}
                                                                className="border rounded px-2 py-1 text-xs"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Visitas</label>
                                                            <input
                                                                type="number"
                                                                value={editMetrics.views_count}
                                                                onChange={e => setEditMetrics({ ...editMetrics, views_count: parseInt(e.target.value) || 0 })}
                                                                className="border rounded px-2 py-1 text-xs"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Coments</label>
                                                            <input
                                                                type="number"
                                                                value={editMetrics.comments_count}
                                                                onChange={e => setEditMetrics({ ...editMetrics, comments_count: parseInt(e.target.value) || 0 })}
                                                                className="border rounded px-2 py-1 text-xs"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Shares</label>
                                                            <input
                                                                type="number"
                                                                value={editMetrics.shares_count}
                                                                onChange={e => setEditMetrics({ ...editMetrics, shares_count: parseInt(e.target.value) || 0 })}
                                                                className="border rounded px-2 py-1 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <span className="truncate block font-medium" title={t.notes}>
                                                        {t.notes || '-'}
                                                    </span>
                                                    {t.is_published && (
                                                        <div className="flex flex-wrap gap-2 text-[10px] items-center text-slate-400">
                                                            <span className="flex items-center gap-0.5"><ThumbsUp size={10} /> {t.likes_count || 0}</span>
                                                            <span className="flex items-center gap-0.5"><Eye size={10} /> {t.views_count || 0}</span>
                                                            <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {t.comments_count || 0}</span>
                                                            <span className="flex items-center gap-0.5"><Share2 size={10} /> {t.shares_count || 0}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                {editingId === t.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => saveEditing(t.id)}
                                                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all"
                                                            title="Guardar"
                                                        >
                                                            <Save size={14} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                                                            title="Cancelar"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        {canModify(t) && (
                                                            <button
                                                                onClick={() => startEditing(t)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                                                                title="Editar"
                                                            >
                                                                <FileText size={14} />
                                                                Editar
                                                            </button>
                                                        )}
                                                        {isRRSSorAdmin && (
                                                            <button
                                                                onClick={() => handleOpenChat(t.coach_id, t.coach_name)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                                                                title={`Chatear con ${t.coach_name}`}
                                                            >
                                                                <MessageSquare size={14} />
                                                                Chat
                                                            </button>
                                                        )}
                                                        {canModify(t) && (
                                                            <button
                                                                onClick={() => handleDelete(t.id)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                                                                title="Eliminar"
                                                            >
                                                                <X size={14} />
                                                                Eliminar
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div >
    );
}
