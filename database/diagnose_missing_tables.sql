-- Diagnostico rapido de tablas existentes/faltantes en schema public

WITH expected(table_name) AS (
  VALUES
    ('users'),
    ('clientes_pt_notion'),
    ('sales'),
    ('weekly_checkins'),
    ('coaching_sessions'),
    ('weight_history'),
    ('glucose_readings'),
    ('hba1c_history'),
    ('body_measurements'),
    ('daily_checkins'),
    ('daily_metrics'),
    ('leads'),
    ('nutrition_plans'),
    ('nutrition_recipes')
)
SELECT
  e.table_name,
  CASE WHEN t.table_name IS NULL THEN 'MISSING' ELSE 'OK' END AS status
FROM expected e
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public'
 AND t.table_name = e.table_name
ORDER BY status DESC, e.table_name;

-- Inventario completo actual
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
