-- =============================================================================
-- SEGUIMIENTO HORMONAL: Ciclo menstrual y menopausia
-- =============================================================================
-- Solo aplica a mujeres. El campo hormonal_status determina qué panel se muestra.
-- =============================================================================

-- 1. Añadir campos a clientes_pt_notion
ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS hormonal_status TEXT;
-- Valores: 'pre_menopausica', 'perimenopausica', 'menopausica', NULL (hombres o no configurado)

ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS average_cycle_length INTEGER DEFAULT 28;
-- Solo relevante para pre/perimenopáusica

ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS hrt_treatment TEXT;
-- Terapia Hormonal Sustitutiva (solo menopáusica/perimenopáusica)

ALTER TABLE clientes_pt_notion ADD COLUMN IF NOT EXISTS last_period_start_date DATE;
-- Desnormalizado: se actualiza al registrar periodo. Para vista rápida coach sin JOIN.

-- 2. Tabla de ciclos menstruales
CREATE TABLE IF NOT EXISTS public.menstrual_cycles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clientes_pt_notion(id) ON DELETE CASCADE NOT NULL,
    period_start_date DATE NOT NULL,
    period_end_date DATE,
    cycle_length INTEGER, -- Calculado: días desde el inicio del ciclo anterior
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de síntomas hormonales (sirve para TODOS los estados)
CREATE TABLE IF NOT EXISTS public.hormonal_symptoms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clientes_pt_notion(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Síntomas comunes ciclo menstrual
    bloating BOOLEAN DEFAULT FALSE,          -- Retención / hinchazón
    cramps BOOLEAN DEFAULT FALSE,            -- Dolor menstrual
    cravings BOOLEAN DEFAULT FALSE,          -- Antojos
    cravings_detail TEXT,                    -- Qué tipo de antojos

    -- Síntomas comunes menopausia/perimenopausia
    hot_flashes BOOLEAN DEFAULT FALSE,       -- Sofocos
    night_sweats BOOLEAN DEFAULT FALSE,      -- Sudoración nocturna
    vaginal_dryness BOOLEAN DEFAULT FALSE,   -- Sequedad

    -- Síntomas compartidos (todos los estados)
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),  -- 1=muy baja, 5=muy alta
    mood INTEGER CHECK (mood BETWEEN 1 AND 5),                  -- 1=muy bajo, 5=muy bueno
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5), -- 1=muy mala, 5=excelente
    headache BOOLEAN DEFAULT FALSE,          -- Dolor de cabeza
    breast_tenderness BOOLEAN DEFAULT FALSE, -- Sensibilidad mamaria
    irritability BOOLEAN DEFAULT FALSE,      -- Irritabilidad

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_menstrual_cycles_client ON public.menstrual_cycles(client_id);
CREATE INDEX IF NOT EXISTS idx_menstrual_cycles_date ON public.menstrual_cycles(period_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_hormonal_symptoms_client ON public.hormonal_symptoms(client_id);
CREATE INDEX IF NOT EXISTS idx_hormonal_symptoms_date ON public.hormonal_symptoms(date DESC);

-- 5. RLS
ALTER TABLE public.menstrual_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hormonal_symptoms ENABLE ROW LEVEL SECURITY;

-- Clientes ven solo sus datos
CREATE POLICY "Clientes ven sus ciclos" ON public.menstrual_cycles
FOR SELECT USING (client_id::text = auth.uid()::text);

CREATE POLICY "Clientes registran sus ciclos" ON public.menstrual_cycles
FOR INSERT WITH CHECK (client_id::text = auth.uid()::text);

CREATE POLICY "Clientes ven sus síntomas" ON public.hormonal_symptoms
FOR SELECT USING (client_id::text = auth.uid()::text);

CREATE POLICY "Clientes registran sus síntomas" ON public.hormonal_symptoms
FOR INSERT WITH CHECK (client_id::text = auth.uid()::text);

-- Staff gestiona todo
CREATE POLICY "Staff gestiona ciclos" ON public.menstrual_cycles
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id::text = auth.uid()::text
        AND role IN ('admin', 'head_coach', 'coach', 'endocrino')
    )
);

CREATE POLICY "Staff gestiona síntomas" ON public.hormonal_symptoms
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id::text = auth.uid()::text
        AND role IN ('admin', 'head_coach', 'coach', 'endocrino')
    )
);
