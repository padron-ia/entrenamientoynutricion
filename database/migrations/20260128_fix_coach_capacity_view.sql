-- Migration: Corregir coach_capacity_view para usar property_coach correctamente
-- El problema: la vista intenta matchear por coach_id (UUID) pero los datos tienen
-- property_coach con nombres de coach (string)
-- Date: 2026-01-28

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
    CASE 
        WHEN u.current_clients >= u.max_clients THEN 'full'
        WHEN u.current_clients >= (u.max_clients * 0.9) THEN 'near_full'
        WHEN u.current_clients >= (u.max_clients * 0.7) THEN 'moderate'
        ELSE 'available'
    END as capacity_status,
    -- Contar clientes activos reales (PRIORIDAD: property_coach contiene el nombre)
    (SELECT COUNT(*) 
     FROM public.clientes_pt_notion c 
     WHERE (
         -- Match por nombre en property_coach (case-insensitive, parcial)
         LOWER(c.property_coach) LIKE LOWER('%' || u.name || '%')
         -- O match exacto por coach_id si existe
         OR c.coach_id = u.id
     )
     AND LOWER(c.status) IN ('active', 'activo')) as actual_active_clients,
    -- Contar clientes en pausa
    (SELECT COUNT(*) 
     FROM public.clientes_pt_notion c 
     WHERE (
         LOWER(c.property_coach) LIKE LOWER('%' || u.name || '%')
         OR c.coach_id = u.id
     )
     AND LOWER(c.status) IN ('paused', 'pausa')) as actual_paused_clients,
    -- Notas activas
    (SELECT COUNT(*) 
     FROM public.assignment_notes an 
     WHERE an.coach_id = u.id 
     AND an.active = true) as active_notes_count
FROM public.users u
WHERE u.role IN ('coach', 'nutritionist', 'psychologist')
ORDER BY u.name;

-- Dar permisos SELECT en la vista a usuarios autenticados
GRANT SELECT ON public.coach_capacity_view TO authenticated;
GRANT SELECT ON public.coach_capacity_view TO anon;

COMMENT ON VIEW public.coach_capacity_view IS 'Vista con conteo real de clientes por coach usando property_coach (nombre)';
