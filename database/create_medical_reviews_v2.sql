-- 1. CORRECCIÓN DE TABLA REVISIONES MÉDICAS (ENDOCRINO)
-- Versión simplificada y corrigiendo el problema de Tipos de UUID/TEXT

CREATE TABLE IF NOT EXISTS public.medical_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Relación con el Cliente
    -- Usamos UUID para asegurar integridad porque la tabla clientes_pt_notion usa UUID
    client_id UUID REFERENCES public.clientes_pt_notion(id) ON DELETE CASCADE NOT NULL,
    
    coach_id TEXT, -- Nombre del coach (texto)
    
    -- Datos del Formulario del Alumno
    submission_date DATE DEFAULT CURRENT_DATE,
    
    -- Datos Médicos
    diabetes_type TEXT,
    insulin_usage TEXT, -- "Si", "No"
    insulin_dose TEXT,
    medication TEXT,
    comments TEXT, -- El campo grande de comentarios (sueño, dolor, etc)
    report_type TEXT, -- "Analítica"
    
    -- Adjuntos (Solo PDFs/Informes, no fotos específicas)
    file_url_1 TEXT,
    file_url_2 TEXT,
    file_url_3 TEXT,

    -- Gestión Interna
    status TEXT DEFAULT 'pending_review', -- 'pending_review', 'completed'
    
    -- Respuesta del Endocrino
    doctor_notes TEXT,
    doctor_video_url TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT -- Guardamos el ID del doctor como texto para evitar lio de FKs
);

-- 2. HABILITAR SEGURIDAD (RLS)
ALTER TABLE public.medical_reviews ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE SEGURIDAD (RLS)

-- A. Alumnos: Solo pueden ver SUS propias revisiones
-- (Casteamos a texto para comparar sin problemas de tipos)
CREATE POLICY "Alumnos ven sus revisiones medicas" ON public.medical_reviews
FOR SELECT USING (
    client_id::text = auth.uid()::text
);

-- B. Alumnos: Pueden CREAR revisiones
CREATE POLICY "Alumnos crean revisiones medicas" ON public.medical_reviews
FOR INSERT WITH CHECK (
    client_id::text = auth.uid()::text
);

-- C. Staff (Coaches, Admin, Endocrino): Pueden VER y GESTIONAR TODO
-- Asumimos que el usuario staff tiene rol 'admin', 'coach' o 'endocrino' en public.users
CREATE POLICY "Staff gestiona revisiones medicas" ON public.medical_reviews
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id::text = auth.uid()::text 
        AND role IN ('admin', 'coach', 'endocrino')
    )
);

-- 4. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_medical_reviews_client ON public.medical_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_medical_reviews_status ON public.medical_reviews(status);

-- 5. AÑADIR SWITCH DE PERMISO A LA TABLA DE CLIENTES
-- Si ya existe la columna, esto no dará error (IF NOT EXISTS no soportado en ADD COLUMN estándar en versiones viejas, 
-- pero en Postgres moderno sí o se puede hacer un block DO, pero para simplificar asumimos que hay que crearla si falta).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes_pt_notion' AND column_name = 'allow_endocrine_access') THEN
        ALTER TABLE public.clientes_pt_notion ADD COLUMN allow_endocrine_access BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
