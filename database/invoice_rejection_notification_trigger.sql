-- ==============================================================================
-- 🔔 TRIGGER: NOTIFICACIÓN DE RECHAZO DE FACTURA 🔔
-- ==============================================================================
-- Este trigger crea automáticamente una notificación para el coach
-- cuando el estado de su factura cambia a 'rejected'.

CREATE OR REPLACE FUNCTION public.notify_invoice_rejection()
RETURNS TRIGGER AS $$
DECLARE
  month_text TEXT;
BEGIN
  -- Solo actuar si el estado cambia a 'rejected'
  IF (NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status <> 'rejected')) THEN
    
    -- Formatear fecha para el mensaje (YYYY-MM)
    month_text := TO_CHAR(NEW.period_date::date, 'YYYY-MM');

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.coach_id,
      '❌ Factura Devuelta',
      'Tu factura de ' || month_text || ' ha sido devuelta. Motivo: ' || COALESCE(NEW.admin_notes, 'Revisa los detalles.'),
      'system',
      '/dashboard' -- Enlace al dashboard para corregirla
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el disparador en la tabla coach_invoices
DROP TRIGGER IF EXISTS on_invoice_rejection ON public.coach_invoices;
CREATE TRIGGER on_invoice_rejection
AFTER UPDATE ON public.coach_invoices
FOR EACH ROW
EXECUTE FUNCTION public.notify_invoice_rejection();
