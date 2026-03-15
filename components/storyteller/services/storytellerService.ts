
import { supabase } from '../../../services/supabaseClient';
import { SuccessCase } from '../types';

export const storytellerService = {
    async getCases(clientId?: string) {
        let query = supabase
            .from('success_cases')
            .select('*')
            .order('created_at', { ascending: false });

        if (clientId) {
            query = query.eq('client_id', clientId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Map Snake_case DB to CamelCase Types if necessary, or just rely on compatible structure.
        // Our types.ts uses camelCase. DB uses snake_case for some fields (client_id, ai_output).
        // We need to map.
        return (data || []).map((row: any) => ({
            id: row.id,
            patientName: row.patient_name,
            initialFear: row.initial_fear,
            lifeAchievement: row.life_achievement,
            status: row.status,
            assets: row.assets,
            aiOutput: row.ai_output,
            createdAt: row.created_at,
            clientId: row.client_id
        })) as SuccessCase[];
    },

    async saveCase(successCase: SuccessCase, clientId?: string) {
        const payload = {
            id: successCase.id.length < 10 ? undefined : successCase.id, // Handle 'new' IDs
            patient_name: successCase.patientName,
            initial_fear: successCase.initialFear,
            life_achievement: successCase.lifeAchievement,
            status: successCase.status,
            assets: successCase.assets,
            ai_output: successCase.aiOutput,
            client_id: clientId || undefined
        };

        // If ID looks like a temp random string (from math.random), don't send it to let DB generate UUID? 
        // Or we should assume the UI generates valid UUIDs? 
        // The UI currently generates 'Math.random().toString(36).substr(2, 9)'. This is NOT a UUID.
        // We should let Supabase generate the ID if it's a new Create.
        // So if it's an update, we use the ID. If create, we exclude ID. 

        // Check if ID is UUID-like.
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(successCase.id);

        let query;
        if (isUUID) {
            // Update
            query = supabase.from('success_cases').upsert({ ...payload, id: successCase.id }).select().single();
        } else {
            // Insert (remove partial ID)
            const { id, ...insertPayload } = payload;
            query = supabase.from('success_cases').insert(insertPayload).select().single();
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
            id: data.id,
            patientName: data.patient_name,
            initialFear: data.initial_fear,
            lifeAchievement: data.life_achievement,
            status: data.status,
            assets: data.assets,
            aiOutput: data.ai_output,
            createdAt: data.created_at,
            clientId: data.client_id
        } as SuccessCase;
    },

    async deleteCase(id: string) {
        const { error } = await supabase.from('success_cases').delete().eq('id', id);
        if (error) throw error;
    }
};
