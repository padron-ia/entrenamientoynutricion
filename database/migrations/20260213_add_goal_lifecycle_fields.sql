-- Migration: Add lifecycle fields to coach_goals
-- Date: 2026-02-13
-- Description: Adds start_date, completed_at, failure_reason, action_plan
--              to support full goal lifecycle (pending → achieved/failed)

ALTER TABLE coach_goals ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE coach_goals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE coach_goals ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE coach_goals ADD COLUMN IF NOT EXISTS action_plan TEXT;
