-- =====================================================
-- ADD TELEGRAM GROUP ID FIELD TO CLIENTS
-- =====================================================
-- Este campo permite almacenar el ID del grupo de Telegram
-- del cliente para futuras automatizaciones (n8n, bots, etc.)

ALTER TABLE clientes_pt_notion
ADD COLUMN IF NOT EXISTS telegram_group_id TEXT;

-- Comentario descriptivo
COMMENT ON COLUMN clientes_pt_notion.telegram_group_id IS 'ID del grupo de seguimiento del cliente en Telegram para automatizaciones';

-- Índice para búsquedas rápidas por telegram_group_id
CREATE INDEX IF NOT EXISTS idx_clients_telegram_group_id ON clientes_pt_notion(telegram_group_id) WHERE telegram_group_id IS NOT NULL;
