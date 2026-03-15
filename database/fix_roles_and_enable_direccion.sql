-- PASO 1: Eliminar la restricción actual para evitar bloqueos
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- PASO 2: (OPCIONAL DE SEGURIDAD) Normalizar roles existentes para asegurar que cumplen con la nueva lista
-- Esto evita el error de "check constraint violated" si hay algún rol raro antiguo.
-- Convertimos cualquier rol desconocido a 'client' por defecto.
UPDATE public.users 
SET role = 'client' 
WHERE role NOT IN ('admin', 'coach', 'client', 'superadmin', 'rrss', 'closer', 'setter', 'direccion');

-- PASO 3: Volver a aplicar la restricción con la lista completa, incluyendo 'direccion'
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'coach', 'client', 'superadmin', 'rrss', 'closer', 'setter', 'direccion'));

-- PASO 4: Crear/Actualizar el usuario de prueba Dirección
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
SET role = 'direccion';

-- PASO 5: Mensaje de éxito (solo para verificar)
SELECT 'Roles actualizados correctamente y usuario direccion creado' as result;
