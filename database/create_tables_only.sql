-- =====================================================
-- PORTAL DEL CLIENTE - SCRIPT SQL (SIN MIGRACIÓN)
-- =====================================================
-- Versión simplificada: Solo crea tablas
-- La migración de datos la haremos después
-- =====================================================

-- TABLA 1: weight_history
CREATE TABLE IF NOT EXISTS public.weight_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, date)
);

CREATE INDEX IF NOT EXISTS idx_weight_client_date ON public.weight_history(client_id, date DESC);

-- TABLA 2: glucose_readings
CREATE TABLE IF NOT EXISTS public.glucose_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  value INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fasting', 'postprandial', 'random', 'bedtime')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_glucose_client_date ON public.glucose_readings(client_id, date DESC, time DESC);

-- TABLA 3: hba1c_history
CREATE TABLE IF NOT EXISTS public.hba1c_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  value DECIMAL(3,1) NOT NULL,
  laboratory TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, date)
);

CREATE INDEX IF NOT EXISTS idx_hba1c_client_date ON public.hba1c_history(client_id, date DESC);

-- TABLA 4: body_measurements
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  waist DECIMAL(5,1),
  hips DECIMAL(5,1),
  chest DECIMAL(5,1),
  arms DECIMAL(5,1),
  thighs DECIMAL(5,1),
  neck DECIMAL(5,1),
  body_fat_percentage DECIMAL(4,1),
  muscle_mass DECIMAL(5,1),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, date)
);

CREATE INDEX IF NOT EXISTS idx_measurements_client_date ON public.body_measurements(client_id, date DESC);

-- TABLA 5: daily_checkins
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  energy INTEGER CHECK (energy BETWEEN 1 AND 5),
  sleep_hours DECIMAL(3,1),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  adherence INTEGER CHECK (adherence BETWEEN 1 AND 5),
  water_liters DECIMAL(3,1),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_client_date ON public.daily_checkins(client_id, date DESC);

-- TABLA 6: coaching_sessions
CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  coach_id TEXT,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'weekly_review',
  duration_minutes INTEGER,
  recording_url TEXT,
  summary TEXT,
  highlights TEXT,
  action_items JSONB,
  client_feedback INTEGER CHECK (client_feedback BETWEEN 1 AND 5),
  client_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON public.coaching_sessions(client_id, date DESC);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weight_history_updated_at BEFORE UPDATE ON public.weight_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_glucose_readings_updated_at BEFORE UPDATE ON public.glucose_readings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hba1c_history_updated_at BEFORE UPDATE ON public.hba1c_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_body_measurements_updated_at BEFORE UPDATE ON public.body_measurements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_checkins_updated_at BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_sessions_updated_at BEFORE UPDATE ON public.coaching_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- VERIFICACIÓN
SELECT 
  'weight_history' as tabla, 
  COUNT(*) as registros
FROM public.weight_history
UNION ALL
SELECT 'glucose_readings', COUNT(*) FROM public.glucose_readings
UNION ALL
SELECT 'hba1c_history', COUNT(*) FROM public.hba1c_history
UNION ALL
SELECT 'body_measurements', COUNT(*) FROM public.body_measurements
UNION ALL
SELECT 'daily_checkins', COUNT(*) FROM public.daily_checkins
UNION ALL
SELECT 'coaching_sessions', COUNT(*) FROM public.coaching_sessions;

-- =====================================================
-- FIN - TABLAS CREADAS EXITOSAMENTE
-- =====================================================
-- La migración de datos la haremos en el siguiente paso
-- una vez verifiquemos los nombres exactos de las columnas
-- =====================================================
