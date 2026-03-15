-- Migration: Project Segmentation for Business Analytics
-- Date: 2026-02-04

-- 1. Update business_snapshots
-- Add project column
ALTER TABLE business_snapshots 
ADD COLUMN IF NOT EXISTS project TEXT DEFAULT 'Global';

-- Update uniqueness constraint
-- First, remove old unique constraint on snapshot_date if it exists
-- The original schema had: snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE
-- We need to drop the unique constraint to add the composite one.
-- In Supabase/Postgres, the 'UNIQUE' keyword on a column creates an index named "business_snapshots_snapshot_date_key" usually.

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_snapshots_snapshot_date_key') THEN
        ALTER TABLE business_snapshots DROP CONSTRAINT business_snapshots_snapshot_date_key;
    END IF;
END $$;

-- Explicitly add composite unique constraint
ALTER TABLE business_snapshots 
ADD CONSTRAINT business_snapshots_date_project_unique UNIQUE (snapshot_date, project);

-- 2. Update notion_leads_metrics
-- Add project column to allow differentiating between PT and ME leads
ALTER TABLE public.notion_leads_metrics 
ADD COLUMN IF NOT EXISTS project TEXT DEFAULT 'PT';

-- Update existing rows based on common indicators if possible
-- For example, if name contains 'medico' or 'medica', it might be ME (Metodo Elite)
UPDATE public.notion_leads_metrics 
SET project = 'ME' 
WHERE nombre_lead ILIKE '%medico%' OR nombre_lead ILIKE '%medica%';
