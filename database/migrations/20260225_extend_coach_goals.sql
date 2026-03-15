-- =====================================================
-- Migration: Extend coach_goals for weekly assessment
-- Date: 2026-02-25
-- Description: Add completion_status, reason_category,
--   reason_detail, and week_number to coach_goals.
--   Migrate existing data from status to completion_status.
-- =====================================================

-- Add new columns
ALTER TABLE coach_goals
  ADD COLUMN IF NOT EXISTS completion_status TEXT CHECK (completion_status IN ('fulfilled', 'partial', 'not_fulfilled')),
  ADD COLUMN IF NOT EXISTS reason_category TEXT CHECK (reason_category IN ('client', 'goal', 'context', 'plan')),
  ADD COLUMN IF NOT EXISTS reason_detail TEXT CHECK (reason_detail IN (
    'not_actioned', 'poor_organization', 'demotivation', 'not_understood',
    'too_ambitious', 'too_vague', 'uncontrollable', 'not_priority',
    'travel_event', 'illness_injury', 'work_personal_stress', 'routine_change',
    'nutrition_plan_mismatch', 'training_not_viable', 'lack_tools', 'needs_more_support'
  )),
  ADD COLUMN IF NOT EXISTS week_number INTEGER;

-- Migrate existing data: achieved → fulfilled, failed → not_fulfilled
UPDATE coach_goals SET completion_status = 'fulfilled' WHERE status = 'achieved' AND completion_status IS NULL;
UPDATE coach_goals SET completion_status = 'not_fulfilled' WHERE status = 'failed' AND completion_status IS NULL;

-- Index for querying goals by client and week
CREATE INDEX IF NOT EXISTS idx_coach_goals_client_week ON coach_goals(client_id, week_number);
CREATE INDEX IF NOT EXISTS idx_coach_goals_completion ON coach_goals(client_id, completion_status);
