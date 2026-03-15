-- ============================================================================
-- TABLA: nutrition_assessments
-- Descripción: Evaluaciones nutricionales exhaustivas de clientes
-- Autor: Sistema PT
-- Fecha: 17 de Diciembre de 2025
-- ============================================================================

-- Crear tabla de evaluaciones nutricionales
CREATE TABLE IF NOT EXISTS public.nutrition_assessments (
    -- Identificadores
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clientes_pt_notion(id) ON DELETE CASCADE,
    
    -- Control de versiones (para histórico)
    version INTEGER DEFAULT 1,
    assessment_date TIMESTAMP DEFAULT NOW(),
    
    -- ========================================================================
    -- PREFERENCIAS DIETÉTICAS
    -- ========================================================================
    dietary_preferences TEXT[], -- ['vegetariano', 'vegano', 'sin_gluten', 'sin_lactosa', 'ninguna']
    other_dietary_preferences TEXT,
    unwanted_foods TEXT, -- Alimentos que NO quiere comer
    regular_foods TEXT[], -- Alimentos que consume habitualmente
    allergies TEXT[], -- ['ninguna', 'lactosa', 'gluten', 'frutos_secos', 'mariscos', 'huevo', 'soja', 'otra']
    other_allergies TEXT,
    
    -- ========================================================================
    -- HORARIOS Y ESTRUCTURA DE COMIDAS
    -- ========================================================================
    meals_per_day INTEGER, -- 2, 3, 4, 5, 6+
    breakfast_time TIME,
    mid_morning_time TIME,
    lunch_time TIME,
    snack_time TIME,
    dinner_time TIME,
    late_snack_time TIME, -- Nuevo: cena tardía o snack nocturno
    
    -- ========================================================================
    -- HÁBITOS ALIMENTICIOS
    -- ========================================================================
    cooks_self BOOLEAN, -- ¿Cocina por sí mismo?
    who_cooks TEXT, -- Si no cocina: '¿Quién cocina?'
    weighs_food BOOLEAN, -- ¿Pesa la comida?
    eats_out_per_week INTEGER, -- Veces que come fuera por semana
    meal_preparation_time TEXT, -- 'poco' (<30min), 'medio' (30-60min), 'mucho' (>60min)
    cooking_skills TEXT, -- 'basico', 'intermedio', 'avanzado'
    family_eats_same BOOLEAN, -- ¿La familia come lo mismo?
    food_budget TEXT, -- 'bajo', 'medio', 'alto'
    
    -- ========================================================================
    -- CONSUMO ESPECÍFICO
    -- ========================================================================
    -- Pan
    eats_bread BOOLEAN,
    bread_type TEXT, -- 'blanco', 'integral', 'centeno', 'sin_gluten'
    bread_amount TEXT, -- 'poco', 'medio', 'mucho'
    bread_frequency TEXT, -- 'diario', '3-4_veces_semana', 'ocasional'
    
    -- Picar entre horas
    snacks_between_meals BOOLEAN,
    snack_frequency TEXT, -- 'rara_vez', 'a_veces', 'frecuentemente', 'constantemente'
    what_snacks TEXT, -- Qué pica
    snack_triggers TEXT[], -- ['aburrimiento', 'ansiedad', 'hambre_real', 'habito', 'social']
    
    -- Bebidas
    drink_with_meals TEXT, -- 'agua', 'refresco', 'zumo', 'vino', 'cerveza', 'nada'
    water_intake_liters DECIMAL(3,1), -- Litros de agua al día
    coffee_cups_per_day INTEGER,
    tea_cups_per_day INTEGER,
    soda_per_week INTEGER, -- Refrescos por semana
    juice_per_week INTEGER, -- Zumos por semana
    
    -- Alcohol
    alcohol_per_week INTEGER, -- Unidades de alcohol por semana
    alcohol_type TEXT[], -- ['vino', 'cerveza', 'licores', 'ninguno']
    alcohol_occasions TEXT, -- 'diario', 'fines_semana', 'ocasiones_especiales', 'nunca'
    
    -- Antojos
    has_cravings BOOLEAN,
    craving_frequency TEXT, -- 'rara_vez', 'semanal', 'diario', 'varias_veces_dia'
    craving_foods TEXT, -- Qué come cuando tiene antojos
    craving_time_of_day TEXT[], -- ['manana', 'tarde', 'noche', 'madrugada']
    
    -- ========================================================================
    -- CONDUCTA ALIMENTARIA
    -- ========================================================================
    has_eating_disorder BOOLEAN,
    eating_disorder_type TEXT, -- 'anorexia', 'bulimia', 'tca_no_especificado', 'trastorno_por_atracon'
    eating_disorder_treatment BOOLEAN, -- ¿Está en tratamiento?
    emotional_eating TEXT[], -- ['estres', 'tristeza', 'ansiedad', 'aburrimiento', 'felicidad', 'ninguno']
    binge_eating_episodes BOOLEAN, -- ¿Episodios de atracón?
    binge_frequency TEXT, -- 'rara_vez', 'mensual', 'semanal', 'diario'
    compensatory_behaviors BOOLEAN, -- ¿Conductas compensatorias? (vómito, laxantes, ejercicio excesivo)
    
    -- ========================================================================
    -- RECORDATORIO 24 HORAS
    -- ========================================================================
    last_24h_meals TEXT, -- Descripción detallada de lo que comió ayer
    last_24h_breakfast TEXT, -- Desayuno detallado
    last_24h_lunch TEXT, -- Comida detallada
    last_24h_dinner TEXT, -- Cena detallada
    last_24h_snacks TEXT, -- Snacks detallados
    
    -- ========================================================================
    -- SUPLEMENTACIÓN
    -- ========================================================================
    takes_supplements BOOLEAN,
    supplements TEXT[], -- ['multivitaminico', 'omega3', 'vitamina_d', 'proteina', 'otro']
    supplements_detail TEXT, -- Detalles de suplementos
    
    -- ========================================================================
    -- CONTEXTO SOCIAL Y CULTURAL
    -- ========================================================================
    cultural_food_restrictions TEXT, -- Restricciones culturales/religiosas
    social_eating_challenges TEXT, -- Desafíos al comer en sociedad
    work_lunch_situation TEXT, -- 'lleva_comida', 'come_fuera', 'cafeteria_empresa', 'no_come'
    weekend_eating_pattern TEXT, -- '¿Cambia mucho el fin de semana?'
    
    -- ========================================================================
    -- CONOCIMIENTOS Y ACTITUDES
    -- ========================================================================
    nutrition_knowledge TEXT, -- 'bajo', 'medio', 'alto'
    reads_labels BOOLEAN, -- ¿Lee etiquetas nutricionales?
    counts_calories BOOLEAN, -- ¿Cuenta calorías?
    uses_nutrition_apps BOOLEAN, -- ¿Usa apps de nutrición?
    which_apps TEXT, -- Qué apps usa
    previous_diets TEXT, -- Dietas que ha probado antes
    diet_success_rate TEXT, -- 'nunca_funciono', 'corto_plazo', 'largo_plazo'
    
    -- ========================================================================
    -- OBJETIVOS Y MOTIVACIÓN NUTRICIONAL
    -- ========================================================================
    nutrition_goals TEXT[], -- ['perder_peso', 'ganar_masa', 'mejorar_salud', 'control_glucosa', 'mas_energia']
    biggest_challenge TEXT, -- Mayor desafío nutricional
    motivation_level TEXT, -- 'bajo', 'medio', 'alto', 'muy_alto'
    support_system TEXT, -- '¿Tiene apoyo familiar?'
    
    -- ========================================================================
    -- SUEÑO Y DESCANSO
    -- ========================================================================
    sleep_hours_per_night DECIMAL(3,1), -- Horas de sueño por noche
    sleep_quality TEXT, -- 'malo', 'regular', 'bueno', 'excelente'
    wakes_up_to_eat BOOLEAN, -- ¿Se despierta a comer?
    night_eating_syndrome BOOLEAN, -- Síndrome de alimentación nocturna
    sleep_affects_appetite BOOLEAN, -- ¿El sueño afecta su apetito?
    
    -- ========================================================================
    -- ESTRÉS Y ANSIEDAD
    -- ========================================================================
    stress_level TEXT, -- 'bajo', 'medio', 'alto', 'muy_alto'
    stress_eating_frequency TEXT, -- 'nunca', 'rara_vez', 'a_veces', 'frecuentemente', 'siempre'
    anxiety_medication BOOLEAN, -- ¿Toma medicación para ansiedad?
    stress_management_techniques TEXT[], -- ['meditacion', 'ejercicio', 'terapia', 'ninguna']
    stress_triggers TEXT, -- Qué le genera estrés
    
    -- ========================================================================
    -- MENSTRUACIÓN (para mujeres)
    -- ========================================================================
    has_menstrual_cycle BOOLEAN, -- ¿Tiene ciclo menstrual?
    pms_affects_eating BOOLEAN, -- ¿El SPM afecta su alimentación?
    pms_cravings TEXT, -- Antojos durante SPM
    menstrual_cycle_regularity TEXT, -- 'regular', 'irregular', 'no_aplica'
    menopause_status TEXT, -- 'premenopausica', 'perimenopausica', 'postmenopausica', 'no_aplica'
    
    -- ========================================================================
    -- DIGESTIÓN Y SALUD INTESTINAL
    -- ========================================================================
    digestive_issues TEXT[], -- ['ninguno', 'estreñimiento', 'diarrea', 'gases', 'reflujo', 'hinchazón', 'dolor']
    bowel_movement_frequency TEXT, -- 'varias_veces_dia', 'diario', 'cada_2_3_dias', 'menos_frecuente'
    food_intolerances_suspected TEXT, -- Intolerancias sospechadas
    takes_digestive_enzymes BOOLEAN, -- ¿Toma enzimas digestivas?
    takes_probiotics BOOLEAN, -- ¿Toma probióticos?
    digestive_discomfort_foods TEXT, -- Alimentos que causan molestias
    
    -- ========================================================================
    -- ACTIVIDAD FÍSICA Y NUTRICIÓN
    -- ========================================================================
    exercise_affects_appetite BOOLEAN, -- ¿El ejercicio afecta su apetito?
    post_workout_eating_pattern TEXT, -- Qué come después de entrenar
    pre_workout_eating_pattern TEXT, -- Qué come antes de entrenar
    uses_sports_nutrition BOOLEAN, -- ¿Usa nutrición deportiva?
    sports_supplements TEXT[], -- ['proteina', 'bcaa', 'creatina', 'pre_workout', 'ninguno']
    exercise_timing_meals TEXT, -- Cuándo entrena en relación a las comidas
    
    -- ========================================================================
    -- TECNOLOGÍA Y TRACKING
    -- ========================================================================
    uses_glucose_monitor BOOLEAN, -- ¿Usa monitor de glucosa?
    glucose_monitor_type TEXT, -- 'freestyle_libre', 'dexcom', 'medtronic', 'otro', 'ninguno'
    tracks_food_photos BOOLEAN, -- ¿Hace fotos de la comida?
    willing_to_track_daily BOOLEAN, -- ¿Dispuesto a trackear diariamente?
    preferred_tracking_method TEXT, -- 'app', 'papel', 'fotos', 'ninguno'
    currently_tracking BOOLEAN, -- ¿Actualmente trackea?
    tracking_apps_used TEXT, -- Apps que usa o ha usado
    
    -- ========================================================================
    -- PREFERENCIAS DE COMUNICACIÓN Y SEGUIMIENTO
    -- ========================================================================
    preferred_contact_method TEXT, -- 'whatsapp', 'email', 'llamada', 'videollamada'
    preferred_contact_time TEXT, -- 'manana', 'tarde', 'noche', 'flexible'
    needs_reminders BOOLEAN, -- ¿Necesita recordatorios?
    reminder_frequency TEXT, -- 'diario', 'cada_2_dias', 'semanal', 'no_necesita'
    communication_style_preference TEXT, -- 'directo', 'motivacional', 'tecnico', 'flexible'
    
    -- ========================================================================
    -- OBJETIVOS ESPECÍFICOS DE GLUCOSA
    -- ========================================================================
    target_fasting_glucose INTEGER, -- Objetivo glucosa en ayunas (mg/dL)
    target_post_meal_glucose INTEGER, -- Objetivo glucosa postprandial (mg/dL)
    hypoglycemia_frequency TEXT, -- 'nunca', 'rara_vez', 'semanal', 'diario', 'varias_veces_dia'
    hyperglycemia_frequency TEXT, -- 'nunca', 'rara_vez', 'semanal', 'diario', 'varias_veces_dia'
    glucose_variability TEXT, -- 'estable', 'moderada', 'alta'
    worst_time_of_day_glucose TEXT, -- Peor momento del día para glucosa
    best_time_of_day_glucose TEXT, -- Mejor momento del día para glucosa
    glucose_awareness TEXT, -- 'muy_consciente', 'consciente', 'poco_consciente', 'no_consciente'
    
    -- ========================================================================
    -- METADATOS Y CONTROL
    -- ========================================================================
    completed_by_client BOOLEAN DEFAULT true, -- ¿Lo completó el cliente?
    reviewed_by UUID REFERENCES public.users(id), -- Nutricionista que revisó
    reviewed_at TIMESTAMP,
    nutritionist_notes TEXT, -- Notas del nutricionista
    status TEXT DEFAULT 'pending', -- 'pending', 'in_review', 'reviewed', 'action_plan_created'
    is_current_version BOOLEAN DEFAULT true, -- ¿Es la versión actual?
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES para mejorar rendimiento
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_nutrition_client_id ON public.nutrition_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_status ON public.nutrition_assessments(status);
CREATE INDEX IF NOT EXISTS idx_nutrition_reviewed_by ON public.nutrition_assessments(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_nutrition_current_version ON public.nutrition_assessments(client_id, is_current_version) WHERE is_current_version = true;
CREATE INDEX IF NOT EXISTS idx_nutrition_assessment_date ON public.nutrition_assessments(assessment_date DESC);

-- ============================================================================
-- TRIGGER para actualizar updated_at automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION update_nutrition_assessment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nutrition_assessment_updated_at
    BEFORE UPDATE ON public.nutrition_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_nutrition_assessment_updated_at();

-- ============================================================================
-- TRIGGER para gestionar versiones
-- ============================================================================
CREATE OR REPLACE FUNCTION manage_nutrition_assessment_versions()
RETURNS TRIGGER AS $$
BEGIN
    -- Cuando se crea una nueva evaluación, marcar las anteriores como no actuales
    IF TG_OP = 'INSERT' THEN
        UPDATE public.nutrition_assessments
        SET is_current_version = false
        WHERE client_id = NEW.client_id
          AND id != NEW.id
          AND is_current_version = true;
        
        -- Calcular el número de versión
        NEW.version = (
            SELECT COALESCE(MAX(version), 0) + 1
            FROM public.nutrition_assessments
            WHERE client_id = NEW.client_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_manage_nutrition_versions
    BEFORE INSERT ON public.nutrition_assessments
    FOR EACH ROW
    EXECUTE FUNCTION manage_nutrition_assessment_versions();

-- ============================================================================
-- RLS (Row Level Security) - Opcional
-- ============================================================================
-- ALTER TABLE public.nutrition_assessments ENABLE ROW LEVEL SECURITY;

-- Política: Los clientes solo pueden ver sus propias evaluaciones
-- CREATE POLICY "Clients can view own assessments"
--     ON public.nutrition_assessments
--     FOR SELECT
--     USING (auth.uid() IN (
--         SELECT id FROM public.users WHERE client_id = nutrition_assessments.client_id
--     ));

-- Política: Nutricionistas y admins pueden ver todas
-- CREATE POLICY "Nutritionists can view all assessments"
--     ON public.nutrition_assessments
--     FOR SELECT
--     USING (auth.uid() IN (
--         SELECT id FROM public.users WHERE role IN ('nutritionist', 'admin', 'coach')
--     ));

-- ============================================================================
-- COMENTARIOS en la tabla
-- ============================================================================
COMMENT ON TABLE public.nutrition_assessments IS 'Evaluaciones nutricionales exhaustivas de clientes con histórico y versionado';
COMMENT ON COLUMN public.nutrition_assessments.version IS 'Número de versión de la evaluación (1, 2, 3...)';
COMMENT ON COLUMN public.nutrition_assessments.is_current_version IS 'Indica si es la versión actual (true) o histórica (false)';
COMMENT ON COLUMN public.nutrition_assessments.status IS 'Estado: pending, in_review, reviewed, action_plan_created';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
