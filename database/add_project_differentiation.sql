-- Migration: Add project differentiation for leads and sales
-- Projects: Padron Trainer (PT) and Medico Emprendedor (ME)

-- 1. Add project column to 'leads' table
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS project TEXT DEFAULT 'PT'; -- Default to Padron Trainer

-- 2. Add project column to 'sales' table
ALTER TABLE sales 
  ADD COLUMN IF NOT EXISTS project TEXT DEFAULT 'PT';

-- 3. Update existing data if necessary (defaults to PT as it is the main project)
-- UPDATE leads SET project = 'PT' WHERE project IS NULL;
-- UPDATE sales SET project = 'PT' WHERE project IS NULL;

-- 4. Add comments
COMMENT ON COLUMN leads.project IS 'Project specific to the lead: PT (Padron Trainer) or ME (Medico Emprendedor)';
COMMENT ON COLUMN sales.project IS 'Project specific to the sale: PT or ME';
