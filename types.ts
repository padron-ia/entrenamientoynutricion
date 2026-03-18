export enum UserRole {
  ADMIN = 'admin',
  COACH = 'coach',
  HEAD_COACH = 'head_coach',
  CLIENT = 'client',
  CLOSER = 'closer',
  CONTABILIDAD = 'contabilidad',
  RRSS = 'rrss',
  SETTER = 'setter',
  DIRECCION = 'direccion',
  SUPER_ADMIN = 'super_admin'
}

export interface ClassSession {
  id: string;
  title: string;
  description: string;
  speaker: string;
  date: string;
  url?: string;
  category: 'Entrenamiento' | 'Nutrición' | 'Mindset' | 'General';
  is_recorded: boolean; // True = Pasada, False = Futura
}

export interface WeeklyCheckin {
  id: string;
  client_id: string;
  created_at: string;
  responses: Record<string, string>; // { "question_1": "Answer..." }
  rating?: number;
  status: 'pending_review' | 'reviewed';
  coach_notes?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string; // Legacy field
  avatar_url?: string; // DB field (Snake Case)
  photo_url?: string; // Legacy/Alternative field
  bio?: string;
  phone?: string;
  specialty?: string;
  instagram?: string;
  linkedin?: string;
  calendar_url?: string;
  birth_date?: string;
  address?: string;
  bank_account?: string; // Legacy - usar los campos detallados abajo

  // Datos bancarios para pagos
  bank_account_holder?: string; // Titular de la cuenta
  bank_account_iban?: string; // IBAN completo
  bank_name?: string; // Nombre del banco
  bank_swift_bic?: string; // Código SWIFT/BIC
  tax_id?: string; // NIF/DNI/CIF
  billing_address?: string; // Dirección fiscal

  commission_percentage?: number; // Porcentaje de comisión (0-100)
  price_per_client?: number; // Tarifa fija por cliente
  max_clients?: number; // Capacidad máxima de clientes
  items_sold?: number; // Para mostrar ranking en CRM
  permissions?: string[]; // Permisos granulares explícitos
  password?: string; // New field for authentication

  // Campos de rendimiento y compensación (coaches)
  tier?: 1 | 2 | 3; // Nivel: 1=Operativo(32.5€), 2=Avanzado(40€), 3=Alto Impacto(45€)
  is_exclusive?: boolean; // Exclusividad con la empresa
  tier_updated_at?: string; // Fecha última revisión de tier
  performance_notes?: string; // Notas sobre rendimiento/bonus
  internal_nps?: number; // NPS interno (0-10)
  task_compliance_rate?: number; // % cumplimiento de tareas (0-100)
  isMockSession?: boolean; // Indica si el login fue vía Master Pass (sin sesión real en Supabase)
  collegiate_number?: string; // Número de colegiado (para informes médicos)
}

export enum ClientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive', // Baja Normal
  PAUSED = 'paused',
  DROPOUT = 'dropout',   // Abandono
  COMPLETED = 'completed'
}

export interface MedicalData {
  pathologies?: string; // condiciones o lesiones relevantes para el entrenamiento
  medication?: string; // medicacion o suplementos actuales
  otherConditions?: string; // otras condiciones de salud relevantes
  initialSymptoms?: string; // síntomas iniciales (fatiga, insomnio, ansiedad, dolores)
  family_history?: string;
}

export interface NutritionData {
  planUrl?: string; // NUEVO: URL del PDF o Plan externo
  assigned_nutrition_type?: string; // NUEVO: Tipo de dieta asignado
  assigned_calories?: number;       // NUEVO: Calorías asignadas
  allergies?: string; // alergias_intolerancias
  otherAllergies?: string; // otras_alergias_detalle
  dislikes?: string; // alimentos_vetados
  preferences?: string; // preferencias_dieteticas
  consumedFoods?: string; // alimentos_consumidos_habitualmente
  cooksForSelf?: boolean; // cocina_propia
  eatsWithBread?: boolean; // acompanar_con_pan
  breadAmount?: string; // cantidad_pan
  waterIntake?: string; // bebida_en_comidas
  alcohol?: string; // consumo_alcohol
  cravings?: string; // tiene_antojos
  cravingsDetail?: string; // tipo_antojos
  snacking?: boolean; // picar_entre_horas
  snackingDetail?: string; // que_pica_entre_horas
  eatingDisorder?: string; // tca_diagnosticado
  eatingDisorderDetail?: string; // detalle_tca
  schedules?: {
    breakfast?: string;
    morningSnack?: string;
    lunch?: string;
    afternoonSnack?: string;
    dinner?: string;
  };
  mealsPerDay?: number; // numero_comidas_dia
  mealsOutPerWeek?: number; // veces_comer_fuera
  willingToWeighFood?: boolean; // pesar_comida
  dietaryNotes?: string; // comentarios_adicionales u otras_preferencias_detalle
  lastRecallMeal?: string; // recordatorio_24h
}

export interface TrainingData {
  activityLevel?: string; // tipo_trabajo
  stepsGoal?: number; // pasos_diarios
  strengthTraining?: boolean; // experiencia_fuerza
  trainingLocation?: string; // lugar_entrenamiento
  injuries?: string;
  notes?: string;
  availability?: string; // horario_disponibilidad
  assigned_program_id?: string; // ID del programa predefinido (aurum, calisthenics, etc)
  assigned_custom_program?: any; // Objeto JSON con el programa a medida
  sensations_report?: string; // property_reporte_sensaciones_entreno
}

export interface AssessmentTest {
  id: string;
  title: string;
  description: string;
  youtube_id: string;
  category: string;
  order_index: number;
}

export interface GoalsData {
  motivation?: string; // motivo_confianza
  goal_3_months?: string; // objetivo_3_meses
  goal_3_months_status?: 'pending' | 'achieved' | 'failed';
  goal_6_months?: string; // objetivo_6_meses
  goal_6_months_status?: 'pending' | 'achieved' | 'failed';
  goal_1_year?: string; // objetivo_1_anho
  goal_1_year_status?: 'pending' | 'achieved' | 'failed';
  weeklyGoal?: string;
  next4WeeksGoal?: string;
  possiblePhaseGoals?: string;
  successStory?: string;
  testimonial?: string;
  testimonialRecorded?: boolean;
  pathToSuccess?: string;
  roadmap_main_goal?: string;
  roadmap_commitment_score?: number;
  roadmap_data?: RoadmapData;
}

export interface SuccessMilestone {
  id: string;
  title: string;
  target_date: string;
  status: 'pending' | 'completed' | 'current';
  notes?: string;
  icon?: string;
}

export interface RoadmapObstacleSolutions {
  no_entrenamiento?: string;
  no_pasos?: string;
  no_comidas?: string;
  desmotivacion_general?: string;
}

export interface RoadmapCommitment {
  nombre?: string;
  pasos?: number;
  dias_ejercicio?: number;
  horario_ejercicio_dias?: string;
  horario_ejercicio_desde?: string;
  horario_ejercicio_hasta?: string;
  pesar_comida_compromiso?: string;
  reporte_telegram_compromiso?: string;
  fecha_compromiso?: string;
}

export interface AdjustedGoals {
  goal_3_months: string;
  goal_3_months_status: 'pending' | 'achieved' | 'failed';
  goal_6_months: string;
  goal_6_months_status: 'pending' | 'achieved' | 'failed';
  goal_1_year: string;
  goal_1_year_status: 'pending' | 'achieved' | 'failed';
  adjusted_at: string;
  original_from_anamnesis: {
    goal_3_months: string;
    goal_6_months: string;
    goal_1_year: string;
  };
}

export interface RoadmapData {
  milestones: SuccessMilestone[];
  dream_result?: {
    goal: string;
    perfect_day: string;
  };
  obstacle_solutions?: RoadmapObstacleSolutions;
  coach_agreements?: {
    client_response: string;
  };
  commitment?: RoadmapCommitment;
  adjusted_goals?: AdjustedGoals;
  last_updated: string;
}

export interface StrategicAlignment {
  alignmentPercent: number;
  completedMilestones: number;
  totalMilestones: number;
  isOnTrack: boolean;
  activePhaseIndex: number;
  deviationAlert?: string;
}

export interface ProgramData {
  phase: string;
  subPhase?: string;
  progressPhase?: string;
  programType?: string;

  // Specific Program Types per Phase
  type_f1?: string;
  type_f2?: string;
  type_f3?: string;
  type_f4?: string;

  // Fechas Clave Contrato
  contract1_name?: string;
  contract2_name?: string;
  contract3_name?: string;
  contract4_name?: string;
  contract5_name?: string;
  contract_signed?: boolean;
  contract_signed_at?: string;
  contract_signature_image?: string;
  contract_link?: string;
  contract_visible_to_client?: boolean;
  assigned_contract_template_id?: string;
  contract_content_override?: string;
  contract_date?: string;
  contract_amount?: number;
  contract_financing_installments?: number;
  contract_financing_amount?: number;

  f1_endDate?: string;

  f2_renewalDate?: string;
  f2_duration?: number;
  f2_endDate?: string;
  f2_monthRenewal?: string;
  f2_status_call?: string;
  f2_suggested_date?: string;
  f2_amount?: number;
  f2_payment_method?: string;
  f2_receipt_url?: string;

  f3_renewalDate?: string;
  f3_duration?: number;
  f3_endDate?: string;
  f3_monthRenewal?: string;
  f3_status_call?: string;
  f3_suggested_date?: string;
  f3_amount?: number;
  f3_payment_method?: string;
  f3_receipt_url?: string;

  f4_renewalDate?: string;
  f4_duration?: number;
  f4_endDate?: string;
  f4_monthRenewal?: string;
  f4_status_call?: string;
  f4_suggested_date?: string;
  f4_amount?: number;
  f4_payment_method?: string;
  f4_receipt_url?: string;

  f5_renewalDate?: string;
  f5_duration?: number;
  f5_endDate?: string;
  f5_monthRenewal?: string;
  f5_status_call?: string;
  f5_suggested_date?: string;
  f5_amount?: number;
  f5_payment_method?: string;
  f5_receipt_url?: string;

  // Tracking URLs
  url_onb_f1?: string;
  url_onb_f1_corrected?: string;
  url_grad_f1?: string;
  url_grad_f1_corrected?: string;
  url_opt_f1?: string;
  url_opt_f1_corrected?: string;

  url_onb_f2?: string;
  url_grad_f2?: string;
  url_opt_f2?: string;

  url_trim1_f3?: string;
  url_trim2_f3?: string;
  url_trim3_f3?: string;

  // Notes & Summaries
  summary_f1?: string;
  summary_f2?: string;
  summary_f3?: string;

  notes_onb_f1?: string;
  notes_grad_f1?: string;
  notes_opt_f1?: string;

  notes_obd_f2?: string;
  notes_grad_f2?: string;
  notes_opt_f2?: string;

  notes_trim1_f3?: string;
  notes_trim2_f3?: string;
  notes_trim3_f3?: string;

  // Status flags
  status_onb_f1?: string;
  status_grad_f2?: string;
  status_opt_f2?: string;
  status_trim1_f3?: string;
  status_trim2_f3?: string;
  status_trim3_f3?: string;
  status_objectives?: string;

  renewal_f2_contracted?: boolean;
  renewal_f3_contracted?: boolean;
  renewal_f4_contracted?: boolean;
  renewal_f5_contracted?: boolean;
  [key: string]: any;
}

export interface AnamnesisData {
  // Allergies & Habits
  alergias_medicamentos?: string;
  alergias_alimentos?: string;
  habito_tabaco?: string;
  consumo_alcohol?: string;
  consumo_ultraprocesados?: string;
  horas_sueno?: string;
  nivel_estres?: number;
  desencadenante_estres?: string;

  // Previous injuries & surgeries (relevant for training)
  enfermedades_previas?: string;
  cirugias_previas?: string;

  // Current medication & supplements
  tratamiento_actual_completo?: string;

  // Behavior & Digestion
  comer_emocional?: string;
  episodios_atracon?: string;
  tca_detalle?: string;
  calidad_sueno?: string;
  sueno_afecta_apetito?: boolean;
  problemas_digestivos?: string;
  analitica_urls?: string[];

  // Fitness History (Padron Trainer specific)
  historial_deportivo?: string;
  frecuencia_entrenamiento_previa?: string;
  tipo_entrenamiento_previo?: string;
  lesiones_cronicas?: string;
}

export interface Client {
  id: string;

  // Personal & Info
  firstName: string; // nombre
  surname: string; // apellidos
  name: string; // Full name for display
  email: string; // email
  idNumber?: string; // DNI / property_dni
  phone?: string; // telefono
  address?: string; // direccion_postal
  city?: string; // poblacion
  province?: string; // provincia
  zip?: string;
  instagram?: string;
  telegramId?: string;
  telegram_group_id?: string; // ID del grupo de seguimiento en Telegram (para automatizaciones)

  // Demographics
  age?: number; // edad
  ageVisual?: number;
  birthDate?: string; // fecha_nacimiento
  gender?: string; // sexo

  // Physical Stats
  height?: number; // altura_cm
  current_weight?: number; // peso_actual
  initial_weight?: number;
  target_weight?: number; // peso_objetivo
  lost_weight?: number; // Calculated field (Initial - Current)
  kg_to_goal?: number;
  abdominal_perimeter?: number; // perimetro_barriga_cm
  arm_perimeter?: number; // perimetro_brazo_cm
  thigh_perimeter?: number; // perimetro_muslo_cm
  last_weight_date?: string;

  // Contract & Status
  status: ClientStatus; // estado_cliente
  client_state?: string;

  registration_date?: string; // Fecha de Alta (Registro en BBDD)
  start_date: string; // Fecha Inicio Programa (Real)
  contract_end_date: string; // Fin Contrato Actual Calculado

  next_renewal_date?: string;
  next_renewal_accepted?: boolean;
  program_duration_months?: number; // meses_servicio_contratados (DURACION F1)
  next_program_duration_months?: number;
  start_next_contract_date?: string;

  coach_id: string; // entrenador_asignado
  property_coach?: string; // Nombre del coach para filtrado
  nutrition_plan_id?: string; // ID del plan nutricional asignado
  ltv?: number;
  payments_status?: string;
  unikey?: string;
  harbiz_profile?: string;
  high_ticket?: boolean;
  is_bot?: boolean;

  // CRM Tracking
  last_contact_date?: string;
  recontact_result?: string;
  recontact_notes?: string;

  // PAUSA (Nuevos campos)
  pauseDate?: string;
  pauseReason?: string;
  weeks_paused?: number;

  // Payment & Renewals
  renewal_payment_link?: string;
  renewal_payment_status?: 'none' | 'pending' | 'uploaded' | 'verified';
  renewal_receipt_url?: string;
  renewal_phase?: string;
  renewal_amount?: number;
  renewal_duration?: number;
  renewal_verified_at?: string;
  renewal_payment_method?: 'hotmart' | 'stripe' | 'transferencia'; // Método de pago seleccionado por el coach

  // FECHAS DE SALIDA
  abandonmentDate?: string; // fehc_abandono (Abandonos)
  abandonmentReason?: string; // property_motivo_abandono

  inactiveDate?: string; // property_mes_baja (Bajas normales)
  inactiveReason?: string; // property_motivo_baja

  call_warning?: string;
  next_call_date?: string;

  // NUEVO: Revisión Semanal
  weeklyReviewUrl?: string; // Loom link
  weeklyReviewDate?: string; // Fecha de la última revisión (por el coach)
  weeklyReviewComments?: string; // Comentarios adicionales del coach

  last_checkin_submitted?: string; // Fecha del último formulario enviado por el cliente
  last_checkin_status?: 'pending_review' | 'reviewed';
  last_checkin_id?: string;
  last_checkin_reviewed_at?: string; // Fecha en que el coach revisó el último check-in
  missed_checkins_count?: number; // Contador de revisiones fallidas
  last_checkin_missed_reason?: string; // Motivo por el que no ha enviado el check-in (proporcionado por el cliente)

  // Specific Notion Properties Mapped
  property_fecha_fin_contrato_actual?: { start: string } | string;
  property_fin_fase_1?: { start: string } | string;
  property_fin_contrato_f2?: { start: string } | string;
  property_fin_contrato_f3?: { start: string } | string;
  property_fin_contrato_f4?: { start: string } | string;
  property_fin_contrato_f5?: { start: string } | string;

  // Success Roadmap Fields
  roadmap_main_goal?: string;
  roadmap_commitment_score?: number;
  roadmap_data?: RoadmapData;

  // Sub-objects
  medical: MedicalData;
  nutrition: NutritionData;
  training: TrainingData;
  goals: GoalsData;
  program: ProgramData;

  // Nutrition Approval
  nutrition_approved?: boolean;
  nutrition_approved_at?: string;
  nutrition_approved_by?: string;

  general_notes?: string; // situaciones_conducta_alimentaria
  history?: string;
  history_food_behavior?: string;

  // Onboarding
  onboarding_token?: string;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string;
  onboarding_phase2_completed?: boolean;
  onboarding_phase2_completed_at?: string;
  first_opened_by_assigned_coach_at?: string;
  property_assessment_responses?: Record<string, any>;

  // Anamnesis (Phase 2 detailed medical history)
  anamnesis?: AnamnesisData;

  // Account Activation (for existing clients invitation)
  user_id?: string;
  activation_token?: string;
  activation_token_created_at?: string;

  // Coach Communication Fields (visible to client)
  next_appointment_date?: string;
  next_appointment_time?: string; // Hora de la cita (HH:mm)
  next_appointment_note?: string; // Motivo/descripción de la cita
  next_appointment_link?: string; // Enlace de reunión (Zoom, Meet, etc.)
  next_appointment_status?: string; // scheduled, completed, missed
  next_appointment_conclusions?: string; // Notas post-llamada del coach
  coach_message?: string;

  created_at: string;
  updated_at: string;
}


export interface Alert {
  type: 'expiration';
  clientId: string;
  clientName: string;
  daysRemaining: number;
  contractEndDate: string;
}

// --- MÓDULO: LLAMADAS DE RENOVACIÓN ---

export type RenewalCallStatus = 'pending' | 'scheduled' | 'completed' | 'no_answer' | 'cancelled';
export type RenewalCallResult = 'pending' | 'renewed' | 'not_renewed' | 'undecided';

export interface RenewalCall {
  id: string;
  client_id: string;
  coach_id: string;
  contract_end_date: string;
  alert_date: string;
  scheduled_call_date?: string;
  call_status: RenewalCallStatus;
  call_result: RenewalCallResult;
  call_notes?: string;
  recording_url?: string;
  renewal_phase?: string;
  not_renewed_reason?: string;
  created_at: string;
  updated_at: string;
  // Helpers for display
  client_name?: string;
  coach_name?: string;
  days_remaining?: number;
}

// --- NUEVAS ENTIDADES CRM EVOLUTION ---

export interface CoachTask {
  id: string;
  coach_id: string;
  client_id?: string;
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  client_name?: string; // Helper para visualización
}

export interface SupportTicket {
  id: string;
  client_id?: string;
  staff_id?: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category: 'nutricion' | 'entrenamiento' | 'tecnico_app' | 'facturacion' | 'otros';
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  client_name?: string; // Helper
  staff_name?: string; // Helper
  creator_name?: string; // Helper
}

export interface SupportTicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_name?: string; // Helper
  user_photo?: string; // Helper
}

export type NutritionSpecialRequestStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';
export type NutritionSpecialRequestPriority = 'normal' | 'high';

export interface NutritionSpecialRequest {
  id: string;
  client_id: string;
  created_by: string;
  assigned_to?: string | null;
  status: NutritionSpecialRequestStatus;
  priority: NutritionSpecialRequestPriority;
  request_reason: string;
  requested_changes: string;
  requested_goal: string;
  target_date?: string | null;
  coach_notes?: string | null;
  profile_snapshot: {
    client_name: string;
    age?: number | null;
    diseases?: string;
    pathologies?: string;
    medication?: string;
    allergies?: string;
    excluded_foods?: string;
    preferred_diet?: string;
    current_kcal?: number | null;
    desired_kcal?: number | null;
  };
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  client_name?: string;
  creator_name?: string;
  assigned_name?: string;
}

export type TrainingSpecialRequestStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';
export type TrainingSpecialRequestPriority = 'normal' | 'high';

export interface TrainingSpecialRequest {
  id: string;
  client_id: string;
  created_by: string;
  assigned_to?: string | null;
  status: TrainingSpecialRequestStatus;
  priority: TrainingSpecialRequestPriority;
  request_reason: string;
  requested_changes: string;
  requested_goal: string;
  target_date?: string | null;
  coach_notes?: string | null;
  profile_snapshot: {
    client_name: string;
    age?: number | null;
    activity_level?: string;
    steps_goal?: number | null;
    strength_experience?: string;
    training_location?: string;
    availability?: string;
    limitations?: string;
    equipment?: string;
    current_sessions_per_week?: number | null;
    desired_sessions_per_week?: number | null;
  };
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  client_name?: string;
  creator_name?: string;
  assigned_name?: string;
}


export interface CoachInvoice {
  id: string;
  coach_id: string;
  period_date: string;
  amount: number;
  invoice_url: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  admin_notes?: string;
  coach_notes?: string;
  submitted_at: string;
  updated_at: string;
  coach_name?: string; // Helper
}

export interface UnifiedNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'assignment' | 'checkin' | 'task' | 'system' | 'ticket';
  link?: string;
  read_at?: string;
  created_at: string;
}


export interface AuditLog {
  id: string;
  user_id?: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  target_table: string;
  target_id: string;
  changes?: Record<string, { old: any; new: any }>;
  created_at: string;
  user_name?: string; // Helper
}

// --- MODULE: LEADS (PRE-VENTA) ---

export type LeadStatus = 'NEW' | 'CONTACTED' | 'SCHEDULED' | 'WON' | 'LOST' | 'NO_SHOW' | 'CANCELLED' | 'RE-SCHEDULED' | 'NO_ENTRY';

export interface Lead {
  id: string;
  firstName: string;
  surname: string;
  name: string; // Helper: FullName
  email?: string;
  phone?: string;
  instagram_user?: string;
  status: LeadStatus;
  source: string; // 'Ads', 'Instagram', 'Referido', etc.
  notes?: string;
  assigned_to?: string; // User ID (Setter/Closer)
  closer_id?: string;   // User ID (Closer específico)
  last_contact_date?: string;
  next_followup_date?: string;
  created_at: string;
  updated_at?: string;

  // --- Campos Vitaminados (Notion Style) ---
  in_out?: 'Inbound' | 'Outbound';
  procedencia_detalle?: string;
  qualification_level?: number; // 1-5
  attended?: boolean; // Presentado
  objections?: string;
  recording_url?: string;
  sale_price?: number;
  commission_amount?: number;
  meeting_link?: string;
  closer_notes?: string;
  project?: 'PT';

  // --- NUEVOS CAMPOS (Notion Style) ---
  meeting_date?: string;  // Día de la agenda
  call_date?: string;     // Día de la llamada
  meeting_time?: string;   // Hora de la cita
  procedencia?: 'Instagram' | 'Formulario' | 'WhatsApp' | 'YouTube' | 'TikTok' | 'Otro';

  // Helpers
  assigned_to_name?: string;
}

// --- MODULE: PT CHAT ---

export interface ChatRoom {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  photo_url?: string;
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  created_by?: string;
  metadata?: Record<string, any>;

  // Helpers
  participants?: ChatParticipant[];
  unread_count?: number;
}

export interface ChatParticipant {
  room_id: string;
  user_id: string;
  joined_at: string;
  last_read_at?: string;

  // Helpers
  user_name?: string;
  user_photo?: string;
  user_role?: UserRole;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'file';
  file_url?: string;
  created_at: string;

  // Helpers
  sender_name?: string;
  sender_photo?: string;
}

export type GoalCompletionStatus = 'fulfilled' | 'partial' | 'not_fulfilled';
export type GoalReasonCategory = 'client' | 'goal' | 'context' | 'plan';
export type GoalReasonDetail =
  // Client reasons
  | 'not_actioned' | 'poor_organization' | 'demotivation' | 'not_understood'
  // Goal reasons
  | 'too_ambitious' | 'too_vague' | 'uncontrollable' | 'not_priority'
  // Context reasons
  | 'travel_event' | 'illness_injury' | 'work_personal_stress' | 'routine_change'
  // Plan reasons
  | 'nutrition_plan_mismatch' | 'training_not_viable' | 'lack_tools' | 'needs_more_support';

export interface CoachGoal {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  start_date?: string;
  deadline?: string;
  completed_at?: string;
  goal_type: 'weekly' | 'monthly' | 'custom';
  status: 'pending' | 'achieved' | 'failed';
  feedback?: string;
  failure_reason?: string;
  action_plan?: string;
  created_by?: string;
  created_at: string;
  // New fields for weekly assessment
  completion_status?: GoalCompletionStatus;
  reason_category?: GoalReasonCategory;
  reason_detail?: GoalReasonDetail;
  week_number?: number;
}

// --- MODULE: OPTIMIZATION SURVEY (PRE-RENEWAL CALL) ---

export interface CallPrepObjection {
  objection: string;
  response: string;
}

export interface CallPrep {
  achievements: string;
  difficulties_approach: string;
  proposal: string;
  proposal_reason: string;
  objections: CallPrepObjection[];
  call_goal: string;
}

export interface OptimizationSurvey {
  id: string;
  client_id: string;
  biggest_achievement?: string;
  biggest_challenge?: string;
  improvement_suggestions?: string;
  satisfaction_rating?: number;
  rating_reason?: string;
  has_referral?: boolean;
  referral_name?: string;
  referral_phone?: string;
  future_goals?: string;
  goal_feeling?: string;
  importance_rating?: number;
  additional_comments?: string;
  contract_phase?: string;
  contract_end_date?: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  coach_notes?: string;
  coach_proposal?: string;
  call_prep?: CallPrep;
  created_at: string;
}

// --- MODULE: WEEKLY COACH REVIEWS (VALORACIÓN SEMANAL) ---

export type WeekFeeling = 'green' | 'yellow' | 'red';
export type NextWeekDecision = 'maintain' | 'simplify' | 'change_approach';

export interface WeeklyCoachReview {
  id: string;
  client_id: string;
  coach_id: string;
  checkin_id?: string;
  week_start: string;
  week_number: number;
  feeling: WeekFeeling;
  next_week_decision: NextWeekDecision;
  coach_note?: string;
  goals_fulfilled: number;
  goals_partial: number;
  goals_not_fulfilled: number;
  created_at: string;
}

// --- MODULE: MONTHLY REVIEWS (REVISIÓN MENSUAL) ---

export type DirectionStatus = 'on_track' | 'at_risk' | 'off_track';
export type AlignmentStatus = 'aligned' | 'partial' | 'not_aligned';
export type MonthlyReason = 'adherence' | 'organization' | 'plan' | 'context' | 'expectations' | 'mixed';

export interface MonthlyReview {
  id: string;
  client_id: string;
  coach_id: string;
  month: string; // 'YYYY-MM'
  direction_status: DirectionStatus;
  alignment: AlignmentStatus;
  main_reason: MonthlyReason;
  achievements?: string;
  next_month_change?: string;
  // Auto-calculated
  weeks_reviewed: number;
  weeks_green: number;
  weeks_yellow: number;
  weeks_red: number;
  total_goals: number;
  goals_fulfilled: number;
  goals_partial: number;
  goals_not_fulfilled: number;
  process_score?: number;
  created_at: string;
}

// --- MODULE: QUARTERLY REVIEWS (REVISIÓN TRIMESTRAL / RENOVACIÓN) ---

export type ClientClassification = 'good_progress' | 'slow_steady' | 'irregular' | 'low_adherence' | 'technical_block';
export type QuarterlyRecommendation = 'continue' | 'simplify' | 'change_strategy' | 'redefine_goals' | 'do_not_renew';

export interface GoalEvaluation {
  goal_text: string;
  status: 'on_track' | 'partial' | 'not_achieved';
  reason?: string;
}

export interface QuarterlyReview {
  id: string;
  client_id: string;
  coach_id: string;
  renewal_call_id?: string;
  period_start: string;
  period_end: string;
  goal_evaluations: GoalEvaluation[];
  client_classification?: ClientClassification;
  recommendation?: QuarterlyRecommendation;
  pre_call_notes?: string;
  post_call_notes?: string;
  process_score?: number;
  created_at: string;
}

// --- MODULE: RISK ALERTS (SISTEMA ANTIABANDONO) ---

export type RiskAlertStatus = 'active' | 'resolved' | 'escalated';
export type RiskReasonCategory = 'no_response' | 'no_checkins' | 'not_following_plan' | 'demotivated' | 'personal_issues' | 'low_process_score' | 'other';

export interface ClientRiskAlert {
  id: string;
  client_id: string;
  coach_id: string;
  reason_category: RiskReasonCategory;
  notes?: string;
  status: RiskAlertStatus;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  // Helpers for display
  client_name?: string;
  coach_name?: string;
  resolved_by_name?: string;
}

// --- MODULE: NUTRITION PLANS ---

export type NutritionPlanStatus = 'draft' | 'published';
export type RecipeCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type DietType =
  | 'Flexible'
  | 'Definición'
  | 'Volumen'
  | 'Mantenimiento'
  | 'Recomposición Corporal'
  | 'Sin Gluten + Sin Lactosa'
  | 'Digestivo Sensible'
  | 'Vegetariano'
  | 'Sin Carne Roja'
  | 'Pescetariano'
  | 'Fácil / Baja Adherencia';


export type IngredientSection =
  | 'Pescadería'
  | 'Carnicería'
  | 'Frutería'
  | 'Lácteos'
  | 'Despensa'
  | 'Panadería'
  | 'Congelados'
  | 'Otros';

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  section?: IngredientSection;
}

// Weekly Planner types
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface WeeklyPlanSlot {
  day: number; // 0-6 (Lunes-Domingo)
  meal: MealSlot;
  recipeId: string | null;
}

export type WeeklyPlanGrid = WeeklyPlanSlot[];

export interface NutritionPlan {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  target_calories?: number;
  diet_type?: DietType;
  target_month?: number; // 1-12
  target_fortnight?: 1 | 2;
  instructions?: string;
  // Block Content Fields (Simple Mode)
  intro_content?: string;
  breakfast_content?: string;
  lunch_content?: string;
  dinner_content?: string;
  snack_content?: string;
  status: NutritionPlanStatus;
  published_at?: string;
  published_by?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Helpers
  recipes_count?: number;
  assigned_clients_count?: number;
}


export interface NutritionRecipe {
  id: string;
  plan_id: string;
  category: RecipeCategory;
  position: number;
  name: string;
  ingredients: RecipeIngredient[];
  preparation?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  image_url?: string;
  is_sos?: boolean;
  prep_time_minutes?: number;
  leftover_tip?: string;
  notes?: string;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientNutritionAssignment {
  id: string;
  client_id: string;
  plan_id: string;
  assigned_at: string;
  assigned_by?: string;
  // Helpers
  plan_name?: string;
  client_name?: string;
}

export interface ClientNutritionOverride {
  id: string;
  client_id: string;
  recipe_id: string;
  custom_name?: string;
  custom_ingredients?: RecipeIngredient[];
  custom_preparation?: string;
  custom_calories?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientFavoriteRecipe {
  id: string;
  client_id: string;
  recipe_id: string;
  plan_id: string;
  category: RecipeCategory;
  recipe_name?: string;
  plan_name?: string;
  plan_calories?: number;
  plan_diet_type?: string;
  created_at: string;
}

export interface NutritionAssignmentHistory {
  id: string;
  client_id: string;
  plan_id: string | null;
  plan_name: string | null;
  assigned_at: string;
  assigned_by?: string;
  replaced_at: string;
}

export interface NutritionPlanVersion {
  id: string;
  plan_id: string;
  version_number: number;
  snapshot: any;
  published_at: string;
}

export interface ClientMaterial {
  id: string;
  client_id: string;
  created_by: string;
  title: string;
  type: 'link' | 'document' | 'video';
  url: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;

  // Helpers
  creator_name?: string;
}

// --- MODULE: TRAINING ---

export type ExerciseMediaType = 'youtube' | 'vimeo' | 'image' | 'none';

export interface Exercise {
  id: string;
  name: string;
  media_type: ExerciseMediaType;
  media_url?: string;
  instructions?: string;
  muscle_main: string;
  muscle_secondary?: string[];
  equipment?: string[];
  movement_pattern?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  mechanics?: 'compound' | 'isolation';
  articulation?: 'single' | 'multi';
  tags?: string[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Workout {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  goal?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  blocks: WorkoutBlock[];
}

export interface WorkoutBlock {
  id: string;
  workout_id: string;
  name: string;
  description?: string;
  structure_type?: 'lineal' | 'superserie' | 'circuito';
  position: number;
  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  block_id: string;
  exercise_id: string;
  exercise?: Exercise;
  superset_id?: string;
  superset_rounds?: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
  position: number;
}

export interface TrainingProgram {
  id: string;
  name: string;
  description?: string;
  presentation?: string;
  objectives?: string;
  what_you_find?: string;
  difficulty?: string;
  target_audience?: string;
  weeks_count: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  days: ProgramDay[];
}

export interface ProgramDay {
  id: string;
  program_id: string;
  week_number: number;
  day_number: number;
  title?: string;
  description?: string;
  activities: ProgramActivity[];
}

export interface ProgramActivity {
  id: string;
  day_id: string;
  type: 'workout' | 'metrics' | 'photo' | 'form' | 'custom' | 'walking';
  activity_id?: string;
  workout_id?: string;
  workout?: Workout;
  title?: string;
  description?: string;
  position: number;
  color?: string;
  config?: Record<string, any>;
}

export interface ClientTrainingAssignment {
  id: string;
  client_id: string;
  program_id: string;
  start_date: string;
  assigned_by?: string;
  assigned_at?: string;
}

export interface ClientDayLog {
  id: string;
  client_id: string;
  day_id: string;
  completed_at: string;
  effort_rating?: number;
  notes?: string;
  duration_minutes?: number;
  exercises?: ClientExerciseLog[];
  created_at?: string;
  pre_fatigue?: number;
  pre_rpe_type?: string;
  pre_oxygen?: string;
  pre_pulse?: string;
  pre_bp_systolic?: string;
  pre_bp_diastolic?: string;
  safety_exclusion_data?: any;
  safety_sequelae_data?: any;
}

export interface ClientExerciseLog {
  id: string;
  log_id: string;
  workout_exercise_id: string;
  sets_completed?: number;
  reps_completed?: string;
  weight_used?: string;
  is_completed: boolean;
  created_at?: string;
}

export interface ClientActivityLog {
  id: string;
  client_id: string;
  activity_id: string;
  day_id: string;
  completed_at: string;
  data: Record<string, any>;
  created_at?: string;
}

export type StrengthProtocolType = 'rm_load' | 'amrap_reps' | 'hold_seconds' | 'reps_60s';

export interface ClientStrengthTestTemplate {
  id: string;
  name: string;
  protocol_type: StrengthProtocolType;
  metric_unit: string;
  category?: string;
  equipment?: string;
  is_default?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClientStrengthBenchmark {
  id: string;
  client_id: string;
  test_name: string;
  protocol_type: StrengthProtocolType;
  metric_unit: string;
  target_notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClientStrengthRecord {
  id: string;
  client_id: string;
  benchmark_id: string;
  phase: 'baseline' | 'monthly' | 'checkpoint';
  metric_value: number;
  metric_unit: string;
  source: 'coach' | 'client';
  recorded_by?: string;
  recorded_on: string;
  notes?: string;
  reps?: number;
  load_kg?: number;
  duration_seconds?: number;
  is_validated: boolean;
  validated_by?: string;
  validated_at?: string;
  created_at?: string;
}

// ============================================================================
// MODULO PRESENCIAL - "La Muralla Fit Boutique"
// ============================================================================

export interface GymServiceType {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_bookable_by_client: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GymBono {
  id: string;
  name: string;
  description?: string;
  sessions_count: number;
  price: number;
  currency: string;
  stripe_payment_link?: string;
  stripe_price_id?: string;
  paypal_payment_link?: string;
  paypal_plan_id?: string;
  compatible_service_type_ids: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  compatible_services?: GymServiceType[];
}

export type GymMemberType = 'presencial_grupo' | 'presencial_personal' | 'presencial_nutricion' | 'online' | 'mixto';
export type GymMemberStatus = 'active' | 'inactive' | 'paused';

export interface GymMember {
  id: string;
  user_id?: string;
  client_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  dni?: string;
  member_type: GymMemberType;
  status: GymMemberStatus;
  photo_url?: string;
  birth_date?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  medical_notes?: string;
  created_at: string;
  updated_at: string;
  full_name?: string;
  active_credits?: GymMemberCredit[];
  total_remaining_sessions?: number;
}

export interface GymMemberCredit {
  id: string;
  member_id: string;
  bono_id: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  valid_from: string;
  valid_until: string;
  payment_provider?: 'stripe' | 'paypal' | 'manual' | 'cash';
  payment_reference?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount_paid?: number;
  is_expired: boolean;
  created_at: string;
  updated_at: string;
  bono_name?: string;
}

export interface GymClassSlot {
  id: string;
  service_type_id: string;
  date: string;
  start_time: string;
  end_time: string;
  title?: string;
  coach_id?: string;
  capacity: number;
  is_cancelled: boolean;
  cancellation_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  service_type?: GymServiceType;
  coach_name?: string;
  current_bookings?: number;
  is_full?: boolean;
  user_reservation_status?: 'confirmed' | 'waitlisted' | null;
  user_reservation_id?: string;
}

export type GymReservationStatus = 'confirmed' | 'cancelled' | 'attended' | 'no_show' | 'waitlisted';

export interface GymReservation {
  id: string;
  member_id: string;
  class_slot_id: string;
  credit_id?: string;
  status: GymReservationStatus;
  cancelled_at?: string;
  cancellation_type?: 'client' | 'admin' | 'system';
  credit_returned: boolean;
  waitlist_position: number;
  auto_booked_at?: string;
  booked_by?: string;
  created_at: string;
  updated_at: string;
  class_slot?: GymClassSlot;
  member_name?: string;
}

export interface GymBonoPurchase {
  id: string;
  member_id: string;
  bono_id: string;
  credit_id?: string;
  amount: number;
  currency: string;
  payment_provider?: string;
  payment_reference?: string;
  payment_status: string;
  purchased_at: string;
  bono_name?: string;
  bono_sessions?: number;
}
