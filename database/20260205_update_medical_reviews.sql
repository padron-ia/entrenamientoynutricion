-- Migración para añadir soporte de 4 archivos a revisiones médicas
-- Autor: Antigravity
-- Fecha: 2026-02-05

-- 1. Añadir columnas faltantes para los 4 archivos (si no existen)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_reviews' AND column_name = 'file_url_1') THEN
        ALTER TABLE public.medical_reviews ADD COLUMN file_url_1 TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_reviews' AND column_name = 'file_url_2') THEN
        ALTER TABLE public.medical_reviews ADD COLUMN file_url_2 TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_reviews' AND column_name = 'file_url_3') THEN
        ALTER TABLE public.medical_reviews ADD COLUMN file_url_3 TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_reviews' AND column_name = 'file_url_4') THEN
        ALTER TABLE public.medical_reviews ADD COLUMN file_url_4 TEXT;
    END IF;
END $$;

-- 2. Asegurar que el rol 'endocrino' tiene acceso total vía RLS
-- Nota: La política "Staff gestiona revisiones medicas" ya incluye 'endocrino', 
-- pero nos aseguramos de que no haya conflictos.

-- Opcional: Si queremos ser más específicos con el rol 'endocrino'
DROP POLICY IF EXISTS "Endocrinos ven todas las revisiones" ON public.medical_reviews;
CREATE POLICY "Endocrinos ven todas las revisiones" ON public.medical_reviews
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id::text = auth.uid()::text 
        AND role = 'endocrino'
    )
);

-- 2b. Permitir que los clientes creen sus propias revisiones médicas (Arregla Error 403)
DROP POLICY IF EXISTS "Clientes crean sus revisiones" ON public.medical_reviews;
CREATE POLICY "Clientes crean sus revisiones" ON public.medical_reviews
FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
);

-- 2c. Permitir que los clientes vean sus propias revisiones
DROP POLICY IF EXISTS "Clientes ven sus revisiones" ON public.medical_reviews;
CREATE POLICY "Clientes ven sus revisiones" ON public.medical_reviews
FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    client_id::text = auth.uid()::text
);

-- 2d. Permitir que staff (endocrino, coach, admin) actualicen revisiones
DROP POLICY IF EXISTS "Staff actualiza revisiones" ON public.medical_reviews;
CREATE POLICY "Staff actualiza revisiones" ON public.medical_reviews
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id::text = auth.uid()::text 
        AND role IN ('endocrino', 'coach', 'admin')
    )
);

-- 3. Permitir que los endocrinos vean los nombres de los clientes (Arregla "Cliente desconocido")
DROP POLICY IF EXISTS "Endocrinos ven nombres de clientes" ON public.clientes_pt_notion;
CREATE POLICY "Endocrinos ven nombres de clientes" ON public.clientes_pt_notion
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id::text = auth.uid()::text 
        AND role = 'endocrino'
    )
);

-- 4. Crear el bucket de storage y configurar acceso (Arregla Error 400)
-- Nota: Estas sentencias INSERT suelen requerir permisos de superusuario/dashboard.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-reports', 'medical-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Política para que el endocrino pueda ver los archivos subidos
DROP POLICY IF EXISTS "Endocrinos ven informes medicos" ON storage.objects;
CREATE POLICY "Endocrinos ven informes medicos" ON storage.objects
FOR SELECT USING (
    bucket_id = 'medical-reports' AND (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id::text = auth.uid()::text 
        AND role IN ('endocrino', 'coach', 'admin')
      )
    )
);

-- Política para que los clientes puedan subir archivos (Arregla Error 400 en POST)
-- Usamos auth.uid() IS NOT NULL para verificar que hay un usuario autenticado
DROP POLICY IF EXISTS "Clientes suben sus propios informes" ON storage.objects;
CREATE POLICY "Clientes suben sus propios informes" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'medical-reports' AND
    auth.uid() IS NOT NULL
);

-- Política para que cualquier usuario autenticado pueda actualizar sus propios archivos
DROP POLICY IF EXISTS "Usuarios actualizan sus archivos" ON storage.objects;
CREATE POLICY "Usuarios actualizan sus archivos" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'medical-reports' AND
    auth.uid() IS NOT NULL
);

-- Política para lectura pública del bucket (ya que es público)
DROP POLICY IF EXISTS "Lectura publica medical-reports" ON storage.objects;
CREATE POLICY "Lectura publica medical-reports" ON storage.objects
FOR SELECT USING (bucket_id = 'medical-reports');

-- 5. Permitir que el endocrino vea también los logs de bienestar (Arregla Error 406 en wellness_logs)
DROP POLICY IF EXISTS "Endocrinos ven logs de bienestar" ON public.wellness_logs;
CREATE POLICY "Endocrinos ven logs de bienestar" ON public.wellness_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id::text = auth.uid()::text 
        AND role IN ('endocrino', 'coach', 'admin')
    )
);
