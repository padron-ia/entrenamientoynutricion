-- 1. ACTIVAR RLS (Bloqueo por defecto)
-- Esto cierra las puertas de todas las tablas. Nadie entra sin permiso explícito.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_pt_notion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

-- 2. DEFINIR REGLAS DE ACCESO (Las llaves para entrar)

-- TABLA DE USUARIOS (Perfiles)
-- Regla: "Cada uno ver su propio perfil"
CREATE POLICY "Usuarios ven su propio perfil" ON public.users
FOR SELECT USING (
  auth.uid()::text = id::text
);

-- Regla: "Coaches y Admin ven todos los perfiles"
CREATE POLICY "Staff ve todos los perfiles" ON public.users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text 
    AND role IN ('admin', 'coach')
  )
);

-- TABLA DE CLIENTES (Datos Notion)
-- 1. BUZÓN DE ALTA (Anónimos)
-- Regla: "Cualquiera puede crear una ficha nueva (Onboarding)"
CREATE POLICY "Permitir alta publica" ON public.clientes_pt_notion
FOR INSERT WITH CHECK (true);

-- 2. ACCESO ALUMNOS (Lectura)
-- Regla: "El alumno solo ve su ficha si está logueado"
CREATE POLICY "Alumno ve su propia ficha" ON public.clientes_pt_notion
FOR SELECT USING (
  id::text = auth.uid()::text
);

-- 3. ACCESO SUPERIOR (Staff)
-- Regla: "Staff ve y edita TODAS las fichas"
CREATE POLICY "Staff control total clientes" ON public.clientes_pt_notion
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text 
    AND role IN ('admin', 'coach')
  )
);

-- TABLA DE CHECKINS
-- 1. ALUMNOS
CREATE POLICY "Alumno ve sus checkins" ON public.weekly_checkins
FOR SELECT USING (
  client_id::text = auth.uid()::text
);

CREATE POLICY "Alumno crea sus checkins" ON public.weekly_checkins
FOR INSERT WITH CHECK (
  client_id::text = auth.uid()::text
);

-- 2. STAFF (Revisión y notas)
CREATE POLICY "Staff control total checkins" ON public.weekly_checkins
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text 
    AND role IN ('admin', 'coach')
  )
);

-- TABLA DE VIDEO-REVISIONES (Coaching Sessions)
-- 1. ALUMNOS (Solo ver)
CREATE POLICY "Alumno ve sus revisiones" ON public.coaching_sessions
FOR SELECT USING (
  client_id::text = auth.uid()::text
);

-- 2. STAFF (Subir videos y borrar)
CREATE POLICY "Staff control total revisiones" ON public.coaching_sessions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text 
    AND role IN ('admin', 'coach')
  )
);

-- TABLA DE CLASES
-- 1. TODOS LEEN (Clientes y Staff)
CREATE POLICY "Ver clases" ON public.weekly_classes
FOR SELECT TO authenticated USING (true);

-- 2. STAFF GESTIONA
CREATE POLICY "Staff gestiona clases" ON public.weekly_classes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text 
    AND role IN ('admin', 'coach')
  )
);
