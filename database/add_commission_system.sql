-- 1. Tabla de Métodos de Pago (Configurable por Admin)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- Ej: "Hotmart", "Stripe", "Transferencia"
    platform_fee_percentage NUMERIC(5,2) DEFAULT 0, -- Ej: 9.90 para 9.9%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar valores por defecto para empezar
('Hotmart', 9.90),
('Stripe', 2.90 + 0.30),
('Transferencia Bancaria', 0.00),
('PayPal', 3.40);

-- 1.1 Habilitar Seguridad (RLS)
ALTER TABLE payment_methods ENABLE ROW SECURITY;

-- Política: Todos pueden VER los métodos de pago (necesario para el formulario de venta)
CREATE POLICY "Public Read Access" ON payment_methods FOR SELECT USING (true);

-- Política: Solo Admins pueden CREAR/EDITAR/BORRAR
CREATE POLICY "Admin Full Access" ON payment_methods FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- 2. Añadir % de comisión al perfil del usuario (Closer)
-- Si ya existe, no hará nada malo, si no, lo crea.
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5,2) DEFAULT 10.00; -- Por defecto 10%

-- 3. Actualizar la tabla de Ventas para guardar el desglose financiero
-- Es importante guardar esto EN EL MOMENTO DE LA VENTA, por si cambian los % en el futuro.
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id),
ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(10,2) DEFAULT 0, -- Cuánto se quedó la pasarela (ej. 99€)
ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10,2) DEFAULT 0, -- Cuánto llegó a la academia (ej. 901€)
ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2) DEFAULT 0; -- Cuánto gana el closer (ej. 90.10€)

-- Comentarios para documentación
COMMENT ON COLUMN sales.platform_fee_amount IS 'Dinero retenido por la pasarela de pago (Hotmart/Stripe)';
COMMENT ON COLUMN sales.net_amount IS 'Dinero real recibido (Venta - Fee Pasarela)';
COMMENT ON COLUMN sales.commission_amount IS 'Comisión del closer calculada sobre el Net Amount';
