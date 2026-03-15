-- ==============================================================================
-- 🔧 FIX: Permitir operaciones con rol anon (la app no usa Supabase Auth)
-- ==============================================================================
-- Fecha: 2026-02-13
-- Problema: Todas las políticas RLS usan auth.uid() pero la app usa el anon key
--           de Supabase con autenticación propia. auth.uid() es siempre NULL
--           y los INSERT/SELECT/UPDATE de clientes son rechazados silenciosamente.
-- Afecta: glucose_history, body_measurements, weight_history, weekly_checkins,
--         wellness_entries/wellness_logs, hba1c_history, daily_checkins,
--         client_achievements, client_goals, medical_reviews
-- Solución: Añadir política permisiva para rol anon en todas las tablas de datos
-- ==============================================================================

-- Función helper para aplicar política anon a una tabla
CREATE OR REPLACE FUNCTION public.apply_anon_policy(table_name_text text)
RETURNS void AS $$
BEGIN
  -- Verificar que la tabla existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = table_name_text
  ) THEN
    RAISE NOTICE 'Tabla % no existe, saltando...', table_name_text;
    RETURN;
  END IF;

  -- Eliminar política anon previa si existe
  EXECUTE format('DROP POLICY IF EXISTS "Anon access" ON public.%I', table_name_text);

  -- Crear política permisiva para anon
  EXECUTE format('CREATE POLICY "Anon access" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', table_name_text);

  RAISE NOTICE '✅ %: política anon creada', table_name_text;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas de datos del cliente
SELECT public.apply_anon_policy('glucose_history');
SELECT public.apply_anon_policy('body_measurements');
SELECT public.apply_anon_policy('weight_history');
SELECT public.apply_anon_policy('weekly_checkins');
SELECT public.apply_anon_policy('wellness_logs');
SELECT public.apply_anon_policy('wellness_entries');
SELECT public.apply_anon_policy('hba1c_history');
SELECT public.apply_anon_policy('daily_checkins');
SELECT public.apply_anon_policy('client_achievements');
SELECT public.apply_anon_policy('client_goals');
SELECT public.apply_anon_policy('medical_reviews');
SELECT public.apply_anon_policy('coaching_sessions');
SELECT public.apply_anon_policy('support_tickets');
SELECT public.apply_anon_policy('ticket_comments');
SELECT public.apply_anon_policy('contract_pauses');

-- También la tabla principal de clientes (lectura/escritura)
SELECT public.apply_anon_policy('clientes_pt_notion');

-- Tablas de staff/sistema
SELECT public.apply_anon_policy('users');
SELECT public.apply_anon_policy('chat_rooms');
SELECT public.apply_anon_policy('chat_room_participants');
SELECT public.apply_anon_policy('chat_messages');
SELECT public.apply_anon_policy('receipts');

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE '✅ MIGRACIÓN COMPLETADA: Políticas anon añadidas';
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE 'La app usa anon key (no Supabase Auth), por lo que auth.uid() es NULL.';
  RAISE NOTICE 'Estas políticas permiten que la app funcione correctamente.';
  RAISE NOTICE 'La seguridad se gestiona a nivel de aplicación (mockAuth).';
  RAISE NOTICE '==============================================================================';
END $$;
