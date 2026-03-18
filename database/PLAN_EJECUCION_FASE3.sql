-- ============================================================================
-- PLAN DE EJECUCION FASE 3 (copiar y ejecutar por bloques)
-- Objetivo: completar tablas de producto que aun no estan en tu proyecto
-- Nota: ejecutar bloque por bloque para detectar errores temprano.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- BLOQUE A: comunicaciones, analitica, permisos, operaciones
-- ---------------------------------------------------------------------------
-- Fuente: tablas auxiliares sin dependencias complejas

-- announcements + announcement_reads
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  target_roles TEXT[] DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (announcement_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.assessment_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assignment_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  coach_id TEXT,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.business_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.webinar_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE,
  webinar_name TEXT,
  attendees INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT,
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coach_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  target_clients INTEGER,
  target_retention NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coach_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  contract_url TEXT,
  amount NUMERIC,
  duration_months INTEGER,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.food_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  content JSONB DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notion_leads_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(metric_date)
);

CREATE TABLE IF NOT EXISTS public.nutrition_assessment_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  draft JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.nutrition_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  responses JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.optimization_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  score INTEGER,
  responses JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform_fee_percentage NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.renewal_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  coach_id TEXT,
  call_date DATE,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rrss_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  handle TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rrss_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID,
  metric_date DATE,
  followers INTEGER,
  engagement_rate NUMERIC(8,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.slack_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel_id TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  month INTEGER,
  year INTEGER,
  gross_amount NUMERIC(12,2) DEFAULT 0,
  net_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  section TEXT NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, section)
);

CREATE TABLE IF NOT EXISTS public.success_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  title TEXT,
  story TEXT,
  before_photo_url TEXT,
  after_photo_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.monthly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  month INTEGER,
  year INTEGER,
  summary TEXT,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quarterly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  quarter INTEGER,
  year INTEGER,
  summary TEXT,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.weekly_coach_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT,
  week_start DATE,
  week_end DATE,
  summary TEXT,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- BLOQUE B: modulo training/strength (si vas a usar TrainingManagement)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_workout_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID,
  title TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_block_id UUID,
  exercise_id UUID,
  reps TEXT,
  sets TEXT,
  rest_seconds INTEGER,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  presentation TEXT,
  objectives TEXT,
  what_you_find TEXT,
  difficulty TEXT,
  target_audience TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID,
  day_number INTEGER,
  title TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_program_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_day_id UUID,
  workout_id UUID,
  activity_type TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  program_id UUID,
  assigned_by TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  start_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_client_day_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID,
  program_day_id UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_client_exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID,
  exercise_id UUID,
  performed_at TIMESTAMP WITH TIME ZONE,
  reps TEXT,
  sets TEXT,
  load_text TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_client_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID,
  activity_id UUID,
  performed_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_strength_test_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  metric_unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_strength_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  test_id UUID,
  baseline_value NUMERIC,
  baseline_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_strength_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  test_id UUID,
  value NUMERIC,
  measured_at DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- BLOQUE C: aliases de compatibilidad para nombres legacy
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.glucose_history AS
SELECT * FROM public.glucose_readings;

CREATE OR REPLACE VIEW public.weekly_coach_review AS
SELECT * FROM public.weekly_coach_reviews;

CREATE OR REPLACE VIEW public.testimonials AS
SELECT * FROM public.success_cases;

CREATE OR REPLACE VIEW public.staff_invoices AS
SELECT * FROM public.coach_invoices;
