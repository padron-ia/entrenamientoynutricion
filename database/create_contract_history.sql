-- Contract History Table
-- Stores signed contracts for audit/history purposes
-- Each time a contract is signed, a copy is saved here

CREATE TABLE IF NOT EXISTS contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  contract_date TEXT,
  duration_months INTEGER,
  duration_days INTEGER,
  amount NUMERIC,
  financing_installments INTEGER DEFAULT 0,
  financing_amount NUMERIC DEFAULT 0,
  client_name TEXT,
  client_dni TEXT,
  client_address TEXT,
  contract_html TEXT,
  signature_image TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Index for fast lookup by client
CREATE INDEX IF NOT EXISTS idx_contract_history_client_id ON contract_history(client_id);

-- RLS
ALTER TABLE contract_history ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (same pattern as other tables)
CREATE POLICY "Allow all access to contract_history"
  ON contract_history
  FOR ALL
  USING (true)
  WITH CHECK (true);
