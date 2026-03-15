-- Fixed table for tracking team invitations (Corrected ID types)
DROP TABLE IF EXISTS public.team_invitations;

CREATE TABLE public.team_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    invited_by TEXT REFERENCES public.users(id) -- Changed from UUID to TEXT to match users table
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);

-- Disable RLS for now
ALTER TABLE public.team_invitations DISABLE ROW LEVEL SECURITY;
