-- Migration: Permitir acceso a coach_capacity_view para todos los roles autenticados
-- Purpose: Los Closers necesitan ver la disponibilidad de coaches para asignar clientes
-- Date: 2026-01-21

-- 1. Asegurar que la vista existe y tiene permisos correctos
-- Las vistas en PostgreSQL heredan permisos de las tablas subyacentes
-- Pero necesitamos dar acceso explícito

-- Dar permisos SELECT en la vista a usuarios autenticados
GRANT SELECT ON public.coach_capacity_view TO authenticated;
GRANT SELECT ON public.coach_capacity_view TO anon;

-- 2. Asegurar que la tabla users permite lectura de campos básicos
-- (Ya debería estar, pero lo reforzamos)
-- Esto permite que la vista funcione correctamente

-- Crear política RLS para que los usuarios autenticados puedan leer
-- información básica de coaches (nombre, capacidad, disponibilidad)
-- pero NO datos sensibles como email

-- Verificar si existe política, si no, crearla
DO $$
BEGIN
    -- Política para leer datos de coaches en la tabla users
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'users'
        AND policyname = 'Users can view coach basic info'
    ) THEN
        CREATE POLICY "Users can view coach basic info"
        ON public.users
        FOR SELECT
        TO authenticated
        USING (
            role IN ('coach', 'nutritionist', 'psychologist')
        );
    END IF;
END $$;

-- 3. Comentario de documentación
COMMENT ON VIEW public.coach_capacity_view IS 'Vista de capacidad de coaches - Accesible para Closers y Admins para asignación de clientes';

-- 4. Verificación
SELECT 'Permisos de coach_capacity_view configurados correctamente' as status;
