-- Migration: Nutrition Assignment History
-- Stores previous nutrition plan assignments when a client gets reassigned to a new plan.

CREATE TABLE IF NOT EXISTS client_nutrition_assignment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL,
  plan_id UUID REFERENCES nutrition_plans(id) ON DELETE SET NULL,
  plan_name TEXT,
  assigned_at TIMESTAMPTZ NOT NULL,
  assigned_by UUID,
  replaced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by client
CREATE INDEX IF NOT EXISTS idx_nutrition_history_client_id
  ON client_nutrition_assignment_history(client_id);

-- Index for ordering by replacement date
CREATE INDEX IF NOT EXISTS idx_nutrition_history_replaced_at
  ON client_nutrition_assignment_history(client_id, replaced_at DESC);

-- RLS Policies
ALTER TABLE client_nutrition_assignment_history ENABLE ROW LEVEL SECURITY;

-- Anon can read (client portal uses anon key)
CREATE POLICY "anon_read_nutrition_history"
  ON client_nutrition_assignment_history
  FOR SELECT
  TO anon
  USING (true);

-- Anon can insert (service calls use anon key)
CREATE POLICY "anon_insert_nutrition_history"
  ON client_nutrition_assignment_history
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated users full access
CREATE POLICY "authenticated_all_nutrition_history"
  ON client_nutrition_assignment_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
