-- =====================================================
-- SQL Script: Create client_risk_alert_comments table
-- Historial de comentarios para alertas de riesgo
-- =====================================================

CREATE TABLE IF NOT EXISTS client_risk_alert_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_id UUID NOT NULL REFERENCES client_risk_alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT,
    user_role TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_alert_comments_alert_id ON client_risk_alert_comments(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_comments_created_at ON client_risk_alert_comments(created_at);

-- Enable RLS
ALTER TABLE client_risk_alert_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view all comments
CREATE POLICY "Staff can view alert comments" ON client_risk_alert_comments
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy: Staff can insert comments
CREATE POLICY "Staff can insert alert comments" ON client_risk_alert_comments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON TABLE client_risk_alert_comments IS 'Comentarios e intervenciones en alertas de riesgo';
