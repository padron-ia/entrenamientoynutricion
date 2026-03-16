import { Client, ClientStatus, User, UserRole, ClassSession, WeeklyCheckin, EndocrinoReview, MedicalReview, CoachTask, SupportTicket, SupportTicketComment, UnifiedNotification, AuditLog, CoachInvoice } from '../types';
import { supabase } from './supabaseClient';

const TABLE_NAME = 'clientes_pt_notion';

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Local Memory Fallback (for demos/dev without full DB)
let mockCheckins: WeeklyCheckin[] = [];

// --- MOCK DATA STORAGE ---
// --- MOCK DATA STORAGE ---
let clients: Client[] = []; // In-memory storage for clients
// Eliminado: medicalReviews ya no se usa como almacenamiento principal, se usa Supabase

// --- TRADUCTOR / MAPPER (De BBDD a App Types) ---

// Helper para buscar un valor en múltiples claves posibles (Robustez para Notion vs SQL y Tildes rotas)
const getVal = (row: any, keys: string[], fallback?: any): any => {
  if (!row) return fallback;

  // 1. Intento directo por performance
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }

  // 2. Intento insensible a mayúsculas y espacios (Nuclear robustness)
  const rowKeys = Object.keys(row);
  for (const searchKey of keys) {
    const normalizedSearch = searchKey.toLowerCase().trim();
    const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === normalizedSearch);
    if (foundKey) {
      const val = row[foundKey];
      if (val !== undefined && val !== null && val !== '') return val;
    }
  }

  return fallback;
};

// Helper para limpiar y parsear números robustamente (ej: "90 kg", "90,5", {number: 90})
const parseNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;

  // Si ya es número, devolverlo
  if (typeof val === 'number') return val;

  // Si es un objeto (caso raro de Notion API raw), intentar extraer valor
  if (typeof val === 'object') {
    if ('number' in val) return Number(val.number) || 0;
    return 0;
  }

  // Handle strings like "90 kg", "90,5" (spanish decimal), etc.
  const str = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
  return parseFloat(str) || 0;
};

// Helper SUPER ROBUSTO para limpiar Texto de Notion y JSONB arrays
const parseText = (val: any): string => {
  if (val === null || val === undefined) return '';

  // 1. Si ya es un objeto/array (JSONB nativo de Supabase)
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      if (val.length === 0) return '';
      // Recursión para cada elemento del array.
      // Filtramos vacíos y unimos con comas.
      return val.map(item => parseText(item)).filter(s => s.length > 0).join(', ');
    }

    // Objetos específicos de Notion
    if (val.plain_text) return String(val.plain_text);
    if (val.content) return String(val.content);
    if (val.name) return String(val.name);
    if (val.title) return String(val.title);
    if (val.text) return parseText(val.text);
    if (val.start) return String(val.start);
    // Link support
    if (val.url) return String(val.url);

    // Si es un objeto genérico sin claves conocidas, intentamos no devolver [object Object]
    return '';
  }

  // 2. Si es string
  if (typeof val === 'string') {
    const trimmed = val.trim();

    // Intentar parsear SIEMPRE si parece JSON (Array u Objeto), sin condiciones restrictivas
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseText(parsed); // Recursión con el valor parseado
      } catch (e) {
        // No es JSON válido, seguimos tratándolo como string normal
      }
    }

    // Limpieza final de comillas si el string era '"Texto"'
    return trimmed.replace(/^"|"$/g, '');
  }

  return String(val);
};

// Helper para convertir "Sí"/"No", "TRUE"/"FALSE" o booleanos directos
const toBool = (val: any): boolean => {
  if (val === true || val === 'TRUE' || val === 'true') return true;
  // Common Postgres returns
  if (val === 't' || val === 'T') return true;
  if (val === 1 || val === '1') return true;

  if (typeof val === 'string') {
    const v = val.toLowerCase().trim();
    if (v === 'sí' || v === 'si' || v === 'yes') return true;
    if (v === 'on' || v === 'checked') return true;
  }
  return false;
};

const toDateStr = (val: any, fallbackToNow = false): string => {
  if (!val) {
    return fallbackToNow ? new Date().toISOString().split('T')[0] : '';
  }

  // CASO NOTION JSON COMPLEX STUFF
  if (typeof val === 'object' && val !== null) {
    if (val.start) return val.start;
    if (val.date && val.date.start) return val.date.start;
    if (Array.isArray(val) && val.length > 0) return toDateStr(val[0], fallbackToNow);
  }

  // Clean string
  let str = String(val).trim();

  // Try standard ISO first (YYYY-MM-DD)
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;

  // Try parsing Spanish full date: "24 de enero de 2026" or "10 de noviembre de 2025"
  const monthsEs: Record<string, string> = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
    'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
    'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
  };

  const lowerStr = str.toLowerCase();
  // Regex for "DD de Month de YYYY" or "DD Month YYYY"
  const matchEs = lowerStr.match(/(\d{1,2})\s*(?:de)?\s*([a-z]+)\s*(?:de)?\s*(\d{4})/);

  if (matchEs) {
    const day = matchEs[1].padStart(2, '0');
    const monthText = matchEs[2];
    const year = matchEs[3];
    const monthNum = monthsEs[monthText];
    if (monthNum) {
      return `${year}-${monthNum}-${day}`;
    }
  }

  // Try Slash Format DD/MM/YYYY
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const d = parts[0].length <= 2
        ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` // DD/MM/YYYY -> YYYY-MM-DD
        : str; // Assume YYYY/MM/DD ?? unlikely but safe fallback

      // Verify it's a valid date
      const date = new Date(d);
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    }
  }

  // Fallback to JS Date parser (works for "2025-01-01" etc)
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return fallbackToNow ? new Date().toISOString().split('T')[0] : '';
};

// Objeto para agrupar servicios de cliente
export const clientService = {
  getClients: async (): Promise<Client[]> => {
    try {
      // 1. Fetch raw clients
      const { data: rawClients, error: clientsError } = await supabase
        .from(TABLE_NAME)
        .select('*');

      if (clientsError) {
        console.error('Error fetching raw clients:', clientsError);
        return [];
      }

      // 2. Fetch assignments separately (to avoid PGRST200 join issues)
      const { data: assignments, error: assignmentsError } = await supabase
        .from('client_nutrition_assignments')
        .select('client_id, plan_id');

      // 3. Fetch published plans for auto-assignment
      const { data: plans } = await supabase
        .from('nutrition_plans')
        .select('id, diet_type, target_calories, target_month, target_fortnight, status')
        .eq('status', 'published');

      // 4. Fetch active period for auto-assignment
      const { data: settings } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['nutrition_active_month', 'nutrition_active_fortnight']);

      // Parse active period
      let activeMonth = 0;
      let activeFortnight = 0;
      if (settings) {
        activeMonth = parseInt(settings.find(s => s.setting_key === 'nutrition_active_month')?.setting_value || '0');
        activeFortnight = parseInt(settings.find(s => s.setting_key === 'nutrition_active_fortnight')?.setting_value || '0');
      }

      // Map basic clients
      const mapped = (rawClients || []).map(mapRowToClient);

      // Join assignments in memory
      const assignmentMap = new Map(assignments?.map(a => [a.client_id, a.plan_id]) || []);

      mapped.forEach(c => {
        // Priority 1: Manual Assignment
        if (assignmentMap.has(c.id)) {
          c.nutrition_plan_id = assignmentMap.get(c.id);
        }
        // Priority 2: Automatic Assignment (if approved and has requirements)
        else if (c.nutrition_approved && c.nutrition?.assigned_nutrition_type && c.nutrition?.assigned_calories && activeMonth > 0) {
          const autoPlan = plans?.find(p =>
            p.diet_type === c.nutrition.assigned_nutrition_type &&
            p.target_calories === c.nutrition.assigned_calories &&
            p.target_month === activeMonth &&
            p.target_fortnight === activeFortnight
          );
          if (autoPlan) {
            c.nutrition_plan_id = autoPlan.id;
          }
        }
      });

      return mapped;
    } catch (err) {
      console.error('Critical error in getClients:', err);
      return [];
    }
  },
  getClientById: async (id: string): Promise<Client | null> => {
    try {
      const { data: clientData, error: clientError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();

      if (clientError || !clientData) return null;

      // 1. Fetch manual assignment
      const { data: assignData } = await supabase
        .from('client_nutrition_assignments')
        .select('plan_id')
        .eq('client_id', id)
        .maybeSingle();

      const mapped = mapRowToClient(clientData);

      if (assignData?.plan_id) {
        mapped.nutrition_plan_id = assignData.plan_id;
      } else if (mapped.nutrition_approved && mapped.nutrition?.assigned_nutrition_type && mapped.nutrition?.assigned_calories) {
        // 2. Fetch auto-assignment if manual fails
        const { data: settings } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['nutrition_active_month', 'nutrition_active_fortnight']);

        let activeMonth = 0;
        let activeFortnight = 0;
        if (settings) {
          activeMonth = parseInt(settings.find(s => s.setting_key === 'nutrition_active_month')?.setting_value || '0');
          activeFortnight = parseInt(settings.find(s => s.setting_key === 'nutrition_active_fortnight')?.setting_value || '0');
        }

        if (activeMonth > 0) {
          const { data: autoPlan } = await supabase
            .from('nutrition_plans')
            .select('id')
            .eq('status', 'published')
            .eq('diet_type', mapped.nutrition.assigned_nutrition_type)
            .eq('target_calories', mapped.nutrition.assigned_calories)
            .eq('target_month', activeMonth)
            .eq('target_fortnight', activeFortnight)
            .limit(1)
            .maybeSingle();

          if (autoPlan) {
            mapped.nutrition_plan_id = autoPlan.id;
          }
        }
      }
      return mapped;
    } catch (err) {
      return null;
    }
  }
};

const normalizePhone = (phone: string) => {
  return phone.replace(/[^\d]/g, '');
};

export const mapRowToClient = (row: any): Client => {
  // DEBUG: Inspect raw row from DB
  if (row.assigned_nutrition_type || row.assigned_calories) {
    console.log('Row from DB has nutrition:', {
      id: row.id,
      type: row.assigned_nutrition_type,
      cals: row.assigned_calories
    });
  } else {
    // Log occasionally or for specific known IDs to avoid spam, but for now log all misses if relevant
    // console.log('Row missing nutrition columns:', row.id);
  }
  // --- 1. ESTADO DEL CLIENTE (Prioridad Máxima: Notion Property) ---
  const rawNotionStatus = getVal(row, ['property_estado_cliente']);
  const notionStatus = parseText(rawNotionStatus).toLowerCase().trim();

  // Si Notion tiene un estado claro, lo usamos y PUNTO. No buscamos en fallbacks.
  let rowStatus = notionStatus;

  // Solo si Notion está vacío, buscamos en otras columnas (migraciones antiguas)
  if (!rowStatus) {
    const fallbackStatus = getVal(row, ['property_estado', 'estado_cliente', 'Estado']);
    rowStatus = parseText(fallbackStatus).toLowerCase().trim();
  }

  let status = ClientStatus.INACTIVE;
  if (rowStatus.includes('pausa') || rowStatus.includes('paused')) status = ClientStatus.PAUSED;
  else if (rowStatus.includes('abandono') || rowStatus.includes('dropout')) status = ClientStatus.DROPOUT;
  else if (rowStatus.includes('baja') || rowStatus.includes('inactivo') || rowStatus.includes('cancelado')) status = ClientStatus.INACTIVE;
  else if (rowStatus.includes('activo') || rowStatus.includes('active') || rowStatus.includes('alta') || rowStatus.includes('matriculado')) status = ClientStatus.ACTIVE;
  else if (rowStatus.includes('completado') || rowStatus.includes('graduado')) status = ClientStatus.COMPLETED;
  else {
    status = ClientStatus.INACTIVE;
  }

  // --- 2. FECHAS BASE (FASE 1) ---
  const registrationDate = toDateStr(getVal(row, ['property_fecha_alta', 'property_fecha_de_alta']), true);

  // SQL schema strict: property_inicio_programa (DATE)
  const f1StartStr = toDateStr(row['property_inicio_programa'] || row['Inicio programa'] || row['property_inicio_de_programa'] || row['inicio_programa'], false);


  // SQL schema strict: property_contratado_f1 (text)
  const f1DurationRaw = getVal(row, [
    'property_contratado_f1',
    'property_meses_servicio_contratados',
    'Contratado F1',
    'program_duration_months'
  ]);

  const parseDuration = (val: any) => {
    const txt = parseText(val);
    const match = txt.match(/(\d+([.,]\d+)?)/);
    return match ? parseFloat(match[0].replace(',', '.')) : 0;
  };

  const f1Duration = parseDuration(f1DurationRaw);
  const savedProgram = row['program'] || {};

  const getRenFlag = (keys: string[], fallback: boolean) => {
    const val = getVal(row, keys);
    return val !== undefined ? toBool(val) : fallback;
  };

  // Variables Scoped for reuse in Program Object
  const isRenF2 = getRenFlag(['property_renueva_f2', 'Renueva F2', 'renueva_f2', 'property_renovacion_f2'], savedProgram.renewal_f2_contracted);
  const isRenF3 = getRenFlag(['property_renueva_f3', 'Renueva F3', 'renueva_f3', 'property_renovacion_f3'], savedProgram.renewal_f3_contracted);
  const isRenF4 = getRenFlag(['property_renueva_f4', 'Renueva F4', 'renueva_f4', 'property_renovacion_f4'], savedProgram.renewal_f4_contracted);
  const isRenF5 = getRenFlag(['property_renueva_f5', 'Renueva F5', 'renueva_f5', 'property_renovacion_f5'], savedProgram.renewal_f5_contracted);

  const f2DurationCol = parseDuration(getVal(row, ['property_contratado_renovaci_n_f2', 'Contratado Renovación F2', 'property_contratado_f2', 'contratado_f2', 'meses_f2', 'property_meses_servicio_contratados', 'property_duraci_n_contrato_actual'], savedProgram.f2_duration));
  const f3DurationCol = parseDuration(getVal(row, ['property_contratado_renovaci_n_f3', 'Contratado Renovación F3', 'property_contratado_f3', 'contratado_f3', 'meses_f3'], savedProgram.f3_duration));
  const f4DurationCol = parseDuration(getVal(row, ['property_contratado_renovaci_n_f4', 'Contratado Renovación F4', 'property_contratado_f4', 'contratado_f4', 'meses_f4'], savedProgram.f4_duration));
  const f5DurationCol = parseDuration(getVal(row, ['property_contratado_renovaci_n_f5', 'Contratado Renovación F5', 'property_contratado_f5', 'contratado_f5', 'meses_f5'], savedProgram.f5_duration));

  // --- 3. CÁLCULO DE FASE ACTUAL (CASCADA) ---
  let currentPhaseStart = f1StartStr;
  let currentPhaseDuration = f1Duration;
  let currentPhaseEnd = '';

  const addMonths = (dateStr: string, months: number): string => {
    if (!dateStr) return '';
    if (months <= 0) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setMonth(d.getMonth() + Number(months));
    // IMPORTANTE: Para que cuadre con Notion, restamos 1 día (ej: 04/02 + 4 meses = 04/06. Pero el contrato suele ser hasta el 03/06)
    // Sin embargo, Notion dice 4 de junio. Así que respetamos lo que el usuario ve.
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    // Ajuste para Notion: si termina el día 4 y empezó el día 4, son meses exactos
    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    // Si el día de fin es igual o mayor al de inicio, devolvemos los meses
    return months > 0 ? months : 0;
  };

  // Calculamos Fechas Intermedias (Necesarias para el objeto program)
  // Intentamos obtener las fechas directamente de las columnas de Notion si existen
  let f1EndDate = toDateStr(getVal(row, ['property_fin_fase_1'])) || addMonths(f1StartStr, f1Duration || 6);

  let f2Start = toDateStr(getVal(row, ['property_renovaci_n_f2_nueva', 'property_fecha_agendada_renovaci_n_f2'])) || f1EndDate;
  let f2End = toDateStr(getVal(row, ['property_fin_contrato_f2'])) || addMonths(f2Start, f2DurationCol);
  const f2FinalDuration = f2DurationCol || calculateDuration(f2Start, f2End);

  // SOLO proyectamos fases futuras si la fase anterior está contratada (isRenF2, isRenF3, etc.)
  let f3Start = isRenF2 ? (toDateStr(getVal(row, ['property_renovaci_n_f3', 'property_fecha_agendada_renovaci_n_f3'])) || f2End) : '';
  let f3End = isRenF2 ? (toDateStr(getVal(row, ['property_fin_contrato_f3'])) || addMonths(f3Start, f3DurationCol)) : '';
  const f3FinalDuration = f3DurationCol || calculateDuration(f3Start, f3End);

  let f4Start = isRenF3 ? (toDateStr(getVal(row, ['property_renovaci_n_f4', 'property_fecha_agendada_renovaci_n_f4'])) || f3End) : '';
  let f4End = isRenF3 ? (toDateStr(getVal(row, ['property_fin_contrato_f4'])) || addMonths(f4Start, f4DurationCol)) : '';
  const f4FinalDuration = f4DurationCol || calculateDuration(f4Start, f4End);

  // CRITICAL FIX: F5 solo debe tener fechas si F5 está CONTRATADA (isRenF5)
  // No si F4 está contratada (isRenF4) - eso genera fechas fantasma
  let f5Start = isRenF5 ? (toDateStr(getVal(row, ['property_renovaci_n_f5', 'property_fecha_agendada_renovaci_n_f5'])) || f4End) : '';
  let f5End = isRenF5 ? (toDateStr(getVal(row, ['property_fin_contrato_f5'])) || addMonths(f5Start, f5DurationCol)) : '';
  const f5FinalDuration = f5DurationCol || calculateDuration(f5Start, f5End);

  let runningEndDate = f1EndDate;

  // Prioridad máxima: Columna maestra de fin de contrato de la base de datos
  const masterEndDate = toDateStr(getVal(row, ['property_fecha_fin_contrato_actual']));
  currentPhaseEnd = masterEndDate || runningEndDate;

  // --- LÓGICA CASCADA DE ACTUALIZACIÓN ---
  if (isRenF2 && f1EndDate) {
    // Si tenemos fechas explícitas en la BBDD las usamos, si no calculamos
    currentPhaseStart = f2Start;
    currentPhaseDuration = f2FinalDuration;
    runningEndDate = f2End;
    if (!masterEndDate) currentPhaseEnd = runningEndDate;

    if (isRenF3 && runningEndDate) {
      currentPhaseStart = f3Start;
      currentPhaseDuration = f3FinalDuration;
      runningEndDate = f3End;
      if (!masterEndDate) currentPhaseEnd = runningEndDate;

      if (isRenF4 && runningEndDate) {
        currentPhaseStart = f4Start;
        currentPhaseDuration = f4FinalDuration;
        runningEndDate = f4End;
        if (!masterEndDate) currentPhaseEnd = runningEndDate;

        if (isRenF5 && runningEndDate) {
          currentPhaseStart = f5Start;
          currentPhaseDuration = f5FinalDuration;
          runningEndDate = f5End;
          if (!masterEndDate) currentPhaseEnd = runningEndDate;
        }
      }
    }
  }

  // --- DATOS GLOBALES DEL CLIENTE (SEGÚN SCHEMA SQL) ---
  // Buscamos fechas de salida usando los nombres exactos del schema publico
  const inactiveDate = toDateStr(getVal(row, ['property_fecha_de_baja', 'property_fecha_baja', 'property_mes_baja']), false);
  const inactiveReason = parseText(getVal(row, ['property_motivo_baja', 'motivo_baja']));
  const abandonmentDate = toDateStr(getVal(row, ['property_fecha_abandono', 'property_fehc_abandono', 'fehc_abandono']), false);
  const abandonmentReason = parseText(getVal(row, ['property_motivo_abandono', 'motivo_abandono']));
  const pauseDate = toDateStr(getVal(row, ['property_fecha_pausa', 'fecha_pausa']), false);
  const pauseReason = parseText(getVal(row, ['property_motivo_pausa', 'motivo_pausa']));

  // START_DATE final que se enviará al frontend
  const finalStartDate = currentPhaseStart;
  const finalEndDate = currentPhaseEnd;
  const finalDuration = currentPhaseDuration;

  // Variables necesarias más abajo
  const programStartDate = toDateStr(f1StartStr, false);
  const currentWeight = parseNumber(getVal(row, ['property_peso_actual', 'peso_actual']));
  const initialWeight = parseNumber(getVal(row, ['property_peso_inicial', 'peso_inicial']));
  const targetWeight = parseNumber(getVal(row, ['property_peso_objetivo', 'peso_objetivo']));
  const calcLostWeight = (initialWeight > 0 && currentWeight > 0) ? parseFloat((initialWeight - currentWeight).toFixed(1)) : 0;

  // Separar correctamente coach_id (UUID) y property_coach (nombre)
  const rawCoachId = parseText(getVal(row, ['coach_id']));
  const rawPropertyCoach = parseText(getVal(row, ['property_coach', 'Coach', 'entrenador_asignado', 'property_entrenador_asignado']));

  // Determinar el coach_id (UUID) - Prioridad absoluta a UUID real
  const coachUUID = isUUID(rawCoachId) ? rawCoachId : (isUUID(rawPropertyCoach) ? rawPropertyCoach : rawCoachId);

  // Determinar el nombre del coach (NUNCA permitir UUID aquí)
  const coachName = (!isUUID(rawPropertyCoach) && rawPropertyCoach)
    ? rawPropertyCoach
    : (!isUUID(rawCoachId) && rawCoachId)
      ? rawCoachId
      : ''; // Si no hay nombre limpio, dejar vacío para que el frontend resuelva por ID


  // --- 4. SALUD & PATOLOGÍAS ---
  // PRIORIZAMOS property_enfermedades
  const rawPatologias = parseText(getVal(row, [
    'property_enfermedades',
    'property_enfermedades_actuales',
    'property_patolog_as',
    'property_patologias',
    'patologias',
    'enfermedades_actuales',
    'property_patolog_a'
  ]));

  const rawInfoCliente = parseText(getVal(row, ['property_info_cliente', 'info_cliente']));

  // Lógica Determinación Diabetes
  const determineDiabetesType = (): 'Type 1' | 'Type 2' | 'Gestational' | 'Prediabetes' | 'N/A' => {
    const combinedText = (rawPatologias + ' ' + rawInfoCliente).toLowerCase();
    if (combinedText.match(/(tipo\s*1|type\s*1|t1|dm1|dt1|lada)/i)) return 'Type 1';
    if (combinedText.match(/(tipo\s*2|type\s*2|t2|dm2|dt2)/i)) return 'Type 2';
    if (combinedText.match(/(gestacional|gestational)/i)) return 'Gestational';
    if (combinedText.match(/(prediabetes|pre-diabetes)/i)) return 'Prediabetes';
    return 'N/A';
  };

  const diabetesType = determineDiabetesType();

  // Si rawPatologias está vacío pero detectamos diabetes en info_cliente, lo rellenamos
  let finalPathologies = rawPatologias;
  if (!finalPathologies && diabetesType !== 'N/A') {
    finalPathologies = `Diabetes ${diabetesType}`;
  }

  const rawOtherConditions = parseText(getVal(row, [
    'property_otras_enfermedades_o_condicionantes',
    'property_otras_patologias',
    'otras_enfermedades_detalle',
    'property_otras_enfermedades'
  ]));

  const rawMedication = parseText(getVal(row, [
    'property_medicaci_n',
    'property_medicacion',
    'medicacion_diaria',
    'property_medicacion_diaria'
  ]));

  // NEW FIELDS
  const weeklyReviewUrl = parseText(getVal(row, ['property_video_revision', 'property_revision_semanal', 'weeklyReviewUrl']));
  const weeklyReviewDate = toDateStr(getVal(row, ['property_fecha_revision', 'weeklyReviewDate']), false);
  const nutritionPlanUrl = parseText(getVal(row, ['property_plan_nutricional', 'property_plan_pdf', 'planUrl']));

  return {
    id: String(row['id'] || Math.random().toString()),
    nutrition_plan_id: (Array.isArray(row.client_nutrition_assignments)
      ? row.client_nutrition_assignments[0]?.plan_id
      : row.client_nutrition_assignments?.plan_id) || undefined,
    firstName: parseText(getVal(row, ['property_nombre', 'nombre', 'firstName'])),
    surname: parseText(getVal(row, ['property_apellidos', 'apellidos', 'surname'])),
    name: `${parseText(getVal(row, ['property_nombre', 'nombre']))} ${parseText(getVal(row, ['property_apellidos', 'apellidos']))}`.trim() || 'Sin Nombre',
    email: parseText(getVal(row, ['property_correo_electr_nico', 'property_email', 'email'])),
    idNumber: parseText(getVal(row, ['property_dni', 'dni', 'idNumber'])),
    phone: parseText(getVal(row, ['property_tel_fono', 'property_telefono', 'telefono'])),
    address: parseText(getVal(row, ['property_direccion', 'property_direcci_n', 'property_direccion_postal'])),
    city: parseText(getVal(row, ['property_poblacion', 'property_poblaci_n', 'property_ciudad'])),
    province: parseText(getVal(row, ['property_provincia', 'provincia'])),

    age: parseNumber(getVal(row, ['property_edad', 'edad'])),
    ageVisual: parseNumber(getVal(row, ['property_edad_vista', 'edad_vista'])),
    birthDate: toDateStr(getVal(row, ['property_fecha_de_nacimiento', 'fecha_nacimiento'])),
    gender: parseText(getVal(row, ['property_sexo', 'sexo'])),
    hormonal_status: parseText(getVal(row, ['hormonal_status'])) as any || undefined,
    average_cycle_length: parseNumber(getVal(row, ['average_cycle_length'])) || undefined,
    hrt_treatment: parseText(getVal(row, ['hrt_treatment'])) || undefined,
    last_period_start_date: toDateStr(getVal(row, ['last_period_start_date'])) || undefined,

    height: parseNumber(getVal(row, ['property_altura', 'altura_cm'])),
    current_weight: currentWeight,
    initial_weight: initialWeight,
    target_weight: targetWeight,
    lost_weight: calcLostWeight,
    abdominal_perimeter: parseNumber(getVal(row, ['property_per_metro_abdomen', 'property_per_metro_barriga'])),
    arm_perimeter: parseNumber(getVal(row, ['property_per_metro_brazo'])),
    thigh_perimeter: parseNumber(getVal(row, ['property_per_metro_muslo'])),

    status: status,
    registration_date: registrationDate,
    start_date: f1StartStr,

    abandonmentDate, abandonmentReason,
    inactiveDate, inactiveReason,
    pauseDate, pauseReason,

    contract_end_date: finalEndDate, // Current Active End Date
    program_duration_months: f1Duration, // ALWAYS Phase 1 Duration
    coach_id: coachUUID, // UUID del coach
    property_coach: coachName, // Nombre del coach para mostrar en UI
    allow_endocrine_access: toBool(getVal(row, ['allow_endocrine_access'])),

    // Specific Notion Properties Mapped (For Alerts)
    property_fecha_fin_contrato_actual: finalEndDate,
    property_fin_fase_1: f1EndDate,
    property_fin_contrato_f2: f2End,
    property_fin_contrato_f3: f3End,
    property_fin_contrato_f4: f4End,
    property_fin_contrato_f5: f5End,
    // NEW: Weekly Review
    weeklyReviewUrl: weeklyReviewUrl,
    weeklyReviewDate: weeklyReviewDate,

    // Success Roadmap Fields
    roadmap_main_goal: parseText(getVal(row, ['roadmap_main_goal'])),
    roadmap_commitment_score: parseNumber(getVal(row, ['roadmap_commitment_score'])),
    roadmap_data: getVal(row, ['roadmap_data']),

    medical: {
      diabetesType: diabetesType,
      insulin: parseText(getVal(row, ['property_insulina', 'usa_insulina'])),
      insulinBrand: parseText(getVal(row, ['property_marca_insulina', 'marca_insulina'])),
      insulinDose: parseText(getVal(row, ['property_dosis', 'dosis_insulina'])),
      insulinTime: parseText(getVal(row, ['property_hora_inyecci_n', 'property_hora_inyeccion'])),
      useSensor: toBool(getVal(row, ['property_usa_sensor_free_style', 'usa_sensor_freestyle'])),
      lastHba1c: String(getVal(row, ['property_ultima_glicosilada_hb_a1c', 'property_ultima_glicosilada_hba1c']) || ''),
      glucoseFastingCurrent: String(getVal(row, ['property_glucosa_en_ayunas_actual', 'glucosa_ayunas']) || ''),
      pathologies: finalPathologies,
      medication: rawMedication,
      otherConditions: rawOtherConditions,
      specialSituations: parseText(getVal(row, ['property_situaciones_especiales'])),
      initialSymptoms: parseText(getVal(row, ['property_sintomas'])),
      hormonal_cycle: parseText(getVal(row, ['property_estado_ciclo', 'hormonal_cycle'])),
      hormonal_duration: parseText(getVal(row, ['property_duracion_ciclo', 'hormonal_duration'])),
      contraceptives: parseText(getVal(row, ['property_anticonceptivos', 'contraceptives'])),
      hormonal_variability: parseText(getVal(row, ['property_variabilidad_hormonal', 'hormonal_variability'])),
      hormonal_notes: parseText(getVal(row, ['property_notas_hormonales', 'hormonal_notes'])),
      family_history: parseText(getVal(row, ['property_antecedentes_familiares', 'family_history'])),
    },

    nutrition: {
      planUrl: nutritionPlanUrl,
      assigned_nutrition_type: parseText(getVal(row, ['assigned_nutrition_type'])) || 'Flexible',
      assigned_calories: parseNumber(getVal(row, ['assigned_calories'])) || 1400,
      cooksForSelf: toBool(getVal(row, ['property_cocina_l_mismo', 'property_cocina__l_mismo', 'property_cocina_propia'])),
      willingToWeighFood: toBool(getVal(row, ['property_dispuesto_a_pesar_comida', 'pesar_comida'])),
      mealsOutPerWeek: parseNumber(getVal(row, ['property_comidas_fuera_de_casa_semanales', 'veces_comer_fuera'])),
      mealsPerDay: parseNumber(getVal(row, ['property_n_mero_comidas_al_d_a', 'property_numero_comidas'])),
      eatsWithBread: toBool(getVal(row, ['property_come_con_pan', 'acompanar_con_pan'])),
      breadAmount: parseText(getVal(row, ['property_cantidad_pan', 'cantidad_pan'])),
      alcohol: parseText(getVal(row, ['property_consumo_de_alcohol', 'consumo_alcohol'])),
      waterIntake: parseText(getVal(row, ['property_bebida_en_la_comida', 'bebida_en_comidas'])),
      allergies: parseText(getVal(row, ['property_alergias_intolerancias', 'alergias_intolerancias'])),
      otherAllergies: parseText(getVal(row, ['property_otras_alergias_o_intolerancias', 'otras_alergias_detalle'])),
      dislikes: parseText(getVal(row, ['property_alimentos_a_evitar_detalle', 'alimentos_vetados'])),
      consumedFoods: parseText(getVal(row, ['property_alimentos_consumidos', 'alimentos_consumidos_habitualmente'])),
      cravings: parseText(getVal(row, ['property_tiene_antojos', 'tiene_antojos'])),
      cravingsDetail: parseText(getVal(row, ['property_especificar_antojos', 'tipo_antojos'])),
      snacking: toBool(getVal(row, ['property_pica_entre_horas', 'picar_entre_horas'])),
      snackingDetail: parseText(getVal(row, ['property_especificar_pica_entre_horas', 'que_pica_entre_horas'])),
      eatingDisorder: parseText(getVal(row, ['property_trastorno_alimenticio_diagnosticado', 'tca_diagnosticado'])),
      eatingDisorderDetail: parseText(getVal(row, ['property_especificar_trastorno_alimenticio', 'detalle_tca'])),
      dietaryNotes: parseText(getVal(row, ['property_notas_diet_ticas_espec_ficas', 'comentarios_adicionales'])),
      lastRecallMeal: parseText(getVal(row, ['property_ltima_comida_recuerdo', 'recordatorio_24h'])),
      preferences: parseText(getVal(row, ['property_preferencias_diet_ticas_generales', 'preferencias_dieteticas'])),

      schedules: {
        breakfast: String(getVal(row, ['property_horario_desayuno', 'hora_desayuno']) || ''),
        lunch: String(getVal(row, ['property_horario_almuerzo', 'hora_almuerzo']) || ''),
        dinner: String(getVal(row, ['property_horario_cena', 'hora_cena']) || ''),
        afternoonSnack: String(getVal(row, ['property_horario_merienda', 'hora_merienda']) || ''),
        morningSnack: String(getVal(row, ['property_horario_media_ma_ana', 'property_horario_media_manana']) || '')
      }
    },

    training: {
      activityLevel: parseText(getVal(row, ['property_actividad_f_sica_general_cliente', 'tipo_trabajo'])),
      stepsGoal: parseNumber(getVal(row, ['property_pasos_diarios_promedio', 'pasos_diarios'])),
      strengthTraining: toBool(getVal(row, ['property_ejercicio_fuerza', 'experiencia_fuerza'])),
      trainingLocation: parseText(getVal(row, ['property_lugar_entreno', 'lugar_entrenamiento'])),
      availability: parseText(getVal(row, ['property_horario_disponibilidad', 'horario_disponibilidad'])),
      sensations_report: parseText(getVal(row, ['property_reporte_sensaciones_entreno'])),
      assigned_program_id: parseText(getVal(row, ['assigned_program_id', 'id_programa_asignado'])),
      assigned_custom_program: getVal(row, ['assigned_custom_program', 'programa_personalizado_asignado']) || undefined,
    },

    goals: {
      motivation: parseText(getVal(row, ['property_motivo_contrataci_n', 'property_motivo_confianza'])),
      goal_3_months: parseText(getVal(row, ['property_3_meses', 'property_objetivo_pr_ximas_4_semanas_1'])),
      goal_3_months_status: parseText(getVal(row, ['goal_3_months_status'])) as any || 'pending',
      goal_6_months: parseText(getVal(row, ['property_6_meses', 'property_objetivo_6_meses'])),
      goal_6_months_status: parseText(getVal(row, ['goal_6_months_status'])) as any || 'pending',
      goal_1_year: parseText(getVal(row, ['property_1_a_o', 'property_objetivo_1_anho'])),
      goal_1_year_status: parseText(getVal(row, ['goal_1_year_status'])) as any || 'pending',
      // Roadmap redundancy inside goals
      roadmap_main_goal: parseText(getVal(row, ['roadmap_main_goal'])),
      roadmap_commitment_score: parseNumber(getVal(row, ['roadmap_commitment_score'])),
      roadmap_data: getVal(row, ['roadmap_data'])
    },

    program: {
      phase: parseText(getVal(row, ['property_fase', 'Fase', 'phase'])) || 'Fase 1',
      programType: parseText(getVal(row, ['property_tipo_programa', 'Tipo Programa', 'property_tipo_de_programa'])) || 'Inicial',
      contract1_name: parseText(getVal(row, ['property_contratado_f1', 'property_contrato_1', 'property_servicio_contratado'])),
      contract_signed: toBool(getVal(row, ['contract_signed'])),
      contract_signed_at: parseText(getVal(row, ['contract_signed_at'])),
      contract_signature_image: parseText(getVal(row, ['contract_signature_image'])),
      contract_link: parseText(getVal(row, ['contract_url'])),
      contract_visible_to_client: toBool(getVal(row, ['contract_visible_to_client'])),
      assigned_contract_template_id: parseText(getVal(row, ['assigned_contract_template_id'])),
      contract_content_override: parseText(getVal(row, ['contract_content_override'])),
      contract_date: parseText(getVal(row, ['contract_date'])),
      contract_amount: parseFloat(getVal(row, ['contract_amount'])) || 0,
      contract_financing_installments: parseInt(getVal(row, ['contract_financing_installments'])) || 0,
      contract_financing_amount: parseFloat(getVal(row, ['contract_financing_amount'])) || 0,
      ...savedProgram,
      renewal_f2_contracted: isRenF2,
      renewal_f3_contracted: isRenF3,
      renewal_f4_contracted: isRenF4,
      renewal_f5_contracted: isRenF5,
      f2_duration: f2FinalDuration,
      f3_duration: f3FinalDuration,
      f4_duration: f4FinalDuration,
      f5_duration: f5FinalDuration,
      f1_startDate: f1StartStr,
      f1_endDate: f1EndDate,
      f2_renewalDate: f2Start,
      f2_endDate: f2End,
      f3_renewalDate: f3Start,
      f3_endDate: f3End,
      f4_renewalDate: f4Start,
      f4_endDate: f4End,
      f5_renewalDate: f5Start,
      f5_endDate: f5End,
      contract2_name: parseText(getVal(row, ['property_contratado_renovaci_n_f2', 'property_contrato_2', 'property_meses_servicio_contratados', 'property_duraci_n_contrato_actual'])),
      contract3_name: parseText(getVal(row, ['property_contratado_renovaci_n_f3', 'property_contrato_3'])),
      contract4_name: parseText(getVal(row, ['property_contratado_renovaci_n_f4', 'property_contrato_4'])),
      contract5_name: parseText(getVal(row, ['property_contratado_renovaci_n_f5', 'property_contrato_5'])),

      f2_amount: parseNumber(getVal(row, ['f2_amount'])),
      f2_payment_method: parseText(getVal(row, ['f2_payment_method'])),
      f2_receipt_url: parseText(getVal(row, ['f2_receipt_url'])),

      f3_amount: parseNumber(getVal(row, ['f3_amount'])),
      f3_payment_method: parseText(getVal(row, ['f3_payment_method'])),
      f3_receipt_url: parseText(getVal(row, ['f3_receipt_url'])),

      f4_amount: parseNumber(getVal(row, ['f4_amount'])),
      f4_payment_method: parseText(getVal(row, ['f4_payment_method'])),
      f4_receipt_url: parseText(getVal(row, ['f4_receipt_url'])),

      f5_amount: parseNumber(getVal(row, ['f5_amount'])),
      f5_payment_method: parseText(getVal(row, ['f5_payment_method'])),
      f5_receipt_url: parseText(getVal(row, ['f5_receipt_url'])),
    },
    general_notes: parseText(getVal(row, ['property_informaci_n_extra_cliente', 'situaciones_conducta_alimentaria'])),

    // Renewal Payment Fields
    renewal_payment_link: parseText(getVal(row, ['renewal_payment_link'])),
    renewal_payment_status: (parseText(getVal(row, ['renewal_payment_status'])) || 'none') as any,
    renewal_receipt_url: parseText(getVal(row, ['renewal_receipt_url'])),
    renewal_phase: parseText(getVal(row, ['renewal_phase'])),
    renewal_amount: parseFloat(getVal(row, ['renewal_amount']) || '0') || 0,
    renewal_duration: parseInt(getVal(row, ['renewal_duration']) || '0') || 0,
    renewal_verified_at: parseText(getVal(row, ['renewal_verified_at'])),
    renewal_payment_method: (parseText(getVal(row, ['renewal_payment_method'])) || undefined) as any,

    // Onboarding
    onboarding_token: parseText(getVal(row, ['onboarding_token'])),
    onboarding_completed: toBool(getVal(row, ['onboarding_completed'])),
    onboarding_completed_at: toDateStr(getVal(row, ['onboarding_completed_at']), false),
    onboarding_phase2_completed: toBool(getVal(row, ['onboarding_phase2_completed'])),
    onboarding_phase2_completed_at: parseText(getVal(row, ['onboarding_phase2_completed_at'])),
    first_opened_by_assigned_coach_at: parseText(getVal(row, ['first_opened_by_assigned_coach_at'])) || undefined,
    property_assessment_responses: getVal(row, ['property_assessment_responses'], {}),

    // Anamnesis
    anamnesis: {
      alergias_medicamentos: parseText(getVal(row, ['property_alergias_medicamentos'])),
      alergias_alimentos: parseText(getVal(row, ['property_alergias_alimentos'])),
      habito_tabaco: parseText(getVal(row, ['property_habito_tabaco'])),
      consumo_alcohol: parseText(getVal(row, ['property_consumo_alcohol'])),
      consumo_ultraprocesados: parseText(getVal(row, ['property_consumo_ultraprocesados'])),
      horas_sueno: parseText(getVal(row, ['property_horas_sueno'])),
      nivel_estres: parseNumber(getVal(row, ['property_nivel_estres'])) || undefined,
      desencadenante_estres: parseText(getVal(row, ['property_desencadenante_estres'])),
      hipertension: toBool(getVal(row, ['property_hipertension'])),
      dislipemia: toBool(getVal(row, ['property_dislipemia'])),
      infarto_previo: toBool(getVal(row, ['property_infarto_previo'])),
      ictus_previo: toBool(getVal(row, ['property_ictus_previo'])),
      fecha_diagnostico_diabetes: parseText(getVal(row, ['property_fecha_diagnostico_diabetes'])),
      peso_al_diagnostico: parseNumber(getVal(row, ['property_peso_al_diagnostico'])) || undefined,
      perdida_peso_reciente: parseText(getVal(row, ['property_perdida_peso_reciente'])),
      sospecha_lada: toBool(getVal(row, ['property_sospecha_lada'])),
      edad_menopausia: parseNumber(getVal(row, ['property_edad_menopausia'])) || undefined,
      sintomas_menopausia: parseText(getVal(row, ['property_sintomas_menopausia'])),
      osteoporosis: toBool(getVal(row, ['property_osteoporosis'])),
      niebla_mental: toBool(getVal(row, ['property_niebla_mental'])),
      candidata_thm: toBool(getVal(row, ['property_candidata_thm'])),
      enfermedades_previas: parseText(getVal(row, ['property_enfermedades_previas'])),
      cirugias_previas: parseText(getVal(row, ['property_cirugias_previas'])),
      tratamiento_actual_completo: parseText(getVal(row, ['property_tratamiento_actual_completo'])),
      detalle_antidiabeticos: parseText(getVal(row, ['property_detalle_antidiabeticos'])),
      detalle_insulina_completo: parseText(getVal(row, ['property_detalle_insulina_completo'])),
      comer_emocional: parseText(getVal(row, ['property_comer_emocional'])),
      episodios_atracon: parseText(getVal(row, ['property_episodios_atracon'])),
      tca_detalle: parseText(getVal(row, ['property_tca_detalle'])),
      calidad_sueno: parseText(getVal(row, ['property_calidad_sueno'])),
      sueno_afecta_apetito: toBool(getVal(row, ['property_sueno_afecta_apetito'])),
      problemas_digestivos: parseText(getVal(row, ['property_problemas_digestivos'])),
      analitica_urls: (() => {
        const raw = getVal(row, ['property_analitica_urls']);
        if (!raw) return [];
        try { return JSON.parse(String(raw)); } catch { return []; }
      })(),
    },

    telegramId: (function () {
      const raw = parseText(getVal(row, ['property_id_telegram', 'telegramId']));
      return raw.startsWith('-100') ? '' : raw;
    })(),
    telegram_group_id: parseText(getVal(row, ['telegram_group_id', 'telegram_group_id'])),
    missed_checkins_count: parseNumber(getVal(row, ['missed_checkins_count', 'property_missed_checkins_count'])),
    last_checkin_missed_reason: parseText(getVal(row, ['last_checkin_missed_reason', 'property_motivo_retraso_checkin'])),

    // Nutrition Approval
    nutrition_approved: !!getVal(row, ['nutrition_approved']),
    nutrition_approved_at: parseText(getVal(row, ['nutrition_approved_at'])) || undefined,
    nutrition_approved_by: parseText(getVal(row, ['nutrition_approved_by'])) || undefined,

    // Account Activation
    user_id: parseText(getVal(row, ['user_id'])) || undefined,
    activation_token: parseText(getVal(row, ['activation_token'])) || undefined,
    activation_token_created_at: parseText(getVal(row, ['activation_token_created_at'])) || undefined,

    // Coach Communication Fields
    next_appointment_date: toDateStr(getVal(row, ['next_appointment_date']), false) || undefined,
    next_appointment_time: parseText(getVal(row, ['next_appointment_time'])) || undefined,
    next_appointment_note: parseText(getVal(row, ['next_appointment_note'])) || undefined,
    next_appointment_link: parseText(getVal(row, ['next_appointment_link'])) || undefined,
    next_appointment_status: parseText(getVal(row, ['next_appointment_status'])) || undefined,
    next_appointment_conclusions: parseText(getVal(row, ['next_appointment_conclusions'])) || undefined,
    coach_message: parseText(getVal(row, ['coach_message'])) || undefined,

    created_at: registrationDate,
    updated_at: new Date().toISOString()
  };
};

const mapClientToRow = (client: Partial<Client>): any => {
  const row: any = {};

  // Roadmap Fields
  if (client.roadmap_main_goal !== undefined) row['roadmap_main_goal'] = client.roadmap_main_goal;
  if (client.roadmap_commitment_score !== undefined) row['roadmap_commitment_score'] = client.roadmap_commitment_score;
  if (client.roadmap_data !== undefined) row['roadmap_data'] = client.roadmap_data;

  if (client.firstName) row['property_nombre'] = client.firstName;
  if (client.surname) row['property_apellidos'] = client.surname;
  if (client.email) row['property_correo_electr_nico'] = client.email;
  if (client.idNumber) row['property_dni'] = client.idNumber;
  if (client.phone) row['property_tel_fono'] = client.phone;
  if (client.address) row['property_direccion'] = client.address;
  if (client.city) row['property_poblaci_n'] = client.city;
  if (client.province) row['property_provincia'] = client.province;

  if (client.age !== undefined) row['property_edad'] = client.age;
  if (client.ageVisual !== undefined) row['property_edad_vista'] = client.ageVisual;
  if (client.birthDate) row['property_fecha_de_nacimiento'] = client.birthDate;
  if (client.gender) row['property_sexo'] = client.gender;
  if (client.hormonal_status) row['hormonal_status'] = client.hormonal_status;
  if (client.average_cycle_length !== undefined) row['average_cycle_length'] = client.average_cycle_length;
  if (client.hrt_treatment) row['hrt_treatment'] = client.hrt_treatment;
  if (client.last_period_start_date) row['last_period_start_date'] = client.last_period_start_date;

  if (client.height !== undefined) row['property_altura'] = client.height;
  if (client.current_weight !== undefined) row['property_peso_actual'] = client.current_weight;
  if (client.initial_weight !== undefined) row['property_peso_inicial'] = client.initial_weight;
  if (client.target_weight !== undefined) {
    row['property_peso_objetivo'] = client.target_weight;
    console.log('[MAP DEBUG] target_weight -> property_peso_objetivo:', client.target_weight);
  }
  if (client.abdominal_perimeter !== undefined) row['property_per_metro_abdomen'] = client.abdominal_perimeter;
  if (client.arm_perimeter !== undefined) row['property_per_metro_brazo'] = client.arm_perimeter;
  if (client.thigh_perimeter !== undefined) row['property_per_metro_muslo'] = client.thigh_perimeter;

  if (client.status) {
    const statusMap: Record<string, string> = {
      [ClientStatus.ACTIVE]: 'Activo',
      [ClientStatus.INACTIVE]: 'Baja',
      [ClientStatus.PAUSED]: 'Pausa',
      [ClientStatus.DROPOUT]: 'Abandono',
      [ClientStatus.COMPLETED]: 'Completado'
    };
    row['property_estado_cliente'] = statusMap[client.status];
  }

  if (client.start_date) row['property_inicio_programa'] = client.start_date;
  if (client.program_duration_months !== undefined) row['property_contratado_f1'] = client.program_duration_months;
  // Priorizar property_coach (nombre) sobre coach_id (UUID) para evitar guardar UUIDs en este campo
  // El nombre solo se guarda si NO es un UUID (evitar contaminar la columna de nombres con IDs)
  if (client.property_coach && !isUUID(client.property_coach)) {
    row['property_coach'] = client.property_coach;
  }
  if (client.coach_id) row['coach_id'] = client.coach_id;
  if (client.allow_endocrine_access !== undefined) row['allow_endocrine_access'] = client.allow_endocrine_access;

  if (client.weeklyReviewUrl) row['property_video_revision'] = client.weeklyReviewUrl;
  if (client.weeklyReviewDate) row['property_fecha_revision'] = client.weeklyReviewDate;

  // Medical
  if (client.medical) {
    if (client.medical.insulin) row['property_insulina'] = client.medical.insulin;
    if (client.medical.insulinBrand) row['property_marca_insulina'] = client.medical.insulinBrand;
    if (client.medical.insulinDose) row['property_dosis'] = client.medical.insulinDose;
    if (client.medical.insulinTime) row['property_hora_inyecci_n'] = client.medical.insulinTime;
    if (client.medical.useSensor !== undefined) row['property_usa_sensor_free_style'] = client.medical.useSensor;
    if (client.medical.lastHba1c) row['property_ultima_glicosilada_hb_a1c'] = client.medical.lastHba1c;
    if (client.medical.glucoseFastingCurrent) row['property_glucosa_en_ayunas_actual'] = client.medical.glucoseFastingCurrent;
    if (client.medical.pathologies) row['property_enfermedades'] = client.medical.pathologies;
    if (client.medical.medication) row['property_medicaci_n'] = client.medical.medication;
    if (client.medical.otherConditions) row['property_otras_enfermedades_o_condicionantes'] = client.medical.otherConditions;
    if (client.medical.specialSituations) row['property_situaciones_especiales'] = client.medical.specialSituations;
    if (client.medical.initialSymptoms) row['property_sintomas'] = client.medical.initialSymptoms;
    if (client.medical.hormonal_cycle) row['property_estado_ciclo'] = client.medical.hormonal_cycle;
    if (client.medical.hormonal_duration) row['property_duracion_ciclo'] = client.medical.hormonal_duration;
    if (client.medical.contraceptives) row['property_anticonceptivos'] = client.medical.contraceptives;
    if (client.medical.hormonal_variability) row['property_variabilidad_hormonal'] = client.medical.hormonal_variability;
    if (client.medical.hormonal_notes) row['property_notas_hormonales'] = client.medical.hormonal_notes;
    if (client.medical.family_history) row['property_antecedentes_familiares'] = client.medical.family_history;
  }

  // Nutrition
  if (client.nutrition) {
    if (client.nutrition.planUrl) row['property_plan_nutricional'] = client.nutrition.planUrl;
    // Moved assigned_nutrition_type and assigned_calories to end of function for better undefined handling
    if (client.nutrition.cooksForSelf !== undefined) row['property_cocina_l_mismo'] = client.nutrition.cooksForSelf;
    if (client.nutrition.willingToWeighFood !== undefined) row['property_dispuesto_a_pesar_comida'] = client.nutrition.willingToWeighFood;
    if (client.nutrition.mealsOutPerWeek !== undefined) row['property_comidas_fuera_de_casa_semanales'] = client.nutrition.mealsOutPerWeek;
    if (client.nutrition.mealsPerDay !== undefined) row['property_n_mero_comidas_al_d_a'] = client.nutrition.mealsPerDay;
    if (client.nutrition.eatsWithBread !== undefined) row['property_come_con_pan'] = client.nutrition.eatsWithBread;
    if (client.nutrition.breadAmount) row['property_cantidad_pan'] = client.nutrition.breadAmount;
    if (client.nutrition.alcohol) row['property_consumo_de_alcohol'] = client.nutrition.alcohol;
    if (client.nutrition.waterIntake) row['property_bebida_en_la_comida'] = client.nutrition.waterIntake;
    if (client.nutrition.allergies) row['property_alergias_intolerancias'] = client.nutrition.allergies;
    if (client.nutrition.otherAllergies) row['property_otras_alergias_o_intolerancias'] = client.nutrition.otherAllergies;
    if (client.nutrition.dislikes) row['property_alimentos_a_evitar_detalle'] = client.nutrition.dislikes;
    if (client.nutrition.consumedFoods) row['property_alimentos_consumidos'] = client.nutrition.consumedFoods;
    if (client.nutrition.cravings) row['property_tiene_antojos'] = client.nutrition.cravings;
    if (client.nutrition.cravingsDetail) row['property_especificar_antojos'] = client.nutrition.cravingsDetail;
    if (client.nutrition.snacking !== undefined) row['property_pica_entre_horas'] = client.nutrition.snacking;
    if (client.nutrition.snackingDetail) row['property_especificar_pica_entre_horas'] = client.nutrition.snackingDetail;
    if (client.nutrition.eatingDisorder) row['property_trastorno_alimenticio_diagnosticado'] = client.nutrition.eatingDisorder;
    if (client.nutrition.eatingDisorderDetail) row['property_especificar_trastorno_alimenticio'] = client.nutrition.eatingDisorderDetail;
    if (client.nutrition.dietaryNotes) row['property_notas_diet_ticas_espec_ficas'] = client.nutrition.dietaryNotes;
    if (client.nutrition.lastRecallMeal) row['property_ltima_comida_recuerdo'] = client.nutrition.lastRecallMeal;
    if (client.nutrition.preferences) row['property_preferencias_diet_ticas_generales'] = client.nutrition.preferences;

    if (client.nutrition.schedules) {
      if (client.nutrition.schedules.breakfast) row['property_horario_desayuno'] = client.nutrition.schedules.breakfast;
      if (client.nutrition.schedules.lunch) row['property_horario_almuerzo'] = client.nutrition.schedules.lunch;
      if (client.nutrition.schedules.dinner) row['property_horario_cena'] = client.nutrition.schedules.dinner;
      if (client.nutrition.schedules.afternoonSnack) row['property_horario_merienda'] = client.nutrition.schedules.afternoonSnack;
      if (client.nutrition.schedules.morningSnack) row['property_horario_media_ma_ana'] = client.nutrition.schedules.morningSnack;
    }
  }

  // Training
  if (client.training) {
    if (client.training.activityLevel) row['property_actividad_f_sica_general_cliente'] = client.training.activityLevel;
    if (client.training.stepsGoal !== undefined) row['property_pasos_diarios_promedio'] = client.training.stepsGoal;
    if (client.training.strengthTraining !== undefined) row['property_ejercicio_fuerza'] = client.training.strengthTraining;
    if (client.training.trainingLocation) row['property_lugar_entreno'] = client.training.trainingLocation;
    if (client.training.availability) row['property_horario_disponibilidad'] = client.training.availability;
    if (client.training.sensations_report) row['property_reporte_sensaciones_entreno'] = client.training.sensations_report;
    if (client.training.assigned_program_id !== undefined) row['assigned_program_id'] = client.training.assigned_program_id;
    if (client.training.assigned_custom_program !== undefined) row['assigned_custom_program'] = client.training.assigned_custom_program;
  }

  // Goals
  if (client.goals) {
    if (client.goals.motivation) row['property_motivo_contrataci_n'] = client.goals.motivation;
    if (client.goals.goal_3_months) row['property_3_meses'] = client.goals.goal_3_months;
    if (client.goals.goal_3_months_status) row['goal_3_months_status'] = client.goals.goal_3_months_status;
    if (client.goals.goal_6_months) row['property_6_meses'] = client.goals.goal_6_months;
    if (client.goals.goal_6_months_status) row['goal_6_months_status'] = client.goals.goal_6_months_status;
    if (client.goals.goal_1_year) row['property_1_a_o'] = client.goals.goal_1_year;
    if (client.goals.goal_1_year_status) row['goal_1_year_status'] = client.goals.goal_1_year_status;
  }

  // Program & Renewals
  if (client.program) {
    if (client.program.phase) row['property_fase'] = client.program.phase;
    if (client.program.programType) row['property_tipo_de_programa'] = client.program.programType;
    if (client.program.contract_signed !== undefined) row['contract_signed'] = client.program.contract_signed;
    if (client.program.contract_signed_at) row['contract_signed_at'] = client.program.contract_signed_at;
    if (client.program.contract_signature_image) row['contract_signature_image'] = client.program.contract_signature_image;
    if (client.program.contract_link) row['contract_url'] = client.program.contract_link;
    // Enabling these fields requires DB migration to add columns to 'clientes_pt_notion'
    if (client.program?.contract_visible_to_client !== undefined)
      row['contract_visible_to_client'] = client.program.contract_visible_to_client;
    if (client.program?.assigned_contract_template_id !== undefined)
      row['assigned_contract_template_id'] = client.program.assigned_contract_template_id || null;
    if (client.program?.contract_content_override !== undefined)
      row['contract_content_override'] = client.program.contract_content_override || null;
    if (client.program?.contract_date !== undefined)
      row['contract_date'] = client.program.contract_date || null;
    if (client.program?.contract_amount !== undefined)
      row['contract_amount'] = client.program.contract_amount || 0;
    if (client.program?.contract_financing_installments !== undefined)
      row['contract_financing_installments'] = client.program.contract_financing_installments || 0;
    if (client.program?.contract_financing_amount !== undefined)
      row['contract_financing_amount'] = client.program.contract_financing_amount || 0;

    // Save program object for complex structures
    // row['program'] = client.program;

    // Specific columns if needed for flat mapping
    if (client.program.renewal_f2_contracted !== undefined) row['property_renueva_f2'] = client.program.renewal_f2_contracted;
    if (client.program.f2_duration !== undefined) row['property_contratado_renovaci_n_f2'] = client.program.f2_duration;

    if (client.program.renewal_f3_contracted !== undefined) row['property_renueva_f3'] = client.program.renewal_f3_contracted;
    if (client.program.f3_duration !== undefined) row['property_contratado_renovaci_n_f3'] = client.program.f3_duration;

    if (client.program.renewal_f4_contracted !== undefined) row['property_renueva_f4'] = client.program.renewal_f4_contracted;
    if (client.program.f4_duration !== undefined) row['property_contratado_renovaci_n_f4'] = client.program.f4_duration;

    if (client.program.renewal_f5_contracted !== undefined) row['property_renueva_f5'] = client.program.renewal_f5_contracted;
    if (client.program.f5_duration !== undefined) row['property_contratado_renovaci_n_f5'] = client.program.f5_duration;

    // PERSISTENCE FIX: Save calculated end dates to DB columns (Simple String for SQL DATE types)
    if (client.program.f1_endDate) row['property_fin_fase_1'] = client.program.f1_endDate;
    if (client.program.f2_endDate) row['property_fin_contrato_f2'] = client.program.f2_endDate;
    if (client.program.f3_endDate) row['property_fin_contrato_f3'] = client.program.f3_endDate;
    if (client.program.f4_endDate) row['property_fin_contrato_f4'] = client.program.f4_endDate;
    if (client.program.f5_endDate) row['property_fin_contrato_f5'] = client.program.f5_endDate;

    // Financial Fields per Phase
    if (client.program.f2_amount !== undefined) row['f2_amount'] = client.program.f2_amount;
    if (client.program.f2_payment_method) row['f2_payment_method'] = client.program.f2_payment_method;
    if (client.program.f2_receipt_url) row['f2_receipt_url'] = client.program.f2_receipt_url;

    if (client.program.f3_amount !== undefined) row['f3_amount'] = client.program.f3_amount;
    if (client.program.f3_payment_method) row['f3_payment_method'] = client.program.f3_payment_method;
    if (client.program.f3_receipt_url) row['f3_receipt_url'] = client.program.f3_receipt_url;

    if (client.program.f4_amount !== undefined) row['f4_amount'] = client.program.f4_amount;
    if (client.program.f4_payment_method) row['f4_payment_method'] = client.program.f4_payment_method;
    if (client.program.f4_receipt_url) row['f4_receipt_url'] = client.program.f4_receipt_url;

    if (client.program.f5_amount !== undefined) row['f5_amount'] = client.program.f5_amount;
    if (client.program.f5_payment_method) row['f5_payment_method'] = client.program.f5_payment_method;
    if (client.program.f5_receipt_url) row['f5_receipt_url'] = client.program.f5_receipt_url;
  }

  // Persist Master End Date and Program Start
  if (client.contract_end_date) row['property_fecha_fin_contrato_actual'] = client.contract_end_date;
  if (client.start_date) row['property_inicio_programa'] = client.start_date;

  // Nutrition Assignment (Explicit check for undefined to allow clearing values)
  if (client.nutrition) {
    if (client.nutrition.assigned_nutrition_type !== undefined) {
      row['assigned_nutrition_type'] = String(client.nutrition.assigned_nutrition_type || '');
      console.log(`Mapping assigned_nutrition_type: ${client.nutrition.assigned_nutrition_type} -> ${row['assigned_nutrition_type']}`);
    }
    if (client.nutrition.assigned_calories !== undefined) {
      // Ensure we send a valid number or null (Postgres NUMERIC dislikes empty strings)
      const calVal = Number(client.nutrition.assigned_calories);
      row['assigned_calories'] = !isNaN(calVal) && calVal > 0 ? calVal : null;
      console.log(`Mapping assigned_calories: ${client.nutrition.assigned_calories} -> ${row['assigned_calories']}`);
    }
  }

  // Nutrition Approval
  if (client.nutrition_approved !== undefined) row['nutrition_approved'] = client.nutrition_approved;
  if (client.nutrition_approved_at) row['nutrition_approved_at'] = client.nutrition_approved_at;
  if (client.nutrition_approved_by) row['nutrition_approved_by'] = client.nutrition_approved_by;

  if (client.general_notes) row['property_informaci_n_extra_cliente'] = client.general_notes;

  if (client.abandonmentDate) row['property_fecha_abandono'] = client.abandonmentDate;
  if (client.abandonmentReason) row['property_motivo_abandono'] = client.abandonmentReason;
  if (client.inactiveDate) row['property_fecha_de_baja'] = client.inactiveDate;
  if (client.inactiveReason) row['property_motivo_baja'] = client.inactiveReason;
  if (client.pauseDate) row['property_fecha_pausa'] = client.pauseDate;
  if (client.pauseReason) row['property_motivo_pausa'] = client.pauseReason;

  // Renewal Payment Fields
  if (client.renewal_payment_link) row['renewal_payment_link'] = client.renewal_payment_link;
  if (client.renewal_payment_status) row['renewal_payment_status'] = client.renewal_payment_status;
  if (client.renewal_receipt_url) row['renewal_receipt_url'] = client.renewal_receipt_url;
  if (client.renewal_phase) row['renewal_phase'] = client.renewal_phase;
  if (client.renewal_duration !== undefined) row['renewal_duration'] = client.renewal_duration;
  if (client.renewal_amount !== undefined) row['renewal_amount'] = client.renewal_amount;
  if (client.renewal_verified_at) row['renewal_verified_at'] = client.renewal_verified_at;
  if (client.renewal_payment_method) row['renewal_payment_method'] = client.renewal_payment_method;

  // Anamnesis
  if (client.anamnesis) {
    if (client.anamnesis.alergias_medicamentos) row['property_alergias_medicamentos'] = client.anamnesis.alergias_medicamentos;
    if (client.anamnesis.alergias_alimentos) row['property_alergias_alimentos'] = client.anamnesis.alergias_alimentos;
    if (client.anamnesis.habito_tabaco) row['property_habito_tabaco'] = client.anamnesis.habito_tabaco;
    if (client.anamnesis.consumo_alcohol) row['property_consumo_alcohol'] = client.anamnesis.consumo_alcohol;
    if (client.anamnesis.consumo_ultraprocesados) row['property_consumo_ultraprocesados'] = client.anamnesis.consumo_ultraprocesados;
    if (client.anamnesis.horas_sueno) row['property_horas_sueno'] = client.anamnesis.horas_sueno;
    if (client.anamnesis.nivel_estres !== undefined) row['property_nivel_estres'] = client.anamnesis.nivel_estres;
    if (client.anamnesis.desencadenante_estres) row['property_desencadenante_estres'] = client.anamnesis.desencadenante_estres;
    if (client.anamnesis.hipertension !== undefined) row['property_hipertension'] = client.anamnesis.hipertension;
    if (client.anamnesis.dislipemia !== undefined) row['property_dislipemia'] = client.anamnesis.dislipemia;
    if (client.anamnesis.infarto_previo !== undefined) row['property_infarto_previo'] = client.anamnesis.infarto_previo;
    if (client.anamnesis.ictus_previo !== undefined) row['property_ictus_previo'] = client.anamnesis.ictus_previo;
    if (client.anamnesis.fecha_diagnostico_diabetes) row['property_fecha_diagnostico_diabetes'] = client.anamnesis.fecha_diagnostico_diabetes;
    if (client.anamnesis.peso_al_diagnostico !== undefined) row['property_peso_al_diagnostico'] = client.anamnesis.peso_al_diagnostico;
    if (client.anamnesis.perdida_peso_reciente) row['property_perdida_peso_reciente'] = client.anamnesis.perdida_peso_reciente;
    if (client.anamnesis.sospecha_lada !== undefined) row['property_sospecha_lada'] = client.anamnesis.sospecha_lada;
    if (client.anamnesis.edad_menopausia !== undefined) row['property_edad_menopausia'] = client.anamnesis.edad_menopausia;
    if (client.anamnesis.sintomas_menopausia) row['property_sintomas_menopausia'] = client.anamnesis.sintomas_menopausia;
    if (client.anamnesis.osteoporosis !== undefined) row['property_osteoporosis'] = client.anamnesis.osteoporosis;
    if (client.anamnesis.niebla_mental !== undefined) row['property_niebla_mental'] = client.anamnesis.niebla_mental;
    if (client.anamnesis.candidata_thm !== undefined) row['property_candidata_thm'] = client.anamnesis.candidata_thm;
    if (client.anamnesis.enfermedades_previas) row['property_enfermedades_previas'] = client.anamnesis.enfermedades_previas;
    if (client.anamnesis.cirugias_previas) row['property_cirugias_previas'] = client.anamnesis.cirugias_previas;
    if (client.anamnesis.tratamiento_actual_completo) row['property_tratamiento_actual_completo'] = client.anamnesis.tratamiento_actual_completo;
    if (client.anamnesis.detalle_antidiabeticos) row['property_detalle_antidiabeticos'] = client.anamnesis.detalle_antidiabeticos;
    if (client.anamnesis.detalle_insulina_completo) row['property_detalle_insulina_completo'] = client.anamnesis.detalle_insulina_completo;
    if (client.anamnesis.comer_emocional) row['property_comer_emocional'] = client.anamnesis.comer_emocional;
    if (client.anamnesis.episodios_atracon) row['property_episodios_atracon'] = client.anamnesis.episodios_atracon;
    if (client.anamnesis.tca_detalle) row['property_tca_detalle'] = client.anamnesis.tca_detalle;
    if (client.anamnesis.calidad_sueno) row['property_calidad_sueno'] = client.anamnesis.calidad_sueno;
    if (client.anamnesis.sueno_afecta_apetito !== undefined) row['property_sueno_afecta_apetito'] = client.anamnesis.sueno_afecta_apetito;
    if (client.anamnesis.problemas_digestivos) row['property_problemas_digestivos'] = client.anamnesis.problemas_digestivos;
    if (client.anamnesis.analitica_urls && client.anamnesis.analitica_urls.length > 0) row['property_analitica_urls'] = JSON.stringify(client.anamnesis.analitica_urls);
  }

  // Onboarding Phase 2
  if (client.onboarding_phase2_completed !== undefined) row['onboarding_phase2_completed'] = client.onboarding_phase2_completed;
  // Telegram fields
  if (client.telegramId) row['property_id_telegram'] = client.telegramId;
  if (client.telegram_group_id) row['telegram_group_id'] = client.telegram_group_id;
  if (client.onboarding_phase2_completed_at) row['onboarding_phase2_completed_at'] = client.onboarding_phase2_completed_at;
  if (client.first_opened_by_assigned_coach_at !== undefined) row['first_opened_by_assigned_coach_at'] = client.first_opened_by_assigned_coach_at || null;
  if (client.property_assessment_responses) row['property_assessment_responses'] = client.property_assessment_responses;
  if (client.missed_checkins_count !== undefined) row['missed_checkins_count'] = client.missed_checkins_count;
  if (client.last_checkin_missed_reason !== undefined) row['last_checkin_missed_reason'] = client.last_checkin_missed_reason;

  // Account Activation
  if (client.user_id !== undefined) row['user_id'] = client.user_id;
  if (client.activation_token !== undefined) row['activation_token'] = client.activation_token;
  if (client.activation_token_created_at !== undefined) row['activation_token_created_at'] = client.activation_token_created_at;

  // Coach Communication Fields
  if (client.next_appointment_date !== undefined) row['next_appointment_date'] = client.next_appointment_date || null;
  if (client.next_appointment_time !== undefined) row['next_appointment_time'] = client.next_appointment_time || null;
  if (client.next_appointment_note !== undefined) row['next_appointment_note'] = client.next_appointment_note || null;
  if (client.next_appointment_link !== undefined) row['next_appointment_link'] = client.next_appointment_link || null;
  if (client.next_appointment_status !== undefined) row['next_appointment_status'] = client.next_appointment_status || null;
  if (client.next_appointment_conclusions !== undefined) row['next_appointment_conclusions'] = client.next_appointment_conclusions || null;
  if (client.coach_message !== undefined) row['coach_message'] = client.coach_message || null;

  return row;
};

// --- MOCK IMPLEMENTATIONS ---

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock User Data for Auth
let mockUsers: User[] = [
  {
    id: 'admin-123',
    name: 'Admin Demo',
    email: 'admin@demo.com',
    role: UserRole.ADMIN,
    avatarUrl: 'https://ui-avatars.com/api/?name=Admin+Demo'
  },
  {
    id: 'coach-1',
    name: 'Coach Demo',
    email: 'coach@demo.com',
    role: UserRole.COACH,
    avatarUrl: 'https://ui-avatars.com/api/?name=Coach+Demo'
  },
  {
    id: 'closer-1',
    name: 'Closer Demo',
    email: 'closer@demo.com',
    role: UserRole.CLOSER,
    avatarUrl: 'https://ui-avatars.com/api/?name=Closer+Demo'
  },
  {
    id: 'endo-1',
    name: 'Endocrino Demo',
    email: 'endo@demo.com',
    role: UserRole.ENDOCRINO,
    avatarUrl: 'https://ui-avatars.com/api/?name=Endocrino+Demo'
  },
  {
    id: 'psico-1',
    name: 'Psicologo Demo',
    email: 'psico@demo.com',
    role: UserRole.PSICOLOGO,
    avatarUrl: 'https://ui-avatars.com/api/?name=Psicologo+Demo'
  },
  {
    id: 'direccion-test-001',
    name: 'Victor Dirección',
    email: 'direccion@test.com',
    role: UserRole.DIRECCION,
    avatarUrl: 'https://ui-avatars.com/api/?name=Victor+Direccion'
  },
  {
    id: 'rrss-1',
    name: 'RRSS Demo',
    email: 'rrss@demo.com',
    role: UserRole.RRSS,
    avatarUrl: 'https://ui-avatars.com/api/?name=RRSS+Demo'
  },
  {
    id: 'cont-1',
    name: 'Contabilidad Demo',
    email: 'contabilidad@demo.com',
    role: UserRole.CONTABILIDAD,
    avatarUrl: 'https://ui-avatars.com/api/?name=Contabilidad+Demo',
    password: '123'
  },
];

const mapRowToEndocrinoReview = (row: any): EndocrinoReview => ({
  id: row.id,
  client_id: row.client_id,
  doctor_id: row.doctor_id,
  fecha_revision: row.fecha_revision,
  valoracion_situacion: row.valoracion_situacion,
  plan_accion: row.plan_accion,
  created_at: row.created_at
});

const mapEndocrinoReviewToRow = (review: Partial<EndocrinoReview>) => ({
  client_id: review.client_id,
  doctor_id: review.doctor_id,
  fecha_revision: review.fecha_revision,
  valoracion_situacion: review.valoracion_situacion,
  plan_accion: review.plan_accion
});

// --- MEDICAL REVIEWS MAPPER ---
const mapRowToMedicalReview = (row: any): MedicalReview => ({
  id: row.id,
  client_id: row.client_id,
  coach_id: row.coach_id,
  submission_date: row.submission_date,
  diabetes_type: row.diabetes_type,
  insulin_usage: row.insulin_usage,
  insulin_dose: row.insulin_dose,
  medication: row.medication,
  comments: row.comments,
  report_type: row.report_type,
  file_urls: [
    row.file_url_1,
    row.file_url_2,
    row.file_url_3,
    row.file_url_4
  ].filter(Boolean),
  status: row.status === 'completed' || row.status === 'reviewed' ? 'reviewed' : 'pending',
  doctor_notes: row.doctor_notes,
  doctor_video_url: row.doctor_video_url,
  reviewed_at: row.reviewed_at,
  reviewed_by: row.reviewed_by,
  created_at: row.created_at,
  client_name: row.client_name // Virtual field from joined query
});

const mapMedicalReviewToRow = (review: Partial<MedicalReview>) => {
  const row: any = {
    client_id: review.client_id,
    coach_id: review.coach_id,
    diabetes_type: review.diabetes_type,
    insulin_usage: review.insulin_usage,
    insulin_dose: review.insulin_dose,
    medication: review.medication,
    comments: review.comments,
    report_type: review.report_type,
    status: review.status === 'reviewed' ? 'reviewed' : 'pending',
    doctor_notes: review.doctor_notes,
    doctor_video_url: review.doctor_video_url,
    reviewed_at: review.reviewed_at,
    reviewed_by: review.reviewed_by
  };

  if (review.file_urls) {
    row.file_url_1 = review.file_urls[0] || null;
    row.file_url_2 = review.file_urls[1] || null;
    row.file_url_3 = review.file_urls[2] || null;
    row.file_url_4 = review.file_urls[3] || null;
  }

  return row;
};

export const mockAuth = {
  login: async (identifier: string, password?: string, manualRoleType?: 'staff' | 'client'): Promise<User | null> => {
    const rawEmail = (identifier || '').toLowerCase().trim();
    const rawPass = (password || '').trim();
    const isDemoAlumno = rawEmail === 'demo.alumno@demo.com';
    const isMasterPass = ['admin123', 'test123', '123', '1234', '123456'].includes(rawPass);

    console.log(`🔐 Intentando login para: ${rawEmail}`);

    // --- 1. INTENTO DE AUTENTICACIÓN REAL CON SUPABASE ---
    let authData: any = null;
    let authError: any = null;

    if (rawEmail.includes('@') && rawPass) {
      const response = await supabase.auth.signInWithPassword({
        email: rawEmail,
        password: rawPass
      });
      authData = response.data;
      authError = response.error;
    }

    // --- 2. GESTIÓN DE LA SESIÓN Y PERFIL ---
    if (authData?.user || (isMasterPass && (
      rawEmail.endsWith('@test.com') ||
      rawEmail.endsWith('@academia.com') ||
      rawEmail.endsWith('@demo.com') ||
      rawEmail === 'doctorvictorbravo@gmail.com' ||
      rawEmail === 'jesusmartinezpadron@gmail.com'
    ))) {

      const userId = authData?.user?.id;

      // Intentar obtener perfil de public.users (prioridad absoluta)
      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .eq(userId ? 'id' : 'email', userId || rawEmail)
        .maybeSingle();

      if (dbUser) {
        console.log(`✅ Perfil encontrado en DB para ${rawEmail} (Rol: ${dbUser.role})`);
        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: isDemoAlumno ? UserRole.CLIENT : (dbUser.role as UserRole),
          avatarUrl: dbUser.avatar_url || `https://ui-avatars.com/api/?name=${dbUser.name}`,
          isMockSession: !authData?.user
        };
      }

      // Si no hay perfil en DB pero hay Auth Real, usar metadatos
      if (authData?.user) {
        console.warn('⚠️ Usuario Auth OK pero no encontrado en tabla public.users. Usando metadatos.');
        return {
          id: authData.user.id,
          name: authData.user.user_metadata?.full_name || rawEmail.split('@')[0].toUpperCase(),
          email: rawEmail,
          role: isDemoAlumno ? UserRole.CLIENT : ((authData.user.user_metadata?.role as UserRole) || UserRole.CLIENT),
          avatarUrl: authData.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${rawEmail}`,
          isMockSession: false
        };
      }

      // Si es Backdoor y no está en DB, usar MockUsers o Fallback
      if (isMasterPass) {
        console.log('🎯 Backdoor detectado (Modo Mock)');
        const mockMatch = mockUsers.find(u => u.email.toLowerCase() === rawEmail);
        if (mockMatch) return mockMatch;

        // Fallback dinámico por prefijos
        let role = UserRole.COACH;
        if (rawEmail === 'demo.alumno@demo.com' || rawEmail.startsWith('alumno') || rawEmail.startsWith('cliente')) role = UserRole.CLIENT;
        if (rawEmail.startsWith('admin') || rawEmail === 'doctorvictorbravo@gmail.com') role = UserRole.ADMIN;
        if (rawEmail.startsWith('closer')) role = UserRole.CLOSER;
        if (rawEmail.startsWith('setter')) role = UserRole.SETTER;
        if (rawEmail.startsWith('endo')) role = UserRole.ENDOCRINO;
        if (rawEmail.startsWith('direccion')) role = UserRole.DIRECCION;

        return {
          id: `mock-${rawEmail.replace(/[^a-z0-9]/g, '-')}`,
          name: rawEmail.split('@')[0].toUpperCase().replace('_', ' '),
          email: rawEmail,
          role: role,
          isMockSession: true
        };
      }
    }

    if (authError) console.error('❌ Error de autenticación:', authError.message);
    return null;
  },

  updateUser: async (user: User): Promise<User> => {
    await delay(500);
    mockUsers = mockUsers.map(u => u.id === user.id ? user : u);
    return user;
  }
};

export const mockDb = {
  endocrino: {
    getByClient: async (clientId: string) => {
      const { data, error } = await supabase
        .from('endocrino_reviews')
        .select('*')
        .eq('client_id', clientId)
        .order('fecha_revision', { ascending: false });

      if (error) return [];
      return (data || []).map(mapRowToEndocrinoReview);
    },
    create: async (review: Partial<EndocrinoReview>) => {
      const row = mapEndocrinoReviewToRow(review);
      const { data, error } = await supabase
        .from('endocrino_reviews')
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return mapRowToEndocrinoReview(data);
    }
  },
  medical: {
    getStats: async () => {
      const { data, error } = await supabase
        .from('medical_reviews')
        .select('status');

      if (error) return { pending: 0, reviewed: 0 };

      return {
        pending: (data || []).filter(r => r.status === 'pending').length,
        reviewed: (data || []).filter(r => r.status === 'reviewed').length
      };
    },

    getAll: async () => {
      // 1. Obtener las revisiones
      console.log('🔍 Solicitando todas las revisiones médicas...');
      const { data, error } = await supabase
        .from('medical_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching medical reviews (GetAll):', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('📋 No se encontraron revisiones médicas en Supabase.');
        return [];
      }

      console.log(`📋 Se han cargado ${data.length} revisiones médicas. Buscando nombres de clientes...`);

      // 2. Obtener nombres de clientes manualmente para evitar 406/ambigüedad en joins vinculados a RLS
      const clientIds = [...new Set(data.map(r => r.client_id))].filter(Boolean);
      if (clientIds.length === 0) return data.map(mapRowToMedicalReview);

      const { data: clientNames, error: clientError } = await supabase
        .from('clientes_pt_notion')
        .select('id, property_nombre, property_apellidos')
        .in('id', clientIds);

      if (clientError) {
        console.warn('⚠️ No se pudieron cargar los nombres de los clientes:', clientError);
      }

      return data.map(row => {
        const clientInfo = clientNames?.find(c => c.id === row.client_id);
        const mapped = mapRowToMedicalReview(row);
        return {
          ...mapped,
          client_name: clientInfo ? `${clientInfo.property_nombre || ''} ${clientInfo.property_apellidos || ''}`.trim() : 'Cliente desconocido'
        };
      });
    },

    getByClient: async (clientId: string) => {
      const { data, error } = await supabase
        .from('medical_reviews')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data || []).map(mapRowToMedicalReview);
    },

    create: async (review: Partial<MedicalReview>) => {
      const row = mapMedicalReviewToRow(review);
      const { data, error } = await supabase
        .from('medical_reviews')
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return mapRowToMedicalReview(data);
    },

    update: async (id: string, updates: Partial<MedicalReview>) => {
      const row = mapMedicalReviewToRow(updates);
      const { data, error } = await supabase
        .from('medical_reviews')
        .update(row)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapRowToMedicalReview(data);
    }
  },
  invoices: {
    delete: async (id: string) => {
      // Direct access to mockEvolution's unified method
      return await mockEvolution.invoices.delete(id);
    }
  },
  getClients: async (currentUser: User): Promise<Client[]> => {
    // Client Role: Return only own record
    if (currentUser.role === UserRole.CLIENT) {
      // We need to fetch by ID matching user.id. 
      // Note: MockAuth returns user.id = client.id from DB row.
      let query = supabase.from(TABLE_NAME).select('*');

      const userId = currentUser.id;
      if (isUUID(userId)) {
        query = query.or(`id.eq.${userId},user_id.eq.${userId}`);
      } else {
        query = query.eq('property_correo_electr_nico', currentUser.email);
      }

      const { data, error } = await query;
      if (error) throw error;
      let clientRecords = (data || []).map(mapRowToClient);

      // Enrich client with latest check-in data
      try {
        const clientId = clientRecords[0]?.id;
        if (clientId) {
          const { data: checkins } = await supabase
            .from('weekly_checkins')
            .select('id, client_id, created_at, status, reviewed_at')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (checkins && checkins.length > 0) {
            const lastCheckin = checkins[0];
            clientRecords = clientRecords.map(c => ({
              ...c,
              last_checkin_submitted: lastCheckin.created_at,
              last_checkin_status: lastCheckin.status,
              last_checkin_id: lastCheckin.id,
              last_checkin_reviewed_at: lastCheckin.reviewed_at
            }));
          }
        }
      } catch (err) {
        console.warn('Could not fetch checkin for client:', err);
      }

      return clientRecords;
    }

    // Helper function to normalize text (remove accents and lower case)
    const normalize = (text: string) =>
      (text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const roleLower = (currentUser.role || '').toLowerCase();

    let data: any[] | null = null;
    let error: any = null;

    // OPTIMIZACIÓN: Para coaches, filtrar directamente en la base de datos
    if (roleLower === 'coach') {
      const coachName = currentUser.name || '';
      const coachId = currentUser.id || '';
      const emailPrefix = (currentUser.email || '').split('@')[0];
      const firstName = coachName.split(' ')[0];

      console.log(`🔍 Coach query optimizada: name="${coachName}", id="${coachId}"`);

      // Filtrar por coach_id (UUID) o por property_coach (nombre) directamente en Supabase
      // Se usan ilike para nombres y eq para IDs/UUIDs
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .or(`coach_id.eq.${coachId},property_coach.ilike.%${firstName}%,property_coach.ilike.%${emailPrefix}%,property_coach.eq.${coachName}`);

      data = result.data;
      error = result.error;

      console.log(`✅ Coach ${coachName} tiene ${data?.length || 0} clientes (query directa)`);
    } else {
      // Admin/Head Coach: Cargar todos
      const result = await supabase
        .from(TABLE_NAME)
        .select('*');

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Supabase Error:", error);
      throw error;
    }

    let clients = (data || []).map(mapRowToClient);

    // --- ENRICH CLIENTS WITH LATEST CHECK-IN DATE ---
    try {
      // Solo traer check-ins de los últimos 30 días (optimiza carga en móvil)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: checkins } = await supabase
        .from('weekly_checkins')
        .select('id, client_id, created_at, status, reviewed_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (checkins) {
        // Map: client_id -> { date, status, id, reviewed_at }
        const latestCheckinsMap = new Map<string, { date: string; status: any; id: string; reviewed_at?: string }>();

        checkins.forEach((c: any) => {
          if (!latestCheckinsMap.has(c.client_id)) {
            latestCheckinsMap.set(c.client_id, {
              date: c.created_at,
              status: c.status,
              id: c.id,
              reviewed_at: c.reviewed_at
            });
          }
        });

        // Also check local mocks
        mockCheckins.forEach(c => {
          const current = latestCheckinsMap.get(c.client_id);
          // If local is newer or no db record
          if (!current || new Date(c.created_at) > new Date(current.date)) {
            latestCheckinsMap.set(c.client_id, {
              date: c.created_at,
              status: c.status,
              id: c.id,
              reviewed_at: (c as any).reviewed_at
            });
          }
        });

        clients = clients.map(client => {
          const lastCheckin = latestCheckinsMap.get(client.id);
          return {
            ...client,
            last_checkin_submitted: lastCheckin?.date,
            last_checkin_status: lastCheckin?.status,
            last_checkin_id: lastCheckin?.id,
            last_checkin_reviewed_at: lastCheckin?.reviewed_at
          };
        });
      }
    } catch (err) {
      console.warn('Could not fetch latest checkins from Supabase, checking local only:', err);
      // Fallback local checkins logic if DB fails
      const latestCheckinsMap = new Map<string, { date: string; status: any; id: string; reviewed_at?: string }>();
      mockCheckins.forEach(c => {
        const current = latestCheckinsMap.get(c.client_id);
        if (!current || new Date(c.created_at) > new Date(current.date)) {
          latestCheckinsMap.set(c.client_id, {
            date: c.created_at,
            status: c.status,
            id: c.id,
            reviewed_at: (c as any).reviewed_at
          });
        }
      });
      clients = clients.map(client => {
        const lastCheckin = latestCheckinsMap.get(client.id);
        return {
          ...client,
          last_checkin_submitted: lastCheckin?.date,
          last_checkin_status: lastCheckin?.status,
          last_checkin_id: lastCheckin?.id,
          last_checkin_reviewed_at: lastCheckin?.reviewed_at
        };
      });
    }

    return clients;
  },





  updateClientStatus: async (clientId: string, status: ClientStatus, additionalData?: Partial<Client>) => {
    const rowUpdates: any = {};

    const statusMap: Record<string, string> = {
      [ClientStatus.ACTIVE]: 'Activo',
      [ClientStatus.INACTIVE]: 'Baja',
      [ClientStatus.PAUSED]: 'Pausa',
      [ClientStatus.DROPOUT]: 'Abandono',
      [ClientStatus.COMPLETED]: 'Completado'
    };

    rowUpdates['property_estado_cliente'] = statusMap[status];

    if (additionalData) {
      const mapped = mapClientToRow(additionalData);
      Object.assign(rowUpdates, mapped);
    }

    // --- PAUSE LOGIC IMPLEMENTATION (PHASE Q) ---
    try {
      if (status === ClientStatus.PAUSED) {
        const today = new Date().toISOString().split('T')[0];
        const pauseDate = additionalData?.pauseDate || today;
        const pauseReason = additionalData?.pauseReason || 'Pausa manual';

        // Delete any existing open pauses for this client (prevents duplicates)
        await supabase.from('contract_pauses')
          .delete()
          .eq('client_id', clientId)
          .is('end_date', null);

        // Insert the new pause record (single record per client)
        const { error: pauseError } = await supabase.from('contract_pauses').insert({
          client_id: clientId,
          start_date: pauseDate,
          reason: pauseReason
        });
        if (pauseError) console.warn('Error inserting pause record:', pauseError);
      }
      else if (status === ClientStatus.ACTIVE) {
        // 2. Close any open pauses
        const { error: resumeError } = await supabase.from('contract_pauses')
          .update({ end_date: new Date().toISOString().split('T')[0] })
          .eq('client_id', clientId)
          .is('end_date', null);

        if (resumeError) console.warn('Error closing pause record:', resumeError);
      }
    } catch (e) {
      console.error('Error in Pause Logic Side-Effects:', e);
    }
    // ---------------------------------------------

    const { error } = await supabase
      .from(TABLE_NAME)
      .update(rowUpdates)
      .eq('id', clientId);

    if (error) throw error;
  },

  calculateAdjustedEndDate: async (clientId: string, originalEndDate: string): Promise<string> => {
    try {
      // 1. Try SQL RPC (Best Performance)
      const { data, error } = await supabase.rpc('calculate_adjusted_end_date', {
        p_client_id: clientId,
        p_original_end_date: originalEndDate
      });

      if (!error && data) return data;

      // 2. JS Fallback (Robustness)
      console.warn('RPC unavailable, calculating locally...');
      const { data: pauses } = await supabase
        .from('contract_pauses')
        .select('*')
        .eq('client_id', clientId);

      if (!pauses || pauses.length === 0) return originalEndDate;

      let totalDays = 0;
      const now = new Date();

      pauses.forEach((p: any) => {
        const start = new Date(p.start_date);
        const end = p.end_date ? new Date(p.end_date) : now;
        const diff = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        totalDays += diff;
      });

      const adjusted = new Date(originalEndDate);
      adjusted.setDate(adjusted.getDate() + totalDays);
      return adjusted.toISOString().split('T')[0];

    } catch (e) {
      console.error('Error calculating adjusted date:', e);
      return originalEndDate;
    }
  },

  updateClient: async (client: Client) => {
    // 1. UPDATE LEGACY TABLE (Best Effort)
    try {
      const rowUpdates = mapClientToRow(client);
      delete rowUpdates['id'];

      // DEBUG: Log key update fields
      console.log('Sending Update for Client:', client.id, {
        type: rowUpdates['assigned_nutrition_type'],
        cals: rowUpdates['assigned_calories'],
        goal_status: {
          g3: rowUpdates['goal_3_months_status'],
          g6: rowUpdates['goal_6_months_status'],
          g1: rowUpdates['goal_1_year_status']
        }
      });

      const { error } = await supabase
        .from(TABLE_NAME)
        .update(rowUpdates)
        .eq('id', client.id);

      if (error) {
        console.error('legacy DB UPDATE FAILED:', error);
        // Throwing error so handleClientUpdate in App.tsx catches it and shows a toast
        throw new Error(`Error en DB principal: ${error.message}`);
      } else {
        console.log('Update Successful in DB');
      }
    } catch (err: any) {
      console.error('Legacy DB Update CRITICAL Exception:', err);
      throw err; // Propagate to UI
    }

    // 2. INSERT INTO NEW COACHING_SESSIONS TABLE
    // This satisfies the requirement to use a dedicated table for reviews
    if (client.weeklyReviewUrl) {
      try {
        const { error: reviewError } = await supabase
          .from('coaching_sessions')
          .insert({
            client_id: client.id,
            coach_id: client.coach_id,
            // coach_name: client.coach_name // If available in client object
            date: client.weeklyReviewDate || new Date().toISOString(),
            recording_url: client.weeklyReviewUrl,
            coach_comments: client.weeklyReviewComments,
            type: 'weekly_review',
            summary: `Revisión del ${client.weeklyReviewDate || 'fecha actual'}`,
            created_at: new Date().toISOString()
          });
      } catch (e) { console.error(e); }
    }

    // 3. (NEW) SAVE NUTRITION HISTORY
    // As requested: Store history of plan assignments in a separate table
    if (client.nutrition && client.nutrition.assigned_nutrition_type && client.nutrition.assigned_calories) {
      try {
        // First mark previous active plans as inactive (optional, but good practice)
        await supabase
          .from('client_plan_assignments')
          .update({ active: false })
          .eq('client_id', client.id);

        // Insert new plan
        const { error: planError } = await supabase
          .from('client_plan_assignments')
          .insert({
            client_id: client.id,
            plan_type: client.nutrition.assigned_nutrition_type,
            calories: Number(client.nutrition.assigned_calories),
            assigned_date: new Date().toISOString(),
            active: true,
            created_by: 'system' // or user id if available
          });

        if (planError) console.warn('History Table (client_plan_assignments) missing or error:', planError.message);
        else console.log('✅ Nutrition Plan saved to History');

      } catch (e) {
        console.warn('Error saving plan history (non-critical):', e);
      }
    }
  },

  createReview: async (review: any) => {
    try {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .insert(review)
        .select()
        .single();

      if (error) {
        // Fallback for demo if table missing or error
        console.warn('Could not save to coaching_sessions (Supabase), ignoring for demo:', error);
      }
      return data;
    } catch (e) {
      console.error('Error creating review:', e);
    }
  },

  getClientReviews: async (clientId: string) => {
    // Return mock data fallback if Supabase fails or is empty, 
    // but primarily try to fetch from real table
    const { data, error } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (data) {
      console.log(`[DEBUG] Fetched ${data.length} reviews for client ${clientId}`);
      data.forEach(r => {
        console.log(`   - Review ${r.date}: URL=${r.recording_url ? 'YES' : 'NO'} (${r.recording_url})`);
      });
    }

    if (error) {
      console.warn('Error fetching reviews (using empty list):', error.message);
      return [];
    }
    return data || [];
  },

  // --- CLASSES MANAGEMENT ---
  getClasses: async (): Promise<ClassSession[]> => {
    const { data, error } = await supabase
      .from('weekly_classes')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn("Failed to fetch classes (or table missing)", error.message);
      return [];
    }
    return data || [];
  },

  createClass: async (classSession: Omit<ClassSession, 'id'>) => {
    const { data, error } = await supabase
      .from('weekly_classes')
      .insert(classSession)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- WEEKLY CHECK-INS ---
  submitCheckin: async (checkin: Omit<WeeklyCheckin, 'id' | 'created_at' | 'status'>) => {
    try {
      const { data, error } = await supabase
        .from('weekly_checkins')
        .insert({
          ...checkin,
          status: 'pending_review'
        })
        .select()
        .single();

      if (error) throw error;

      // Update local client mock for immediate visibility if needed
      try {
        const { data: clientData } = await supabase.from(TABLE_NAME).select('*').eq('id', checkin.client_id).single();
        if (clientData) {
          // This ensures that when fetchClients is called, it sees the update even if the join has a slight lag
          // or if we're relying on mock data in some scenarios.
        }
      } catch (e) { }

      return data;
    } catch (e: any) {
      console.warn('Supabase checkin submit failed, using local mock fallback:', e.message);

      // Fallback: Store locally for this session
      const newCheckin: WeeklyCheckin = {
        id: `mock-${Date.now()}`,
        created_at: new Date().toISOString(),
        client_id: checkin.client_id,
        responses: checkin.responses,
        rating: checkin.rating,
        status: 'pending_review',
        coach_notes: checkin.coach_notes
      };

      mockCheckins.unshift(newCheckin); // Add to beginning
      await delay(500); // Simulate network
      return newCheckin;
    }
  },

  getCheckins: async (clientId: string): Promise<WeeklyCheckin[]> => {
    let dbCheckins: WeeklyCheckin[] = [];

    // 1. Try fetching from DB
    const { data, error } = await supabase
      .from('weekly_checkins')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      dbCheckins = data;
    } else {
      console.warn('Error fetching checkins (or table missing), checking local mock:', error?.message);
    }

    // 2. Filter local mocks for this client
    const localCheckins = mockCheckins.filter(c => c.client_id === clientId);

    // 3. Merge and sort
    // Note: In a real app we'd prefer DB, but here we merge to show both if testing hybrid
    const allCheckins = [...localCheckins, ...dbCheckins].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return allCheckins;
  },

  updateCheckin: async (checkinId: string, updates: Partial<WeeklyCheckin>) => {
    try {
      // Añadir reviewed_at automáticamente cuando se marca como revisado
      const finalUpdates = { ...updates };
      if (updates.status === 'reviewed') {
        (finalUpdates as any).reviewed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('weekly_checkins')
        .update(finalUpdates)
        .eq('id', checkinId);

      if (error) throw error;

      // Update local mock store as well for immediate feedback in demo
      mockCheckins = mockCheckins.map(c => c.id === checkinId ? { ...c, ...finalUpdates } : c);

    } catch (e: any) {
      console.error('Error updating checkin:', e);
      // Fallback update local
      const finalUpdates = { ...updates };
      if (updates.status === 'reviewed') {
        (finalUpdates as any).reviewed_at = new Date().toISOString();
      }
      mockCheckins = mockCheckins.map(c => c.id === checkinId ? { ...c, ...finalUpdates } : c);
    }
  },


  deleteCheckin: async (checkinId: string) => {
    try {
      const { error } = await supabase
        .from('weekly_checkins')
        .delete()
        .eq('id', checkinId);
      if (error) throw error;
      mockCheckins = mockCheckins.filter(c => c.id !== checkinId);
    } catch (e: any) {
      console.error('Error deleting checkin:', e);
      mockCheckins = mockCheckins.filter(c => c.id !== checkinId);
    }
  },

  updateClass: async (classSession: ClassSession) => {
    const { error } = await supabase
      .from('weekly_classes')
      .update(classSession)
      .eq('id', classSession.id);
    if (error) throw error;
  },

  deleteClass: async (id: string) => {
    const { error } = await supabase
      .from('weekly_classes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // --- CLIENT CREATION (ONBOARDING) ---
  createClient: async (newClient: Partial<Client> & { password?: string }) => {
    try {
      // 1. Prepare row for Notion/CRM Table
      const rowData = mapClientToRow(newClient);

      // Ensure we have a created_at if not present
      if (!rowData['created_at']) {
        rowData['created_at'] = new Date().toISOString();
      }
      if (!rowData['property_estado_cliente']) {
        rowData['property_estado_cliente'] = 'Activo';
      }

      console.log('Creating new client in CRM DB:', rowData);

      // A. Insert into CRM Table
      const { data: crmData, error: crmError } = await supabase
        .from(TABLE_NAME)
        .insert(rowData)
        .select()
        .single();

      if (crmError) throw crmError;

      // B. Create Auth User (users table) so they can login immediately
      if (newClient.password && newClient.email) {
        console.log('Creating Auth User for Client...');
        const { error: authError } = await supabase
          .from('users')
          .insert({
            id: crmData.id, // Try to sync IDs if possible, or let Supabase gen one
            // Note: if IDs are UUID in users and something else in Notion, this might fail.
            // Safer to generate a new UUID for Auth if needed, but let's try syncing for simplicity.
            // If crmData.id is not a UUID, we might need a workaround. Assuming UUID for now.
            email: newClient.email,
            password: newClient.password,
            name: `${newClient.firstName || ''} ${newClient.surname || ''}`.trim(),
            role: UserRole.CLIENT,
            avatar_url: `https://ui-avatars.com/api/?name=${newClient.firstName}`
          });

        if (authError) {
          // If ID conflict or other issue, try inserting without forcing ID
          console.warn('Could not sync ID for Auth User, creating with new ID:', authError.message);
          await supabase.from('users').insert({
            email: newClient.email,
            password: newClient.password,
            name: `${newClient.firstName || ''} ${newClient.surname || ''}`.trim(),
            role: UserRole.CLIENT,
            avatar_url: `https://ui-avatars.com/api/?name=${newClient.firstName}`
          });
        }
      }

      return mapRowToClient(crmData);
    } catch (e: any) {
      console.error('Error creating client:', e);
      throw e;
    }
  }
};

export const mockAdmin = {
  getUsers: async (): Promise<User[]> => {
    try {
      // Try to get users from Supabase first
      const { data, error } = await supabase
        .from('users')
        .select('*');

      if (error) {
        console.warn('No users table in Supabase, using mock data:', error.message);
        // Fallback to mock users if table doesn't exist
        await delay(500);
        return [...mockUsers];
      }

      // If we have data from Supabase, use it and update mockUsers
      if (data && data.length > 0) {
        mockUsers = data.map(row => ({
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role as UserRole,
          max_clients: row.max_clients,
          avatarUrl: row.avatarUrl || row.avatar_url || `https://ui-avatars.com/api/?name=${row.name}`,
          password: row.password,
          tier: row.tier,
          is_exclusive: row.is_exclusive,
          performance_notes: row.performance_notes,
          tier_updated_at: row.tier_updated_at
        }));
        return mockUsers;
      }

      // If table exists but is empty, seed it with mock data
      if (data && data.length === 0 && mockUsers.length > 0) {
        console.log('Seeding users table with initial data...');
        const { data: seeded, error: seedError } = await supabase
          .from('users')
          .insert(mockUsers.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            avatar_url: u.avatarUrl,
            password: u.password || '123456'
          })))
          .select();

        if (seedError) {
          console.error('Error seeding users:', seedError);
          return [...mockUsers];
        }

        return mockUsers;
      }

      return [...mockUsers];
    } catch (err) {
      console.error('Error fetching users:', err);
      await delay(500);
      return [...mockUsers];
    }
  },

  createUser: async (user: Omit<User, 'id'>): Promise<User & { manualMode?: boolean, tempPassword?: string }> => {
    // 1. GENERATE DEFAULT / TEMP CREDENTIALS
    // We generate these upfront in case we need to fallback to manual mode
    const tempPassword = (user as any).password || Math.random().toString(36).slice(-8);
    const tempId = Math.random().toString(36).substr(2, 9);

    // Base object
    const newUserObj = {
      ...user,
      id: tempId, // Will be overwritten if Auth succeeds
      avatarUrl: user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`,
      password: tempPassword
    };

    // 2. ATTEMPT PROFESSIONAL INVITATION (Edge Function)
    try {
      console.log('Attemping to invite via Edge Function...');
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: user.email,
          name: user.name,
          role: user.role,
          redirectTo: window.location.origin // Dynamic redirect
        }
      });

      if (error) throw error; // Function call failed (e.g. 404 Not Found if not deployed)
      if (data?.error) throw new Error(data.error); // Function executed but returned error

      // SUCCESS!
      console.log('Invitation sent successfully:', data);

      // The trigger in DB (automation_auth_sync.sql) should create the public.users record.
      // We might need to wait a moment or just return the optimistic data.
      return {
        ...newUserObj,
        id: data.user?.id || tempId, // Use real ID if available
        // No password needed, user will set it
      };

    } catch (edgeError: any) {
      console.warn('⚠️ Edge Function not available or failed. Falling back to Manual Mode.', edgeError);

      // 3. FALLBACK: MANUAL DATABASE INSERTION
      // If Edge Function fails (likely not deployed yet), we insert directly into public.users
      try {
        const { data, error } = await supabase
          .from('users')
          .insert({
            id: newUserObj.id,
            name: newUserObj.name,
            email: newUserObj.email,
            role: newUserObj.role,
            avatar_url: newUserObj.avatarUrl,
            password: newUserObj.password
          })
          .select()
          .single();

        if (error) {
          console.warn('Could not save to Supabase public table either, using mock storage:', error.message);
          // Ultimate fallback (Local Memory)
          await delay(500);
          mockUsers.push(newUserObj);
          return { ...newUserObj, manualMode: true, tempPassword };
        }

        // DB Insert Success
        mockUsers.push(newUserObj);
        return { ...newUserObj, manualMode: true, tempPassword };

      } catch (err) {
        console.error('Error creating user entirely:', err);
        // Fallback to mock
        await delay(500);
        mockUsers.push(newUserObj);
        return { ...newUserObj, manualMode: true, tempPassword };
      }
    }
  },

  updateUser: async (user: User): Promise<User> => {
    try {
      // Try to update in Supabase
      const { data, error } = await supabase
        .from('users')
        .update({
          name: user.name,
          email: user.email,
          role: user.role,
          max_clients: user.max_clients,
          avatar_url: user.avatarUrl,
          password: (user as any).password,
          tier: user.tier,
          is_exclusive: user.is_exclusive,
          performance_notes: user.performance_notes,
          tier_updated_at: user.tier_updated_at
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.warn('Could not update in Supabase, using mock storage:', error.message);
        await delay(500);
        mockUsers = mockUsers.map(u => u.id === user.id ? user : u);
        return user;
      }

      // Success! Update mock array too
      mockUsers = mockUsers.map(u => u.id === user.id ? user : u);
      return user;
    } catch (err) {
      console.error('Error updating user:', err);
      await delay(500);
      mockUsers = mockUsers.map(u => u.id === user.id ? user : u);
      return user;
    }
  },

  deleteUser: async (userId: string): Promise<void> => {
    try {
      // 1. Intentar borrar de Supabase Auth mediante Edge Function
      // (Necesario porque el cliente normal no puede borrar de auth.users directamente)
      const { data, error: functionError } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (functionError) {
        console.warn('Edge Function delete-user no disponible o error:', functionError.message);

        // 2. Si falla la Edge Function (ej: no está desplegada), borrar solo de la tabla pública
        const { error: dbError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (dbError) {
          throw new Error(`No se pudo eliminar de la base de datos: ${dbError.message}`);
        }
      }
    } catch (err: any) {
      console.error('Error deleting user:', err);
      // Fallback: Borrar solo de la tabla pública por si acaso
      await supabase.from('users').delete().eq('id', userId);
    }

    // Success! Update mock array too
    mockUsers = mockUsers.filter(u => u.id !== userId);
    await delay(300);
  },

  runDiagnostics: async () => {
    try {
      const { data, error, count } = await supabase
        .from(TABLE_NAME)
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      const { data: sample } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .limit(1);

      return {
        success: true,
        count: count,
        columns: sample && sample.length > 0 ? Object.keys(sample[0]) : [],
        sample: sample && sample.length > 0 ? sample[0] : null
      };
    } catch (err) {
      return { success: false, error: err };
    }
  }
};

export const mockEvolution = {
  tasks: {
    getAll: async (): Promise<CoachTask[]> => {
      const { data, error } = await supabase
        .from('coach_tasks')
        .select(`
          *,
          clientes_pt_notion(id, property_nombre, property_apellidos)
        `)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching all tasks:', error);
        return [];
      }

      return (data || []).map(t => ({
        ...t,
        client_name: t.clientes_pt_notion ? `${t.clientes_pt_notion.property_nombre || ''} ${t.clientes_pt_notion.property_apellidos || ''}`.trim() : 'Desconocido'
      })) as CoachTask[];
    },

    getByCoach: async (coachId: string): Promise<CoachTask[]> => {
      const { data, error } = await supabase
        .from('coach_tasks')
        .select(`
          *,
          clientes_pt_notion(id, property_nombre, property_apellidos)
        `)
        .eq('coach_id', coachId)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching tasks from DB:', error);
        return [];
      }

      return (data || []).map(t => ({
        ...t,
        client_name: t.clientes_pt_notion ? `${t.clientes_pt_notion.property_nombre || ''} ${t.clientes_pt_notion.property_apellidos || ''}`.trim() : 'Desconocido'
      })) as CoachTask[];
    },

    create: async (task: Partial<CoachTask>) => {
      const { data, error } = await supabase
        .from('coach_tasks')
        .insert(task)
        .select()
        .single();
      if (error) throw error;
      return data as CoachTask;
    },

    update: async (taskId: string, updates: Partial<CoachTask>) => {
      const { error } = await supabase
        .from('coach_tasks')
        .update(updates)
        .eq('id', taskId);
      if (error) throw error;
    },

    delete: async (taskId: string) => {
      const { error } = await supabase
        .from('coach_tasks')
        .delete()
        .eq('id', taskId);
      if (error) throw error;
    },

    getStaff: async () => {
      return await supabase
        .from('users')
        .select('*')
        .order('name');
    }
  },

  notifications: {
    getByUser: async (userId: string): Promise<UnifiedNotification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return [];
      return data as UnifiedNotification[];
    },

    markAsRead: async (notificationId: string) => {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
    },

    create: async (notification: Partial<UnifiedNotification>) => {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();
      if (error) throw error;
      return data as UnifiedNotification;
    }
  },

  tickets: {
    getAll: async (): Promise<SupportTicket[]> => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          clientes_pt_notion(id, property_nombre, property_apellidos),
          users!created_by(id, name),
          target_staff:users!staff_id(id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading tickets:', error);
        return [];
      }
      return (data || []).map(t => ({
        ...t,
        client_name: t.clientes_pt_notion ? `${t.clientes_pt_notion.property_nombre || ''} ${t.clientes_pt_notion.property_apellidos || ''}`.trim() : undefined,
        staff_name: (t as any).target_staff?.name,
        creator_name: (t as any).users?.name || 'Sistema'
      })) as SupportTicket[];
    },

    getByClient: async (clientId: string): Promise<SupportTicket[]> => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          clientes_pt_notion(id, property_nombre, property_apellidos),
          users!created_by(id, name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data || []).map(t => ({
        ...t,
        client_name: t.clientes_pt_notion ? `${t.clientes_pt_notion.property_nombre || ''} ${t.clientes_pt_notion.property_apellidos || ''}`.trim() : 'Desconocido',
        creator_name: (t as any).users?.name || 'Sistema'
      })) as SupportTicket[];
    },

    update: async (id: string, updates: Partial<SupportTicket>) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SupportTicket;
    },

    create: async (ticket: Partial<SupportTicket>) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert(ticket)
        .select()
        .single();
      if (error) throw error;
      return data as SupportTicket;
    },

    comments: {
      getByTicket: async (ticketId: string): Promise<SupportTicketComment[]> => {
        const { data, error } = await supabase
          .from('ticket_comments')
          .select(`
            *,
            users(name, photo_url)
          `)
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (error) return [];
        return (data || []).map(c => ({
          ...c,
          user_name: (c as any).users?.name || 'Usuario',
          user_photo: (c as any).users?.photo_url
        })) as SupportTicketComment[];
      },

      create: async (comment: Partial<SupportTicketComment>) => {
        const { data, error } = await supabase
          .from('ticket_comments')
          .insert(comment)
          .select()
          .single();
        if (error) throw error;
        return data as SupportTicketComment;
      }
    }
  },


  invoices: {
    getAll: async (): Promise<CoachInvoice[]> => {
      const { data, error } = await supabase
        .from('coach_invoices')
        .select(`
          *,
          users!coach_id(name)
        `)
        .order('submitted_at', { ascending: false });

      if (error) return [];
      return (data || []).map(i => ({
        ...i,
        coach_name: i.users?.name
      })) as CoachInvoice[];
    },

    getByCoach: async (coachId: string): Promise<CoachInvoice[]> => {
      const { data, error } = await supabase
        .from('coach_invoices')
        .select('*')
        .eq('coach_id', coachId)
        .order('period_date', { ascending: false });

      if (error) return [];
      return data as CoachInvoice[];
    },

    create: async (invoice: Partial<CoachInvoice>) => {
      const { data, error } = await supabase
        .from('coach_invoices')
        .insert(invoice)
        .select()
        .single();
      if (error) throw error;
      return data as CoachInvoice;
    },

    update: async (id: string, updates: Partial<CoachInvoice>) => {
      const { data, error } = await supabase
        .from('coach_invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as CoachInvoice;
    },

    delete: async (id: string) => {
      const { error } = await supabase
        .from('coach_invoices')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  }
};

