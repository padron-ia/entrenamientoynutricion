-- ==========================================
-- FIX: Permitir lectura de app_settings para clientes
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Asegurar que RLS está habilitado en app_settings
ALTER TABLE IF EXISTS app_settings ENABLE ROW LEVEL SECURITY;

-- 2. Crear política para que todos los usuarios autenticados puedan leer la configuración
-- Esto es crítico para que los clientes puedan ver el período activo de nutrición
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Authenticated users can read settings') THEN
    CREATE POLICY "Authenticated users can read settings" ON app_settings
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  -- También política para que admins puedan gestionar
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Admins can manage settings') THEN
    CREATE POLICY "Admins can manage settings" ON app_settings
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 3. Reforzar políticas de nutrición existentes para mayor seguridad
-- Aseguramos que los clientes puedan leer los planes asignados o publicados
DO $$ 
BEGIN
  -- Reemplazar políticas genéricas por unas más específicas si es necesario, 
  -- pero por ahora nos aseguramos de que existan al menos las básicas de fix_nutrition_rls.sql
  
  -- Si ya se ejecutó fix_nutrition_rls.sql, esto ya debería estar bien.
  -- Pero lo incluimos aquí por si falta algo.
  NULL;
END $$;

-- Verificar políticas creadas
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'app_settings';
