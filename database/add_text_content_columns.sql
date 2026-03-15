-- Add text content columns to nutrition_plans table
-- Allows storing free text blocks for each meal category instead of structured recipes

ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS intro_content TEXT,
ADD COLUMN IF NOT EXISTS breakfast_content TEXT,
ADD COLUMN IF NOT EXISTS lunch_content TEXT,
ADD COLUMN IF NOT EXISTS dinner_content TEXT,
ADD COLUMN IF NOT EXISTS snack_content TEXT;

COMMENT ON COLUMN nutrition_plans.intro_content IS 'Contenido de texto libre para la introducción del plan';
COMMENT ON COLUMN nutrition_plans.breakfast_content IS 'Contenido de texto libre para desayunos';
COMMENT ON COLUMN nutrition_plans.lunch_content IS 'Contenido de texto libre para comidas';
COMMENT ON COLUMN nutrition_plans.dinner_content IS 'Contenido de texto libre para cenas';
COMMENT ON COLUMN nutrition_plans.snack_content IS 'Contenido de texto libre para snacks';
