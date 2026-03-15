-- Migration: Fix coach_goals RLS so clients can always read their own goals
-- Date: 2026-02-22
-- Problem: The original policy only matched via user_id column. If a client's
--          auth UID equals their clientes_pt_notion.id (not user_id), they were blocked.

-- Drop old client read policy
DROP POLICY IF EXISTS "Clients can view own goals" ON coach_goals;

-- New policy covers both cases:
--   1. clientes_pt_notion.user_id = auth.uid()  (account activated via invitation)
--   2. clientes_pt_notion.id = auth.uid()        (account created directly with auth UID as PK)
CREATE POLICY "Clients can view own goals" ON coach_goals
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clientes_pt_notion
      WHERE user_id::text = auth.uid()::text
         OR id::text = auth.uid()::text
    )
  );
