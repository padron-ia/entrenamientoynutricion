-- 0. ASEGURAR EXTENSIÓN PARA CONTRASEÑAS (Ejecutar esto primero)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. REGISTRAR ADMINS (admin@demo.com y admin_test@academia.com)
-- ... (rest of registration) ...
DO $$
BEGIN
    -- Registro para admin@demo.com
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@demo.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, email_change)
        VALUES (uuid_generate_v4(), 'admin@demo.com', crypt('admin123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Demo","role":"admin"}', now(), now(), 'authenticated', '', '', '', '');
    END IF;

    -- Registro para admin_test@academia.com
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin_test@academia.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, email_change)
        VALUES (uuid_generate_v4(), 'admin_test@academia.com', crypt('admin123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Test","role":"admin"}', now(), now(), 'authenticated', '', '', '', '');
    END IF;
END $$;

-- 3. ASEGURAR QUE ESTÁN EN LA TABLA PÚBLICA CON EL ROL CORRECTO
UPDATE public.users SET role = 'admin', name = 'Admin de Prueba' WHERE email = 'admin@demo.com';
UPDATE public.users SET role = 'admin', name = 'Admin Test Academia' WHERE email = 'admin_test@academia.com';

-- ==============================================================================
-- ⚠️ IMPORTANTE ⚠️
-- 1. EJECUTA EL SQL Y DALE A "RUN".
-- 2. EN TU TERMINAL, EJECUTA: npm run build (Si usas producción)
-- 3. USA EMAIL: admin_test@academia.com / PASS: admin123
-- 4. CONFIRMA QUE NO APARECE "Backdoor detectado" EN LA CONSOLA (F12).
-- ==============================================================================
