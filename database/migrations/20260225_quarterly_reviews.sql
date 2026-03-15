-- =====================================================
-- Migration: Create quarterly_reviews table
-- Date: 2026-02-25
-- Description: Stores the coach's quarterly/renewal review
--   of each client: goal evaluations, classification,
--   recommendation, pre/post call notes.
--   Linked to renewal_calls for renewal decision support.
-- =====================================================

CREATE TABLE IF NOT EXISTS quarterly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL,
  renewal_call_id UUID REFERENCES renewal_calls(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Goal evaluations: [{goal_text, status, reason}]
  goal_evaluations JSONB DEFAULT '[]'::jsonb,

  -- Coach input (selectors)
  client_classification TEXT CHECK (client_classification IN (
    'good_progress', 'slow_steady', 'irregular', 'low_adherence', 'technical_block'
  )),
  recommendation TEXT CHECK (recommendation IN (
    'continue', 'simplify', 'change_strategy', 'redefine_goals', 'do_not_renew'
  )),

  -- Notes
  pre_call_notes TEXT,   -- Coach's preparation notes before the call
  post_call_notes TEXT,  -- Conclusions after the call

  -- Auto-calculated
  process_score INTEGER, -- 0-100 calculated score for the period

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qr_client ON quarterly_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_qr_renewal ON quarterly_reviews(renewal_call_id);

-- RLS
ALTER TABLE quarterly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own quarterly reviews"
  ON quarterly_reviews
  FOR ALL
  USING (true)
  WITH CHECK (true);
