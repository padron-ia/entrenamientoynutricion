-- ==============================================================================
-- 🧪 SEED: USUARIOS DE PRUEBA (STAFF) 🧪
-- ==============================================================================
-- Este script registra los perfiles de prueba en la tabla public.users para que
-- aparezcan en los listados de la plataforma y mantengan sus roles.

-- 1. Asegurar que los roles están permitidos (por si acaso)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'head_coach', 'coach', 'closer', 'contabilidad', 'endocrino', 'psicologo', 'rrss', 'setter', 'direccion', 'client'));

-- 2. Insertar/Actualizar perfiles de prueba
-- Usamos IDs fijos para consistencia en entornos de desarrollo/test

-- DIRECCIÓN
INSERT INTO public.users (id, email, name, role, created_at, avatar_url)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'direccion@test.com',
  'Dirección Test',
  'direccion',
  NOW(),
  'https://ui-avatars.com/api/?name=Direccion+Test'
)
ON CONFLICT (email) DO UPDATE 
SET role = 'direccion', name = 'Dirección Test';

-- CLOSER 1
INSERT INTO public.users (id, email, name, role, created_at, avatar_url)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'closer@test.com',
  'María Closer',
  'closer',
  NOW(),
  'https://ui-avatars.com/api/?name=Maria+Closer'
)
ON CONFLICT (email) DO UPDATE 
SET role = 'closer', name = 'María Closer';

-- CLOSER 2
INSERT INTO public.users (id, email, name, role, created_at, avatar_url)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'closer2@test.com',
  'Carlos Ventas',
  'closer',
  NOW(),
  'https://ui-avatars.com/api/?name=Carlos+Ventas'
)
ON CONFLICT (email) DO UPDATE 
SET role = 'closer', name = 'Carlos Ventas';

-- SETTER 1
INSERT INTO public.users (id, email, name, role, created_at, avatar_url)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'setter@test.com',
  'Sofía Setter',
  'setter',
  NOW(),
  'https://ui-avatars.com/api/?name=Sofia+Setter'
)
ON CONFLICT (email) DO UPDATE 
SET role = 'setter', name = 'Sofía Setter';

-- 3. Mensaje de confirmación
SELECT 'Usuarios de prueba registrados correctamente en public.users' as result;
