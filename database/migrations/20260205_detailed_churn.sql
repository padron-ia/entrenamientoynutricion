-- Migration: Detailed Churn Tracking for Business Analytics
-- Date: 2026-02-05

ALTER TABLE business_snapshots 
ADD COLUMN IF NOT EXISTS lost_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS abandonment_count INTEGER DEFAULT 0;

-- Optional: Initial migration for existing churn data if possible
-- This is hard without full history, so we initialize to 0 or split churn if possible.
-- For now, just adding columns is sufficient for new entries.
