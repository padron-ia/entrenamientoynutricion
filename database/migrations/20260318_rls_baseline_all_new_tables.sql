-- ============================================================================
-- Baseline RLS para tablas nuevas creadas en fases de bootstrap/migracion
-- Enfoque: permitir acceso a authenticated (entorno interno CRM)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1) Activar RLS en tablas nuevas
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assessment_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assignment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webinar_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coach_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coach_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contract_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.food_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notion_leads_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nutrition_assessment_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nutrition_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.optimization_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.renewal_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rrss_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rrss_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.slack_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.success_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.monthly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quarterly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weekly_coach_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.training_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_workout_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_program_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_program_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_client_day_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_client_exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_client_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_strength_test_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_strength_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_strength_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_risk_alert_comments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2) Crear policy "authenticated access" si no existe
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  policy_name TEXT;
  tables TEXT[] := ARRAY[
    'announcements', 'announcement_reads', 'assessment_tests', 'assignment_notes',
    'business_snapshots', 'webinar_metrics', 'client_status_history', 'coach_goals',
    'coach_tasks', 'contract_history', 'food_plans', 'notion_leads_metrics',
    'nutrition_assessment_drafts', 'nutrition_assessments', 'optimization_surveys',
    'payment_methods', 'renewal_calls', 'rrss_channels', 'rrss_metrics_history',
    'slack_channels', 'staff_payments', 'staff_reads', 'success_cases',
    'monthly_reviews', 'quarterly_reviews', 'weekly_coach_reviews',
    'training_exercises', 'training_workouts', 'training_workout_blocks',
    'training_workout_exercises', 'training_programs', 'training_program_days',
    'training_program_activities', 'client_training_assignments',
    'training_client_day_logs', 'training_client_exercise_logs',
    'training_client_activity_logs', 'training_strength_test_library',
    'client_strength_benchmarks', 'client_strength_records',
    'chat_rooms', 'chat_room_participants', 'chat_messages', 'chat_attachments',
    'client_risk_alerts', 'client_risk_alert_comments'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = t
    ) THEN
      policy_name := initcap(replace(t, '_', ' ')) || ' authenticated access';

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = t
          AND policyname = policy_name
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
          policy_name,
          t
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Grants de lectura para vistas de compatibilidad
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.clients TO anon, authenticated;
GRANT SELECT ON public.clientes_ado TO anon, authenticated;
GRANT SELECT ON public.coach_capacity_view TO anon, authenticated;
GRANT SELECT ON public.glucose_history TO anon, authenticated;
GRANT SELECT ON public.weekly_coach_review TO anon, authenticated;
GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT SELECT ON public.staff_invoices TO anon, authenticated;
