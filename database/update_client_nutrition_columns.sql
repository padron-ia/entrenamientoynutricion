-- Add Nutrition Assignment Columns to Clients Table
-- This is necessary to store the specific plan assignment for each client

ALTER TABLE clientes_pt_notion
ADD COLUMN IF NOT EXISTS assigned_nutrition_type TEXT,
ADD COLUMN IF NOT EXISTS assigned_calories NUMERIC;

-- Optional: Add comments
COMMENT ON COLUMN clientes_pt_notion.assigned_nutrition_type IS 'Tipología de dieta asignada (Flexible, Keto, Vegetarian, etc)';
COMMENT ON COLUMN clientes_pt_notion.assigned_calories IS 'Calorías asignadas (1200, 1400, 1600, etc)';
