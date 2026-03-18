-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                              ║
-- ║   MODULO PRESENCIAL - "La Muralla Fit Boutique"                              ║
-- ║                                                                              ║
-- ║   Autocontenido: crea funciones auxiliares, tablas, RLS, indices y seed data. ║
-- ║   Usa la tabla 'profiles' existente para roles y auth.                       ║
-- ║                                                                              ║
-- ║   Fecha: Marzo 2026                                                          ║
-- ║                                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- PREREQUISITO 1: Funcion trigger para updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PREREQUISITO 2: Funciones de seguridad (basadas en tabla profiles)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_auth_role() IN ('admin', 'head_coach', 'coach', 'closer', 'setter', 'contabilidad', 'endocrino', 'psicologo', 'rrss', 'direccion');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_auth_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PREREQUISITO 3: Tabla de notificaciones (si no existe)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'system',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users view own notifications') THEN
        CREATE POLICY "Users view own notifications"
            ON public.notifications FOR SELECT
            USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users update own notifications') THEN
        CREATE POLICY "Users update own notifications"
            ON public.notifications FOR UPDATE
            USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'System can insert notifications') THEN
        CREATE POLICY "System can insert notifications"
            ON public.notifications FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- TABLA 1: gym_service_types
-- Tipos de servicio: Grupo Reducido, Entrenamiento Personal, Osteopatia, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gym_service_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT 'dumbbell',
    is_bookable_by_client BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gym_service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view service types"
    ON public.gym_service_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage service types"
    ON public.gym_service_types FOR ALL
    USING (public.is_staff());

CREATE TRIGGER trg_gym_service_types_updated
    BEFORE UPDATE ON public.gym_service_types
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLA 2: gym_bonos
-- Packs de creditos: 2, 4, 9, 13 sesiones con precio y links de pago
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gym_bonos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sessions_count INTEGER NOT NULL CHECK (sessions_count > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    currency TEXT DEFAULT 'EUR',

    -- Links de pasarela de pago
    stripe_payment_link TEXT,
    stripe_price_id TEXT,
    paypal_payment_link TEXT,
    paypal_plan_id TEXT,

    -- Servicios compatibles (para que tipos de clase sirve este bono)
    compatible_service_type_ids UUID[] DEFAULT '{}',

    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gym_bonos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view bonos"
    ON public.gym_bonos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage bonos"
    ON public.gym_bonos FOR ALL USING (public.is_staff());

CREATE TRIGGER trg_gym_bonos_updated
    BEFORE UPDATE ON public.gym_bonos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLA 3: gym_members
-- Miembros presenciales del centro. Vinculado a profiles por user_id (UUID).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gym_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    client_id UUID,  -- Referencia opcional a clientes online (sin FK por ahora)

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    dni TEXT,

    member_type TEXT NOT NULL DEFAULT 'presencial_grupo'
        CHECK (member_type IN ('presencial_grupo', 'presencial_personal', 'presencial_nutricion', 'online', 'mixto')),

    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'paused')),

    photo_url TEXT,
    birth_date DATE,
    emergency_contact TEXT,
    emergency_phone TEXT,
    medical_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_members_user_id ON public.gym_members(user_id);
CREATE INDEX idx_gym_members_email ON public.gym_members(email);
CREATE INDEX idx_gym_members_status ON public.gym_members(status);

ALTER TABLE public.gym_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own profile"
    ON public.gym_members FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Members can update own profile"
    ON public.gym_members FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Staff can manage all members"
    ON public.gym_members FOR ALL USING (public.is_staff());

CREATE TRIGGER trg_gym_members_updated
    BEFORE UPDATE ON public.gym_members
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLA 4: gym_member_credits
-- Saldo de creditos por miembro. Cada fila = un bono comprado.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gym_member_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES public.gym_members(id) ON DELETE CASCADE,
    bono_id UUID NOT NULL REFERENCES public.gym_bonos(id),

    total_sessions INTEGER NOT NULL,
    used_sessions INTEGER DEFAULT 0,
    remaining_sessions INTEGER GENERATED ALWAYS AS (total_sessions - used_sessions) STORED,

    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,

    payment_provider TEXT CHECK (payment_provider IN ('stripe', 'paypal', 'manual', 'cash')),
    payment_reference TEXT,
    payment_status TEXT DEFAULT 'completed'
        CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    amount_paid DECIMAL(10, 2),

    is_expired BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_credits_member ON public.gym_member_credits(member_id);
CREATE INDEX idx_gym_credits_valid ON public.gym_member_credits(valid_until, is_expired);

ALTER TABLE public.gym_member_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own credits"
    ON public.gym_member_credits FOR SELECT
    USING (
        member_id IN (SELECT id FROM public.gym_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Staff manages all credits"
    ON public.gym_member_credits FOR ALL USING (public.is_staff());

CREATE TRIGGER trg_gym_credits_updated
    BEFORE UPDATE ON public.gym_member_credits
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLA 5: gym_class_slots
-- Horarios de clases. Cada fila = una clase en una fecha y hora especifica.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gym_class_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_type_id UUID NOT NULL REFERENCES public.gym_service_types(id),

    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    title TEXT,
    coach_id UUID REFERENCES public.profiles(id),
    capacity INTEGER NOT NULL DEFAULT 8,

    is_cancelled BOOLEAN DEFAULT false,
    cancellation_reason TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_slots_date ON public.gym_class_slots(date);
CREATE INDEX idx_gym_slots_service ON public.gym_class_slots(service_type_id);
CREATE INDEX idx_gym_slots_coach ON public.gym_class_slots(coach_id);

ALTER TABLE public.gym_class_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view class slots"
    ON public.gym_class_slots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff manages class slots"
    ON public.gym_class_slots FOR ALL USING (public.is_staff());

CREATE TRIGGER trg_gym_slots_updated
    BEFORE UPDATE ON public.gym_class_slots
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLA 6: gym_reservations
-- Reservas de clientes en clases.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gym_reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES public.gym_members(id) ON DELETE CASCADE,
    class_slot_id UUID NOT NULL REFERENCES public.gym_class_slots(id) ON DELETE CASCADE,
    credit_id UUID REFERENCES public.gym_member_credits(id),

    status TEXT NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'cancelled', 'attended', 'no_show', 'waitlisted')),

    cancelled_at TIMESTAMPTZ,
    cancellation_type TEXT CHECK (cancellation_type IN ('client', 'admin', 'system')),
    credit_returned BOOLEAN DEFAULT false,

    waitlist_position INTEGER DEFAULT 0,
    auto_booked_at TIMESTAMPTZ,

    booked_by TEXT DEFAULT 'self',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (member_id, class_slot_id)
);

CREATE INDEX idx_gym_reservations_member ON public.gym_reservations(member_id);
CREATE INDEX idx_gym_reservations_slot ON public.gym_reservations(class_slot_id);
CREATE INDEX idx_gym_reservations_status ON public.gym_reservations(status);
CREATE INDEX idx_gym_reservations_waitlist ON public.gym_reservations(class_slot_id, status, waitlist_position)
    WHERE status = 'waitlisted';

ALTER TABLE public.gym_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own reservations"
    ON public.gym_reservations FOR SELECT
    USING (
        member_id IN (SELECT id FROM public.gym_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Members can insert own reservations"
    ON public.gym_reservations FOR INSERT
    WITH CHECK (
        member_id IN (SELECT id FROM public.gym_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Members can update own reservations"
    ON public.gym_reservations FOR UPDATE
    USING (
        member_id IN (SELECT id FROM public.gym_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Staff manages all reservations"
    ON public.gym_reservations FOR ALL USING (public.is_staff());

CREATE TRIGGER trg_gym_reservations_updated
    BEFORE UPDATE ON public.gym_reservations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLA 7: gym_bono_purchases
-- Historial de compras (vista "Compras" del cliente)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gym_bono_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES public.gym_members(id) ON DELETE CASCADE,
    bono_id UUID NOT NULL REFERENCES public.gym_bonos(id),
    credit_id UUID REFERENCES public.gym_member_credits(id),

    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    payment_provider TEXT CHECK (payment_provider IN ('stripe', 'paypal', 'manual', 'cash')),
    payment_reference TEXT,
    payment_status TEXT DEFAULT 'completed',

    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_purchases_member ON public.gym_bono_purchases(member_id);

ALTER TABLE public.gym_bono_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own purchases"
    ON public.gym_bono_purchases FOR SELECT
    USING (
        member_id IN (SELECT id FROM public.gym_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Staff manages purchases"
    ON public.gym_bono_purchases FOR ALL USING (public.is_staff());

-- ============================================================================
-- REALTIME: Habilitar para tablas clave
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE gym_reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE gym_member_credits;
ALTER PUBLICATION supabase_realtime ADD TABLE gym_class_slots;

-- ============================================================================
-- SEED DATA: Tipos de servicio iniciales
-- ============================================================================

INSERT INTO public.gym_service_types (name, description, color, icon, is_bookable_by_client) VALUES
    ('Entrenamiento Grupo Reducido', 'Clases grupales de entrenamiento con aforo limitado', '#3B82F6', 'users', true),
    ('Entrenamiento Personal', 'Sesiones privadas 1 a 1 con entrenador', '#8B5CF6', 'user', false),
    ('Osteopatia', 'Consultas de osteopatia', '#D4A44C', 'heart-pulse', false),
    ('Dietetica', 'Consultas de nutricion y dietetica', '#10B981', 'apple', false)
ON CONFLICT (name) DO NOTHING;
