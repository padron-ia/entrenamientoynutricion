-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                              ║
-- ║   🚀 CRM COACHING PRO - SCRIPT DE INSTALACION COMPLETA                       ║
-- ║                                                                              ║
-- ║   Este script configura toda la base de datos desde cero.                    ║
-- ║   Ejecutar en: Supabase > SQL Editor > New Query > Pegar > Run               ║
-- ║                                                                              ║
-- ║   Tiempo estimado: 30 segundos                                               ║
-- ║   Version: 2.0 (Enero 2026)                                                  ║
-- ║                                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- SECCION 1: EXTENSIONES NECESARIAS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECCION 2: TABLA DE USUARIOS (STAFF)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'coach'
        CHECK (role IN ('admin', 'head_coach', 'coach', 'closer', 'setter', 'contabilidad', 'endocrino', 'psicologo', 'rrss', 'client')),
    avatar_url TEXT,
    phone TEXT,
    bank_account TEXT,
    commission_percentage NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ============================================================================
-- SECCION 3: TABLA DE CLIENTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clientes_pt_notion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Datos personales
    property_nombre TEXT,
    property_apellidos TEXT,
    property_correo_electr_nico TEXT,
    property_dni TEXT,
    property_tel_fono TEXT,
    property_direccion TEXT,
    property_poblaci_n TEXT,
    property_provincia TEXT,
    property_fecha_de_nacimiento DATE,
    property_sexo TEXT,

    -- Datos fisicos
    property_altura NUMERIC,
    property_peso_actual NUMERIC,
    property_peso_inicial NUMERIC,
    property_peso_objetivo NUMERIC,

    -- Estado y programa
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Pausado', 'Baja', 'Abandono', 'Pending')),
    property_estado_cliente TEXT,
    property_fecha_alta DATE,
    property_inicio_programa DATE,
    property_fecha_fin_contrato_actual DATE,
    property_fase TEXT,
    property_contratado_f1 TEXT,
    coach_id TEXT REFERENCES public.users(id),
    property_coach TEXT,

    -- Datos medicos (sensibles)
    property_insulina TEXT,
    property_dosis TEXT,
    property_ultima_glicosilada_hb_a1c TEXT,
    property_enfermedades TEXT,
    property_medicaci_n TEXT,
    property_patologias TEXT,
    allow_endocrine_access BOOLEAN DEFAULT false,

    -- Nutricion
    assigned_nutrition_type TEXT,
    assigned_calories NUMERIC,
    property_alergias_intolerancias TEXT,
    property_n_mero_comidas_al_d_a INTEGER,

    -- Renovaciones (F2-F5)
    property_renueva_f2 BOOLEAN DEFAULT false,
    renewal_f2_contracted TEXT,
    property_renueva_f3 BOOLEAN DEFAULT false,
    renewal_f3_contracted TEXT,
    property_renueva_f4 BOOLEAN DEFAULT false,
    property_renueva_f5 BOOLEAN DEFAULT false,
    renewal_payment_link TEXT,
    renewal_payment_status TEXT DEFAULT 'none',
    renewal_receipt_url TEXT,
    renewal_amount NUMERIC,
    renewal_duration INTEGER,

    -- Contrato digital
    contract_signed BOOLEAN DEFAULT false,
    contract_signed_at TIMESTAMP WITH TIME ZONE,
    contract_url TEXT,

    -- Onboarding
    onboarding_token TEXT UNIQUE,
    onboarding_completed BOOLEAN DEFAULT false,

    -- Bajas
    property_fecha_de_baja DATE,
    property_motivo_baja TEXT,
    property_fecha_abandono DATE,
    property_motivo_abandono TEXT,

    -- Consentimientos (RGPD)
    consent_data_processing BOOLEAN DEFAULT false,
    consent_image_rights BOOLEAN DEFAULT false,
    consent_timestamp TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes_pt_notion(property_correo_electr_nico);
CREATE INDEX IF NOT EXISTS idx_clientes_coach ON public.clientes_pt_notion(coach_id);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON public.clientes_pt_notion(status);
CREATE INDEX IF NOT EXISTS idx_clientes_token ON public.clientes_pt_notion(onboarding_token);

-- ============================================================================
-- SECCION 4: TABLA DE VENTAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Datos del cliente
    client_first_name TEXT NOT NULL,
    client_last_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    client_dni TEXT,
    client_address TEXT,

    -- Datos de la venta
    amount NUMERIC NOT NULL,
    contract_duration_months INTEGER NOT NULL,
    payment_method TEXT,
    payment_receipt_url TEXT,

    -- Asignaciones
    closer_id TEXT NOT NULL REFERENCES public.users(id),
    assigned_coach_id TEXT NOT NULL REFERENCES public.users(id),

    -- Notas
    admin_notes TEXT,
    coach_notes TEXT,

    -- Onboarding
    onboarding_token TEXT UNIQUE,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,

    -- Notificaciones
    coach_notification_seen BOOLEAN DEFAULT false,

    -- Referencias
    client_id UUID REFERENCES public.clientes_pt_notion(id),

    -- Estado
    status TEXT DEFAULT 'pending_onboarding'
        CHECK (status IN ('pending_onboarding', 'onboarding_in_progress', 'completed', 'cancelled')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_closer ON public.sales(closer_id);
CREATE INDEX IF NOT EXISTS idx_sales_coach ON public.sales(assigned_coach_id);
CREATE INDEX IF NOT EXISTS idx_sales_token ON public.sales(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_sales_email ON public.sales(client_email);

-- ============================================================================
-- SECCION 5: CONFIGURACION DE LA APLICACION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuracion inicial
INSERT INTO public.app_settings (key, value, description) VALUES
    -- Datos del negocio (PERSONALIZAR)
    ('business_name', 'Mi Negocio de Coaching', 'Nombre comercial'),
    ('business_legal_name', 'MI NEGOCIO SL', 'Razon social'),
    ('business_cif', 'B00000000', 'CIF/NIF'),
    ('business_email', 'contacto@minegocio.com', 'Email de contacto'),
    ('business_phone', '+34 600 000 000', 'Telefono'),
    ('business_address', 'Calle Principal 1, Ciudad', 'Direccion fiscal'),
    ('business_iban', 'ES00 0000 0000 0000 0000 0000', 'Cuenta bancaria'),

    -- Webhooks (opcional)
    ('webhook_new_sale', '', 'URL webhook nueva venta'),
    ('webhook_onboarding_complete', '', 'URL webhook onboarding completado'),
    ('webhooks_enabled', 'false', 'Activar webhooks'),

    -- Comisiones
    ('commission_closer', '10', 'Comision closer (%)'),
    ('commission_coach', '15', 'Comision coach (%)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SECCION 6: LINKS DE PAGO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    duration_months INTEGER,
    amount NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.payment_links (name, url, duration_months, amount, is_active) VALUES
    ('Pack 3 meses', 'https://tu-link-de-pago/3m', 3, 297, true),
    ('Pack 6 meses', 'https://tu-link-de-pago/6m', 6, 497, true),
    ('Pack 12 meses', 'https://tu-link-de-pago/12m', 12, 797, true),
    ('Transferencia Bancaria', 'MANUAL', NULL, NULL, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECCION 7: FACTURAS DE COACHES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coach_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id TEXT NOT NULL REFERENCES public.users(id),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    amount NUMERIC NOT NULL,
    invoice_url TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    rejection_reason TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_id, month, year)
);

-- ============================================================================
-- SECCION 8: SOPORTE / TICKETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clientes_pt_notion(id),
    created_by TEXT,
    subject TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('technical', 'nutrition', 'billing', 'general')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to TEXT REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    author_name TEXT,
    author_role TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECCION 9: NOTIFICACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- ============================================================================
-- SECCION 10: PLANTILLAS DE CONTRATO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contract_templates (
    id TEXT PRIMARY KEY DEFAULT 'default',
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.contract_templates (id, name, content) VALUES
('default', 'Contrato Estandar', '
# CONTRATO DE PRESTACION DE SERVICIOS

Entre {{business_legal_name}}, con CIF {{business_cif}}, en adelante "LA EMPRESA",
y {{client_name}}, con DNI {{client_dni}}, en adelante "EL CLIENTE".

## 1. OBJETO DEL CONTRATO
Prestacion de servicios de coaching/acompañamiento por un periodo de {{duration}} meses.

## 2. PRECIO
El precio total es de {{amount}} euros.

## 3. PROTECCION DE DATOS
Los datos seran tratados conforme al RGPD. El cliente consiente el tratamiento de datos de salud con fines de seguimiento.

## 4. EXENCION DE RESPONSABILIDAD
Este servicio es de acompañamiento educativo y NO sustituye el consejo medico profesional.

Firmado digitalmente el {{date}}.
')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECCION 11: TRIGGERS AUTOMATICOS
-- ============================================================================

-- Trigger para updated_at en todas las tablas
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas principales
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['users', 'clientes_pt_notion', 'sales', 'app_settings', 'coach_invoices', 'support_tickets']) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()', t, t);
    END LOOP;
END $$;

-- Trigger para sincronizar Auth -> Users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role, avatar_url)
    VALUES (
        new.id::text,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'client'),
        'https://ui-avatars.com/api/?name=' || COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SECCION 12: SEGURIDAD (RLS)
-- ============================================================================

-- Funciones auxiliares de roles
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
    SELECT role FROM public.users WHERE id = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
    SELECT public.get_auth_role() IN ('admin', 'head_coach', 'coach', 'closer', 'setter', 'contabilidad', 'endocrino', 'psicologo', 'rrss');
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT public.get_auth_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER;

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_pt_notion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Politicas de seguridad

-- USERS: Todos pueden leer (para login), solo admin modifica
DROP POLICY IF EXISTS "Users: public read" ON public.users;
CREATE POLICY "Users: public read" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users: admin manage" ON public.users;
CREATE POLICY "Users: admin manage" ON public.users FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users: self update" ON public.users;
CREATE POLICY "Users: self update" ON public.users FOR UPDATE USING (id = auth.uid()::text);

-- CLIENTES: Staff ve todo, cliente ve lo suyo
DROP POLICY IF EXISTS "Clientes: staff access" ON public.clientes_pt_notion;
CREATE POLICY "Clientes: staff access" ON public.clientes_pt_notion FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Clientes: self view" ON public.clientes_pt_notion;
CREATE POLICY "Clientes: self view" ON public.clientes_pt_notion FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Clientes: public insert onboarding" ON public.clientes_pt_notion;
CREATE POLICY "Clientes: public insert onboarding" ON public.clientes_pt_notion FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Clientes: public update onboarding" ON public.clientes_pt_notion;
CREATE POLICY "Clientes: public update onboarding" ON public.clientes_pt_notion FOR UPDATE USING (true);

-- SALES: Staff gestiona
DROP POLICY IF EXISTS "Sales: staff manage" ON public.sales;
CREATE POLICY "Sales: staff manage" ON public.sales FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Sales: public read by token" ON public.sales;
CREATE POLICY "Sales: public read by token" ON public.sales FOR SELECT USING (onboarding_token IS NOT NULL);

-- APP_SETTINGS: Todos leen, admin modifica
DROP POLICY IF EXISTS "Settings: public read" ON public.app_settings;
CREATE POLICY "Settings: public read" ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Settings: admin manage" ON public.app_settings;
CREATE POLICY "Settings: admin manage" ON public.app_settings FOR ALL USING (public.is_admin());

-- PAYMENT_LINKS: Todos leen
DROP POLICY IF EXISTS "PaymentLinks: public read" ON public.payment_links;
CREATE POLICY "PaymentLinks: public read" ON public.payment_links FOR SELECT USING (true);

-- COACH_INVOICES: Staff gestiona
DROP POLICY IF EXISTS "Invoices: staff manage" ON public.coach_invoices;
CREATE POLICY "Invoices: staff manage" ON public.coach_invoices FOR ALL USING (public.is_staff());

-- SUPPORT: Staff y cliente involucrado
DROP POLICY IF EXISTS "Tickets: staff access" ON public.support_tickets;
CREATE POLICY "Tickets: staff access" ON public.support_tickets FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Comments: staff access" ON public.ticket_comments;
CREATE POLICY "Comments: staff access" ON public.ticket_comments FOR ALL USING (public.is_staff());

-- NOTIFICATIONS: Usuario ve las suyas
DROP POLICY IF EXISTS "Notifications: own access" ON public.notifications;
CREATE POLICY "Notifications: own access" ON public.notifications FOR ALL USING (user_id = auth.uid()::text);

-- CONTRACT_TEMPLATES: Todos leen, admin modifica
DROP POLICY IF EXISTS "Templates: public read" ON public.contract_templates;
CREATE POLICY "Templates: public read" ON public.contract_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Templates: admin manage" ON public.contract_templates;
CREATE POLICY "Templates: admin manage" ON public.contract_templates FOR ALL USING (public.is_admin());

-- ============================================================================
-- SECCION 13: USUARIOS DE DEMOSTRACION
-- ============================================================================
-- NOTA: Estos usuarios son para pruebas. Eliminarlos en produccion.

INSERT INTO public.users (id, email, name, role, commission_percentage) VALUES
    ('admin-demo-001', 'admin@demo.com', 'Administrador Demo', 'admin', 0),
    ('coach-demo-001', 'coach@demo.com', 'Coach Demo', 'coach', 15),
    ('closer-demo-001', 'closer@demo.com', 'Closer Demo', 'closer', 10)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role;

-- ============================================================================
-- SECCION 14: STORAGE BUCKETS
-- ============================================================================
-- NOTA: Ejecutar estas lineas manualmente si fallan (requieren permisos especiales)

/*
INSERT INTO storage.buckets (id, name, public) VALUES
    ('documents', 'documents', false),
    ('receipts', 'receipts', false),
    ('contracts', 'contracts', false),
    ('invoices', 'invoices', false),
    ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================================================
-- ✅ INSTALACION COMPLETADA
-- ============================================================================
--
-- Siguiente paso: Crear usuarios en Authentication > Users
--
-- Para el admin:
-- 1. Ve a Authentication > Users > Add User
-- 2. Email: admin@demo.com (o tu email real)
-- 3. Password: tu contraseña segura
-- 4. El trigger sincronizara automaticamente con la tabla users
--
-- ============================================================================

SELECT '✅ CRM Coaching Pro instalado correctamente!' AS resultado;
