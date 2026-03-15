-- ==============================================================================
-- 🔐 RE-REGISTRO SEGURO: VICTOR BRAVO (Supabase Auth) 🔐
-- ==============================================================================
-- Este script registra a Victor Bravo como el administrador principal.
-- Clave por defecto: admin123
-- ==============================================================================

-- 1. ASEGURAR EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. OPERACIÓN ATÓMICA PARA VICTOR BRAVO
DO $$
DECLARE
    v_user_id uuid;
    v_email text := 'doctorvictorbravo@gmail.com';
BEGIN
    -- Buscamos si ya existe en auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    IF v_user_id IS NOT NULL THEN
        -- ACTUALIZAR EXISTENTE
        UPDATE auth.users 
        SET encrypted_password = crypt('admin123', gen_salt('bf', 10)),
            raw_app_meta_data = raw_app_meta_data || '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
            raw_user_meta_data = raw_user_meta_data || '{"full_name":"Victor Bravo","role":"admin"}'::jsonb,
            updated_at = now(),
            role = 'authenticated',
            aud = 'authenticated',
            email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE id = v_user_id;
        RAISE NOTICE 'Admin Victor Bravo actualizado. ID: %', v_user_id;
    ELSE
        -- CREAR NUEVO
        v_user_id := uuid_generate_v4();
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
        )
        VALUES (
            v_user_id, '00000000-0000-0000-0000-000000000000', v_email, 
            crypt('admin123', gen_salt('bf', 10)), now(), 
            '{"provider":"email","providers":["email"],"role":"admin"}',
            '{"full_name":"Victor Bravo","role":"admin"}',
            'authenticated', 'authenticated', now(), now()
        );
        RAISE NOTICE 'Admin Victor Bravo creado. ID: %', v_user_id;
    END IF;

    -- 3. VINCULAR CON LA TABLA PÚBLICA (Siempre asegurar el rol admin)
    INSERT INTO public.users (id, email, name, role)
    VALUES (v_user_id::text, v_email, 'Victor Bravo', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', name = 'Victor Bravo';

END $$;

-- 4. PLAN B: BYPASS TOTAL DE RLS PARA VICTOR BRAVO
-- Esto asegura que pueda guardar aunque el login real falle momentáneamente.
DROP POLICY IF EXISTS "Bypass for Victor Bravo" ON public.users;
CREATE POLICY "Bypass for Victor Bravo" ON public.users 
    FOR ALL 
    TO authenticated, anon
    USING (id::text IN (SELECT id::text FROM public.users WHERE email = 'doctorvictorbravo@gmail.com'))
    WITH CHECK (id::text IN (SELECT id::text FROM public.users WHERE email = 'doctorvictorbravo@gmail.com'));

-- Habilitar lectura pública de usuarios (necesario para el CRM)
DROP POLICY IF EXISTS "Public read users" ON public.users;
CREATE POLICY "Public read users" ON public.users FOR SELECT USING (true);

-- 5. VERIFICACIÓN FINAL
SELECT id, email, role, name FROM public.users WHERE email = 'doctorvictorbravo@gmail.com';
