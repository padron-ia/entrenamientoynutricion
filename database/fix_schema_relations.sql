-- 1. CORRECCIÓN EN LA TABLA SALES
-- Primero eliminamos restricciones antiguas si existen y cambiamos tipos de datos
ALTER TABLE public.sales 
  ALTER COLUMN closer_id TYPE UUID USING closer_id::UUID,
  ALTER COLUMN assigned_coach_id TYPE UUID USING assigned_coach_id::UUID;

-- Añadimos las relaciones correctas a public.users
ALTER TABLE public.sales
  ADD CONSTRAINT sales_closer_id_fkey FOREIGN KEY (closer_id) REFERENCES public.users(id),
  ADD CONSTRAINT sales_assigned_coach_id_fkey FOREIGN KEY (assigned_coach_id) REFERENCES public.users(id);

-- 2. CORRECCIÓN EN LA TABLA LEADS
-- Eliminamos las FK actuales que apuntan a auth.users
ALTER TABLE public.leads 
  DROP CONSTRAINT IF EXISTS leads_assigned_to_fkey,
  DROP CONSTRAINT IF EXISTS leads_closer_id_fkey,
  DROP CONSTRAINT IF EXISTS leads_setter_id_fkey;

-- Añadimos las relaciones correctas a public.users
ALTER TABLE public.leads
  ADD CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id),
  ADD CONSTRAINT leads_closer_id_fkey FOREIGN KEY (closer_id) REFERENCES public.users(id),
  ADD CONSTRAINT leads_setter_id_fkey FOREIGN KEY (setter_id) REFERENCES public.users(id);

-- 3. NOTA SOBRE RLS
-- Aseguramos que las políticas permitan el join
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON public.users;
CREATE POLICY "Public users are viewable by everyone" ON public.users FOR SELECT USING (true);
