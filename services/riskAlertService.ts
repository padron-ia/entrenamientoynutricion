import { supabase } from './supabaseClient';
import { ClientRiskAlert, RiskAlertStatus, RiskReasonCategory } from '../types';

export const RISK_CATEGORIES: Record<RiskReasonCategory, { label: string; icon: string; color: string }> = {
    'no_response': { label: 'No responde a mensajes', icon: '📵', color: 'red' },
    'no_checkins': { label: 'No envía check-ins', icon: '📋', color: 'orange' },
    'not_following_plan': { label: 'No cumple el plan', icon: '📉', color: 'amber' },
    'demotivated': { label: 'Desmotivación evidente', icon: '😔', color: 'purple' },
    'personal_issues': { label: 'Problemas personales', icon: '🏠', color: 'blue' },
    'low_process_score': { label: 'Bajo Process Score', icon: '📉', color: 'red' },
    'other': { label: 'Otro', icon: '❓', color: 'slate' }
};

export interface RiskAlertComment {
    id: string;
    alert_id: string;
    user_id: string;
    user_name?: string;
    user_role?: string;
    message: string;
    created_at: string;
}

/**
 * Create a new risk alert for a client
 */
export async function createAlert(
    clientId: string,
    coachId: string,
    category: RiskReasonCategory,
    notes?: string
): Promise<ClientRiskAlert> {
    const { data, error } = await supabase
        .from('client_risk_alerts')
        .insert([{
            client_id: clientId,
            coach_id: coachId,
            reason_category: category,
            notes: notes || null,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Resolve an existing alert
 */
export async function resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolutionNotes?: string
): Promise<ClientRiskAlert> {
    const { data, error } = await supabase
        .from('client_risk_alerts')
        .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: resolvedBy,
            resolution_notes: resolutionNotes || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Escalate an alert for head_coach/admin attention
 */
export async function escalateAlert(alertId: string): Promise<ClientRiskAlert> {
    const { data, error } = await supabase
        .from('client_risk_alerts')
        .update({
            status: 'escalated',
            updated_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get all active alerts (for head_coach/admin dashboard)
 * Optionally filter by coach
 */
export async function getActiveAlerts(coachId?: string): Promise<ClientRiskAlert[]> {
    let query = supabase
        .from('client_risk_alerts')
        .select('*')
        .eq('status', 'active');

    if (coachId) {
        query = query.eq('coach_id', coachId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

/**
 * Get all alerts for a specific client
 */
export async function getClientAlerts(clientId: string): Promise<ClientRiskAlert[]> {
    const { data, error } = await supabase
        .from('client_risk_alerts')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get the current active alert for a client if any
 */
export async function getActiveAlertForClient(clientId: string): Promise<ClientRiskAlert | null> {
    const { data, error } = await supabase
        .from('client_risk_alerts')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function getActiveAlertsForClient(clientId: string): Promise<ClientRiskAlert[]> {
    const { data, error } = await supabase
        .from('client_risk_alerts')
        .select('*')
        .eq('client_id', clientId)
        .in('status', ['active', 'escalated'])
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getActiveAlertsCount(coachId?: string): Promise<number> {
    let query = supabase
        .from('client_risk_alerts')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'escalated']);

    if (coachId) {
        query = query.eq('coach_id', coachId);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
}

export async function getAllAlerts(filters: {
    status?: RiskAlertStatus;
    category?: RiskReasonCategory;
    coach_id?: string;
    limit?: number;
    offset?: number;
} = {}): Promise<{ alerts: ClientRiskAlert[]; total: number }> {
    let query = supabase
        .from('client_risk_alerts')
        .select('*', { count: 'exact' });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.category) query = query.eq('reason_category', filters.category);
    if (filters.coach_id) query = query.eq('coach_id', filters.coach_id);

    query = query.order('created_at', { ascending: false });

    if (filters.limit) {
        query = query.range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);
    }

    const { data, count, error } = await query;

    if (error) throw error;
    return { alerts: data || [], total: count || 0 };
}

/**
 * Update alert notes
 */
export async function updateNotes(alertId: string, notes: string): Promise<ClientRiskAlert> {
    const { data, error } = await supabase
        .from('client_risk_alerts')
        .update({
            notes,
            updated_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Add a comment to an alert
 */
export async function addComment(
    alertId: string,
    userId: string,
    userName: string,
    userRole: string,
    message: string
): Promise<RiskAlertComment> {
    const { data, error } = await supabase
        .from('client_risk_alert_comments')
        .insert([{
            alert_id: alertId,
            user_id: userId,
            user_name: userName,
            user_role: userRole,
            message,
            created_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get all comments for an alert
 */
export async function getAlertComments(alertId: string): Promise<RiskAlertComment[]> {
    const { data, error } = await supabase
        .from('client_risk_alert_comments')
        .select('*')
        .eq('alert_id', alertId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

export const riskAlertService = {
    createAlert,
    resolveAlert,
    escalateAlert,
    getActiveAlerts,
    getClientAlerts,
    getActiveAlertForClient,
    getActiveAlertsForClient,
    getActiveAlertsCount,
    getAllAlerts,
    updateNotes,
    addComment,
    getAlertComments,

    /**
     * Increment the missed check-ins counter for a client
     */
    incrementMissedCheckins: async (clientId: string) => {
        try {
            const { data, error } = await supabase.rpc('increment_missed_checkins', { client_id_param: clientId });
            if (error) throw error;
            return data;
        } catch (err) {
            // Fallback if RPC doesn't exist (simpler update)
            const { data: client } = await supabase.from('clientes_pt_notion').select('missed_checkins_count').eq('id', clientId).single();
            const newCount = (client?.missed_checkins_count || 0) + 1;
            await supabase.from('clientes_pt_notion').update({ missed_checkins_count: newCount }).eq('id', clientId);
            return newCount;
        }
    },

    /**
     * Automaticaly create a "No envía check-ins" alert if one doesn't exist for this week
     */
    automateNoCheckinAlert: async (clientId: string, coach_id: string) => {
        // ... (implementation same as before)
        const { data: existingAlerts } = await supabase
            .from('client_risk_alerts')
            .select('*')
            .eq('client_id', clientId)
            .eq('reason_category', 'no_checkins')
            .eq('status', 'active');

        if (existingAlerts && existingAlerts.length > 0) return null; // Already has an active alert

        // 2. Create the alert
        const alert = await createAlert(
            clientId,
            coach_id,
            'no_checkins',
            'SISTEMA: El alumno no ha enviado su revisión semanal antes del martes. Se requiere contacto para conocer el motivo.'
        );

        // 3. Add initial comment
        await addComment(
            alert.id,
            'system',
            'Sistema PT',
            'system',
            `🚩 Alerta de riesgo automática creada. El alumno ha superado el límite del martes sin enviar el check-in. Por favor, añade un comentario con el motivo tras contactarle.`
        );

        return alert;
    },

    /**
     * Save the reason provided by the client for missing a check-in
     */
    saveMissedCheckinReason: async (clientId: string, reason: string) => {
        const { error } = await supabase
            .from('clientes_pt_notion')
            .update({ last_checkin_missed_reason: reason })
            .eq('id', clientId);
        if (error) throw error;
        return true;
    },

    /**
     * Automatically create an alert when the process score is low (< 60%)
     */
    automateLowScoreAlert: async (clientId: string, coachId: string, score: number) => {
        // 1. Check for existing active alert of this type
        const { data: existingAlerts } = await supabase
            .from('client_risk_alerts')
            .select('*')
            .eq('client_id', clientId)
            .eq('reason_category', 'low_process_score')
            .eq('status', 'active');

        if (existingAlerts && existingAlerts.length > 0) return null;

        // 2. Create the alert
        const alert = await createAlert(
            clientId,
            coachId,
            'low_process_score',
            `SISTEMA: El alumno tiene un Process Score crítico del ${Math.round(score)}%. Se requiere intervención inmediata para evitar abandono.`
        );

        // 3. Add initial comment
        await addComment(
            alert.id,
            'system',
            'Sistema PT',
            'system',
            `🚩 Alerta de riesgo automática creada por bajo rendimiento en el proceso (${Math.round(score)}%). Por favor, revisa la ficha del proceso y contacta con el alumno.`
        );

        return alert;
    }
};
