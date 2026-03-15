-- Insertar usuario direccion@test.com si no existe
INSERT INTO public.users (id, email, name, role, created_at, avatar_url)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Fixed UUID for test user
  'direccion@test.com',
  'Dirección Test',
  'direccion',
  NOW(),
  'https://ui-avatars.com/api/?name=Direccion+Test'
)
ON CONFLICT (email) DO UPDATE
SET role = 'direccion';
