-- Solicitudes de planes especiales de nutricion

CREATE TABLE IF NOT EXISTS public.nutrition_special_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clientes_pt_notion(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_to TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
    request_reason TEXT NOT NULL,
    requested_changes TEXT NOT NULL,
    requested_goal TEXT NOT NULL,
    target_date DATE,
    coach_notes TEXT,
    profile_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_special_requests_status ON public.nutrition_special_requests(status);
CREATE INDEX IF NOT EXISTS idx_nutrition_special_requests_assigned_to ON public.nutrition_special_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_nutrition_special_requests_client_id ON public.nutrition_special_requests(client_id);

ALTER TABLE public.nutrition_special_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage nutrition special requests" ON public.nutrition_special_requests;
CREATE POLICY "Staff can manage nutrition special requests"
    ON public.nutrition_special_requests
    FOR ALL
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

CREATE OR REPLACE FUNCTION public.set_nutrition_special_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nutrition_special_requests_updated_at ON public.nutrition_special_requests;
CREATE TRIGGER trg_nutrition_special_requests_updated_at
    BEFORE UPDATE ON public.nutrition_special_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_nutrition_special_requests_updated_at();
