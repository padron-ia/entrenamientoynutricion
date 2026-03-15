-- Create table for endocrinologist reviews
CREATE TABLE IF NOT EXISTS endocrino_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id),
  fecha_revision DATE NOT NULL DEFAULT CURRENT_DATE,
  valoracion_situacion TEXT NOT NULL,
  plan_accion TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE endocrino_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all authenticated users" 
ON endocrino_reviews FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON endocrino_reviews FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON endocrino_reviews FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
