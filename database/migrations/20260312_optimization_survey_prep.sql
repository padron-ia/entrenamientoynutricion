-- Add coach preparation field to optimization_surveys
-- Separates pre-call preparation (here) from post-call notes (in renewal_calls)
ALTER TABLE optimization_surveys ADD COLUMN IF NOT EXISTS coach_proposal TEXT;
