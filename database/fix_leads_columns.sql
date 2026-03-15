-- 1. Add missing columns to leads table
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS in_out TEXT DEFAULT 'Inbound',
  ADD COLUMN IF NOT EXISTS procedencia_detalle TEXT,
  ADD COLUMN IF NOT EXISTS qualification_level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS objections TEXT,
  ADD COLUMN IF NOT EXISTS recording_url TEXT,
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS closer_notes TEXT,
  ADD COLUMN IF NOT EXISTS closer_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS setter_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS project TEXT DEFAULT 'PT';

-- 2. Drop existing restrictive policies for leads
DROP POLICY IF EXISTS "Staff can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Staff can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Staff can update leads" ON public.leads;
DROP POLICY IF EXISTS "Leads: Setters and Closers can see their assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Leads: Comprehensive Access" ON public.leads;

-- 3. Create comprehensive access policy for leads
-- Allows access to: assigned_to, setter_id, closer_id, or anyone with Admin/Direccion/Head Coach role
CREATE POLICY "Leads: Comprehensive Access"
ON public.leads FOR ALL
TO authenticated
USING (
  auth.uid() = assigned_to OR 
  auth.uid() = setter_id OR 
  auth.uid() = closer_id OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND (role IN ('admin', 'head_coach', 'direccion'))
  )
)
WITH CHECK (
  auth.uid() = assigned_to OR 
  auth.uid() = setter_id OR 
  auth.uid() = closer_id OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND (role IN ('admin', 'head_coach', 'direccion'))
  )
);

-- 4. Ensure RLS is active
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.leads.closer_id IS 'ID of the closer who handles the call';
COMMENT ON COLUMN public.leads.setter_id IS 'ID of the setter who generated the lead';
