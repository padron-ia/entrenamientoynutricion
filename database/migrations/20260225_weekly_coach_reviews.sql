-- =====================================================
-- Migration: Create weekly_coach_reviews table
-- Date: 2026-02-25
-- Description: Stores the coach's weekly assessment of
--   each client: feeling, next-week decision, note,
--   and goal completion counts. Linked to weekly_checkins.
-- =====================================================

CREATE TABLE IF NOT EXISTS weekly_coach_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL,
  checkin_id UUID REFERENCES weekly_checkins(id) ON DELETE SET NULL,
  week_start DATE NOT NULL,
  week_number INTEGER NOT NULL,
  feeling TEXT NOT NULL CHECK (feeling IN ('green', 'yellow', 'red')),
  next_week_decision TEXT NOT NULL CHECK (next_week_decision IN ('maintain', 'simplify', 'change_approach')),
  coach_note TEXT,
  goals_fulfilled INTEGER DEFAULT 0,
  goals_partial INTEGER DEFAULT 0,
  goals_not_fulfilled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wcr_client ON weekly_coach_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_wcr_week ON weekly_coach_reviews(week_start);
CREATE INDEX IF NOT EXISTS idx_wcr_client_week ON weekly_coach_reviews(client_id, week_start);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wcr_unique ON weekly_coach_reviews(client_id, week_start);

-- RLS
ALTER TABLE weekly_coach_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own reviews"
  ON weekly_coach_reviews
  FOR ALL
  USING (true)
  WITH CHECK (true);
