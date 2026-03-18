-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                              ║
-- ║   MODULO PRESENCIAL - CRON JOBS                                              ║
-- ║                                                                              ║
-- ║   1. Expiracion mensual de creditos (dia 1 a las 00:05)                      ║
-- ║   2. Recordatorios de clase (cada 30 min, 2h antes de la clase)              ║
-- ║                                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- FUNCION: expire_monthly_credits
-- Marca como expirados los creditos cuyo valid_until ya paso.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.expire_monthly_credits()
RETURNS void AS $$
BEGIN
    UPDATE gym_member_credits
    SET is_expired = true,
        updated_at = NOW()
    WHERE valid_until < CURRENT_DATE
    AND is_expired = false
    AND payment_status = 'completed';

    -- Cancelar reservas en lista de espera con creditos expirados
    UPDATE gym_reservations
    SET status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_type = 'system'
    WHERE status = 'waitlisted'
    AND credit_id IN (
        SELECT id FROM gym_member_credits WHERE is_expired = true
    );
END;
$$ LANGUAGE plpgsql;

-- Ejecutar cada dia 1 del mes a las 00:05
SELECT cron.schedule(
    'expire-monthly-gym-credits',
    '5 0 1 * *',
    $$SELECT public.expire_monthly_credits();$$
);


-- ============================================================================
-- FUNCION: send_class_reminders
-- Envia notificacion a miembros con clase en ~2 horas.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_class_reminders()
RETURNS void AS $$
DECLARE
    v_slot RECORD;
    v_member RECORD;
BEGIN
    -- Buscar clases que empiezan entre 1h50m y 2h10m desde ahora
    FOR v_slot IN
        SELECT cs.id, cs.date, cs.start_time,
               COALESCE(cs.title, st.name) AS display_name
        FROM gym_class_slots cs
        JOIN gym_service_types st ON cs.service_type_id = st.id
        WHERE cs.is_cancelled = false
        AND (cs.date + cs.start_time) BETWEEN (NOW() + interval '1 hour 50 minutes')
                                           AND (NOW() + interval '2 hours 10 minutes')
    LOOP
        FOR v_member IN
            SELECT gm.user_id
            FROM gym_reservations r
            JOIN gym_members gm ON r.member_id = gm.id
            WHERE r.class_slot_id = v_slot.id
            AND r.status = 'confirmed'
            AND gm.user_id IS NOT NULL
        LOOP
            -- Evitar duplicados (no enviar si ya se notifico en las ultimas 3h)
            IF NOT EXISTS (
                SELECT 1 FROM notifications
                WHERE user_id = v_member.user_id
                AND type = 'system'
                AND title = 'Recordatorio de clase'
                AND created_at > NOW() - interval '3 hours'
                AND message LIKE '%' || v_slot.display_name || '%'
            ) THEN
                INSERT INTO notifications (id, user_id, title, message, type)
                VALUES (
                    gen_random_uuid(),
                    v_member.user_id,
                    'Recordatorio de clase',
                    'Tu clase de ' || v_slot.display_name || ' empieza en 2 horas.',
                    'system'
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar cada 30 minutos
SELECT cron.schedule(
    'gym-class-reminders',
    '*/30 * * * *',
    $$SELECT public.send_class_reminders();$$
);
