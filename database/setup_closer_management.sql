-- ============================================================================
-- SISTEMA DE GESTIÓN DE CLOSERS Y CAPACIDAD DE COACHES
-- Descripción: Ampliación de tablas para gestión de ventas y capacidad
-- Autor: Sistema PT
-- Fecha: 17 de Diciembre de 2025
-- ============================================================================

-- ============================================================================
-- PRE-REQUISITO: Asegurar que existen columnas necesarias en clientes
-- ============================================================================
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS coach_id TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; -- Para estandarizar el estado

-- MIGRACIÓN DE DATOS 1: Vincular coaches por nombre
UPDATE public.clientes_pt_notion c
SET coach_id = u.id
FROM public.users u
WHERE c.coach_id IS NULL 
AND (c.property_coach = u.name OR c.property_coach ILIKE '%' || u.name || '%');

-- MIGRACIÓN DE DATOS 2: Sincronizar estados reales desde Notion
-- Esto corrige que todos aparezcan como 'active' por defecto
UPDATE public.clientes_pt_notion
SET status = CASE 
    WHEN property_estado_cliente ILIKE '%pausa%' THEN 'paused'
    WHEN property_estado_cliente ILIKE '%baja%' 
      OR property_estado_cliente ILIKE '%inactivo%' 
      OR property_estado_cliente ILIKE '%abandono%' 
      OR property_estado_cliente ILIKE '%completado%' THEN 'inactive'
    WHEN property_estado_cliente ILIKE '%activo%' 
      OR property_estado_cliente ILIKE '%alta%' THEN 'active'
    ELSE 'inactive' -- Por seguridad, si no sabemos qué es, no ocupa cupo
END
WHERE property_estado_cliente IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_coach_id ON public.clientes_pt_notion(coach_id);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON public.clientes_pt_notion(status);

-- ============================================================================
-- 1. AMPLIAR TABLA USERS (Coaches con capacidad y estado)
-- ============================================================================

-- Añadir campos de capacidad y estado a la tabla users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS max_clients INTEGER DEFAULT 15;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_clients INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; -- 'active', 'vacation', 'sick_leave', 'inactive'
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status_notes TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assignment_notes TEXT; -- Notas del admin sobre asignaciones
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS available_for_assignment BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS specialty TEXT[]; -- Especialidades del coach/nutricionista
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS end_date DATE; -- Para vacaciones/bajas temporales

-- Comentarios
COMMENT ON COLUMN public.users.max_clients IS 'Número máximo de clientes que puede tener el coach';
COMMENT ON COLUMN public.users.current_clients IS 'Número actual de clientes activos';
COMMENT ON COLUMN public.users.status IS 'Estado del usuario: active, vacation, sick_leave, inactive';
COMMENT ON COLUMN public.users.status_notes IS 'Notas sobre el estado actual';
COMMENT ON COLUMN public.users.assignment_notes IS 'Notas del admin sobre restricciones de asignación';
COMMENT ON COLUMN public.users.available_for_assignment IS 'Si está disponible para recibir nuevos clientes';

-- ============================================================================
-- 2. AMPLIAR TABLA SALES (Facturas y tracking)
-- ============================================================================

-- Añadir campos de facturación
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_uploaded BOOLEAN DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_url TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_date DATE;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_amount DECIMAL(10,2);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS commission_paid_date DATE;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS admin_notes TEXT; -- Notas del admin sobre esta venta

-- Comentarios
COMMENT ON COLUMN public.sales.invoice_uploaded IS 'Si el closer ha subido la factura';
COMMENT ON COLUMN public.sales.invoice_url IS 'URL de la factura en Supabase Storage';
COMMENT ON COLUMN public.sales.admin_notes IS 'Notas del administrador sobre esta venta';

-- ============================================================================
-- 3. CREAR TABLA DE NOTAS DE ASIGNACIÓN
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.assignment_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    note_type TEXT NOT NULL, -- 'restriction', 'preference', 'temporary_hold', 'capacity_limit'
    note TEXT NOT NULL,
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
    active BOOLEAN DEFAULT true,
    created_by TEXT REFERENCES public.users(id),
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE public.assignment_notes IS 'Notas y restricciones de asignación para coaches';
COMMENT ON COLUMN public.assignment_notes.note_type IS 'Tipo de nota: restriction, preference, temporary_hold, capacity_limit';

-- Índices
CREATE INDEX IF NOT EXISTS idx_assignment_notes_coach ON public.assignment_notes(coach_id);
CREATE INDEX IF NOT EXISTS idx_assignment_notes_active ON public.assignment_notes(active) WHERE active = true;

-- ============================================================================
-- 4. CREAR VISTA DE CAPACIDAD DE COACHES EN TIEMPO REAL
-- ============================================================================

DROP VIEW IF EXISTS public.coach_capacity_view;

CREATE OR REPLACE VIEW public.coach_capacity_view AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.max_clients,
    u.current_clients,
    u.status,
    u.status_notes,
    u.assignment_notes,
    u.available_for_assignment,
    u.specialty,
    u.start_date,
    u.end_date,
    -- Calcular disponibilidad
    (u.max_clients - u.current_clients) as available_slots,
    ROUND((u.current_clients::DECIMAL / NULLIF(u.max_clients, 0)) * 100, 2) as capacity_percentage,
    -- Determinar estado de capacidad
    -- Determinar estado de capacidad
    CASE 
        WHEN u.current_clients >= u.max_clients THEN 'full'
        WHEN u.current_clients >= (u.max_clients * 0.9) THEN 'near_full'
        WHEN u.current_clients >= (u.max_clients * 0.7) THEN 'moderate'
        ELSE 'available'
    END as capacity_status,
    -- Contar clientes activos reales
    (SELECT COUNT(*) 
     FROM public.clientes_pt_notion c 
     WHERE c.coach_id = u.id 
     AND (c.status = 'active' OR c.status = 'Active' OR c.status = 'Activo')) as actual_active_clients,
    -- Contar clientes en pausa
    (SELECT COUNT(*) 
     FROM public.clientes_pt_notion c 
     WHERE c.coach_id = u.id 
     AND (c.status = 'paused' OR c.status = 'Paused' OR c.status = 'Pausa')) as actual_paused_clients,
    -- Notas activas
    (SELECT COUNT(*) 
     FROM public.assignment_notes an 
     WHERE an.coach_id = u.id 
     AND an.active = true) as active_notes_count
FROM public.users u
WHERE u.role IN ('coach', 'nutritionist', 'psychologist')
ORDER BY u.name;

COMMENT ON VIEW public.coach_capacity_view IS 'Vista en tiempo real de la capacidad de coaches';

-- ============================================================================
-- 5. FUNCIÓN PARA ACTUALIZAR CONTADOR DE CLIENTES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_coach_client_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar contador cuando se asigna/desasigna un coach
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Actualizar contador del nuevo coach
        IF NEW.coach_id IS NOT NULL THEN
            UPDATE public.users
            SET current_clients = (
                SELECT COUNT(*)
                FROM public.clientes_pt_notion
                WHERE coach_id = NEW.coach_id
                AND status = 'active'
            )
            WHERE id = NEW.coach_id;
        END IF;
        
        -- Si es UPDATE y cambió el coach, actualizar el anterior
        IF TG_OP = 'UPDATE' AND OLD.coach_id IS DISTINCT FROM NEW.coach_id THEN
            IF OLD.coach_id IS NOT NULL THEN
                UPDATE public.users
                SET current_clients = (
                    SELECT COUNT(*)
                    FROM public.clientes_pt_notion
                    WHERE coach_id = OLD.coach_id
                    AND status = 'active'
                )
                WHERE id = OLD.coach_id;
            END IF;
        END IF;
    END IF;
    
    -- Si es DELETE, actualizar el coach anterior
    IF TG_OP = 'DELETE' THEN
        IF OLD.coach_id IS NOT NULL THEN
            UPDATE public.users
            SET current_clients = (
                SELECT COUNT(*)
                FROM public.clientes_pt_notion
                WHERE coach_id = OLD.coach_id
                AND status = 'active'
            )
            WHERE id = OLD.coach_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_update_coach_client_count ON public.clientes_pt_notion;
CREATE TRIGGER trigger_update_coach_client_count
    AFTER INSERT OR UPDATE OF coach_id, status OR DELETE
    ON public.clientes_pt_notion
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_client_count();

-- ============================================================================
-- 6. FUNCIÓN PARA RECALCULAR TODOS LOS CONTADORES (Mantenimiento)
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_all_coach_counts()
RETURNS void AS $$
BEGIN
    UPDATE public.users u
    SET current_clients = (
        SELECT COUNT(*)
        FROM public.clientes_pt_notion c
        WHERE c.coach_id = u.id
        AND c.status = 'active'
    )
    WHERE u.role IN ('coach', 'nutritionist', 'psychologist');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_all_coach_counts IS 'Recalcula todos los contadores de clientes de coaches';

-- Ejecutar recalculo inicial
SELECT recalculate_all_coach_counts();

-- ============================================================================
-- 7. ÍNDICES ADICIONALES PARA RENDIMIENTO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_role_status ON public.users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_available_assignment ON public.users(available_for_assignment) WHERE available_for_assignment = true;
CREATE INDEX IF NOT EXISTS idx_sales_closer_id ON public.sales(closer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_uploaded ON public.sales(invoice_uploaded);
CREATE INDEX IF NOT EXISTS idx_clientes_coach_status ON public.clientes_pt_notion(coach_id, status);

-- ============================================================================
-- 8. DATOS INICIALES - Configurar coaches existentes
-- ============================================================================

-- Actualizar coaches existentes con valores por defecto
UPDATE public.users
SET 
    max_clients = 15,
    status = 'active',
    available_for_assignment = true
WHERE role = 'coach' AND max_clients IS NULL;

UPDATE public.users
SET 
    max_clients = 20,
    status = 'active',
    available_for_assignment = true
WHERE role = 'nutritionist' AND max_clients IS NULL;

UPDATE public.users
SET 
    max_clients = 10,
    status = 'active',
    available_for_assignment = true
WHERE role = 'psychologist' AND max_clients IS NULL;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- Verificar que todo se creó correctamente
SELECT 'Script ejecutado correctamente. Tablas y funciones creadas.' as status;
