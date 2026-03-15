-- ============================================================
-- MIGRACIÓN: Sistema de Niveles y Rendimiento de Coaches
-- Fecha: 2026-01-26
-- Descripción: Añade campos para gestionar tiers, exclusividad
--              y tracking de rendimiento de coaches
-- NOTA: La tabla users tiene id como TEXT, no UUID
-- ============================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 1 CHECK (tier IN (1, 2, 3)),
ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS performance_notes TEXT,
ADD COLUMN IF NOT EXISTS internal_nps NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS task_compliance_rate NUMERIC DEFAULT 100;

COMMENT ON COLUMN public.users.tier IS 'Nivel del coach: 1=Operativo (32.5€), 2=Avanzado (40€), 3=Alto Impacto (45€)';
COMMENT ON COLUMN public.users.is_exclusive IS 'Si el coach tiene exclusividad con la empresa';
COMMENT ON COLUMN public.users.tier_updated_at IS 'Fecha de última revisión/cambio de tier';
COMMENT ON COLUMN public.users.performance_notes IS 'Notas del admin sobre rendimiento y bonus';
COMMENT ON COLUMN public.users.internal_nps IS 'NPS interno del coach (0-10)';
COMMENT ON COLUMN public.users.task_compliance_rate IS 'Porcentaje de cumplimiento de tareas';

CREATE TABLE IF NOT EXISTS public.coach_tier_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    previous_tier INTEGER,
    new_tier INTEGER NOT NULL,
    previous_exclusive BOOLEAN,
    new_exclusive BOOLEAN,
    changed_by TEXT REFERENCES public.users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tier_history_coach ON public.coach_tier_history(coach_id);
CREATE INDEX IF NOT EXISTS idx_tier_history_date ON public.coach_tier_history(created_at DESC);

CREATE OR REPLACE FUNCTION log_tier_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.tier IS DISTINCT FROM NEW.tier) OR (OLD.is_exclusive IS DISTINCT FROM NEW.is_exclusive) THEN
        INSERT INTO public.coach_tier_history (
            coach_id, previous_tier, new_tier, previous_exclusive, new_exclusive
        ) VALUES (
            NEW.id, OLD.tier, NEW.tier, OLD.is_exclusive, NEW.is_exclusive
        );
        NEW.tier_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_tier_change ON public.users;
CREATE TRIGGER trigger_log_tier_change
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    WHEN (OLD.role = 'coach' OR NEW.role = 'coach')
    EXECUTE FUNCTION log_tier_change();

ALTER TABLE public.coach_tier_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read tier history" ON public.coach_tier_history;
CREATE POLICY "Admins read tier history" ON public.coach_tier_history
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role IN ('admin', 'head_coach'))
    );

DROP POLICY IF EXISTS "Coaches read own tier history" ON public.coach_tier_history;
CREATE POLICY "Coaches read own tier history" ON public.coach_tier_history
    FOR SELECT USING (coach_id = auth.uid()::text);

DROP POLICY IF EXISTS "Admins manage tier history" ON public.coach_tier_history;
CREATE POLICY "Admins manage tier history" ON public.coach_tier_history
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role IN ('admin', 'head_coach'))
    );

GRANT SELECT ON public.coach_tier_history TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coach_tier_history TO authenticated;

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================

NOTIFY pgrst, 'reload schema';
