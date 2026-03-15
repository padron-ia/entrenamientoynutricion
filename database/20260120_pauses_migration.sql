-- CONTRACT PAUSES MIGRATION: 2026-01-20
-- Create contract_pauses Table
CREATE TABLE IF NOT EXISTS public.contract_pauses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clientes_pt_notion(id) ON DELETE CASCADE,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE, -- NULL means currently paused
    reason TEXT,
    days_duration INTEGER DEFAULT 0,
    applied BOOLEAN DEFAULT FALSE, -- If true, days have been added to contract_end_date
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS pauses_client_id_idx ON public.contract_pauses(client_id);
CREATE INDEX IF NOT EXISTS pauses_active_idx ON public.contract_pauses(client_id) WHERE end_date IS NULL;

-- RLS
ALTER TABLE public.contract_pauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view pauses" 
ON public.contract_pauses FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Staff can insert pauses" 
ON public.contract_pauses FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Staff can update pauses" 
ON public.contract_pauses FOR UPDATE 
TO authenticated 
USING (true);
