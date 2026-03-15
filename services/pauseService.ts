import { supabase } from './supabaseClient';
import { ClientStatus } from '../types';

export interface PauseRecord {
    id: string;
    client_id: string;
    start_date: string;
    end_date?: string;
    reason?: string;
    days_duration?: number;
    applied?: boolean;
}

export const pauseService = {

    /**
     * Start a new pause for a client.
     * 1. Create a record in contract_pauses
     * 2. Update client status to PAUSED
     */
    async startPause(clientId: string, reason: string, userId?: string): Promise<void> {
        // 1. Create Pause Record
        const { error: insertError } = await supabase
            .from('contract_pauses')
            .insert([{
                client_id: clientId,
                start_date: new Date().toISOString(),
                reason: reason,
                created_by: userId,
                end_date: null, // Explicitly open
                applied: false
            }]);

        if (insertError) throw insertError;

        // 2. Update Client Status
        const { error: updateError } = await supabase
            .from('clientes_pt_notion') // or clientes_pt_notion
            .update({
                status: ClientStatus.PAUSED,
                property_estado_cliente: 'Pausa',
                property_fecha_pausa: new Date().toISOString(), // Corrected column name
                property_motivo_pausa: reason // Corrected column name
            })
            .eq('id', clientId);

        if (updateError) throw updateError;
    },

    /**
     * End an active pause.
     * 1. Find open pause record
     * 2. Close it (end_date = now)
     * 3. Calculate difference in days
     * 4. Add days to client.contract_end_date
     * 5. Set client status to ACTIVE
     */
    async endPause(clientId: string, currentContractEndDate: string): Promise<number> {
        // 1. Find Open Pause
        const { data: openPauses, error: fetchError } = await supabase
            .from('contract_pauses')
            .select('*')
            .eq('client_id', clientId)
            .is('end_date', null)
            .order('start_date', { ascending: false })
            .limit(1);

        if (fetchError) throw fetchError;

        if (!openPauses || openPauses.length === 0) {
            console.warn('No active pause found in DB for reactivating client, falling back to simple status update.');
            // Fallback: Just active status, no date calc
            const { error: fallbackError } = await supabase
                .from('clientes_pt_notion')
                .update({
                    status: ClientStatus.ACTIVE,
                    property_estado_cliente: 'Activo',
                    property_fecha_pausa: null,
                    property_motivo_pausa: null
                })
                .eq('id', clientId);
            if (fallbackError) throw fallbackError;
            return 0;
        }

        const pause = openPauses[0];
        const endDate = new Date();
        const startDate = new Date(pause.start_date);

        // Calculate diff in milliseconds
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        // Calculate diff in days (ceil to favor client)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        console.log(`[PAUSE] Ending pause. Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}, Days: ${diffDays}`);

        // 2. Update Pause Record
        const { error: closeError } = await supabase
            .from('contract_pauses')
            .update({
                end_date: endDate.toISOString(),
                days_duration: diffDays,
                applied: true
            })
            .eq('id', pause.id);

        if (closeError) throw closeError;

        // 3. Update Client Contract
        // Calc new contract end date
        let newContractEndDate = currentContractEndDate;
        if (currentContractEndDate) {
            const currentEnd = new Date(currentContractEndDate);
            if (!isNaN(currentEnd.getTime())) {
                currentEnd.setDate(currentEnd.getDate() + diffDays);
                newContractEndDate = currentEnd.toISOString(); // Keep ISO format? Or 'YYYY-MM-DD' depending on used format
                // Usually ISO string is safe for Postgres text/timestamp
            }
        }

        const { error: clientError } = await supabase
            .from('clientes_pt_notion')
            .update({
                status: ClientStatus.ACTIVE,
                property_estado_cliente: 'Activo',
                property_fecha_fin_contrato_actual: newContractEndDate,
                property_fecha_pausa: null,
                property_motivo_pausa: null
            })
            .eq('id', clientId);

        if (clientError) throw clientError;

        return diffDays;
    },

    async getPauseHistory(clientId: string): Promise<PauseRecord[]> {
        const { data, error } = await supabase
            .from('contract_pauses')
            .select('*')
            .eq('client_id', clientId)
            .order('start_date', { ascending: false });

        if (error) throw error;
        return data || [];
    }
};
