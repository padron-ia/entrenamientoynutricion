-- Migration: Add extra metrics and project support to business_snapshots
-- This allows tracking PT vs ME vs Global and more detailed financial/satisfaction metrics.

-- 1. Add project column
ALTER TABLE business_snapshots ADD COLUMN IF NOT EXISTS project TEXT DEFAULT 'Global';

-- 2. Drop the old UNIQUE constraint on snapshot_date if it exists
-- We first need to find the name of the constraint. Usually, it's business_snapshots_snapshot_date_key
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_snapshots_snapshot_date_key') THEN
        ALTER TABLE business_snapshots DROP CONSTRAINT business_snapshots_snapshot_date_key;
    END IF;
END $$;

-- 3. Add composite unique constraint for date + project
ALTER TABLE business_snapshots ADD CONSTRAINT business_snapshots_date_project_unique UNIQUE (snapshot_date, project);

-- 4. Add new metrics columns
ALTER TABLE business_snapshots ADD COLUMN IF NOT EXISTS program_satisfaction NUMERIC DEFAULT 0;
ALTER TABLE business_snapshots ADD COLUMN IF NOT EXISTS contracted_money DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE business_snapshots ADD COLUMN IF NOT EXISTS operating_costs DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE business_snapshots ADD COLUMN IF NOT EXISTS marketing_costs DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE business_snapshots ADD COLUMN IF NOT EXISTS taxes_paid DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE business_snapshots ADD COLUMN IF NOT EXISTS ltv DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE business_snapshots ADD COLUMN IF NOT EXISTS cac DECIMAL(12, 2) DEFAULT 0;

-- 5. Add comments for clarity
COMMENT ON COLUMN business_snapshots.project IS 'Project specific: Global, PT or ME';
COMMENT ON COLUMN business_snapshots.program_satisfaction IS 'Average program satisfaction score (1-10)';
COMMENT ON COLUMN business_snapshots.contracted_money IS 'Total money contracted (signed) in the period';
