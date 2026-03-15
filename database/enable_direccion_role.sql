-- 1. Asegurar que el rol 'direccion' está permitido en la restricción check de la tabla users
-- Nota: Esto depende de cómo esté definida tu restricción. Si es un enum o check constraint:

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'coach', 'client', 'superadmin', 'rrss', 'closer', 'setter', 'direccion'));

-- 2. Crear o Actualizar el usuario de prueba
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

-- 3. Actualizar el usuario de Victor (Sustituye 'EMAIL_DE_VICTOR' por su email real si lo sabes, o ejecútalo manualmente)
-- UPDATE public.users SET role = 'direccion' WHERE email = 'vic.entrena@gmail.com'; 
-- (Asumo que este podría ser su email, o similar. Si no, descomenta y edita la línea anterior en Supabase)
