-- =====================================================
-- CONFIGURACIÓN DEL BUCKET DE FOTOS DE EQUIPO
-- =====================================================
-- Este script crea el bucket para fotos de perfil del equipo
-- y configura las políticas de seguridad necesarias

-- 1. Crear el bucket si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-photos', 'team-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Eliminar políticas existentes (si las hay)
DROP POLICY IF EXISTS "Permitir subida de fotos de equipo" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura pública de fotos de equipo" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de fotos de equipo" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de fotos de equipo" ON storage.objects;

-- 3. POLÍTICA: Permitir a cualquiera subir fotos (INSERT)
-- Esto es necesario para el proceso de onboarding donde el usuario aún no está autenticado
CREATE POLICY "Permitir subida de fotos de equipo"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'team-photos');

-- 4. POLÍTICA: Permitir lectura pública (SELECT)
-- Las fotos de perfil deben ser visibles públicamente
CREATE POLICY "Permitir lectura pública de fotos de equipo"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'team-photos');

-- 5. POLÍTICA: Permitir actualización (UPDATE)
-- Permitir a cualquiera actualizar (para cambios de foto)
CREATE POLICY "Permitir actualización de fotos de equipo"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'team-photos')
WITH CHECK (bucket_id = 'team-photos');

-- 6. POLÍTICA: Permitir eliminación (DELETE)
-- Permitir a cualquiera eliminar (para limpiar fotos antiguas)
CREATE POLICY "Permitir eliminación de fotos de equipo"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'team-photos');

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Verificar que el bucket se creó correctamente
SELECT * FROM storage.buckets WHERE id = 'team-photos';

-- Verificar las políticas
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%equipo%';
