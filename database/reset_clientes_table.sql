-- =====================================================
-- 🧹 LIMPIEZA TOTAL Y REORGANIZACIÓN DE CLIENTES
-- =====================================================
-- Este script:
-- 1. Elimina TODOS los datos actuales de clientes_pt_notion
-- 2. Verifica y añade columnas faltantes
-- 3. Mantiene las políticas RLS y permisos
-- =====================================================

-- PASO 1: ELIMINAR TODOS LOS DATOS ACTUALES
-- =====================================================
TRUNCATE TABLE public.clientes_pt_notion CASCADE;

-- PASO 2: ASEGURAR QUE EXISTAN TODAS LAS COLUMNAS NECESARIAS
-- =====================================================

-- Columnas básicas del sistema
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS user_id UUID;

-- Datos personales básicos
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_nombre TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_apellidos TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_correo_electr_nico TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_dni TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_tel_fono TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_direccion TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_poblaci_n TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_provincia TEXT;

-- Datos demográficos
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_edad INTEGER;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_edad_vista INTEGER;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_fecha_de_nacimiento DATE;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_sexo TEXT;

-- Datos físicos
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_altura NUMERIC;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_peso_actual NUMERIC;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_peso_inicial NUMERIC;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_peso_objetivo NUMERIC;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_per_metro_abdomen NUMERIC;

-- Estado y programa
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_estado_cliente TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_fecha_alta DATE;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_inicio_programa DATE;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_contratado_f1 TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_fase TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_tipo_de_programa TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS coach_id TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_coach TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS allow_endocrine_access BOOLEAN DEFAULT false;

-- Datos médicos
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_insulina TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_marca_insulina TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_dosis TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_hora_inyecci_n TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_usa_sensor_free_style BOOLEAN;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_ultima_glicosilada_hb_a1c TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_glucosa_en_ayunas_actual TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_enfermedades TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_medicaci_n TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_otras_enfermedades_o_condicionantes TEXT;

-- Nutrición básica
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_plan_nutricional TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS assigned_nutrition_type TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS assigned_calories NUMERIC;

-- Nutrición detallada
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_cocina_l_mismo BOOLEAN;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_dispuesto_a_pesar_comida BOOLEAN;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_comidas_fuera_de_casa_semanales INTEGER;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_n_mero_comidas_al_d_a INTEGER;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_come_con_pan BOOLEAN;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_cantidad_pan TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_consumo_de_alcohol TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_bebida_en_la_comida TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_alergias_intolerancias TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_otras_alergias_o_intolerancias TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_alimentos_a_evitar_detalle TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_alimentos_consumidos TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_tiene_antojos TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_especificar_antojos TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_pica_entre_horas BOOLEAN;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_especificar_pica_entre_horas TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_trastorno_alimenticio_diagnosticado TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_especificar_trastorno_alimenticio TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_notas_diet_ticas_espec_ficas TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_ltima_comida_recuerdo TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_preferencias_diet_ticas_generales TEXT;

-- Horarios de comidas
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_horario_desayuno TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_horario_almuerzo TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_horario_cena TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_horario_merienda TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_horario_media_ma_ana TEXT;

-- Entrenamiento
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_actividad_f_sica_general_cliente TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_pasos_diarios_promedio INTEGER;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_ejercicio_fuerza BOOLEAN;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_lugar_entreno TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_horario_disponibilidad TEXT;

-- Objetivos
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_motivo_contrataci_n TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_3_meses TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_6_meses TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_1_a_o TEXT;

-- Renovaciones
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_renueva_f2 BOOLEAN;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_contratado_renovaci_n_f2 TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_renueva_f3 BOOLEAN;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_contratado_renovaci_n_f3 TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_renueva_f4 BOOLEAN;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_contratado_renovaci_n_f4 TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_renueva_f5 BOOLEAN;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_contratado_renovaci_n_f5 TEXT;

-- Contrato digital
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN DEFAULT false;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS contract_signature_image TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS contract_url TEXT;

-- Revisiones y seguimiento
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_video_revision TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_fecha_revision DATE;

-- Información adicional
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_informaci_n_extra_cliente TEXT;

-- Bajas y pausas
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_fecha_abandono DATE;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_motivo_abandono TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_fecha_de_baja DATE;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_motivo_baja TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_fecha_pausa DATE;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_motivo_pausa TEXT;

-- Pagos y renovaciones
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS renewal_payment_link TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS renewal_payment_status TEXT DEFAULT 'none';
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS renewal_receipt_url TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS renewal_phase TEXT;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS renewal_amount NUMERIC;
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS renewal_duration INTEGER;

-- Onboarding
ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS onboarding_token TEXT;

-- PASO 3: CREAR ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes_pt_notion(property_correo_electr_nico);
CREATE INDEX IF NOT EXISTS idx_clientes_coach_id ON public.clientes_pt_notion(coach_id);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON public.clientes_pt_notion(status);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON public.clientes_pt_notion(property_estado_cliente);
CREATE INDEX IF NOT EXISTS idx_clientes_onboarding_token ON public.clientes_pt_notion(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes_pt_notion(user_id);

-- PASO 4: TRIGGER PARA UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes_pt_notion;
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON public.clientes_pt_notion
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ✅ LISTO PARA IMPORTAR
-- =====================================================
-- La tabla está ahora limpia y con todas las columnas necesarias
-- Ejecuta el script de importación: node scripts/import_notion_complete.js
