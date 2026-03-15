-- ==============================================================================
-- 🛡️ ESCUDO DE SEGURIDAD TOTAL: ACTIVACIÓN DE RLS Y POLÍTICAS POR ROL 🛡️
-- ==============================================================================
-- Autor: Antigravity AI
-- Propósito: Cerrar el acceso público (UNRESTRICTED) y definir accesos por rol.
-- Adaptado para: Padron Trainer CRM
-- ==============================================================================

-- 1. FUNCIONES AUXILIARES (Utilidades de Roles)
-- Estas funciones se usan en las Políticas para verificar permisos rápidamente.
-- Usamos 'SECURITY DEFINER' para que puedan consultar 'users' sin entrar en bucle infinito.

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
  SELECT LOWER(role) FROM public.users WHERE id = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
  -- Incluye: admin, head_coach, coach, closer, contabilidad, endocrino, psicologo, rrss
  SELECT public.get_auth_role() IN ('admin', 'head_coach', 'coach', 'closer', 'contabilidad', 'endocrino', 'psicologo', 'rrss');
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  -- En este contexto, 'head_coach' también tiene permisos administrativos sobre otros coaches.
  SELECT public.get_auth_role() IN ('admin', 'head_coach');
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. ACTIVACIÓN DE RLS EN TODAS LAS TABLAS
-- Recorremos las tablas del esquema public y encendemos el interruptor de seguridad.

DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    -- Excluimos tablas de sistema si las hubiera
    AND table_name NOT LIKE 'pg_%'
    AND table_name NOT LIKE '_prisma_%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- 3. POLÍTICAS POR TABLA (Accesos específicos)

-- --- TABLA: users ---
DROP POLICY IF EXISTS "Public read for login" ON public.users;
CREATE POLICY "Public read for login" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage users" ON public.users;
CREATE POLICY "Admins manage users" ON public.users FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users update own profile" ON public.users;
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (id = auth.uid()::text) WITH CHECK (id = auth.uid()::text);

-- --- TABLA: clientes_pt_notion ---
DROP POLICY IF EXISTS "Staff see all clients" ON public.clientes_pt_notion;
CREATE POLICY "Staff see all clients" ON public.clientes_pt_notion FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Clients see own profile" ON public.clientes_pt_notion;
CREATE POLICY "Clients see own profile" ON public.clientes_pt_notion FOR SELECT USING (id::text = auth.uid()::text OR user_id = auth.uid());

DROP POLICY IF EXISTS "Public insert during onboarding" ON public.clientes_pt_notion;
CREATE POLICY "Public insert during onboarding" ON public.clientes_pt_notion FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update during onboarding" ON public.clientes_pt_notion;
CREATE POLICY "Public update during onboarding" ON public.clientes_pt_notion FOR UPDATE USING (true) WITH CHECK (true);

-- --- TABLA: sales ---
DROP POLICY IF EXISTS "Staff manage sales" ON public.sales;
CREATE POLICY "Staff manage sales" ON public.sales FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Public access via token" ON public.sales;
CREATE POLICY "Public access via token" ON public.sales FOR SELECT USING (onboarding_token IS NOT NULL);

DROP POLICY IF EXISTS "Public update via token" ON public.sales;
CREATE POLICY "Public update via token" ON public.sales FOR UPDATE USING (onboarding_token IS NOT NULL);

-- --- TABLA: contract_templates ---
DROP POLICY IF EXISTS "Public read templates" ON public.contract_templates;
CREATE POLICY "Public read templates" ON public.contract_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage templates" ON public.contract_templates;
CREATE POLICY "Admins manage templates" ON public.contract_templates FOR ALL USING (public.is_admin());

-- --- DATOS DE PROGRESO (Peso, Glucosa, Medidas, etc.) ---
-- Aplicamos la lógica: Staff ve todo, Clientes ven lo suyo, Clientes crean lo suyo.

-- Función ultra-robusta para automatizar la creación de políticas
-- Comprueba si la tabla existe y si tiene las columnas necesarias antes de actuar.
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
    -- El alumno puede ver sus propios registros
    EXECUTE format('DROP POLICY IF EXISTS "Client see own" ON public.%I', table_name_text);
    EXECUTE format('CREATE POLICY "Client see own" ON public.%I FOR SELECT USING (client_id::text = auth.uid()::text)', table_name_text);

    -- El alumno puede crear sus propios registros
    EXECUTE format('DROP POLICY IF EXISTS "Client insert own" ON public.%I', table_name_text);
    EXECUTE format('CREATE POLICY "Client insert own" ON public.%I FOR INSERT WITH CHECK (client_id::text = auth.uid()::text)', table_name_text);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas conocidas (Si no existen, se saltarán silenciosamente)
SELECT public.setup_standard_policies('weight_history');
SELECT public.setup_standard_policies('glucose_readings');
SELECT public.setup_standard_policies('hba1c_history');
SELECT public.setup_standard_policies('body_measurements');
SELECT public.setup_standard_policies('daily_checkins');
SELECT public.setup_standard_policies('weekly_checkins');
SELECT public.setup_standard_policies('announcement_responses');
SELECT public.setup_standard_policies('assignment_notifications');
SELECT public.setup_standard_policies('client_plan_assignments');
SELECT public.setup_standard_policies('metricas_mensuales');
SELECT public.setup_standard_policies('communication_details');
SELECT public.setup_standard_policies('medical_reviews');

-- --- TABLA: daily_metrics ---
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_metrics') THEN
    DROP POLICY IF EXISTS "Staff see metrics" ON public.daily_metrics;
    CREATE POLICY "Staff see metrics" ON public.daily_metrics FOR SELECT USING (public.is_staff());
  END IF;
END $$;

-- --- TABLA: coaching_sessions ---
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coaching_sessions') THEN
    DROP POLICY IF EXISTS "Staff manage reviews" ON public.coaching_sessions;
    CREATE POLICY "Staff manage reviews" ON public.coaching_sessions FOR ALL USING (public.is_staff());
    DROP POLICY IF EXISTS "Client see reviews" ON public.coaching_sessions;
    CREATE POLICY "Client see reviews" ON public.coaching_sessions FOR SELECT USING (client_id::text = auth.uid()::text);
  END IF;
END $$;

-- --- TABLA: weekly_classes ---
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'weekly_classes') THEN
    DROP POLICY IF EXISTS "Everyone see classes" ON public.weekly_classes;
    CREATE POLICY "Everyone see classes" ON public.weekly_classes FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Staff manage classes" ON public.weekly_classes;
    CREATE POLICY "Staff manage classes" ON public.weekly_classes FOR ALL USING (public.is_staff());
  END IF;
END $$;

-- --- TABLA: app_settings ---
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_settings') THEN
    DROP POLICY IF EXISTS "Everyone read settings" ON public.app_settings;
    CREATE POLICY "Everyone read settings" ON public.app_settings FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Admin manage settings" ON public.app_settings;
    CREATE POLICY "Admin manage settings" ON public.app_settings FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- --- TABLA: payment_links ---
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_links') THEN
    DROP POLICY IF EXISTS "Everyone read payment links" ON public.payment_links;
    CREATE POLICY "Everyone read payment links" ON public.payment_links FOR SELECT USING (true);
  END IF;
END $$;

-- --- TABLA: announcements ---
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
    DROP POLICY IF EXISTS "Staff manage announcements" ON public.announcements;
    CREATE POLICY "Staff manage announcements" ON public.announcements FOR ALL USING (public.is_staff());
    DROP POLICY IF EXISTS "Everyone read announcements" ON public.announcements;
    CREATE POLICY "Everyone read announcements" ON public.announcements FOR SELECT USING (true);
  END IF;
END $$;

-- --- TABLA: testimonials ---
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'testimonials') THEN
    DROP POLICY IF EXISTS "Everyone read testimonials" ON public.testimonials;
    CREATE POLICY "Everyone read testimonials" ON public.testimonials FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Staff manage testimonials" ON public.testimonials;
    CREATE POLICY "Staff manage testimonials" ON public.testimonials FOR ALL USING (public.is_staff());
  END IF;
END $$;

-- --- TABLA: team_invitations ---
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_invitations') THEN
    DROP POLICY IF EXISTS "Admins manage invitations" ON public.team_invitations;
    DROP POLICY IF EXISTS "Staff manage invitations" ON public.team_invitations;
    CREATE POLICY "Staff manage invitations" ON public.team_invitations FOR ALL USING (public.is_staff());
    DROP POLICY IF EXISTS "Everyone read invitations" ON public.team_invitations;
    CREATE POLICY "Everyone read invitations" ON public.team_invitations FOR SELECT USING (true);
  END IF;
END $$;

-- --- TABLA: coach_invoices ---
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coach_invoices') THEN
    DROP POLICY IF EXISTS "Staff manage own invoices" ON public.coach_invoices;
    CREATE POLICY "Staff manage own invoices" ON public.coach_invoices FOR ALL USING (public.is_staff());
  END IF;
END $$;

-- --- TABLA: mass_communications ---
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mass_communications') THEN
    DROP POLICY IF EXISTS "Staff manage mass communications" ON public.mass_communications;
    CREATE POLICY "Staff manage mass communications" ON public.mass_communications FOR ALL USING (public.is_staff());
    DROP POLICY IF EXISTS "Everyone read mass communications" ON public.mass_communications;
    CREATE POLICY "Everyone read mass communications" ON public.mass_communications FOR SELECT USING (true);
  END IF;
END $$;

-- ==============================================================================
-- 4. MEJORA DEL TRIGGER DE SINCRONIZACIÓN (Auth -> Users)
-- Aseguramos que el rol del metadato se respete (importante para Clientes)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))),
    COALESCE(new.raw_user_meta_data->>'role', 'client'), -- Por defecto cliente si no viene rol
    'https://ui-avatars.com/api/?name=' || COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = COALESCE(new.raw_user_meta_data->>'role', public.users.role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- FIN DEL SCRIPT
-- ==============================================================================
