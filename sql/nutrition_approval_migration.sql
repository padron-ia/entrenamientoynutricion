-- =====================================================
-- Migration: Default Nutricional 1400 Flexible + Coach Approval + Manual Fortnights
-- Date: 2026-02-14
-- =====================================================

-- 1A. Columna `nutrition_approved` en `clientes_pt_notion`
ALTER TABLE clientes_pt_notion
ADD COLUMN IF NOT EXISTS nutrition_approved BOOLEAN DEFAULT FALSE;

ALTER TABLE clientes_pt_notion
ADD COLUMN IF NOT EXISTS nutrition_approved_at TIMESTAMPTZ;

ALTER TABLE clientes_pt_notion
ADD COLUMN IF NOT EXISTS nutrition_approved_by TEXT;

-- Backfill: clientes activos existentes que ya tienen nutrición → marcar como aprobados
UPDATE clientes_pt_notion
SET nutrition_approved = TRUE, nutrition_approved_at = NOW(), nutrition_approved_by = 'migration'
WHERE assigned_nutrition_type IS NOT NULL AND assigned_nutrition_type != ''
  AND assigned_calories IS NOT NULL AND assigned_calories > 0
  AND status = 'active';

-- 1B. Defaults para nuevos clientes
ALTER TABLE clientes_pt_notion ALTER COLUMN assigned_nutrition_type SET DEFAULT 'Flexible';
ALTER TABLE clientes_pt_notion ALTER COLUMN assigned_calories SET DEFAULT 1400;

-- 1C. Periodo activo en `app_settings`
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES
  ('nutrition_active_month', '2', 'Mes activo para asignación automática de nutrición (1-12)'),
  ('nutrition_active_fortnight', '2', 'Quincena activa para asignación automática (1 o 2)')
ON CONFLICT (setting_key) DO NOTHING;

-- 1D. Limpiar asignaciones manuales de clientes Flexible (1200, 1400, 1600)
-- para que usen el plan automático de la quincena activa (solo se ejecuta una vez)
DELETE FROM client_nutrition_assignments
WHERE client_id IN (
  SELECT id FROM clientes_pt_notion
  WHERE assigned_nutrition_type = 'Flexible'
    AND assigned_calories IN (1200, 1400, 1600)
);
