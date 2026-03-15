-- ==============================================================================
-- 🔧 FIX: Políticas RLS para Clientes - Corrección de client_id vs auth.uid()
-- ==============================================================================
-- Fecha: 2026-01-23
-- Problema: Los clientes no pueden insertar datos (peso, glucosa, medidas, etc.)
--           porque las políticas RLS verifican client_id = auth.uid(), pero:
--           - auth.uid() = UUID del usuario en auth.users
--           - client_id = ID del registro en clientes_pt_notion (diferente)
-- Solución: Verificar que client_id pertenece a un cliente cuyo user_id = auth.uid()
-- ==============================================================================

-- 1. FUNCIÓN AUXILIAR: Obtener el client_id del usuario autenticado
-- Esta función retorna el ID del cliente asociado al usuario de auth.users
CREATE OR REPLACE FUNCTION public.get_client_id_for_auth_user()
RETURNS uuid AS $$
  SELECT id FROM public.clientes_pt_notion WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. FUNCIÓN AUXILIAR: Verificar si un client_id pertenece al usuario autenticado
CREATE OR REPLACE FUNCTION public.is_own_client_record(check_client_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clientes_pt_notion
    WHERE id = check_client_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Versión que acepta text para compatibilidad
CREATE OR REPLACE FUNCTION public.is_own_client_record(check_client_id text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clientes_pt_notion
    WHERE id::text = check_client_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. ACTUALIZAR POLÍTICAS EN TABLAS DE PROGRESO DEL CLIENTE

-- === WEIGHT_HISTORY ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'weight_history') THEN
    -- Eliminar políticas antiguas de cliente
    DROP POLICY IF EXISTS "Client see own" ON public.weight_history;
    DROP POLICY IF EXISTS "Client insert own" ON public.weight_history;
    DROP POLICY IF EXISTS "Client update own" ON public.weight_history;

    -- Crear nuevas políticas corregidas
    CREATE POLICY "Client see own" ON public.weight_history
      FOR SELECT USING (public.is_own_client_record(client_id));

    CREATE POLICY "Client insert own" ON public.weight_history
      FOR INSERT WITH CHECK (public.is_own_client_record(client_id));

    CREATE POLICY "Client update own" ON public.weight_history
      FOR UPDATE USING (public.is_own_client_record(client_id));

    RAISE NOTICE '✅ weight_history: políticas actualizadas';
  END IF;
END $$;

-- === GLUCOSE_HISTORY ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'glucose_history') THEN
    DROP POLICY IF EXISTS "Client see own" ON public.glucose_history;
    DROP POLICY IF EXISTS "Client insert own" ON public.glucose_history;
    DROP POLICY IF EXISTS "Client update own" ON public.glucose_history;

    CREATE POLICY "Client see own" ON public.glucose_history
      FOR SELECT USING (public.is_own_client_record(client_id));

    CREATE POLICY "Client insert own" ON public.glucose_history
      FOR INSERT WITH CHECK (public.is_own_client_record(client_id));

    CREATE POLICY "Client update own" ON public.glucose_history
      FOR UPDATE USING (public.is_own_client_record(client_id));

    RAISE NOTICE '✅ glucose_history: políticas actualizadas';
  END IF;
END $$;

-- === GLUCOSE_READINGS (nombre alternativo) ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'glucose_readings') THEN
    DROP POLICY IF EXISTS "Client see own" ON public.glucose_readings;
    DROP POLICY IF EXISTS "Client insert own" ON public.glucose_readings;
    DROP POLICY IF EXISTS "Client update own" ON public.glucose_readings;

    CREATE POLICY "Client see own" ON public.glucose_readings
      FOR SELECT USING (public.is_own_client_record(client_id));

    CREATE POLICY "Client insert own" ON public.glucose_readings
      FOR INSERT WITH CHECK (public.is_own_client_record(client_id));

    CREATE POLICY "Client update own" ON public.glucose_readings
      FOR UPDATE USING (public.is_own_client_record(client_id));

    RAISE NOTICE '✅ glucose_readings: políticas actualizadas';
  END IF;
END $$;

-- === BODY_MEASUREMENTS ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'body_measurements') THEN
    DROP POLICY IF EXISTS "Client see own" ON public.body_measurements;
    DROP POLICY IF EXISTS "Client insert own" ON public.body_measurements;
    DROP POLICY IF EXISTS "Client update own" ON public.body_measurements;

    CREATE POLICY "Client see own" ON public.body_measurements
      FOR SELECT USING (public.is_own_client_record(client_id));

    CREATE POLICY "Client insert own" ON public.body_measurements
      FOR INSERT WITH CHECK (public.is_own_client_record(client_id));

    CREATE POLICY "Client update own" ON public.body_measurements
      FOR UPDATE USING (public.is_own_client_record(client_id));

    RAISE NOTICE '✅ body_measurements: políticas actualizadas';
  END IF;
END $$;

-- === WEEKLY_CHECKINS ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'weekly_checkins') THEN
    DROP POLICY IF EXISTS "Client see own" ON public.weekly_checkins;
    DROP POLICY IF EXISTS "Client insert own" ON public.weekly_checkins;
    DROP POLICY IF EXISTS "Client update own" ON public.weekly_checkins;

    CREATE POLICY "Client see own" ON public.weekly_checkins
      FOR SELECT USING (public.is_own_client_record(client_id));

    CREATE POLICY "Client insert own" ON public.weekly_checkins
      FOR INSERT WITH CHECK (public.is_own_client_record(client_id));

    CREATE POLICY "Client update own" ON public.weekly_checkins
      FOR UPDATE USING (public.is_own_client_record(client_id));

    RAISE NOTICE '✅ weekly_checkins: políticas actualizadas';
  END IF;
END $$;

-- === DAILY_CHECKINS ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_checkins') THEN
    DROP POLICY IF EXISTS "Client see own" ON public.daily_checkins;
    DROP POLICY IF EXISTS "Client insert own" ON public.daily_checkins;
    DROP POLICY IF EXISTS "Client update own" ON public.daily_checkins;

    CREATE POLICY "Client see own" ON public.daily_checkins
      FOR SELECT USING (public.is_own_client_record(client_id));

    CREATE POLICY "Client insert own" ON public.daily_checkins
      FOR INSERT WITH CHECK (public.is_own_client_record(client_id));

    CREATE POLICY "Client update own" ON public.daily_checkins
      FOR UPDATE USING (public.is_own_client_record(client_id));

    RAISE NOTICE '✅ daily_checkins: políticas actualizadas';
  END IF;
END $$;

-- === HBA1C_HISTORY ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hba1c_history') THEN
    DROP POLICY IF EXISTS "Client see own" ON public.hba1c_history;
    DROP POLICY IF EXISTS "Client insert own" ON public.hba1c_history;
    DROP POLICY IF EXISTS "Client update own" ON public.hba1c_history;

    CREATE POLICY "Client see own" ON public.hba1c_history
      FOR SELECT USING (public.is_own_client_record(client_id));

    CREATE POLICY "Client insert own" ON public.hba1c_history
      FOR INSERT WITH CHECK (public.is_own_client_record(client_id));

    CREATE POLICY "Client update own" ON public.hba1c_history
      FOR UPDATE USING (public.is_own_client_record(client_id));

    RAISE NOTICE '✅ hba1c_history: políticas actualizadas';
  END IF;
END $$;

-- === MEDICAL_REVIEWS ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'medical_reviews') THEN
    DROP POLICY IF EXISTS "Client see own" ON public.medical_reviews;
    DROP POLICY IF EXISTS "Client insert own" ON public.medical_reviews;
    DROP POLICY IF EXISTS "Client update own" ON public.medical_reviews;

    CREATE POLICY "Client see own" ON public.medical_reviews
      FOR SELECT USING (public.is_own_client_record(client_id));

    CREATE POLICY "Client insert own" ON public.medical_reviews
      FOR INSERT WITH CHECK (public.is_own_client_record(client_id));

    CREATE POLICY "Client update own" ON public.medical_reviews
      FOR UPDATE USING (public.is_own_client_record(client_id));

    RAISE NOTICE '✅ medical_reviews: políticas actualizadas';
  END IF;
END $$;

-- === COACHING_SESSIONS ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coaching_sessions') THEN
    DROP POLICY IF EXISTS "Client see reviews" ON public.coaching_sessions;

    CREATE POLICY "Client see reviews" ON public.coaching_sessions
      FOR SELECT USING (public.is_own_client_record(client_id));

    RAISE NOTICE '✅ coaching_sessions: políticas actualizadas';
  END IF;
END $$;

-- === CLIENT_GOALS (si existe) ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_goals') THEN
    DROP POLICY IF EXISTS "Client see own" ON public.client_goals;
    DROP POLICY IF EXISTS "Client insert own" ON public.client_goals;
    DROP POLICY IF EXISTS "Client update own" ON public.client_goals;

    CREATE POLICY "Client see own" ON public.client_goals
      FOR SELECT USING (public.is_own_client_record(client_id));

    CREATE POLICY "Client insert own" ON public.client_goals
      FOR INSERT WITH CHECK (public.is_own_client_record(client_id));

    CREATE POLICY "Client update own" ON public.client_goals
      FOR UPDATE USING (public.is_own_client_record(client_id));

    RAISE NOTICE '✅ client_goals: políticas actualizadas';
  END IF;
END $$;

-- === WELLNESS_ENTRIES (si existe) ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wellness_entries') THEN
    DROP POLICY IF EXISTS "Client see own" ON public.wellness_entries;
    DROP POLICY IF EXISTS "Client insert own" ON public.wellness_entries;
    DROP POLICY IF EXISTS "Client update own" ON public.wellness_entries;

    CREATE POLICY "Client see own" ON public.wellness_entries
      FOR SELECT USING (public.is_own_client_record(client_id));

    CREATE POLICY "Client insert own" ON public.wellness_entries
      FOR INSERT WITH CHECK (public.is_own_client_record(client_id));

    CREATE POLICY "Client update own" ON public.wellness_entries
      FOR UPDATE USING (public.is_own_client_record(client_id));

    RAISE NOTICE '✅ wellness_entries: políticas actualizadas';
  END IF;
END $$;

-- === CLIENT_ACHIEVEMENTS (si existe) ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_achievements') THEN
    DROP POLICY IF EXISTS "Client see own" ON public.client_achievements;
    DROP POLICY IF EXISTS "Client insert own" ON public.client_achievements;

    CREATE POLICY "Client see own" ON public.client_achievements
      FOR SELECT USING (public.is_own_client_record(client_id));

    CREATE POLICY "Client insert own" ON public.client_achievements
      FOR INSERT WITH CHECK (public.is_own_client_record(client_id));

    RAISE NOTICE '✅ client_achievements: políticas actualizadas';
  END IF;
END $$;

-- ==============================================================================
-- 4. ACTUALIZAR LA FUNCIÓN GENÉRICA PARA FUTURAS TABLAS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.setup_standard_policies(table_name_text text)
RETURNS void AS $$
DECLARE
  table_exists boolean;
  has_client_id boolean;
BEGIN
  -- 0. Comprobar si existe la tabla
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = table_name_text
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE NOTICE 'La tabla % no existe, saltando...', table_name_text;
    RETURN;
  END IF;

  -- 1. Acceso TOTAL para Staff (Siempre aplica si la tabla existe)
  EXECUTE format('DROP POLICY IF EXISTS "Staff access all" ON public.%I', table_name_text);
  EXECUTE format('CREATE POLICY "Staff access all" ON public.%I FOR ALL USING (public.is_staff())', table_name_text);

  -- 2. Comprobar si existe la columna client_id para las políticas de Alumno
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = table_name_text AND column_name = 'client_id'
  ) INTO has_client_id;

  IF has_client_id THEN
    -- El alumno puede ver sus propios registros (CORREGIDO)
    EXECUTE format('DROP POLICY IF EXISTS "Client see own" ON public.%I', table_name_text);
    EXECUTE format('CREATE POLICY "Client see own" ON public.%I FOR SELECT USING (public.is_own_client_record(client_id))', table_name_text);

    -- El alumno puede crear sus propios registros (CORREGIDO)
    EXECUTE format('DROP POLICY IF EXISTS "Client insert own" ON public.%I', table_name_text);
    EXECUTE format('CREATE POLICY "Client insert own" ON public.%I FOR INSERT WITH CHECK (public.is_own_client_record(client_id))', table_name_text);

    -- El alumno puede actualizar sus propios registros (NUEVO)
    EXECUTE format('DROP POLICY IF EXISTS "Client update own" ON public.%I', table_name_text);
    EXECUTE format('CREATE POLICY "Client update own" ON public.%I FOR UPDATE USING (public.is_own_client_record(client_id))', table_name_text);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- FIN DEL SCRIPT
-- ==============================================================================

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE '✅ MIGRACIÓN COMPLETADA: Políticas RLS de cliente corregidas';
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE 'Los clientes ahora pueden:';
  RAISE NOTICE '  - Registrar su peso';
  RAISE NOTICE '  - Registrar glucemia';
  RAISE NOTICE '  - Registrar medidas corporales';
  RAISE NOTICE '  - Enviar check-ins semanales';
  RAISE NOTICE '  - Ver sus revisiones médicas';
  RAISE NOTICE '==============================================================================';
END $$;
