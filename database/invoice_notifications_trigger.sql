-- ==============================================================================
-- 🔔 TRIGGER ACTULIZADO: NOTIFICACIONES DE ESTADO DE FACTURAS (Rechazo y Pago) 🔔
-- ==============================================================================
-- Este trigger sustituye al anterior para notificar tanto rechazos como PAGOS.

CREATE OR REPLACE FUNCTION public.notify_invoice_status_change()
RETURNS TRIGGER AS $$
DECLARE
  month_text TEXT;
BEGIN
  -- Formatear fecha para el mensaje (Ej: "enero 2026" o "2026-01")
  -- Usamos to_char con 'TMMonth YYYY' para mes en texto si el locale está configurado, o YYYY-MM
  month_text := TO_CHAR(NEW.period_date::date, 'YYYY-MM');

  -- CASO 1: RECHAZADA (Acción Requerida)
  IF (NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status <> 'rejected')) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.coach_id,
      '❌ Factura Devuelta',
      'Tu factura de ' || month_text || ' ha sido devuelta para corrección. Motivo: ' || COALESCE(NEW.admin_notes, 'Sin nota.'),
      'system',
      '/dashboard'
    );
  END IF;

  -- CASO 2: PAGADA (Éxito)
  IF (NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> 'paid')) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.coach_id,
      '✅ Factura Pagada',
      '¡Buenas noticias! Se ha realizado el pago de tu factura de ' || month_text || '.',
      'system',
      '/dashboard'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limpieza del trigger anterior (si existe con el nombre viejo)
DROP TRIGGER IF EXISTS on_invoice_rejection ON public.coach_invoices;
DROP TRIGGER IF EXISTS on_invoice_status_change ON public.coach_invoices;

-- Crear el nuevo trigger unificado
CREATE TRIGGER on_invoice_status_change
AFTER UPDATE ON public.coach_invoices
FOR EACH ROW
EXECUTE FUNCTION public.notify_invoice_status_change();
