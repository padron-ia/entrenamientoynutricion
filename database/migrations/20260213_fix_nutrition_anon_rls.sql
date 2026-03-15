-- ==============================================================================
-- FIX: Añadir políticas anon a tablas de nutrición
-- ==============================================================================
-- Fecha: 2026-02-13
-- Problema: Las tablas de nutrición tienen RLS habilitado con políticas solo
--           para el rol 'authenticated', pero la app usa el anon key de Supabase
--           (autenticación propia, no Supabase Auth).
--           Resultado: getClientPlanWithRecipes no puede leer client_nutrition_assignments
--           y el cliente no ve las recetas actualizadas.
-- Afecta: nutrition_plans, nutrition_recipes, client_nutrition_assignments,
--         client_nutrition_overrides, nutrition_plan_versions
-- Solución: Añadir política permisiva para rol anon en todas las tablas
-- ==============================================================================

-- Reutilizar la función helper si existe, o crearla
CREATE OR REPLACE FUNCTION public.apply_anon_policy(table_name_text text)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = table_name_text
  ) THEN
    RAISE NOTICE 'Tabla % no existe, saltando...', table_name_text;
    RETURN;
  END IF;

  EXECUTE format('DROP POLICY IF EXISTS "Anon access" ON public.%I', table_name_text);
  EXECUTE format('CREATE POLICY "Anon access" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', table_name_text);

  RAISE NOTICE '%: política anon creada', table_name_text;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas de nutrición
SELECT public.apply_anon_policy('nutrition_plans');
SELECT public.apply_anon_policy('nutrition_recipes');
SELECT public.apply_anon_policy('client_nutrition_assignments');
SELECT public.apply_anon_policy('client_nutrition_overrides');
SELECT public.apply_anon_policy('nutrition_plan_versions');

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA: Políticas anon añadidas a tablas de nutrición';
  RAISE NOTICE '==============================================================================';
END $$;
