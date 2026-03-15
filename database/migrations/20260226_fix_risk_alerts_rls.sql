-- =====================================================
-- Migration: Fix client_risk_alerts RLS policies
-- Date: 2026-02-26
-- Problem: INSERT/UPDATE on client_risk_alerts returns
--   401 Unauthorized / 42501 RLS violation because the
--   original policies may not have been applied, or
--   they need to include 'super_admin' and 'dietitian'.
-- =====================================================

-- 1. Drop ALL existing policies on client_risk_alerts
DROP POLICY IF EXISTS "Staff can view all alerts" ON client_risk_alerts;
DROP POLICY IF EXISTS "Staff can insert alerts" ON client_risk_alerts;
DROP POLICY IF EXISTS "Staff can update alerts" ON client_risk_alerts;
DROP POLICY IF EXISTS "Staff can delete alerts" ON client_risk_alerts;
DROP POLICY IF EXISTS "Anyone authenticated can view alerts" ON client_risk_alerts;
DROP POLICY IF EXISTS "Anyone authenticated can insert alerts" ON client_risk_alerts;
DROP POLICY IF EXISTS "Anyone authenticated can update alerts" ON client_risk_alerts;

-- 2. Ensure RLS is enabled
ALTER TABLE client_risk_alerts ENABLE ROW LEVEL SECURITY;

-- 3. Recreate with permissive policies (all authenticated users)
CREATE POLICY "Authenticated users can view alerts" ON client_risk_alerts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert alerts" ON client_risk_alerts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update alerts" ON client_risk_alerts
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete alerts" ON client_risk_alerts
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 4. Same for client_risk_alert_comments
DROP POLICY IF EXISTS "Staff can view all alert comments" ON client_risk_alert_comments;
DROP POLICY IF EXISTS "Staff can insert alert comments" ON client_risk_alert_comments;
DROP POLICY IF EXISTS "Anyone authenticated can view comments" ON client_risk_alert_comments;
DROP POLICY IF EXISTS "Anyone authenticated can insert comments" ON client_risk_alert_comments;

CREATE POLICY "Authenticated can view alert comments" ON client_risk_alert_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert alert comments" ON client_risk_alert_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Also fix low_process_score not being in original CHECK constraint
-- The original table has: reason_category IN ('no_response', 'no_checkins', 'not_following_plan', 'demotivated', 'personal_issues', 'other', 'technical_issue', 'financial_issue')
-- But the code also uses 'low_process_score' — we need to drop and recreate the constraint
ALTER TABLE client_risk_alerts DROP CONSTRAINT IF EXISTS client_risk_alerts_reason_category_check;
ALTER TABLE client_risk_alerts ADD CONSTRAINT client_risk_alerts_reason_category_check 
  CHECK (reason_category IN ('no_response', 'no_checkins', 'not_following_plan', 'demotivated', 'personal_issues', 'other', 'technical_issue', 'financial_issue', 'low_process_score'));
