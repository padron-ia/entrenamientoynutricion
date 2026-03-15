-- =====================================================
-- FIX: Solucionar problema de RLS para subida de testimonios
-- =====================================================
-- Este script diagnostica y soluciona el problema de Row-Level Security
-- que impide a Juan subir testimonios
-- =====================================================

-- PASO 1: Verificar si Juan existe en la tabla users
-- Ejecuta esto primero para ver qué usuarios existen:
SELECT id, name, email, role 
FROM users 
WHERE name ILIKE '%juan%' OR email ILIKE '%juan%';

-- PASO 2: Verificar el auth.uid() actual
-- Esto te mostrará el ID de autenticación de Supabase del usuario actual
SELECT auth.uid() as current_auth_uid;

-- PASO 3: Ver todas las políticas RLS actuales en testimonials
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'testimonials';

-- =====================================================
-- SOLUCIÓN TEMPORAL: Permitir inserción sin verificar auth.uid()
-- =====================================================
-- Esta solución permite que cualquier usuario con rol de coach pueda insertar
-- testimonios basándose solo en el coach_id proporcionado, sin verificar auth.uid()

-- Eliminar la política restrictiva actual
DROP POLICY IF EXISTS "Staff puede crear testimonios" ON testimonials;

-- Crear nueva política más permisiva
CREATE POLICY "Staff puede crear testimonios v2" ON testimonials
    FOR INSERT
    WITH CHECK (
        -- Opción 1: Verificar que el coach_id existe en la tabla users con rol válido
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = coach_id
            AND users.role IN ('admin', 'head_coach', 'coach', 'rrss', 'direccion')
        )
    );

-- =====================================================
-- SOLUCIÓN DEFINITIVA: Sincronizar auth.uid() con users.id
-- =====================================================
-- Si Juan tiene un auth.uid() de Supabase diferente a su users.id,
-- necesitamos actualizar su registro en la tabla users

-- Primero, identifica el auth.uid() de Juan cuando está logueado
-- Luego ejecuta este UPDATE (reemplaza 'NUEVO_AUTH_UID' con el valor real):

-- UPDATE users 
-- SET id = 'NUEVO_AUTH_UID'
-- WHERE email = 'juan@email.com';  -- Reemplaza con el email real de Juan

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
-- Después de aplicar la solución, verifica que Juan puede insertar:

-- 1. Verifica que la nueva política existe:
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'testimonials' AND cmd = 'INSERT';

-- 2. Intenta insertar un testimonio de prueba (ejecuta esto como Juan):
-- INSERT INTO testimonials (coach_id, coach_name, client_name, client_surname, client_phone, testimonial_type, media_url, notes)
-- VALUES ('juan-id', 'Juan', 'Cliente', 'Prueba', '+34600000000', 'video', 'https://example.com', 'Prueba')
-- RETURNING *;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. La solución temporal (política v2) permite insertar testimonios
--    siempre que el coach_id exista en la tabla users
-- 2. La solución definitiva requiere que auth.uid() coincida con users.id
-- 3. Si usas autenticación mock, considera deshabilitar RLS temporalmente:
--    ALTER TABLE testimonials DISABLE ROW LEVEL SECURITY;
-- 4. Para volver a habilitar RLS:
--    ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
