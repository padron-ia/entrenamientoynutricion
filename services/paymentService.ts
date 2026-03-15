import { supabase } from './supabaseClient';
import { User, Client, ClientStatus, CoachInvoice } from '../types';
import { isCoachMatch } from './coachMetricsService';

export interface PaymentReference {
    id: string; // ID en tabla payments o sales
    type: 'Sale' | 'Renewal' | 'Bonus' | 'Other';
    clientName: string;
    amount: number;
    commission: number;
    date: string;
    isPersisted: boolean; // Si ya existe en tabla sales
}

export interface StaffPaymentRecord {
    id?: string;
    staff_id: string;
    invoice_id?: string;
    amount: number;
    currency?: string;
    status: 'pending' | 'completed' | 'failed';
    payment_date: string;
    payment_method?: string;
    reference_number?: string;
    notes?: string;
    period?: string; // e.g., "2024-01"
}

// Helper to get matching renewals for a month
// Reusing logic similar to coachMetricsService/RenewalsView
async function getRenewalsForPeriod(coach: User, month: number, year: number): Promise<PaymentReference[]> {
    const { data: clientsData, error } = await supabase
        .from('clientes_pt_notion')
        .select('*');

    if (error || !clientsData) return [];

    const clients = clientsData as Client[];
    const renewals: PaymentReference[] = [];
    const commissionRate = coach.commission_percentage || 10; // Default 10%

    // Logic from RenewalsView to identify successful renewals in the month
    clients.forEach(c => {
        if (c.status !== ClientStatus.ACTIVE && c.status !== ClientStatus.COMPLETED) return;

        // Check if client belongs to coach
        if (!isCoachMatch(coach.id, coach.name, c.coach_id) && !isCoachMatch(coach.id, coach.name, c.property_coach)) return;

        const phaseData = [
            { id: 'F2', date: c.program?.f1_endDate, contracted: c.program?.renewal_f2_contracted },
            { id: 'F3', date: c.program?.f2_endDate, contracted: c.program?.renewal_f3_contracted },
            { id: 'F4', date: c.program?.f3_endDate, contracted: c.program?.renewal_f4_contracted },
            { id: 'F5', date: c.program?.f4_endDate, contracted: c.program?.renewal_f5_contracted },
        ];

        // Find matches for this month
        const matches = phaseData.filter(p => {
            if (!p.date || !p.contracted) return false;
            const d = new Date(p.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });

        if (matches.length > 0) {
            const bestMatch = matches.sort((a, b) => b.id.localeCompare(a.id))[0];

            // Calculate amount (using logic from RenewalsView is complex without payment links, 
            // but we can check if there's an amount stored on client)
            let amount = c.renewal_amount || 0;
            // If 0, try update logic or default? For now 0 if unknown.

            // Calculate Commission
            // Fee calculation: defaults to Stripe (4%) if unknown
            const method = c.renewal_payment_method || 'stripe';
            let feePercent = 4;
            if (method.toLowerCase().includes('hotmart')) feePercent = 6.4;
            if (method.toLowerCase().includes('transfer')) feePercent = 0;

            const net = amount * (1 - feePercent / 100);
            const commission = net * (commissionRate / 100);

            if (amount > 0) {
                renewals.push({
                    id: `${c.id}-${bestMatch.id}`, // Temporary ID
                    type: 'Renewal',
                    clientName: c.name || `${c.firstName} ${c.surname}`,
                    amount: amount,
                    commission: commission,
                    date: bestMatch.date!,
                    isPersisted: false // Calculated dynamically
                });
            }
        }
    });

    return renewals;
}

export const paymentService = {

    /**
     * Confirms payment for a staff member (Coach/Closer)
     * 1. Persists any virtual renewals to sales table
     * 2. Marks sales/renewals as commission_paid
     * 3. Updates Invoice status
     * 4. Records payment in staff_payments
     */
    async confirmStaffPayment(
        invoice: CoachInvoice,
        staff: User,
        paymentDetails: {
            method: string;
            reference?: string;
            notes?: string;
            paidDate: string;
        }
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const invoiceDate = new Date(invoice.period_date);
            const month = invoiceDate.getMonth();
            const year = invoiceDate.getFullYear();

            // 1. Get Virtual Renewals that need persistence
            const virtualRenewals = await getRenewalsForPeriod(staff, month, year);

            // Check which ones are NOT in sales table yet
            for (const item of virtualRenewals) {
                // Check if sale exists for this client + month + type
                const { data: existing } = await supabase
                    .from('sales')
                    .select('id')
                    .eq('closer_id', staff.id)
                    .ilike('client_first_name', item.clientName.split(' ')[0]) // Approximate match
                    .eq('sale_amount', item.amount) // Amount match
                    .gte('sale_date', `${year}-${month + 1}-01`)
                    .lte('sale_date', `${year}-${month + 1}-31`)
                    .maybeSingle();

                if (!existing) {
                    // CREATE SALE RECORD for Renewal
                    const { error: insertError } = await supabase.from('sales').insert({
                        closer_id: staff.id,
                        client_first_name: item.clientName,
                        client_last_name: '(Renovación)',
                        client_email: `renewal-${item.id}@placeholder.com`, // We might not have email easily here without fetching
                        sale_amount: item.amount,
                        commission_amount: item.commission,
                        sale_date: item.date,
                        status: 'won',
                        type: 'renewal', // Custom type field if exists, otherwise assume logic by closer_id/context
                        commission_paid: true, // Mark as paid immediately as we are paying now
                        notes: `Auto-generated renewal for invoice ${invoice.id}`
                    });

                    if (insertError) console.error('Error creating renewal sale:', insertError);
                }
            }

            // 2. Mark ALL existing sales for this timeframe as paid
            const startDate = new Date(year, month, 1).toISOString();
            const endDate = new Date(year, month + 1, 0).toISOString();

            const { error: updateError } = await supabase
                .from('sales')
                .update({ commission_paid: true })
                .eq('closer_id', staff.id)
                .gte('sale_date', startDate)
                .lte('sale_date', endDate);

            if (updateError) throw updateError;

            // 3. Update Invoice Status
            const { error: invoiceError } = await supabase
                .from('coach_invoices')
                .update({
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', invoice.id);

            if (invoiceError) {
                console.error('Error updating invoice status:', invoiceError);
                throw new Error(`Error al actualizar factura: ${invoiceError.message}`);
            }

            // 4. Create Payment Record
            const paymentRecord: StaffPaymentRecord = {
                staff_id: staff.id,
                invoice_id: invoice.id,
                amount: invoice.amount,
                status: 'completed',
                payment_date: paymentDetails.paidDate,
                payment_method: paymentDetails.method,
                notes: paymentDetails.notes || `Pago factura ${invoice.period_date}`,
                period: `${year}-${String(month + 1).padStart(2, '0')}`
            };

            const { error: paymentError } = await supabase
                .from('staff_payments')
                .insert(paymentRecord);

            if (paymentError) {
                console.error('Error creating payment record:', paymentError);
                // No lanzamos error aquí - el pago ya se marcó, solo falla el registro
                console.warn('Payment marked but record creation failed');
            }

            return { success: true };

        } catch (err: any) {
            console.error('Payment confirmation operations failed:', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * Calculates the breakdown of commissions for an invoice period
     */
    async getCommissionSettlementPreview(staff: User, month: number, year: number) {
        // Fetch existing sales
        const startDate = new Date(year, month, 1).toISOString();
        const endDate = new Date(year, month + 1, 0).toISOString();

        const { data: sales, error } = await supabase
            .from('sales')
            .select('*')
            .eq('closer_id', staff.id)
            .gte('sale_date', startDate)
            .lte('sale_date', endDate)
            .neq('status', 'failed');

        if (error) return { items: [], total: 0 };

        const mappedSales: PaymentReference[] = (sales || []).map(s => ({
            id: s.id,
            type: (s.client_last_name === '(Renovación)' || s.type?.toLowerCase().includes('renovación') || s.type?.toLowerCase().includes('renewal')) ? 'Renewal' : 'Sale',
            clientName: `${s.client_first_name} ${s.client_last_name}`,
            amount: s.sale_amount,
            commission: s.commission_amount || 0,
            date: s.sale_date,
            isPersisted: true
        }));

        // Fetch virtual renewals (potential duplicates if already in sales)
        const virtualRenewals = await getRenewalsForPeriod(staff, month, year);

        // Merge: Filter out virtuals that are already persisted (by amount/name heuristics or if we had a link)
        // Simple heuristic: if we have a persisted renewal with same amount and approx date... 
        // For simplicity, we trust "isPersisted" check inside logic. 
        // Better: filtered out virtuals that match sales in `mappedSales`

        const finalItems = [...mappedSales];

        virtualRenewals.forEach(vr => {
            const exists = mappedSales.some(s =>
                s.type === 'Renewal' &&
                Math.abs(s.amount - vr.amount) < 0.1 &&
                s.clientName.includes(vr.clientName.split(' ')[0])
            );
            if (!exists) {
                finalItems.push(vr);
            }
        });

        const total = finalItems.reduce((sum, item) => sum + item.commission, 0);

        return { items: finalItems, total };
    },

    /**
     * Retrieves payment history
     */
    async getPaymentHistory(year: string, month: string) {
        let query = supabase
            .from('staff_payments')
            .select(`
                *,
                staff:users!staff_payments_staff_id_fkey(name, email)
            `)
            .order('payment_date', { ascending: false });

        if (year !== 'all') {
            const startYear = `${year}-01-01`;
            const endYear = `${year}-12-31`;
            query = query.gte('payment_date', startYear).lte('payment_date', endYear);
        }

        if (month !== 'all') {
            // Note: This filtering is approximate if checked against payment_date
            // Better to filter in JS if exact month match needed, or use date_trunc in SQL
            // For now, we'll filter in memory if needed or trust the date range if constructed carefully
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching payment history:', error);
            return [];
        }

        let filtered = data || [];
        if (month !== 'all') {
            const m = parseInt(month);
            filtered = filtered.filter(p => {
                const d = new Date(p.payment_date);
                return d.getMonth() + 1 === m;
            });
        }
        return filtered;
    }
};
