-- ==========================================
-- 🔐 RBAC Dinámico y Configuración de Slack
-- ==========================================

-- 1. Tabla de Registro de Permisos por Rol
CREATE TABLE IF NOT EXISTS public.role_permissions_registry (
    role TEXT NOT NULL,
    permission TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (role, permission)
);

-- 2. Tabla de Canales de Slack
CREATE TABLE IF NOT EXISTS public.slack_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.role_permissions_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_channels ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS (Solo Admin gestiona, todos autenticados leen permisos)
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions_registry;
CREATE POLICY "Admins can manage role permissions" 
ON public.role_permissions_registry FOR ALL 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read role permissions" ON public.role_permissions_registry;
CREATE POLICY "Authenticated users can read role permissions" 
ON public.role_permissions_registry FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Admins can manage slack channels" ON public.slack_channels;
CREATE POLICY "Admins can manage slack channels" 
ON public.slack_channels FOR ALL 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read slack channels" ON public.slack_channels;
CREATE POLICY "Authenticated users can read slack channels" 
ON public.slack_channels FOR SELECT 
TO authenticated 
USING (true);

-- 5. Semilla inicial de permisos (basado en hardcoded actual)
INSERT INTO public.role_permissions_registry (role, permission, enabled)
VALUES 
    -- Head Coach
    ('head_coach', 'access:clients', true),
    ('head_coach', 'access:renewals', true),
    ('head_coach', 'view:classes', true),
    ('head_coach', 'access:medical', true),
    ('head_coach', 'manage:team', true),
    ('head_coach', 'access:sales', true),
    ('head_coach', 'access:settings', true),
    ('head_coach', 'manage:assignments', true),
    -- Coach
    ('coach', 'view:classes', true),
    ('coach', 'access:medical', true),
    ('coach', 'access:renewals', true),
    -- Closer
    ('closer', 'access:sales', true),
    ('closer', 'access:clients', true),
    -- Setter
    ('setter', 'access:sales', true),
    -- Contabilidad
    ('contabilidad', 'access:accounting', true),
    -- Endocrino
    ('endocrino', 'access:medical', true),
    ('endocrino', 'manage:medical', true),
    ('endocrino', 'access:clients', true),
    -- Psicologo
    ('psicologo', 'access:medical', true),
    ('psicologo', 'access:clients', true),
    -- RRSS
    ('rrss', 'view:classes', true)
ON CONFLICT (role, permission) DO NOTHING;

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON public.role_permissions_registry
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_slack_channels_updated_at
    BEFORE UPDATE ON public.slack_channels
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
