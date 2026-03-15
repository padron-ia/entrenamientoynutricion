-- =====================================================
-- 🔄 UNIFICACIÓN DE CRITERIOS DE ESTADO DE CLIENTE
-- =====================================================
-- Este script:
-- 1. Crea un trigger para mantener sincronizadas las columnas
--    'property_estado_cliente' y 'status'.
-- 2. Asegura que cualquier cambio en una se refleje en la otra.
-- 3. Establece 'Activo'/'active' como valor por defecto.
-- =====================================================

-- 1. Función de sincronización
CREATE OR REPLACE FUNCTION public.sync_client_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Si cambia property_estado_cliente (El origen de verdad según el usuario)
    IF (TG_OP = 'INSERT') OR (NEW.property_estado_cliente IS DISTINCT FROM OLD.property_estado_cliente) THEN
        IF NEW.property_estado_cliente = 'Activo' THEN NEW.status := 'active';
        ELSIF NEW.property_estado_cliente IN ('Baja', 'Reserva') THEN NEW.status := 'inactive';
        ELSIF NEW.property_estado_cliente IN ('Pausa', 'Pausado') THEN NEW.status := 'paused';
        ELSIF NEW.property_estado_cliente = 'Abandono' THEN NEW.status := 'dropout';
        ELSIF NEW.property_estado_cliente = 'Completado' THEN NEW.status := 'completed';
        END IF;
    END IF;

    -- Si cambia status desde la App (Para mantener coherencia bidireccional)
    IF (TG_OP = 'UPDATE') AND (NEW.status IS DISTINCT FROM OLD.status) AND (NEW.status IS DISTINCT FROM NEW.property_estado_cliente) THEN
        -- Solo actualizamos si property_estado_cliente no ha cambiado en este mismo trigger
        IF (NEW.property_estado_cliente = OLD.property_estado_cliente) THEN
            IF NEW.status = 'active' THEN NEW.property_estado_cliente := 'Activo';
            ELSIF NEW.status = 'inactive' THEN NEW.property_estado_cliente := 'Baja';
            ELSIF NEW.status = 'paused' THEN NEW.property_estado_cliente := 'Pausa';
            ELSIF NEW.status = 'dropout' THEN NEW.property_estado_cliente := 'Abandono';
            ELSIF NEW.status = 'completed' THEN NEW.property_estado_cliente := 'Completado';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear el trigger
DROP TRIGGER IF EXISTS trigger_sync_client_status ON public.clientes_pt_notion;
CREATE TRIGGER trigger_sync_client_status
    BEFORE INSERT OR UPDATE ON public.clientes_pt_notion
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_client_status();

-- 3. Establecer valores por defecto correctos
ALTER TABLE public.clientes_pt_notion ALTER COLUMN property_estado_cliente SET DEFAULT 'Activo';
ALTER TABLE public.clientes_pt_notion ALTER COLUMN status SET DEFAULT 'active';

-- 4. Ejecutar una actualización inicial para limpiar nulos o estados inconsistentes
UPDATE public.clientes_pt_notion 
SET property_estado_cliente = 'Activo' 
WHERE property_estado_cliente IS NULL;

UPDATE public.clientes_pt_notion 
SET status = 'active'
WHERE property_estado_cliente = 'Activo' AND status != 'active';

UPDATE public.clientes_pt_notion 
SET status = 'inactive'
WHERE property_estado_cliente = 'Baja' AND status != 'inactive';

UPDATE public.clientes_pt_notion 
SET status = 'paused'
WHERE property_estado_cliente = 'Pausa' AND status != 'paused';

UPDATE public.clientes_pt_notion 
SET status = 'dropout'
WHERE property_estado_cliente = 'Abandono' AND status != 'dropout';
