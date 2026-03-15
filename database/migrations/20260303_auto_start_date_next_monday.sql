-- =========================================================
-- AUTO START_DATE = LUNES SIGUIENTE A CREATED_AT
-- Proyecto: Padron Trainer
-- Tabla: clientes_pt_notion
-- Fecha: 2026-03-03
-- =========================================================

-- =========================================================
-- PASO 1: DIAGNÓSTICO — Ejecutar primero para revisar
-- =========================================================
-- Muestra los clientes SIN start_date y qué lunes les tocaría

SELECT
    id,
    name,
    email,
    status,
    created_at,
    start_date,
    (created_at::date + CASE EXTRACT(DOW FROM created_at)::int
        WHEN 0 THEN 1  -- Domingo → Lunes
        WHEN 1 THEN 7  -- Lunes → Lunes siguiente
        WHEN 2 THEN 6  -- Martes
        WHEN 3 THEN 5  -- Miércoles
        WHEN 4 THEN 4  -- Jueves
        WHEN 5 THEN 3  -- Viernes
        WHEN 6 THEN 2  -- Sábado
    END) AS start_date_calculado
FROM clientes_pt_notion
WHERE start_date IS NULL
ORDER BY created_at DESC;


-- =========================================================
-- PASO 2: FIX — Rellenar start_date de clientes existentes
-- (Ejecutar DESPUÉS de revisar el paso 1)
-- =========================================================

UPDATE clientes_pt_notion
SET start_date = created_at::date + CASE EXTRACT(DOW FROM created_at)::int
    WHEN 0 THEN 1
    WHEN 1 THEN 7
    WHEN 2 THEN 6
    WHEN 3 THEN 5
    WHEN 4 THEN 4
    WHEN 5 THEN 3
    WHEN 6 THEN 2
END
WHERE start_date IS NULL
  AND created_at IS NOT NULL;


-- =========================================================
-- PASO 3: TRIGGER — Auto-rellenar en futuros INSERT
-- =========================================================

CREATE OR REPLACE FUNCTION fn_set_start_date_next_monday()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.start_date IS NULL AND NEW.created_at IS NOT NULL THEN
        NEW.start_date := NEW.created_at::date + CASE EXTRACT(DOW FROM NEW.created_at)::int
            WHEN 0 THEN 1
            WHEN 1 THEN 7
            WHEN 2 THEN 6
            WHEN 3 THEN 5
            WHEN 4 THEN 4
            WHEN 5 THEN 3
            WHEN 6 THEN 2
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_start_date ON clientes_pt_notion;
CREATE TRIGGER trg_auto_start_date
    BEFORE INSERT ON clientes_pt_notion
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_start_date_next_monday();

-- =========================================================
-- ✅ LISTO
-- Ejecución recomendada:
--   1. Ejecuta solo el PASO 1 (SELECT) → revisa los resultados
--   2. Si todo cuadra, ejecuta PASO 2 (UPDATE) + PASO 3 (TRIGGER)
-- =========================================================
