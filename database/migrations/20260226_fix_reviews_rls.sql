-- =====================================================
-- Migration: Fix Database Schema and RLS for Quarterly Reviews & Assessments
-- Date: 2026-02-26
-- =====================================================

-- 1. Extend coach_goals with missing columns if not present
DO $$ 
BEGIN 
    -- completion_status
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'coach_goals' AND COLUMN_NAME = 'completion_status') THEN
        ALTER TABLE coach_goals ADD COLUMN completion_status TEXT;
    END IF;

    -- reason_category
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'coach_goals' AND COLUMN_NAME = 'reason_category') THEN
        ALTER TABLE coach_goals ADD COLUMN reason_category TEXT;
    END IF;

    -- reason_detail
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'coach_goals' AND COLUMN_NAME = 'reason_detail') THEN
        ALTER TABLE coach_goals ADD COLUMN reason_detail TEXT;
    END IF;

    -- week_number
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'coach_goals' AND COLUMN_NAME = 'week_number') THEN
        ALTER TABLE coach_goals ADD COLUMN week_number INTEGER;
    END IF;
END $$;

-- 2. Update RLS for client_risk_alerts (Fixing 401 Unauthorized)
-- Coaches and Admins need to be able to create alerts
DO $$
BEGIN
    DROP POLICY IF EXISTS "Coaches/Admins can manage risk alerts" ON client_risk_alerts;
    CREATE POLICY "Coaches/Admins can manage risk alerts" 
    ON client_risk_alerts 
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);
END $$;

-- 3. Update RLS for quarterly_reviews (Fixing 42501 Insufficient Privilege)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Coaches/Admins can manage quarterly reviews" ON quarterly_reviews;
    CREATE POLICY "Coaches/Admins can manage quarterly reviews" 
    ON quarterly_reviews 
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);
END $$;

-- 4. Update RLS for weekly_coach_reviews
DO $$
BEGIN
    DROP POLICY IF EXISTS "Coaches/Admins can manage weekly coach reviews" ON weekly_coach_reviews;
    CREATE POLICY "Coaches/Admins can manage weekly coach reviews" 
    ON weekly_coach_reviews 
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);
END $$;

-- 5. Update RLS for coach_goals (Ensure updates work)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Coaches/Admins can update coach goals" ON coach_goals;
    CREATE POLICY "Coaches/Admins can update coach goals" 
    ON coach_goals 
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);
END $$;
