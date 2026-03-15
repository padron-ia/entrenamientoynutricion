-- =====================================================
-- FIX: Políticas RLS para testimonials compatible con Mock Auth
-- =====================================================
-- PROBLEMA: auth.uid() es NULL porque el CRM usa autenticación mock
-- SOLUCIÓN: Políticas RLS que no dependen de auth.uid()
-- =====================================================

-- PASO 1: Eliminar políticas antiguas que requieren auth.uid()
DROP POLICY IF EXISTS "Staff puede ver todos los testimonios" ON testimonials;
DROP POLICY IF EXISTS "Staff puede crear testimonios" ON testimonials;
DROP POLICY IF EXISTS "Staff puede crear testimonios v2" ON testimonials;
DROP POLICY IF EXISTS "Staff puede actualizar testimonios" ON testimonials;
DROP POLICY IF EXISTS "Admin y RRSS pueden eliminar testimonios" ON testimonials;
DROP POLICY IF EXISTS "Coaches solo ven sus testimonios" ON testimonials;
DROP POLICY IF EXISTS "coaches_own_testimonials" ON testimonials;

-- PASO 2: Crear nuevas políticas compatibles con Mock Auth

-- Política SELECT: Todos pueden leer testimonials
CREATE POLICY "Permitir lectura de testimonials" ON testimonials
    FOR SELECT
    USING (true);

-- Política INSERT: Permitir inserción si el coach_id existe en users con rol válido
CREATE POLICY "Permitir inserción de testimonials" ON testimonials
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = coach_id
            AND users.role IN ('admin', 'head_coach', 'coach', 'rrss', 'direccion')
        )
    );

-- Política UPDATE: Todos pueden actualizar
-- (En producción, podrías restringir esto más)
CREATE POLICY "Permitir actualización de testimonials" ON testimonials
    FOR UPDATE
    USING (true);

-- Política DELETE: Todos pueden eliminar
-- (En producción, podrías restringir esto a solo admin/rrss)
CREATE POLICY "Permitir eliminación de testimonials" ON testimonials
    FOR DELETE
    USING (true);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver las políticas aplicadas:
SELECT 
    policyname, 
    cmd as operacion,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual::text
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check::text
        ELSE 'Sin restricción'
    END as condicion
FROM pg_policies
WHERE tablename = 'testimonials'
ORDER BY cmd;

-- =====================================================
-- PRUEBA
-- =====================================================
-- Ahora Juan debería poder insertar testimonios.
-- Prueba con esta query (reemplaza los valores con datos reales):

-- INSERT INTO testimonials (
--     coach_id, 
--     coach_name, 
--     client_name, 
--     client_surname, 
--     client_phone, 
--     testimonial_type, 
--     media_url, 
--     notes
-- )
-- VALUES (
--     'juan-id',           -- Reemplaza con el ID real de Juan en la tabla users
--     'Juan',              -- Nombre del coach
--     'Cliente',           -- Nombre del cliente
--     'Prueba',            -- Apellido del cliente
--     '+34600000000',      -- Teléfono
--     'video',             -- Tipo: video, image, text, audio
--     'https://drive.google.com/test',  -- URL del material
--     'Testimonio de prueba'            -- Notas
-- )
-- RETURNING *;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Estas políticas funcionan con autenticación MOCK
-- 2. Son más permisivas que las originales (que usaban auth.uid())
-- 3. La única validación en INSERT es que el coach_id exista en users
-- 4. Si en el futuro migras a Supabase Auth real, deberás actualizar
--    estas políticas para usar auth.uid() de nuevo
-- 5. RLS sigue activo, solo las políticas son más permisivas
