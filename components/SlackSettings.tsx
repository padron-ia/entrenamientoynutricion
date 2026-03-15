import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, Edit2, Save, X, Hash, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ToastProvider';

interface SlackChannel {
    id: string;
    name: string;
    webhook_url: string;
    is_active: boolean;
}

export function SlackSettings() {
    const [channels, setChannels] = useState<SlackChannel[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', webhook_url: '', is_active: true });
    const toast = useToast();

    useEffect(() => {
        loadChannels();
    }, []);

    const loadChannels = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('slack_channels')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setChannels(data || []);
        } catch (err) {
            console.error('Error loading slack channels:', err);
            toast.error('Error al cargar configurar canales de Slack');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (id?: string) => {
        if (!formData.name.trim() || !formData.webhook_url.trim()) {
            toast.error('Nombre y URL del Webhook son obligatorios');
            return;
        }

        try {
            const payload = {
                name: formData.name.trim(),
                webhook_url: formData.webhook_url.trim(),
                is_active: formData.is_active
            };

            const { error } = id
                ? await supabase.from('slack_channels').update(payload).eq('id', id)
                : await supabase.from('slack_channels').insert([payload]);

            if (error) throw error;

            toast.success(id ? 'Canal actualizado' : 'Canal añadido correctamente');
            setIsAdding(false);
            setEditingId(null);
            setFormData({ name: '', webhook_url: '', is_active: true });
            loadChannels();
        } catch (err) {
            console.error('Error saving slack channel:', err);
            toast.error('Error al guardar el canal');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que quieres eliminar este canal?')) return;

        try {
            const { error } = await supabase.from('slack_channels').delete().eq('id', id);
            if (error) throw error;
            toast.success('Canal eliminado');
            loadChannels();
        } catch (err) {
            console.error('Error deleting channel:', err);
            toast.error('Error al eliminar el canal');
        }
    };

    const startEdit = (channel: SlackChannel) => {
        setEditingId(channel.id);
        setIsAdding(false);
        setFormData({
            name: channel.name,
            webhook_url: channel.webhook_url,
            is_active: channel.is_active
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Hash className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Canales de Slack</h2>
                            <p className="text-sm text-slate-500">Configura destinos para las comunicaciones del equipo</p>
                        </div>
                    </div>
                    {!isAdding && (
                        <button
                            onClick={() => {
                                setIsAdding(true);
                                setEditingId(null);
                                setFormData({ name: '', webhook_url: '', is_active: true });
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Canal
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {/* Form for Adding/Editing */}
                    {(isAdding || editingId) && (
                        <div className="p-6 bg-slate-50 rounded-2xl border-2 border-indigo-100 animate-in zoom-in-95 duration-200">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                {isAdding ? 'Añadir Nuevo Canal' : 'Editar Canal'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre descriptivo</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Anuncios VIP, Canal de Testimonios..."
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Estado</label>
                                    <button
                                        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                        className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl w-full hover:bg-slate-100 transition-colors"
                                    >
                                        {formData.is_active ? <ToggleRight className="text-green-500" /> : <ToggleLeft className="text-slate-400" />}
                                        <span className="text-sm font-medium">{formData.is_active ? 'Activo' : 'Inactivo'}</span>
                                    </button>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">URL del Webhook (Incoming Webhook)</label>
                                    <input
                                        type="text"
                                        placeholder="https://hooks.slack.com/services/..."
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-xs"
                                        value={formData.webhook_url}
                                        onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => { setIsAdding(false); setEditingId(null); }}
                                    className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleSave(editingId || undefined)}
                                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-all"
                                >
                                    <Save className="w-4 h-4" />
                                    {isAdding ? 'Añadir Registro' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Channels List */}
                    <div className="grid grid-cols-1 gap-3">
                        {channels.length === 0 && !isAdding && (
                            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">No hay canales de Slack configurados aún</p>
                            </div>
                        )}
                        {channels.map(channel => (
                            <div
                                key={channel.id}
                                className={`flex items-center justify-between p-4 rounded-2xl border bg-white transition-all ${channel.is_active ? 'border-indigo-50 hover:border-indigo-100' : 'opacity-60 border-slate-100 grayscale'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${channel.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-800">{channel.name}</h4>
                                            {!channel.is_active && (
                                                <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">Inactivo</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono truncate max-w-xs">{channel.webhook_url}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => startEdit(channel)}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(channel.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
