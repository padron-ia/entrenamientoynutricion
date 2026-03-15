-- ============================================================================
-- AMPLIACIÓN DE TABLA CLIENTES PARA GESTIÓN DE CONTRATOS DIGITALES
-- ============================================================================

ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN DEFAULT false;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS contract_url TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS contract_signature_image TEXT; -- Base64 or URL

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_clientes_contract_signed ON public.clientes_pt_notion(contract_signed);

-- Comentarios
COMMENT ON COLUMN public.clientes_pt_notion.contract_signed IS 'Si el cliente ha firmado digitalmente el contrato durante el onboarding';
COMMENT ON COLUMN public.clientes_pt_notion.contract_url IS 'URL del PDF del contrato generado en Supabase Storage';
COMMENT ON COLUMN public.clientes_pt_notion.contract_signature_image IS 'Imagen de la firma digital (JSON o Base64/URL)';
