import React, { useState } from 'react';
import { Send, Users, Bell, X, Info, AlertCircle, CheckCircle2, AlertTriangle, Briefcase, Hash } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Client, ClientStatus } from '../types';
import { useToast } from './ToastProvider';

interface CreateAnnouncementProps {
    currentUser: string;
    isAdmin: boolean;
    clients: Client[];
    onClose: () => void;
    onSuccess?: () => void;
    defaultAudience?: 'all_active' | 'my_clients' | 'all_team';
    prefill?: {
        title: string;
        message: string;
        target?: 'all_active' | 'my_clients' | 'all_team';
        telegram?: boolean;
    };
}

const ANNOUNCEMENT_TYPES = [
    { value: 'info', label: 'Información', icon: '💡', color: 'blue' },
    { value: 'important', label: 'Importante', icon: '⭐', color: 'purple' },
    { value: 'warning', label: 'Aviso', icon: '⚠️', color: 'yellow' },
    { value: 'success', label: 'Buenas Noticias', icon: '🎉', color: 'green' }
];

interface SlackChannel {
    id: string;
    name: string;
    webhook_url: string;
}

export const CreateAnnouncement: React.FC<CreateAnnouncementProps> = ({
    currentUser,
    isAdmin,
    clients,
    onClose,
    onSuccess,
    defaultAudience,
    prefill
}) => {
    const [title, setTitle] = useState(prefill?.title || '');
    const [message, setMessage] = useState(prefill?.message || '');
    const [announcementType, setAnnouncementType] = useState<'info' | 'important' | 'warning' | 'success'>(defaultAudience ? 'info' : 'info');
    const [targetAudience, setTargetAudience] = useState<'my_clients' | 'all_active' | 'all_team' | 'only_closers' | 'only_coaches'>(
        prefill?.target || defaultAudience || (isAdmin ? 'all_active' : 'my_clients')
    );
    const [showAsModal, setShowAsModal] = useState(false);
    const [priority, setPriority] = useState(0);
    const [expiresIn, setExpiresIn] = useState<number | null>(null); // Days until expiration
    const [isSaving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
    const [selectedSlackChannels, setSelectedSlackChannels] = useState<string[]>([]);
    const [telegramToken, setTelegramToken] = useState<string | null>(null);
    const [sendByTelegram, setSendByTelegram] = useState(prefill?.telegram || false);
    const [isSendingTelegram, setIsSendingTelegram] = useState(false);
    const toast = useToast();

    React.useEffect(() => {
        const fetchData = async () => {
            if (isAdmin) {
                const { data: slackData } = await supabase
                    .from('slack_channels')
                    .select('id, name, webhook_url')
                    .eq('is_active', true);

                if (slackData) {
                    setSlackChannels(slackData);
                }
            }

            // Always fetch Telegram token if it exists
            const { data: settingsData } = await supabase
                .from('app_settings')
                .select('*')
                .eq('setting_key', 'telegram_bot_token')
                .single();

            if (settingsData && settingsData.setting_value) {
                setTelegramToken(settingsData.setting_value);
            }
        };
        fetchData();
    }, [isAdmin]);

    const activeClients = clients.filter(c => c.status === ClientStatus.ACTIVE);

    // Determine target count for different audiences
    const getTargetCount = () => {
        if (targetAudience === 'my_clients') return activeClients.filter(c => c.coach_id === currentUser).length;
        if (targetAudience === 'all_active') return activeClients.length;
        if (targetAudience === 'all_team') return 'Todo el equipo';
        if (targetAudience === 'only_closers') return 'Solo Closers';
        if (targetAudience === 'only_coaches') return 'Solo Coaches';
        return 0;
    };

    const targetCount = getTargetCount();

    const handleCreate = async () => {
        if (!title.trim()) {
            const err = 'Por favor añade un título al anuncio';
            setError(err);
            toast.error(err);
            return;
        }
        if (!message.trim()) {
            const err = 'Por favor escribe un mensaje';
            setError(err);
            toast.error(err);
            return;
        }

        setSaving(true);
        setError('');

        try {
            const expiresAt = expiresIn
                ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString()
                : null;

            const selectedType = ANNOUNCEMENT_TYPES.find(t => t.value === announcementType);

            // For client targeting, we still want to save IDs if possible
            const targetClientIds = (targetAudience === 'all_active' || targetAudience === 'my_clients')
                ? (targetAudience === 'all_active' ? activeClients : activeClients.filter(c => c.coach_id === currentUser)).map(c => c.id)
                : [];

            const { error: insertError } = await supabase
                .from('announcements')
                .insert({
                    created_by: currentUser,
                    sender_role: isAdmin ? 'admin' : 'coach',
                    title: title.trim(),
                    message: message.trim(),
                    announcement_type: announcementType,
                    priority: priority,
                    target_audience: targetAudience,
                    coach_filter: (targetAudience === 'my_clients' && !isAdmin) ? currentUser : null,
                    client_ids: targetClientIds,
                    show_as_modal: showAsModal,
                    show_in_feed: true,
                    expires_at: expiresAt,
                    icon: selectedType?.icon,
                    color: selectedType?.color,
                    is_active: true,
                    published_at: new Date().toISOString()
                });

            if (insertError) throw insertError;

            // Send to Telegram if selected
            if (sendByTelegram && telegramToken && targetClientIds.length > 0) {
                setIsSendingTelegram(true);
                const targetedClients = activeClients.filter(c => targetClientIds.includes(c.id));
                const telegramPromises = targetedClients
                    .filter(c => c.telegram_group_id && c.telegram_group_id.startsWith('-100'))
                    .map(client => {
                        const text = `<b>${title}</b>\n\n${message}`;
                        return fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: client.telegram_group_id,
                                text: text,
                                parse_mode: 'HTML'
                            })
                        });
                    });

                if (telegramPromises.length > 0) {
                    const results = await Promise.allSettled(telegramPromises);
                    const successCount = results.filter(r => r.status === 'fulfilled').length;
                    console.log(`Telegram messages sent: ${successCount}/${telegramPromises.length}`);
                }
                setIsSendingTelegram(false);
            }

            // Send to Slack if selected
            if (selectedSlackChannels.length > 0) {
                const channelsToSend = slackChannels.filter(c => selectedSlackChannels.includes(c.id));
                const slackPromises = channelsToSend.map(channel => {
                    const payload = {
                        text: `*${title}*\n${message}\n\nTipo: ${selectedType?.label || announcementType}\nEnviado por: ${currentUser}`
                    };
                    return fetch(channel.webhook_url, {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                });
                await Promise.allSettled(slackPromises);
            }

            toast.success('Anuncio publicado correctamente');
            onSuccess?.();
            onClose();
        } catch (err: any) {
            console.error('Error creating announcement:', err);
            const errMsg = err.message || 'Error al crear el anuncio';
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Bell className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Nuevo Anuncio</h2>
                                <p className="text-purple-100 text-sm">Comunícate con clientes o equipo</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Audience Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            ¿A quién va dirigido?
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Clientes Section */}
                            <div className="md:col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 mt-2">Clientes</div>
                            <button
                                onClick={() => setTargetAudience('my_clients')}
                                className={`p-4 rounded-xl border-2 transition-all ${targetAudience === 'my_clients'
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-slate-200 hover:border-purple-200'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Users className={`w-5 h-5 ${targetAudience === 'my_clients' ? 'text-purple-600' : 'text-slate-400'}`} />
                                    <div className="text-left">
                                        <p className="font-bold text-slate-800">Mis Clientes</p>
                                        <p className="text-xs text-slate-500">
                                            {activeClients.filter(c => c.coach_id === currentUser).length} clientes
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {isAdmin && (
                                <button
                                    onClick={() => setTargetAudience('all_active')}
                                    className={`p-4 rounded-xl border-2 transition-all ${targetAudience === 'all_active'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-slate-200 hover:border-blue-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Users className={`w-5 h-5 ${targetAudience === 'all_active' ? 'text-blue-600' : 'text-slate-400'}`} />
                                        <div className="text-left">
                                            <p className="font-bold text-slate-800">Todos los Clientes</p>
                                            <p className="text-xs text-slate-500">
                                                {activeClients.length} clientes
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            )}

                            {/* Equipo Section (Solo Admin) */}
                            {isAdmin && (
                                <>
                                    <div className="md:col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 mt-4">Staff & Equipo</div>
                                    <button
                                        onClick={() => setTargetAudience('all_team')}
                                        className={`p-4 rounded-xl border-2 transition-all ${targetAudience === 'all_team'
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'border-slate-200 hover:border-orange-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Briefcase className={`w-5 h-5 ${targetAudience === 'all_team' ? 'text-orange-600' : 'text-slate-400'}`} />
                                            <div className="text-left">
                                                <p className="font-bold text-slate-800">Todo el Equipo</p>
                                                <p className="text-xs text-slate-500">Full Staff</p>
                                            </div>
                                        </div>
                                    </button>

                                    <div className="grid grid-cols-2 gap-3 md:col-span-1">
                                        <button
                                            onClick={() => setTargetAudience('only_coaches')}
                                            className={`p-4 rounded-xl border-2 transition-all ${targetAudience === 'only_coaches'
                                                ? 'border-emerald-500 bg-emerald-50'
                                                : 'border-slate-200 hover:border-emerald-200'
                                                }`}
                                        >
                                            <div className="text-center">
                                                <p className="font-bold text-slate-800 text-sm">Solo Coaches</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setTargetAudience('only_closers')}
                                            className={`p-4 rounded-xl border-2 transition-all ${targetAudience === 'only_closers'
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-slate-200 hover:border-indigo-200'
                                                }`}
                                        >
                                            <div className="text-center">
                                                <p className="font-bold text-slate-800 text-sm">Solo Closers</p>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Slack Channels Selection (Solo Admin) */}
                    {isAdmin && slackChannels.length > 0 && (
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                También enviar a Slack
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {slackChannels.map(channel => (
                                    <button
                                        key={channel.id}
                                        onClick={() => {
                                            setSelectedSlackChannels(prev =>
                                                prev.includes(channel.id)
                                                    ? prev.filter(id => id !== channel.id)
                                                    : [...prev, channel.id]
                                            );
                                        }}
                                        className={`px-3 py-2 rounded-lg border flex items-center gap-2 transition-all ${selectedSlackChannels.includes(channel.id)
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <Hash className={`w-4 h-4 ${selectedSlackChannels.includes(channel.id) ? 'text-blue-400' : 'text-slate-400'}`} />
                                        <span className="text-sm font-medium">{channel.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Telegram Toggle */}
                    {telegramToken && (targetAudience === 'my_clients' || targetAudience === 'all_active') && (
                        <div className="mb-6">
                            <label className="flex items-center gap-3 p-4 bg-sky-50 rounded-xl border border-sky-200 cursor-pointer hover:bg-sky-100 transition-colors shadow-sm">
                                <input
                                    type="checkbox"
                                    checked={sendByTelegram}
                                    onChange={(e) => setSendByTelegram(e.target.checked)}
                                    className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500"
                                />
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg">
                                        <Send className="w-5 h-5 text-sky-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">Enviar también por Telegram</p>
                                        <p className="text-xs text-slate-500">Se enviará a los grupos de Telegram de los clientes seleccionados</p>
                                    </div>
                                </div>
                            </label>
                            {!sendByTelegram && (
                                <p className="mt-2 text-[10px] text-slate-400 px-1">
                                    * Solo se enviará a clientes que tengan un ID de grupo configurado.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Type Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Tipo de Anuncio
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {ANNOUNCEMENT_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => setAnnouncementType(type.value as any)}
                                    className={`p-3 rounded-xl border-2 transition-all ${announcementType === type.value
                                        ? `border-${type.color}-500 bg-${type.color}-50`
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{type.icon}</span>
                                        <span className="font-semibold text-slate-800">{type.label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Título
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Nueva clase disponible"
                            className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                    </div>

                    {/* Message */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Mensaje
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            placeholder="Escribe tu mensaje aquí..."
                            className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                        />
                    </div>

                    {/* Options */}
                    <div className="mb-6 space-y-3">
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                                type="checkbox"
                                checked={showAsModal}
                                onChange={(e) => {
                                    setShowAsModal(e.target.checked);
                                    if (e.target.checked) setPriority(1);
                                    else setPriority(0);
                                }}
                                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <div>
                                <p className="font-bold text-slate-800">Mostrar como popup</p>
                                <p className="text-xs text-slate-500">El anuncio aparecerá al abrir el portal</p>
                            </div>
                        </label>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Expiración
                            </label>
                            <select
                                value={expiresIn || ''}
                                onChange={(e) => setExpiresIn(e.target.value ? Number(e.target.value) : null)}
                                className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                            >
                                <option value="">Sin expiración</option>
                                <option value="1">1 día</option>
                                <option value="3">3 días</option>
                                <option value="7">1 semana</option>
                                <option value="14">2 semanas</option>
                                <option value="30">1 mes</option>
                            </select>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                    <p className="text-sm text-slate-600">
                        Se mostrará a: <strong>{targetCount}</strong>
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-6 py-3 text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 font-medium disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isSaving || (typeof targetCount === 'number' && targetCount === 0)}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Publicando...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    {isSaving ? 'Publicando...' : (isSendingTelegram ? 'Enviando Telegram...' : 'Publicar Anuncio')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
