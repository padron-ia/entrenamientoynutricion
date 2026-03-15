-- Add columns for renewal payment flow
ALTER TABLE clientes_pt_notion 
ADD COLUMN IF NOT EXISTS renewal_payment_link TEXT;

ALTER TABLE clientes_pt_notion
ADD COLUMN IF NOT EXISTS renewal_payment_status TEXT DEFAULT 'none';

ALTER TABLE clientes_pt_notion
ADD COLUMN IF NOT EXISTS renewal_receipt_url TEXT;

ALTER TABLE clientes_pt_notion
ADD COLUMN IF NOT EXISTS renewal_phase TEXT;

-- Add comments for documentation
COMMENT ON COLUMN clientes_pt_notion.renewal_payment_link IS 'Enlace de pago (Stripe/etc) puesto por el coach';
COMMENT ON COLUMN clientes_pt_notion.renewal_payment_status IS 'Estado: none, pending (coach puso link), uploaded (cliente subió foto), verified (coach validó)';
COMMENT ON COLUMN clientes_pt_notion.renewal_receipt_url IS 'URL de la foto del comprobante subido por el cliente';
COMMENT ON COLUMN clientes_pt_notion.renewal_phase IS 'F2, F3, F4, F5, etc. - para saber qué fase se está renovando';
