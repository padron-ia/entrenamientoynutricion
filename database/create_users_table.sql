-- =====================================================
-- SCRIPT SQL: Crear tabla de usuarios
-- =====================================================
-- Este script crea la tabla 'users' en Supabase para
-- almacenar los usuarios del equipo (Admins y Coaches)
-- =====================================================

-- 1. Crear la tabla users
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'client', 'closer', 'contabilidad', 'endocrino', 'psicologo')),
  avatar_url TEXT,
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de seguridad

-- Política: Todos pueden leer usuarios (necesario para login)
CREATE POLICY "Allow public read access to users"
  ON public.users
  FOR SELECT
  USING (true);

-- Política: Solo admins pueden insertar usuarios
CREATE POLICY "Allow admins to insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Política: Solo admins pueden actualizar usuarios
CREATE POLICY "Allow admins to update users"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Política: Solo admins pueden eliminar usuarios
CREATE POLICY "Allow admins to delete users"
  ON public.users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()::text
      AND role = 'admin'
    )
  );

-- 5. Insertar usuarios iniciales (Admin y Coach de demo)
INSERT INTO public.users (id, name, email, role, avatar_url, password)
VALUES 
  ('admin-123', 'Admin Demo', 'admin@demo.com', 'admin', 'https://ui-avatars.com/api/?name=Admin+Demo', '123456'),
  ('coach-1', 'Coach Demo', 'coach@demo.com', 'coach', 'https://ui-avatars.com/api/?name=Coach+Demo', '123456')
ON CONFLICT (email) DO NOTHING;

-- 6. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- NOTAS IMPORTANTES:
-- 1. Este script crea la tabla con RLS habilitado
-- 2. Si quieres DESHABILITAR RLS temporalmente para testing:
--    ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
-- 
-- 3. Para volver a habilitar RLS:
--    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
--
-- 4. Las políticas de RLS requieren autenticación de Supabase
--    Si estás usando mock auth, desactiva RLS temporalmente
