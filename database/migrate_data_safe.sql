-- =====================================================
-- MIGRACIÓN COMPLETA - VERSIÓN SEGURA
-- =====================================================
-- Solo migra datos que sabemos que existen
-- =====================================================

-- 1. PESO INICIAL (usando la fecha actual como referencia)
INSERT INTO public.weight_history (client_id, date, weight, source, notes)
SELECT 
  id,
  CURRENT_DATE - INTERVAL '60 days',  -- Hace 2 meses
  initial_weight,
  'initial',
  'Peso inicial del formulario de onboarding'
FROM clientes_pt_notion
WHERE initial_weight IS NOT NULL 
  AND initial_weight > 0
ON CONFLICT (client_id, date) DO NOTHING;

-- 2. PESO ACTUAL (usando fecha más reciente)
INSERT INTO public.weight_history (client_id, date, weight, source, notes)
SELECT 
  id,
  CURRENT_DATE - INTERVAL '7 days',  -- Hace 1 semana
  current_weight,
  'current',
  'Peso actual registrado'
FROM clientes_pt_notion
WHERE current_weight IS NOT NULL 
  AND current_weight > 0
  AND current_weight != COALESCE(initial_weight, 0)
ON CONFLICT (client_id, date) DO NOTHING;

-- 3. MEDIDAS CORPORALES INICIALES
INSERT INTO public.body_measurements (client_id, date, waist, arms, thighs, notes)
SELECT 
  id,
  CURRENT_DATE - INTERVAL '60 days',
  abdominal_perimeter,
  arm_perimeter,
  thigh_perimeter,
  'Medidas iniciales del formulario'
FROM clientes_pt_notion
WHERE abdominal_perimeter IS NOT NULL
  OR arm_perimeter IS NOT NULL
  OR thigh_perimeter IS NOT NULL
ON CONFLICT (client_id, date) DO NOTHING;

-- 4. ÚLTIMA REVISIÓN SEMANAL (si existe)
INSERT INTO public.coaching_sessions (
  client_id,
  coach_id,
  date,
  type,
  recording_url,
  summary
)
SELECT 
  id,
  coach_id,
  CURRENT_DATE - INTERVAL '3 days',
  'weekly_review',
  weeklyReviewUrl,
  'Última revisión semanal registrada'
FROM clientes_pt_notion
WHERE weeklyReviewUrl IS NOT NULL
  AND weeklyReviewUrl != ''
ON CONFLICT DO NOTHING;

-- =====================================================
-- RESUMEN DE MIGRACIÓN
-- =====================================================

SELECT 
  'RESUMEN DE MIGRACIÓN' as categoria,
  '' as metrica,
  '' as valor
UNION ALL
SELECT '─────────────────────', '', ''
UNION ALL
SELECT 'Clientes en sistema', '', COUNT(*)::text FROM clientes_pt_notion
UNION ALL
SELECT '', '', ''
UNION ALL
SELECT 'PESO', '', ''
UNION ALL
SELECT '', 'Pesos migrados', COUNT(*)::text FROM public.weight_history
UNION ALL
SELECT '', 'Clientes con peso', COUNT(DISTINCT client_id)::text FROM public.weight_history
UNION ALL
SELECT '', '', ''
UNION ALL
SELECT 'MEDIDAS', '', ''
UNION ALL
SELECT '', 'Medidas migradas', COUNT(*)::text FROM public.body_measurements
UNION ALL
SELECT '', 'Clientes con medidas', COUNT(DISTINCT client_id)::text FROM public.body_measurements
UNION ALL
SELECT '', '', ''
UNION ALL
SELECT 'REVISIONES', '', ''
UNION ALL
SELECT '', 'Revisiones migradas', COUNT(*)::text FROM public.coaching_sessions
UNION ALL
SELECT '', 'Clientes con revisión', COUNT(DISTINCT client_id)::text FROM public.coaching_sessions;
