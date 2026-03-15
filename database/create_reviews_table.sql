-- =====================================================
-- SCRIPT: TABLA DE SESIONES DE COACHING (REVIEWS)
-- =====================================================
-- Este script crea la tabla necesaria para almacenar el
-- historial de revisiones semanales y sesiones 1:1.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  coach_id TEXT, -- ID del coach (vinculado a tabla users)
  coach_name TEXT, -- Nombre del coach (para facilitar visualización)
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'weekly_review', -- 'onboarding', 'weekly_review', 'graduation', 'check_in'
  duration_minutes INTEGER, -- Duración de la sesión
  
  -- Contenido
  recording_url TEXT, -- URL del video (Loom)
  coach_comments TEXT, -- Comentarios adicionales del coach para el cliente
  summary TEXT, -- Resumen de la sesión
  highlights TEXT, -- Puntos destacados / Logros
  action_items JSONB, -- Tareas asignadas: [{task: '...', deadline: '...', completed: false}]
  
  -- Feedback
  client_feedback INTEGER CHECK (client_feedback BETWEEN 1 AND 5), -- Valoración del cliente
  client_notes TEXT, -- Notas del cliente
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON public.coaching_sessions(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_coach ON public.coaching_sessions(coach_id, date DESC);

-- Habilitar RLS (Seguridad)
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Política: Los clientes solo ven sus propias sesiones
CREATE POLICY "Clientes pueden ver sus propias sesiones"
ON public.coaching_sessions FOR SELECT
TO authenticated
USING (client_id = auth.uid()::text); 
-- NOTA: Ajustar auth.uid()::text si tu client_id no coincide exactamente con el auth ID.
-- Si usas la tabla 'users' personalizada, a veces se requiere lógica adicional.

-- Política: Coaches ven todo (simplificado para este ejemplo)
CREATE POLICY "Coaches ven todo"
ON public.coaching_sessions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text AND role IN ('admin', 'coach')
  )
);
