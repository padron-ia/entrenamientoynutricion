-- ============================================================================
-- MIGRACIÓN: Sistema de Llamadas de Renovación
-- Fecha: 2026-02-16
-- Descripción: Tabla para gestionar alertas y seguimiento de llamadas
--              de renovación antes del vencimiento de contrato.
-- ============================================================================

-- 1. Crear tipos ENUM
DO $$ BEGIN
    CREATE TYPE renewal_call_status AS ENUM ('pending', 'scheduled', 'completed', 'no_answer', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE renewal_call_result AS ENUM ('pending', 'renewed', 'not_renewed', 'undecided');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Crear tabla principal
CREATE TABLE IF NOT EXISTS public.renewal_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    client_id UUID NOT NULL REFERENCES public.clientes_pt_notion(id) ON DELETE CASCADE,
    coach_id TEXT NOT NULL, -- users.id is TEXT in this DB
    
    -- Datos del contrato
    contract_end_date DATE NOT NULL,
    alert_date DATE NOT NULL, -- 30 días antes del fin
    renewal_phase TEXT DEFAULT 'F2', -- Qué fase se renueva (F2, F3, F4, F5)
    
    -- Gestión de la llamada
    scheduled_call_date TIMESTAMP WITH TIME ZONE, -- Fecha agendada por el coach
    call_status renewal_call_status DEFAULT 'pending',
    call_result renewal_call_result DEFAULT 'pending',
    call_notes TEXT,
    recording_url TEXT, -- URL de la grabación de la llamada (Loom, Google Drive, etc.)
    not_renewed_reason TEXT, -- Motivo si el cliente no renueva
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_renewal_calls_client ON public.renewal_calls(client_id);
CREATE INDEX IF NOT EXISTS idx_renewal_calls_coach ON public.renewal_calls(coach_id);
CREATE INDEX IF NOT EXISTS idx_renewal_calls_status ON public.renewal_calls(call_status);
CREATE INDEX IF NOT EXISTS idx_renewal_calls_result ON public.renewal_calls(call_result);
CREATE INDEX IF NOT EXISTS idx_renewal_calls_alert_date ON public.renewal_calls(alert_date);

-- 4. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_renewal_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_renewal_calls_updated_at ON public.renewal_calls;
CREATE TRIGGER trigger_renewal_calls_updated_at
    BEFORE UPDATE ON public.renewal_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_renewal_calls_updated_at();

-- 5. RLS (Row Level Security)
ALTER TABLE public.renewal_calls ENABLE ROW LEVEL SECURITY;

-- Policy: Admin ve todo
CREATE POLICY renewal_calls_admin_all ON public.renewal_calls
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND users.role IN ('admin', 'super_admin', 'direccion')
        )
    );

-- Policy: Coach ve solo sus registros
CREATE POLICY renewal_calls_coach_select ON public.renewal_calls
    FOR SELECT
    TO authenticated
    USING (coach_id = auth.uid()::text);

-- Policy: Coach puede actualizar solo sus registros
CREATE POLICY renewal_calls_coach_update ON public.renewal_calls
    FOR UPDATE
    TO authenticated
    USING (coach_id = auth.uid()::text);

-- Policy: Permitir inserts (para el sistema de generación automática)
CREATE POLICY renewal_calls_insert ON public.renewal_calls
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 6. Comentarios
COMMENT ON TABLE public.renewal_calls IS 'Gestión de llamadas de renovación - alertas automáticas 30 días antes del fin de contrato';
COMMENT ON COLUMN public.renewal_calls.alert_date IS 'Fecha de alerta (30 días antes del contract_end_date)';
COMMENT ON COLUMN public.renewal_calls.recording_url IS 'URL de la grabación de la llamada de renovación';
COMMENT ON COLUMN public.renewal_calls.not_renewed_reason IS 'Motivo por el cual el cliente decide no renovar';
