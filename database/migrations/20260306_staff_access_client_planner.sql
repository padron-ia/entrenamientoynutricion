-- Allow staff (coach/admin/head_coach and other is_staff roles)
-- to view and edit client planner-related data.

-- Weekly planner
DROP POLICY IF EXISTS "Staff can view all weekly plans" ON public.client_weekly_plans;
DROP POLICY IF EXISTS "Staff can insert all weekly plans" ON public.client_weekly_plans;
DROP POLICY IF EXISTS "Staff can update all weekly plans" ON public.client_weekly_plans;

CREATE POLICY "Staff can view all weekly plans"
    ON public.client_weekly_plans FOR SELECT
    TO authenticated
    USING (public.is_staff());

CREATE POLICY "Staff can insert all weekly plans"
    ON public.client_weekly_plans FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

CREATE POLICY "Staff can update all weekly plans"
    ON public.client_weekly_plans FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- Shopping checks (kept aligned with planner editing)
DROP POLICY IF EXISTS "Staff can view all shopping checks" ON public.client_shopping_list_checks;
DROP POLICY IF EXISTS "Staff can insert all shopping checks" ON public.client_shopping_list_checks;
DROP POLICY IF EXISTS "Staff can update all shopping checks" ON public.client_shopping_list_checks;

CREATE POLICY "Staff can view all shopping checks"
    ON public.client_shopping_list_checks FOR SELECT
    TO authenticated
    USING (public.is_staff());

CREATE POLICY "Staff can insert all shopping checks"
    ON public.client_shopping_list_checks FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

CREATE POLICY "Staff can update all shopping checks"
    ON public.client_shopping_list_checks FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
