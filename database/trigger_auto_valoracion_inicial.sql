-- =============================================================================
-- TRIGGER: Auto-crear Valoración Inicial para Endocrino al insertar nuevo cliente
-- =============================================================================
-- Cuando un cliente entra a la BBDD (por Tally, API, o cualquier vía),
-- se genera automáticamente un registro en medical_reviews con report_type
-- 'Valoración Inicial' y status 'pending' para que el endocrino lo valore.
-- =============================================================================

-- 1. Función del trigger
CREATE OR REPLACE FUNCTION public.fn_auto_create_valoracion_inicial()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo crear si NO existe ya una valoración inicial para este cliente
    IF NOT EXISTS (
        SELECT 1 FROM public.medical_reviews
        WHERE client_id = NEW.id
        AND report_type = 'Valoración Inicial'
    ) THEN
        INSERT INTO public.medical_reviews (
            client_id,
            coach_id,
            submission_date,
            diabetes_type,
            insulin_usage,
            insulin_dose,
            medication,
            comments,
            report_type,
            status
        ) VALUES (
            NEW.id,
            COALESCE(NEW.coach_id, NEW.property_coach),
            CURRENT_DATE,
            COALESCE(NEW.property_enfermedades, NEW.property_patologias, 'No especificado'),
            CASE
                WHEN NEW.property_insulina IS NOT NULL AND LOWER(NEW.property_insulina) IN ('si', 'sí', 'yes', 'true') THEN 'Si'
                WHEN NEW.property_insulina IS NOT NULL THEN NEW.property_insulina
                ELSE 'No especificado'
            END,
            NEW.property_dosis,
            NEW.property_medicaci_n,
            CONCAT(
                'Valoración inicial automática. ',
                'Paciente: ', COALESCE(NEW.property_nombre, ''), ' ', COALESCE(NEW.property_apellidos, ''), '. ',
                'Enfermedades: ', COALESCE(NEW.property_enfermedades, 'N/D'), '. ',
                'Patologías: ', COALESCE(NEW.property_patologias, 'N/D'), '. ',
                'HbA1c: ', COALESCE(NEW.property_ultima_glicosilada_hb_a1c, 'N/D'), '. ',
                'Insulina: ', COALESCE(NEW.property_insulina, 'N/D'), '. ',
                'Dosis: ', COALESCE(NEW.property_dosis, 'N/D'), '. ',
                'Medicación: ', COALESCE(NEW.property_medicaci_n, 'N/D'), '.'
            ),
            'Valoración Inicial',
            'pending'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear el trigger (DROP primero por si ya existe)
DROP TRIGGER IF EXISTS trg_auto_valoracion_inicial ON public.clientes_pt_notion;

CREATE TRIGGER trg_auto_valoracion_inicial
    AFTER INSERT ON public.clientes_pt_notion
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auto_create_valoracion_inicial();

-- 3. (OPCIONAL) Crear valoraciones iniciales para clientes que ya existen
--    y no tienen una. Descomentar y ejecutar manualmente si se necesita.

-- INSERT INTO public.medical_reviews (client_id, coach_id, submission_date, diabetes_type, insulin_usage, insulin_dose, medication, comments, report_type, status)
-- SELECT
--     c.id,
--     COALESCE(c.coach_id, c.property_coach),
--     CURRENT_DATE,
--     COALESCE(c.property_enfermedades, c.property_patologias, 'No especificado'),
--     CASE
--         WHEN c.property_insulina IS NOT NULL AND LOWER(c.property_insulina) IN ('si', 'sí', 'yes', 'true') THEN 'Si'
--         WHEN c.property_insulina IS NOT NULL THEN c.property_insulina
--         ELSE 'No especificado'
--     END,
--     c.property_dosis,
--     c.property_medicaci_n,
--     CONCAT(
--         'Valoración inicial automática (retroactiva). ',
--         'Paciente: ', COALESCE(c.property_nombre, ''), ' ', COALESCE(c.property_apellidos, ''), '. ',
--         'Enfermedades: ', COALESCE(c.property_enfermedades, 'N/D'), '. ',
--         'Patologías: ', COALESCE(c.property_patologias, 'N/D'), '. ',
--         'HbA1c: ', COALESCE(c.property_ultima_glicosilada_hb_a1c, 'N/D'), '. ',
--         'Insulina: ', COALESCE(c.property_insulina, 'N/D'), '. ',
--         'Dosis: ', COALESCE(c.property_dosis, 'N/D'), '. ',
--         'Medicación: ', COALESCE(c.property_medicaci_n, 'N/D'), '.'
--     ),
--     'Valoración Inicial',
--     'pending'
-- FROM public.clientes_pt_notion c
-- WHERE c.status IN ('Active', 'active')
-- AND NOT EXISTS (
--     SELECT 1 FROM public.medical_reviews mr
--     WHERE mr.client_id = c.id
--     AND mr.report_type = 'Valoración Inicial'
-- );
