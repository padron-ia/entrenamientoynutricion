-- ==========================================
-- Training Module - Phase 1 (CRM interno)
-- ==========================================

-- 1) Exercise library
CREATE TABLE IF NOT EXISTS training_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('youtube', 'vimeo', 'image', 'none')) DEFAULT 'none',
  media_url TEXT,
  instructions TEXT,
  muscle_main TEXT,
  muscle_secondary TEXT[],
  equipment TEXT[],
  movement_pattern TEXT,
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  mechanics TEXT CHECK (mechanics IN ('compound', 'isolation')),
  articulation TEXT CHECK (articulation IN ('single', 'multi')),
  tags TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Workout templates
CREATE TABLE IF NOT EXISTS training_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_workout_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES training_workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES training_workout_blocks(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES training_exercises(id),
  sets INTEGER DEFAULT 3,
  reps TEXT DEFAULT '12',
  rest_seconds INTEGER DEFAULT 60,
  notes TEXT,
  position INTEGER DEFAULT 0,
  superset_id UUID,
  superset_rounds INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Program templates
CREATE TABLE IF NOT EXISTS training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  weeks_count INTEGER DEFAULT 4,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  UNIQUE(program_id, week_number, day_number)
);

CREATE TABLE IF NOT EXISTS training_program_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES training_program_days(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('workout', 'metrics', 'photo', 'form', 'custom', 'walking')),
  activity_id UUID,
  title TEXT,
  description TEXT,
  position INTEGER DEFAULT 0,
  color TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Assignment to clients
CREATE TABLE IF NOT EXISTS client_training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES training_programs(id),
  start_date DATE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now()
);

-- 5) Logs (prepared for phase 2)
CREATE TABLE IF NOT EXISTS training_client_day_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  day_id UUID NOT NULL REFERENCES training_program_days(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  effort_rating INTEGER CHECK (effort_rating >= 1 AND effort_rating <= 10),
  notes TEXT,
  duration_minutes INTEGER,
  pre_fatigue INTEGER,
  pre_rpe_type TEXT,
  pre_oxygen TEXT,
  pre_pulse TEXT,
  pre_bp_systolic TEXT,
  pre_bp_diastolic TEXT,
  safety_exclusion_data JSONB,
  safety_sequelae_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, day_id)
);

CREATE TABLE IF NOT EXISTS training_client_exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES training_client_day_logs(id) ON DELETE CASCADE,
  workout_exercise_id UUID NOT NULL REFERENCES training_workout_exercises(id) ON DELETE CASCADE,
  sets_completed INTEGER,
  reps_completed TEXT,
  weight_used TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(log_id, workout_exercise_id)
);

CREATE TABLE IF NOT EXISTS training_client_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES training_program_activities(id) ON DELETE CASCADE,
  day_id UUID NOT NULL REFERENCES training_program_days(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, activity_id, day_id)
);

-- Keep behavior aligned with current CRM modules (no RLS blocking)
ALTER TABLE IF EXISTS training_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_workout_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_workout_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_program_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_program_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_training_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_client_day_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_client_exercise_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_client_activity_logs DISABLE ROW LEVEL SECURITY;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_training_blocks_workout ON training_workout_blocks(workout_id);
CREATE INDEX IF NOT EXISTS idx_training_workout_exercises_block ON training_workout_exercises(block_id);
CREATE INDEX IF NOT EXISTS idx_training_program_days_program ON training_program_days(program_id);
CREATE INDEX IF NOT EXISTS idx_training_activities_day ON training_program_activities(day_id);
CREATE INDEX IF NOT EXISTS idx_training_assignment_client ON client_training_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_training_day_logs_client ON training_client_day_logs(client_id);
