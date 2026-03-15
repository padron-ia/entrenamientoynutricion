-- Tabla para registrar nuevas altas (ventas cerradas)
CREATE TABLE IF NOT EXISTS sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Datos del Cliente
    client_first_name TEXT NOT NULL,
    client_last_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    
    -- Datos del Contrato
    contract_duration INTEGER NOT NULL, -- 3, 6, 12 meses
    hotmart_payment_link TEXT NOT NULL,
    payment_receipt_url TEXT, -- URL del comprobante subido
    
    -- Coach Asignado
    assigned_coach_id TEXT NOT NULL,
    
    -- Notas
    admin_notes TEXT, -- Notas para administración sobre el pago
    coach_notes TEXT, -- Notas para el coach sobre la llamada
    
    -- Onboarding
    onboarding_token TEXT UNIQUE, -- Token único para el link de bienvenida
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Tracking
    closer_id TEXT NOT NULL, -- ID del closer que cerró la venta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Cliente creado (referencia al cliente final en clientes_pt_notion)
    client_id TEXT, -- Se rellena cuando el cliente completa el onboarding
    
    -- Estado
    status TEXT DEFAULT 'pending_onboarding' -- pending_onboarding, onboarding_completed, active
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_sales_closer ON sales(closer_id);
CREATE INDEX IF NOT EXISTS idx_sales_coach ON sales(assigned_coach_id);
CREATE INDEX IF NOT EXISTS idx_sales_token ON sales(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_sales_email ON sales(client_email);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_updated_at_trigger
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_updated_at();

-- Comentarios
COMMENT ON TABLE sales IS 'Registro de nuevas altas/ventas cerradas por closers';
COMMENT ON COLUMN sales.onboarding_token IS 'Token único para el link de bienvenida del cliente';
COMMENT ON COLUMN sales.admin_notes IS 'Notas sobre el pago para el equipo de administración';
COMMENT ON COLUMN sales.coach_notes IS 'Notas sobre la llamada de cierre para el coach asignado';
