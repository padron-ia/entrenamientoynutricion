import { supabase } from './supabaseClient';
import { Lead, LeadStatus, Client, ClientStatus } from '../types';

type PublicLeadPayload = {
    firstName: string;
    surname: string;
    phone: string;
    email?: string;
    instagram_user?: string;
    notes?: string;
    source?: string;
    procedencia?: 'Formulario';
    in_out?: 'Inbound';
    turnstileToken: string;
    website?: string;
};

export const leadsService = {
    // --- CRUD ---

    async getLeads(): Promise<Lead[]> {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching leads:', error);
            throw error;
        }

        // Map data and compute fullName
        return (data || []).map((lead: any) => ({
            ...lead,
            name: `${lead.firstName} ${lead.surname}`
        }));
    },

    async createLead(lead: Partial<Lead>): Promise<Lead> {
        const { data, error } = await supabase
            .from('leads')
            .insert([lead])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async capturePublicLead(payload: PublicLeadPayload): Promise<{ success: boolean; message?: string; leadId?: string; deduplicated?: boolean }> {
        const { data, error } = await supabase.functions.invoke('public-lead-capture', {
            body: payload,
        });

        if (error) {
            throw new Error(error.message || 'No se pudo enviar la solicitud');
        }

        if (!data?.success) {
            throw new Error(data?.error || 'No se pudo enviar la solicitud');
        }

        return data;
    },

    async updateLead(id: string, updates: Partial<Lead>): Promise<void> {
        const { error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
        return this.updateLead(id, { status });
    },

    async deleteLead(id: string): Promise<void> {
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- METRICS ---

    getMetrics(leads: Lead[]) {
        const total = leads.length;
        const byStatus = {} as Record<string, number>;
        let presentados = 0;
        let cierres = 0;
        let revenue = 0;

        for (const lead of leads) {
            byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
            if (lead.attended) presentados++;
            if (lead.status === 'WON') {
                cierres++;
                if (lead.sale_price) revenue += Number(lead.sale_price) || 0;
            }
        }

        const showRate = total > 0 ? ((presentados / total) * 100).toFixed(1) : '0';
        const closeRate = presentados > 0 ? ((cierres / presentados) * 100).toFixed(1) : '0';

        return { total, byStatus, presentados, cierres, showRate, closeRate, revenue };
    },

    // --- ACTIONS ---

    /**
     * Converts a WON lead into a Client directly in the database.
     * 1. Creates Client record
     * 2. (Optional) Deletes Lead or marks as Archived
     */
    async convertLeadToClient(lead: Lead, assignedCoachId: string): Promise<string> {
        // 1. Prepare Client Data
        // NOTE: This assumes default values for a new client
        const newClient: Partial<Client> = {
            firstName: lead.firstName,
            surname: lead.surname,
            email: lead.email || '',
            phone: lead.phone || '',
            instagram: lead.instagram_user || '',
            coach_id: assignedCoachId,
            status: ClientStatus.ACTIVE,
            registration_date: new Date().toISOString().split('T')[0],
            start_date: new Date().toISOString().split('T')[0],

            // Default placeholder values for required fields
            program: {
                phase: 'F1',
                programType: 'Trimestral', // Default, should be editable
                start_date: new Date().toISOString().split('T')[0]
            } as any,
            medical: {} as any,
            nutrition: {
                nutrition_approved: false
            } as any,
            training: {} as any,
            goals: {} as any
        };

        // 2. Insert into 'clients' table
        // (Assuming the RPC logic or direct insert. Using insert here)
        const { data: clientData, error: clientError } = await supabase
            .from('clients') // or 'clientes_pt_notion' if that's the real table name, mapping via RPC is safer usually but here we assume direct access
            .insert([newClient])
            .select('id')
            .single();

        if (clientError) {
            console.error('Error converting lead to client:', clientError);
            throw new Error('No se pudo crear el cliente.');
        }

        // 3. Mark Lead as WON if not already
        if (lead.status !== 'WON') {
            await this.updateLeadStatus(lead.id, 'WON');
        }

        // 4. (Optional) Archive lead or just leave it as WON history
        // For now we just return the new client ID
        return clientData.id;
    }
};
