-- TABLA: client_plan_assignments
-- Se usa para guardar el HISTORIAL de asignaciones de nutrición (y entrenamiento si fuese necesario).
-- Cada vez que se cambia el plan, se inserta una nueva fila aquí.

CREATE TABLE IF NOT EXISTS public.client_plan_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL,
  
  -- Detalles de la asignación
  plan_type TEXT NOT NULL, -- 'Flexible', 'Keto', etc.
  calories INTEGER NOT NULL, -- 1400, 1600, etc.
  
  -- Fechas de vigencia
  assigned_date DATE DEFAULT CURRENT_DATE,
  active BOOLEAN DEFAULT TRUE,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT -- ID del coach que lo asignó
  
  -- Claves foráneas (si existen tablas de usuarios/clientes reales)
  -- CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES users(id)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_plan_assignments_client ON public.client_plan_assignments(client_id, active);
CREATE INDEX IF NOT EXISTS idx_plan_assignments_date ON public.client_plan_assignments(assigned_date DESC);

-- COMENTARIOS
COMMENT ON TABLE public.client_plan_assignments IS 'Historial de planes de nutrición asignados a cada cliente.';
