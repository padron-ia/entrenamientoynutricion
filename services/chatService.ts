import { supabase } from './supabaseClient';
import { ChatRoom, ChatMessage, ChatParticipant } from '../types';

export const chatService = {
    // --- ROOMS ---

    /**
     * Get all rooms for the current user including participants and last messages.
     */
    async getMyRooms(): Promise<ChatRoom[]> {
        const { data, error } = await supabase
            .from('chat_rooms')
            .select(`
                *,
                participants:chat_room_participants(
                  *,
                  users(id, name, avatar_url, role)
                )
            `)
            .order('last_message_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching rooms:', error);
            throw error;
        }

        return (data || []).map((room: any) => ({
            ...room,
            participants: room.participants?.map((p: any) => ({
                ...p,
                user_name: p.users?.name,
                user_photo: p.users?.avatar_url,
                user_role: p.users?.role
            })) || []
        }));
    },

    /**
     * Load message history for a specific room.
     */
    async getRoomMessages(roomId: string, limit = 50): Promise<ChatMessage[]> {
        const { data, error } = await supabase
            .from('chat_messages')
            .select(`
                *,
                users:sender_id(name, avatar_url)
            `)
            .eq('room_id', roomId)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error fetching messages:', error);
            throw error;
        }

        return (data || []).map((msg: any) => ({
            ...msg,
            sender_name: msg.users?.name || 'Usuario',
            sender_photo: msg.users?.avatar_url
        }));
    },

    /**
     * Send a new message.
     * Validates that the sender is a participant of the room before sending.
     */
    async sendMessage(
        roomId: string,
        senderId: string,
        content: string,
        type: 'text' | 'image' | 'audio' | 'file' = 'text',
        fileUrl?: string
    ): Promise<ChatMessage> {
        // Validate sender is participant of the room
        const { data: participant } = await supabase
            .from('chat_room_participants')
            .select('user_id')
            .eq('room_id', roomId)
            .or(`user_id.eq.${senderId},user_id.ilike.${senderId}`)
            .maybeSingle();

        if (!participant) {
            console.error(`User ${senderId} is not a participant of room ${roomId}`);
            throw new Error('No tienes permiso para enviar mensajes en esta conversacion');
        }

        // Use the participant's stored user_id for consistency
        const actualSenderId = participant.user_id;

        const { data, error } = await supabase
            .from('chat_messages')
            .insert({
                room_id: roomId,
                sender_id: actualSenderId,
                content,
                type,
                file_url: fileUrl
            })
            .select()
            .single();

        if (error) {
            console.error('Error sending message:', error);
            throw new Error(error.message || 'Error al enviar mensaje');
        }

        // Update room's last message for indexing
        await supabase
            .from('chat_rooms')
            .update({
                last_message: type === 'text' ? content : `[Archivo: ${type}]`,
                last_message_at: new Date().toISOString()
            })
            .eq('id', roomId);

        return data;
    },

    /**
     * Find an existing direct room or create a new one.
     */
    async findOrCreateDirectRoom(myId: string, otherUserId: string): Promise<string> {
        // Search if a direct room already exists
        const { data: existing, error: rpcError } = await supabase.rpc('find_direct_chat_room', {
            user_a: myId,
            user_b: otherUserId
        });

        if (!rpcError && existing) return existing;

        // Create new room if not found
        const { data: room, error: roomError } = await supabase
            .from('chat_rooms')
            .insert({ type: 'direct', created_by: myId })
            .select()
            .single();

        if (roomError) throw roomError;

        // Add both participants
        const { error: partError } = await supabase
            .from('chat_room_participants')
            .insert([
                { room_id: room.id, user_id: myId },
                { room_id: room.id, user_id: otherUserId }
            ]);

        if (partError) throw partError;

        return room.id;
    },

    /**
     * Create a new group room with multiple participants.
     */
    async createGroupRoom(myId: string, name: string, participantIds: string[]): Promise<string> {
        // Create new room
        const { data: room, error: roomError } = await supabase
            .from('chat_rooms')
            .insert({
                type: 'group',
                name: name,
                created_by: myId
            })
            .select()
            .single();

        if (roomError) throw roomError;

        // Prepare participants (myself + invited)
        const allParticipants = [...new Set([myId, ...participantIds])].map(id => ({
            room_id: room.id,
            user_id: id
        }));

        // Add all participants
        const { error: partError } = await supabase
            .from('chat_room_participants')
            .insert(allParticipants);

        if (partError) throw partError;

        return room.id;
    },

    /**
     * Mark all messages in a room as read for the user.
     */
    async markAsRead(roomId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('chat_room_participants')
            .update({ last_read_at: new Date().toISOString() })
            .match({ room_id: roomId, user_id: userId });

        if (error) console.error('Error marking as read:', error);
    },

    /**
     * Upload an attachment to the chat_attachments bucket.
     */
    async uploadAttachment(file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('chat_attachments')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('chat_attachments')
            .getPublicUrl(filePath);

        return publicUrl;
    }
};
