-- Añadir campos de contrato a la tabla de ventas para que el closer pueda adelantarlos
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS client_dni TEXT,
ADD COLUMN IF NOT EXISTS client_address TEXT;

-- También asegurar que el monto y el método de pago existen (ya deberían estar pero por si acaso)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='sale_amount') THEN
        ALTER TABLE public.sales ADD COLUMN sale_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='payment_method') THEN
        ALTER TABLE public.sales ADD COLUMN payment_method TEXT;
    END IF;
END $$;
