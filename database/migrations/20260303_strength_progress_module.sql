-- ==========================================
-- Strength Progress Module (Coach + Client Portal)
-- ==========================================

CREATE TABLE IF NOT EXISTS training_strength_test_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  protocol_type TEXT NOT NULL CHECK (protocol_type IN ('rm_load', 'amrap_reps', 'hold_seconds', 'reps_60s')),
  metric_unit TEXT NOT NULL,
  category TEXT,
  equipment TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_strength_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  protocol_type TEXT NOT NULL CHECK (protocol_type IN ('rm_load', 'amrap_reps', 'hold_seconds', 'reps_60s')),
  metric_unit TEXT NOT NULL,
  target_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_strength_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  benchmark_id UUID NOT NULL REFERENCES client_strength_benchmarks(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('baseline', 'monthly', 'checkpoint')),
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('coach', 'client')),
  recorded_by UUID REFERENCES auth.users(id),
  recorded_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  reps INTEGER,
  load_kg NUMERIC,
  duration_seconds INTEGER,
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strength_benchmarks_client ON client_strength_benchmarks(client_id, is_active);
CREATE INDEX IF NOT EXISTS idx_strength_records_benchmark ON client_strength_records(benchmark_id, recorded_on DESC);
CREATE INDEX IF NOT EXISTS idx_strength_records_client ON client_strength_records(client_id, recorded_on DESC);

ALTER TABLE IF EXISTS training_strength_test_library DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_strength_benchmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_strength_records DISABLE ROW LEVEL SECURITY;

INSERT INTO training_strength_test_library (name, protocol_type, metric_unit, category, equipment, is_default)
SELECT * FROM (
  VALUES
    ('Sentadilla goblet', 'amrap_reps', 'reps', 'pierna', 'mancuerna', true),
    ('Press militar', 'rm_load', 'kg', 'empuje', 'barra o mancuernas', true),
    ('Press de pecho', 'rm_load', 'kg', 'empuje', 'barra o mancuernas', true),
    ('Dominadas', 'amrap_reps', 'reps', 'traccion', 'barra', true),
    ('Tiempo colgado', 'hold_seconds', 's', 'agarre', 'barra', true),
    ('Sit to stand 60s', 'reps_60s', 'reps', 'funcional', 'silla', true)
) AS defaults(name, protocol_type, metric_unit, category, equipment, is_default)
WHERE NOT EXISTS (
  SELECT 1 FROM training_strength_test_library t WHERE t.name = defaults.name
);
