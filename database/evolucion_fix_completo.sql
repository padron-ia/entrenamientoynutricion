-- ==============================================================================
-- 🚀 ARREGLO INTEGRAL DE EVOLUCIÓN: TABLAS, STORAGE Y PERMISOS 🚀
-- ==============================================================================
-- Ejecuta este script en el SQL Editor de Supabase para corregir los errores 
-- de creación de tareas y tickets, y habilitar la subida de facturas.

-- 1. FUNCIONES DE SEGURIDAD (Asegurar que existan)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
  SELECT public.get_auth_role() IN ('admin', 'head_coach', 'coach', 'closer', 'contabilidad', 'endocrino', 'psicologo', 'rrss');
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT public.get_auth_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. TABLA DE TAREAS (Coach Tasks)
DROP TABLE IF EXISTS public.coach_tasks; -- FORZAR RECREACIÓN PARA TIPOS CORRECTOS
CREATE TABLE public.coach_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clientes_pt_notion(id) ON DELETE SET NULL, -- TIPO UUID
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA DE TICKETS DE SOPORTE
DROP TABLE IF EXISTS public.support_tickets CASCADE; -- FORZAR RECREACIÓN LIMPIA
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clientes_pt_notion(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- QUIEN ABRIÓ EL TICKET
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    category TEXT CHECK (category IN ('nutricion', 'entrenamiento', 'tecnico_app', 'facturacion', 'medico', 'otros')),
    assigned_to TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABLA DE NOTIFICACIONES
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, 
    link TEXT, 
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABLA DE FACTURAS (Si no existe)
CREATE TABLE IF NOT EXISTS public.coach_invoices (
    id UUID DEFAULT gen_random_uuid PRIMARY KEY,
    coach_id TEXT NOT NULL REFERENCES public.users(id),
    coach_name TEXT,
    period_date DATE NOT NULL, 
    amount DECIMAL(10, 2) NOT NULL,
    invoice_url TEXT NOT NULL, 
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    admin_notes TEXT, 
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. HABILITAR RLS
ALTER TABLE public.coach_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_invoices ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS DE ACCESO
-- Tareas
DROP POLICY IF EXISTS "Management tasks" ON public.coach_tasks;
CREATE POLICY "Management tasks" ON public.coach_tasks 
    FOR ALL TO authenticated 
    USING (coach_id = auth.uid()::text OR public.is_admin() OR public.get_auth_role() = 'head_coach')
    WITH CHECK (coach_id = auth.uid()::text OR public.is_admin() OR public.get_auth_role() = 'head_coach');

-- Tickets
DROP POLICY IF EXISTS "Staff tickets" ON public.support_tickets;
CREATE POLICY "Staff tickets" ON public.support_tickets 
    FOR ALL TO authenticated 
    USING (
        created_by = auth.uid()::text 
        OR assigned_to = auth.uid()::text 
        OR public.is_staff()
    )
    WITH CHECK (
        created_by = auth.uid()::text 
        OR public.is_staff()
    );

-- Facturas
DROP POLICY IF EXISTS "Users manage invoices" ON public.coach_invoices;
CREATE POLICY "Users manage invoices" ON public.coach_invoices
    FOR ALL TO authenticated
    USING (coach_id = auth.uid()::text OR public.is_admin() OR public.get_auth_role() = 'contabilidad')
    WITH CHECK (coach_id = auth.uid()::text OR public.is_admin() OR public.get_auth_role() = 'contabilidad');

-- 8. STORAGE PARA FACTURAS
-- Crear bucket si no existe (esto suele requerir permisos de superuser o via dashboard, pero intentamos la política)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para Invoices
DROP POLICY IF EXISTS "Permitir subida facturas" ON storage.objects;
CREATE POLICY "Permitir subida facturas" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'invoices' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Ver facturas propias y admin" ON storage.objects;
CREATE POLICY "Ver facturas propias y admin" ON storage.objects 
    FOR SELECT USING (
        bucket_id = 'invoices' AND (
            (storage.foldername(name))[1] = auth.uid()::text 
            OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role IN ('admin', 'contabilidad'))
        )
    );
