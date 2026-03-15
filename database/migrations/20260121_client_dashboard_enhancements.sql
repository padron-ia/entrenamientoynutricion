-- =====================================================
-- MASTER FIX V3: COMPLETE OVERHAUL (GOALS + GLUCOSE + PERMS)
-- =====================================================

-- 0. TABLA PRINCIPAL: LIMPIEZA POLÍTICAS Y NUEVOS CAMPOS
DROP POLICY IF EXISTS "Users can view their own client data" ON clientes_pt_notion;
DROP POLICY IF EXISTS "Clients can view own profile" ON clientes_pt_notion;
DROP POLICY IF EXISTS "Staff can view all clients" ON clientes_pt_notion;

ALTER TABLE clientes_pt_notion ENABLE ROW LEVEL SECURITY;

-- 0.1 ACTUALIZAR CAMPOS DE OBJETIVOS Y CONFIGURACIÓN (Si no existen)
ALTER TABLE clientes_pt_notion 
ADD COLUMN IF NOT EXISTS goal_3_months_status TEXT CHECK (goal_3_months_status IN ('pending', 'achieved', 'failed')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS goal_6_months_status TEXT CHECK (goal_6_months_status IN ('pending', 'achieved', 'failed')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS goal_1_year_status TEXT CHECK (goal_1_year_status IN ('pending', 'achieved', 'failed')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS show_glucose_tracker BOOLEAN DEFAULT FALSE; -- Control manual de glucemia

-- 0.2 POLÍTICAS SEGURAS (Casting explícito)
CREATE POLICY "Clients can view own profile" ON clientes_pt_notion
  FOR SELECT USING (user_id::text = auth.uid()::text);

-- Staff: Permiso TOTAL también en la tabla principal por si acaso
CREATE POLICY "Staff can manage all clients" ON clientes_pt_notion
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role IN ('admin', 'coach', 'head_coach', 'endocrino')));


-- 1. LIMPIEZA TOTAL DE TABLAS TRACKING
DROP TABLE IF EXISTS glucose_history, body_measurements, wellness_logs, activity_logs, client_achievements, coach_goals CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;

-- 2. TABLA: Historial de Glucemia (Incluye HbA1c)
CREATE TABLE IF NOT EXISTS glucose_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  glucose_value DECIMAL(5,1) NOT NULL, -- mg/dL o %
  measurement_type TEXT DEFAULT 'fasting' CHECK (measurement_type IN ('fasting', 'post_meal', 'random', 'before_meal', 'hba1c')),
  measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_glucose_history_client ON glucose_history(client_id);
ALTER TABLE glucose_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own glucose" ON glucose_history
  FOR ALL USING (client_id IN (SELECT id FROM clientes_pt_notion WHERE user_id::text = auth.uid()::text));

CREATE POLICY "Staff can manage all glucose" ON glucose_history
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role IN ('admin', 'coach', 'head_coach', 'endocrino')));

-- 3. TABLA: Medidas Corporales
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  abdominal_cm DECIMAL(5,1),
  arm_cm DECIMAL(5,1),
  thigh_cm DECIMAL(5,1),
  hip_cm DECIMAL(5,1),
  chest_cm DECIMAL(5,1),
  measured_at DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, measured_at)
);

CREATE INDEX IF NOT EXISTS idx_body_measurements_client ON body_measurements(client_id);
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own measurements" ON body_measurements
  FOR ALL USING (client_id IN (SELECT id FROM clientes_pt_notion WHERE user_id::text = auth.uid()::text));

CREATE POLICY "Staff can manage all measurements" ON body_measurements
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role IN ('admin', 'coach', 'head_coach', 'endocrino')));

-- 4. TABLA: Diario de Bienestar
CREATE TABLE IF NOT EXISTS wellness_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  log_date DATE DEFAULT CURRENT_DATE,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
  mood TEXT CHECK (mood IN ('great', 'good', 'neutral', 'low', 'bad')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_wellness_logs_client ON wellness_logs(client_id);
ALTER TABLE wellness_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own wellness" ON wellness_logs
  FOR ALL USING (client_id IN (SELECT id FROM clientes_pt_notion WHERE user_id::text = auth.uid()::text));

CREATE POLICY "Staff can manage all wellness" ON wellness_logs
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role IN ('admin', 'coach', 'head_coach')));

-- 5. TABLA: Registro de Actividad
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  log_date DATE DEFAULT CURRENT_DATE,
  steps INTEGER,
  exercise_minutes INTEGER,
  activity_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_client ON activity_logs(client_id);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own activity" ON activity_logs
  FOR ALL USING (client_id IN (SELECT id FROM clientes_pt_notion WHERE user_id::text = auth.uid()::text));

CREATE POLICY "Staff can manage all activity" ON activity_logs
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role IN ('admin', 'coach', 'head_coach')));

-- 6. TABLA: Objetivos del Coach (NUEVA)
CREATE TABLE IF NOT EXISTS coach_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  goal_type TEXT CHECK (goal_type IN ('weekly', 'monthly', 'custom')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'achieved', 'failed')),
  feedback TEXT, 
  created_by UUID, -- No FK estricta para simplificar migraciones, o REFERENCES auth.users(id)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_goals_client ON coach_goals(client_id);
ALTER TABLE coach_goals ENABLE ROW LEVEL SECURITY;

-- Clientes solo pueden VER sus objetivos (no editar)
CREATE POLICY "Clients can view own goals" ON coach_goals
  FOR SELECT USING (client_id IN (SELECT id FROM clientes_pt_notion WHERE user_id::text = auth.uid()::text));

-- Staff Gestiona todo
CREATE POLICY "Staff can manage all goals" ON coach_goals
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role IN ('admin', 'coach', 'head_coach')));

-- 7. TABLA: Definición de Logros
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT CHECK (category IN ('weight', 'glucose', 'streak', 'milestone', 'wellness', 'activity')),
  criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO achievements (code, title, description, icon, category, criteria) VALUES
  ('first_weight', 'Primera Meta', 'Registraste tu primer peso', '🎯', 'milestone', '{"type": "first_weight"}'),
  ('week_streak', 'Una Semana', '7 días consecutivos de registro', '📅', 'streak', '{"type": "streak", "days": 7}'),
  ('fire_streak', 'Racha de Fuego', '14 días consecutivos', '🔥', 'streak', '{"type": "streak", "days": 14}'),
  ('month_streak', 'Un Mes Entero', '30 días consecutivos', '⭐', 'streak', '{"type": "streak", "days": 30}'),
  ('minus_5kg', 'Club -5kg', 'Perdiste 5 kg desde el inicio', '💪', 'weight', '{"type": "weight_lost", "value": 5}'),
  ('minus_10kg', 'Club -10kg', 'Perdiste 10 kg desde el inicio', '🏆', 'weight', '{"type": "weight_lost", "value": 10}'),
  ('glucose_control', 'Glucosa Controlada', 'HbA1c por debajo de 7%', '🩸', 'glucose', '{"type": "hba1c_below", "value": 7}'),
  ('first_glucose', 'Primer Control', 'Registraste tu primera glucemia', '📊', 'glucose', '{"type": "first_glucose"}'),
  ('first_checkin', 'Primer Check-in', 'Completaste tu primer check-in semanal', '✅', 'milestone', '{"type": "first_checkin"}'),
  ('wellness_week', 'Semana Consciente', '7 días registrando bienestar', '🧘', 'wellness', '{"type": "wellness_streak", "days": 7}')
ON CONFLICT (code) DO NOTHING;

-- 8. TABLA: Logros Desbloqueados
CREATE TABLE IF NOT EXISTS client_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_client_achievements_client ON client_achievements(client_id);
ALTER TABLE client_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own achievements" ON client_achievements
  FOR SELECT USING (client_id IN (SELECT id FROM clientes_pt_notion WHERE user_id::text = auth.uid()::text));

CREATE POLICY "Staff can manage all achievements" ON client_achievements
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role IN ('admin', 'coach', 'head_coach')));
