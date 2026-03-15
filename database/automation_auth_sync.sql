-- ================================================================
-- AUTOMATIZACIÓN: Sincronización Auth -> Users
-- ================================================================
-- Este script crea un Trigger (disparador) que escucha cuando se
-- crea un usuario en el sistema de Login (Auth) y automáticamente
-- crea su ficha de perfil en la tabla 'users' de la App.
-- ================================================================

-- 1. Crear la función que ejecutará el Robot
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, avatar_url)
  VALUES (
    new.id, -- El ID seguro generado por Supabase
    new.email,
    -- Intentamos sacar el nombre de los metadatos, si no, usamos la parte inicial del email
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    -- Asignamos un rol por defecto (puedes cambiarlo después en la App)
    'coach',
    -- Avatar por defecto usando las iniciales
    'https://ui-avatars.com/api/?name=' || COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING; -- Si ya existía, no hacemos nada para evitar errores
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Conectar el Trigger al evento de creación de usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- FIN DE LA AUTOMATIZACIÓN
-- Ahora, cada vez que crees un usuario en Supabase Auth,
-- aparecerá mágicamente en tu App listo para trabajar.
-- ================================================================
