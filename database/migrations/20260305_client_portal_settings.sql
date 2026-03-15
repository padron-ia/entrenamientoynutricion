-- Migration: client_portal_settings
-- Description: Table for storing client-specific portal settings (tour status, initial checklist, and notification seen timestamps)

-- Create the table
CREATE TABLE IF NOT EXISTS public.client_portal_settings (
    client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
    tour_seen BOOLEAN DEFAULT FALSE,
    checklist_state JSONB DEFAULT '{
        "savedLink": false,
        "firstLog": false,
        "firstCheckin": false,
        "seenNutrition": false
    }'::JSONB,
    reports_last_seen_at TIMESTAMPTZ,
    reviews_last_seen_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.client_portal_settings ENABLE ROW LEVEL SECURITY;

-- Policies for clients
CREATE POLICY "Clients can view their own settings" 
ON public.client_portal_settings FOR SELECT 
TO authenticated 
USING (auth.uid() = client_id);

CREATE POLICY "Clients can update their own settings" 
ON public.client_portal_settings FOR UPDATE 
TO authenticated 
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can insert their own settings" 
ON public.client_portal_settings FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = client_id);

-- Policies for coaches/admins
CREATE POLICY "Coaches/Admins can view all settings" 
ON public.client_portal_settings FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('coach', 'admin')
    )
);

-- Updated at trigger
CREATE TRIGGER set_client_portal_settings_updated_at
BEFORE UPDATE ON public.client_portal_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
