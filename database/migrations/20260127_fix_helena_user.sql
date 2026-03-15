-- =====================================================
-- MIGRACIÓN: Corregir usuario Helena
-- Fecha: 27 de Enero de 2026
-- Problema: Helena no puede ver sus clientes porque su
-- email no coincide en la tabla users
-- =====================================================

-- Paso 1: Ver si Helena ya existe con cualquier email
-- SELECT * FROM public.users WHERE name ILIKE '%helena%' OR email ILIKE '%helena%';

-- Paso 2: Eliminar registros antiguos de Helena (si existen)
DELETE FROM public.users
WHERE email ILIKE '%helena%'
   OR (name ILIKE '%helena%' AND role = 'coach');

-- Paso 3: Insertar Helena con el email correcto
INSERT INTO public.users (id, name, email, role, avatar_url, created_at)
VALUES (
  'coach-helena-001',
  'Helena',
  'nutricionhelenamartin@gmail.com',
  'coach',
  'https://ui-avatars.com/api/?name=Helena',
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW();

-- Paso 4: Verificar que se creó correctamente
-- SELECT * FROM public.users WHERE email = 'nutricionhelenamartin@gmail.com';

-- Paso 5: Verificar que hay clientes asignados a Helena
-- SELECT COUNT(*) as clientes_helena
-- FROM public.clientes_pt_notion
-- WHERE property_coach ILIKE '%helena%';

-- =====================================================
-- NOTAS:
-- - El email debe estar en minúsculas
-- - El campo property_coach en clientes contiene "Helena"
-- - El filtro de coaches busca coincidencias parciales
-- =====================================================
