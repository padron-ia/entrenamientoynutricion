
-- Create table for Weekly Classes
CREATE TABLE public.weekly_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    speaker TEXT NOT NULL, -- e.g. 'Jesús', 'Víctor'
    date TIMESTAMPTZ NOT NULL, -- Fecha y hora de la clase
    url TEXT, -- Link a YouTube (pasadas) o Google Meet (futuras)
    category TEXT, -- e.g. 'Entrenamiento', 'Nutrición', 'Mindset'
    is_recorded BOOLEAN DEFAULT false, -- True si ya es una grabación
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.weekly_classes ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone (authenticated) can view classes
CREATE POLICY "Clients can view all classes" 
ON public.weekly_classes FOR SELECT 
TO authenticated 
USING (true);

-- Insert Mock Data (Based on your image)
INSERT INTO weekly_classes (title, description, speaker, date, url, category, is_recorded)
VALUES 
('Cómo medir y mejorar la intensidad de tu entrenamiento', '¿Te preguntas si estás entrenando con la intensidad adecuada?', 'Jesús', '2025-01-23 18:00:00+00', 'https://youtube.com', 'Entrenamiento', true),
('Cómo organizar tu semana para cumplir tus objetivos', '¿Vives la semana apagando fuegos? Aprende a organizarte.', 'Jesús', '2025-10-30 18:00:00+00', 'https://youtube.com', 'Mindset', true),
('¿Estás entrenando bien? 5 claves para medir tu progreso', 'En esta clase analizamos los errores más comunes.', 'Víctor', '2025-11-06 18:00:00+00', 'https://youtube.com', 'Entrenamiento', true),
('Cómo afrontar la Navidad sin perder el progreso', 'Estrategias para disfrutar sin culpa y sin retroceder.', 'Jesús', '2025-12-19 19:00:00+00', 'https://meet.google.com', 'Nutrición', false);
