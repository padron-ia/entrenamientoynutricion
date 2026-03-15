-- Demo client seed compatible with legacy clientes_pt_notion schemas
-- Includes: client profile, nutrition assignment, training assignment, strength progress,
-- check-ins, medical report and classes for sales demos.

DO $$
DECLARE
  v_client_id UUID;
  v_plan_id UUID;
  v_program_id UUID;
  v_day_id UUID;
BEGIN
  -- 1) Ensure demo users exist in public.users
  IF to_regclass('public.users') IS NOT NULL THEN
    INSERT INTO public.users (id, email, name, role)
    VALUES ('coach-demo-sales-001', 'coach.demo.sales@demo.com', 'Coach Demo Elite', 'coach')
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role;

    INSERT INTO public.users (id, email, name, role)
    VALUES ('demo-client-portal-001', 'demo.alumno@demo.com', '[DEMO] Lucia Progreso', 'client')
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, name = EXCLUDED.name, role = 'client';

    UPDATE public.users
    SET role = 'client', name = '[DEMO] Lucia Progreso'
    WHERE lower(email) = 'demo.alumno@demo.com';
  END IF;

  -- 2) Upsert demo client in clientes_pt_notion (using real column types from legacy schema)
  INSERT INTO public.clientes_pt_notion (
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
    property_patolog_as,
    allow_endocrine_access,
    assigned_nutrition_type,
    assigned_calories,
    property_alergias_intolerancias,
    property_n_mero_comidas_al_d_a,
    contract_signed,
    contract_signed_at,
    contract_visible_to_client,
    coach_message,
    property_plan_nutricional,
    property_video_revision,
    property_fecha_revision,
    updated_at
  ) VALUES (
    '[DEMO] Lucia',
    'Progreso Integral',
    'demo.alumno@demo.com',
    '600123456',
    to_jsonb('1991-06-14'::text),
    'femenino',
    '165',
    74.2,
    82.6,
    67.0,
    'active',
    'Activo',
    current_date - 120,
    current_date - 110,
    to_jsonb((current_date + 45)::text),
    'Fase 1',
    'Programa Transformacion 1:1',
    'coach-demo-sales-001',
    'Coach Demo Elite',
    'Si',
    'Basal 16 UI + rapida segun pauta',
    7.1,
    to_jsonb('Diabetes tipo 2, resistencia insulinica'::text),
    'Metformina 850mg (2/dia)',
    'Hipotiroidismo subclinico',
    true,
    'Flexible',
    1650,
    to_jsonb('No alergias graves. Intolerancia leve a lactosa.'::text),
    4,
    true,
    now() - interval '109 days',
    true,
    'Esta semana foco: adherencia, sueno y pasos. Vas excelente.',
    'https://drive.google.com/file/d/demo-plan-nutricional/view',
    'https://www.loom.com/share/demo-revision-semanal',
    current_date - 3,
    now()
  )
  ON CONFLICT (property_correo_electr_nico) DO UPDATE
  SET
    property_nombre = EXCLUDED.property_nombre,
    property_apellidos = EXCLUDED.property_apellidos,
    property_tel_fono = EXCLUDED.property_tel_fono,
    property_fecha_de_nacimiento = EXCLUDED.property_fecha_de_nacimiento,
    property_sexo = EXCLUDED.property_sexo,
    property_altura = EXCLUDED.property_altura,
    property_peso_actual = EXCLUDED.property_peso_actual,
    property_peso_inicial = EXCLUDED.property_peso_inicial,
    property_peso_objetivo = EXCLUDED.property_peso_objetivo,
    status = 'active',
    property_estado_cliente = EXCLUDED.property_estado_cliente,
    property_fecha_alta = EXCLUDED.property_fecha_alta,
    property_inicio_programa = EXCLUDED.property_inicio_programa,
    property_fecha_fin_contrato_actual = EXCLUDED.property_fecha_fin_contrato_actual,
    property_fase = EXCLUDED.property_fase,
    property_contratado_f1 = EXCLUDED.property_contratado_f1,
    coach_id = EXCLUDED.coach_id,
    property_coach = EXCLUDED.property_coach,
    property_insulina = EXCLUDED.property_insulina,
    property_dosis = EXCLUDED.property_dosis,
    property_ultima_glicosilada_hb_a1c = EXCLUDED.property_ultima_glicosilada_hb_a1c,
    property_enfermedades = EXCLUDED.property_enfermedades,
    property_medicaci_n = EXCLUDED.property_medicaci_n,
    property_patolog_as = EXCLUDED.property_patolog_as,
    allow_endocrine_access = EXCLUDED.allow_endocrine_access,
    assigned_nutrition_type = EXCLUDED.assigned_nutrition_type,
    assigned_calories = EXCLUDED.assigned_calories,
    property_alergias_intolerancias = EXCLUDED.property_alergias_intolerancias,
    property_n_mero_comidas_al_d_a = EXCLUDED.property_n_mero_comidas_al_d_a,
    contract_signed = EXCLUDED.contract_signed,
    contract_signed_at = EXCLUDED.contract_signed_at,
    contract_visible_to_client = EXCLUDED.contract_visible_to_client,
    coach_message = EXCLUDED.coach_message,
    property_plan_nutricional = EXCLUDED.property_plan_nutricional,
    property_video_revision = EXCLUDED.property_video_revision,
    property_fecha_revision = EXCLUDED.property_fecha_revision,
    updated_at = now();

  SELECT id INTO v_client_id
  FROM public.clientes_pt_notion
  WHERE lower(property_correo_electr_nico) = 'demo.alumno@demo.com'
  LIMIT 1;

  -- 3) Seed reviewed + pending weekly check-ins
  IF to_regclass('public.weekly_checkins') IS NOT NULL THEN
    DELETE FROM public.weekly_checkins WHERE client_id = v_client_id::text;

    INSERT INTO public.weekly_checkins (client_id, created_at, responses, rating, status, coach_notes, reviewed_at)
    VALUES
      (
        v_client_id::text,
        now() - interval '21 days',
        '{"question_1":"Cumpli 4 entrenos y 9.000 pasos de media.","question_3":"Muy bien con el plan.","question_4":"Me noto con mas energia.","question_6":"8","weight_log":"75.4"}'::jsonb,
        8,
        'reviewed',
        'https://www.loom.com/share/demo-semana-1\nMuy buena adherencia. Mantenemos la estructura actual.',
        now() - interval '20 days'
      ),
      (
        v_client_id::text,
        now() - interval '14 days',
        '{"question_1":"Semana estable y sin picoteos.","question_3":"Buena saciedad.","question_4":"Subi cargas en 2 ejercicios.","question_6":"9","weight_log":"74.8"}'::jsonb,
        9,
        'reviewed',
        'https://www.loom.com/share/demo-semana-2\nExcelente progreso, reforzar sueno y hidratacion.',
        now() - interval '13 days'
      ),
      (
        v_client_id::text,
        now() - interval '3 days',
        '{"question_1":"Cumpli todos los entrenamientos.","question_3":"Buena adherencia.","question_4":"Me noto mas fuerte.","question_6":"8","weight_log":"74.2"}'::jsonb,
        8,
        'pending_review',
        NULL,
        NULL
      );
  END IF;

  -- 4) Seed medical report for client portal > Informes
  IF to_regclass('public.medical_reviews') IS NOT NULL THEN
    DELETE FROM public.medical_reviews WHERE client_id = v_client_id;

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
      reviewed_at,
      reviewed_by,
      created_at
    ) VALUES (
      v_client_id,
      'coach-demo-sales-001',
      current_date - 12,
      'Type 2',
      'Si',
      'Basal 14 UI',
      'Metformina 850mg',
      'Dr/a. Victor Bravo (Col. 12345) para Lucia Progreso Integral. Informe de seguimiento mensual.',
      'Informe Médico',
      'reviewed',
      '**VALORACIÓN/DIAGNÓSTICO:** Evolucion favorable con mejor adherencia.\n\n**RECOMENDACIONES:** Mantener plan 1650 kcal, fuerza 3 dias y pasos diarios.\n\n**NOTAS ADICIONALES:** Repetir analitica en 8-10 semanas.',
      now() - interval '10 days',
      'endocrino-demo-001',
      now() - interval '12 days'
    );
  END IF;

  -- 5) Ensure visible classes in portal demo
  IF to_regclass('public.weekly_classes') IS NOT NULL THEN
    INSERT INTO public.weekly_classes (title, description, speaker, date, url, category, is_recorded)
    SELECT 'Control de glucosa en comidas sociales sin perder resultados',
           'Estrategias practicas para eventos y restaurantes.',
           'Jesus',
           now() - interval '18 days',
           'https://youtube.com/watch?v=demo-glucosa-social',
           'Nutrición',
           true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.weekly_classes WHERE title = 'Control de glucosa en comidas sociales sin perder resultados'
    );

    INSERT INTO public.weekly_classes (title, description, speaker, date, url, category, is_recorded)
    SELECT 'Fuerza para mujeres con diabetes: progreso sin lesion',
           'Tecnica, cargas y progresion semanal.',
           'Victor',
           now() - interval '9 days',
           'https://youtube.com/watch?v=demo-fuerza-mujeres',
           'Entrenamiento',
           true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.weekly_classes WHERE title = 'Fuerza para mujeres con diabetes: progreso sin lesion'
    );
  END IF;

  -- 6) Assign latest published nutrition plan if table exists
  IF to_regclass('public.nutrition_plans') IS NOT NULL
     AND to_regclass('public.client_nutrition_assignments') IS NOT NULL THEN
    SELECT id INTO v_plan_id
    FROM public.nutrition_plans
    WHERE status IN ('published', 'active')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_plan_id IS NOT NULL THEN
      DELETE FROM public.client_nutrition_assignments WHERE client_id = v_client_id;

      INSERT INTO public.client_nutrition_assignments (client_id, plan_id, assigned_at, assigned_by)
      VALUES (v_client_id, v_plan_id, now(), NULL)
      ON CONFLICT (client_id) DO UPDATE
      SET plan_id = EXCLUDED.plan_id, assigned_at = EXCLUDED.assigned_at;
    END IF;
  END IF;

  -- 7) Assign training program (create demo program if none exists)
  IF to_regclass('public.training_programs') IS NOT NULL
     AND to_regclass('public.training_program_days') IS NOT NULL
     AND to_regclass('public.training_program_activities') IS NOT NULL
     AND to_regclass('public.client_training_assignments') IS NOT NULL THEN
    SELECT id INTO v_program_id
    FROM public.training_programs
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_program_id IS NULL THEN
      INSERT INTO public.training_programs (name, description, weeks_count, created_at, updated_at)
      VALUES ('DEMO · Semana Estructurada', 'Programa demo de 1 semana para portal cliente', 1, now(), now())
      RETURNING id INTO v_program_id;

      INSERT INTO public.training_program_days (program_id, week_number, day_number) VALUES (v_program_id, 1, 1) RETURNING id INTO v_day_id;
      INSERT INTO public.training_program_activities (day_id, type, title, description, position, color, config)
      VALUES (v_day_id, 'custom', 'Fuerza Tren Inferior + Core', 'Sentadilla goblet 4x10, RDL 4x10, zancadas 3x12, hip thrust 4x12 + core', 1, '#0ea5a4', '{}'::jsonb);

      INSERT INTO public.training_program_days (program_id, week_number, day_number) VALUES (v_program_id, 1, 2) RETURNING id INTO v_day_id;
      INSERT INTO public.training_program_activities (day_id, type, title, description, position, color, config)
      VALUES (v_day_id, 'walking', 'Cardio Z2 + Movilidad', '40 min zona 2 + 10 min movilidad', 1, '#22c55e', '{}'::jsonb);

      INSERT INTO public.training_program_days (program_id, week_number, day_number) VALUES (v_program_id, 1, 3) RETURNING id INTO v_day_id;
      INSERT INTO public.training_program_activities (day_id, type, title, description, position, color, config)
      VALUES (v_day_id, 'custom', 'Fuerza Tren Superior', 'Press inclinado 4x10, remo 4x10, press militar 3x10, jalon 3x12 + brazos', 1, '#3b82f6', '{}'::jsonb);

      INSERT INTO public.training_program_days (program_id, week_number, day_number) VALUES (v_program_id, 1, 4) RETURNING id INTO v_day_id;
      INSERT INTO public.training_program_activities (day_id, type, title, description, position, color, config)
      VALUES (v_day_id, 'walking', 'Recuperacion Activa', 'Caminata suave 30 min + estiramientos 15 min', 1, '#f59e0b', '{}'::jsonb);

      INSERT INTO public.training_program_days (program_id, week_number, day_number) VALUES (v_program_id, 1, 5) RETURNING id INTO v_day_id;
      INSERT INTO public.training_program_activities (day_id, type, title, description, position, color, config)
      VALUES (v_day_id, 'custom', 'Fuerza Full Body', 'Bulgara 3x10, press 4x8-10, remo 4x10, bisagra 3x12, face pulls 3x15', 1, '#8b5cf6', '{}'::jsonb);

      INSERT INTO public.training_program_days (program_id, week_number, day_number) VALUES (v_program_id, 1, 6) RETURNING id INTO v_day_id;
      INSERT INTO public.training_program_activities (day_id, type, title, description, position, color, config)
      VALUES (v_day_id, 'custom', 'Cardio Interválico Suave', '8 bloques de 1 min rapido + 2 min suave', 1, '#ef4444', '{}'::jsonb);

      INSERT INTO public.training_program_days (program_id, week_number, day_number) VALUES (v_program_id, 1, 7) RETURNING id INTO v_day_id;
      INSERT INTO public.training_program_activities (day_id, type, title, description, position, color, config)
      VALUES (v_day_id, 'custom', 'Descanso y Recuperacion', 'Paseo opcional + higiene del sueno + hidratacion', 1, '#64748b', '{}'::jsonb);
    END IF;

    DELETE FROM public.client_training_assignments WHERE client_id = v_client_id;
    INSERT INTO public.client_training_assignments (client_id, program_id, start_date, assigned_by, assigned_at)
    VALUES (v_client_id, v_program_id, current_date - 7, NULL, now());
  END IF;

  -- 8) Seed strength progression for portal > progreso de fuerza
  IF to_regclass('public.client_strength_benchmarks') IS NOT NULL
     AND to_regclass('public.client_strength_records') IS NOT NULL THEN
    DELETE FROM public.client_strength_records WHERE client_id = v_client_id;
    DELETE FROM public.client_strength_benchmarks WHERE client_id = v_client_id;

    INSERT INTO public.client_strength_benchmarks
      (client_id, test_name, protocol_type, metric_unit, target_notes, is_active, created_at, updated_at)
    VALUES
      (v_client_id, 'Sentadilla goblet', 'amrap_reps', 'reps', 'Objetivo: mejorar control y reps con tecnica limpia.', true, now() - interval '40 days', now()),
      (v_client_id, 'Press militar', 'rm_load', 'kg', 'Objetivo: subir carga progresivamente sin dolor de hombro.', true, now() - interval '40 days', now()),
      (v_client_id, 'Press de pecho', 'rm_load', 'kg', 'Objetivo: aumentar fuerza de empuje superior.', true, now() - interval '40 days', now()),
      (v_client_id, 'Sit to stand 60s', 'reps_60s', 'reps', 'Objetivo: mejorar capacidad funcional y resistencia.', true, now() - interval '40 days', now());

    INSERT INTO public.client_strength_records
      (client_id, benchmark_id, phase, metric_value, metric_unit, source, recorded_on, notes, reps, load_kg, duration_seconds, is_validated, created_at)
    SELECT
      v_client_id,
      b.id,
      x.phase,
      x.metric_value,
      b.metric_unit,
      'coach',
      x.recorded_on,
      x.notes,
      x.reps,
      x.load_kg,
      x.duration_seconds,
      true,
      now()
    FROM public.client_strength_benchmarks b
    JOIN (
      VALUES
        ('Sentadilla goblet', 'baseline', 12::numeric, current_date - 35, 'Medicion inicial', 12::int, 12::numeric, NULL::int),
        ('Sentadilla goblet', 'checkpoint', 14::numeric, current_date - 20, 'Mejora de ritmo y tecnica', 14::int, 12::numeric, NULL::int),
        ('Sentadilla goblet', 'monthly', 16::numeric, current_date - 6, 'Gran progreso', 16::int, 14::numeric, NULL::int),
        ('Press militar', 'baseline', 18::numeric, current_date - 35, 'Base de fuerza', NULL::int, NULL::numeric, NULL::int),
        ('Press militar', 'checkpoint', 20::numeric, current_date - 20, 'Mejor control', NULL::int, NULL::numeric, NULL::int),
        ('Press militar', 'monthly', 22.5::numeric, current_date - 6, 'Subida de carga estable', NULL::int, NULL::numeric, NULL::int),
        ('Press de pecho', 'baseline', 24::numeric, current_date - 35, 'Inicio', NULL::int, NULL::numeric, NULL::int),
        ('Press de pecho', 'checkpoint', 26::numeric, current_date - 20, 'Progreso intermedio', NULL::int, NULL::numeric, NULL::int),
        ('Press de pecho', 'monthly', 28::numeric, current_date - 6, 'Mejora consolidada', NULL::int, NULL::numeric, NULL::int),
        ('Sit to stand 60s', 'baseline', 19::numeric, current_date - 35, 'Capacidad funcional inicial', NULL::int, NULL::numeric, 60::int),
        ('Sit to stand 60s', 'checkpoint', 22::numeric, current_date - 20, 'Mayor tolerancia', NULL::int, NULL::numeric, 60::int),
        ('Sit to stand 60s', 'monthly', 25::numeric, current_date - 6, 'Mejora muy visible', NULL::int, NULL::numeric, 60::int)
    ) AS x(test_name, phase, metric_value, recorded_on, notes, reps, load_kg, duration_seconds)
      ON b.client_id = v_client_id
     AND b.test_name = x.test_name;
  END IF;
END $$;
