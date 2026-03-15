-- TABLA DE HISTORIAL DE ESTADOS DE CLIENTES
-- Esta tabla registrará cada cambio de estado, permitiendo análisis de bajas y retención.

CREATE TABLE IF NOT EXISTS client_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    change_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Índices para mejorar el rendimiento de las consultas de análisis
CREATE INDEX IF NOT EXISTS idx_client_status_history_client_id ON client_status_history(client_id);
CREATE INDEX IF NOT EXISTS idx_client_status_history_date ON client_status_history(change_date);
CREATE INDEX IF NOT EXISTS idx_client_status_history_new_status ON client_status_history(new_status);

-- Comentarios de la tabla
COMMENT ON TABLE client_status_history IS 'Historial de cambios de estado de los clientes para análisis de Churn y Retention';
COMMENT ON COLUMN client_status_history.old_status IS 'Estado anterior del cliente';
COMMENT ON COLUMN client_status_history.new_status IS 'Nuevo estado asignado (Active, Paused, Inactive, Dropout)';
COMMENT ON COLUMN client_status_history.reason IS 'Motivo del cambio de estado (campo obligatorio en la UI)';
