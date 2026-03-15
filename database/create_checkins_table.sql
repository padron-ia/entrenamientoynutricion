-- ==============================================================================
-- 1. Create Weekly Check-ins Table
-- This table stores the forms filled out by clients every week.
-- ==============================================================================

-- We use TEXT for client_id to be compatible with Notion IDs or other string IDs.
-- If you are fully migrated to Supabase UUIDs, you can change this to UUID.

CREATE TABLE IF NOT EXISTS public.weekly_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id TEXT NOT NULL, -- References the ID in your clients table (e.g. 'clientes_pt_notion')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Storing answers as JSONB allows flexibility if questions change over time
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Extracted metrics for easier querying (optional)
    rating INTEGER, -- Self-rating 1-10
    
    -- Status workflow
    status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'reviewed')),
    coach_notes TEXT, -- Private notes from coach about this check-in

    -- Optional: If you want to enforce Referential Integrity and your parent table is 'clientes_pt_notion'
    -- CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES public.clientes_pt_notion(id) ON DELETE CASCADE
    -- Note: Only uncomment above if 'clientes_pt_notion' exists and 'id' types match (Text vs UUID etc)
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for faster lookups by client
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_client_id ON public.weekly_checkins(client_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_created_at ON public.weekly_checkins(created_at);

-- ==============================================================================
-- 2. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

-- 2a. Clients can INSERT their own check-ins
-- Assumption: auth.uid() matches the client_id or there is a mapping table.
-- For simple setups or demos:
CREATE POLICY "Enable insert for authenticated users" ON public.weekly_checkins
    FOR INSERT TO authenticated
    WITH CHECK (true); 

-- 2b. Clients can VIEW only their own check-ins
-- Requires: A way to link auth.users.id to the client_id in this table.
-- If client_id IS the auth.uid:
-- USING (auth.uid()::text = client_id);
-- For now, allowing read for authenticated to facilitate demo/testing:
CREATE POLICY "Enable read for authenticated users" ON public.weekly_checkins
    FOR SELECT TO authenticated
    USING (true);

-- 2c. Coaches/Admins can UPDATE (e.g. mark as reviewed)
CREATE POLICY "Enable update for authenticated users" ON public.weekly_checkins
    FOR UPDATE TO authenticated
    USING (true);

-- ==============================================================================
-- 3. Trigger for Updated At
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_weekly_checkins_updated_at ON public.weekly_checkins;

CREATE TRIGGER update_weekly_checkins_updated_at
    BEFORE UPDATE ON public.weekly_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 4. (Optional) Reviews Table
-- If you want to store the Coach's video feedback separately
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.coaching_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id TEXT NOT NULL,
    coach_id TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    recording_url TEXT, -- Loom Video Link
    coach_comments TEXT,
    
    type TEXT DEFAULT 'weekly_review',
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read public for demo" ON public.coaching_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert public for demo" ON public.coaching_sessions FOR INSERT TO authenticated WITH CHECK (true);

-- ==============================================================================
-- 5. Migration: Add reviewed_at column
-- Run this if the table already exists
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'weekly_checkins'
        AND column_name = 'reviewed_at'
    ) THEN
        ALTER TABLE public.weekly_checkins
        ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;

        COMMENT ON COLUMN public.weekly_checkins.reviewed_at IS
            'Fecha en que el coach marcó el check-in como revisado';
    END IF;
END $$;
