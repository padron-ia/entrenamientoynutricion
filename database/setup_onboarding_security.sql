-- ==============================================================================
-- CONFIGURACIÓN DE SEGURIDAD HÍBRIDA (MIGRACIÓN SUAVE)
-- Permite convivencia de usuarios Legacy (Móvil) y Nuevos (Email/Pass)
-- ==============================================================================

-- 1. AÑADIR COLUMNA "PUENTE"
-- En lugar de forzar que el ID principal sea el de Auth, creamos un campo específico.
-- Esto protege las relaciones existentes (checkins, planes, etc.) que apuntan al ID antiguo.
ALTER TABLE public.clientes_pt_notion 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Crear un índice para que las búsquedas sean rápidas
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes_pt_notion(user_id);

-- 2. ACTIVAR RLS
ALTER TABLE public.clientes_pt_notion ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE ACCESO INTELIGENTES

-- A. LECTURA: 
-- El usuario puede ver su ficha si:
-- 1. Su ID de Auth coincide con la columna puente 'user_id' (Usuario Migrado/Nuevo)
-- 2. O, provisionalmente, si coincide con el ID principal (Caso Onboarding directo)
DROP POLICY IF EXISTS "Acceso Híbrido Clientes" ON public.clientes_pt_notion;
CREATE POLICY "Acceso Híbrido Clientes"
ON public.clientes_pt_notion
FOR ALL
USING (
  (user_id = auth.uid()) OR (id = auth.uid())
);

-- B. CREACIÓN (ONBOARDING)
-- Permitimos crear ficha si el usuario se asigna a sí mismo como dueño.
DROP POLICY IF EXISTS "Creación Onboarding" ON public.clientes_pt_notion;
CREATE POLICY "Creación Onboarding"
ON public.clientes_pt_notion
FOR INSERT
WITH CHECK (
  (user_id = auth.uid()) OR (id = auth.uid())
);

-- 4. VISIBILIDAD PARA EL STAFF (Admin + Equipo Completo)
-- Esta política permite que cualquier miembro del equipo vea todos los clientes.
-- En el futuro, se pueden crear políticas separadas por rol para limitar acceso (ej: contabilidad solo ve pagos).

DROP POLICY IF EXISTS "Staff ve todos los clientes" ON public.clientes_pt_notion;
CREATE POLICY "Staff ve todos los clientes"
ON public.clientes_pt_notion
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text -- Ojo: Asegúrate de que los IDs en 'users' coincidan con Auth UUIDs en producción
    AND role IN ('admin', 'coach', 'closer', 'contabilidad', 'endocrino', 'psicologo')
  )
);

-- 5. FUNCIÓN PARA MIGRACIÓN AUTOMÁTICA (Opcional)
-- Podríamos usar esto para vincular automáticamente por email si coinciden
/*
UPDATE public.clientes_pt_notion c
SET user_id = u.id
FROM auth.users u
WHERE c.property_correo_electr_nico = u.email
AND c.user_id IS NULL;
*/
