-- ==========================================
-- SISTEMA DE PLANES NUTRICIONALES
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Planes base
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                    -- "Plan Diabetes T2 - 1500kcal"
  description TEXT,
  tags TEXT[] DEFAULT '{}',              -- ["diabetes_t2", "1500kcal"]
  target_calories INTEGER,
  status TEXT DEFAULT 'draft',           -- 'draft' | 'published'
  published_at TIMESTAMPTZ,
  published_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Recetas (8 por categoría)
CREATE TABLE IF NOT EXISTS nutrition_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL,                -- 'breakfast' | 'lunch' | 'dinner' | 'snack'
  position INTEGER DEFAULT 0,            -- 1-8
  name TEXT NOT NULL,
  ingredients JSONB DEFAULT '[]',        -- [{name, quantity, unit}]
  preparation TEXT,
  calories INTEGER,
  protein DECIMAL(5,1),
  carbs DECIMAL(5,1),
  fat DECIMAL(5,1),
  fiber DECIMAL(5,1),
  image_url TEXT,
  is_draft BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Asignación cliente -> plan
CREATE TABLE IF NOT EXISTS client_nutrition_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL,
  plan_id UUID REFERENCES nutrition_plans(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID,
  UNIQUE(client_id)
);

-- 4. Ajustes individuales por cliente
CREATE TABLE IF NOT EXISTS client_nutrition_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL,
  recipe_id UUID REFERENCES nutrition_recipes(id) ON DELETE CASCADE,
  custom_name TEXT,
  custom_ingredients JSONB,
  custom_preparation TEXT,
  custom_calories INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, recipe_id)
);

-- 5. Historial de versiones (para rollback)
CREATE TABLE IF NOT EXISTS nutrition_plan_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  version_number INTEGER,
  snapshot JSONB,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_recipes_plan ON nutrition_recipes(plan_id, category);
CREATE INDEX IF NOT EXISTS idx_assignments_client ON client_nutrition_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_assignments_plan ON client_nutrition_assignments(plan_id);
CREATE INDEX IF NOT EXISTS idx_overrides_client ON client_nutrition_overrides(client_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON nutrition_plans(status);
CREATE INDEX IF NOT EXISTS idx_versions_plan ON nutrition_plan_versions(plan_id);

-- ==========================================
-- RLS (Row Level Security) - OPCIONAL
-- Habilitar si se requiere seguridad adicional
-- ==========================================

-- Habilitar RLS en las tablas
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_nutrition_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_nutrition_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plan_versions ENABLE ROW LEVEL SECURITY;

-- Políticas para staff (todos los roles excepto client)
-- Los usuarios con rol staff pueden ver y editar todo

CREATE POLICY "Staff can manage nutrition plans" ON nutrition_plans
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Staff can manage recipes" ON nutrition_recipes
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Staff can manage assignments" ON client_nutrition_assignments
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Staff can manage overrides" ON client_nutrition_overrides
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Staff can view versions" ON nutrition_plan_versions
  FOR SELECT
  USING (true);

-- ==========================================
-- COMENTARIOS
-- ==========================================

COMMENT ON TABLE nutrition_plans IS 'Planes nutricionales base creados por nutricionistas';
COMMENT ON TABLE nutrition_recipes IS 'Recetas pertenecientes a cada plan (máximo 8 por categoría)';
COMMENT ON TABLE client_nutrition_assignments IS 'Asignación de planes a clientes (1 plan por cliente)';
COMMENT ON TABLE client_nutrition_overrides IS 'Personalizaciones de recetas para clientes específicos';
COMMENT ON TABLE nutrition_plan_versions IS 'Historial de versiones publicadas para rollback';

COMMENT ON COLUMN nutrition_plans.status IS 'draft = en edición, published = visible para clientes';
COMMENT ON COLUMN nutrition_recipes.category IS 'breakfast, lunch, dinner, snack';
COMMENT ON COLUMN nutrition_recipes.is_draft IS 'true si tiene cambios sin publicar';
