-- Migration: Sync Client Portal Data
-- Description: Creates tables to persist client portal state (planner, shopping list, checks) in the database instead of localStorage.

-- 1. Weekly Planner Table
CREATE TABLE IF NOT EXISTS public.client_weekly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL, -- References the nutrition plan
    grid JSONB NOT NULL DEFAULT '{}'::jsonb,
    prev_grid JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_id, plan_id)
);

-- 2. Shopping List Checks Table
CREATE TABLE IF NOT EXISTS public.client_shopping_list_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL,
    checked_items JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_id, plan_id)
);

-- 3. Weekly Manual Checks Table
CREATE TABLE IF NOT EXISTS public.client_weekly_manual_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    week_key TEXT NOT NULL, -- Format: YYYY-MM-DD (Monday of the week)
    data JSONB NOT NULL DEFAULT '{"mealPhotosSent": false, "trainingVideosSent": false}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_id, week_key)
);

-- Enable RLS
ALTER TABLE public.client_weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_shopping_list_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_weekly_manual_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Clients can only see/edit their own data)

-- client_weekly_plans
CREATE POLICY "Clients can view their own weekly plans"
    ON public.client_weekly_plans FOR SELECT
    USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert their own weekly plans"
    ON public.client_weekly_plans FOR INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own weekly plans"
    ON public.client_weekly_plans FOR UPDATE
    USING (auth.uid() = client_id);

-- client_shopping_list_checks
CREATE POLICY "Clients can view their own shopping checks"
    ON public.client_shopping_list_checks FOR SELECT
    USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert their own shopping checks"
    ON public.client_shopping_list_checks FOR INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own shopping checks"
    ON public.client_shopping_list_checks FOR UPDATE
    USING (auth.uid() = client_id);

-- client_weekly_manual_checks
CREATE POLICY "Clients can view their own weekly manual checks"
    ON public.client_weekly_manual_checks FOR SELECT
    USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert their own weekly manual checks"
    ON public.client_weekly_manual_checks FOR INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own weekly manual checks"
    ON public.client_weekly_manual_checks FOR UPDATE
    USING (auth.uid() = client_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_weekly_plans_updated_at
    BEFORE UPDATE ON public.client_weekly_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_shopping_list_checks_updated_at
    BEFORE UPDATE ON public.client_shopping_list_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_weekly_manual_checks_updated_at
    BEFORE UPDATE ON public.client_weekly_manual_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
