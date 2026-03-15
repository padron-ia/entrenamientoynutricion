-- Script para implementar el rol DIRECCION en la base de datos
-- Versión: 1.0
-- Fecha: 2026-02-02

-- 1. Actualizar el CHECK constraint de la tabla users
-- Nota: En Postgres no se puede modificar un check constraint directamente de forma sencilla, 
-- lo habitual es borrarlo y crearlo de nuevo.
DO $$
BEGIN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE public.users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'head_coach', 'coach', 'closer', 'setter', 'contabilidad', 'endocrino', 'psicologo', 'rrss', 'client', 'direccion'));
END $$;

-- 2. Actualizar la función is_staff para incluir 'direccion'
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
    SELECT public.get_auth_role() IN ('admin', 'head_coach', 'coach', 'closer', 'setter', 'contabilidad', 'endocrino', 'psicologo', 'rrss', 'direccion');
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Crear función is_direccion para políticas específicas
CREATE OR REPLACE FUNCTION public.is_direccion()
RETURNS BOOLEAN AS $$
    SELECT public.get_auth_role() = 'direccion';
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Insertar el usuario de prueba de dirección
-- Usamos un ID fijo para facilitar pruebas si no hay Auth configurado real
INSERT INTO public.users (id, email, name, role, commission_percentage) 
VALUES ('direccion-test-001', 'direccion@test.com', 'Victor Dirección', 'direccion', 0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role;

-- 5. Actualizar el perfil de Victor si ya existe (buscando por email típico)
-- Si ya existe un usuario con el email de Victor, le asignamos el rol
UPDATE public.users 
SET role = 'direccion' 
WHERE email = 'v.asensi@academiadiabetes.com' OR email = 'victor@academiadiabetes.com' OR email = 'direccion@test.com';

SELECT '✅ Rol DIRECCION configurado correctamente en la DB' AS resultado;
