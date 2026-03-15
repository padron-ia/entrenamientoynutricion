/**
 * Servicio de Métricas Financieras
 *
 * Calcula métricas financieras clave para el dashboard de contabilidad:
 * - CAC (Customer Acquisition Cost)
 * - Cash Contracted (Ventas + Renovaciones firmadas)
 * - Cash Collected (Pagos verificados)
 * - Collection Rate (Tasa de cobranza)
 */

import { supabase } from './supabaseClient';
import { Client, ClientStatus } from '../types';

// ============================================================
// TIPOS
// ============================================================

export interface MarketingExpense {
  id: string;
  period_month: number;
  period_year: number;
  channel: MarketingChannel;
  amount: number;
  description?: string;
  created_by?: string;
  created_at: string;
}

export type MarketingChannel =
  | 'ads_instagram'
  | 'ads_facebook'
  | 'google_ads'
  | 'influencers'
  | 'otros';

export const MARKETING_CHANNELS: { value: MarketingChannel; label: string }[] = [
  { value: 'ads_instagram', label: 'Instagram Ads' },
  { value: 'ads_facebook', label: 'Facebook Ads' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'influencers', label: 'Influencers' },
  { value: 'otros', label: 'Otros' }
];

export interface FinancialMetrics {
  // CAC
  cac: number;
  cacPreviousMonth: number;
  cacTrend: 'up' | 'down' | 'stable';
  totalMarketingExpenses: number;
  newClientsCount: number;

  // Cash Contracted
  cashContracted: number;
  salesContracted: number;
  renewalsContracted: number;

  // Cash Collected
  cashCollected: number;
  salesCollected: number;
  renewalsCollected: number;

  // Collection Rate
  collectionRate: number;

  // Breakdown by channel
  expensesByChannel: Record<MarketingChannel, number>;
}

export interface Sale {
  id: string;
  sale_amount: number;
  net_amount?: number;
  status: string;
  payment_receipt_url?: string | null;
  sale_date: string;
  client_email?: string;
}

// ============================================================
// FUNCIONES DE CÁLCULO
// ============================================================

/**
 * Calcula todas las métricas financieras para un período dado
 */
export function calculateFinancialMetrics(
  sales: Sale[],
  clients: Client[],
  marketingExpenses: MarketingExpense[],
  month: number,
  year: number,
  paymentLinks: any[] = []
): FinancialMetrics {
  // Filtrar ventas del período
  const periodSales = sales.filter(s => {
    const d = new Date(s.sale_date);
    return d.getMonth() === month && d.getFullYear() === year && s.status !== 'failed';
  });

  // Filtrar gastos de marketing del período
  const periodExpenses = marketingExpenses.filter(e =>
    e.period_month === month + 1 && e.period_year === year
  );

  // Total gastos de marketing
  const totalMarketingExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Gastos por canal
  const expensesByChannel: Record<MarketingChannel, number> = {
    ads_instagram: 0,
    ads_facebook: 0,
    google_ads: 0,
    influencers: 0,
    otros: 0
  };
  periodExpenses.forEach(e => {
    expensesByChannel[e.channel] = (expensesByChannel[e.channel] || 0) + e.amount;
  });

  // Nuevos clientes del período (desde sales)
  const newClientsCount = periodSales.length;

  // CAC = Gastos Marketing / Nuevos Clientes
  const cac = newClientsCount > 0 ? totalMarketingExpenses / newClientsCount : 0;

  // CAC mes anterior para tendencia
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevExpenses = marketingExpenses.filter(e =>
    e.period_month === prevMonth + 1 && e.period_year === prevYear
  );
  const prevTotalExpenses = prevExpenses.reduce((sum, e) => sum + e.amount, 0);
  const prevSales = sales.filter(s => {
    const d = new Date(s.sale_date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear && s.status !== 'failed';
  });
  const prevNewClients = prevSales.length;
  const cacPreviousMonth = prevNewClients > 0 ? prevTotalExpenses / prevNewClients : 0;

  // Tendencia CAC
  let cacTrend: 'up' | 'down' | 'stable' = 'stable';
  if (cacPreviousMonth > 0) {
    const diff = ((cac - cacPreviousMonth) / cacPreviousMonth) * 100;
    if (diff > 5) cacTrend = 'up';
    else if (diff < -5) cacTrend = 'down';
  }

  // =====================
  // CASH CONTRACTED
  // =====================
  // Ventas contratadas (sale_amount de ventas exitosas)
  const salesContracted = periodSales.reduce((sum, s) => sum + (s.sale_amount || 0), 0);

  // Renovaciones contratadas (marcadas como contracted en el período)
  let renewalsContracted = 0;
  clients.forEach(c => {
    if (c.status === ClientStatus.DROPOUT || c.status === ClientStatus.INACTIVE) return;

    const checkRenewal = (dateStr?: string, isContracted?: boolean) => {
      if (!dateStr || !isContracted) return;
      const rDate = new Date(dateStr);
      if (rDate.getMonth() === month && rDate.getFullYear() === year) {
        // Evitar doble conteo con sales
        const alreadyInSales = periodSales.some(s =>
          s.client_email?.toLowerCase().trim() === c.email?.toLowerCase().trim()
        );
        if (!alreadyInSales) {
          let amount = c.renewal_amount || 0;
          if (!amount && c.renewal_payment_link && paymentLinks.length > 0) {
            const link = paymentLinks.find(pl => pl.url === c.renewal_payment_link);
            if (link) {
              const rawPrice = link.price;
              amount = typeof rawPrice === 'string'
                ? parseFloat(rawPrice.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, ''))
                : (rawPrice || 0);
            }
          }
          renewalsContracted += amount;
        }
      }
    };

    if (c.program) {
      checkRenewal(c.program.f2_renewalDate, c.program.renewal_f2_contracted);
      checkRenewal(c.program.f3_renewalDate, c.program.renewal_f3_contracted);
      checkRenewal(c.program.f4_renewalDate, c.program.renewal_f4_contracted);
      checkRenewal(c.program.f5_renewalDate, c.program.renewal_f5_contracted);
    }
  });

  const cashContracted = salesContracted + renewalsContracted;

  // =====================
  // CASH COLLECTED
  // =====================
  // Ventas cobradas (con comprobante de pago verificado)
  const salesCollected = periodSales
    .filter(s => s.payment_receipt_url)
    .reduce((sum, s) => sum + (s.net_amount || s.sale_amount || 0), 0);

  // Renovaciones cobradas (con receipt verificado)
  let renewalsCollected = 0;
  clients.forEach(c => {
    if (c.status === ClientStatus.DROPOUT || c.status === ClientStatus.INACTIVE) return;

    const checkRenewalCollected = (dateStr?: string, isContracted?: boolean) => {
      if (!dateStr || !isContracted || !c.renewal_receipt_url) return;
      const rDate = new Date(dateStr);
      if (rDate.getMonth() === month && rDate.getFullYear() === year) {
        const alreadyInSales = periodSales.some(s =>
          s.client_email?.toLowerCase().trim() === c.email?.toLowerCase().trim()
        );
        if (!alreadyInSales) {
          let amount = c.renewal_amount || 0;
          if (!amount && c.renewal_payment_link && paymentLinks.length > 0) {
            const link = paymentLinks.find(pl => pl.url === c.renewal_payment_link);
            if (link) {
              const rawPrice = link.price;
              amount = typeof rawPrice === 'string'
                ? parseFloat(rawPrice.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, ''))
                : (rawPrice || 0);
            }
          }
          renewalsCollected += amount;
        }
      }
    };

    if (c.program) {
      checkRenewalCollected(c.program.f2_renewalDate, c.program.renewal_f2_contracted);
      checkRenewalCollected(c.program.f3_renewalDate, c.program.renewal_f3_contracted);
      checkRenewalCollected(c.program.f4_renewalDate, c.program.renewal_f4_contracted);
      checkRenewalCollected(c.program.f5_renewalDate, c.program.renewal_f5_contracted);
    }
  });

  const cashCollected = salesCollected + renewalsCollected;

  // Collection Rate = Cash Collected / Cash Contracted
  const collectionRate = cashContracted > 0 ? (cashCollected / cashContracted) * 100 : 0;

  return {
    cac: Math.round(cac * 100) / 100,
    cacPreviousMonth: Math.round(cacPreviousMonth * 100) / 100,
    cacTrend,
    totalMarketingExpenses,
    newClientsCount,
    cashContracted,
    salesContracted,
    renewalsContracted,
    cashCollected,
    salesCollected,
    renewalsCollected,
    collectionRate: Math.round(collectionRate * 10) / 10,
    expensesByChannel
  };
}

// ============================================================
// SERVICIOS DE BASE DE DATOS
// ============================================================

/**
 * Obtiene los gastos de marketing
 */
export async function fetchMarketingExpenses(
  month?: number,
  year?: number
): Promise<MarketingExpense[]> {
  try {
    let query = supabase
      .from('marketing_expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (month !== undefined && year !== undefined) {
      query = query
        .eq('period_month', month + 1)
        .eq('period_year', year);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching marketing expenses:', err);
    return [];
  }
}

/**
 * Crea un nuevo gasto de marketing
 */
export async function createMarketingExpense(
  expense: Omit<MarketingExpense, 'id' | 'created_at'>
): Promise<{ success: boolean; data?: MarketingExpense; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('marketing_expenses')
      .insert([expense])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error('Error creating marketing expense:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Actualiza un gasto de marketing
 */
export async function updateMarketingExpense(
  id: string,
  updates: Partial<MarketingExpense>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('marketing_expenses')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error updating marketing expense:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Elimina un gasto de marketing
 */
export async function deleteMarketingExpense(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('marketing_expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting marketing expense:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene resumen mensual de gastos de marketing
 */
export async function getMarketingExpensesSummary(
  year: number
): Promise<{ month: number; total: number; byChannel: Record<string, number> }[]> {
  try {
    const { data, error } = await supabase
      .from('marketing_expenses')
      .select('*')
      .eq('period_year', year);

    if (error) throw error;

    const summary: Map<number, { total: number; byChannel: Record<string, number> }> = new Map();

    (data || []).forEach((expense: MarketingExpense) => {
      const month = expense.period_month;
      if (!summary.has(month)) {
        summary.set(month, { total: 0, byChannel: {} });
      }
      const monthData = summary.get(month)!;
      monthData.total += expense.amount;
      monthData.byChannel[expense.channel] = (monthData.byChannel[expense.channel] || 0) + expense.amount;
    });

    return Array.from(summary.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month - b.month);
  } catch (err) {
    console.error('Error getting marketing expenses summary:', err);
    return [];
  }
}
