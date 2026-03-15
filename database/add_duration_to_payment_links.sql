-- Add duration_months column to payment_links table
ALTER TABLE payment_links 
ADD COLUMN IF NOT EXISTS duration_months INTEGER;

-- Update existing records with typical durations based on name patterns
UPDATE payment_links 
SET duration_months = 3 
WHERE LOWER(name) LIKE '%trimestral%' OR LOWER(name) LIKE '%3 meses%';

UPDATE payment_links 
SET duration_months = 6 
WHERE LOWER(name) LIKE '%semestral%' OR LOWER(name) LIKE '%6 meses%';

UPDATE payment_links 
SET duration_months = 12 
WHERE LOWER(name) LIKE '%anual%' OR LOWER(name) LIKE '%12 meses%' OR LOWER(name) LIKE '%año%';

UPDATE payment_links 
SET duration_months = 1 
WHERE LOWER(name) LIKE '%mensual%' OR LOWER(name) LIKE '%mes%';
