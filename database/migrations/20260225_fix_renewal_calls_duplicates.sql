-- ============================================================================
-- FIX: Limpiar duplicados en renewal_calls y añadir UNIQUE constraint
-- Fecha: 2026-02-25
-- Problema: La función generateRenewalAlerts creaba duplicados porque
--           las fechas se comparaban en formatos diferentes (DATE vs ISO timestamp).
-- ============================================================================

-- PASO 1: Ver los duplicados actuales (verificación)
-- SELECT client_id, contract_end_date, COUNT(*) as duplicates
-- FROM renewal_calls
-- GROUP BY client_id, contract_end_date
-- HAVING COUNT(*) > 1;

-- PASO 2: Eliminar duplicados, manteniendo el registro más relevante.
-- Prioridad: 1) El que tenga estado !== 'pending', 2) El más reciente (updated_at).
DELETE FROM renewal_calls
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY client_id, contract_end_date
                ORDER BY
                    -- Priorizar registros con progreso (no-pending)
                    CASE WHEN call_status != 'pending' OR call_result != 'pending' THEN 0 ELSE 1 END,
                    -- Luego el más reciente
                    updated_at DESC NULLS LAST,
                    created_at DESC NULLS LAST
            ) as rn
        FROM renewal_calls
    ) ranked
    WHERE rn > 1
);

-- PASO 3: Añadir UNIQUE constraint para prevenir futuros duplicados a nivel de BD
-- Esto es la protección definitiva: incluso si el código falla, la BD no permitirá duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS idx_renewal_calls_unique_client_date
    ON renewal_calls (client_id, contract_end_date);

-- Verificación final
-- SELECT client_id, contract_end_date, COUNT(*) FROM renewal_calls GROUP BY client_id, contract_end_date HAVING COUNT(*) > 1;
-- Debería devolver 0 filas.
