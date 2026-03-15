-- ==============================================================================
-- 🛡️ REPARACIÓN DE PERMISOS RLS: ACCESO TOTAL PARA ALUMNOS (V3 FINAL) 🛡️
-- ==============================================================================

-- 1. FUNCIÓN DE VÍNCULO ROBUSTO (Con casting total)
CREATE OR REPLACE FUNCTION public.is_own_client_data(p_client_id text)
RETURNS boolean AS $$
DECLARE
    v_user_email text;
BEGIN
    -- 1. Si es Staff, tiene permiso total
    IF public.is_staff() THEN RETURN true; END IF;

    -- 2. El ID del usuario autenticado coincide con el ID del registro solicitado
    IF auth.uid()::text = p_client_id THEN RETURN true; END IF;

    -- 3. Caso especial: El usuario está vinculado como 'user_id' en clientes_pt_notion
    IF EXISTS (
        SELECT 1 FROM public.clientes_pt_notion 
        WHERE id::text = p_client_id AND user_id::text = auth.uid()::text
    ) THEN RETURN true; END IF;

    -- 4. Fallback por Email
    -- Obtenemos el email del auth.users forzando casting para evitar el error UUID/TEXT
    SELECT email INTO v_user_email FROM auth.users WHERE id::text = auth.uid()::text;
    
    IF v_user_email IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.clientes_pt_notion 
        WHERE id::text = p_client_id 
        AND (property_correo_electr_nico = v_user_email OR property_email = v_user_email)
    ) THEN RETURN true; END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. LIMPIEZA DE POLÍTICAS CONFLICTIVAS EN clientes_pt_notion
-- Borramos TODAS las políticas previas para evitar que las antiguas causen errores de tipo.
DROP POLICY IF EXISTS "Clients see own profile" ON public.clientes_pt_notion;
DROP POLICY IF EXISTS "Clients update own profile" ON public.clientes_pt_notion;
DROP POLICY IF EXISTS "Clients see own" ON public.clientes_pt_notion;

-- Nuevas políticas robustas para la tabla principal
CREATE POLICY "Clients see own" ON public.clientes_pt_notion 
FOR SELECT USING (public.is_own_client_data(id::text));

CREATE POLICY "Clients update own" ON public.clientes_pt_notion 
FOR UPDATE USING (public.is_own_client_data(id::text)) 
WITH CHECK (public.is_own_client_data(id::text));

-- 3. APLICAR A TABLAS DE PROGRESO
CREATE OR REPLACE FUNCTION public.apply_final_client_policies(table_name_text text)
RETURNS void AS $$
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "Client see own" ON public.%I', table_name_text);
    EXECUTE format('DROP POLICY IF EXISTS "Client insert own" ON public.%I', table_name_text);
    EXECUTE format('DROP POLICY IF EXISTS "Client update own" ON public.%I', table_name_text);
    
    EXECUTE format('CREATE POLICY "Client see own" ON public.%I FOR SELECT USING (public.is_own_client_data(client_id::text))', table_name_text);
    EXECUTE format('CREATE POLICY "Client insert own" ON public.%I FOR INSERT WITH CHECK (public.is_own_client_data(client_id::text))', table_name_text);
    EXECUTE format('CREATE POLICY "Client update own" ON public.%I FOR UPDATE USING (public.is_own_client_data(client_id::text))', table_name_text);
END;
$$ LANGUAGE plpgsql;

SELECT public.apply_final_client_policies('weight_history');
SELECT public.apply_final_client_policies('glucose_readings');
SELECT public.apply_final_client_policies('hba1c_history');
SELECT public.apply_final_client_policies('body_measurements');
SELECT public.apply_final_client_policies('daily_checkins');
SELECT public.apply_final_client_policies('weekly_checkins');

-- 4. SOPORTE Y TICKETS
DROP POLICY IF EXISTS "Clients see own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Clients create own tickets" ON public.support_tickets;

CREATE POLICY "Clients see own tickets" ON public.support_tickets 
FOR SELECT USING (public.is_own_client_data(client_id::text));

CREATE POLICY "Clients create own tickets" ON public.support_tickets 
FOR INSERT WITH CHECK (public.is_own_client_data(client_id::text));

-- ==============================================================================
-- FIN DE LA REPARACIÓN
-- ==============================================================================
