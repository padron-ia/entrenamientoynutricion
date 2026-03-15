-- ==============================================================================
-- 🚀 CRM DATA SYNC: ROBUST METRICS & AUTO-ASSIGNMENT (CONFLICT-FREE)
-- Desc: Fixes daily metrics to use names as fallback for coaches not yet registered,
--       and prepares the trigger for automatic assignment when they do sign up.
-- ==============================================================================

-- 1. CLEANUP: DUPLICATES & GHOST RECORDS
-- Remove clients without a name or email (data integrity)
DELETE FROM public.clientes_pt_notion 
WHERE property_nombre IS NULL OR property_nombre = ''
   OR property_correo_electr_nico IS NULL OR property_correo_electr_nico = '';

-- Remove duplicates (keep latest by updated_at)
WITH duplicados AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY LOWER(property_correo_electr_nico) 
               ORDER BY updated_at DESC
           ) as ranking
    FROM public.clientes_pt_notion
)
DELETE FROM public.clientes_pt_notion 
WHERE id IN (SELECT id FROM duplicados WHERE ranking > 1);

-- 2. ROBUST AUTO-ASSIGN TRIGGER
-- This function will automatically link clients to coaches as soon as they are
-- registered in the CRM. No manual sync needed later.
CREATE OR REPLACE FUNCTION public.fn_auto_assign_coach()
RETURNS TRIGGER AS $$
DECLARE
    v_coach_id TEXT;
BEGIN
    -- Only act if coach_id is NULL and property_coach has text
    IF (NEW.coach_id IS NULL AND NEW.property_coach IS NOT NULL AND NEW.property_coach != '') THEN
        
        -- Try match in users table by name or email
        SELECT id INTO v_coach_id 
        FROM public.users 
        WHERE LOWER(name) = LOWER(NEW.property_coach)
           OR LOWER(email) = LOWER(NEW.property_coach)
           OR NEW.property_coach ILIKE '%' || name || '%'
        LIMIT 1;

        -- Assign if found
        IF (v_coach_id IS NOT NULL) THEN
            NEW.coach_id := v_coach_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_assign_coach ON public.clientes_pt_notion;
CREATE TRIGGER tr_auto_assign_coach
    BEFORE INSERT OR UPDATE ON public.clientes_pt_notion
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auto_assign_coach();

-- 3. UPDATED METRICS FUNCTION (With Name Fallback)
-- This ensures Esperanza, Juan, and Helena are counted by name even before registration.
CREATE OR REPLACE FUNCTION snapshot_daily_metrics()
RETURNS void AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    v_total_active INTEGER;
    v_total_active_high_ticket INTEGER;
    v_total_paused INTEGER;
    v_new_signups INTEGER;
    v_renewals INTEGER;
    v_cancellations INTEGER;
    v_pauses_started INTEGER;
    v_dropouts INTEGER;
    v_coach_metrics JSONB;
    v_checkins_received INTEGER;
    v_checkins_reviewed INTEGER;
BEGIN
    -- [A] ESTADO ACTUAL (Activos Reales)
    -- Consideramos ACTIVO si el estado es 'Activo' Y no ha caducado el contrato
    SELECT COUNT(*) INTO v_total_active 
    FROM public.clientes_pt_notion 
    WHERE property_estado_cliente = 'Activo'
      AND (
        public.safe_extract_date(property_fecha_fin_contrato_actual) >= today_date 
        OR property_fecha_fin_contrato_actual IS NULL
      );
    
    -- [B] MÉTRICAS POR COACH (Fallback a Nombre si no hay ID)
    -- Esto permite ver a los coaches que aún no se han registrado en el sistema.
    SELECT COALESCE(jsonb_object_agg(coach_id_or_name, count), '{}'::jsonb) INTO v_coach_metrics
    FROM (
        SELECT 
            COALESCE(coach_id, property_coach, 'DESCONOCIDO') as coach_id_or_name, 
            COUNT(*) as count
        FROM public.clientes_pt_notion
        WHERE property_estado_cliente = 'Activo'
          AND (
            public.safe_extract_date(property_fecha_fin_contrato_actual) >= today_date 
            OR property_fecha_fin_contrato_actual IS NULL
          )
        GROUP BY 1
    ) sub;

    -- [C] OTROS INDICADORES (Simplificados para robustez)
    SELECT COUNT(*) INTO v_total_active_high_ticket FROM public.clientes_pt_notion 
    WHERE property_estado_cliente = 'Activo' AND (high_ticket = TRUE OR property_tipo_de_programa::TEXT ILIKE '%premium%');

    SELECT COUNT(*) INTO v_total_paused FROM public.clientes_pt_notion WHERE property_estado_cliente = 'Pausa';

    SELECT COUNT(*) INTO v_new_signups FROM public.clientes_pt_notion
    WHERE public.safe_extract_date(property_fecha_alta) = today_date OR DATE(created_at) = today_date;

    SELECT COUNT(*) INTO v_renewals FROM public.clientes_pt_notion
    WHERE property_estado_cliente = 'Activo' AND public.safe_extract_date(property_inicio_programa) = today_date AND DATE(created_at) < today_date;

    SELECT COUNT(*) INTO v_cancellations FROM public.clientes_pt_notion
    WHERE property_estado_cliente = 'Baja' AND public.safe_extract_date(property_fecha_de_baja) = today_date;

    -- [D] GUARDADO FINAL
    INSERT INTO public.daily_metrics (
        date,
        total_active_clients,
        total_active_high_ticket,
        total_paused_clients,
        new_signups,
        renewals,
        cancellations,
        active_clients_by_coach,
        created_at
    ) VALUES (
        today_date,
        v_total_active,
        v_total_active_high_ticket,
        v_total_paused,
        v_new_signups,
        v_renewals,
        v_cancellations,
        v_coach_metrics,
        NOW()
    )
    ON CONFLICT (date) DO UPDATE SET
        total_active_clients = EXCLUDED.total_active_clients,
        total_active_high_ticket = EXCLUDED.total_active_high_ticket,
        total_paused_clients = EXCLUDED.total_paused_clients,
        new_signups = EXCLUDED.new_signups,
        renewals = EXCLUDED.renewals,
        cancellations = EXCLUDED.cancellations,
        active_clients_by_coach = EXCLUDED.active_clients_by_coach,
        created_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- 4. RUN INITIAL SNAPSHOT
SELECT snapshot_daily_metrics();
