/**
 * Servicio de Métricas de Rendimiento de Closers
 *
 * Calcula KPIs para el sistema de compensación de closers:
 * - Ventas (total, exitosas, fallidas)
 * - Ingresos (bruto, neto, ticket medio)
 * - Leads (asignados, contactados, ganados, perdidos)
 * - Tasas (cierre, conversión, no-show)
 * - Comisiones y Bonus
 */

import { supabase } from './supabaseClient';
import { User, Lead, LeadStatus } from '../types';

// ============================================================
// TIPOS Y CONSTANTES
// ============================================================

export interface CloserTier {
  level: 1 | 2 | 3;
  name: string;
  commissionRate: number;
}

export const CLOSER_TIERS: Record<number, CloserTier> = {
  1: { level: 1, name: 'Standard', commissionRate: 10 }
};

export const VOLUME_BONUS_TIERS: any[] = [];

export const CLOSER_FIXED_SALARY = 500;
export const CLOSER_COMMISSION_RATE = 10;

export function calculateCloserMonthlyBonus(salesCount: number): number {
  if (salesCount < 10) return 0;
  return 100 + Math.floor((salesCount - 10) / 5) * 100;
}

export interface Sale {
  id: string;
  closer_id: string;
  client_first_name: string;
  client_last_name: string;
  client_email: string;
  sale_amount: number;
  net_amount?: number;
  commission_amount?: number;
  commission_paid?: boolean;
  status: string;
  payment_receipt_url?: string | null;
  sale_date: string;
  project?: 'PT' | 'ME';
  created_at: string;
  payment_method_id?: string; // FK to payment_methods table
}

// Cache for payment methods to avoid repeated DB calls
let paymentMethodsCache: { id: string; name: string; platform_fee_percentage: number }[] | null = null;
let paymentMethodsCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Loads payment methods from DB with caching
 */
export async function getPaymentMethods(): Promise<{ id: string; name: string; platform_fee_percentage: number }[]> {
  const now = Date.now();
  if (paymentMethodsCache && (now - paymentMethodsCacheTime) < CACHE_TTL_MS) {
    return paymentMethodsCache;
  }

  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, name, platform_fee_percentage');

  if (error) {
    console.error('Error loading payment methods:', error);
    return paymentMethodsCache || [];
  }

  paymentMethodsCache = data || [];
  paymentMethodsCacheTime = now;
  return paymentMethodsCache;
}

/**
 * Calculates net amount after platform fee deduction
 */
export function calculateNetAmount(
  grossAmount: number,
  paymentMethodId: string | undefined,
  paymentMethods: { id: string; platform_fee_percentage: number }[]
): number {
  if (!paymentMethodId || !grossAmount) return grossAmount;

  const method = paymentMethods.find(m => m.id === paymentMethodId);
  if (!method) return grossAmount;

  const platformFee = grossAmount * (method.platform_fee_percentage / 100);
  return grossAmount - platformFee;
}

export interface CloserMonthlyMetrics {
  month: number;
  year: number;
  label: string;
  sales: {
    total: number;
    successful: number;
    failed: number;
  };
  revenue: {
    gross: number;
    net: number;
    avgTicket: number;
  };
  leads: {
    assigned: number;
    contacted: number;
    scheduled: number;
    won: number;
    lost: number;
  };
  rates: {
    closeRate: number; // Won / Scheduled
    conversionRate: number; // Won / Assigned
    noShowRate: number; // NoShows / Scheduled
  };
  commissions: {
    earned: number;
    paid: number;
    pending: number;
  };
  bonus: {
    monthly: number;
    quarterly: number;
    annual: number;
    total: number;
  };
  fixedSalary: number;
  totalEarnings: number;
}

export interface CloserPerformanceData {
  closer: User;
  tier: CloserTier;
  monthlyMetrics: CloserMonthlyMetrics[];
  totals: {
    totalSales: number;
    totalRevenue: number;
    avgCloseRate: number;
    totalCommissions: number;
    totalBonus: number;
    totalScheduled: number;
  };
  tierSuggestion: number | null; // Sugerencia de tier basada en rendimiento
}

// ============================================================
// FUNCIONES DE CÁLCULO
// ============================================================

export interface TeamPerformanceMetrics {
  currentQuarter: {
    totalCashCollected: number;
    multiplier: number;
    goal: number;
    label: string;
  };
  currentYear: {
    totalCashCollected: number;
    poolAmount: number;
    goal: number;
    label: string;
  };
}

export function calculateQuarterlyMultiplier(cashCollected: number): number {
  if (cashCollected < 200000) return 1;
  if (cashCollected < 220000) return 1.2;
  if (cashCollected < 235000) return 1.5;
  if (cashCollected < 250000) return 1.7;
  return 2.0;
}

export function calculateAnnualPool(cashCollected: number): number {
  if (cashCollected < 850000) return 0;
  if (cashCollected < 900000) return 10000;
  if (cashCollected < 950000) return 15000;
  if (cashCollected < 1000000) return 20000;
  return 30000;
}

export function getQuarterInfo(date: Date = new Date()) {
  const month = date.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  const startMonth = (quarter - 1) * 3;
  return {
    quarter,
    startMonth,
    label: `Q${quarter} ${date.getFullYear()}`
  };
}

/**
 * Calcula métricas globales de equipo
 */
export async function getTeamPerformanceMetrics(sales: Sale[]): Promise<TeamPerformanceMetrics> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const { quarter, startMonth, label: qLabel } = getQuarterInfo(now);

  // Annual sales
  const annualSales = sales.filter(s => {
    if (s.status === 'failed') return false;
    return new Date(s.sale_date).getFullYear() === currentYear;
  });
  const annualCash = annualSales.reduce((sum, s) => sum + (s.sale_amount || 0), 0);

  // Quarterly sales
  const quarterlySales = annualSales.filter(s => {
    const m = new Date(s.sale_date).getMonth();
    return m >= startMonth && m < startMonth + 3;
  });
  const quarterlyCash = quarterlySales.reduce((sum, s) => sum + (s.sale_amount || 0), 0);

  return {
    currentQuarter: {
      totalCashCollected: Math.round(quarterlyCash),
      multiplier: calculateQuarterlyMultiplier(quarterlyCash),
      goal: 250000,
      label: qLabel
    },
    currentYear: {
      totalCashCollected: Math.round(annualCash),
      poolAmount: calculateAnnualPool(annualCash),
      goal: 1000000,
      label: currentYear.toString()
    }
  };
}

// Dummy functions for backward compatibility with UI components
export function calculateVolumeBonus(salesCount: number): number { return 0; }
export function calculatePerformanceBonus(closeRate: number, salesCount: number): number { return 0; }

export function suggestTier(avgSalesPerMonth: number, avgCloseRate: number): number {
  return 1; // Simplified: tiers no longer drive commissions
}

/**
 * Calcula métricas mensuales para un closer
 */
export function calculateCloserMonthlyMetrics(
  closerId: string,
  sales: Sale[],
  leads: Lead[],
  month: number,
  year: number,
  tier: CloserTier,
  paymentMethods: { id: string; platform_fee_percentage: number }[] = []
): CloserMonthlyMetrics {
  const monthStart = new Date(year, month, 1);
  const monthLabel = monthStart.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  // Filter sales by month and closer
  const closerSales = sales.filter(s => {
    if (s.closer_id !== closerId) return false;
    const d = new Date(s.sale_date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  // Filter leads by month and closer
  const closerLeads = leads.filter(l => {
    if (l.assigned_to !== closerId) return false;
    const d = new Date(l.created_at);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  // Sales metrics
  const successfulSales = closerSales.filter(s => s.status !== 'failed');
  const failedSales = closerSales.filter(s => s.status === 'failed');

  const grossRevenue = successfulSales.reduce((sum, s) => sum + (s.sale_amount || 0), 0);
  const netRevenue = successfulSales.reduce((sum, s) => sum + (s.net_amount || s.sale_amount || 0), 0);
  const avgTicket = successfulSales.length > 0 ? grossRevenue / successfulSales.length : 0;

  // Lead metrics
  const assignedLeads = closerLeads.length;
  const contactedLeads = closerLeads.filter(l => l.status !== 'NEW').length;
  const scheduledLeads = closerLeads.filter(l => l.status === 'SCHEDULED' || l.status === 'WON' || l.status === 'LOST').length;
  const wonLeads = closerLeads.filter(l => l.status === 'WON').length;
  const lostLeads = closerLeads.filter(l => l.status === 'LOST').length;

  // Rates
  const closeRate = scheduledLeads > 0 ? Math.round((wonLeads / scheduledLeads) * 100) : 0;
  const conversionRate = assignedLeads > 0 ? Math.round((wonLeads / assignedLeads) * 100) : 0;
  // Note: no_show tracking would require additional field in leads
  const noShowRate = 0; // Placeholder until we have no_show tracking

  // Commissions (10% of NET amount after platform fee)
  const commissionEarned = successfulSales.reduce((sum, s) => {
    // If commission_amount is pre-calculated, use it
    if (s.commission_amount) return sum + s.commission_amount;
    // Otherwise calculate from net amount
    const netAmount = s.net_amount || calculateNetAmount(s.sale_amount, s.payment_method_id, paymentMethods);
    return sum + (netAmount * CLOSER_COMMISSION_RATE / 100);
  }, 0);

  const commissionPaid = successfulSales
    .filter(s => s.commission_paid)
    .reduce((sum, s) => {
      if (s.commission_amount) return sum + s.commission_amount;
      const netAmount = s.net_amount || calculateNetAmount(s.sale_amount, s.payment_method_id, paymentMethods);
      return sum + (netAmount * CLOSER_COMMISSION_RATE / 100);
    }, 0);

  const commissionPending = commissionEarned - commissionPaid;

  // Bonus
  const monthlyBonus = calculateCloserMonthlyBonus(successfulSales.length);

  return {
    month,
    year,
    label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    sales: {
      total: closerSales.length,
      successful: successfulSales.length,
      failed: failedSales.length
    },
    revenue: {
      gross: Math.round(grossRevenue),
      net: Math.round(netRevenue),
      avgTicket: Math.round(avgTicket)
    },
    leads: {
      assigned: assignedLeads,
      contacted: contactedLeads,
      scheduled: scheduledLeads,
      won: wonLeads,
      lost: lostLeads
    },
    rates: {
      closeRate,
      conversionRate,
      noShowRate
    },
    commissions: {
      earned: Math.round(commissionEarned),
      paid: Math.round(commissionPaid),
      pending: Math.round(commissionPending)
    },
    bonus: {
      monthly: monthlyBonus,
      quarterly: 0, // Calculated globally
      annual: 0,    // Calculated globally
      total: monthlyBonus
    },
    fixedSalary: CLOSER_FIXED_SALARY,
    totalEarnings: CLOSER_FIXED_SALARY + Math.round(commissionEarned) + monthlyBonus
  };
}

/**
 * Obtiene datos completos de rendimiento de un closer
 */
export async function getCloserPerformanceData(
  closer: User,
  sales: Sale[],
  leads: Lead[],
  months: number = 4
): Promise<CloserPerformanceData> {
  const tier = CLOSER_TIERS[closer.tier || 1];
  const now = new Date();
  const monthlyMetrics: CloserMonthlyMetrics[] = [];

  // Load payment methods for proper net amount calculation
  const paymentMethods = await getPaymentMethods();

  // Calculate metrics for the last N months
  for (let i = 0; i < months; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMetrics.push(
      calculateCloserMonthlyMetrics(
        closer.id,
        sales,
        leads,
        targetDate.getMonth(),
        targetDate.getFullYear(),
        tier,
        paymentMethods
      )
    );
  }

  // Calculate totals
  const totalSales = monthlyMetrics.reduce((sum, m) => sum + m.sales.successful, 0);
  const totalRevenue = monthlyMetrics.reduce((sum, m) => sum + m.revenue.gross, 0);
  const totalCommissions = monthlyMetrics.reduce((sum, m) => sum + m.commissions.earned, 0);
  const totalBonus = monthlyMetrics.reduce((sum, m) => sum + m.bonus.total, 0);
  const totalScheduled = monthlyMetrics.reduce((sum, m) => sum + m.leads.scheduled, 0);

  const latestMonth = monthlyMetrics[0];

  // Quarterly bonus calculation
  const { quarter, startMonth } = getQuarterInfo(now);
  const quarterlyCommissions = monthlyMetrics
    .filter(m => m.year === now.getFullYear() && m.month >= startMonth && m.month < startMonth + 3)
    .map(m => m.commissions.earned)
    .sort((a, b) => b - a);

  const bestTwoAvg = quarterlyCommissions.length >= 2
    ? (quarterlyCommissions[0] + quarterlyCommissions[1]) / 2
    : (quarterlyCommissions[0] || 0);

  const annualSales = sales.filter(s => {
    if (s.status === 'failed') return false;
    return new Date(s.sale_date).getFullYear() === now.getFullYear();
  });
  const quarterlySales = annualSales.filter(s => {
    const m = new Date(s.sale_date).getMonth();
    return m >= startMonth && m < startMonth + 3;
  });
  const quarterlyCash = quarterlySales.reduce((sum, s) => sum + (s.sale_amount || 0), 0);
  const multiplier = calculateQuarterlyMultiplier(quarterlyCash);
  const quarterlyBonus = Math.round(bestTwoAvg * multiplier);

  if (latestMonth) {
    latestMonth.bonus.quarterly = quarterlyBonus;
    latestMonth.bonus.total = latestMonth.bonus.monthly + quarterlyBonus;
    latestMonth.totalEarnings = latestMonth.fixedSalary + latestMonth.commissions.earned + latestMonth.bonus.total;
  }

  const tierSuggestion = latestMonth ? suggestTier(latestMonth.sales.successful, latestMonth.rates.closeRate) : (closer.tier || 1);
  const avgCloseRate = latestMonth ? latestMonth.rates.closeRate : 0;

  return {
    closer,
    tier,
    monthlyMetrics,
    totals: {
      totalSales,
      totalRevenue,
      avgCloseRate: Math.round(avgCloseRate),
      totalCommissions: Math.round(totalCommissions),
      totalBonus,
      totalScheduled
    },
    tierSuggestion: tierSuggestion !== (closer.tier || 1) ? tierSuggestion : null
  };
}

// ============================================================
// SERVICIOS DE BASE DE DATOS
// ============================================================

/**
 * Obtiene todas las ventas
 */
export async function fetchSales(closerId?: string): Promise<Sale[]> {
  try {
    let query = supabase
      .from('sales')
      .select('*')
      .order('sale_date', { ascending: false });

    if (closerId) {
      query = query.eq('closer_id', closerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching sales:', err);
    return [];
  }
}

/**
 * Obtiene todos los leads
 */
export async function fetchLeads(closerId?: string): Promise<Lead[]> {
  try {
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (closerId) {
      query = query.eq('assigned_to', closerId);
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
      project: l.project
    }));
  } catch (err) {
    console.error('Error fetching leads:', err);
    return [];
  }
}

/**
 * Actualiza el tier de un closer
 */
export async function updateCloserTier(
  closerId: string,
  tier: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        tier,
        tier_updated_at: new Date().toISOString()
      })
      .eq('id', closerId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error updating closer tier:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene todos los closers
 */
export async function fetchClosers(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'closer')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching closers:', err);
    return [];
  }
}
