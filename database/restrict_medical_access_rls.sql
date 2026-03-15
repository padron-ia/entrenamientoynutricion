-- 1. Eliminar políticas previas para evitar conflictos
DROP POLICY IF EXISTS "Admin y Endocrino gestion total" ON public.medical_reviews;
DROP POLICY IF EXISTS "Coaches ven sus propios alumnos" ON public.medical_reviews;
DROP POLICY IF EXISTS "Alumnos ven sus propias revisiones" ON public.medical_reviews;
DROP POLICY IF EXISTS "Alumnos crean sus propias revisiones" ON public.medical_reviews;
DROP POLICY IF EXISTS "Staff gestiona revisiones medicas" ON public.medical_reviews;
DROP POLICY IF EXISTS "Alumnos ven sus revisiones medicas" ON public.medical_reviews;
DROP POLICY IF EXISTS "Alumnos crean revisiones medicas" ON public.medical_reviews;

-- 2. Asegurar que RLS esté habilitado
ALTER TABLE public.medical_reviews ENABLE ROW LEVEL SECURITY;

-- 3. Política para Admin y Endocrino: Control total
-- Usamos ::text para evitar errores de tipo entre UUID y TEXT
CREATE POLICY "Admin y Endocrino gestion total" ON public.medical_reviews
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id::text = auth.uid()::text
        AND role IN ('admin', 'endocrino')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id::text = auth.uid()::text
        AND role IN ('admin', 'endocrino')
    )
);

-- 4. Política para Coaches: Solo lectura de sus propios alumnos
CREATE POLICY "Coaches ven sus propios alumnos" ON public.medical_reviews
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.clientes_pt_notion c
        WHERE c.id::text = public.medical_reviews.client_id::text
        AND c.coach_id::text = auth.uid()::text
    )
    OR
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id::text = auth.uid()::text
        AND role = 'head_coach'
    )
);

-- 5. Política para Alumnos: Pueden ver y crear sus propias solicitudes
CREATE POLICY "Alumnos ven sus propias revisiones" ON public.medical_reviews
FOR SELECT TO authenticated
USING (
    client_id::text = auth.uid()::text
);

CREATE POLICY "Alumnos crean sus propias revisiones" ON public.medical_reviews
FOR INSERT TO authenticated
WITH CHECK (
    client_id::text = auth.uid()::text
);

-- 6. Garantizar permisos básicos de acceso a la tabla
GRANT SELECT, INSERT, UPDATE ON public.medical_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.medical_reviews TO service_role;
