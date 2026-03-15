-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                              ║
-- ║   PADRON TRAINER CRM — SCRIPT DE INSTALACION COMPLETA                        ║
-- ║                                                                              ║
-- ║   Ejecutar en: Supabase > SQL Editor > New Query > Pegar > Run               ║
-- ║   Orden: Ejecutar de arriba a abajo, una sola vez                             ║
-- ║   Version: 1.0 (Marzo 2026)                                                  ║
-- ║                                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝


-- ============================================================================
-- SECCION 1: EXTENSIONES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================================
-- SECCION 2: FUNCIÓN update_updated_at (no depende de ninguna tabla)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- SECCION 3: TABLA DE USUARIOS (STAFF)
-- Debe ir antes de las funciones que la referencian (get_auth_role, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'coach'
        CHECK (role IN (
            'admin', 'head_coach', 'coach',
            'closer', 'setter', 'contabilidad',
            'rrss', 'direccion', 'client', 'super_admin'
        )),
    avatar_url TEXT,
    photo_url TEXT,
    phone TEXT,
    bio TEXT,
    specialty TEXT,
    instagram TEXT,
    linkedin TEXT,
    calendar_url TEXT,
    birth_date DATE,
    address TEXT,

    -- Datos bancarios
    bank_account_holder TEXT,
    bank_account_iban TEXT,
    bank_name TEXT,
    bank_swift_bic TEXT,
    tax_id TEXT,
    billing_address TEXT,

    -- Compensación
    commission_percentage NUMERIC DEFAULT 0,
    price_per_client NUMERIC,
    max_clients INTEGER DEFAULT 50,
    tier INTEGER DEFAULT 1 CHECK (tier IN (1, 2, 3)),
    is_exclusive BOOLEAN DEFAULT false,

    -- Rendimiento
    internal_nps NUMERIC,
    task_compliance_rate NUMERIC,
    performance_notes TEXT,
    collegiate_number TEXT,

    -- Permisos granulares
    permissions TEXT[] DEFAULT '{}',

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);


-- ============================================================================
-- SECCION 3b: FUNCIONES DE SEGURIDAD (después de users, antes de las políticas)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
    SELECT role FROM public.users WHERE id = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
    SELECT public.get_auth_role() IN (
        'admin', 'head_coach', 'coach',
        'closer', 'setter', 'contabilidad',
        'rrss', 'direccion', 'super_admin'
    );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT public.get_auth_role() IN ('admin', 'super_admin');
$$ LANGUAGE sql SECURITY DEFINER;

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
        name  = EXCLUDED.name;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- SECCION 4: TABLA DE CLIENTES (ALUMNOS)
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
    instagram TEXT,
    telegram_id TEXT,
    telegram_group_id TEXT,

    -- Datos físicos
    property_altura NUMERIC,
    property_peso_actual NUMERIC,
    property_peso_inicial NUMERIC,
    property_peso_objetivo NUMERIC,
    abdominal_perimeter NUMERIC,
    arm_perimeter NUMERIC,
    thigh_perimeter NUMERIC,
    last_weight_date DATE,

    -- Estado y programa
    status TEXT DEFAULT 'Active'
        CHECK (status IN ('Active', 'Pausado', 'Baja', 'Abandono', 'Pending', 'Completed')),
    property_estado_cliente TEXT,
    property_fecha_alta DATE,
    property_inicio_programa DATE,
    property_fecha_fin_contrato_actual DATE,
    property_fase TEXT,
    property_contratado_f1 TEXT,
    coach_id TEXT REFERENCES public.users(id),
    property_coach TEXT,

    -- Datos de salud fitness (sin campos clínicos/endocrinos)
    property_enfermedades TEXT,    -- lesiones o condiciones relevantes para entrenamiento
    property_medicaci_n TEXT,      -- medicamentos o suplementos actuales
    property_patologias TEXT,      -- otras condiciones relevantes

    -- Nutrición
    assigned_nutrition_type TEXT,
    assigned_calories NUMERIC,
    nutrition_plan_id UUID,
    nutrition_approved BOOLEAN DEFAULT false,
    nutrition_approved_at TIMESTAMP WITH TIME ZONE,
    nutrition_approved_by TEXT,
    property_alergias_intolerancias TEXT,
    property_n_mero_comidas_al_d_a INTEGER,

    -- Entrenamiento
    property_reporte_sensaciones_entreno TEXT,

    -- Check-ins
    last_checkin_submitted TIMESTAMP WITH TIME ZONE,
    last_checkin_status TEXT,
    last_checkin_id UUID,
    last_checkin_reviewed_at TIMESTAMP WITH TIME ZONE,
    missed_checkins_count INTEGER DEFAULT 0,
    last_checkin_missed_reason TEXT,

    -- Revisión semanal del coach
    weekly_review_url TEXT,
    weekly_review_date DATE,
    weekly_review_comments TEXT,

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
    renewal_payment_method TEXT,
    renewal_phase TEXT,
    renewal_verified_at TIMESTAMP WITH TIME ZONE,

    -- Contrato digital
    contract_signed BOOLEAN DEFAULT false,
    contract_signed_at TIMESTAMP WITH TIME ZONE,
    contract_url TEXT,
    contract_date DATE,
    contract_amount NUMERIC,
    assigned_contract_template_id TEXT,
    contract_content_override TEXT,
    contract_visible_to_client BOOLEAN DEFAULT false,

    -- Onboarding
    onboarding_token TEXT UNIQUE,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    onboarding_phase2_completed BOOLEAN DEFAULT false,
    onboarding_phase2_completed_at TIMESTAMP WITH TIME ZONE,
    first_opened_by_assigned_coach_at TIMESTAMP WITH TIME ZONE,

    -- Roadmap / Objetivos
    roadmap_main_goal TEXT,
    roadmap_commitment_score INTEGER DEFAULT 0,
    roadmap_data JSONB DEFAULT '{"milestones": [], "last_updated": null}'::jsonb,

    -- Anamnesis (datos del formulario de bienvenida)
    anamnesis_data JSONB DEFAULT '{}'::jsonb,

    -- Seguimiento CRM
    last_contact_date DATE,
    recontact_result TEXT,
    recontact_notes TEXT,
    general_notes TEXT,
    coach_message TEXT,
    history TEXT,

    -- Próxima cita
    next_appointment_date DATE,
    next_appointment_time TEXT,
    next_appointment_note TEXT,
    next_appointment_link TEXT,
    next_appointment_status TEXT,
    next_appointment_conclusions TEXT,

    -- Alertas
    call_warning TEXT,
    next_call_date DATE,

    -- Bajas
    property_fecha_de_baja DATE,
    property_motivo_baja TEXT,
    property_fecha_abandono DATE,
    property_motivo_abandono TEXT,

    -- Consentimientos (RGPD)
    consent_data_processing BOOLEAN DEFAULT false,
    consent_image_rights BOOLEAN DEFAULT false,
    consent_timestamp TIMESTAMP WITH TIME ZONE,

    -- Activación de cuenta portal
    activation_token TEXT,
    activation_token_created_at TIMESTAMP WITH TIME ZONE,

    -- Datos de evaluación
    property_assessment_responses JSONB DEFAULT '{}'::jsonb,

    -- Otros flags
    high_ticket BOOLEAN DEFAULT false,
    harbiz_profile TEXT,
    ltv NUMERIC,
    unikey TEXT,

    -- Fases de contrato (fechas y datos adicionales)
    property_fin_fase_1 DATE,
    property_fin_contrato_f2 DATE,
    property_fin_contrato_f3 DATE,
    property_fin_contrato_f4 DATE,
    property_fin_contrato_f5 DATE,
    program_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes_pt_notion(property_correo_electr_nico);
CREATE INDEX IF NOT EXISTS idx_clientes_coach ON public.clientes_pt_notion(coach_id);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON public.clientes_pt_notion(status);
CREATE INDEX IF NOT EXISTS idx_clientes_token ON public.clientes_pt_notion(onboarding_token);


-- ============================================================================
-- SECCION 4: ANAMNESIS (HISTORIAL FITNESS DEL ALUMNO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anamnesis_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clientes_pt_notion(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Alergias y hábitos
    alergias_medicamentos TEXT,
    alergias_alimentos TEXT,
    habito_tabaco TEXT,
    consumo_alcohol TEXT,
    consumo_ultraprocesados TEXT,
    horas_sueno TEXT,
    nivel_estres INTEGER,
    desencadenante_estres TEXT,

    -- Lesiones y cirugías (relevantes para entrenamiento)
    enfermedades_previas TEXT,
    cirugias_previas TEXT,

    -- Medicación y suplementos actuales
    tratamiento_actual_completo TEXT,

    -- Comportamiento y digestión
    comer_emocional TEXT,
    episodios_atracon TEXT,
    tca_detalle TEXT,
    calidad_sueno TEXT,
    sueno_afecta_apetito BOOLEAN,
    problemas_digestivos TEXT,
    analitica_urls TEXT[],

    -- Historial fitness (específico Padron Trainer)
    historial_deportivo TEXT,
    frecuencia_entrenamiento_previa TEXT,
    tipo_entrenamiento_previo TEXT,
    lesiones_cronicas TEXT
);

CREATE INDEX IF NOT EXISTS idx_anamnesis_client ON public.anamnesis_data(client_id);


-- ============================================================================
-- SECCION 5: VENTAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Datos del alumno
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

    -- Referencias
    client_id UUID REFERENCES public.clientes_pt_notion(id),
    coach_notification_seen BOOLEAN DEFAULT false,

    -- Estado
    status TEXT DEFAULT 'pending_onboarding'
        CHECK (status IN ('pending_onboarding', 'onboarding_in_progress', 'completed', 'cancelled')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_closer ON public.sales(closer_id);
CREATE INDEX IF NOT EXISTS idx_sales_coach ON public.sales(assigned_coach_id);
CREATE INDEX IF NOT EXISTS idx_sales_token ON public.sales(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_sales_email ON public.sales(client_email);


-- ============================================================================
-- SECCION 6: CHECK-INS SEMANALES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.weekly_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    rating INTEGER,
    status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'reviewed')),
    coach_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_checkins_client ON public.weekly_checkins(client_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created ON public.weekly_checkins(created_at);

ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Checkins: authenticated read" ON public.weekly_checkins;
CREATE POLICY "Checkins: authenticated read" ON public.weekly_checkins FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Checkins: authenticated insert" ON public.weekly_checkins;
CREATE POLICY "Checkins: authenticated insert" ON public.weekly_checkins FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Checkins: authenticated update" ON public.weekly_checkins;
CREATE POLICY "Checkins: authenticated update" ON public.weekly_checkins FOR UPDATE TO authenticated USING (true);


-- ============================================================================
-- SECCION 7: REVISIONES DE COACH (SESIONES SEMANALES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coaching_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    coach_id TEXT,
    coach_name TEXT,
    date DATE NOT NULL,
    type TEXT NOT NULL DEFAULT 'weekly_review',
    duration_minutes INTEGER,
    recording_url TEXT,
    coach_comments TEXT,
    summary TEXT,
    highlights TEXT,
    action_items JSONB DEFAULT '[]'::jsonb,
    client_feedback INTEGER CHECK (client_feedback BETWEEN 1 AND 5),
    client_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_client ON public.coaching_sessions(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_coach ON public.coaching_sessions(coach_id, date DESC);

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sessions: authenticated access" ON public.coaching_sessions;
CREATE POLICY "Sessions: authenticated access" ON public.coaching_sessions FOR ALL TO authenticated USING (true);


-- ============================================================================
-- SECCION 8: CLASES Y WEBINARS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.weekly_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    speaker TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    url TEXT,
    category TEXT CHECK (category IN ('Entrenamiento', 'Nutrición', 'Mindset', 'General')),
    is_recorded BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.weekly_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Classes: authenticated read" ON public.weekly_classes;
CREATE POLICY "Classes: authenticated read" ON public.weekly_classes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Classes: staff manage" ON public.weekly_classes;
CREATE POLICY "Classes: staff manage" ON public.weekly_classes FOR ALL TO authenticated USING (true);


-- ============================================================================
-- SECCION 9: PLANES NUTRICIONALES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.nutrition_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    target_calories INTEGER,
    diet_type TEXT,
    target_month INTEGER,
    target_fortnight INTEGER,
    instructions TEXT,
    intro_content TEXT,
    breakfast_content TEXT,
    lunch_content TEXT,
    dinner_content TEXT,
    snack_content TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    published_at TIMESTAMP WITH TIME ZONE,
    published_by TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.nutrition_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snack')),
    position INTEGER DEFAULT 0,
    name TEXT NOT NULL,
    ingredients JSONB DEFAULT '[]'::jsonb,
    preparation TEXT,
    calories INTEGER,
    protein DECIMAL(5,1),
    carbs DECIMAL(5,1),
    fat DECIMAL(5,1),
    fiber DECIMAL(5,1),
    image_url TEXT,
    is_sos BOOLEAN DEFAULT false,
    prep_time_minutes INTEGER,
    leftover_tip TEXT,
    notes TEXT,
    is_draft BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_nutrition_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL,
    plan_id UUID REFERENCES public.nutrition_plans(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by TEXT,
    UNIQUE(client_id)
);

CREATE TABLE IF NOT EXISTS public.client_nutrition_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL,
    recipe_id UUID REFERENCES public.nutrition_recipes(id) ON DELETE CASCADE,
    custom_name TEXT,
    custom_ingredients JSONB,
    custom_preparation TEXT,
    custom_calories INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS public.client_favorite_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL,
    recipe_id UUID REFERENCES public.nutrition_recipes(id) ON DELETE CASCADE,
    plan_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS public.nutrition_plan_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
    version_number INTEGER,
    snapshot JSONB,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_plan ON public.nutrition_recipes(plan_id, category);
CREATE INDEX IF NOT EXISTS idx_assignments_client ON public.client_nutrition_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_overrides_client ON public.client_nutrition_overrides(client_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON public.nutrition_plans(status);

ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_nutrition_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_nutrition_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_favorite_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plan_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "NutritionPlans: all access" ON public.nutrition_plans;
CREATE POLICY "NutritionPlans: all access" ON public.nutrition_plans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Recipes: all access" ON public.nutrition_recipes;
CREATE POLICY "Recipes: all access" ON public.nutrition_recipes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Assignments: all access" ON public.client_nutrition_assignments;
CREATE POLICY "Assignments: all access" ON public.client_nutrition_assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Overrides: all access" ON public.client_nutrition_overrides;
CREATE POLICY "Overrides: all access" ON public.client_nutrition_overrides FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Favorites: all access" ON public.client_favorite_recipes;
CREATE POLICY "Favorites: all access" ON public.client_favorite_recipes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "PlanVersions: read" ON public.nutrition_plan_versions;
CREATE POLICY "PlanVersions: read" ON public.nutrition_plan_versions FOR SELECT USING (true);


-- ============================================================================
-- SECCION 10: LEADS (PIPELINE DE VENTAS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "firstName" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    instagram_user TEXT,
    status TEXT NOT NULL DEFAULT 'NEW'
        CHECK (status IN ('NEW', 'CONTACTED', 'SCHEDULED', 'WON', 'LOST', 'NO_SHOW', 'CANCELLED', 'RE-SCHEDULED', 'NO_ENTRY')),
    source TEXT DEFAULT 'Manual',
    notes TEXT,
    assigned_to TEXT REFERENCES public.users(id),
    closer_id TEXT REFERENCES public.users(id),
    last_contact_date TIMESTAMP WITH TIME ZONE,
    next_followup_date TIMESTAMP WITH TIME ZONE,
    in_out TEXT CHECK (in_out IN ('Inbound', 'Outbound')),
    procedencia TEXT,
    procedencia_detalle TEXT,
    qualification_level INTEGER,
    attended BOOLEAN,
    objections TEXT,
    recording_url TEXT,
    sale_price NUMERIC,
    commission_amount NUMERIC,
    meeting_link TEXT,
    meeting_date DATE,
    call_date DATE,
    meeting_time TEXT,
    closer_notes TEXT,
    project TEXT DEFAULT 'PT'
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created ON public.leads(created_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leads: staff access" ON public.leads;
CREATE POLICY "Leads: staff access" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================================
-- SECCION 11: CONFIGURACION DE LA APLICACION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.app_settings (key, value, description) VALUES
    ('business_name',         'Padron Trainer',               'Nombre comercial'),
    ('business_legal_name',   'PADRON TRAINER SL',            'Razón social'),
    ('business_cif',          'B00000000',                    'CIF/NIF (actualizar)'),
    ('business_email',        'padrontrainer@gmail.com',      'Email de contacto'),
    ('business_phone',        '+34 600 000 000',              'Teléfono (actualizar)'),
    ('business_address',      'Dirección Fiscal (actualizar)','Dirección fiscal'),
    ('business_iban',         'ES00 0000 0000 0000 0000 0000','Cuenta bancaria (actualizar)'),
    ('webhook_new_sale',      '',                             'URL webhook nueva venta'),
    ('webhook_onboarding_complete', '',                       'URL webhook onboarding completado'),
    ('webhooks_enabled',      'false',                        'Activar webhooks'),
    ('commission_closer',     '10',                           'Comisión closer (%)'),
    ('commission_coach',      '15',                           'Comisión coach (%)')
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- SECCION 12: LINKS DE PAGO
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
    ('Pack 3 meses',          'https://tu-link-de-pago/3m',  3,    297, true),
    ('Pack 6 meses',          'https://tu-link-de-pago/6m',  6,    497, true),
    ('Pack 12 meses',         'https://tu-link-de-pago/12m', 12,   797, true),
    ('Transferencia Bancaria', 'MANUAL',                     NULL, NULL, true)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- SECCION 13: FACTURAS DE COACHES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coach_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id TEXT NOT NULL REFERENCES public.users(id),
    period_date DATE,
    month INTEGER,
    year INTEGER,
    amount NUMERIC NOT NULL,
    invoice_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    admin_notes TEXT,
    coach_notes TEXT,
    rejection_reason TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ============================================================================
-- SECCION 14: PAUSAS DE CONTRATO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contract_pauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clientes_pt_notion(id) ON DELETE CASCADE,
    pause_date DATE NOT NULL,
    resume_date DATE,
    reason TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pauses_client ON public.contract_pauses(client_id);

ALTER TABLE public.contract_pauses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pauses: staff access" ON public.contract_pauses;
CREATE POLICY "Pauses: staff access" ON public.contract_pauses FOR ALL TO authenticated USING (true);


-- ============================================================================
-- SECCION 15: SOPORTE / TICKETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clientes_pt_notion(id),
    staff_id TEXT,
    created_by TEXT,
    subject TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'otros'
        CHECK (category IN ('nutricion', 'entrenamiento', 'tecnico_app', 'facturacion', 'otros')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to TEXT REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    author_name TEXT,
    author_role TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tickets: staff access" ON public.support_tickets;
CREATE POLICY "Tickets: staff access" ON public.support_tickets FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Comments: staff access" ON public.ticket_comments;
CREATE POLICY "Comments: staff access" ON public.ticket_comments FOR ALL TO authenticated USING (true);


-- ============================================================================
-- SECCION 16: NOTIFICACIONES
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

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notifications: own access" ON public.notifications;
CREATE POLICY "Notifications: own access" ON public.notifications FOR ALL USING (user_id = auth.uid()::text);


-- ============================================================================
-- SECCION 17: PLANTILLA DE CONTRATO
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
('default', 'Contrato Padron Trainer', '
# CONTRATO DE PRESTACIÓN DE SERVICIOS — PADRON TRAINER

Entre Padron Trainer, en adelante "LA EMPRESA",
y {{client_name}}, con DNI {{client_dni}}, en adelante "EL ALUMNO/A".

## 1. OBJETO DEL CONTRATO
Prestación de servicios de coaching de entrenamiento y composición corporal por un periodo de {{duration}} meses.

## 2. PRECIO
El precio total es de {{amount}} euros.

## 3. DESCRIPCIÓN DEL SERVICIO
El servicio incluye:
- Plan de entrenamiento personalizado
- Plan nutricional adaptado
- Check-ins semanales
- Revisiones de progreso con coach asignado
- Acceso a la plataforma y biblioteca de recursos

## 4. PROTECCIÓN DE DATOS
Los datos serán tratados conforme al RGPD vigente.

## 5. EXENCIÓN DE RESPONSABILIDAD
Este servicio es de acompañamiento en entrenamiento y nutrición. No sustituye el consejo médico profesional.

Firmado digitalmente el {{date}}.
')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Templates: public read" ON public.contract_templates;
CREATE POLICY "Templates: public read" ON public.contract_templates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Templates: admin manage" ON public.contract_templates;
CREATE POLICY "Templates: admin manage" ON public.contract_templates FOR ALL USING (public.is_admin());


-- ============================================================================
-- SECCION 18: MATERIALES Y BIBLIOTECA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.materials_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('link', 'document', 'video')),
    url TEXT NOT NULL,
    category TEXT,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clientes_pt_notion(id) ON DELETE CASCADE,
    created_by TEXT,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('link', 'document', 'video')),
    url TEXT NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.materials_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Materials: authenticated read" ON public.materials_library;
CREATE POLICY "Materials: authenticated read" ON public.materials_library FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ClientMaterials: authenticated access" ON public.client_materials;
CREATE POLICY "ClientMaterials: authenticated access" ON public.client_materials FOR ALL TO authenticated USING (true);


-- ============================================================================
-- SECCION 19: PERMISOS GRANULARES (ROLES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    permission TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role, permission)
);

ALTER TABLE public.role_permissions_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissions: public read" ON public.role_permissions_registry;
CREATE POLICY "Permissions: public read" ON public.role_permissions_registry FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permissions: admin manage" ON public.role_permissions_registry;
CREATE POLICY "Permissions: admin manage" ON public.role_permissions_registry FOR ALL USING (public.is_admin());


-- ============================================================================
-- SECCION 20: INVITACIONES DE EQUIPO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    invited_by TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Invitations: public read by token" ON public.team_invitations;
CREATE POLICY "Invitations: public read by token" ON public.team_invitations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Invitations: admin manage" ON public.team_invitations;
CREATE POLICY "Invitations: admin manage" ON public.team_invitations FOR ALL USING (public.is_admin());


-- ============================================================================
-- SECCION 21: TRIGGERS AUTOMÁTICOS (updated_at en todas las tablas)
-- ============================================================================

DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'users', 'clientes_pt_notion', 'sales', 'app_settings',
        'coach_invoices', 'support_tickets', 'weekly_checkins',
        'coaching_sessions', 'nutrition_plans', 'nutrition_recipes',
        'leads', 'anamnesis_data', 'materials_library', 'client_materials'
    ]) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()', t, t);
    END LOOP;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- SECCION 22: RLS EN TABLAS PRINCIPALES
-- (las funciones is_admin / is_staff están definidas en Sección 2)
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_pt_notion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_invoices ENABLE ROW LEVEL SECURITY;

-- USERS
DROP POLICY IF EXISTS "Users: public read" ON public.users;
CREATE POLICY "Users: public read" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users: admin manage" ON public.users;
CREATE POLICY "Users: admin manage" ON public.users FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users: self update" ON public.users;
CREATE POLICY "Users: self update" ON public.users FOR UPDATE USING (id = auth.uid()::text);

-- CLIENTES
DROP POLICY IF EXISTS "Clientes: staff access" ON public.clientes_pt_notion;
CREATE POLICY "Clientes: staff access" ON public.clientes_pt_notion FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Clientes: self view" ON public.clientes_pt_notion;
CREATE POLICY "Clientes: self view" ON public.clientes_pt_notion FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Clientes: public insert onboarding" ON public.clientes_pt_notion;
CREATE POLICY "Clientes: public insert onboarding" ON public.clientes_pt_notion FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Clientes: public update onboarding" ON public.clientes_pt_notion;
CREATE POLICY "Clientes: public update onboarding" ON public.clientes_pt_notion FOR UPDATE USING (true);

-- SALES
DROP POLICY IF EXISTS "Sales: staff manage" ON public.sales;
CREATE POLICY "Sales: staff manage" ON public.sales FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Sales: public read by token" ON public.sales;
CREATE POLICY "Sales: public read by token" ON public.sales FOR SELECT USING (onboarding_token IS NOT NULL);

-- APP SETTINGS
DROP POLICY IF EXISTS "Settings: public read" ON public.app_settings;
CREATE POLICY "Settings: public read" ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Settings: admin manage" ON public.app_settings;
CREATE POLICY "Settings: admin manage" ON public.app_settings FOR ALL USING (public.is_admin());

-- PAYMENT LINKS
DROP POLICY IF EXISTS "PaymentLinks: public read" ON public.payment_links;
CREATE POLICY "PaymentLinks: public read" ON public.payment_links FOR SELECT USING (true);

-- INVOICES
DROP POLICY IF EXISTS "Invoices: staff manage" ON public.coach_invoices;
CREATE POLICY "Invoices: staff manage" ON public.coach_invoices FOR ALL USING (public.is_staff());


-- ============================================================================
-- SECCION 24: PERMISOS DE ACCESO PARA ANON Y AUTHENTICATED
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;


-- ============================================================================
-- SECCION 25: USUARIO ADMINISTRADOR INICIAL
-- ============================================================================
-- IMPORTANTE: Después de ejecutar este script, crea el usuario en
-- Supabase > Authentication > Users > Add User:
--   Email:    padrontrainer@gmail.com
--   Password: (elige una contraseña segura)
--
-- Luego actualiza el rol a admin con esta query:
--   UPDATE public.users SET role = 'admin', name = 'Padron Trainer Admin'
--   WHERE email = 'padrontrainer@gmail.com';


-- ============================================================================
-- ✅ INSTALACIÓN COMPLETADA
-- ============================================================================

SELECT '✅ Padron Trainer CRM instalado correctamente!' AS resultado;
