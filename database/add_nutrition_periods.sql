-- Add new columns to nutrition_plans for automatic assignment
ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS diet_type TEXT,
ADD COLUMN IF NOT EXISTS target_month INTEGER CHECK (target_month >= 1 AND target_month <= 12),
ADD COLUMN IF NOT EXISTS target_fortnight INTEGER CHECK (target_fortnight IN (1, 2));

-- Add a comment to describe the diet_type values
-- Values: 'Flexible', 'Sin Gluten', 'Vegetariano', 'Pescetariano', 'Vegano', 'Sin Carne Roja', 'Ovolactovegetariano'
COMMENT ON COLUMN nutrition_plans.diet_type IS 'Tipos de alimentación: Flexible, Sin Gluten, Vegetariano, Pescetariano, Vegano, Sin Carne Roja, Ovolactovegetariano';

-- Create an index to optimize searching for automatic plans
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_auto_lookup 
ON nutrition_plans (diet_type, target_calories, target_month, target_fortnight, status);
