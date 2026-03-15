-- Migration: Update leads table with fields from Notion screenshots for Setters and Closers
-- Phase 1: Database Structure improvements

-- 1. Add new columns to 'leads' table
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS in_out TEXT DEFAULT 'Inbound', -- Inbound / Outbound
  ADD COLUMN IF NOT EXISTS procedencia_detalle TEXT, -- Doctors, Formulario, WhatsApp, etc.
  ADD COLUMN IF NOT EXISTS qualification_level INTEGER DEFAULT 1, -- 1 to 5
  ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT FALSE, -- Presentado (for Closers)
  ADD COLUMN IF NOT EXISTS objections TEXT, -- Motivos de no cierre
  ADD COLUMN IF NOT EXISTS recording_url TEXT, -- URL de la grabación de la llamada
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10, 2), -- Precio de venta final
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10, 2), -- Comisión calculada
  ADD COLUMN IF NOT EXISTS meeting_link TEXT, -- Link de la videollamada (Meet/Zoom)
  ADD COLUMN IF NOT EXISTS closer_notes TEXT, -- Notas específicas del Closer
  ADD COLUMN IF NOT EXISTS closer_id UUID REFERENCES auth.users(id); -- ID del Closer asignado si es diferente del assigned_to

-- 2. Update existing status labels if needed (just as reference, we keep NEW, CONTACTED, SCHEDULED, WON, LOST)
-- No changes needed to types since they are compatible.

-- 3. Add column to track who created the lead if applicable
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 4. Enable RLS (just in case it's not enabled)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 5. Policies for leads (Atomic access based on role)
-- Note: Adjusting policies to ensure setters and closers can read leads they are part of.
DROP POLICY IF EXISTS "Leads: Setters and Closers can see their assigned leads" ON leads;
CREATE POLICY "Leads: Setters and Closers can see their assigned leads"
ON leads FOR ALL
USING (
  auth.uid() = assigned_to OR 
  auth.uid() = setter_id OR 
  auth.uid() = closer_id OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'head_coach'))
);

COMMENT ON TABLE leads IS 'Table to manage leads with enhanced fields for Setters and Closers based on Notion layout.';
