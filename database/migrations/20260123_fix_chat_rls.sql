-- ==============================================================================
-- FIX: Chat RLS - Correccion de mensajes mezclados entre conversaciones
-- ==============================================================================
-- Fecha: 2026-01-23
-- Problema: Los mensajes se mezclan entre conversaciones porque:
--           1. RLS estaba deshabilitado
--           2. No hay validacion de que sender_id sea el usuario autenticado
--           3. No hay validacion de que el usuario sea participante del room
-- Solucion: Reactivar RLS con politicas robustas
-- ==============================================================================

-- 1. FUNCION AUXILIAR: Verificar si el usuario es participante de un room
CREATE OR REPLACE FUNCTION public.is_chat_participant(check_room_id uuid, check_user_id text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_room_participants
    WHERE room_id = check_room_id
    AND (user_id = check_user_id OR LOWER(user_id) = LOWER(check_user_id))
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. FUNCION AUXILIAR: Obtener el user_id del usuario actual
-- Soporta tanto auth.uid() como usuarios en tabla users
CREATE OR REPLACE FUNCTION public.get_current_chat_user_id()
RETURNS text AS $$
DECLARE
  auth_id uuid;
  user_email text;
  db_user_id text;
BEGIN
  -- Obtener el auth.uid() si existe
  auth_id := auth.uid();

  IF auth_id IS NOT NULL THEN
    -- Buscar en tabla users por auth id
    SELECT id INTO db_user_id FROM public.users WHERE id = auth_id::text;
    IF db_user_id IS NOT NULL THEN
      RETURN db_user_id;
    END IF;

    -- Buscar por email en auth.users
    SELECT email INTO user_email FROM auth.users WHERE id = auth_id;
    IF user_email IS NOT NULL THEN
      SELECT id INTO db_user_id FROM public.users WHERE LOWER(email) = LOWER(user_email);
      IF db_user_id IS NOT NULL THEN
        RETURN db_user_id;
      END IF;
    END IF;

    -- Fallback: usar el auth.uid() como string
    RETURN auth_id::text;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. HABILITAR RLS EN TABLAS DE CHAT
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. POLITICAS PARA chat_rooms
DROP POLICY IF EXISTS "Staff access all rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users see own rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users create rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Anon read rooms" ON public.chat_rooms;

-- Staff puede ver todos los rooms
CREATE POLICY "Staff access all rooms" ON public.chat_rooms
  FOR ALL USING (public.is_staff());

-- Usuarios ven rooms donde son participantes
CREATE POLICY "Users see own rooms" ON public.chat_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_participants p
      WHERE p.room_id = id
      AND (p.user_id = public.get_current_chat_user_id()
           OR LOWER(p.user_id) = LOWER(public.get_current_chat_user_id()))
    )
  );

-- Usuarios autenticados pueden crear rooms
CREATE POLICY "Users create rooms" ON public.chat_rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. POLITICAS PARA chat_room_participants
DROP POLICY IF EXISTS "Staff access all participants" ON public.chat_room_participants;
DROP POLICY IF EXISTS "Users see room participants" ON public.chat_room_participants;
DROP POLICY IF EXISTS "Users add participants" ON public.chat_room_participants;
DROP POLICY IF EXISTS "Anon read participants" ON public.chat_room_participants;

-- Staff puede ver todos
CREATE POLICY "Staff access all participants" ON public.chat_room_participants
  FOR ALL USING (public.is_staff());

-- Usuarios ven participantes de sus rooms
CREATE POLICY "Users see room participants" ON public.chat_room_participants
  FOR SELECT USING (
    public.is_chat_participant(room_id, public.get_current_chat_user_id())
  );

-- Usuarios pueden agregar participantes (para crear rooms)
CREATE POLICY "Users add participants" ON public.chat_room_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Usuarios pueden actualizar su propio last_read_at
CREATE POLICY "Users update own read status" ON public.chat_room_participants
  FOR UPDATE USING (
    user_id = public.get_current_chat_user_id()
    OR LOWER(user_id) = LOWER(public.get_current_chat_user_id())
  );

-- 6. POLITICAS PARA chat_messages (LAS MAS IMPORTANTES)
DROP POLICY IF EXISTS "Staff access all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users see room messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users send own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anon read messages" ON public.chat_messages;

-- Staff puede ver todos los mensajes
CREATE POLICY "Staff access all messages" ON public.chat_messages
  FOR ALL USING (public.is_staff());

-- Usuarios ven mensajes de rooms donde son participantes
CREATE POLICY "Users see room messages" ON public.chat_messages
  FOR SELECT USING (
    public.is_chat_participant(room_id, public.get_current_chat_user_id())
  );

-- CRITICO: Usuarios SOLO pueden enviar mensajes como ellos mismos Y en rooms donde participan
CREATE POLICY "Users send own messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    -- Debe ser participante del room
    public.is_chat_participant(room_id, sender_id)
    -- El sender_id debe coincidir con el usuario actual (flexibilidad para diferentes formatos de ID)
    AND (
      sender_id = public.get_current_chat_user_id()
      OR LOWER(sender_id) = LOWER(public.get_current_chat_user_id())
      OR sender_id = auth.uid()::text
      -- Permitir si el sender_id existe en users y coincide con el email del auth
      OR EXISTS (
        SELECT 1 FROM public.users u, auth.users au
        WHERE u.id = sender_id
        AND au.id = auth.uid()
        AND LOWER(u.email) = LOWER(au.email)
      )
    )
  );

-- 7. ASEGURAR QUE LOS TRIGGERS FUNCIONEN CORRECTAMENTE
-- Actualizar la funcion RPC para buscar rooms directos
CREATE OR REPLACE FUNCTION public.find_direct_chat_room(user_a text, user_b text)
RETURNS uuid AS $$
  SELECT r.id
  FROM public.chat_rooms r
  JOIN public.chat_room_participants p1 ON p1.room_id = r.id
  JOIN public.chat_room_participants p2 ON p2.room_id = r.id
  WHERE r.type = 'direct'
  AND (LOWER(p1.user_id) = LOWER(user_a) OR p1.user_id = user_a)
  AND (LOWER(p2.user_id) = LOWER(user_b) OR p2.user_id = user_b)
  AND p1.user_id != p2.user_id
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ==============================================================================
-- FIN DEL SCRIPT
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE 'MIGRACION COMPLETADA: Chat RLS reactivado';
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE 'Cambios aplicados:';
  RAISE NOTICE '  - RLS habilitado en chat_rooms, chat_room_participants, chat_messages';
  RAISE NOTICE '  - Usuarios solo pueden enviar mensajes como ellos mismos';
  RAISE NOTICE '  - Usuarios solo ven mensajes de rooms donde participan';
  RAISE NOTICE '  - Staff tiene acceso completo';
  RAISE NOTICE '==============================================================================';
END $$;
