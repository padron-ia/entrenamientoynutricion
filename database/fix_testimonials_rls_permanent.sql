-- =====================================================
-- SOLUCIÓN PERMANENTE: RLS para testimonials sin Supabase Auth
-- =====================================================
-- Este script configura las políticas RLS de forma que funcionen
-- de manera duradera con el sistema de autenticación mock del CRM
-- =====================================================

-- OPCIÓN A: Deshabilitar RLS completamente (MÁS SIMPLE Y DURADERO)
-- =====================================================
-- Esta es la solución más robusta si NO planeas usar Supabase Auth
-- El control de acceso se maneja en el código de la aplicación

ALTER TABLE testimonials DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Confirmar que RLS está deshabilitado:
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'testimonials';
-- Debería mostrar rls_enabled = false

-- =====================================================
-- ALTERNATIVA: Si prefieres mantener RLS activo
-- =====================================================
-- Descomenta este bloque si prefieres mantener RLS con políticas permisivas:

/*
-- Re-habilitar RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Política universal para SELECT
DROP POLICY IF EXISTS "public_read_testimonials" ON testimonials;
CREATE POLICY "public_read_testimonials" ON testimonials
    FOR SELECT
    USING (true);

-- Política universal para INSERT
DROP POLICY IF EXISTS "public_insert_testimonials" ON testimonials;
CREATE POLICY "public_insert_testimonials" ON testimonials
    FOR INSERT
    WITH CHECK (true);

-- Política universal para UPDATE
DROP POLICY IF EXISTS "public_update_testimonials" ON testimonials;
CREATE POLICY "public_update_testimonials" ON testimonials
    FOR UPDATE
    USING (true);

-- Política universal para DELETE
DROP POLICY IF EXISTS "public_delete_testimonials" ON testimonials;
CREATE POLICY "public_delete_testimonials" ON testimonials
    FOR DELETE
    USING (true);
*/

-- =====================================================
-- RECOMENDACIÓN
-- =====================================================
-- Para un CRM interno con autenticación mock:
-- 1. Deshabilitar RLS es la solución más simple y duradera
-- 2. El control de acceso se maneja en el código (TestimonialsManager.tsx)
-- 3. Solo usuarios autenticados en el CRM pueden acceder
-- 4. No hay riesgo si la base de datos no está expuesta públicamente
-- 
-- Si en el futuro migras a Supabase Auth:
-- 1. Vuelve a habilitar RLS: ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
-- 2. Aplica las políticas del archivo fix_testimonials_rls.sql original
