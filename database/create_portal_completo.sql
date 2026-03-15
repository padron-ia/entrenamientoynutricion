-- =====================================================
-- PORTAL DEL CLIENTE - SCRIPT SQL DEFINITIVO
-- =====================================================
-- Optimizado para:
-- - Peso: 1x/semana (4 registros/mes)
-- - Glucosa: 2x/semana (8 registros/mes)
-- - Check-in: Diario (30 registros/mes)
-- =====================================================

-- =====================================================
-- TABLA 1: weight_history
-- Historial de peso del cliente
-- =====================================================
CREATE TABLE IF NOT EXISTS public.weight_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  weight DECIMAL(5,2) NOT NULL, -- kg (ej: 87.50)
  source TEXT DEFAULT 'manual', -- 'manual', 'coach', 'initial'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, date) -- Un peso por día
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_weight_client_date ON public.weight_history(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_date ON public.weight_history(date DESC);

COMMENT ON TABLE public.weight_history IS 'Historial de peso del cliente (1x/semana)';

-- =====================================================
-- TABLA 2: glucose_readings
-- Lecturas de glucosa del cliente
-- =====================================================
CREATE TABLE IF NOT EXISTS public.glucose_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  value INTEGER NOT NULL, -- mg/dL (ej: 120)
  type TEXT NOT NULL CHECK (type IN ('fasting', 'postprandial', 'random', 'bedtime')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_glucose_client_date ON public.glucose_readings(client_id, date DESC, time DESC);
CREATE INDEX IF NOT EXISTS idx_glucose_client_type ON public.glucose_readings(client_id, type, date DESC);

COMMENT ON TABLE public.glucose_readings IS 'Lecturas de glucosa del cliente (2x/semana aprox)';

-- =====================================================
-- TABLA 3: hba1c_history
-- Historial de HbA1c (hemoglobina glicosilada)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hba1c_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  value DECIMAL(3,1) NOT NULL, -- % (ej: 6.5)
  laboratory TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, date) -- Un HbA1c por día
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_hba1c_client_date ON public.hba1c_history(client_id, date DESC);

COMMENT ON TABLE public.hba1c_history IS 'Historial de HbA1c (trimestral)';

-- =====================================================
-- TABLA 4: body_measurements
-- Medidas corporales del cliente
-- =====================================================
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  waist DECIMAL(5,1), -- Cintura en cm
  hips DECIMAL(5,1), -- Cadera en cm
  chest DECIMAL(5,1), -- Pecho en cm
  arms DECIMAL(5,1), -- Brazos en cm
  thighs DECIMAL(5,1), -- Muslos en cm
  neck DECIMAL(5,1), -- Cuello en cm
  body_fat_percentage DECIMAL(4,1), -- % grasa corporal
  muscle_mass DECIMAL(5,1), -- Masa muscular en kg
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, date) -- Una medición por día
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_measurements_client_date ON public.body_measurements(client_id, date DESC);

COMMENT ON TABLE public.body_measurements IS 'Medidas corporales del cliente (semanal/mensual)';

-- =====================================================
-- TABLA 5: daily_checkins
-- Check-in diario del cliente
-- =====================================================
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- Estado general
  mood INTEGER CHECK (mood BETWEEN 1 AND 5), -- 1=😔, 5=😄
  energy INTEGER CHECK (energy BETWEEN 1 AND 5), -- 1=🔋, 5=🔋🔋🔋🔋🔋
  
  -- Sueño
  sleep_hours DECIMAL(3,1), -- Horas de sueño
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5), -- 1=⭐, 5=⭐⭐⭐⭐⭐
  
  -- Adherencia
  adherence INTEGER CHECK (adherence BETWEEN 1 AND 5), -- 1=Mal, 5=Perfecto
  
  -- Hidratación
  water_liters DECIMAL(3,1), -- Litros de agua
  
  -- Notas
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, date) -- Un check-in por día
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_checkins_client_date ON public.daily_checkins(client_id, date DESC);

COMMENT ON TABLE public.daily_checkins IS 'Check-in diario del cliente (opcional)';

-- =====================================================
-- TABLA 6: coaching_sessions
-- Sesiones de coaching y revisiones semanales
-- =====================================================
CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  coach_id TEXT, -- ID del coach (de tabla users)
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'weekly_review', -- 'onboarding', 'weekly_review', 'graduation', 'check_in'
  duration_minutes INTEGER, -- Duración de la sesión
  
  -- Contenido
  recording_url TEXT, -- URL del video (Loom)
  summary TEXT, -- Resumen de la sesión
  highlights TEXT, -- Puntos destacados
  action_items JSONB, -- Tareas asignadas: [{task: '...', deadline: '...', completed: false}]
  
  -- Feedback
  client_feedback INTEGER CHECK (client_feedback BETWEEN 1 AND 5), -- Valoración del cliente
  client_notes TEXT, -- Notas del cliente
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON public.coaching_sessions(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_coach ON public.coaching_sessions(coach_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON public.coaching_sessions(type, date DESC);

COMMENT ON TABLE public.coaching_sessions IS 'Sesiones de coaching y revisiones semanales';

-- =====================================================
-- TRIGGERS para updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas
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

-- =====================================================
-- MIGRACIÓN DE DATOS EXISTENTES
-- =====================================================

-- 1. Migrar peso inicial
INSERT INTO public.weight_history (client_id, date, weight, source, notes)
SELECT 
  id,
  start_date::date,
  initial_weight,
  'initial',
  'Peso inicial del formulario de onboarding'
FROM clientes_pt_notion
WHERE initial_weight IS NOT NULL
  AND initial_weight > 0
ON CONFLICT (client_id, date) DO NOTHING;

-- 2. Migrar peso actual (si es diferente y hay fecha)
INSERT INTO public.weight_history (client_id, date, weight, source, notes)
SELECT 
  id,
  COALESCE(last_weight_date::date, updated_at::date),
  current_weight,
  'current',
  'Peso actual registrado'
FROM clientes_pt_notion
WHERE current_weight IS NOT NULL
  AND current_weight > 0
  AND current_weight != COALESCE(initial_weight, 0)
  AND COALESCE(last_weight_date::date, updated_at::date) != start_date::date
ON CONFLICT (client_id, date) DO NOTHING;

-- 3. Migrar medidas iniciales
INSERT INTO public.body_measurements (client_id, date, waist, arms, thighs, notes)
SELECT 
  id,
  start_date::date,
  abdominal_perimeter,
  arm_perimeter,
  thigh_perimeter,
  'Medidas iniciales del formulario de onboarding'
FROM clientes_pt_notion
WHERE abdominal_perimeter IS NOT NULL
  OR arm_perimeter IS NOT NULL
  OR thigh_perimeter IS NOT NULL
ON CONFLICT (client_id, date) DO NOTHING;

-- 4. Migrar última revisión semanal (si existe)
INSERT INTO public.coaching_sessions (
  client_id,
  date,
  type,
  recording_url,
  summary
)
SELECT 
  id,
  COALESCE(weeklyReviewDate::date, updated_at::date),
  'weekly_review',
  weeklyReviewUrl,
  'Última revisión semanal registrada'
FROM clientes_pt_notion
WHERE weeklyReviewUrl IS NOT NULL
  AND weeklyReviewUrl != ''
ON CONFLICT DO NOTHING;

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista: Último peso de cada cliente
CREATE OR REPLACE VIEW v_latest_weight AS
SELECT DISTINCT ON (client_id)
  client_id,
  date,
  weight,
  source
FROM public.weight_history
ORDER BY client_id, date DESC;

COMMENT ON VIEW v_latest_weight IS 'Último peso registrado de cada cliente';

-- Vista: Progreso de peso (inicial vs actual)
CREATE OR REPLACE VIEW v_weight_progress AS
SELECT 
  c.id as client_id,
  c.property_nombre as nombre,
  c.initial_weight,
  c.target_weight,
  lw.weight as current_weight,
  lw.date as last_weight_date,
  (c.initial_weight - lw.weight) as weight_lost,
  ROUND(((c.initial_weight - lw.weight) / (c.initial_weight - c.target_weight) * 100)::numeric, 1) as progress_percentage
FROM clientes_pt_notion c
LEFT JOIN v_latest_weight lw ON c.id = lw.client_id
WHERE c.initial_weight IS NOT NULL
  AND c.target_weight IS NOT NULL;

COMMENT ON VIEW v_weight_progress IS 'Progreso de peso de cada cliente';

-- Vista: Promedio de glucosa semanal
CREATE OR REPLACE VIEW v_weekly_glucose_avg AS
SELECT 
  client_id,
  DATE_TRUNC('week', date) as week_start,
  ROUND(AVG(value)::numeric, 1) as avg_glucose,
  COUNT(*) as readings_count,
  MIN(value) as min_glucose,
  MAX(value) as max_glucose
FROM public.glucose_readings
GROUP BY client_id, DATE_TRUNC('week', date)
ORDER BY client_id, week_start DESC;

COMMENT ON VIEW v_weekly_glucose_avg IS 'Promedio de glucosa semanal por cliente';

-- =====================================================
-- FUNCIONES ÚTILES
-- =====================================================

-- Función: Obtener estadísticas de peso de un cliente
CREATE OR REPLACE FUNCTION get_weight_stats(p_client_id TEXT, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_readings INTEGER,
  avg_weight DECIMAL,
  min_weight DECIMAL,
  max_weight DECIMAL,
  weight_change DECIMAL,
  trend TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_readings,
    ROUND(AVG(weight)::numeric, 2) as avg_weight,
    MIN(weight) as min_weight,
    MAX(weight) as max_weight,
    (MIN(weight) - MAX(weight)) as weight_change,
    CASE 
      WHEN (MIN(weight) - MAX(weight)) < -0.5 THEN 'increasing'
      WHEN (MIN(weight) - MAX(weight)) > 0.5 THEN 'decreasing'
      ELSE 'stable'
    END as trend
  FROM public.weight_history
  WHERE client_id = p_client_id
    AND date >= CURRENT_DATE - p_days;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_weight_stats IS 'Obtiene estadísticas de peso de un cliente en los últimos N días';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver cuántos registros se crearon
SELECT 
  'weight_history' as tabla, 
  COUNT(*) as registros,
  COUNT(DISTINCT client_id) as clientes
FROM public.weight_history
UNION ALL
SELECT 
  'glucose_readings', 
  COUNT(*),
  COUNT(DISTINCT client_id)
FROM public.glucose_readings
UNION ALL
SELECT 
  'hba1c_history', 
  COUNT(*),
  COUNT(DISTINCT client_id)
FROM public.hba1c_history
UNION ALL
SELECT 
  'body_measurements', 
  COUNT(*),
  COUNT(DISTINCT client_id)
FROM public.body_measurements
UNION ALL
SELECT 
  'daily_checkins', 
  COUNT(*),
  COUNT(DISTINCT client_id)
FROM public.daily_checkins
UNION ALL
SELECT 
  'coaching_sessions', 
  COUNT(*),
  COUNT(DISTINCT client_id)
FROM public.coaching_sessions;

-- Ver progreso de peso de todos los clientes
SELECT * FROM v_weight_progress
ORDER BY progress_percentage DESC NULLS LAST
LIMIT 10;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- TABLAS CREADAS:
-- ✅ weight_history - Historial de peso (1x/semana)
-- ✅ glucose_readings - Lecturas de glucosa (2x/semana)
-- ✅ hba1c_history - Historial de HbA1c (trimestral)
-- ✅ body_measurements - Medidas corporales (semanal/mensual)
-- ✅ daily_checkins - Check-ins diarios (opcional)
-- ✅ coaching_sessions - Revisiones semanales
--
-- VISTAS CREADAS:
-- ✅ v_latest_weight - Último peso de cada cliente
-- ✅ v_weight_progress - Progreso de peso
-- ✅ v_weekly_glucose_avg - Promedio glucosa semanal
--
-- FUNCIONES CREADAS:
-- ✅ get_weight_stats(client_id, days) - Estadísticas de peso
--
-- PRÓXIMOS PASOS:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Verificar que todo se creó correctamente
-- 3. Revisar los datos migrados
-- 4. Empezar a construir el portal WOW 🚀
