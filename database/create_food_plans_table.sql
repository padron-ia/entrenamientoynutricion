-- ==============================================================================
-- TABLA DE PLANES DE ALIMENTACIÓN (MASTER LIBRARY)
-- Desc: Biblioteca central de todos los planes (HTMLs) disponibles.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS food_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Información visible en la tabla
  name TEXT NOT NULL,                -- Ej: "Pescetariano Noviembre 2º Quincena 1200 kcal"
  type TEXT NOT NULL,                -- Ej: "Pescetariano", "Flexible", "Sin Gluten"
  calories INTEGER NOT NULL,         -- Ej: 1200, 1500, 1800
  url TEXT NOT NULL,                 -- Ej: "https://planpescetariano..." (Link a Netlify/HTML)
  
  -- Clasificación temporal (Para mostrarlo automáticamente en la fecha correcta)
  month_label TEXT,                  -- Ej: "Noviembre", "Diciembre" (Visual)
  fortnight_label TEXT,              -- Ej: "1ª Quincena", "2ª Quincena" (Visual)
  
  -- Campos para lógica automática (Ordenamiento y Filtrado)
  year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE), -- Ej: 2025
  month_number INTEGER,              -- 1=Enero, 11=Noviembre, 12=Diciembre
  fortnight_number INTEGER,          -- 1 o 2 (1ª o 2ª Quincena)
  
  description TEXT,                  -- Comentarios o explicación del plan
  
  is_active BOOLEAN DEFAULT true,    -- Para archivar planes viejos si hace falta
  created_by TEXT,                   -- ID del coach que subió el plan (puede ser FK a users.id)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_food_plans_type_cals ON food_plans(type, calories);
CREATE INDEX IF NOT EXISTS idx_food_plans_date ON food_plans(year DESC, month_number DESC, fortnight_number DESC);

-- Comentarios
COMMENT ON TABLE food_plans IS 'Biblioteca maestra de planes nutricionales HTML por tipo, calorias y fecha';

-- ==============================================================================
-- ACTUALIZACIÓN EN LA TABLA DE CLIENTES (clientes_pt_notion)
-- ==============================================================================
-- Corregido: Usamos 'clientes_pt_notion' porque 'clients' no existe.

ALTER TABLE clientes_pt_notion 
ADD COLUMN IF NOT EXISTS assigned_nutrition_type TEXT,  -- Ej: "Flexible"
ADD COLUMN IF NOT EXISTS assigned_calories INTEGER;     -- Ej: 1500

COMMENT ON COLUMN clientes_pt_notion.assigned_nutrition_type IS 'Tipo de plan asignado para hacer match automático con food_plans';

-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ==============================================================================
ALTER TABLE food_plans ENABLE ROW LEVEL SECURITY;

-- 1. Coaches y Admins: Acceso Total
CREATE POLICY "Coaches full access food_plans" ON food_plans
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text 
    AND role IN ('admin', 'coach')
  )
);

-- 2. Clientes: Solo Lectura
CREATE POLICY "Clients read only food_plans" ON food_plans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text 
    AND role = 'client'
  )
);
