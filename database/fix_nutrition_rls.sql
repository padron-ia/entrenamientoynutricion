-- ==========================================
-- FIX: Asegurar RLS y políticas en tablas de nutrición
-- Ejecutar en Supabase SQL Editor
-- ==========================================
-- PROBLEMA: Error 400 al cargar asignaciones de nutrición
-- CAUSA: Las políticas RLS no permitían a usuarios autenticados acceder a las tablas

-- 1. Habilitar RLS en las tablas (si no está habilitado)
ALTER TABLE IF EXISTS nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS nutrition_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_nutrition_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_nutrition_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS nutrition_plan_versions ENABLE ROW LEVEL SECURITY;

-- 2. Crear políticas permisivas (cualquier usuario autenticado puede ver/editar)
-- Usamos CREATE OR REPLACE para evitar errores si ya existen

DO $$ 
BEGIN
  -- Políticas para nutrition_plans
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nutrition_plans' AND policyname = 'Authenticated users can manage nutrition plans') THEN
    CREATE POLICY "Authenticated users can manage nutrition plans" ON nutrition_plans
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Políticas para nutrition_recipes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nutrition_recipes' AND policyname = 'Authenticated users can manage recipes') THEN
    CREATE POLICY "Authenticated users can manage recipes" ON nutrition_recipes
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Políticas para client_nutrition_assignments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_nutrition_assignments' AND policyname = 'Authenticated users can manage assignments') THEN
    CREATE POLICY "Authenticated users can manage assignments" ON client_nutrition_assignments
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Políticas para client_nutrition_overrides
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_nutrition_overrides' AND policyname = 'Authenticated users can manage overrides') THEN
    CREATE POLICY "Authenticated users can manage overrides" ON client_nutrition_overrides
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Políticas para nutrition_plan_versions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nutrition_plan_versions' AND policyname = 'Authenticated users can view versions') THEN
    CREATE POLICY "Authenticated users can view versions" ON nutrition_plan_versions
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- 3. Verificar que las políticas se han creado
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename IN ('nutrition_plans', 'nutrition_recipes', 'client_nutrition_assignments', 'client_nutrition_overrides', 'nutrition_plan_versions')
ORDER BY tablename;
