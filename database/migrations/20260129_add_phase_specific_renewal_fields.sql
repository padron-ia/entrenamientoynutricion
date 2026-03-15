-- Add specific financial fields for each renewal phase (F2-F5) to store payment history per phase
-- This ensures 'RenewalsView' and 'ClientDetail' show consistent historical data.

ALTER TABLE public.clientes_pt_notion
ADD COLUMN IF NOT EXISTS f2_amount numeric,
ADD COLUMN IF NOT EXISTS f2_payment_method text,
ADD COLUMN IF NOT EXISTS f2_receipt_url text,

ADD COLUMN IF NOT EXISTS f3_amount numeric,
ADD COLUMN IF NOT EXISTS f3_payment_method text,
ADD COLUMN IF NOT EXISTS f3_receipt_url text,

ADD COLUMN IF NOT EXISTS f4_amount numeric,
ADD COLUMN IF NOT EXISTS f4_payment_method text,
ADD COLUMN IF NOT EXISTS f4_receipt_url text,

ADD COLUMN IF NOT EXISTS f5_amount numeric,
ADD COLUMN IF NOT EXISTS f5_payment_method text,
ADD COLUMN IF NOT EXISTS f5_receipt_url text;

COMMENT ON COLUMN public.clientes_pt_notion.f2_amount IS 'Amount paid for Phase 2 renewal';
COMMENT ON COLUMN public.clientes_pt_notion.f2_payment_method IS 'Payment method for Phase 2 (stripe, hotmart, etc.)';
COMMENT ON COLUMN public.clientes_pt_notion.f2_receipt_url IS 'URL of the receipt document for Phase 2';
