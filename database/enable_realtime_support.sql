-- ==============================================================================
-- ⚡ ACTIVAR TIEMPO REAL PARA TODO EL SISTEMA DE SOPORTE Y NOTIFICACIONES
-- ==============================================================================

DO $$
BEGIN
    -- 1. Soporte: Tickets
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'support_tickets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
    END IF;

    -- 2. Soporte: Comentarios
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'ticket_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;
    END IF;

    -- 3. Notificaciones: General
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

SELECT '✅ TIEMPO REAL ACTIVADO PARA TICKETS, COMENTARIOS Y NOTIFICACIONES' as result;
