-- =====================================================
-- SISTEMA DE FACTURACIÓN (COMPATIBLE CON MOCKS)
-- =====================================================

-- 1. Crear tabla de facturas
-- NOTA: Usamos TEXT para coach_id para permitir usuarios mock ('closer-1')
-- En producción guardará los UUIDs igualmente.
CREATE TABLE IF NOT EXISTS public.coach_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    coach_id TEXT NOT NULL, -- Cambiado de UUID a TEXT
    
    -- Campos Obligatorios
    period_date DATE NOT NULL, 
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    invoice_url TEXT NOT NULL, 
    
    -- Campos de Gestión
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    admin_notes TEXT, 
    
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_invoices_coach ON public.coach_invoices(coach_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON public.coach_invoices(period_date);

-- 3. Habilitar Seguridad (RLS)
ALTER TABLE public.coach_invoices ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE SEGURIDAD
-- ==========================

-- A. COACHES: Pueden ver SUS propias facturas
-- Usamos casting ::text para asegurar comparación correcta
CREATE POLICY "Coach ve sus facturas"
ON public.coach_invoices
FOR SELECT
USING (auth.uid()::text = coach_id); 

-- B. COACHES: Pueden subir SUS facturas
CREATE POLICY "Coach sube facturas"
ON public.coach_invoices
FOR INSERT
WITH CHECK (auth.uid()::text = coach_id);

-- C. ADMIN y CONTABILIDAD: Pueden ver TODAS las facturas
CREATE POLICY "Admin/Contabilidad ve todo"
ON public.coach_invoices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND role IN ('admin', 'contabilidad')
  )
);
