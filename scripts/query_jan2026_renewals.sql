-- Query para encontrar TODAS las renovaciones de Enero 2026 para Jesús
-- Verificando cada fase por separado

SELECT 
    property_nombre,
    property_apellidos,
    property_coach,
    property_estado_cliente,
    -- F1
    property_fin_fase_1 as f1_end,
    property_renueva_f2 as f2_contracted,
    -- F2
    property_fin_contrato_f2 as f2_end,
    property_renueva_f3 as f3_contracted,
    -- F3
    property_fin_contrato_f3 as f3_end,
    property_renueva_f4 as f4_contracted,
    -- F4
    property_fin_contrato_f4 as f4_end,
    property_renueva_f5 as f5_contracted,
    -- F5
    property_fin_contrato_f5 as f5_end
FROM clientes_pt_notion
WHERE 
    property_coach ILIKE '%jesus%'
    AND property_estado_cliente ILIKE '%activo%'
    AND (
        -- Cualquier fase que termine en Enero 2026
        (property_fin_fase_1 >= '2026-01-01' AND property_fin_fase_1 <= '2026-01-31')
        OR (property_fin_contrato_f2 >= '2026-01-01' AND property_fin_contrato_f2 <= '2026-01-31')
        OR (property_fin_contrato_f3 >= '2026-01-01' AND property_fin_contrato_f3 <= '2026-01-31')
        OR (property_fin_contrato_f4 >= '2026-01-01' AND property_fin_contrato_f4 <= '2026-01-31')
        OR (property_fin_contrato_f5 >= '2026-01-01' AND property_fin_contrato_f5 <= '2026-01-31')
    )
ORDER BY property_nombre;
