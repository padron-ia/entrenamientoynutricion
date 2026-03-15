-- Add invoice_id to staff_payments to link payments to invoices
ALTER TABLE staff_payments
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES coach_invoices(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_payments_invoice_id ON staff_payments(invoice_id);
