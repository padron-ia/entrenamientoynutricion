-- ==============================================================================
-- 🏆 RESTAURACIÓN DE LOGROS Y BIENESTAR (V2 CON CASTING) 🏆
-- ==============================================================================

-- 1. TABLA: achievements
DROP POLICY IF EXISTS "Public read achievements" ON public.achievements;
CREATE POLICY "Public read achievements" ON public.achievements 
FOR SELECT USING (true);

-- 2. TABLA: client_achievements
DROP POLICY IF EXISTS "Clients see own unlocked" ON public.client_achievements;
CREATE POLICY "Clients see own unlocked" ON public.client_achievements 
FOR SELECT USING (public.is_own_client_data(client_id::text));

DROP POLICY IF EXISTS "Staff manage client achievements" ON public.client_achievements;
CREATE POLICY "Staff manage client achievements" ON public.client_achievements 
FOR ALL USING (public.is_staff());

-- 3. TABLA: wellness_logs
DROP POLICY IF EXISTS "Clients manage own wellness" ON public.wellness_logs;
CREATE POLICY "Clients manage own wellness" ON public.wellness_logs 
FOR ALL USING (public.is_own_client_data(client_id::text))
WITH CHECK (public.is_own_client_data(client_id::text));

DROP POLICY IF EXISTS "Staff see wellness logs" ON public.wellness_logs;
CREATE POLICY "Staff see wellness logs" ON public.wellness_logs 
FOR SELECT USING (public.is_staff());

-- 4. TABLA: ticket_comments
DROP POLICY IF EXISTS "Anyone see comments of accessible tickets" ON public.ticket_comments;
CREATE POLICY "Anyone see comments of accessible tickets" ON public.ticket_comments 
FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE id::text = ticket_id::text AND (public.is_own_client_data(client_id::text) OR public.is_staff())
));

DROP POLICY IF EXISTS "Anyone create comments in accessible tickets" ON public.ticket_comments;
CREATE POLICY "Anyone create comments in accessible tickets" ON public.ticket_comments 
FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE id::text = ticket_id::text AND (user_id::text = auth.uid()::text OR public.is_staff())
));

-- 5. CHAT
DROP POLICY IF EXISTS "Participants see their rooms" ON public.chat_room_participants;
CREATE POLICY "Participants see their rooms" ON public.chat_room_participants 
FOR SELECT USING (user_id::text = auth.uid()::text OR public.is_staff());

DROP POLICY IF EXISTS "Participants see messages" ON public.chat_messages;
CREATE POLICY "Participants see messages" ON public.chat_messages 
FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.chat_room_participants 
    WHERE room_id::text = chat_messages.room_id::text AND user_id::text = auth.uid()::text
) OR public.is_staff());

DROP POLICY IF EXISTS "Participants send messages" ON public.chat_messages;
CREATE POLICY "Participants send messages" ON public.chat_messages 
FOR INSERT WITH CHECK (sender_id::text = auth.uid()::text);
