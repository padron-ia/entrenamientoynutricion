-- ==============================================================================
-- 🔔 NOTIFICACIONES AUTOMÁTICAS PARA EVENTOS DE VENTAS Y ONBOARDING
-- ==============================================================================

-- 1. Función para notificar eventos de ventas
CREATE OR REPLACE FUNCTION public.notify_sale_events()
RETURNS TRIGGER AS $$
DECLARE
    v_coach_id TEXT;
    v_client_name TEXT;
    v_total_amount NUMERIC;
BEGIN
    -- Obtenemos datos del evento
    v_coach_id := NEW.assigned_coach_id;
    v_client_name := NEW.client_first_name || ' ' || NEW.client_last_name;
    v_total_amount := NEW.sale_amount;

    -- CASO A: NUEVA VENTA ASIGNADA (PENDIENTE ONBOARDING)
    IF (TG_OP = 'INSERT' AND v_coach_id IS NOT NULL) THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            v_coach_id,
            '🆕 Nueva Venta Asignada',
            'Se te ha asignado un nuevo cliente: ' || v_client_name || '. Está pendiente de completar el onboarding.',
            'sale',
            'dashboard'
        );
    END IF;

    -- CASO B: ASIGNACIÓN CAMBIADA (O ASIGNADA POR PRIMERA VEZ EN UPDATE)
    IF (TG_OP = 'UPDATE' AND NEW.assigned_coach_id IS DISTINCT FROM OLD.assigned_coach_id AND NEW.assigned_coach_id IS NOT NULL) THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            NEW.assigned_coach_id,
            '🆕 Nueva Venta Asignada',
            'Se te ha asignado un nuevo cliente: ' || v_client_name || '. Estado: ' || NEW.status,
            'sale',
            'dashboard'
        );
    END IF;

    -- CASO C: ONBOARDING COMPLETADO
    IF (TG_OP = 'UPDATE' AND OLD.status = 'pending_onboarding' AND NEW.status = 'onboarding_completed') THEN
        IF (v_coach_id IS NOT NULL) THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (
                v_coach_id,
                '✅ Onboarding Completado',
                'El cliente ' || v_client_name || ' ha completado el onboarding. ¡Ya puedes empezar el proceso!',
                'success',
                'dashboard'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger para la tabla sales
DROP TRIGGER IF EXISTS on_sale_event_notify ON public.sales;
CREATE TRIGGER on_sale_event_notify
    AFTER INSERT OR UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE PROCEDURE public.notify_sale_events();

-- 2. NOTIFICACIÓN PARA EL CLOSER CUANDO SE COMPLETA EL ONBOARDING (Asegura visibilidad de éxito)
CREATE OR REPLACE FUNCTION public.notify_closer_onboarding_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status = 'pending_onboarding' AND NEW.status = 'onboarding_completed') THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            NEW.closer_id,
            '🎉 Onboarding Exitoso',
            'Tu cliente ' || NEW.client_first_name || ' ' || NEW.client_last_name || ' ha completado el registro. ¡Venta consolidada!',
            'success',
            'closer-dashboard'
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_onboarding_success_closer ON public.sales;
CREATE TRIGGER on_onboarding_success_closer
    AFTER UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE PROCEDURE public.notify_closer_onboarding_completed();
