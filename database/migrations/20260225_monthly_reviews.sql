-- =====================================================
-- Migration: Create monthly_reviews table
-- Date: 2026-02-25
-- Description: Stores the coach's monthly review of each
--   client: direction, alignment, reason, achievements.
--   Includes auto-calculated weekly aggregates.
-- =====================================================

CREATE TABLE IF NOT EXISTS monthly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL,
  month TEXT NOT NULL, -- Format: 'YYYY-MM'

  -- Coach input (selectors)
  direction_status TEXT NOT NULL CHECK (direction_status IN ('on_track', 'at_risk', 'off_track')),
  alignment TEXT NOT NULL CHECK (alignment IN ('aligned', 'partial', 'not_aligned')),
  main_reason TEXT NOT NULL CHECK (main_reason IN ('adherence', 'organization', 'plan', 'context', 'expectations', 'mixed')),

  -- Coach input (text)
  achievements TEXT,        -- 1-2 sentences: what was achieved this month
  next_month_change TEXT,   -- 1 sentence: what to change next month

  -- Auto-calculated from weekly_coach_reviews
  weeks_reviewed INTEGER DEFAULT 0,
  weeks_green INTEGER DEFAULT 0,
  weeks_yellow INTEGER DEFAULT 0,
  weeks_red INTEGER DEFAULT 0,
  total_goals INTEGER DEFAULT 0,
  goals_fulfilled INTEGER DEFAULT 0,
  goals_partial INTEGER DEFAULT 0,
  goals_not_fulfilled INTEGER DEFAULT 0,
  process_score INTEGER,    -- 0-100 calculated score

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One review per client per month
CREATE UNIQUE INDEX IF NOT EXISTS idx_mr_unique ON monthly_reviews(client_id, month);
CREATE INDEX IF NOT EXISTS idx_mr_client ON monthly_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_mr_month ON monthly_reviews(month);

-- RLS
ALTER TABLE monthly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own monthly reviews"
  ON monthly_reviews
  FOR ALL
  USING (true)
  WITH CHECK (true);
