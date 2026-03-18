-- ============================================================================
-- Completa tablas core de soporte que aun faltan en una base parcial
-- No destructivo / idempotente
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1) Tablas de clientes y operaciones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anamnesis_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  historial_deportivo TEXT,
  frecuencia_entrenamiento_previa TEXT,
  tipo_entrenamiento_previo TEXT,
  lesiones_cronicas TEXT
);

CREATE TABLE IF NOT EXISTS public.contract_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  pause_date DATE NOT NULL,
  resume_date DATE,
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contract_templates (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2) Formacion, clases y recursos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  speaker TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  url TEXT,
  category TEXT,
  is_recorded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.materials_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  created_by TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3) Nutricion (versionado y customizaciones)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nutrition_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID,
  version_number INTEGER,
  snapshot JSONB,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_nutrition_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  recipe_id UUID,
  custom_name TEXT,
  custom_ingredients JSONB,
  custom_preparation TEXT,
  custom_calories INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (client_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS public.client_favorite_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  recipe_id UUID,
  plan_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (client_id, recipe_id)
);

-- ---------------------------------------------------------------------------
-- 4) Backoffice y permisos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT,
  period_date DATE,
  month INTEGER,
  year INTEGER,
  amount NUMERIC NOT NULL DEFAULT 0,
  invoice_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  coach_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (role, permission)
);

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  invited_by TEXT,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5) Compatibilidad de esquema en leads (si vienen de otro proyecto)
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "surname" TEXT,
  ADD COLUMN IF NOT EXISTS instagram_user TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS closer_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS next_followup_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS call_date DATE,
  ADD COLUMN IF NOT EXISTS meeting_date DATE,
  ADD COLUMN IF NOT EXISTS meeting_time TEXT,
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS project TEXT DEFAULT 'PT';

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_weekly_classes_date ON public.weekly_classes(date DESC);
CREATE INDEX IF NOT EXISTS idx_contract_pauses_client ON public.contract_pauses(client_id);
CREATE INDEX IF NOT EXISTS idx_materials_library_created ON public.materials_library(created_at DESC);
