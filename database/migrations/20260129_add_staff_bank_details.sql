-- Añadir campos de datos bancarios para el staff
-- Permite a los miembros del equipo registrar sus datos para recibir pagos

-- Campos bancarios en users
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_iban TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_swift_bic TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_address TEXT;

COMMENT ON COLUMN users.bank_account_holder IS 'Titular de la cuenta bancaria';
COMMENT ON COLUMN users.bank_account_iban IS 'IBAN completo para transferencias';
COMMENT ON COLUMN users.bank_name IS 'Nombre del banco';
COMMENT ON COLUMN users.bank_swift_bic IS 'Código SWIFT/BIC para transferencias internacionales';
COMMENT ON COLUMN users.tax_id IS 'NIF/DNI/CIF para facturación';
COMMENT ON COLUMN users.billing_address IS 'Dirección fiscal completa';

-- Tabla para historial de pagos al staff
-- Nota: users.id es TEXT, no UUID
CREATE TABLE IF NOT EXISTS staff_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    period_month INTEGER NOT NULL, -- 1-12
    period_year INTEGER NOT NULL,
    payment_type TEXT NOT NULL DEFAULT 'commission', -- commission, bonus, salary
    payment_method TEXT, -- transfer, paypal, etc.
    payment_reference TEXT, -- Referencia de la transferencia
    payment_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, paid, failed
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT REFERENCES users(id),
    paid_at TIMESTAMPTZ,
    paid_by TEXT REFERENCES users(id)
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_staff_payments_staff_id ON staff_payments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_payments_period ON staff_payments(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_staff_payments_status ON staff_payments(status);

COMMENT ON TABLE staff_payments IS 'Historial de pagos realizados al staff (comisiones, bonus, etc.)';
