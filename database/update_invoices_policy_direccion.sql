-- ================================================================
-- ACTUALIZACIÓN DE PERMISOS PARA ROL DIRECCIÓN
-- Fecha: 2026-02-03
-- ================================================================

-- 1. Actualizar función is_staff para incluir 'direccion'
-- Esto permitirá que 'direccion' sea considerado parte del equipo en todas las tablas
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
  SELECT public.get_auth_role() IN ('admin', 'head_coach', 'coach', 'closer', 'contabilidad', 'endocrino', 'psicologo', 'rrss', 'direccion');
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Actualizar función is_admin para incluir 'direccion'
-- Esto les dará permisos de administración general (ver usuarios, configuración, etc.)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT public.get_auth_role() IN ('admin', 'head_coach', 'direccion');
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Actualizar política de visibilidad TOTAL de facturas
-- Eliminamos la política anterior que solo incluía admin/contabilidad
DROP POLICY IF EXISTS "Admin/Contabilidad ve todo" ON public.coach_invoices;

-- Creamos la nueva política incluyendo direccion
CREATE POLICY "Admin/Contabilidad/Direccion ve todo"
ON public.coach_invoices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND lower(role) IN ('admin', 'contabilidad', 'direccion')
  )
);
