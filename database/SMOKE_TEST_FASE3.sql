-- ============================================================================
-- SMOKE TEST FASE 3
-- Ejecutar en Supabase SQL Editor despues de:
-- 1) PLAN_EJECUCION_FASE3.sql
-- 2) 20260318_rls_baseline_all_new_tables.sql
-- ============================================================================

-- 1) Inventario rapido de tablas clave
WITH expected(table_name) AS (
  VALUES
    ('clientes_pt_notion'),
    ('users'),
    ('sales'),
    ('weekly_checkins'),
    ('coaching_sessions'),
    ('nutrition_plans'),
    ('nutrition_recipes'),
    ('training_programs'),
    ('training_workouts'),
    ('chat_messages'),
    ('client_risk_alerts'),
    ('role_permissions_registry')
)
SELECT
  e.table_name,
  CASE WHEN t.table_name IS NULL THEN 'MISSING' ELSE 'OK' END AS status
FROM expected e
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public'
 AND t.table_name = e.table_name
ORDER BY status DESC, e.table_name;

-- 2) Views de compatibilidad
SELECT
  to_regclass('public.clients') AS clients_view,
  to_regclass('public.clientes_ado') AS clientes_ado_view,
  to_regclass('public.coach_capacity_view') AS coach_capacity_view,
  to_regclass('public.glucose_history') AS glucose_history_view,
  to_regclass('public.weekly_coach_review') AS weekly_coach_review_view,
  to_regclass('public.testimonials') AS testimonials_view,
  to_regclass('public.staff_invoices') AS staff_invoices_view;

-- 3) Conteo de politicas RLS en tablas nuevas
SELECT
  tablename,
  COUNT(*) AS policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'chat_rooms', 'chat_room_participants', 'chat_messages', 'chat_attachments',
    'client_risk_alerts', 'client_risk_alert_comments',
    'training_programs', 'training_workouts', 'training_exercises',
    'monthly_reviews', 'quarterly_reviews', 'weekly_coach_reviews'
  )
GROUP BY tablename
ORDER BY tablename;

-- 4) Validacion de columnas criticas en clientes
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clientes_pt_notion'
  AND column_name IN (
    'status', 'coach_id', 'property_coach',
    'onboarding_token', 'assigned_nutrition_type', 'assigned_calories'
  )
ORDER BY column_name;

-- 5) Prueba de lectura sobre tabla de training
SELECT id, name, difficulty, created_at
FROM public.training_programs
ORDER BY created_at DESC
LIMIT 5;

-- 6) Prueba de lectura sobre chat
SELECT id, room_id, sender_id, message_type, created_at
FROM public.chat_messages
ORDER BY created_at DESC
LIMIT 5;

-- 7) Prueba de lectura sobre riesgo
SELECT id, client_id, alert_type, severity, status, created_at
FROM public.client_risk_alerts
ORDER BY created_at DESC
LIMIT 5;

-- 8) Prueba de lectura sobre nutricion
SELECT id, name, status, created_at
FROM public.nutrition_plans
ORDER BY created_at DESC
LIMIT 5;

-- 9) Validacion de status normalizados
SELECT COALESCE(status, 'NULL') AS status, COUNT(*) AS total
FROM public.clientes_pt_notion
GROUP BY COALESCE(status, 'NULL')
ORDER BY total DESC;

-- 10) Resultado final consolidado
WITH checks AS (
  SELECT 'clientes_table' AS check_name, to_regclass('public.clientes_pt_notion') IS NOT NULL AS ok
  UNION ALL
  SELECT 'clients_view', to_regclass('public.clients') IS NOT NULL
  UNION ALL
  SELECT 'training_programs', to_regclass('public.training_programs') IS NOT NULL
  UNION ALL
  SELECT 'chat_messages', to_regclass('public.chat_messages') IS NOT NULL
  UNION ALL
  SELECT 'risk_alerts', to_regclass('public.client_risk_alerts') IS NOT NULL
)
SELECT
  check_name,
  CASE WHEN ok THEN 'OK' ELSE 'FAIL' END AS status
FROM checks
ORDER BY check_name;
