-- Mission Control básico para agentes operativos
-- Caso inicial: Nutri Triage Agent (revisión 2 veces al día de nutrition_special_requests)

CREATE TABLE IF NOT EXISTS public.agent_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    mission TEXT NOT NULL,
    schedule_kind TEXT NOT NULL DEFAULT 'manual' CHECK (schedule_kind IN ('manual', 'cron', 'heartbeat', 'event')),
    schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    requires_human_approval BOOLEAN NOT NULL DEFAULT true,
    can_execute_actions BOOLEAN NOT NULL DEFAULT false,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by TEXT REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agent_definitions(id) ON DELETE CASCADE,
    run_type TEXT NOT NULL DEFAULT 'scheduled' CHECK (run_type IN ('scheduled', 'manual', 'event')),
    trigger_source TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    summary TEXT,
    inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.agent_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agent_definitions(id) ON DELETE CASCADE,
    source_table TEXT,
    source_record_id TEXT,
    client_id UUID REFERENCES public.clientes_pt_notion(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    finding_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    confidence NUMERIC(4,3),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agent_definitions(id) ON DELETE CASCADE,
    source_table TEXT,
    source_record_id TEXT,
    client_id UUID REFERENCES public.clientes_pt_notion(id) ON DELETE SET NULL,
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('assign_existing_plan', 'adapt_existing_plan', 'create_new_plan', 'manual_review')),
    title TEXT NOT NULL,
    recommendation_text TEXT NOT NULL,
    proposed_plan_id UUID REFERENCES public.nutrition_plans(id) ON DELETE SET NULL,
    proposed_plan_label TEXT,
    rationale JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence NUMERIC(4,3),
    approval_status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (approval_status IN ('pending_approval', 'approved', 'rejected', 'superseded')),
    reviewed_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_action_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES public.agent_recommendations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agent_definitions(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('notify', 'assign_plan', 'create_plan_brief', 'request_human_review')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed', 'cancelled')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    execute_after TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_definitions_agent_key ON public.agent_definitions(agent_key);
CREATE INDEX IF NOT EXISTS idx_agent_definitions_active ON public.agent_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id_started_at ON public.agent_runs(agent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON public.agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_findings_agent_run_id ON public.agent_findings(agent_run_id);
CREATE INDEX IF NOT EXISTS idx_agent_findings_source ON public.agent_findings(source_table, source_record_id);
CREATE INDEX IF NOT EXISTS idx_agent_findings_client_id ON public.agent_findings(client_id);
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_agent_run_id ON public.agent_recommendations(agent_run_id);
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_approval_status ON public.agent_recommendations(approval_status);
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_source ON public.agent_recommendations(source_table, source_record_id);
CREATE INDEX IF NOT EXISTS idx_agent_action_queue_status ON public.agent_action_queue(status);
CREATE INDEX IF NOT EXISTS idx_agent_action_queue_execute_after ON public.agent_action_queue(execute_after);

ALTER TABLE public.agent_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_action_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage agent definitions" ON public.agent_definitions;
CREATE POLICY "Staff can manage agent definitions"
    ON public.agent_definitions
    FOR ALL
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage agent runs" ON public.agent_runs;
CREATE POLICY "Staff can manage agent runs"
    ON public.agent_runs
    FOR ALL
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage agent findings" ON public.agent_findings;
CREATE POLICY "Staff can manage agent findings"
    ON public.agent_findings
    FOR ALL
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage agent recommendations" ON public.agent_recommendations;
CREATE POLICY "Staff can manage agent recommendations"
    ON public.agent_recommendations
    FOR ALL
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage agent action queue" ON public.agent_action_queue;
CREATE POLICY "Staff can manage agent action queue"
    ON public.agent_action_queue
    FOR ALL
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

CREATE OR REPLACE FUNCTION public.set_agent_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_definitions_updated_at ON public.agent_definitions;
CREATE TRIGGER trg_agent_definitions_updated_at
    BEFORE UPDATE ON public.agent_definitions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_agent_updated_at();

DROP TRIGGER IF EXISTS trg_agent_recommendations_updated_at ON public.agent_recommendations;
CREATE TRIGGER trg_agent_recommendations_updated_at
    BEFORE UPDATE ON public.agent_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_agent_updated_at();

DROP TRIGGER IF EXISTS trg_agent_action_queue_updated_at ON public.agent_action_queue;
CREATE TRIGGER trg_agent_action_queue_updated_at
    BEFORE UPDATE ON public.agent_action_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.set_agent_updated_at();

INSERT INTO public.agent_definitions (
    agent_key,
    name,
    domain,
    mission,
    schedule_kind,
    schedule_config,
    requires_human_approval,
    can_execute_actions,
    config
)
VALUES (
    'nutri_triage_agent',
    'Nutri Triage Agent',
    'nutrition',
    'Revisar solicitudes especiales de nutrición, estimar si encajan con planes existentes, si requieren adaptación menor o si necesitan plan nuevo, y dejar recomendación para aprobación humana.',
    'cron',
    jsonb_build_object(
        'timezone', 'UTC',
        'times', jsonb_build_array('09:00', '16:00'),
        'target_table', 'nutrition_special_requests',
        'target_statuses', jsonb_build_array('pending', 'assigned', 'in_progress')
    ),
    true,
    false,
    jsonb_build_object(
        'rules_version', 'v1',
        'norms_source', 'docs/normas_nutricion.md',
        'decision_modes', jsonb_build_array('assign_existing_plan', 'adapt_existing_plan', 'create_new_plan', 'manual_review'),
        'notes', 'No asigna ni publica automáticamente; solo recomienda y eleva a aprobación.'
    )
)
ON CONFLICT (agent_key) DO UPDATE SET
    name = EXCLUDED.name,
    domain = EXCLUDED.domain,
    mission = EXCLUDED.mission,
    schedule_kind = EXCLUDED.schedule_kind,
    schedule_config = EXCLUDED.schedule_config,
    requires_human_approval = EXCLUDED.requires_human_approval,
    can_execute_actions = EXCLUDED.can_execute_actions,
    config = EXCLUDED.config,
    updated_at = now();
