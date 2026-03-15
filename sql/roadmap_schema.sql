-- Migration: Add Roadmap fields to clientes_pt_notion
-- Description: Adds fields for main goal, commitment score, and a JSONB field for milestones.

ALTER TABLE clientes_pt_notion 
ADD COLUMN IF NOT EXISTS roadmap_main_goal TEXT,
ADD COLUMN IF NOT EXISTS roadmap_commitment_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS roadmap_data JSONB DEFAULT '{"milestones": [], "last_updated": null}'::jsonb,
ADD COLUMN IF NOT EXISTS current_weight DECIMAL,
ADD COLUMN IF NOT EXISTS target_weight DECIMAL;

-- Comment for documentation
COMMENT ON COLUMN clientes_pt_notion.roadmap_main_goal IS 'El objetivo principal pactado con el cliente en la llamada inicial.';
COMMENT ON COLUMN clientes_pt_notion.roadmap_commitment_score IS 'Nivel de compromiso del cliente (1-10) definido con el coach.';
COMMENT ON COLUMN clientes_pt_notion.roadmap_data IS 'Estructura JSON que contiene los hitos (milestones) y su estado.';
COMMENT ON COLUMN clientes_pt_notion.current_weight IS 'Peso actual del cliente al momento de definir la hoja de ruta.';
COMMENT ON COLUMN clientes_pt_notion.target_weight IS 'Peso objetivo que el cliente desea alcanzar.';
