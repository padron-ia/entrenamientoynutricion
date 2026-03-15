-- Add missing columns for refined Closer Dashboard
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS is_refund BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS correction_url TEXT;

-- Update comments
COMMENT ON COLUMN public.leads.is_refund IS 'Whether the client has requested a refund';
COMMENT ON COLUMN public.leads.correction_url IS 'URL for the call correction/feedback';
