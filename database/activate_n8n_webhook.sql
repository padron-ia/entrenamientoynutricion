-- Configurar webhook de N8N para envío automático de emails de onboarding
-- Ejecuta esto en Supabase después de crear la tabla app_settings

-- 1. Configurar la URL del webhook de N8N
UPDATE app_settings 
SET setting_value = 'https://academia-diabetes-online-n8n.k5pdeb.easypanel.host/webhook/nueva_alta_ado'
WHERE setting_key = 'n8n_webhook_new_sale';

-- 2. Activar el envío automático
UPDATE app_settings 
SET setting_value = 'true'
WHERE setting_key = 'n8n_webhook_enabled';

-- 3. Verificar que se ha configurado correctamente
SELECT setting_key, setting_value, description 
FROM app_settings 
WHERE setting_key IN ('n8n_webhook_new_sale', 'n8n_webhook_enabled');
