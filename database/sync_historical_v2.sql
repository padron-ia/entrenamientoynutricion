
-- SCRIPT DE MIGRACIÓN HISTÓRICA V2 (SIMPLIFICADO)
-- Este script rescata las fechas y motivos de baja y las inserta en las nuevas tablas de historial.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. MIGRAR BAJAS (INACTIVE)
    FOR r IN (
        SELECT id, property_fecha_de_baja, property_motivo_baja
        FROM public.clientes_pt_notion 
        WHERE property_fecha_de_baja IS NOT NULL 
          AND property_fecha_de_baja::text NOT IN ('null', '', '[]')
    ) LOOP
        BEGIN
            INSERT INTO public.client_status_history (client_id, old_status, new_status, change_date, reason)
            VALUES (
                r.id, 
                'active', 
                'inactive', 
                r.property_fecha_de_baja::text::timestamp with time zone,
                COALESCE(r.property_motivo_baja::text, 'Migración histórica')
            ) ON CONFLICT DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error migrando baja para cliente %: %', r.id, SQLERRM;
        END;
    END LOOP;

    -- 2. MIGRAR ABANDONOS (DROPOUT)
    FOR r IN (
        SELECT id, property_fecha_abandono, property_motivo_abandono
        FROM public.clientes_pt_notion 
        WHERE property_fecha_abandono IS NOT NULL 
          AND property_fecha_abandono::text NOT IN ('null', '', '[]')
    ) LOOP
        BEGIN
            INSERT INTO public.client_status_history (client_id, old_status, new_status, change_date, reason)
            VALUES (
                r.id, 
                'active', 
                'dropout', 
                r.property_fecha_abandono::text::timestamp with time zone,
                COALESCE(r.property_motivo_abandono::text, 'Migración histórica')
            ) ON CONFLICT DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error migrando abandono para cliente %: %', r.id, SQLERRM;
        END;
    END LOOP;

    -- 3. MIGRAR PAUSAS (CONTRACT_PAUSES)
    FOR r IN (
        SELECT id, property_fecha_pausa, property_motivo_pausa
        FROM public.clientes_pt_notion 
        WHERE property_fecha_pausa IS NOT NULL 
          AND property_fecha_pausa::text NOT IN ('null', '', '[]')
    ) LOOP
        BEGIN
            INSERT INTO public.contract_pauses (client_id, start_date, reason)
            VALUES (
                r.id, 
                r.property_fecha_pausa::text::timestamp with time zone,
                COALESCE(r.property_motivo_pausa::text, 'Pausa histórica')
            ) ON CONFLICT DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error migrando pausa para cliente %: %', r.id, SQLERRM;
        END;
    END LOOP;
END $$;
