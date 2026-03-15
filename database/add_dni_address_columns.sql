-- ============================================================================
-- AÑADIR COLUMNAS DE DNI Y DIRECCIÓN PARA CONTRATOS
-- ============================================================================

-- 1. Añadir a la tabla de ventas (sales)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS client_dni TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS client_address TEXT;

-- 2. Añadir a la tabla de clientes (clientes_pt_notion)
-- Usamos el prefijo property_ para mantener la convención de Notion
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_dni TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_direccion TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS onboarding_token TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN public.sales.client_dni IS 'DNI/NIE/Pasaporte del cliente para el contrato';
COMMENT ON COLUMN public.sales.client_address IS 'Dirección completa del cliente para el contrato';

COMMENT ON COLUMN public.clientes_pt_notion.property_dni IS 'DNI/NIE/Pasaporte del cliente (sincronizado desde ventas)';
COMMENT ON COLUMN public.clientes_pt_notion.property_direccion IS 'Dirección completa del cliente (sincronizado desde ventas)';
