-- LEADS MIGRATION: 2026-01-20
-- Create Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "firstName" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    instagram_user TEXT,
    status TEXT NOT NULL DEFAULT 'NEW', -- NEW, CONTACTED, SCHEDULED, WON, LOST
    source TEXT DEFAULT 'Manual',
    notes TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    last_contact_date TIMESTAMP WITH TIME ZONE,
    next_followup_date TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads(status);
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads(created_at DESC);

-- RLS Policies (Row Level Security)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all leads (Staff)
-- In a stricter environment, you might restrict this to Setters/Closers/Admins
CREATE POLICY "Staff can view all leads" 
ON public.leads FOR SELECT 
TO authenticated 
USING (true);

-- Allow staff to insert leads
CREATE POLICY "Staff can insert leads" 
ON public.leads FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow staff to update leads
CREATE POLICY "Staff can update leads" 
ON public.leads FOR UPDATE 
TO authenticated 
USING (true);

-- Allow staff to delete leads (Optional, maybe restrict to Admin)
CREATE POLICY "Staff can delete leads" 
ON public.leads FOR DELETE 
TO authenticated 
USING (auth.jwt() ->> 'email' IN (SELECT email FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
