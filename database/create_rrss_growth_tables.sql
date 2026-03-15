-- Tables for Social Media Growth Tracking
CREATE TABLE IF NOT EXISTS rrss_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    platform TEXT NOT NULL, -- instagram, tiktok, youtube, facebook, etc.
    followers_count INTEGER DEFAULT 0,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rrss_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES rrss_channels(id) ON DELETE CASCADE,
    followers_count INTEGER NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE rrss_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rrss_metrics_history ENABLE ROW LEVEL SECURITY;

-- Simple policies (allow all for now to facilitate setup, can be refined later)
CREATE POLICY "Allow all on rrss_channels" ON rrss_channels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on rrss_metrics_history" ON rrss_metrics_history FOR ALL USING (true) WITH CHECK (true);
