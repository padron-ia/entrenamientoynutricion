-- ============================================================================
-- Fix robusto: modulo gym no visible en schema cache (PostgREST)
-- Ejecutar en Supabase SQL Editor del proyecto activo
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Tablas base del modulo gym
CREATE TABLE IF NOT EXISTS public.gym_service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#2563EB',
  icon TEXT,
  duration_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  is_bookable_by_client BOOLEAN DEFAULT true,
  max_capacity INTEGER DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gym_bonos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sessions_count INTEGER DEFAULT 1,
  price NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  stripe_payment_link TEXT,
  stripe_price_id TEXT,
  paypal_payment_link TEXT,
  paypal_plan_id TEXT,
  compatible_service_type_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gym_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  client_id UUID,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  dni TEXT,
  member_type TEXT DEFAULT 'presencial_grupo',
  status TEXT DEFAULT 'active',
  photo_url TEXT,
  birth_date DATE,
  emergency_contact TEXT,
  emergency_phone TEXT,
  medical_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gym_member_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  bono_id UUID NOT NULL,
  total_sessions INTEGER NOT NULL DEFAULT 1,
  used_sessions INTEGER DEFAULT 0,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_provider TEXT,
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'completed',
  amount_paid NUMERIC(10,2),
  is_expired BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gym_class_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  title TEXT,
  coach_id UUID,
  capacity INTEGER DEFAULT 8,
  is_cancelled BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gym_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  class_slot_id UUID NOT NULL,
  credit_id UUID,
  status TEXT DEFAULT 'confirmed',
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_type TEXT,
  credit_returned BOOLEAN DEFAULT false,
  waitlist_position INTEGER DEFAULT 0,
  auto_booked_at TIMESTAMP WITH TIME ZONE,
  booked_by TEXT DEFAULT 'self',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (member_id, class_slot_id)
);

CREATE TABLE IF NOT EXISTS public.gym_bono_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  bono_id UUID NOT NULL,
  credit_id UUID,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  payment_provider TEXT,
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'completed',
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) Columnas minimas esperadas por frontend
ALTER TABLE public.gym_class_slots
  ADD COLUMN IF NOT EXISTS service_type_id UUID,
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS coach_id UUID,
  ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 8,
  ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.gym_service_types
  ADD COLUMN IF NOT EXISTS is_bookable_by_client BOOLEAN DEFAULT true;

-- 3) Foreign keys necesarias para joins PostgREST embebidos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    BEGIN
      ALTER TABLE public.gym_class_slots
      ADD CONSTRAINT gym_class_slots_service_type_id_fkey
      FOREIGN KEY (service_type_id) REFERENCES public.gym_service_types(id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TABLE public.gym_class_slots
      ADD CONSTRAINT gym_class_slots_coach_id_fkey
      FOREIGN KEY (coach_id) REFERENCES public.profiles(id);
    EXCEPTION WHEN duplicate_object THEN NULL;
      WHEN datatype_mismatch THEN NULL;
      WHEN undefined_column THEN NULL;
    END;
  END IF;

  BEGIN
    ALTER TABLE public.gym_member_credits
    ADD CONSTRAINT gym_member_credits_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.gym_members(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.gym_member_credits
    ADD CONSTRAINT gym_member_credits_bono_id_fkey
    FOREIGN KEY (bono_id) REFERENCES public.gym_bonos(id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.gym_reservations
    ADD CONSTRAINT gym_reservations_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.gym_members(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.gym_reservations
    ADD CONSTRAINT gym_reservations_class_slot_id_fkey
    FOREIGN KEY (class_slot_id) REFERENCES public.gym_class_slots(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.gym_bono_purchases
    ADD CONSTRAINT gym_bono_purchases_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.gym_members(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.gym_bono_purchases
    ADD CONSTRAINT gym_bono_purchases_bono_id_fkey
    FOREIGN KEY (bono_id) REFERENCES public.gym_bonos(id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;

-- 4) RLS + policy baseline
ALTER TABLE public.gym_service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_bonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_member_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_class_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_bono_purchases ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
  p TEXT;
  tables TEXT[] := ARRAY[
    'gym_service_types','gym_bonos','gym_members','gym_member_credits',
    'gym_class_slots','gym_reservations','gym_bono_purchases'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    p := initcap(replace(t, '_', ' ')) || ' authenticated access';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = p
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        p,
        t
      );
    END IF;
  END LOOP;
END;
$$;

-- 5) Indices utiles
CREATE INDEX IF NOT EXISTS idx_gym_slots_date ON public.gym_class_slots(date);
CREATE INDEX IF NOT EXISTS idx_gym_slots_coach ON public.gym_class_slots(coach_id);
CREATE INDEX IF NOT EXISTS idx_gym_reservations_slot ON public.gym_reservations(class_slot_id);
CREATE INDEX IF NOT EXISTS idx_gym_reservations_member ON public.gym_reservations(member_id);

-- 6) Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.gym_service_types, public.gym_bonos, public.gym_members,
  public.gym_member_credits, public.gym_class_slots, public.gym_reservations,
  public.gym_bono_purchases TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gym_service_types, public.gym_bonos, public.gym_members,
  public.gym_member_credits, public.gym_class_slots, public.gym_reservations,
  public.gym_bono_purchases TO authenticated;

-- 7) Refrescar schema cache de PostgREST
NOTIFY pgrst, 'reload schema';

-- 8) Verificacion rapida
SELECT
  to_regclass('public.gym_service_types') AS gym_service_types,
  to_regclass('public.gym_bonos') AS gym_bonos,
  to_regclass('public.gym_members') AS gym_members,
  to_regclass('public.gym_member_credits') AS gym_member_credits,
  to_regclass('public.gym_class_slots') AS gym_class_slots,
  to_regclass('public.gym_reservations') AS gym_reservations,
  to_regclass('public.gym_bono_purchases') AS gym_bono_purchases;
-- ============================================================================
-- Fix robusto: modulo gym no visible en schema cache (PostgREST)
-- Ejecutar en Supabase SQL Editor del proyecto activo
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Tablas base del modulo gym
CREATE TABLE IF NOT EXISTS public.gym_service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#2563EB',
  icon TEXT,
  duration_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  is_bookable_by_client BOOLEAN DEFAULT true,
  max_capacity INTEGER DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gym_bonos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sessions_count INTEGER DEFAULT 1,
  price NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  stripe_payment_link TEXT,
  stripe_price_id TEXT,
  paypal_payment_link TEXT,
  paypal_plan_id TEXT,
  compatible_service_type_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gym_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  client_id UUID,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  dni TEXT,
  member_type TEXT DEFAULT 'presencial_grupo',
  status TEXT DEFAULT 'active',
  photo_url TEXT,
  birth_date DATE,
  emergency_contact TEXT,
  emergency_phone TEXT,
  medical_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gym_member_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  bono_id UUID NOT NULL,
  total_sessions INTEGER NOT NULL DEFAULT 1,
  used_sessions INTEGER DEFAULT 0,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_provider TEXT,
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'completed',
  amount_paid NUMERIC(10,2),
  is_expired BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gym_class_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  title TEXT,
  coach_id UUID,
  capacity INTEGER DEFAULT 8,
  is_cancelled BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gym_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  class_slot_id UUID NOT NULL,
  credit_id UUID,
  status TEXT DEFAULT 'confirmed',
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_type TEXT,
  credit_returned BOOLEAN DEFAULT false,
  waitlist_position INTEGER DEFAULT 0,
  auto_booked_at TIMESTAMP WITH TIME ZONE,
  booked_by TEXT DEFAULT 'self',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (member_id, class_slot_id)
);

CREATE TABLE IF NOT EXISTS public.gym_bono_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  bono_id UUID NOT NULL,
  credit_id UUID,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  payment_provider TEXT,
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'completed',
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) FKs necesarias para joins embebidos de PostgREST
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    BEGIN
      ALTER TABLE public.gym_class_slots
        ADD CONSTRAINT gym_class_slots_coach_id_fkey
        FOREIGN KEY (coach_id) REFERENCES public.profiles(id);
    EXCEPTION WHEN duplicate_object THEN NULL;
      WHEN datatype_mismatch THEN NULL;
      WHEN undefined_column THEN NULL;
    END;
  END IF;

  BEGIN
    ALTER TABLE public.gym_class_slots
      ADD CONSTRAINT gym_class_slots_service_type_id_fkey
      FOREIGN KEY (service_type_id) REFERENCES public.gym_service_types(id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.gym_member_credits
      ADD CONSTRAINT gym_member_credits_member_id_fkey
      FOREIGN KEY (member_id) REFERENCES public.gym_members(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.gym_member_credits
      ADD CONSTRAINT gym_member_credits_bono_id_fkey
      FOREIGN KEY (bono_id) REFERENCES public.gym_bonos(id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.gym_reservations
      ADD CONSTRAINT gym_reservations_member_id_fkey
      FOREIGN KEY (member_id) REFERENCES public.gym_members(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.gym_reservations
      ADD CONSTRAINT gym_reservations_class_slot_id_fkey
      FOREIGN KEY (class_slot_id) REFERENCES public.gym_class_slots(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;

-- 3) RLS baseline
ALTER TABLE public.gym_service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_bonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_member_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_class_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_bono_purchases ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
  p TEXT;
  tables TEXT[] := ARRAY[
    'gym_service_types','gym_bonos','gym_members','gym_member_credits',
    'gym_class_slots','gym_reservations','gym_bono_purchases'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    p := initcap(replace(t, '_', ' ')) || ' authenticated access';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = p
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        p,
        t
      );
    END IF;
  END LOOP;
END;
$$;

-- 4) Indexes + grants
CREATE INDEX IF NOT EXISTS idx_gym_slots_date ON public.gym_class_slots(date);
CREATE INDEX IF NOT EXISTS idx_gym_slots_coach ON public.gym_class_slots(coach_id);
CREATE INDEX IF NOT EXISTS idx_gym_reservations_slot ON public.gym_reservations(class_slot_id);
CREATE INDEX IF NOT EXISTS idx_gym_reservations_member ON public.gym_reservations(member_id);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.gym_service_types, public.gym_bonos, public.gym_members,
  public.gym_member_credits, public.gym_class_slots, public.gym_reservations,
  public.gym_bono_purchases TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gym_service_types, public.gym_bonos, public.gym_members,
  public.gym_member_credits, public.gym_class_slots, public.gym_reservations,
  public.gym_bono_purchases TO authenticated;

-- 5) Refrescar schema cache
NOTIFY pgrst, 'reload schema';

-- 6) Verificacion
SELECT
  to_regclass('public.gym_service_types') AS gym_service_types,
  to_regclass('public.gym_class_slots') AS gym_class_slots,
  to_regclass('public.gym_reservations') AS gym_reservations;
