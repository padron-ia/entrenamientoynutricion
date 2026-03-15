-- ==============================================================================
-- 🎫 EXPANSIÓN DE TICKETS: SOPORTE PARA STAFF Y CLIENTES 🎫
-- ==============================================================================

-- 1. Modificar la estructura de support_tickets
-- Hacemos client_id opcional y añadimos staff_id
ALTER TABLE public.support_tickets ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.support_tickets ADD COLUMN staff_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Añadir comentario descriptivo
COMMENT ON COLUMN public.support_tickets.client_id IS 'ID del cliente si el ticket es sobre un problema de un alumno';
COMMENT ON COLUMN public.support_tickets.staff_id IS 'ID del miembro del staff si el ticket es sobre un problema interno o personal';

-- 3. Actualizar la política si es necesario (generalmente ya permite acceso a staff)
-- La política existente suele ser: (created_by = auth.uid() OR assigned_to = auth.uid() OR is_admin() OR is_head_coach())
