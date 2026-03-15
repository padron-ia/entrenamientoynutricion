-- Tabla para configuración global de la aplicación
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT
);

-- Insertar configuración inicial para N8N webhook
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES 
    ('n8n_webhook_new_sale', NULL, 'URL del webhook de N8N para enviar email de onboarding cuando hay una nueva venta'),
    ('n8n_webhook_onboarding_completed', NULL, 'URL del webhook de N8N para generar contrato PDF cuando se completa el onboarding'),
    ('n8n_webhook_enabled', 'false', 'Activar/desactivar envío automático de webhooks de automatización')
ON CONFLICT (setting_key) DO NOTHING;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_settings_updated_at_trigger
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_updated_at();

COMMENT ON TABLE app_settings IS 'Configuración global de la aplicación';
COMMENT ON COLUMN app_settings.setting_key IS 'Clave única del ajuste';
COMMENT ON COLUMN app_settings.setting_value IS 'Valor del ajuste';
