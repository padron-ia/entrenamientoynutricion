-- Add missing columns for renewal pricing and duration
ALTER TABLE clientes_pt_notion 
ADD COLUMN IF NOT EXISTS renewal_amount NUMERIC;

ALTER TABLE clientes_pt_notion
ADD COLUMN IF NOT EXISTS renewal_duration INTEGER;

COMMENT ON COLUMN clientes_pt_notion.renewal_amount IS 'Importe de la renovación pactado o del link';
COMMENT ON COLUMN clientes_pt_notion.renewal_duration IS 'Duración en meses de la renovación';
