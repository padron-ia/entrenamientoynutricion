-- =====================================================
-- SQL Script: Create client_risk_alerts and comments
-- Sistema Antiabandono de Clientes
-- =====================================================

-- 1. Create the risk alerts table (main alert)
CREATE TABLE IF NOT EXISTS client_risk_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id TEXT NOT NULL,
    coach_id UUID NOT NULL,
    reason_category TEXT NOT NULL CHECK (reason_category IN ('no_response', 'no_checkins', 'not_following_plan', 'demotivated', 'personal_issues', 'other', 'technical_issue', 'financial_issue')),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the risk alert comments table (tracking history)
CREATE TABLE IF NOT EXISTS client_risk_alert_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_id UUID NOT NULL REFERENCES client_risk_alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT,
    user_role TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_risk_alerts_client_id ON client_risk_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_status ON client_risk_alerts(status);
CREATE INDEX IF NOT EXISTS idx_risk_alert_comments_alert_id ON client_risk_alert_comments(alert_id);

-- 4. Enable Row Level Security
ALTER TABLE client_risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_risk_alert_comments ENABLE ROW LEVEL SECURITY;

-- 5. Policies for client_risk_alerts
DROP POLICY IF EXISTS "Staff can view all alerts" ON client_risk_alerts;
CREATE POLICY "Staff can view all alerts" ON client_risk_alerts
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Staff can insert alerts" ON client_risk_alerts;
CREATE POLICY "Staff can insert alerts" ON client_risk_alerts
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Staff can update alerts" ON client_risk_alerts;
CREATE POLICY "Staff can update alerts" ON client_risk_alerts
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 6. Policies for client_risk_alert_comments
DROP POLICY IF EXISTS "Staff can view all alert comments" ON client_risk_alert_comments;
CREATE POLICY "Staff can view all alert comments" ON client_risk_alert_comments
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Staff can insert alert comments" ON client_risk_alert_comments;
CREATE POLICY "Staff can insert alert comments" ON client_risk_alert_comments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Trigger for updated_at on client_risk_alerts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_update_risk_alerts_updated_at ON client_risk_alerts;
CREATE TRIGGER tr_update_risk_alerts_updated_at
    BEFORE UPDATE ON client_risk_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE client_risk_alerts IS 'Sistema de alertas de riesgo de abandono de clientes';
COMMENT ON TABLE client_risk_alert_comments IS 'Historial de seguimiento y comentarios para cada alerta de riesgo';
