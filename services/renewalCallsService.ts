/**
 * Renewal Calls Service
 * Gestión de llamadas de renovación - alertas automáticas 30 días antes del fin de contrato
 */
import { supabase } from './supabaseClient';
import { Client, ClientStatus, RenewalCall, RenewalCallStatus, RenewalCallResult, User } from '../types';

// ==========================================
// HELPERS
// ==========================================

/**
 * Normaliza cualquier formato de fecha a YYYY-MM-DD para comparaciones consistentes.
 * Supabase DATE devuelve "2026-02-24", pero los clientes pueden tener "2026-02-24T00:00:00.000Z".
 */
function normalizeDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    // Si ya es YYYY-MM-DD, devolver tal cual
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Extraer solo la parte de fecha
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
}

// ==========================================
// GENERACIÓN AUTOMÁTICA DE ALERTAS
// ==========================================

/**
 * Genera alertas de renovación para clientes activos con fin de contrato en <= 30 días
 * (incluye vencidos activos para que sigan visibles hasta cerrar ciclo)
 * Solo crea registros si no existen ya para ese client_id + contract_end_date (normalizado)
 */
export async function generateRenewalAlerts(
    clients: Client[],
    coaches: User[]
): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Window: hasta 30 días hacia delante.
    // Si ya venció y sigue activo, también debe entrar (sin límite inferior).
    const windowEnd = new Date(today);
    windowEnd.setDate(today.getDate() + 30);

    // Filtrar clientes activos (o en pausa/baja reciente?) - Por ahora solo ACTIVOS
    const eligibleClients = clients.filter(c => {
        if (c.status !== ClientStatus.ACTIVE) return false;
        if (!c.contract_end_date) return false;

        const endDate = new Date(c.contract_end_date);
        const inWindow = endDate <= windowEnd;

        return inWindow;
    });

    if (eligibleClients.length === 0) return 0;

    // Buscar alertas existentes para no duplicar
    const { data: existingCalls } = await supabase
        .from('renewal_calls')
        .select('client_id, contract_end_date');

    // FIX: Normalizar fechas a YYYY-MM-DD para comparación consistente
    const existingKeys = new Set(
        (existingCalls || []).map((c: any) => `${c.client_id}_${normalizeDate(c.contract_end_date)}`)
    );

    // Crear nuevas alertas (solo si no existe ya para ese client_id + fecha normalizada)
    const newAlerts = eligibleClients
        .filter(c => !existingKeys.has(`${c.id}_${normalizeDate(c.contract_end_date)}`))
        .map(c => {
            const endDate = new Date(c.contract_end_date);
            const alertDate = new Date(endDate);
            alertDate.setDate(alertDate.getDate() - 30);

            // Determinar fase de renovación
            let renewalPhase = 'F2';
            if (c.program?.renewal_f4_contracted) renewalPhase = 'F5';
            else if (c.program?.renewal_f3_contracted) renewalPhase = 'F4';
            else if (c.program?.renewal_f2_contracted) renewalPhase = 'F3';

            return {
                client_id: c.id,
                coach_id: c.coach_id,
                contract_end_date: normalizeDate(c.contract_end_date),
                alert_date: alertDate.toISOString().split('T')[0],
                renewal_phase: renewalPhase,
                call_status: 'pending' as RenewalCallStatus,
                call_result: 'pending' as RenewalCallResult,
            };
        });

    if (newAlerts.length === 0) return 0;

    const { error } = await supabase
        .from('renewal_calls')
        .insert(newAlerts);

    if (error) {
        console.error('[RenewalCalls] Error creating alerts:', error);
        return 0;
    }

    console.log(`[RenewalCalls] Created ${newAlerts.length} new renewal alerts`);
    return newAlerts.length;
}

// ==========================================
// LECTURA DE DATOS
// ==========================================

/**
 * Obtiene las llamadas de renovación.
 * Admin ve todas, coach solo las suyas.
 * Deduplica automáticamente por client_id + contract_end_date (mantiene el más reciente editado).
 */
export async function getRenewalCalls(
    userId: string,
    isAdmin: boolean,
    clients: Client[],
    coaches: User[]
): Promise<RenewalCall[]> {
    const activeClients = clients.filter(c => c.status === ClientStatus.ACTIVE);
    const activeClientIds = new Set(activeClients.map(c => c.id));
    const activeClientMap = new Map(activeClients.map(c => [c.id, c]));

    let query = supabase
        .from('renewal_calls')
        .select('*')
        .order('contract_end_date', { ascending: true });

    if (!isAdmin) {
        query = query.eq('coach_id', userId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[RenewalCalls] Error fetching:', error);
        return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Enriquecer con nombres de cliente y coach
    const clientMap = new Map(clients.map(c => [c.id, c]));
    const coachMap = new Map(coaches.map(c => [c.id, c]));

    const rawCalls = (data || [])
        .filter((call: any) => activeClientIds.has(call.client_id))
        .map((call: any) => {
            const client = activeClientMap.get(call.client_id) || clientMap.get(call.client_id);
            const coach = coachMap.get(call.coach_id);

            // Fecha efectiva: siempre la del cliente activo (fuente de verdad)
            const currentClientEnd = normalizeDate(client?.contract_end_date);
            const callEnd = normalizeDate(call.contract_end_date);
            const effectiveEnd = currentClientEnd || callEnd;

            if (!effectiveEnd) return null;

            // Evitar mostrar llamadas de ciclos antiguos tras una renovación
            if (currentClientEnd && callEnd && currentClientEnd !== callEnd) return null;

            // Si ya renovó, deja de estar en la lista operativa
            if (call.call_result === 'renewed') return null;

            const endDate = new Date(effectiveEnd);
            const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            // Regla operativa: mostrar cuando faltan <=30 días y mantener vencidos si siguen activos
            if (diffDays > 30) return null;

            return {
                ...call,
                contract_end_date: effectiveEnd,
                client_name: client?.name || 'Cliente desconocido',
                coach_name: coach?.name || 'Coach desconocido',
                days_remaining: diffDays,
            } as RenewalCall;
        })
        .filter((call: RenewalCall | null): call is RenewalCall => Boolean(call));

    // DEDUP SAFETY NET: Si hay duplicados en BD, mostrar solo uno por client_id + contract_end_date.
    // Prioriza: 1) el que tenga estado !== 'pending', 2) el más reciente (updated_at).
    const deduped = new Map<string, RenewalCall>();
    for (const call of rawCalls) {
        const key = `${call.client_id}_${normalizeDate(call.contract_end_date)}`;
        const existing = deduped.get(key);
        if (!existing) {
            deduped.set(key, call);
        } else {
            // Mantener el que tenga más progreso (no-pending > pending, o el más reciente)
            const existingHasProgress = existing.call_status !== 'pending' || existing.call_result !== 'pending';
            const newHasProgress = call.call_status !== 'pending' || call.call_result !== 'pending';
            if (newHasProgress && !existingHasProgress) {
                deduped.set(key, call);
            } else if (existingHasProgress === newHasProgress) {
                // Mismo nivel de progreso: mantener el más reciente
                const existingDate = new Date(existing.updated_at || existing.created_at || 0).getTime();
                const newDate = new Date(call.updated_at || call.created_at || 0).getTime();
                if (newDate > existingDate) {
                    deduped.set(key, call);
                }
            }
        }
    }

    return Array.from(deduped.values());
}

// ==========================================
// ACTUALIZACIÓN
// ==========================================

/**
 * Actualiza una llamada de renovación (estado, fecha, resultado, notas, grabación)
 */
export async function updateRenewalCall(
    id: string,
    data: Partial<Pick<RenewalCall, 'call_status' | 'call_result' | 'scheduled_call_date' | 'call_notes' | 'recording_url' | 'not_renewed_reason'>>
): Promise<boolean> {
    const { error } = await supabase
        .from('renewal_calls')
        .update(data)
        .eq('id', id);

    if (error) {
        console.error('[RenewalCalls] Error updating:', error);
        return false;
    }

    return true;
}

// ==========================================
// ESTADÍSTICAS
// ==========================================

export interface RenewalCallStats {
    total: number;
    pending: number;
    scheduled: number;
    completed: number;
    renewed: number;
    notRenewed: number;
    renewalRate: number; // porcentaje
    withRecording: number;
}

export function calculateStats(calls: RenewalCall[]): RenewalCallStats {
    const total = calls.length;
    const pending = calls.filter(c => c.call_status === 'pending').length;
    const scheduled = calls.filter(c => c.call_status === 'scheduled').length;
    const completed = calls.filter(c => c.call_status === 'completed').length;
    const renewed = calls.filter(c => c.call_result === 'renewed').length;
    const notRenewed = calls.filter(c => c.call_result === 'not_renewed').length;
    const decided = renewed + notRenewed;
    const renewalRate = decided > 0 ? Math.round((renewed / decided) * 100) : 0;
    const withRecording = calls.filter(c => c.recording_url).length;

    return { total, pending, scheduled, completed, renewed, notRenewed, renewalRate, withRecording };
}
