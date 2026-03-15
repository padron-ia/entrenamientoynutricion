-- 1. Crear tabla de configuración de tests
CREATE TABLE IF NOT EXISTS public.assessment_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    youtube_id TEXT,
    category TEXT DEFAULT 'training', -- 'training', 'nutrition', etc.
    order_index INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Añadir columna de respuestas al cliente (JSONB para flexibilidad total)
ALTER TABLE public.clientes_pt_notion 
ADD COLUMN IF NOT EXISTS property_assessment_responses JSONB DEFAULT '{}';

-- 3. Insertar los 3 tests iniciales (Moldeables)
INSERT INTO public.assessment_tests (title, description, youtube_id, order_index)
VALUES 
('Test de Sentadilla (Squat)', 'Busca un lugar estable y realiza 10 repeticiones. Fíjate en la profundidad y en si tus talones se levantan.', 'q5p1K-o3068', 1),
('Test de Flexiones (Push Ups)', 'Realiza tantas flexiones como puedas con buena técnica. Si necesitas, apoya las rodillas.', 'W_G_1pYatXw', 2),
('Test de Core (Plancha)', 'Mantén la posición de plancha frontal el tiempo que puedas con el abdomen activo.', 'TvxNkmjdhMM', 3)
ON CONFLICT DO NOTHING;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_assessment_tests_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assessment_tests_modtime
    BEFORE UPDATE ON public.assessment_tests
    FOR EACH ROW
    EXECUTE FUNCTION update_assessment_tests_modtime();
