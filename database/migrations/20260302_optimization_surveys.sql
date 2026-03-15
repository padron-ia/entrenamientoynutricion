-- =====================================================
-- Migration: Optimization Survey (pre-renewal call)
-- Date: 2026-03-02
-- =====================================================

CREATE TABLE IF NOT EXISTS optimization_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,

  -- Respuestas
  biggest_achievement TEXT,
  biggest_challenge TEXT,
  improvement_suggestions TEXT,
  satisfaction_rating INTEGER,         -- 0-10
  rating_reason TEXT,                  -- solo si rating ≤ 7
  has_referral BOOLEAN DEFAULT false,
  referral_name TEXT,
  referral_phone TEXT,
  future_goals TEXT,
  goal_feeling TEXT,
  importance_rating INTEGER,           -- 1-10
  additional_comments TEXT,

  -- Meta
  contract_phase TEXT,                 -- F1, F2, F3, F4, F5
  contract_end_date DATE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  coach_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE optimization_surveys ENABLE ROW LEVEL SECURITY;

-- Clients can insert and read their own surveys
CREATE POLICY "Clients can manage own optimization surveys"
  ON optimization_surveys FOR ALL TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clientes_pt_notion
      WHERE user_id::text = auth.uid()::text
         OR id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clientes_pt_notion
      WHERE user_id::text = auth.uid()::text
         OR id::text = auth.uid()::text
    )
  );

-- Coaches/Admins full access
CREATE POLICY "Coaches/Admins can manage optimization surveys"
  ON optimization_surveys FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
