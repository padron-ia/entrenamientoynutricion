-- =====================================================
-- Migration: Client Favorite Recipes
-- Date: 2026-03-03
-- =====================================================

CREATE TABLE IF NOT EXISTS client_favorite_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  category TEXT NOT NULL,           -- breakfast, lunch, dinner, snack
  recipe_name TEXT,                 -- denormalized for display
  plan_name TEXT,                   -- denormalized for display
  plan_calories INT,
  plan_diet_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, recipe_id)
);

-- RLS
ALTER TABLE client_favorite_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorite recipes"
  ON client_favorite_recipes FOR ALL
  USING (true)
  WITH CHECK (true);
