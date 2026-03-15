
-- ACTUALIZACIÓN MAESTRA DE LA TABLA SALES (BILLETERA)

-- 1. Añadir columnas para desglose financiero preciso
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'sale', -- 'sale' (alta) o 'renewal' (renovación)
ADD COLUMN IF NOT EXISTS renewal_phase TEXT, -- 'F2', 'F3', etc.
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2) DEFAULT 0, -- Importe limpio tras comisiones de pasarela
ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10,2) DEFAULT 0, -- Lo que se queda Stripe/Hotmart
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0, -- Lo que se lleva el Closer o Coach
ADD COLUMN IF NOT EXISTS payment_method_id UUID; -- Referencia al método de pago para calcular fees

-- 2. Asegurar índices para reportes rápidos
CREATE INDEX IF NOT EXISTS idx_sales_type ON public.sales(transaction_type);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);

-- 3. Comentarios para documentación
COMMENT ON COLUMN public.sales.net_amount IS 'Importe bruto menos la comisión de la pasarela de pago (Base para comisiones)';
COMMENT ON COLUMN public.sales.commission_amount IS 'Comisión calculada para el Staff (Closer o Coach)';
