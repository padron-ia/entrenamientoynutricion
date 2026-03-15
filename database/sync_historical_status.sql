-- ====================================================================
-- MIGRACIÓN HISTÓRICA DEFINITIVA (SOPORTE TEXTO Y JSONB)
-- ====================================================================
-- Este script define funciones temporales para evitar errores de tipos
-- y sincronizar las bajas, abandonos y pausas de forma segura.

DO $$ 
BEGIN
    -- 1. Sincronizar Inactivos (Bajas)
    BEGIN
        INSERT INTO public.client_status_history (client_id, old_status, new_status, change_date, reason)
        SELECT 
            id as client_id,
            'active' as old_status, 
            'inactive' as new_status,
            -- Extracción segura de fecha
            CASE 
                WHEN property_fecha_de_baja::text ~ '^{.*"start"' THEN (property_fecha_de_baja::jsonb->>'start')::timestamp with time zone
                ELSE property_fecha_de_baja::text::timestamp with time zone
            END as change_date,
            -- Extracción segura de motivo
            COALESCE(NULLIF(
                CASE 
                    WHEN property_motivo_baja::text ~ '^{.*}' THEN (property_motivo_baja::jsonb->>'plain_text')
                    ELSE property_motivo_baja::text
                END, ''), 'Migración histórica') as reason
        FROM public.clientes_pt_notion
        WHERE property_fecha_de_baja IS NOT NULL 
          AND property_fecha_de_baja::text NOT IN ('null', '', '[]')
        ON CONFLICT (client_id, new_status, change_date) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Aviso: Algunos registros de bajas no pudieron migrarse por formato inválido';
    END;

    -- 2. Sincronizar Abandonos (Dropouts)
    BEGIN
        INSERT INTO public.client_status_history (client_id, old_status, new_status, change_date, reason)
        SELECT 
            id as client_id,
            'active' as old_status,
            'dropout' as new_status,
            CASE 
                WHEN property_fecha_abandono::text ~ '^{.*"start"' THEN (property_fecha_abandono::jsonb->>'start')::timestamp with time zone
                ELSE property_fecha_abandono::text::timestamp with time zone
            END as change_date,
            COALESCE(NULLIF(
                CASE 
                    WHEN property_motivo_abandono::text ~ '^{.*}' THEN (property_motivo_abandono::jsonb->>'plain_text')
                    ELSE property_motivo_abandono::text
                END, ''), 'Migración histórica') as reason
        FROM public.clientes_pt_notion
        WHERE property_fecha_abandono IS NOT NULL 
          AND property_fecha_abandono::text NOT IN ('null', '', '[]')
        ON CONFLICT (client_id, new_status, change_date) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Aviso: Algunos registros de abandonos no pudieron migrarse por formato inválido';
    END;

    -- 3. Sincronizar Pausas
    BEGIN
        INSERT INTO public.contract_pauses (client_id, start_date, reason)
        SELECT 
            id as client_id,
            CASE 
                WHEN property_fecha_pausa::text ~ '^{.*"start"' THEN (property_fecha_pausa::jsonb->>'start')::timestamp with time zone
                ELSE property_fecha_pausa::text::timestamp with time zone
            END as start_date,
            COALESCE(NULLIF(
                CASE 
                    WHEN property_motivo_pausa::text ~ '^{.*}' THEN (property_motivo_pausa::jsonb->>'plain_text')
                    ELSE property_motivo_pausa::text
                END, ''), 'Migración histórica') as reason
        FROM public.clientes_pt_notion
        WHERE property_fecha_pausa IS NOT NULL 
          AND property_fecha_pausa::text NOT IN ('null', '', '[]')
        AND NOT EXISTS (
            SELECT 1 FROM public.contract_pauses p 
            WHERE p.client_id = public.clientes_pt_notion.id 
            AND p.start_date = (CASE 
                WHEN property_fecha_pausa::text ~ '^{.*"start"' THEN (property_fecha_pausa::jsonb->>'start')::timestamp with time zone
                ELSE property_fecha_pausa::text::timestamp with time zone
            END)
        );
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Aviso: Algunos registros de pausas no pudieron migrarse por formato inválido';
    END;
END $$;
