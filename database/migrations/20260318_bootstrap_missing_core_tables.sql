-- ============================================================================
-- Bootstrap de tablas core faltantes (Padron Trainer)
-- Escenario objetivo: proyectos que solo tienen modulo gym + leads
-- Idempotente / no destructivo
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Base staff/users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'coach',
  avatar_url TEXT,
  phone TEXT,
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Tabla maestra de clientes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clientes_pt_notion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  property_nombre TEXT,
  property_apellidos TEXT,
  property_correo_electr_nico TEXT,
  property_dni TEXT,
  property_tel_fono TEXT,
  property_direccion TEXT,
  property_fecha_de_nacimiento DATE,
  property_sexo TEXT,
  status TEXT DEFAULT 'active',
  property_estado_cliente TEXT,
  property_fecha_alta DATE,
  property_inicio_programa DATE,
  property_fase TEXT,
  coach_id TEXT,
  property_coach TEXT,
  assigned_nutrition_type TEXT,
  assigned_calories NUMERIC,
  onboarding_token TEXT UNIQUE,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  renewal_payment_status TEXT DEFAULT 'none',
  renewal_amount NUMERIC,
  renewal_duration INTEGER,
  renewal_phase TEXT,
  renewal_verified_at TIMESTAMP WITH TIME ZONE,
  property_fecha_de_baja DATE,
  property_motivo_baja TEXT,
  property_fecha_abandono DATE,
  property_motivo_abandono TEXT,
  property_fecha_pausa DATE,
  property_motivo_pausa TEXT,
  high_ticket BOOLEAN DEFAULT false,
  anamnesis_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes_pt_notion(property_correo_electr_nico);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON public.clientes_pt_notion(status);
CREATE INDEX IF NOT EXISTS idx_clientes_coach ON public.clientes_pt_notion(coach_id);

-- ---------------------------------------------------------------------------
-- Ventas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_first_name TEXT NOT NULL,
  client_last_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  amount NUMERIC NOT NULL,
  contract_duration_months INTEGER NOT NULL,
  payment_method TEXT,
  payment_receipt_url TEXT,
  closer_id TEXT,
  assigned_coach_id TEXT,
  admin_notes TEXT,
  coach_notes TEXT,
  onboarding_token TEXT UNIQUE,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  client_id UUID,
  status TEXT DEFAULT 'pending_onboarding',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_email ON public.sales(client_email);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);

-- ---------------------------------------------------------------------------
-- Checkins / sesiones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  rating INTEGER,
  status TEXT DEFAULT 'pending_review',
  coach_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE
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

-- ---------------------------------------------------------------------------
-- Nutricion
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  target_calories INTEGER,
  diet_type TEXT,
  instructions TEXT,
  status TEXT DEFAULT 'draft',
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.nutrition_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID,
  category TEXT,
  position INTEGER DEFAULT 0,
  name TEXT NOT NULL,
  ingredients JSONB DEFAULT '[]'::jsonb,
  preparation TEXT,
  calories INTEGER,
  protein NUMERIC(6,2),
  carbs NUMERIC(6,2),
  fat NUMERIC(6,2),
  fiber NUMERIC(6,2),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_nutrition_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  plan_id UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by TEXT,
  UNIQUE (client_id)
);

-- ---------------------------------------------------------------------------
-- Configuracion negocio
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  duration_months INTEGER,
  amount NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Soporte
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  created_by TEXT,
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'otros',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID,
  user_id TEXT NOT NULL,
  author_name TEXT,
  author_role TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Tracking legacy requerido por servicios
-- ---------------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_active_clients INTEGER DEFAULT 0,
  total_paused_clients INTEGER DEFAULT 0,
  total_inactive_clients INTEGER DEFAULT 0,
  total_dropout_clients INTEGER DEFAULT 0,
  new_signups INTEGER DEFAULT 0,
  renewals INTEGER DEFAULT 0,
  cancellations INTEGER DEFAULT 0,
  pauses_started INTEGER DEFAULT 0,
  dropouts INTEGER DEFAULT 0,
  active_clients_by_coach JSONB DEFAULT '{}'::jsonb,
  checkins_received INTEGER DEFAULT 0,
  checkins_reviewed INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  sales_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Compatibilidad de nombres legacy
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Baseline app settings
-- ---------------------------------------------------------------------------
INSERT INTO public.app_settings (key, value, description) VALUES
  ('business_name', 'Padron Trainer', 'Nombre comercial'),
  ('webhooks_enabled', 'false', 'Activar webhooks')
ON CONFLICT (key) DO NOTHING;
