-- ============================================================
-- FIX PERMISOS: Permitir a Admins editar usuarios
-- ============================================================

-- 1. Función segura para chequear si soy admin (evita recursión RLS)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND role IN ('admin', 'head_coach')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- Se ejecuta con superpermisos para leer el rol

-- 2. Políticas de Edición (UPDATE)
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE
    USING ( public.is_admin() );

-- 3. Políticas de Lectura (SELECT) - Para ver a todos los coaches
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT
    USING ( public.is_admin() OR auth.uid()::text = id ); 

-- Recargar caché
NOTIFY pgrst, 'reload schema';
