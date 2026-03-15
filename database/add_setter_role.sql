-- ==============================================================================
-- 🛠️ MIGRACIÓN: AÑADIR ROL SETTER 🛠️
-- ==============================================================================

-- 1. Actualizar la restricción de roles en la tabla users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN (
  'admin', 
  'head_coach', 
  'coach', 
  'closer', 
  'contabilidad', 
  'endocrino', 
  'psicologo', 
  'rrss', 
  'client',
  'setter' -- Nuevo rol añadido
));

-- 2. Actualizar la función is_staff para incluir setter y otros roles técnicos
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
  SELECT public.get_auth_role() IN (
    'admin', 'head_coach', 'coach', 'closer', 'contabilidad', 
    'endocrino', 'psicologo', 'rrss', 'setter'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Actualizar trigger handle_new_user para permitir 'setter'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  final_role text;
BEGIN
  -- Normalizamos el rol a minúsculas
  final_role := lower(COALESCE(new.raw_user_meta_data->>'role', 'client'));
  
  -- Validamos que el rol sea uno de los permitidos
  IF final_role NOT IN ('admin', 'head_coach', 'coach', 'closer', 'contabilidad', 'endocrino', 'psicologo', 'rrss', 'setter', 'client') THEN
    final_role := 'client';
  END IF;

  INSERT INTO public.users (id, email, name, role, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))),
    final_role,
    'https://ui-avatars.com/api/?name=' || COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = final_role,
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
