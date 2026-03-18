-- ============================================================================
-- Unificacion de estructura legacy (Cuidarte + CRM ADO) para Padron Trainer
-- Estrategia: superset no destructivo e idempotente
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 0) Bootstrap minimo (cuando la base esta casi vacia)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'coach',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clientes_pt_notion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  property_nombre TEXT,
  property_apellidos TEXT,
  property_correo_electr_nico TEXT,
  coach_id TEXT,
  property_coach TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 1) Completar columnas de compatibilidad en tabla maestra de clientes
-- ----------------------------------------------------------------------------
ALTER TABLE public.clientes_pt_notion
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS property_nombre TEXT,
  ADD COLUMN IF NOT EXISTS property_apellidos TEXT,
  ADD COLUMN IF NOT EXISTS property_correo_electr_nico TEXT,
  ADD COLUMN IF NOT EXISTS coach_id TEXT,
  ADD COLUMN IF NOT EXISTS property_coach TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS property_fecha_pausa DATE,
  ADD COLUMN IF NOT EXISTS property_motivo_pausa TEXT,
  ADD COLUMN IF NOT EXISTS weekly_review_url TEXT,
  ADD COLUMN IF NOT EXISTS weekly_review_date DATE,
  ADD COLUMN IF NOT EXISTS weekly_review_comments TEXT,
  ADD COLUMN IF NOT EXISTS renewal_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS renewal_phase TEXT,
  ADD COLUMN IF NOT EXISTS renewal_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS roadmap_main_goal TEXT,
  ADD COLUMN IF NOT EXISTS roadmap_commitment_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS roadmap_data JSONB DEFAULT '{"milestones": [], "last_updated": null}'::jsonb,
  ADD COLUMN IF NOT EXISTS anamnesis_data JSONB DEFAULT '{}'::jsonb;

-- ----------------------------------------------------------------------------
-- 2) Tablas legacy de seguimiento (si faltan)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  weight NUMERIC(6,2) NOT NULL,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (client_id, date)
);

CREATE TABLE IF NOT EXISTS public.glucose_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  value INTEGER NOT NULL,
  type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hba1c_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  value NUMERIC(4,1) NOT NULL,
  laboratory TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (client_id, date)
);

CREATE TABLE IF NOT EXISTS public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  waist NUMERIC(6,1),
  hips NUMERIC(6,1),
  chest NUMERIC(6,1),
  arms NUMERIC(6,1),
  thighs NUMERIC(6,1),
  neck NUMERIC(6,1),
  body_fat_percentage NUMERIC(5,2),
  muscle_mass NUMERIC(6,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (client_id, date)
);

CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  mood INTEGER,
  energy INTEGER,
  sleep_hours NUMERIC(4,1),
  sleep_quality INTEGER,
  adherence INTEGER,
  water_liters NUMERIC(4,1),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (client_id, date)
);

CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  coach_id TEXT,
  coach_name TEXT,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'weekly_review',
  duration_minutes INTEGER,
  recording_url TEXT,
  coach_comments TEXT,
  summary TEXT,
  highlights TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  client_feedback INTEGER,
  client_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_active_clients INTEGER DEFAULT 0,
  total_active_high_ticket INTEGER DEFAULT 0,
  total_paused_clients INTEGER DEFAULT 0,
  total_inactive_clients INTEGER DEFAULT 0,
  total_dropout_clients INTEGER DEFAULT 0,
  new_signups INTEGER DEFAULT 0,
  renewals INTEGER DEFAULT 0,
  reactivations INTEGER DEFAULT 0,
  cancellations INTEGER DEFAULT 0,
  pauses_started INTEGER DEFAULT 0,
  dropouts INTEGER DEFAULT 0,
  active_clients_by_coach JSONB DEFAULT '{}'::jsonb,
  checkins_received INTEGER DEFAULT 0,
  checkins_reviewed INTEGER DEFAULT 0,
  testimonials_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  sales_amount NUMERIC(12,2) DEFAULT 0,
  renewals_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_history_client_date ON public.weight_history(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_glucose_readings_client_date ON public.glucose_readings(client_id, date DESC, time DESC);
CREATE INDEX IF NOT EXISTS idx_hba1c_history_client_date ON public.hba1c_history(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_body_measurements_client_date ON public.body_measurements(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_client_date ON public.daily_checkins(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_client_date ON public.coaching_sessions(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON public.daily_metrics(date);

-- ----------------------------------------------------------------------------
-- 3) Normalizacion de estado de cliente (canon Padron Trainer)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_client_status(input_status TEXT)
RETURNS TEXT AS $$
DECLARE
  s TEXT := LOWER(COALESCE(TRIM(input_status), ''));
BEGIN
  IF s IN ('active', 'activo', 'alta', 'matriculado') THEN
    RETURN 'active';
  ELSIF s IN ('paused', 'pausado', 'pausa') THEN
    RETURN 'paused';
  ELSIF s IN ('inactive', 'baja', 'cancelled', 'canceled') THEN
    RETURN 'inactive';
  ELSIF s IN ('dropout', 'abandono') THEN
    RETURN 'dropout';
  ELSIF s IN ('pending') THEN
    RETURN 'pending';
  ELSIF s IN ('completed') THEN
    RETURN 'completed';
  END IF;

  RETURN 'active';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE public.clientes_pt_notion
SET status = public.normalize_client_status(status)
WHERE status IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4) Vistas de compatibilidad legacy
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.clients AS
SELECT
  id,
  user_id,
  property_nombre AS first_name,
  property_apellidos AS last_name,
  property_correo_electr_nico AS email,
  coach_id,
  property_coach,
  status,
  created_at,
  updated_at
FROM public.clientes_pt_notion;

CREATE OR REPLACE VIEW public.clientes_ado AS
SELECT * FROM public.clientes_pt_notion;

GRANT SELECT ON public.clients TO anon, authenticated;
GRANT SELECT ON public.clientes_ado TO anon, authenticated;

COMMENT ON VIEW public.clients IS 'Vista de compatibilidad para SQL legacy que referenciaba tabla clients.';
COMMENT ON VIEW public.clientes_ado IS 'Vista de compatibilidad para SQL/scripts legacy de CRM ADO.';

-- ----------------------------------------------------------------------------
-- 5) Baseline RLS en tablas de tracking (solo si no estaba activa)
-- ----------------------------------------------------------------------------
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glucose_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hba1c_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'weight_history' AND policyname = 'WeightHistory authenticated access'
  ) THEN
    CREATE POLICY "WeightHistory authenticated access" ON public.weight_history
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'glucose_readings' AND policyname = 'GlucoseReadings authenticated access'
  ) THEN
    CREATE POLICY "GlucoseReadings authenticated access" ON public.glucose_readings
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hba1c_history' AND policyname = 'HbA1cHistory authenticated access'
  ) THEN
    CREATE POLICY "HbA1cHistory authenticated access" ON public.hba1c_history
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'body_measurements' AND policyname = 'BodyMeasurements authenticated access'
  ) THEN
    CREATE POLICY "BodyMeasurements authenticated access" ON public.body_measurements
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'daily_checkins' AND policyname = 'DailyCheckins authenticated access'
  ) THEN
    CREATE POLICY "DailyCheckins authenticated access" ON public.daily_checkins
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coaching_sessions' AND policyname = 'CoachingSessions authenticated access'
  ) THEN
    CREATE POLICY "CoachingSessions authenticated access" ON public.coaching_sessions
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END;
$$;
