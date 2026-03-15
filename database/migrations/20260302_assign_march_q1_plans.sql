-- =====================================================
-- Asignación masiva: Primera Quincena de Marzo 2026
-- =====================================================
-- Este script:
-- 1. Archiva las asignaciones actuales en el historial
-- 2. Asigna a cada cliente activo el plan base de marzo Q1
--    que coincida con su assigned_nutrition_type + assigned_calories
-- Solo afecta a clientes con perfil nutricional definido.
-- No toca clientes que ya tengan asignado un plan de marzo Q1.

-- Mapeo de planes base para Marzo Q1 (un plan por diet_type + calories):
-- Flexible 1200 => 1f3aa513 (Plan Flexible Primera Quincena de Marzo)
-- Flexible 1300 => 8ac132d9 (Plan Control Glucémico y Pérdida de Grasa)
-- Flexible 1400 => 2a74a735 (Plan Flexible Primera Quincena de Marzo)
-- Flexible 1600 => 1f811a0c (Plan Flexible Primera Quincena de Marzo)
-- Flexible 1800 => 52c469f7 (Plan Flexible Primera Quincena de Marzo)
-- Flexible / Estacional 1200 => 10708d79 (Plan flexible con cenas ligeras)
-- Sin Gluten 1200 => 93095d87
-- Sin Gluten 1400 => 60b81290
-- Sin Gluten 1600 => a60060cb
-- Sin Gluten 1800 => 242b07fe
-- Sin Carne Roja 1200 => 609b13bd
-- Sin Carne Roja 1400 => 452cd2a4
-- Sin Carne Roja 1600 => 36015e48
-- Sin Carne Roja 1800 => c575e9d1
-- Vegetariano 1200 => 2c3a9e9b
-- Vegetariano 1400 => b8d49889
-- Vegetariano 1600 => fef67a08
-- Baja en FODMAPs / Antiinflamatoria 1400 => f2c40ac1
-- Baja en purinas / Sin carne roja 1400 => 5b42bd4e
-- Clínica Especializada 1400 => 7c297f33
-- Control Glucémico y Renal 2000 => e1260fb7
-- GF/DF Antiinflamatoria 1400 => e3bcd71f
-- Hipocolesterolemiante / Flexible 1400 => 8a8bf5b7
-- Protección Biliar 1400 => 9a869981

-- ============ PASO 1: Crear tabla temporal con el mapeo ============

CREATE TEMP TABLE march_q1_map (diet_type TEXT, calories INT, plan_id UUID);

INSERT INTO march_q1_map VALUES
  ('Flexible', 1200, '1f3aa513-78bc-44c7-9320-2092d9c68766'),
  ('Flexible', 1300, '8ac132d9-abb6-4339-95cd-88fd102a4e95'),
  ('Flexible', 1400, '2a74a735-f8b2-4034-9b53-00576e881564'),
  ('Flexible', 1600, '1f811a0c-d307-4f97-b4e0-c8dbe82a1dd8'),
  ('Flexible', 1800, '52c469f7-62ec-4c62-b68a-925faa4ffd15'),
  ('Sin Gluten', 1200, '93095d87-36dd-48cb-975a-d5e80c24842c'),
  ('Sin Gluten', 1400, '60b81290-415a-4676-8d74-6700719c8341'),
  ('Sin Gluten', 1600, 'a60060cb-a7d4-4408-8ea1-762a186cade6'),
  ('Sin Gluten', 1800, '242b07fe-8b03-4e88-b9bc-60fe9ab8cc1e'),
  ('Sin Carne Roja', 1200, '609b13bd-f29d-4ee6-bb18-4a4329bdd91c'),
  ('Sin Carne Roja', 1400, '452cd2a4-e413-4d04-b92c-1c9cff7f3936'),
  ('Sin Carne Roja', 1600, '36015e48-91b5-440e-bada-a41e1d739c1c'),
  ('Sin Carne Roja', 1800, 'c575e9d1-2bfe-4159-9546-f860a4d1aa35'),
  ('Vegetariano', 1200, '2c3a9e9b-2d9a-4c8c-84f8-768ad2eec060'),
  ('Vegetariano', 1400, 'b8d49889-10fc-437d-b0a3-7ff9b89ea0e9'),
  ('Vegetariano', 1600, 'fef67a08-c537-40b4-b65b-b2d09bd08c4c'),
  ('Baja en FODMAPs / Antiinflamatoria', 1400, 'f2c40ac1-4349-4997-9d56-0862a4316796'),
  ('Baja en purinas / Sin carne roja', 1400, '5b42bd4e-9c09-4c4c-9859-7bc5e81aab10'),
  ('Clínica Especializada', 1400, '7c297f33-d041-473a-bf80-3fe2ce0a3389'),
  ('Control Glucémico y Renal', 2000, 'e1260fb7-6db8-4676-b162-c540f366e9b2'),
  ('GF/DF Antiinflamatoria', 1400, 'e3bcd71f-1ec7-44c7-ac0b-f1f38533f88f'),
  ('Hipocolesterolemiante / Flexible', 1400, '8a8bf5b7-f1fb-401e-91d0-a4c238cc2c49'),
  ('Protección Biliar', 1400, '9a869981-2cf4-484b-8d20-9aa077a70c65');

-- ============ PASO 2: Archivar asignaciones actuales ============
-- Solo archiva si el plan actual NO es ya de marzo Q1

INSERT INTO client_nutrition_assignment_history (client_id, plan_id, plan_name, assigned_at, assigned_by, replaced_at)
SELECT
  ca.client_id,
  ca.plan_id,
  np.name,
  ca.assigned_at,
  ca.assigned_by,
  NOW()
FROM client_nutrition_assignments ca
JOIN nutrition_plans np ON np.id = ca.plan_id
WHERE np.target_month IS DISTINCT FROM 3
   OR np.target_fortnight IS DISTINCT FROM 1;

-- ============ PASO 3: Asignar plan de marzo Q1 a todos los clientes activos ============
-- Upsert: si ya tiene asignación la reemplaza, si no la crea

INSERT INTO client_nutrition_assignments (client_id, plan_id, assigned_at, assigned_by)
SELECT
  c.id,
  m.plan_id,
  NOW(),
  NULL  -- asignación automática/masiva
FROM clientes_pt_notion c
JOIN march_q1_map m
  ON m.diet_type = c.assigned_nutrition_type
 AND m.calories = c.assigned_calories
WHERE c.status = 'active'
  AND c.assigned_nutrition_type IS NOT NULL
  AND c.assigned_calories IS NOT NULL
ON CONFLICT (client_id)
DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  assigned_at = EXCLUDED.assigned_at,
  assigned_by = EXCLUDED.assigned_by;

-- ============ PASO 4: Verificación ============

-- Clientes activos asignados:
SELECT count(*) AS clientes_asignados_marzo_q1
FROM client_nutrition_assignments ca
JOIN nutrition_plans np ON np.id = ca.plan_id
WHERE np.target_month = 3 AND np.target_fortnight = 1;

-- Clientes activos SIN asignación (no tenían match):
SELECT c.id, c.property_nombre, c.property_apellidos, c.assigned_nutrition_type, c.assigned_calories
FROM clientes_pt_notion c
LEFT JOIN client_nutrition_assignments ca ON ca.client_id = c.id
WHERE c.status = 'active'
  AND c.assigned_nutrition_type IS NOT NULL
  AND c.assigned_calories IS NOT NULL
  AND ca.id IS NULL;

DROP TABLE march_q1_map;
