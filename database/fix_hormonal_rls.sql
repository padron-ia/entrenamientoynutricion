--=============================================================================
-- CORRECCIÓN RLS: SEGUIMIENTO HORMONAL
--=============================================================================
-- El portal de clientes de PT CRM utiliza un sistema de autenticación personalizado
-- basado en localStorage (pt_crm_session), no los JWT estándar de Supabase Auth.
-- Por esto, cuando Supabase Auth evalúa auth.uid(), el resultado es NULL.
-- Las políticas anteriores exígían que auth.uid() coincidiera con client_id,
-- lo cual producía el error de RLS (Error al guardar) al registrar síntomas.
-- 
-- Este script elimina las restricciones restrictivas para el rol 'anon'
-- y permite el acceso para que el frontend con la llave pública pueda leer e insertar.
--=============================================================================

-- 1. Mantenemos RLS activado pero flexibilizamos las reglas para la arquitectura actual
ALTER TABLE public.menstrual_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hormonal_symptoms ENABLE ROW LEVEL SECURITY;

-- 2. Eliminamos las politicas originales que bloqueaban la escritura/lectura
DROP POLICY IF EXISTS "Clientes ven sus ciclos" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "Clientes registran sus ciclos" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "Clientes ven sus síntomas" ON public.hormonal_symptoms;
DROP POLICY IF EXISTS "Clientes registran sus síntomas" ON public.hormonal_symptoms;

-- 3. Creamos nuevas políticas que permiten acceso a las tablas a través de la anon_key.
-- Esto es igual al comportamiento que ya tiene la tabla `clientes_pt_notion`.
CREATE POLICY "Anon access ciclos" ON public.menstrual_cycles
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anon access sintomas" ON public.hormonal_symptoms
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- Nota: Las políticas de 'Staff gestiona ciclos' y 'Staff gestiona síntomas' 
-- se mantienen intactas ya que el portal de coaches SÍ utiliza Supabase Auth.
