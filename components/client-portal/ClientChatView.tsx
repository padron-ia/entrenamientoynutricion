import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, Send, Image, Paperclip, Smile } from 'lucide-react';
import { chatService } from '../../services/chatService';
import { supabase } from '../../services/supabaseClient';

interface ClientChatViewProps {
    clientId: string;
    coachId?: string;
    coachName?: string;
    coachPhoto?: string;
    clientName: string;
    onBack: () => void;
}

interface Message {
    id: string;
    content: string;
    sender_id: string;
    sender_name?: string;
    sender_photo?: string;
    type: 'text' | 'image' | 'audio' | 'file';
    file_url?: string;
    created_at: string;
}

export function ClientChatView({ clientId, coachId, coachName, coachPhoto, clientName, onBack }: ClientChatViewProps) {
    const [roomId, setRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Find or create room with coach
    useEffect(() => {
        if (!coachId) {
            setError('No tienes un coach asignado todavia.');
            setLoading(false);
            return;
        }

        const initRoom = async () => {
            try {
                const id = await chatService.findOrCreateDirectRoom(clientId, coachId);
                setRoomId(id);

                const msgs = await chatService.getRoomMessages(id, 100);
                setMessages(msgs as Message[]);

                await chatService.markAsRead(id, clientId);
            } catch (err) {
                console.error('Error initializing chat:', err);
                setError('No se pudo cargar el chat. Intenta de nuevo.');
            } finally {
                setLoading(false);
            }
        };

        initRoom();
    }, [clientId, coachId]);

    // Real-time subscription
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase
            .channel(`chat_room_${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `room_id=eq.${roomId}`
                },
                async (payload) => {
                    const newMsg = payload.new as Message;
                    // Fetch sender info
                    const { data: user } = await supabase
                        .from('users')
                        .select('name, avatar_url')
                        .eq('id', newMsg.sender_id)
                        .maybeSingle();

                    const enriched: Message = {
                        ...newMsg,
                        sender_name: user?.name || 'Usuario',
                        sender_photo: user?.avatar_url
                    };

                    setMessages(prev => {
                        if (prev.some(m => m.id === enriched.id)) return prev;
                        return [...prev, enriched];
                    });

                    // Mark as read if from coach
                    if (newMsg.sender_id !== clientId) {
                        chatService.markAsRead(roomId, clientId);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, clientId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleSend = async () => {
        if (!newMessage.trim() || !roomId || sending) return;

        const content = newMessage.trim();
        setNewMessage('');
        setSending(true);

        try {
            await chatService.sendMessage(roomId, clientId, content);
        } catch (err) {
            console.error('Error sending message:', err);
            setNewMessage(content); // Restore message on error
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !roomId) return;

        setSending(true);
        try {
            const url = await chatService.uploadAttachment(file);
            const type = file.type.startsWith('image/') ? 'image' : 'file';
            await chatService.sendMessage(roomId, clientId, file.name, type as any, url);
        } catch (err) {
            console.error('Error uploading file:', err);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) return 'Hoy';
        if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    };

    // Group messages by date
    const groupedMessages: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    for (const msg of messages) {
        const date = formatDate(msg.created_at);
        if (date !== currentDate) {
            currentDate = date;
            groupedMessages.push({ date, messages: [msg] });
        } else {
            groupedMessages[groupedMessages.length - 1].messages.push(msg);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-sea-200 border-t-sea-600 rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface flex flex-col animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-slate-500 rotate-180" />
                    </button>
                    {coachPhoto ? (
                        <img src={coachPhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-sea-100 flex items-center justify-center">
                            <span className="text-sea-600 font-bold text-sm">{(coachName || 'C').charAt(0)}</span>
                        </div>
                    )}
                    <div>
                        <p className="font-bold text-slate-800">{coachName || 'Tu Coach'}</p>
                        <p className="text-xs text-slate-400">Chat directo</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="max-w-3xl mx-auto space-y-4">
                    {error ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500">{error}</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-sea-50 flex items-center justify-center mx-auto mb-4">
                                <Smile className="w-8 h-8 text-sea-400" />
                            </div>
                            <p className="font-bold text-slate-700">Empieza la conversacion</p>
                            <p className="text-sm text-slate-400 mt-1">Escribe a {coachName || 'tu coach'} cuando quieras</p>
                        </div>
                    ) : (
                        groupedMessages.map((group, gi) => (
                            <div key={gi}>
                                <div className="text-center my-4">
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase">
                                        {group.date}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {group.messages.map((msg) => {
                                        const isMe = msg.sender_id === clientId;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                                                    isMe
                                                        ? 'bg-sea-600 text-white rounded-br-md'
                                                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm'
                                                }`}>
                                                    {msg.type === 'image' && msg.file_url && (
                                                        <img
                                                            src={msg.file_url}
                                                            alt=""
                                                            className="rounded-xl max-w-full mb-2 cursor-pointer"
                                                            onClick={() => window.open(msg.file_url, '_blank')}
                                                        />
                                                    )}
                                                    {msg.type === 'file' && msg.file_url && (
                                                        <a
                                                            href={msg.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`flex items-center gap-2 mb-1 underline text-sm ${isMe ? 'text-white/90' : 'text-sea-600'}`}
                                                        >
                                                            <Paperclip className="w-3.5 h-3.5" />
                                                            {msg.content}
                                                        </a>
                                                    )}
                                                    {(msg.type === 'text' || !msg.file_url) && (
                                                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                                    )}
                                                    <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-slate-400'} text-right`}>
                                                        {formatTime(msg.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            {!error && (
                <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-3">
                    <div className="max-w-3xl mx-auto flex items-center gap-2">
                        <label className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                            <Image className="w-5 h-5 text-slate-400" />
                            <input
                                type="file"
                                accept="image/*,.pdf,.doc,.docx"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder="Escribe un mensaje..."
                            className="flex-1 bg-slate-100 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sea-300 transition-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!newMessage.trim() || sending}
                            className="p-2.5 bg-sea-600 text-white rounded-full hover:bg-sea-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
