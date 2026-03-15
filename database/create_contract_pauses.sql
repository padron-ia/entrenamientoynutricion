-- =====================================================
-- CONTRACT PAUSES SYSTEM
-- Permite detener el "reloj" del contrato y recalcular fechas
-- =====================================================

-- 1. Tabla de Pausas
CREATE TABLE IF NOT EXISTS public.contract_pauses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id TEXT NOT NULL, -- Ligado a clientes_pt_notion.id (que es TEXT en el sistema actual)
    start_date DATE NOT NULL,
    end_date DATE, -- NULL significa "Actualmente en pausa"
    reason TEXT,
    created_by UUID, -- ID del usuario que ejecutó la pausa (opcional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_pauses_client ON public.contract_pauses(client_id);

-- Enable RLS
ALTER TABLE public.contract_pauses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff can view all pauses" ON public.contract_pauses
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage pauses" ON public.contract_pauses
    FOR ALL TO authenticated USING (auth.jwt() ->> 'role' <> 'client');

-- 2. Función para calcular fecha fin ajustada
-- Esta función suma los días de todas las pausas CERRADAS a la fecha original
CREATE OR REPLACE FUNCTION public.calculate_adjusted_end_date(
    p_client_id TEXT,
    p_original_end_date DATE
) RETURNS DATE AS $$
DECLARE
    v_total_paused_days INTEGER := 0;
    v_open_pause_start DATE;
    v_adjusted_date DATE;
BEGIN
    -- 1. Sumar días de pausas YA CERRADAS (donde end_date no es null)
    SELECT COALESCE(SUM(end_date - start_date), 0)
    INTO v_total_paused_days
    FROM public.contract_pauses
    WHERE client_id = p_client_id
      AND end_date IS NOT NULL;

    -- 2. Calcular nueva fecha
    v_adjusted_date := p_original_end_date + v_total_paused_days;

    -- 3. Si hay una pausa ABIERTA (activa ahora mismo), el contrato "no tiene fin definido" 
    -- o se desplaza dinámicamente cada día. 
    -- Para efectos de visualización, podemos devolver la fecha ajustada HASTA HOY, 
    -- o una fecha futura lejana, o la misma fecha ajustada.
    -- ESTRATEGIA: Si está pausado, sumamos también los días desde el inicio de la pausa abierta hasta HOY.
    SELECT start_date INTO v_open_pause_start
    FROM public.contract_pauses
    WHERE client_id = p_client_id
      AND end_date IS NULL
    LIMIT 1;

    IF v_open_pause_start IS NOT NULL THEN
        v_total_paused_days := v_total_paused_days + (CURRENT_DATE - v_open_pause_start);
        v_adjusted_date := p_original_end_date + v_total_paused_days;
    END IF;

    RETURN v_adjusted_date;
END;
$$ LANGUAGE plpgsql;
