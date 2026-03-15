-- Migration: Add activation_token fields to clientes_pt_notion
-- Purpose: Allow inviting existing clients to create their auth account
-- Date: 2026-01-21

-- 1. Add activation_token column (unique UUID for invitation links)
ALTER TABLE public.clientes_pt_notion
ADD COLUMN IF NOT EXISTS activation_token TEXT UNIQUE;

-- 2. Add timestamp for token creation (for expiry checks if needed)
ALTER TABLE public.clientes_pt_notion
ADD COLUMN IF NOT EXISTS activation_token_created_at TIMESTAMP WITH TIME ZONE;

-- 3. Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_clientes_activation_token
ON public.clientes_pt_notion(activation_token)
WHERE activation_token IS NOT NULL;

-- 4. Add comments for documentation
COMMENT ON COLUMN public.clientes_pt_notion.activation_token IS 'Unique token for client account activation invitation link';
COMMENT ON COLUMN public.clientes_pt_notion.activation_token_created_at IS 'Timestamp when activation token was generated';

-- 5. Grant necessary permissions
GRANT ALL ON public.clientes_pt_notion TO anon, authenticated;
