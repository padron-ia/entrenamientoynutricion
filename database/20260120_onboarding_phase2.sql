-- ==========================================
-- ONBOARDING PHASE 2 (DEEP ASSESSMENT)
-- Adds tracking columns for Phase 2 completion
-- ==========================================

-- 1. ADD PROGRESS TRACKING COLUMNS
ALTER TABLE public.clientes_pt_notion 
ADD COLUMN IF NOT EXISTS onboarding_phase2_completed BOOLEAN DEFAULT false;

ALTER TABLE public.clientes_pt_notion 
ADD COLUMN IF NOT EXISTS onboarding_phase2_completed_at TIMESTAMP WITH TIME ZONE;

-- 2. ADD OPTIONAL TRAINING FEEDBACK COLUMN (If not exists)
ALTER TABLE public.clientes_pt_notion 
ADD COLUMN IF NOT EXISTS property_reporte_sensaciones_entreno TEXT;

-- 3. INITIALIZE EXISTING CLIENTS (To avoid blocking them if they are already active)
-- Only mark as completed if they already have an active status and were created before today
-- Or keep them as false if the user wants everyone to do it. 
-- For safety, let's keep it false but provide this commented out option.
/*
UPDATE public.clientes_pt_notion 
SET onboarding_phase2_completed = true 
WHERE property_estado_cliente = 'Activo';
*/

-- 4. RE-GRANT PERMISSIONS (Just in case)
GRANT ALL ON public.clientes_pt_notion TO anon, authenticated;
