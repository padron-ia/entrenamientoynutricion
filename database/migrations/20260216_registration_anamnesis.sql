-- Migration: Anamnesis System (Phase 2)
-- Date: 2026-02-16
-- Description: Add columns for anamnesis data (Phase 2 of registration)
-- Note: Phase 1 registration columns already exist in the table

-- =============================================
-- Anamnesis fields (new columns)
-- =============================================
ALTER TABLE public.clientes_pt_notion
ADD COLUMN IF NOT EXISTS property_alergias_medicamentos TEXT,
ADD COLUMN IF NOT EXISTS property_habito_tabaco TEXT,
ADD COLUMN IF NOT EXISTS property_consumo_ultraprocesados TEXT,
ADD COLUMN IF NOT EXISTS property_horas_sueno TEXT,
ADD COLUMN IF NOT EXISTS property_nivel_estres INTEGER,
ADD COLUMN IF NOT EXISTS property_hipertension BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS property_dislipemia BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS property_infarto_previo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS property_ictus_previo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS property_fecha_diagnostico_diabetes TEXT,
ADD COLUMN IF NOT EXISTS property_peso_al_diagnostico DECIMAL,
ADD COLUMN IF NOT EXISTS property_perdida_peso_reciente TEXT,
ADD COLUMN IF NOT EXISTS property_sospecha_lada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS property_edad_menopausia INTEGER,
ADD COLUMN IF NOT EXISTS property_sintomas_menopausia TEXT,
ADD COLUMN IF NOT EXISTS property_osteoporosis BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS property_niebla_mental BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS property_candidata_thm BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS property_enfermedades_previas TEXT,
ADD COLUMN IF NOT EXISTS property_cirugias_previas TEXT,
ADD COLUMN IF NOT EXISTS property_tratamiento_actual_completo TEXT,
ADD COLUMN IF NOT EXISTS property_detalle_antidiabeticos TEXT,
ADD COLUMN IF NOT EXISTS property_detalle_insulina_completo TEXT,
ADD COLUMN IF NOT EXISTS property_comer_emocional TEXT,
ADD COLUMN IF NOT EXISTS property_episodios_atracon TEXT,
ADD COLUMN IF NOT EXISTS property_tca_detalle TEXT,
ADD COLUMN IF NOT EXISTS property_calidad_sueno TEXT,
ADD COLUMN IF NOT EXISTS property_sueno_afecta_apetito BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS property_problemas_digestivos TEXT,
ADD COLUMN IF NOT EXISTS property_analitica_urls TEXT;
