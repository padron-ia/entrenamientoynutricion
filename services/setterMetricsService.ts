/**
 * Servicio de Métricas de Rendimiento de Setters
 *
 * Calcula KPIs para el sistema de compensación de setters:
 * - Leads (asignados, contactados, agendados)
 * - Tasas (contacto, agenda, no-show, calidad)
 * - Tiempos (respuesta media, tiempo hasta agendar)
 * - Bonus por conversiones
 */

import { supabase } from './supabaseClient';
import { User, Lead, LeadStatus } from '../types';
import { getPaymentMethods, calculateNetAmount } from './closerMetricsService';

// ============================================================
// TIPOS Y CONSTANTES
// ============================================================

export interface SetterTier {
  level: 1 | 2 | 3;
  name: string;
  hourlyRate: number;
}

export const SETTER_TIERS: Record<number, SetterTier> = {
  1: { level: 1, name: 'Standard', hourlyRate: 0 }
};

export const CONVERSION_BONUS_TIERS: any[] = [];

export const SETTER_FIXED_SALARY = 400;
export const SETTER_COMMISSION_RATE = 5;

export function calculateSetterMonthlyBonus(conversions: number): number {
  if (conversions < 10) return 0;
  return 50 + Math.floor((conversions - 10) / 5) * 50;
}

export interface SetterLead extends Lead {
  setter_id?: string;
  setter_contacted_at?: string;
  setter_scheduled_at?: string;
  scheduled_call_date?: string;
  no_show?: boolean;
  payment_method_id?: string; // For net commission calculation
}

export interface SetterMonthlyMetrics {
  month: number;
  year: number;
  label: string;
  leads: {
    assigned: number;
    contacted: number;
    scheduled: number;
    passedToCloser: number;
    converted: number; // Won by closer
    noShows: number;
  };
  rates: {
    contactRate: number; // Contacted / Assigned
    scheduleRate: number; // Scheduled / Contacted
    noShowRate: number; // NoShows / Scheduled
    qualityRate: number; // Converted / PassedToCloser
  };
  times: {
    avgResponseTime: number; // Hours to first contact
    avgTimeToSchedule: number; // Hours from contact to schedule
  };
  compensation: {
    baseEarnings: number;
    commissionEarnings: number;
    monthlyBonus: number;
    totalEarnings: number;
  };
  fixedSalary: number;
}

export interface SetterPerformanceData {
  setter: User;
  tier: SetterTier;
  monthlyMetrics: SetterMonthlyMetrics[];
  totals: {
    totalLeads: number;
    totalScheduled: number;
    totalConverted: number;
    avgContactRate: number;
    avgScheduleRate: number;
    avgQualityRate: number;
    totalEarnings: number;
  };
  tierSuggestion: number | null;
}

export interface SetterDayAgenda {
  leadsToContact: SetterLead[];
  followUps: SetterLead[];
  scheduledToday: SetterLead[];
}

// ============================================================
// FUNCIONES DE CÁLCULO
// ============================================================

export function calculateConversionBonus(scheduledCount: number, conversions: number): number {
  return 0; // Deprecated by calculateSetterMonthlyBonus
}

export function suggestSetterTier(avgContactRate: number, avgScheduleRate: number, avgNoShowRate: number, avgQualityRate: number): number {
  if (avgContactRate >= 95 && avgScheduleRate >= 40 && avgQualityRate >= 60) return 3;
  if (avgContactRate >= 90 && avgScheduleRate >= 30 && avgNoShowRate <= 30) return 2;
  if (avgContactRate >= 80 && avgScheduleRate >= 20) return 1;
  return 1;
}

/**
 * Calcula métricas mensuales para un setter
 */
export function calculateSetterMonthlyMetrics(
  setterId: string,
  leads: SetterLead[],
  month: number,
  year: number,
  tier: any,
  hoursWorked: number = 40,
  paymentMethods: { id: string; platform_fee_percentage: number }[] = []
): SetterMonthlyMetrics {
  const monthStart = new Date(year, month, 1);
  const monthLabel = monthStart.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  // Filter leads by month and setter
  const setterLeads = leads.filter(l => {
    if (l.setter_id !== setterId && l.assigned_to !== setterId) return false;
    const d = new Date(l.created_at);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  // Lead metrics
  const assignedLeads = setterLeads.length;
  const contactedLeads = setterLeads.filter(l =>
    l.status !== 'NEW' || l.setter_contacted_at
  ).length;
  const scheduledLeads = setterLeads.filter(l =>
    l.status === 'SCHEDULED' || l.status === 'WON' || l.status === 'LOST' || l.setter_scheduled_at
  ).length;
  const passedToCloser = setterLeads.filter(l =>
    l.assigned_to && l.assigned_to !== setterId
  ).length;
  const convertedLeads = setterLeads.filter(l => l.status === 'WON').length;
  const noShowLeads = setterLeads.filter(l => l.no_show).length;

  // Rates
  const contactRate = assignedLeads > 0 ? Math.round((contactedLeads / assignedLeads) * 100) : 0;
  const scheduleRate = contactedLeads > 0 ? Math.round((scheduledLeads / contactedLeads) * 100) : 0;
  const noShowRate = scheduledLeads > 0 ? Math.round((noShowLeads / scheduledLeads) * 100) : 0;
  const qualityRate = passedToCloser > 0 ? Math.round((convertedLeads / passedToCloser) * 100) : 0;

  // Time calculations (simplified - would need more detailed tracking in real scenario)
  const leadsWithContactTime = setterLeads.filter(l => l.setter_contacted_at);
  let avgResponseTime = 0;
  if (leadsWithContactTime.length > 0) {
    const totalResponseHours = leadsWithContactTime.reduce((sum, l) => {
      const created = new Date(l.created_at).getTime();
      const contacted = new Date(l.setter_contacted_at!).getTime();
      return sum + (contacted - created) / (1000 * 60 * 60);
    }, 0);
    avgResponseTime = Math.round(totalResponseHours / leadsWithContactTime.length);
  }

  const leadsWithScheduleTime = setterLeads.filter(l => l.setter_contacted_at && l.setter_scheduled_at);
  let avgTimeToSchedule = 0;
  if (leadsWithScheduleTime.length > 0) {
    const totalScheduleHours = leadsWithScheduleTime.reduce((sum, l) => {
      const contacted = new Date(l.setter_contacted_at!).getTime();
      const scheduled = new Date(l.setter_scheduled_at!).getTime();
      return sum + (scheduled - contacted) / (1000 * 60 * 60);
    }, 0);
    avgTimeToSchedule = Math.round(totalScheduleHours / leadsWithScheduleTime.length);
  }

  // Revenue from converted leads for commissions (calculated on NET after platform fees)
  const wonLeads = setterLeads.filter(l => l.status === 'WON');
  const commissionEarnings = wonLeads.reduce((sum, l) => {
    const grossPrice = l.sale_price || 0;
    const netPrice = calculateNetAmount(grossPrice, l.payment_method_id, paymentMethods);
    return sum + Math.round(netPrice * (SETTER_COMMISSION_RATE / 100));
  }, 0);

  // Monthly bonus according to new rules
  const monthlyBonus = calculateSetterMonthlyBonus(convertedLeads);

  const baseEarnings = SETTER_FIXED_SALARY;
  const totalEarnings = baseEarnings + commissionEarnings + monthlyBonus;

  return {
    month,
    year,
    label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    leads: {
      assigned: assignedLeads,
      contacted: contactedLeads,
      scheduled: scheduledLeads,
      passedToCloser,
      converted: convertedLeads,
      noShows: noShowLeads
    },
    rates: {
      contactRate,
      scheduleRate,
      noShowRate,
      qualityRate
    },
    times: {
      avgResponseTime,
      avgTimeToSchedule
    },
    compensation: {
      baseEarnings,
      commissionEarnings,
      monthlyBonus,
      totalEarnings
    },
    fixedSalary: SETTER_FIXED_SALARY
  };
}

/**
 * Obtiene datos completos de rendimiento de un setter
 */
export async function getSetterPerformanceData(
  setter: User,
  leads: SetterLead[],
  months: number = 4
): Promise<SetterPerformanceData> {
  const tier = SETTER_TIERS[setter.tier || 1];
  const now = new Date();
  const monthlyMetrics: SetterMonthlyMetrics[] = [];

  // Load payment methods for proper net amount calculation
  const paymentMethods = await getPaymentMethods();

  // Calculate metrics for the last N months
  for (let i = 0; i < months; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMetrics.push(
      calculateSetterMonthlyMetrics(
        setter.id,
        leads,
        targetDate.getMonth(),
        targetDate.getFullYear(),
        tier,
        undefined, // hoursWorked
        paymentMethods
      )
    );
  }

  // Calculate totals
  const totalLeads = monthlyMetrics.reduce((sum, m) => sum + m.leads.assigned, 0);
  const totalScheduled = monthlyMetrics.reduce((sum, m) => sum + m.leads.scheduled, 0);
  const totalConverted = monthlyMetrics.reduce((sum, m) => sum + m.leads.converted, 0);
  const totalEarnings = monthlyMetrics.reduce((sum, m) => sum + m.compensation.totalEarnings, 0);

  const latestMonth = monthlyMetrics[0];
  const tierSuggestion = latestMonth ? suggestSetterTier(
    latestMonth.rates.contactRate,
    latestMonth.rates.scheduleRate,
    latestMonth.rates.noShowRate,
    latestMonth.rates.qualityRate
  ) : (setter.tier || 1);

  const avgContactRate = latestMonth ? latestMonth.rates.contactRate : 0;
  const avgScheduleRate = latestMonth ? latestMonth.rates.scheduleRate : 0;
  const avgQualityRate = latestMonth ? latestMonth.rates.qualityRate : 0;

  return {
    setter,
    tier,
    monthlyMetrics,
    totals: {
      totalLeads,
      totalScheduled,
      totalConverted,
      avgContactRate,
      avgScheduleRate,
      avgQualityRate,
      totalEarnings: Math.round(totalEarnings)
    },
    tierSuggestion: tierSuggestion !== (setter.tier || 1) ? tierSuggestion : null
  };
}

/**
 * Obtiene la agenda del día para un setter
 */
export function getSetterDayAgenda(
  setterId: string,
  leads: SetterLead[]
): SetterDayAgenda {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Leads assigned to setter that haven't been contacted
  const leadsToContact = leads.filter(l =>
    (l.setter_id === setterId || l.assigned_to === setterId) &&
    l.status === 'NEW' &&
    !l.setter_contacted_at
  );

  // Leads that need follow-up (contacted but not scheduled, with follow-up date today or past)
  const followUps = leads.filter(l => {
    if (l.setter_id !== setterId && l.assigned_to !== setterId) return false;
    if (l.status !== 'CONTACTED') return false;
    if (!l.next_followup_date) return false;
    const followupDate = new Date(l.next_followup_date);
    return followupDate <= tomorrow;
  });

  // Leads with calls scheduled for today
  const scheduledToday = leads.filter(l => {
    if (l.setter_id !== setterId && l.assigned_to !== setterId) return false;
    if (!l.scheduled_call_date) return false;
    const callDate = new Date(l.scheduled_call_date);
    callDate.setHours(0, 0, 0, 0);
    return callDate.getTime() === today.getTime();
  });

  return {
    leadsToContact,
    followUps,
    scheduledToday
  };
}

// ============================================================
// SERVICIOS DE BASE DE DATOS
// ============================================================

/**
 * Obtiene todos los leads con datos de setter
 */
export async function fetchSetterLeads(setterId?: string): Promise<SetterLead[]> {
  try {
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (setterId) {
      query = query.or(`setter_id.eq.${setterId},assigned_to.eq.${setterId}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(l => ({
      id: l.id,
      firstName: l.first_name || l.firstName || '',
      surname: l.surname || l.last_name || '',
      name: `${l.first_name || l.firstName || ''} ${l.surname || l.last_name || ''}`.trim(),
      email: l.email,
      phone: l.phone,
      instagram_user: l.instagram_user,
      status: l.status as LeadStatus,
      source: l.source || 'Unknown',
      notes: l.notes,
      assigned_to: l.assigned_to,
      last_contact_date: l.last_contact_date,
      next_followup_date: l.next_followup_date,
      created_at: l.created_at,
      updated_at: l.updated_at,
      assigned_to_name: l.assigned_to_name,
      // Setter-specific fields
      setter_id: l.setter_id,
      setter_contacted_at: l.setter_contacted_at,
      setter_scheduled_at: l.setter_scheduled_at,
      scheduled_call_date: l.scheduled_call_date,
      no_show: l.no_show,
      // Enhanced fields
      closer_id: l.closer_id,
      in_out: l.in_out,
      procedencia_detalle: l.procedencia_detalle,
      qualification_level: l.qualification_level,
      attended: l.attended,
      objections: l.objections,
      recording_url: l.recording_url,
      sale_price: l.sale_price,
      commission_amount: l.commission_amount,
      meeting_link: l.meeting_link,
      closer_notes: l.closer_notes,
      project: l.project
    }));
  } catch (err) {
    console.error('Error fetching setter leads:', err);
    return [];
  }
}

/**
 * Actualiza el estado de contacto de un lead por setter
 */
export async function markLeadContacted(
  leadId: string,
  setterId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        setter_id: setterId,
        setter_contacted_at: new Date().toISOString(),
        status: 'CONTACTED',
        last_contact_date: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error marking lead as contacted:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Agenda una llamada para un lead
 */
export async function scheduleLeadCall(
  leadId: string,
  setterId: string,
  closerId: string,
  callDate: string,
  project: 'PT' | 'ME' = 'PT'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        setter_id: setterId,
        setter_scheduled_at: new Date().toISOString(),
        scheduled_call_date: callDate,
        assigned_to: closerId,
        status: 'SCHEDULED',
        project: project
      })
      .eq('id', leadId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error scheduling lead call:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Marca un lead como no-show
 */
export async function markLeadNoShow(
  leadId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        no_show: true,
        status: 'CONTACTED' // Back to contacted for re-scheduling
      })
      .eq('id', leadId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error marking lead as no-show:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Actualiza el tier de un setter
 */
export async function updateSetterTier(
  setterId: string,
  tier: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        tier,
        tier_updated_at: new Date().toISOString()
      })
      .eq('id', setterId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error updating setter tier:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene todos los setters
 */
export async function fetchSetters(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'setter')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching setters:', err);
    return [];
  }
}

/**
 * Obtiene todos los closers (para asignar leads)
 */
export async function fetchClosersForAssignment(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, avatar_url')
      .eq('role', 'closer')
      .order('name');

    if (error) throw error;
    return (data || []) as User[];
  } catch (err) {
    console.error('Error fetching closers:', err);
    return [];
  }
}
