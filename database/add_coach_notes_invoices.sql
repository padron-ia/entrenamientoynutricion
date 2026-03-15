-- ==============================================================================
-- 🔄 FIX: INVOICE CORRECTION WORKFLOW 🔄
-- ==============================================================================
-- Este script añade el campo `coach_notes` para permitir que el coach explique 
-- las correcciones realizadas al re-subir una factura.

ALTER TABLE public.coach_invoices ADD COLUMN IF NOT EXISTS coach_notes TEXT;

-- Añadir comentario descriptivo
COMMENT ON COLUMN public.coach_invoices.admin_notes IS 'Notas del administrador al rechazar/devolver la factura';
COMMENT ON COLUMN public.coach_invoices.coach_notes IS 'Notas del coach al corregir/resubir la factura';
