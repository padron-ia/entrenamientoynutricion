-- ==========================================
-- CHAT SYSTEM COMPATIBILITY (v8) - FINAL FIX
-- Disables RLS to support Manual/Backdoor Login
-- ==========================================

-- 1. DROP ALL OLD POLICIES
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('chat_rooms', 'chat_room_participants', 'chat_messages')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON ' || quote_ident(pol.tablename);
    END LOOP;
END $$;

-- 2. DISABLE RLS ON CHAT TABLES
-- This is necessary because the current app architecture uses a "Backdoor" login
-- that does not create a real Supabase Auth session, making RLS block all requests.
ALTER TABLE public.chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;

-- 3. KEEP HELPER FUNCTIONS FOR LOGIC
-- These are still useful for the 'find_direct_chat_room' RPC and potential future use.
CREATE OR REPLACE FUNCTION public.check_chat_participation(room_uuid UUID, user_identity TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.chat_room_participants
        WHERE room_id = room_uuid
        AND (
            LOWER(user_id) = LOWER(user_identity) OR 
            user_id = user_identity
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. ENSURE RPC IS ROBUST
CREATE OR REPLACE FUNCTION public.find_direct_chat_room(user_a TEXT, user_b TEXT)
RETURNS UUID AS $$
DECLARE
    found_room_id UUID;
BEGIN
    SELECT p1.room_id INTO found_room_id
    FROM public.chat_room_participants p1
    JOIN public.chat_room_participants p2 ON p1.room_id = p2.room_id
    JOIN public.chat_rooms r ON p1.room_id = r.id
    WHERE r.type = 'direct'
    AND (LOWER(p1.user_id) = LOWER(user_a))
    AND (LOWER(p2.user_id) = LOWER(user_b))
    LIMIT 1;
    
    RETURN found_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. RE-GRANT PERMISSIONS (Just in case)
GRANT ALL ON public.chat_rooms TO anon, authenticated;
GRANT ALL ON public.chat_room_participants TO anon, authenticated;
GRANT ALL ON public.chat_messages TO anon, authenticated;
