-- ==============================================================================
-- 🎫 NOTIFICACIONES AUTOMÁTICAS PARA SOPORTE (TICKETS Y COMENTARIOS)
-- ==============================================================================

-- 1. Trigger para cambios de estado en Tickets (Resuelto/Cerrado/Reabierto)
CREATE OR REPLACE FUNCTION public.notify_ticket_state_change()
RETURNS TRIGGER AS $$
DECLARE
    v_destinatario TEXT;
    v_titulo TEXT;
    v_mensaje TEXT;
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- CASO A: El ticket se RESUELVE o CIERRA (Avisar al creador)
        IF (NEW.status IN ('resolved', 'closed')) THEN
            v_destinatario := NEW.created_by;
            v_titulo := CASE WHEN NEW.status = 'resolved' THEN '✅ Ticket Resuelto' ELSE '📁 Ticket Cerrado' END;
            v_mensaje := 'Tu ticket "' || COALESCE(NEW.subject, 'Sin Asunto') || '" ha sido marcado como ' || 
                         CASE WHEN NEW.status = 'resolved' THEN 'resuelto' ELSE 'cerrado' END || '.';
            
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (v_destinatario, v_titulo, v_mensaje, 'ticket', 'support-tickets?id=' || NEW.id::text);
        
        -- CASO B: El ticket se REABRE (Avisar al responsable)
        ELSIF (NEW.status IN ('open', 'in_progress') AND OLD.status IN ('resolved', 'closed')) THEN
            v_destinatario := COALESCE(NEW.assigned_to, NEW.staff_id);
            
            IF (v_destinatario IS NOT NULL AND LOWER(TRIM(v_destinatario)) <> LOWER(TRIM(NEW.created_by))) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (
                    v_destinatario,
                    '🔄 Ticket Reabierto',
                    'El ticket "' || COALESCE(NEW.subject, 'Sin Asunto') || '" ha sido reabierto por ' || COALESCE((SELECT name FROM public.users WHERE id = auth.uid()::text), 'un compañero') || '.',
                    'ticket',
                    'support-tickets?id=' || NEW.id::text
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ticket_status_change ON public.support_tickets;
CREATE TRIGGER on_ticket_status_change 
    AFTER UPDATE ON public.support_tickets 
    FOR EACH ROW 
    EXECUTE PROCEDURE public.notify_ticket_state_change();

-- 2. Trigger para nuevos comentarios: MEJORADO CON ROBUSTEZ TOTAL
CREATE OR REPLACE FUNCTION public.notify_new_ticket_comment()
RETURNS TRIGGER AS $$
DECLARE
    v_ticket_created_by TEXT;
    v_ticket_assigned_to TEXT;
    v_ticket_staff_id TEXT;
    v_ticket_subject TEXT;
    v_emisor_name TEXT;
    v_emisor_id TEXT;
BEGIN
    -- Forzar tipos y limpiar IDs
    v_emisor_id := LOWER(TRIM(NEW.user_id));

    -- Obtener datos del ticket
    SELECT created_by, assigned_to, staff_id, subject 
    INTO v_ticket_created_by, v_ticket_assigned_to, v_ticket_staff_id, v_ticket_subject
    FROM public.support_tickets WHERE id = NEW.ticket_id;

    -- Obtener nombre del que escribe el comentario
    SELECT name INTO v_emisor_name FROM public.users WHERE LOWER(TRIM(id)) = v_emisor_id;
    v_emisor_name := COALESCE(v_emisor_name, 'Un compañero');

    -- NOTIFICAR AL CREADOR (si no es quien escribe)
    IF (v_ticket_created_by IS NOT NULL AND LOWER(TRIM(v_ticket_created_by)) <> v_emisor_id) THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            v_ticket_created_by,
            '💬 Nuevo comentario en Ticket',
            v_emisor_name || ' ha comentado en: "' || COALESCE(v_ticket_subject, 'Ticket') || '"',
            'ticket',
            'support-tickets?id=' || NEW.ticket_id::text
        );
    END IF;

    -- NOTIFICAR AL RESPONSABLE (si existe y no es quien escribe ni el creador)
    IF (v_ticket_assigned_to IS NOT NULL 
        AND LOWER(TRIM(v_ticket_assigned_to)) <> v_emisor_id 
        AND LOWER(TRIM(v_ticket_assigned_to)) <> LOWER(TRIM(COALESCE(v_ticket_created_by, '')))) THEN
        
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            v_ticket_assigned_to,
            '💬 Nuevo comentario en Ticket',
            v_emisor_name || ' ha comentado en: "' || COALESCE(v_ticket_subject, 'Ticket') || '"',
            'ticket',
            'support-tickets?id=' || NEW.ticket_id::text
        );
    END IF;

    -- NOTIFICAR AL STAFF AFECTADO (si existe y no es ninguno de los anteriores)
    IF (v_ticket_staff_id IS NOT NULL 
        AND LOWER(TRIM(v_ticket_staff_id)) <> v_emisor_id 
        AND LOWER(TRIM(v_ticket_staff_id)) <> LOWER(TRIM(COALESCE(v_ticket_created_by, '')))
        AND LOWER(TRIM(v_ticket_staff_id)) <> LOWER(TRIM(COALESCE(v_ticket_assigned_to, '')))) THEN
        
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            v_ticket_staff_id,
            '💬 Nuevo comentario en Ticket',
            v_emisor_name || ' ha comentado en: "' || COALESCE(v_ticket_subject, 'Ticket') || '"',
            'ticket',
            'support-tickets?id=' || NEW.ticket_id::text
        );
    END IF;

    -- 🚨 FALLBACK: SI EL TICKET NO ESTÁ ASIGNADO, NOTIFICAR AL HEAD COACH
    -- (Solo si el Head Coach no es quien escribe y no ha sido notificado ya)
    IF (v_ticket_assigned_to IS NULL) THEN
        DECLARE
            v_head_coach_id TEXT;
        BEGIN
            SELECT id INTO v_head_coach_id FROM public.users WHERE role = 'head_coach' LIMIT 1;
            
            IF (v_head_coach_id IS NOT NULL 
                AND LOWER(TRIM(v_head_coach_id)) <> v_emisor_id 
                AND LOWER(TRIM(v_head_coach_id)) <> LOWER(TRIM(COALESCE(v_ticket_created_by, '')))
                AND LOWER(TRIM(v_head_coach_id)) <> LOWER(TRIM(COALESCE(v_ticket_staff_id, '')))) THEN
                
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (
                    v_head_coach_id,
                    '💬 Comentario en Ticket SIN ASIGNAR',
                    v_emisor_name || ' ha comentado en: "' || COALESCE(v_ticket_subject, 'Ticket') || '"',
                    'ticket',
                    'support-tickets?id=' || NEW.ticket_id::text
                );
            END IF;
        END;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_comment_notif ON public.ticket_comments;
CREATE TRIGGER on_new_comment_notif 
    AFTER INSERT ON public.ticket_comments 
    FOR EACH ROW 
    EXECUTE PROCEDURE public.notify_new_ticket_comment();

-- 3. Trigger para nuevos Tickets (Avisar al responsable)
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS TRIGGER AS $$
DECLARE
    v_destinatario TEXT;
BEGIN
    -- El destinatario es el asignado o el staff afectado
    v_destinatario := COALESCE(NEW.assigned_to, NEW.staff_id);

    IF (v_destinatario IS NOT NULL AND LOWER(TRIM(v_destinatario)) <> LOWER(TRIM(NEW.created_by))) THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            v_destinatario,
            '🎫 Nuevo Ticket',
            'Se ha abierto un nuevo ticket: "' || COALESCE(NEW.subject, 'Sin Asunto') || '"',
            'ticket',
            'support-tickets?id=' || NEW.id::text
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_ticket_notif ON public.support_tickets;
CREATE TRIGGER on_new_ticket_notif 
    AFTER INSERT ON public.support_tickets 
    FOR EACH ROW 
    EXECUTE PROCEDURE public.notify_new_ticket();

-- 4. Trigger para re-asignación de responsable
CREATE OR REPLACE FUNCTION public.notify_ticket_reassignment()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL AND LOWER(TRIM(NEW.assigned_to)) <> LOWER(TRIM(NEW.created_by))) THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            NEW.assigned_to,
            '🎫 Ticket Re-asignado',
            'Se te ha asignado el ticket: "' || COALESCE(NEW.subject, 'Sin Asunto') || '"',
            'ticket',
            'support-tickets?id=' || NEW.id::text
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ticket_reassignment ON public.support_tickets;
CREATE TRIGGER on_ticket_reassignment
    AFTER UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE PROCEDURE public.notify_ticket_reassignment();
