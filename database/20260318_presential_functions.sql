-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                              ║
-- ║   MODULO PRESENCIAL - FUNCIONES Y TRIGGERS                                   ║
-- ║                                                                              ║
-- ║   Funciones: book_class, cancel_reservation                                  ║
-- ║   Triggers: notificacion de reserva, notificacion de compra                  ║
-- ║                                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- FUNCION: book_class
-- Reserva atomica: valida aforo, descuenta credito o mete en lista de espera.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.book_class(
    p_member_id UUID,
    p_class_slot_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_slot RECORD;
    v_current_count INTEGER;
    v_credit RECORD;
    v_waitlist_pos INTEGER;
BEGIN
    -- 1. Obtener datos de la clase
    SELECT cs.*, st.is_bookable_by_client, st.name AS service_name
    INTO v_slot
    FROM gym_class_slots cs
    JOIN gym_service_types st ON cs.service_type_id = st.id
    WHERE cs.id = p_class_slot_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clase no encontrada');
    END IF;

    IF v_slot.is_cancelled THEN
        RETURN jsonb_build_object('success', false, 'error', 'Esta clase ha sido cancelada');
    END IF;

    -- Validar que la clase es en el futuro
    IF (v_slot.date + v_slot.start_time) <= NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'No puedes reservar una clase que ya ha empezado');
    END IF;

    -- Validar que la clase esta dentro del mes actual (creditos no sirven para el mes siguiente)
    IF v_slot.date > (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date THEN
        RETURN jsonb_build_object('success', false, 'error', 'No puedes reservar clases del mes siguiente con los creditos actuales');
    END IF;

    -- 2. Verificar que no tiene reserva duplicada
    IF EXISTS (
        SELECT 1 FROM gym_reservations
        WHERE member_id = p_member_id
        AND class_slot_id = p_class_slot_id
        AND status IN ('confirmed', 'waitlisted')
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ya tienes una reserva para esta clase');
    END IF;

    -- 3. Buscar credito valido para este tipo de servicio (FIFO por fecha de expiracion)
    SELECT mc.* INTO v_credit
    FROM gym_member_credits mc
    JOIN gym_bonos b ON mc.bono_id = b.id
    WHERE mc.member_id = p_member_id
    AND mc.is_expired = false
    AND mc.payment_status = 'completed'
    AND mc.valid_until >= CURRENT_DATE
    AND (mc.total_sessions - mc.used_sessions) > 0
    AND v_slot.service_type_id = ANY(b.compatible_service_type_ids)
    ORDER BY mc.valid_until ASC, mc.created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No tienes creditos disponibles para este tipo de clase');
    END IF;

    -- 4. Comprobar aforo
    SELECT COUNT(*) INTO v_current_count
    FROM gym_reservations
    WHERE class_slot_id = p_class_slot_id
    AND status = 'confirmed';

    IF v_current_count >= v_slot.capacity THEN
        -- Meter en lista de espera (NO descontar credito)
        SELECT COALESCE(MAX(waitlist_position), 0) + 1 INTO v_waitlist_pos
        FROM gym_reservations
        WHERE class_slot_id = p_class_slot_id
        AND status = 'waitlisted';

        INSERT INTO gym_reservations (member_id, class_slot_id, credit_id, status, waitlist_position, booked_by)
        VALUES (p_member_id, p_class_slot_id, v_credit.id, 'waitlisted', v_waitlist_pos, 'self');

        RETURN jsonb_build_object(
            'success', true,
            'status', 'waitlisted',
            'waitlist_position', v_waitlist_pos,
            'message', 'Te has unido a la lista de espera en la posicion ' || v_waitlist_pos
        );
    END IF;

    -- 5. Confirmar reserva y descontar credito
    INSERT INTO gym_reservations (member_id, class_slot_id, credit_id, status, booked_by)
    VALUES (p_member_id, p_class_slot_id, v_credit.id, 'confirmed', 'self');

    UPDATE gym_member_credits
    SET used_sessions = used_sessions + 1
    WHERE id = v_credit.id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'confirmed',
        'message', 'Reserva confirmada para ' || v_slot.service_name,
        'credit_remaining', v_credit.total_sessions - v_credit.used_sessions - 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- FUNCION: cancel_reservation
-- Maneja la regla de las 5 horas y promocion de lista de espera.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cancel_reservation(
    p_reservation_id UUID,
    p_cancelled_by TEXT DEFAULT 'client'
)
RETURNS JSONB AS $$
DECLARE
    v_reservation RECORD;
    v_slot RECORD;
    v_hours_until_class NUMERIC;
    v_can_return_credit BOOLEAN;
    v_next_waitlisted RECORD;
BEGIN
    -- 1. Obtener reserva
    SELECT r.* INTO v_reservation
    FROM gym_reservations r
    WHERE r.id = p_reservation_id
    AND r.status IN ('confirmed', 'waitlisted');

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada o ya cancelada');
    END IF;

    -- 2. Obtener datos de la clase
    SELECT * INTO v_slot FROM gym_class_slots WHERE id = v_reservation.class_slot_id;

    -- 3. Calcular horas hasta la clase
    v_hours_until_class := EXTRACT(EPOCH FROM ((v_slot.date + v_slot.start_time) - NOW())) / 3600;

    -- 4. Regla de las 5 horas (solo para cancelaciones del cliente en reservas confirmadas)
    IF p_cancelled_by = 'client' AND v_reservation.status = 'confirmed' THEN
        IF v_hours_until_class < 5 THEN
            -- Cancelar SIN devolver credito
            UPDATE gym_reservations
            SET status = 'cancelled',
                cancelled_at = NOW(),
                cancellation_type = 'client',
                credit_returned = false
            WHERE id = p_reservation_id;

            RETURN jsonb_build_object(
                'success', true,
                'credit_returned', false,
                'message', 'Reserva cancelada. El credito NO ha sido devuelto (cancelacion con menos de 5 horas de antelacion)'
            );
        END IF;
    END IF;

    -- 5. Cancelar y devolver credito si procede
    v_can_return_credit := (v_reservation.status = 'confirmed' AND v_reservation.credit_id IS NOT NULL);

    UPDATE gym_reservations
    SET status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_type = p_cancelled_by,
        credit_returned = v_can_return_credit
    WHERE id = p_reservation_id;

    IF v_can_return_credit THEN
        UPDATE gym_member_credits
        SET used_sessions = used_sessions - 1
        WHERE id = v_reservation.credit_id;
    END IF;

    -- 6. Promocionar desde lista de espera (solo si se libero una plaza confirmada)
    IF v_reservation.status = 'confirmed' THEN
        SELECT r.*, gm.user_id AS member_user_id
        INTO v_next_waitlisted
        FROM gym_reservations r
        JOIN gym_members gm ON r.member_id = gm.id
        WHERE r.class_slot_id = v_reservation.class_slot_id
        AND r.status = 'waitlisted'
        ORDER BY r.waitlist_position ASC
        LIMIT 1
        FOR UPDATE;

        IF FOUND THEN
            -- Auto-confirmar al siguiente en la lista
            UPDATE gym_reservations
            SET status = 'confirmed',
                waitlist_position = 0,
                auto_booked_at = NOW()
            WHERE id = v_next_waitlisted.id;

            -- Descontar credito del miembro promocionado
            IF v_next_waitlisted.credit_id IS NOT NULL THEN
                UPDATE gym_member_credits
                SET used_sessions = used_sessions + 1
                WHERE id = v_next_waitlisted.credit_id;
            END IF;

            -- Notificar al miembro promocionado
            IF v_next_waitlisted.member_user_id IS NOT NULL THEN
                INSERT INTO notifications (id, user_id, title, message, type)
                VALUES (
                    gen_random_uuid(),
                    v_next_waitlisted.member_user_id,
                    'Plaza disponible - Reserva confirmada',
                    'Se ha liberado una plaza y tu reserva ha sido confirmada automaticamente.',
                    'system'
                );
            END IF;

            -- Reordenar posiciones de lista de espera
            UPDATE gym_reservations
            SET waitlist_position = waitlist_position - 1
            WHERE class_slot_id = v_reservation.class_slot_id
            AND status = 'waitlisted'
            AND waitlist_position > v_next_waitlisted.waitlist_position;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'credit_returned', v_can_return_credit,
        'message', CASE
            WHEN v_can_return_credit THEN 'Reserva cancelada. Credito devuelto.'
            ELSE 'Reserva cancelada.'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- FUNCION: assign_personal_session
-- Para que el admin asigne una sesion personal/osteo/dietetica a un miembro.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_personal_session(
    p_member_id UUID,
    p_class_slot_id UUID,
    p_assigned_by TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_slot RECORD;
    v_credit RECORD;
BEGIN
    -- Obtener clase
    SELECT cs.*, st.name AS service_name
    INTO v_slot
    FROM gym_class_slots cs
    JOIN gym_service_types st ON cs.service_type_id = st.id
    WHERE cs.id = p_class_slot_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clase no encontrada');
    END IF;

    -- Verificar duplicado
    IF EXISTS (
        SELECT 1 FROM gym_reservations
        WHERE member_id = p_member_id AND class_slot_id = p_class_slot_id
        AND status IN ('confirmed', 'waitlisted')
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'El miembro ya tiene reserva para esta clase');
    END IF;

    -- Buscar credito valido
    SELECT mc.* INTO v_credit
    FROM gym_member_credits mc
    JOIN gym_bonos b ON mc.bono_id = b.id
    WHERE mc.member_id = p_member_id
    AND mc.is_expired = false
    AND mc.payment_status = 'completed'
    AND mc.valid_until >= CURRENT_DATE
    AND (mc.total_sessions - mc.used_sessions) > 0
    AND v_slot.service_type_id = ANY(b.compatible_service_type_ids)
    ORDER BY mc.valid_until ASC, mc.created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'El miembro no tiene creditos disponibles para este servicio');
    END IF;

    -- Insertar reserva
    INSERT INTO gym_reservations (member_id, class_slot_id, credit_id, status, booked_by)
    VALUES (p_member_id, p_class_slot_id, v_credit.id, 'confirmed', p_assigned_by);

    -- Descontar credito
    UPDATE gym_member_credits
    SET used_sessions = used_sessions + 1
    WHERE id = v_credit.id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'confirmed',
        'message', 'Sesion de ' || v_slot.service_name || ' asignada correctamente'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- TRIGGER: Notificacion de reserva confirmada
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_reservation_event()
RETURNS TRIGGER AS $$
DECLARE
    v_member_user_id UUID;
    v_class_date TEXT;
    v_class_time TEXT;
    v_service_name TEXT;
BEGIN
    SELECT user_id INTO v_member_user_id
    FROM gym_members WHERE id = NEW.member_id;

    IF v_member_user_id IS NULL THEN RETURN NEW; END IF;

    SELECT
        TO_CHAR(cs.date, 'DD/MM/YYYY'),
        TO_CHAR(cs.start_time, 'HH24:MI'),
        COALESCE(cs.title, st.name)
    INTO v_class_date, v_class_time, v_service_name
    FROM gym_class_slots cs
    JOIN gym_service_types st ON cs.service_type_id = st.id
    WHERE cs.id = NEW.class_slot_id;

    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        INSERT INTO notifications (id, user_id, title, message, type)
        VALUES (
            gen_random_uuid(),
            v_member_user_id,
            'Reserva confirmada',
            'Tu clase de ' || v_service_name || ' el ' || v_class_date || ' a las ' || v_class_time || ' ha sido confirmada.',
            'system'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_reservation_event ON public.gym_reservations;
CREATE TRIGGER on_reservation_event
    AFTER INSERT OR UPDATE ON public.gym_reservations
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_reservation_event();


-- ============================================================================
-- TRIGGER: Notificacion de bono comprado
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_bono_purchased()
RETURNS TRIGGER AS $$
DECLARE
    v_member_user_id UUID;
    v_bono_name TEXT;
BEGIN
    SELECT user_id INTO v_member_user_id
    FROM gym_members WHERE id = NEW.member_id;

    IF v_member_user_id IS NULL THEN RETURN NEW; END IF;

    SELECT name INTO v_bono_name FROM gym_bonos WHERE id = NEW.bono_id;

    INSERT INTO notifications (id, user_id, title, message, type)
    VALUES (
        gen_random_uuid(),
        v_member_user_id,
        'Bono adquirido',
        'Has adquirido ' || v_bono_name || '. Tienes ' || NEW.total_sessions || ' sesiones disponibles hasta fin de mes.',
        'system'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bono_purchased ON public.gym_member_credits;
CREATE TRIGGER on_bono_purchased
    AFTER INSERT ON public.gym_member_credits
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_bono_purchased();
