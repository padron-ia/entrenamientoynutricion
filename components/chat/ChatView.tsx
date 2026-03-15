import React, { useState, useEffect, useRef } from 'react';
import {
    Send, Image as ImageIcon, Mic, Paperclip,
    Search, MoreVertical, Phone, Video,
    Check, CheckCheck, Clock, User, Users,
    MessageSquare, Plus, ChevronLeft, Loader2,
    ArrowLeft, X, CheckCircle2, Trash2, XCircle,
    CheckSquare
} from 'lucide-react';
import { ChatRoom, ChatMessage, ChatParticipant, User as UserType, UserRole } from '../../types';
import { chatService } from '../../services/chatService';
import { supabase } from '../../services/supabaseClient';

interface ChatViewProps {
    user: UserType;
}

export const ChatView: React.FC<ChatViewProps> = ({ user }) => {
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // New Chat states
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<UserType[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [isGroupMode, setIsGroupMode] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [userSearch, setUserSearch] = useState('');

    // Load rooms on mount
    useEffect(() => {
        loadRooms();

        const roomsChannel = supabase
            .channel('chat_rooms_global')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'chat_rooms' },
                () => loadRooms()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(roomsChannel);
        };
    }, []);

    // Load messages when room changes - with race condition prevention
    useEffect(() => {
        // Capture the current roomId to prevent stale closures
        const currentRoomId = selectedRoomId;
        let isSubscribed = true;
        let msgChannel: any = null;

        if (currentRoomId) {
            // Clear messages immediately when changing rooms to prevent mixing
            setMessages([]);
            setLoadingMessages(true);

            const initRoom = async () => {
                try {
                    // Load messages for THIS room
                    const data = await chatService.getRoomMessages(currentRoomId);

                    // Only update if we're still looking at the same room
                    if (isSubscribed && currentRoomId === selectedRoomId) {
                        setMessages(data);
                        setTimeout(scrollToBottom, 50);
                    }
                } catch (err) {
                    console.error('Error loading messages:', err);
                } finally {
                    if (isSubscribed) {
                        setLoadingMessages(false);
                    }
                }

                // Mark as read
                chatService.markAsRead(currentRoomId, user.id);
            };

            initRoom();

            // Subscribe to realtime updates for THIS room
            msgChannel = supabase
                .channel(`room_${currentRoomId}_${Date.now()}`) // Unique channel name
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'chat_messages',
                        filter: `room_id=eq.${currentRoomId}`
                    },
                    (payload) => {
                        // Double-check we're still on the same room
                        if (!isSubscribed || currentRoomId !== selectedRoomId) return;

                        const newMsg = payload.new as any;
                        setMessages(prev => {
                            // Prevent duplicates
                            if (prev.some(m => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg as ChatMessage];
                        });
                        scrollToBottom();
                    }
                )
                .subscribe();
        } else {
            setMessages([]);
        }

        // Cleanup: unsubscribe and mark as stale
        return () => {
            isSubscribed = false;
            if (msgChannel) {
                supabase.removeChannel(msgChannel);
            }
        };
    }, [selectedRoomId, user.id]);

    // Load users for new chat
    useEffect(() => {
        if (isNewChatModalOpen) {
            loadAvailableUsers();
        }
    }, [isNewChatModalOpen]);

    const loadRooms = async () => {
        try {
            const data = await chatService.getMyRooms();
            setRooms(data);
        } catch (err) {
            console.error('Error loading rooms:', err);
        } finally {
            setLoadingRooms(false);
        }
    };

    // loadMessages is now handled inline in the useEffect to prevent race conditions

    const loadAvailableUsers = async () => {
        setLoadingUsers(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, avatar_url, role')
                .neq('id', user.id)
                .order('name');

            if (error) throw error;
            setAvailableUsers((data as any[]) || []);
        } catch (err) {
            console.error('Error loading users:', err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedRoomId || isSending) return;

        const content = newMessage.trim();
        setNewMessage('');
        setIsSending(true);

        try {
            await chatService.sendMessage(selectedRoomId, user.id, content);
        } catch (err: any) {
            console.error('Error sending message:', err);
            // Show more detailed error if possible
            const errorMsg = err.message || 'Error al enviar mensaje';
            alert(`No se pudo enviar: ${errorMsg}. Verifica tu conexión o permisos.`);
            setNewMessage(content); // Restore content on error
        } finally {
            setIsSending(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedRoomId || isSending) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecciona una imagen');
            return;
        }

        setIsSending(true);
        try {
            const publicUrl = await chatService.uploadAttachment(file);
            await chatService.sendMessage(selectedRoomId, user.id, '📷 Imagen', 'image', publicUrl);
        } catch (err) {
            console.error('Error uploading image:', err);
            alert('Error al subir la imagen');
        } finally {
            setIsSending(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleStartChat = async (otherUserId?: string) => {
        setCreatingRoom(true);
        try {
            let roomId: string;

            if (isGroupMode) {
                if (!groupName.trim()) {
                    alert('Por favor, introduce un nombre para el grupo');
                    return;
                }
                if (selectedUsers.length < 1) {
                    alert('Selecciona al menos un integrante para el grupo');
                    return;
                }
                roomId = await chatService.createGroupRoom(user.id, groupName.trim(), selectedUsers);
            } else if (otherUserId) {
                roomId = await chatService.findOrCreateDirectRoom(user.id, otherUserId);
            } else {
                return;
            }

            setIsNewChatModalOpen(false);
            setIsGroupMode(false);
            setSelectedUsers([]);
            setGroupName('');

            await loadRooms();
            setSelectedRoomId(roomId);
        } catch (err: any) {
            console.error('Error starting chat:', err);
            alert(`No se pudo crear el chat: ${err.message || 'Error de permisos'}`);
        } finally {
            setCreatingRoom(false);
        }
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const getRoomDisplayName = (room: ChatRoom | undefined) => {
        if (!room) return 'Cargando...';
        if (room.type === 'group') return room.name || 'Grupo sin nombre';
        const otherParticipant = room.participants?.find((p: any) => p.user_id !== user.id);
        return otherParticipant?.user_name || 'Conversación Directa';
    };

    const getRoomDisplayPhoto = (room: ChatRoom | undefined) => {
        if (!room) return '';
        if (room.type === 'group') return '';
        const otherParticipant = room.participants?.find((p: any) => p.user_id !== user.id);
        return otherParticipant?.user_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant?.user_name || 'U')}&background=random`;
    };

    const selectedRoom = rooms.find(r => r.id === selectedRoomId);

    return (
        <div className="flex h-[calc(100vh-120px)] bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden shadow-2xl animate-in fade-in duration-500">
            {/* Sidebar */}
            <div className={`w-full md:w-80 border-r border-white/5 flex flex-col ${selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-white">PT Chat</h2>
                        <button
                            onClick={() => setIsNewChatModalOpen(true)}
                            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar conversación..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-6 custom-scrollbar">
                    {loadingRooms ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-50">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cargando salas...</span>
                        </div>
                    ) : rooms.filter(r => getRoomDisplayName(r).toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                        <div className="text-center py-10">
                            <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                            <p className="text-xs font-bold text-slate-500">No hay chats activos</p>
                            <button
                                onClick={() => setIsNewChatModalOpen(true)}
                                className="mt-4 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300"
                            >
                                Iniciar nueva conversación
                            </button>
                        </div>
                    ) : (
                        rooms.filter(r => getRoomDisplayName(r).toLowerCase().includes(searchTerm.toLowerCase())).map(room => {
                            const isGroup = room.type === 'group';
                            const displayName = getRoomDisplayName(room);
                            const displayPhoto = getRoomDisplayPhoto(room);

                            return (
                                <button
                                    key={room.id}
                                    onClick={() => setSelectedRoomId(room.id)}
                                    className={`w-full p-4 rounded-3xl flex items-center gap-3 transition-all ${selectedRoomId === room.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-[1.02]' : 'hover:bg-white/5 text-slate-200'}`}
                                >
                                    <div className="relative shrink-0">
                                        {isGroup ? (
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${selectedRoomId === room.id ? 'bg-white/20' : 'bg-white/5 text-slate-400'}`}>
                                                <Users className="w-6 h-6" />
                                            </div>
                                        ) : (
                                            <img
                                                src={displayPhoto || `https://ui-avatars.com/api/?name=${displayName}`}
                                                className="w-12 h-12 rounded-2xl object-cover"
                                            />
                                        )}
                                        {room.unread_count > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center animate-bounce">
                                                {room.unread_count}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex justify-between items-baseline gap-2">
                                            <p className={`font-bold truncate ${selectedRoomId === room.id ? 'text-white' : 'text-slate-200'}`}>{displayName}</p>
                                            {room.last_message_at && (
                                                <span className={`text-[10px] shrink-0 font-medium ${selectedRoomId === room.id ? 'text-blue-200' : 'text-slate-400'}`}>
                                                    {new Date(room.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs truncate font-medium ${selectedRoomId === room.id ? 'text-blue-100' : 'text-slate-500'}`}>
                                            {room.last_message || (isGroup ? `${room.participants?.length || 0} participantes` : 'Escribir mensaje...')}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal de Nuevo Chat */}
            {isNewChatModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-lg p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-black text-white tracking-tight">Nuevo Mensaje</h3>
                                <button onClick={() => setIsNewChatModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setIsGroupMode(!isGroupMode);
                                        setSelectedUsers([]);
                                    }}
                                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${isGroupMode ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                    <Users className="w-4 h-4" />
                                    {isGroupMode ? 'Modo Grupo' : 'Crear Grupo'}
                                </button>
                            </div>
                        </div>

                        <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Buscar integrante..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none font-bold"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                />
                            </div>

                            {isGroupMode && (
                                <div className="space-y-4 mb-6 sticky top-0 bg-slate-900 z-10 pb-4 border-b border-white/5">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Grupo</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Equipo Nutrición, Soporte..."
                                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none font-bold text-white placeholder:text-slate-600"
                                        value={groupName}
                                        onChange={e => setGroupName(e.target.value)}
                                    />
                                </div>
                            )}

                            {loadingUsers ? (
                                <div className="py-20 text-center flex flex-col items-center gap-4">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                    <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Cargando...</span>
                                </div>
                            ) : availableUsers.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => isGroupMode ? toggleUserSelection(u.id) : handleStartChat(u.id)}
                                    className={`w-full p-4 rounded-[2rem] border-2 text-left transition-all mb-2 flex items-center justify-between ${isGroupMode && selectedUsers.includes(u.id) ? 'border-blue-500 bg-blue-900/20' : 'border-white/5 hover:bg-white/5'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name || 'U'}`} className="w-12 h-12 rounded-2xl object-cover" />
                                        <div>
                                            <p className="font-bold text-white">{u.name || 'Usuario'}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{u.role || 'Staff'}</p>
                                        </div>
                                    </div>
                                    {isGroupMode && (
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedUsers.includes(u.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-700'}`}>
                                            {selectedUsers.includes(u.id) && <CheckSquare className="w-4 h-4 text-white" />}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {isGroupMode && (
                            <div className="p-8 border-t border-white/5">
                                <button
                                    disabled={creatingRoom || selectedUsers.length === 0 || !groupName.trim()}
                                    onClick={() => handleStartChat()}
                                    className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {creatingRoom ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Users className="w-5 h-5" /> Crear Grupo ({selectedUsers.length})</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${!selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
                {selectedRoomId ? (
                    <>
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/30">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setSelectedRoomId(null)}
                                    className="md:hidden p-2 text-slate-400 hover:text-white"
                                >
                                    <ArrowLeft className="w-6 h-6" />
                                </button>
                                {selectedRoom?.type === 'group' ? (
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                                        <Users className="w-6 h-6 text-slate-400" />
                                    </div>
                                ) : (
                                    <img src={getRoomDisplayPhoto(selectedRoom)} className="w-12 h-12 rounded-2xl object-cover" />
                                )}
                                <div>
                                    <h3 className="text-lg font-black text-white">{getRoomDisplayName(selectedRoom)}</h3>
                                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                        {selectedRoom ? 'Activo' : 'Cargando...'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                                    <Phone className="w-5 h-5" />
                                </button>
                                <button className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                                    <Video className="w-5 h-5" />
                                </button>
                                <button className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {loadingMessages ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                    <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Cargando mensajes...</span>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-30">
                                    <MessageSquare className="w-12 h-12 mb-4" />
                                    <p className="font-bold text-white">No hay mensajes aún</p>
                                    <p className="text-xs text-slate-400">Di hola para comenzar la conversación.</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    if (!msg) return null;
                                    const isMe = msg.sender_id === user.id;
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] ${isMe ? 'order-2 ml-3' : 'order-1 mr-3'}`}>
                                                <div className={`px-5 py-4 rounded-3xl text-sm font-medium shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/10 text-slate-100 rounded-tl-none'}`}>
                                                    {msg.type === 'image' && msg.file_url ? (
                                                        <div className="space-y-2">
                                                            <img
                                                                src={msg.file_url}
                                                                alt="Adjunto"
                                                                className="max-w-full rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
                                                                onClick={() => window.open(msg.file_url, '_blank')}
                                                            />
                                                            {msg.content !== '📷 Imagen' && <p>{msg.content}</p>}
                                                        </div>
                                                    ) : msg.content}
                                                </div>
                                                <div className={`flex items-center gap-2 mt-2 text-[10px] font-bold text-slate-500 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {isMe && <CheckCheck className="w-3 h-3 text-blue-400" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-6 border-t border-white/5 bg-slate-900/30">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                            <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-white/5 p-2 rounded-[2rem] border border-white/10 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                                <div className="flex items-center px-2">
                                    <button type="button" className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                                        <Paperclip className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                                    >
                                        <ImageIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 bg-transparent border-none py-4 text-sm text-white focus:ring-0 outline-none font-bold placeholder:text-slate-600"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <div className="flex items-center px-2 gap-2">
                                    <button type="button" className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                                        <Mic className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || isSending}
                                        className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-40">
                        <div className="w-24 h-24 bg-white/5 rounded-[3rem] flex items-center justify-center mb-6">
                            <MessageSquare className="w-12 h-12 text-slate-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2">Selecciona un Chat</h2>
                        <p className="text-slate-500 max-w-sm font-bold">Inicia una conversación con tu coach o integrantes del staff.</p>
                        <button
                            onClick={() => setIsNewChatModalOpen(true)}
                            className="mt-8 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center gap-3"
                        >
                            <Plus className="w-5 h-5" />
                            Nuevo Chat
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
