-- ==============================================================================
-- 💬 SISTEMA DE COMENTARIOS PARA TICKETS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Staff can manage all ticket comments" ON public.ticket_comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND role IN ('admin', 'head_coach', 'coach', 'closer', 'contabilidad', 'endocrino', 'psicologo', 'rrss', 'setter')
        )
    );

CREATE POLICY "Clients can see and add comments to their own tickets" ON public.ticket_comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets 
            WHERE support_tickets.id = ticket_comments.ticket_id 
            AND support_tickets.client_id::text = auth.uid()::text
        )
    );

-- Habilitar Realtime (Desactivado si ya existe para evitar errores)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;
