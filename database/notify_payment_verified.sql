-- Function to notify client when payment is verified
CREATE OR REPLACE FUNCTION public.notify_renewal_payment_verified()
RETURNS TRIGGER AS $$
DECLARE
    client_name TEXT;
    target_user_id UUID;
BEGIN
    -- Only notify if status changed to 'verified'
    IF (NEW.renewal_payment_status = 'verified' AND (OLD.renewal_payment_status IS NULL OR OLD.renewal_payment_status != 'verified')) THEN
        
        -- Get client info
        client_name := NEW.property_nombre;
        target_user_id := NEW.user_id;

        -- If we have a user_id, send notification to the client
        IF target_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                user_id,
                title,
                message,
                type,
                link,
                metadata
            ) VALUES (
                target_user_id,
                '¡Pago Verificado! 🎉',
                'Tu coach ha verificado tu pago. ¡Tu nueva fase ya está activa! Gracias por tu confianza.',
                'achievement',
                '/client-portal',
                jsonb_build_object(
                    'client_id', NEW.id,
                    'phase', NEW.renewal_phase
                )
            );
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for payment verification
DROP TRIGGER IF EXISTS on_renewal_payment_verified ON public.clientes_pt_notion;
CREATE TRIGGER on_renewal_payment_verified
    AFTER UPDATE ON public.clientes_pt_notion
    FOR EACH ROW
    WHEN (OLD.renewal_payment_status IS DISTINCT FROM NEW.renewal_payment_status)
    EXECUTE FUNCTION public.notify_renewal_payment_verified();
