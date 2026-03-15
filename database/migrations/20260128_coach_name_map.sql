-- Migration: Crear tabla definitiva de mapeo Coach UUID ↔ Nombre
-- Esta tabla resuelve de una vez por todas el problema de matching entre nombres y UUIDs
-- Date: 2026-01-28

-- Tabla de mapeo de coaches
CREATE TABLE IF NOT EXISTS public.coach_name_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    notion_name VARCHAR(100), -- Nombre exacto como aparece en Notion
    aliases TEXT[], -- Array de posibles variantes del nombre
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_id),
    UNIQUE(display_name)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_coach_name_map_coach_id ON public.coach_name_map(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_name_map_display_name ON public.coach_name_map(display_name);
CREATE INDEX IF NOT EXISTS idx_coach_name_map_notion_name ON public.coach_name_map(notion_name);

-- Insertar los coaches conocidos
-- IMPORTANTE: Reemplaza los UUIDs con los reales de tu tabla users
INSERT INTO public.coach_name_map (coach_id, display_name, notion_name, aliases) VALUES
    ('e59de5e3-f962-48be-8392-04d9d59ba87d', 'Jesús', 'Jesús', ARRAY['Jesus', 'jesus', 'JESUS', 'Jesús García']),
    ('19657835-6fb4-4783-9b37-1be1d556c42d', 'Helena', 'Helena', ARRAY['helena', 'HELENA', 'Helena García']),
    ('5d5bbbed-cbc0-495c-ac6f-3e56bf5ffe54', 'Juan', 'Juan', ARRAY['juan', 'JUAN', 'Juan Carlos']),
    ('0cfcb072-ae4c-4b33-a96d-f3aa8b5aeb62', 'Esperanza', 'Esperanza', ARRAY['esperanza', 'ESPERANZA']),
    ('dec087e2-3bf5-43c7-8561-d22c049948db', 'Álvaro', 'Álvaro', ARRAY['Alvaro', 'alvaro', 'ALVARO', 'Álvaro García']),
    ('a2911cd6-e5c0-4fd3-8047-9f7f003e1d28', 'Victoria', 'Victoria', ARRAY['victoria', 'VICTORIA'])
ON CONFLICT (coach_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    notion_name = EXCLUDED.notion_name,
    aliases = EXCLUDED.aliases,
    updated_at = NOW();

-- Función para obtener el nombre de un coach dado su ID o nombre
CREATE OR REPLACE FUNCTION public.get_coach_display_name(input TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- Si es un UUID válido, buscar por coach_id
    IF input ~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
        SELECT display_name INTO result
        FROM public.coach_name_map
        WHERE coach_id = input::UUID;
        
        IF result IS NOT NULL THEN
            RETURN result;
        END IF;
    END IF;
    
    -- Buscar por nombre exacto
    SELECT display_name INTO result
    FROM public.coach_name_map
    WHERE display_name = input OR notion_name = input;
    
    IF result IS NOT NULL THEN
        RETURN result;
    END IF;
    
    -- Buscar en aliases
    SELECT display_name INTO result
    FROM public.coach_name_map
    WHERE input = ANY(aliases);
    
    IF result IS NOT NULL THEN
        RETURN result;
    END IF;
    
    -- Si no se encuentra, devolver el input original
    RETURN COALESCE(input, 'Sin Asignar');
END;
$$ LANGUAGE plpgsql STABLE;

-- Función para obtener el UUID de un coach dado su nombre
CREATE OR REPLACE FUNCTION public.get_coach_id(input TEXT)
RETURNS UUID AS $$
DECLARE
    result UUID;
BEGIN
    -- Si ya es un UUID válido, verificar que existe
    IF input ~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
        SELECT coach_id INTO result
        FROM public.coach_name_map
        WHERE coach_id = input::UUID;
        
        IF result IS NOT NULL THEN
            RETURN result;
        END IF;
    END IF;
    
    -- Buscar por nombre exacto
    SELECT coach_id INTO result
    FROM public.coach_name_map
    WHERE display_name = input OR notion_name = input;
    
    IF result IS NOT NULL THEN
        RETURN result;
    END IF;
    
    -- Buscar en aliases
    SELECT coach_id INTO result
    FROM public.coach_name_map
    WHERE input = ANY(aliases);
    
    RETURN result; -- Puede ser NULL si no se encuentra
END;
$$ LANGUAGE plpgsql STABLE;

-- Actualizar coach_capacity_view para usar la nueva tabla
DROP VIEW IF EXISTS public.coach_capacity_view;

CREATE OR REPLACE VIEW public.coach_capacity_view AS
SELECT 
    u.id,
    COALESCE(cnm.display_name, u.name) as name,
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
    (u.max_clients - u.current_clients) as available_slots,
    ROUND((u.current_clients::DECIMAL / NULLIF(u.max_clients, 0)) * 100, 2) as capacity_percentage,
    CASE 
        WHEN u.current_clients >= u.max_clients THEN 'full'
        WHEN u.current_clients >= (u.max_clients * 0.9) THEN 'near_full'
        WHEN u.current_clients >= (u.max_clients * 0.7) THEN 'moderate'
        ELSE 'available'
    END as capacity_status,
    -- Contar usando la tabla de mapeo
    (SELECT COUNT(*) 
     FROM public.clientes_pt_notion c 
     WHERE (
         c.coach_id = u.id 
         OR LOWER(c.property_coach) = LOWER(COALESCE(cnm.display_name, u.name))
         OR LOWER(c.property_coach) = LOWER(cnm.notion_name)
         OR LOWER(c.property_coach) = ANY(SELECT LOWER(unnest) FROM unnest(cnm.aliases))
     )
     AND LOWER(c.status) IN ('active', 'activo')) as actual_active_clients,
    (SELECT COUNT(*) 
     FROM public.clientes_pt_notion c 
     WHERE (
         c.coach_id = u.id 
         OR LOWER(c.property_coach) = LOWER(COALESCE(cnm.display_name, u.name))
         OR LOWER(c.property_coach) = LOWER(cnm.notion_name)
         OR LOWER(c.property_coach) = ANY(SELECT LOWER(unnest) FROM unnest(cnm.aliases))
     )
     AND LOWER(c.status) IN ('paused', 'pausa')) as actual_paused_clients,
    (SELECT COUNT(*) 
     FROM public.assignment_notes an 
     WHERE an.coach_id = u.id AND an.active = true) as active_notes_count
FROM public.users u
LEFT JOIN public.coach_name_map cnm ON cnm.coach_id = u.id
WHERE u.role IN ('coach', 'nutritionist', 'psychologist')
ORDER BY COALESCE(cnm.display_name, u.name);

-- Permisos
GRANT SELECT ON public.coach_name_map TO authenticated;
GRANT SELECT ON public.coach_name_map TO anon;
GRANT SELECT ON public.coach_capacity_view TO authenticated;
GRANT SELECT ON public.coach_capacity_view TO anon;
GRANT EXECUTE ON FUNCTION public.get_coach_display_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_display_name(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_coach_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_id(TEXT) TO anon;

COMMENT ON TABLE public.coach_name_map IS 'Tabla definitiva de mapeo entre UUID de coach y sus nombres/aliases';
COMMENT ON FUNCTION public.get_coach_display_name IS 'Obtiene el nombre normalizado de un coach dado su ID o nombre';
COMMENT ON FUNCTION public.get_coach_id IS 'Obtiene el UUID de un coach dado su nombre';
