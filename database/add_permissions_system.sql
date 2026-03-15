-- ==============================================================================
-- 🛠️ MEJORA: SISTEMA DE PERMISOS GRANULARES 🛠️
-- ==============================================================================

-- 1. Añadir columna de permisos (array de texto) a la tabla users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.users.permissions IS 'Lista de permisos especiales adicionales al rol (ej: access:accounting)';

-- 2. Crear índice para búsquedas rápidas por permisos
CREATE INDEX IF NOT EXISTS idx_users_permissions ON public.users USING GIN (permissions);

-- 3. Actualizar la vista de capacidad (si fuera necesario, aunque no afecta directamente)
-- (No es necesario tocar la vista de capacidad para esto)

-- ==============================================================================
-- DEFINICIÓN DE PERMISOS ESTÁNDAR (Documentación para el desarrollador)
-- ==============================================================================
-- 'access:accounting'  -> Ver paneles financieros y contabilidad
-- 'access:sales'       -> Ver paneles de ventas y crear ventas
-- 'access:renewals'    -> Ver y gestionar renovaciones
-- 'access:medical'     -> Ver datos médicos sensibles
-- 'access:clients'     -> Ver cartera de clientes (global o asignados)
-- 'access:settings'    -> Acceso a configuración (normalmente solo admin)
-- 'manage:team'        -> Invitar y gestionar equipo
-- ==============================================================================
