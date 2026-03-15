/**
 * Servicio de Métricas de Rendimiento de Coaches
 *
 * Calcula KPIs para el sistema de compensación según la normativa de Enero 2026:
 * - Tasa de renovaciones (Alineada con Staff Dashboard)
 * - Casos de éxito (testimonios por cliente único)
 * - Adherencia (check-ins)
 * - Bonus cuatrimestrales
 */

import { supabase } from './supabaseClient';
import { Client, ClientStatus, User } from '../types';

// ============================================================
// TIPOS Y CONSTANTES
// ============================================================

export interface CoachTier {
  level: 1 | 2 | 3;
  name: string;
  pricePerClient: number;
  requirements: string[];
  kpiRequirements: {
    renewalRate: number;
    successRate: number;
    adherence: number;
    taskCompliance: number;
    minNps?: number;
  };
}

export const COACH_TIERS: Record<number, CoachTier> = {
  1: {
    level: 1,
    name: 'Coach Operativo',
    pricePerClient: 32.5,
    requirements: [
      'Sin exclusividad requerida',
      'Deseable >40 clientes',
      'Gestión correcta de clientes',
      'Cumplimiento de tareas y procesos'
    ],
    kpiRequirements: {
      renewalRate: 50,
      successRate: 70,
      adherence: 80,
      taskCompliance: 80
    }
  },
  2: {
    level: 2,
    name: 'Coach Avanzado',
    pricePerClient: 40,
    requirements: [
      'Exclusividad absoluta',
      '≥65 clientes',
      '1 pieza de contenido semanal',
      'Gestión activa comunidad Telegram',
      'Soporte a Head Coach'
    ],
    kpiRequirements: {
      renewalRate: 55,
      successRate: 80,
      adherence: 80,
      taskCompliance: 90,
      minNps: 9
    }
  },
  3: {
    level: 3,
    name: 'Coach Alto Impacto',
    pricePerClient: 45,
    requirements: [
      'Exclusividad absoluta',
      '~50 clientes (tope)',
      '1 pieza de contenido diaria RRSS',
      'Responsabilidad estructural máxima'
    ],
    kpiRequirements: {
      renewalRate: 55,
      successRate: 80,
      adherence: 80,
      taskCompliance: 100
    }
  }
};

export interface BonusTier {
  min: number;
  max: number;
  amount: number;
}

export const RENEWAL_BONUS_TIERS: BonusTier[] = [
  { min: 0, max: 49, amount: 0 },
  { min: 50, max: 59, amount: 250 },
  { min: 60, max: 69, amount: 350 },
  { min: 70, max: 100, amount: 500 }
];

export const SUCCESS_BONUS_TIERS: BonusTier[] = [
  { min: 0, max: 69, amount: 0 },
  { min: 70, max: 79, amount: 250 },
  { min: 80, max: 89, amount: 350 },
  { min: 90, max: 100, amount: 500 }
];

export const DOCUMENTATION_BONUS = {
  minPieces: 16,
  amount: 200
};

export interface MonthlyMetrics {
  month: number;
  year: number;
  label: string;
  renewals: {
    target: number;
    completed: number;
    rate: number;
  };
  testimonials: {
    total: number;
    uniqueClients: number;
  };
  adherence: {
    expectedCheckins: number;
    completedCheckins: number;
    rate: number;
  };
  activeClients: number;
}

export interface QuarterMetrics {
  quarter: string;
  startMonth: number;
  endMonth: number;
  year: number;
  months: MonthlyMetrics[];
  totals: {
    renewalRate: number;
    successRate: number;
    adherenceRate: number;
    documentationCount: number;
  };
  bonus: {
    renewals: number;
    success: number;
    documentation: number;
    total: number;
    isDocumentationLeader: boolean;
  };
}

export interface CoachPerformanceData {
  coach: User;
  tier: CoachTier;
  isExclusive: boolean;
  activeClients: number;
  monthlyMetrics: MonthlyMetrics[];
  currentQuarter: QuarterMetrics;
  tierHistory: TierChange[];
  kpiStatus: {
    renewals: 'ok' | 'warning' | 'danger';
    success: 'ok' | 'warning' | 'danger';
    adherence: 'ok' | 'warning' | 'danger';
    tasks: 'ok' | 'warning' | 'danger';
  };
}

export interface TierChange {
  id: string;
  previousTier: number | null;
  newTier: number;
  previousExclusive: boolean | null;
  newExclusive: boolean;
  changedBy?: string;
  reason?: string;
  createdAt: string;
}

// ============================================================
// FUNCIONES PRIVADAS
// ============================================================

export const isCoachMatch = (coachId: string, coachName: string, idOrName?: string) => {
  if (!idOrName) return false;

  const normalize = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const normalizedMatch = normalize(idOrName);
  const cId = normalize(coachId);
  const cName = normalize(coachName);

  // Coincidencia exacta
  if (normalizedMatch === cId || normalizedMatch === cName) return true;

  // Coincidencia parcial (ej: "Helena" contenido en "Helena Martín")
  // Solo si el match tiene al menos 3 caracteres para evitar falsos positivos
  if (normalizedMatch.length >= 3) {
    if (cName.includes(normalizedMatch) || normalizedMatch.includes(cName)) return true;
    if (cId.includes(normalizedMatch) || normalizedMatch.includes(cId)) return true;
  }

  return false;
};

// ============================================================
// FUNCIONES DE CÁLCULO
// ============================================================

export function getCurrentQuarter(date: Date = new Date()): { quarter: number; year: number; startMonth: number; endMonth: number } {
  const month = date.getMonth();
  if (month <= 3) return { quarter: 1, year: date.getFullYear(), startMonth: 0, endMonth: 3 };
  if (month <= 7) return { quarter: 2, year: date.getFullYear(), startMonth: 4, endMonth: 7 };
  return { quarter: 3, year: date.getFullYear(), startMonth: 8, endMonth: 11 };
}

export function calculateRenewalBonus(rate: number): number {
  const tier = RENEWAL_BONUS_TIERS.find(t => rate >= t.min && rate <= t.max);
  return tier?.amount || 0;
}

export function calculateSuccessBonus(rate: number): number {
  const tier = SUCCESS_BONUS_TIERS.find(t => rate >= t.min && rate <= t.max);
  return tier?.amount || 0;
}

export function getKpiStatus(value: number, threshold: number): 'ok' | 'warning' | 'danger' {
  if (value >= threshold) return 'ok';
  if (value >= threshold - 10) return 'warning';
  return 'danger';
}

/**
 * Calcula métricas mensuales para un coach
 */
export function calculateMonthlyMetrics(
  coachId: string,
  coachName: string,
  clients: Client[],
  testimonials: any[],
  month: number,
  year: number
): MonthlyMetrics {
  const monthStart = new Date(year, month, 1);
  const monthLabel = monthStart.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  // 1. Clientes del coach - Comprobar tanto coach_id como property_coach (algunos tienen UUID, otros nombre)
  const coachClients = clients.filter(c =>
    isCoachMatch(coachId, coachName, c.coach_id) ||
    isCoachMatch(coachId, coachName, c.property_coach)
  );
  const activeClientsCount = coachClients.filter(c =>
    c.status === ClientStatus.ACTIVE
  ).length;

  // 2. Renovaciones - Solo F1 para coherencia con CMS
  const isDateInMonth = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === year && d.getMonth() === month;
  };

  let renewalTarget = 0;
  let renewalCompleted = 0;

  coachClients.forEach(c => {
    // Escaneo multi-fase idéntico a RenewalsView.tsx
    const phaseData = [
      { id: 'F2', date: c.program?.f1_endDate, contracted: c.program?.renewal_f2_contracted, prevContracted: true },
      { id: 'F3', date: c.program?.f2_endDate, contracted: c.program?.renewal_f3_contracted, prevContracted: c.program?.renewal_f2_contracted },
      { id: 'F4', date: c.program?.f3_endDate, contracted: c.program?.renewal_f4_contracted, prevContracted: c.program?.renewal_f3_contracted },
      { id: 'F5', date: c.program?.f4_endDate, contracted: c.program?.renewal_f5_contracted, prevContracted: c.program?.renewal_f4_contracted },
    ];

    const matches = phaseData.filter(p => {
      if (!p.date) return false;
      // CRITICAL FIX: Only consider a renewal "due" if the previous phase was actually contracted.
      if (!p.prevContracted) return false;

      const d = new Date(p.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    if (matches.length > 0) {
      // Tomamos la más avanzada si hay solapamiento (evita duplicados)
      const bestMatch = matches.sort((a, b) => b.id.localeCompare(a.id))[0];

      // Si el cliente está ACTIVO, sumamos al target
      // Si el cliente NO está activo (Baja/Abandono/Completed), SOLO sumamos si vencía este mes (ya filtrado arriba)
      // Esto asegura que una baja que debió renovar este mes cuente como fallo.
      renewalTarget++;

      // Paridad total con RenovationsView: Solo se considera éxito si está marcado como contratado
      if (bestMatch.contracted) {
        renewalCompleted++;
      }
    }
  });

  // 3. Testimonios (Unique Clients per month)
  const monthTestimonials = testimonials.filter(t => {
    return isCoachMatch(coachId, coachName, t.coach_id) || isCoachMatch(coachId, coachName, t.coach_name);
  }).filter(t => {
    const d = new Date(t.created_at);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const uniqueClientsInTestimonials = new Set(
    monthTestimonials.map(t => `${t.client_name} ${t.client_surname}`.toLowerCase().trim())
  ).size;

  // 4. Adherencia
  const expectedCheckins = activeClientsCount * 4;
  const completedCheckinsCount = coachClients.filter(c => {
    if (!c.last_checkin_submitted) return false;
    const d = new Date(c.last_checkin_submitted);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  const completedCheckins = completedCheckinsCount * 4;

  return {
    month,
    year,
    label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    renewals: {
      target: renewalTarget,
      completed: renewalCompleted,
      rate: renewalTarget > 0 ? Math.round((renewalCompleted / renewalTarget) * 100) : 0
    },
    testimonials: {
      total: monthTestimonials.length,
      uniqueClients: uniqueClientsInTestimonials
    },
    adherence: {
      expectedCheckins,
      completedCheckins,
      rate: expectedCheckins > 0 ? Math.round((completedCheckins / expectedCheckins) * 100) : 0
    },
    activeClients: activeClientsCount
  };
}

/**
 * Calcula métricas del cuatrimestre para un coach
 */
export function calculateQuarterMetrics(
  coachId: string,
  coachName: string,
  clients: Client[],
  testimonials: any[],
  allCoachesTestimonials: Map<string, number>,
  quarterInfo: { quarter: number; year: number; startMonth: number; endMonth: number }
): QuarterMetrics {
  const months: MonthlyMetrics[] = [];
  for (let m = quarterInfo.startMonth; m <= quarterInfo.endMonth; m++) {
    months.push(calculateMonthlyMetrics(coachId, coachName, clients, testimonials, m, quarterInfo.year));
  }

  /* 
   * CÁLCULO DE TOTALES (QTD - Quarter To Date)
   * Solo sumamos los objetivos de meses que ya han pasado o son el actual.
   * Evitamos diluir el porcentaje con meses futuros que aún no tienen actividad.
   */
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();

  const qtdMonths = months.filter(m => {
    // Si es año pasado, cuenta todo
    if (m.year < currentYear) return true;
    // Si es este año, solo hasta este mes
    if (m.year === currentYear && m.month <= currentMonthIdx) return true;
    return false;
  });

  const totalRenewalTarget = qtdMonths.reduce((sum, m) => sum + m.renewals.target, 0);
  const totalRenewalCompleted = qtdMonths.reduce((sum, m) => sum + m.renewals.completed, 0);

  const quarterTestimonials = testimonials.filter(t => {
    return isCoachMatch(coachId, coachName, t.coach_id) || isCoachMatch(coachId, coachName, t.coach_name);
  }).filter(t => {
    const d = new Date(t.created_at);
    return d.getMonth() >= quarterInfo.startMonth && d.getMonth() <= quarterInfo.endMonth && d.getFullYear() === quarterInfo.year;
  });

  const uniqueSuccessClients = new Set(
    quarterTestimonials.map(t => `${t.client_name} ${t.client_surname}`.toLowerCase().trim())
  ).size;

  const totalExpectedCheckins = months.reduce((sum, m) => sum + m.adherence.expectedCheckins, 0);
  const totalCompletedCheckins = months.reduce((sum, m) => sum + m.adherence.completedCheckins, 0);

  const renewalRate = totalRenewalTarget > 0 ? Math.min(100, Math.round((totalRenewalCompleted / totalRenewalTarget) * 100)) : 0;
  const successRate = totalRenewalTarget > 0 ? Math.round((uniqueSuccessClients / totalRenewalTarget) * 100) : 0;
  const adherenceRate = totalExpectedCheckins > 0 ? Math.round((totalCompletedCheckins / totalExpectedCheckins) * 100) : 0;

  // Bonus Documentación Extra (Líder del cuatrimestre)
  const maxPieces = Math.max(...Array.from(allCoachesTestimonials.values()), 0);
  const totalPieces = quarterTestimonials.length;
  const isDocumentationLeader = totalPieces === maxPieces && totalPieces >= DOCUMENTATION_BONUS.minPieces;

  const quarterNames = ['Ene-Abr', 'May-Ago', 'Sep-Dic'];

  return {
    quarter: `${quarterNames[quarterInfo.quarter - 1]} ${quarterInfo.year}`,
    startMonth: quarterInfo.startMonth,
    endMonth: quarterInfo.endMonth,
    year: quarterInfo.year,
    months,
    totals: {
      renewalRate,
      successRate,
      adherenceRate,
      documentationCount: totalPieces
    },
    bonus: {
      renewals: calculateRenewalBonus(renewalRate),
      success: calculateSuccessBonus(successRate),
      documentation: isDocumentationLeader ? DOCUMENTATION_BONUS.amount : 0,
      total: calculateRenewalBonus(renewalRate) + calculateSuccessBonus(successRate) + (isDocumentationLeader ? DOCUMENTATION_BONUS.amount : 0),
      isDocumentationLeader
    }
  };
}

// ============================================================
// SERVICIOS DE BASE DE DATOS
// ============================================================

export async function fetchTestimonials(): Promise<any[]> {
  const { data, error } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function fetchTierHistory(coachId: string): Promise<TierChange[]> {
  const { data, error } = await supabase.from('coach_tier_history').select('*').eq('coach_id', coachId).order('created_at', { ascending: false });
  if (error) return [];
  return (data || []).map(row => ({
    id: row.id,
    previousTier: row.previous_tier,
    newTier: row.new_tier,
    previousExclusive: row.previous_exclusive,
    newExclusive: row.new_exclusive,
    changedBy: row.changed_by,
    reason: row.reason,
    createdAt: row.created_at
  }));
}

export async function updateCoachTier(
  coachId: string,
  tier: number,
  isExclusive: boolean,
  notes?: string,
  nps?: number,
  taskCompliance?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error, count } = await supabase.from('users').update({
      tier,
      is_exclusive: isExclusive,
      performance_notes: notes,
      internal_nps: nps,
      task_compliance_rate: taskCompliance,
      tier_updated_at: new Date().toISOString()
    }).eq('id', coachId).select(); // select() help us see if it actually updated

    if (error) {
      console.error('Error actualizando coach en DB:', error);
      return { success: false, error: error.message };
    }

    // Si no hay error pero no hay datos devueltos, es probable que el RLS haya bloqueado el update
    if (!data || data.length === 0) {
      console.warn('Update exitoso pero 0 filas afectadas. ¡Revisa el RLS y tu sesión de Auth!', { coachId });
      return { success: false, error: 'No se pudo actualizar el registro. Es posible que no tengas permisos suficientes o tu sesión haya expirado.' };
    }

    console.log('Coach actualizado con éxito:', data[0]);
    return { success: true };
  } catch (err: any) {
    console.error('Error inesperado en updateCoachTier:', err);
    return { success: false, error: err.message || 'Error desconocido' };
  }
}

/**
 * Obtiene datos completos de rendimiento
 */
export async function getCoachPerformanceData(
  coach: User,
  clients: Client[],
  allTestimonials: any[],
  allCoaches: User[]
): Promise<CoachPerformanceData> {
  const currentQuarterInfo = getCurrentQuarter();
  const tierHistory = await fetchTierHistory(coach.id);

  // Mapa de piezas totales por coach para el bonus de liderazgo
  const allCoachesStats = new Map<string, number>();
  allCoaches.forEach(c => {
    const pieces = allTestimonials.filter(t => {
      const match = isCoachMatch(c.id, c.name, t.coach_id) || isCoachMatch(c.id, c.name, t.coach_name);
      if (!match) return false;
      const d = new Date(t.created_at);
      return d.getMonth() >= currentQuarterInfo.startMonth && d.getMonth() <= currentQuarterInfo.endMonth && d.getFullYear() === currentQuarterInfo.year;
    }).length;
    allCoachesStats.set(c.id, pieces);
  });

  const monthlyMetrics: MonthlyMetrics[] = [];
  // Generar métricas estrictamente para los meses del cuatrimestre actual (ej: Ene, Feb, Mar, Abr)
  // Orden inverso (Más reciente primero) si se prefiere, o cronológico.
  // Para listas, normalmente inverso es mejor (Abril arriba, Enero abajo),
  // pero para gráficos es cronológico.
  // El código original hacía `now.getMonth() - i` (inverso).
  // Vamos a generarlos en orden inverso del cuatrimestre para mantener consistencia visual (Mes futuro arriba).

  for (let m = currentQuarterInfo.endMonth; m >= currentQuarterInfo.startMonth; m--) {
    monthlyMetrics.push(calculateMonthlyMetrics(
      coach.id,
      coach.name,
      clients,
      allTestimonials,
      m,
      currentQuarterInfo.year
    ));
  }

  const currentQuarter = calculateQuarterMetrics(coach.id, coach.name, clients, allTestimonials, allCoachesStats, currentQuarterInfo);
  // USAR isCoachMatch para la consistencia en el conteo de clientes (comprobar ambos campos)
  const coachClients = clients.filter(c =>
    isCoachMatch(coach.id, coach.name, c.coach_id) ||
    isCoachMatch(coach.id, coach.name, c.property_coach)
  );
  const activeClients = coachClients.filter(c => c.status === ClientStatus.ACTIVE).length;
  const tier = COACH_TIERS[coach.tier || 1];

  return {
    coach,
    tier,
    isExclusive: !!coach.is_exclusive,
    activeClients,
    monthlyMetrics,
    currentQuarter,
    tierHistory,
    kpiStatus: {
      renewals: getKpiStatus(currentQuarter.totals.renewalRate, tier.kpiRequirements.renewalRate),
      success: getKpiStatus(currentQuarter.totals.successRate, tier.kpiRequirements.successRate),
      adherence: getKpiStatus(currentQuarter.totals.adherenceRate, tier.kpiRequirements.adherence),
      tasks: getKpiStatus(coach.task_compliance_rate || 0, tier.kpiRequirements.taskCompliance)
    }
  };
}
