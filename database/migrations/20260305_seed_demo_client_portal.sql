-- Seed demo client profile for closer calls (client portal showcase)
-- Login credentials for demo session:
--   email: demo.alumno@demo.com
--   password: 123456

DO $$
DECLARE
  v_demo_client_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 0) Defensive schema patch for older databases
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_patologias TEXT;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_medicaci_n TEXT;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_enfermedades TEXT;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS allow_endocrine_access BOOLEAN DEFAULT false;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS assigned_nutrition_type TEXT;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS assigned_calories NUMERIC;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_alergias_intolerancias TEXT;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_n_mero_comidas_al_d_a INTEGER;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN DEFAULT false;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_fecha_alta DATE;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_inicio_programa DATE;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_fecha_fin_contrato_actual DATE;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_estado_cliente TEXT;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_fase TEXT;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_contratado_f1 TEXT;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS coach_id TEXT;
  ALTER TABLE public.clientes_pt_notion ADD COLUMN IF NOT EXISTS property_coach TEXT;

  -- 1) Ensure demo coach and demo client users exist in public.users
  INSERT INTO public.users (id, email, name, role, avatar_url, created_at)
  VALUES
    ('coach-demo-sales-001', 'coach.demo.sales@demo.com', 'Coach Demo Elite', 'coach', 'https://ui-avatars.com/api/?name=Coach+Demo+Elite', v_now)
  ON CONFLICT (email) DO UPDATE
  SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    avatar_url = EXCLUDED.avatar_url;

  INSERT INTO public.users (id, email, name, role, avatar_url, created_at)
  VALUES
    ('demo-client-portal-001', 'demo.alumno@demo.com', '[DEMO] Lucia Progreso', 'client', 'https://ui-avatars.com/api/?name=Lucia+Progreso', v_now)
  ON CONFLICT (email) DO UPDATE
  SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    avatar_url = EXCLUDED.avatar_url;

  -- 2) Upsert client profile in clientes_pt_notion
  SELECT id
  INTO v_demo_client_id
  FROM public.clientes_pt_notion
  WHERE lower(property_correo_electr_nico) = 'demo.alumno@demo.com'
  LIMIT 1;

  IF v_demo_client_id IS NULL THEN
    INSERT INTO public.clientes_pt_notion (
      user_id,
      created_at,
      updated_at,
      property_nombre,
      property_apellidos,
      property_correo_electr_nico,
      property_tel_fono,
      property_fecha_de_nacimiento,
      property_sexo,
      property_altura,
      property_peso_actual,
      property_peso_inicial,
      property_peso_objetivo,
      status,
      property_estado_cliente,
      property_fecha_alta,
      property_inicio_programa,
      property_fecha_fin_contrato_actual,
      property_fase,
      property_contratado_f1,
      coach_id,
      property_coach,
      property_insulina,
      property_dosis,
      property_ultima_glicosilada_hb_a1c,
      property_enfermedades,
      property_medicaci_n,
      property_patologias,
      allow_endocrine_access,
      assigned_nutrition_type,
      assigned_calories,
      property_alergias_intolerancias,
      property_n_mero_comidas_al_d_a,
      contract_signed,
      contract_signed_at,
      onboarding_completed
    )
    VALUES (
      NULL,
      v_now - interval '120 days',
      v_now,
      '[DEMO] Lucia',
      'Progreso Integral',
      'demo.alumno@demo.com',
      '600123456',
      date '1991-06-14',
      'femenino',
      165,
      74.2,
      82.6,
      67.0,
      'Active',
      'Activo',
      current_date - 120,
      current_date - 110,
      current_date + 45,
      'Fase 1',
      'Programa Transformacion 1:1',
      'coach-demo-sales-001',
      'Coach Demo Elite',
      'Si',
      'Basal 16 UI + rapida segun pauta',
      '7.1%',
      'Diabetes tipo 2, resistencia insulinica',
      'Metformina 850mg (2/dia)',
      'Hipotiroidismo subclinico',
      true,
      'Flexible',
      1650,
      'No alergias graves. Intolerancia leve a lactosa.',
      4,
      true,
      v_now - interval '109 days',
      true
    )
    RETURNING id INTO v_demo_client_id;
  ELSE
    UPDATE public.clientes_pt_notion
    SET
      updated_at = v_now,
      property_nombre = '[DEMO] Lucia',
      property_apellidos = 'Progreso Integral',
      property_correo_electr_nico = 'demo.alumno@demo.com',
      property_tel_fono = '600123456',
      property_fecha_de_nacimiento = date '1991-06-14',
      property_sexo = 'femenino',
      property_altura = 165,
      property_peso_actual = 74.2,
      property_peso_inicial = 82.6,
      property_peso_objetivo = 67.0,
      status = 'Active',
      property_estado_cliente = 'Activo',
      property_fecha_alta = current_date - 120,
      property_inicio_programa = current_date - 110,
      property_fecha_fin_contrato_actual = current_date + 45,
      property_fase = 'Fase 1',
      property_contratado_f1 = 'Programa Transformacion 1:1',
      coach_id = 'coach-demo-sales-001',
      property_coach = 'Coach Demo Elite',
      property_insulina = 'Si',
      property_dosis = 'Basal 16 UI + rapida segun pauta',
      property_ultima_glicosilada_hb_a1c = '7.1%',
      property_enfermedades = 'Diabetes tipo 2, resistencia insulinica',
      property_medicaci_n = 'Metformina 850mg (2/dia)',
      property_patologias = 'Hipotiroidismo subclinico',
      allow_endocrine_access = true,
      assigned_nutrition_type = 'Flexible',
      assigned_calories = 1650,
      property_alergias_intolerancias = 'No alergias graves. Intolerancia leve a lactosa.',
      property_n_mero_comidas_al_d_a = 4,
      contract_signed = true,
      contract_signed_at = v_now - interval '109 days',
      onboarding_completed = true
    WHERE id = v_demo_client_id;
  END IF;

  -- 3) Seed realistic reviewed + pending check-ins
  IF to_regclass('public.weekly_checkins') IS NOT NULL THEN
    DELETE FROM public.weekly_checkins WHERE client_id::text = v_demo_client_id::text;

    INSERT INTO public.weekly_checkins (client_id, created_at, responses, rating, status, coach_notes, reviewed_at)
    VALUES
      (
        v_demo_client_id::text,
        v_now - interval '35 days',
        '{"question_1":"Cumpli 4 entrenamientos y 9.000 pasos de media.","question_2":"Me organice mejor con horarios fijos.","question_3":"Muy bien con el plan, menos hinchazon.","question_4":"Buena energia en fuerza y cardio.","question_5":"Cena social del sabado.","question_6":"8","weight_log":"76.9"}'::jsonb,
        8,
        'reviewed',
        'https://www.loom.com/share/demo-semana-1\nGran semana. Mantener estructura de comidas y subir 500 pasos diarios.',
        v_now - interval '34 days'
      ),
      (
        v_demo_client_id::text,
        v_now - interval '28 days',
        '{"question_1":"Baje 0.8kg y no tuve picoteos nocturnos.","question_2":"Preparacion de comida el domingo.","question_3":"Muy buena adherencia, hambre controlada.","question_4":"Mejor tecnica en sentadilla y peso muerto.","question_5":"Dormi menos por trabajo.","question_6":"8","weight_log":"76.1"}'::jsonb,
        8,
        'reviewed',
        'https://www.loom.com/share/demo-semana-2\nExcelente progresion. Prioriza sueno 7h y sigue con hidratacion alta.',
        v_now - interval '27 days'
      ),
      (
        v_demo_client_id::text,
        v_now - interval '21 days',
        '{"question_1":"Cumpli pasos 6 de 7 dias.","question_2":"Me ayudo caminar tras comer.","question_3":"Bien con desayunos y cenas, ajustar comida de oficina.","question_4":"Fuerza correcta, cardio costoso por fatiga.","question_5":"Semana estresante.","question_6":"7","weight_log":"75.4"}'::jsonb,
        7,
        'reviewed',
        'https://www.loom.com/share/demo-semana-3\nBuen trabajo en contexto de estres. Ajustamos snack pre-entreno para energia.',
        v_now - interval '20 days'
      ),
      (
        v_demo_client_id::text,
        v_now - interval '14 days',
        '{"question_1":"Cero ultraprocesados y entreno completo.","question_2":"Planifique menu semanal y compras.","question_3":"Muy bien digestivamente.","question_4":"Subi carga en 3 ejercicios.","question_5":"Poco tiempo para cocinar jueves.","question_6":"9","weight_log":"74.8"}'::jsonb,
        9,
        'reviewed',
        'https://www.loom.com/share/demo-semana-4\nSemana TOP. Reforzar batch cooking para jueves-viernes.',
        v_now - interval '13 days'
      ),
      (
        v_demo_client_id::text,
        v_now - interval '3 days',
        '{"question_1":"Cumpli todos los entrenamientos.","question_2":"Estoy mas constante.","question_3":"Buena adherencia general.","question_4":"Me noto fuerte.","question_5":"Ansiedad puntual por trabajo.","question_6":"8","weight_log":"74.2"}'::jsonb,
        8,
        'pending_review',
        NULL,
        NULL
      );
  END IF;

  -- 4) Seed coaching sessions history (extra polish in reviews)
  IF to_regclass('public.coaching_sessions') IS NOT NULL THEN
    DELETE FROM public.coaching_sessions WHERE client_id::text = v_demo_client_id::text;

    INSERT INTO public.coaching_sessions (client_id, coach_id, date, recording_url, coach_comments, type, summary, created_at)
    VALUES
      (
        v_demo_client_id::text,
        'coach-demo-sales-001',
        v_now - interval '20 days',
        'https://www.loom.com/share/demo-review-1',
        'Revisamos adherencia nutricional y ajuste de cenas.',
        'weekly_review',
        'Adherencia 85%. Mantener pasos y mejorar sueno.',
        v_now - interval '20 days'
      ),
      (
        v_demo_client_id::text,
        'coach-demo-sales-001',
        v_now - interval '13 days',
        'https://www.loom.com/share/demo-review-2',
        'Progresion de fuerza y control de antojos.',
        'weekly_review',
        'Aumento de cargas y mejor control de hambre.',
        v_now - interval '13 days'
      );
  END IF;

  -- 5) Seed medical reviews: initial assessment + downloadable report
  IF to_regclass('public.medical_reviews') IS NOT NULL THEN
    DELETE FROM public.medical_reviews WHERE client_id = v_demo_client_id;

    INSERT INTO public.medical_reviews (
      client_id,
      coach_id,
      submission_date,
      diabetes_type,
      insulin_usage,
      insulin_dose,
      medication,
      comments,
      report_type,
      status,
      doctor_notes,
      doctor_video_url,
      reviewed_at,
      reviewed_by,
      created_at
    )
    VALUES
      (
        v_demo_client_id,
        'coach-demo-sales-001',
        current_date - 95,
        'Type 2',
        'Si',
        'Basal 16 UI',
        'Metformina 850mg',
        'Dr/a. Victor Bravo (Col. 12345) para Lucia Progreso Integral. Valoracion inicial endocrina en contexto de resistencia insulinica.',
        'Valoración Inicial',
        'reviewed',
        'Evolucion favorable inicial. Priorizar fuerza, pasos y control glucemico postprandial.\n\nObjetivo 12 semanas: reducir HbA1c y mejorar sensibilidad insulinica.',
        'https://www.loom.com/share/demo-endocrino-inicial',
        v_now - interval '92 days',
        'endocrino-demo-001',
        v_now - interval '95 days'
      ),
      (
        v_demo_client_id,
        'coach-demo-sales-001',
        current_date - 12,
        'Type 2',
        'Si',
        'Basal 14 UI',
        'Metformina 850mg',
        'Dr/a. Victor Bravo (Col. 12345) para Lucia Progreso Integral. Informe de seguimiento mensual con mejoras de adherencia.',
        'Informe Médico',
        'reviewed',
        '**VALORACIÓN/DIAGNÓSTICO:**\nDescenso de peso sostenido y mejor control de glucosa postprandial.\n\n**RECOMENDACIONES:**\nMantener plan nutricional de 1650 kcal, fuerza 3 dias/semana y caminar tras comidas.\n\n**NOTAS ADICIONALES:**\nContinuar monitorizacion y repetir analitica en 8-10 semanas.',
        NULL,
        v_now - interval '10 days',
        'endocrino-demo-001',
        v_now - interval '12 days'
      );
  END IF;

  -- 6) Ensure weekly classes catalog has attractive demo content
  IF to_regclass('public.weekly_classes') IS NOT NULL THEN
    INSERT INTO public.weekly_classes (title, description, speaker, date, url, category, is_recorded)
    SELECT
      'Control de glucosa en comidas sociales sin perder resultados',
      'Estrategias practicas para eventos, restaurantes y fines de semana.',
      'Jesus',
      v_now - interval '18 days',
      'https://youtube.com/watch?v=demo-glucosa-social',
      'Nutrición',
      true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.weekly_classes WHERE title = 'Control de glucosa en comidas sociales sin perder resultados'
    );

    INSERT INTO public.weekly_classes (title, description, speaker, date, url, category, is_recorded)
    SELECT
      'Fuerza para mujeres con diabetes: progreso sin lesion',
      'Tecnica, cargas y progresion semanal para mejorar sensibilidad insulinica.',
      'Victor',
      v_now - interval '9 days',
      'https://youtube.com/watch?v=demo-fuerza-mujeres',
      'Entrenamiento',
      true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.weekly_classes WHERE title = 'Fuerza para mujeres con diabetes: progreso sin lesion'
    );

    INSERT INTO public.weekly_classes (title, description, speaker, date, url, category, is_recorded)
    SELECT
      'Planifica tu semana para cumplir incluso con poco tiempo',
      'Metodo rapido para organizar comidas, entrenos y check-ins sin agobio.',
      'Jesus',
      v_now + interval '3 days',
      'https://meet.google.com/demo-ado-clase',
      'Mindset',
      false
    WHERE NOT EXISTS (
      SELECT 1 FROM public.weekly_classes WHERE title = 'Planifica tu semana para cumplir incluso con poco tiempo'
    );
  END IF;
END $$;
