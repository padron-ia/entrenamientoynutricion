-- ==============================================================================
-- 🚨 SUPER-FIX: REPARACIÓN DE TABLA USERS Y RLS 🚨
-- ==============================================================================
-- Este script soluciona el error 'column "role" does not exist' y asegura el admin.
-- ==============================================================================

-- 1. REPARAR SCHEMA (Por si falta la columna role)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'coach';
        RAISE NOTICE 'Columna "role" creada exitosamente.';
    ELSE
        RAISE NOTICE 'Columna "role" ya existe.';
    END IF;
END $$;

-- 2. ASEGURAR QUE LOS ROLES PERMITIDOS SON CORRECTOS
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'head_coach', 'coach', 'closer', 'setter', 'contabilidad', 'endocrino', 'psicologo', 'rrss', 'client'));

-- 3. REGISTRAR / VINCULAR AL ADMINISTRADOR
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin_test@academia.com';
    
    IF v_user_id IS NOT NULL THEN
        -- Sincronizamos con public.users (usando TEXT para el ID por compatibilidad)
        INSERT INTO public.users (id, email, name, role)
        VALUES (v_user_id::text, 'admin_test@academia.com', 'Admin Test Academia', 'admin')
        ON CONFLICT (id) DO UPDATE SET role = 'admin', name = 'Admin Test Academia';
        
        RAISE NOTICE 'Admin vinculado correctamente con ID: %', v_user_id;
    ELSE
        RAISE WARNING 'No se encontró el email admin_test@academia.com en Auth.';
    END IF;
END $$;

-- 4. RE-ESCRIBIR FUNCIONES DE SEGURIDAD (Versión Ultra-Robusta)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role 
  FROM public.users 
  WHERE id::text = auth.uid()::text 
  LIMIT 1;
  
  RETURN COALESCE(v_role, 'public');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id::text = auth.uid()::text 
    AND role IN ('admin', 'head_coach')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RE-APLICAR POLÍTICAS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage users" ON public.users;
CREATE POLICY "Admins manage users" ON public.users 
    FOR ALL 
    TO authenticated 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users: public read" ON public.users;
CREATE POLICY "Users: public read" ON public.users FOR SELECT USING (true);

-- 6. VERIFICACIÓN FINAL
SELECT id, email, name, role FROM public.users WHERE email = 'admin_test@academia.com';
