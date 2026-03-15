-- Table for storing internal announcements/communications
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT NOT NULL, -- Coach or Admin name
    sender_role TEXT NOT NULL, -- 'coach' or 'admin'
    
    -- Announcement content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    announcement_type TEXT DEFAULT 'info', -- 'info', 'important', 'warning', 'success'
    priority INTEGER DEFAULT 0, -- 0=normal, 1=high, 2=urgent
    
    -- Targeting
    target_audience TEXT NOT NULL, -- 'my_clients', 'all_active_clients', 'specific_clients'
    coach_filter TEXT, -- If sent by coach, their name
    client_ids TEXT[], -- Array of specific client IDs if targeted
    
    -- Display settings
    show_as_modal BOOLEAN DEFAULT false, -- If true, shows as popup on login
    show_in_feed BOOLEAN DEFAULT true, -- If true, shows in announcements feed
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration date
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    icon TEXT, -- Emoji or icon name
    color TEXT DEFAULT 'blue', -- 'blue', 'green', 'yellow', 'red', 'purple'
    action_url TEXT, -- Optional link/action
    action_label TEXT -- Label for the action button
);

-- Table for tracking which clients have read each announcement
CREATE TABLE IF NOT EXISTS announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(announcement_id, client_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON announcements(expires_at);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_client_id ON announcement_reads(client_id);

-- Comments
COMMENT ON TABLE announcements IS 'Internal announcements/communications shown to clients in their portal';
COMMENT ON TABLE announcement_reads IS 'Tracks which clients have read/dismissed each announcement';
COMMENT ON COLUMN announcements.show_as_modal IS 'If true, announcement appears as popup when client logs in';
COMMENT ON COLUMN announcements.show_in_feed IS 'If true, announcement appears in the announcements feed/section';
COMMENT ON COLUMN announcements.priority IS '0=normal (blue), 1=high (yellow), 2=urgent (red)';

