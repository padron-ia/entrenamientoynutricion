import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Phone, Calendar, CheckCircle2, XCircle, Clock, AlertTriangle,
    ChevronDown, ChevronUp, Filter, Search, Video, ExternalLink,
    TrendingUp, Users, PhoneCall, PhoneOff, Loader2, RefreshCw,
    Edit2, Save, X, PlayCircle, BarChart3, List, LayoutGrid, Rocket,
    FileText, Copy, Printer, ClipboardCheck
} from 'lucide-react';
import { Client, User, UserRole, RenewalCall, RenewalCallStatus, RenewalCallResult, QuarterlyReview, MonthlyReview, OptimizationSurvey, CallPrep } from '../types';
import { getRenewalCalls, updateRenewalCall, generateRenewalAlerts, calculateStats, RenewalCallStats } from '../services/renewalCallsService';
import { getQuarterlyReview, getMonthlyReviews, getCurrentProgramPhase } from '../services/processTrackingService';
import { supabase } from '../services/supabaseClient';
import ProcessDataCard from './ProcessDataCard';
import QuarterlyReviewPanel from './QuarterlyReviewPanel';
import { useToast } from './ToastProvider';

interface RenewalCallsManagerProps {
    clients: Client[];
    user: User;
    coaches?: User[];
    onNavigateToClient?: (client: Client) => void;
}

// Status labels & colors
const STATUS_CONFIG: Record<RenewalCallStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
    scheduled: { label: 'Agendada', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <Calendar className="w-3.5 h-3.5" /> },
    completed: { label: 'Realizada', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    no_answer: { label: 'No Contestó', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: <PhoneOff className="w-3.5 h-3.5" /> },
    cancelled: { label: 'Cancelada', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const RESULT_CONFIG: Record<RenewalCallResult, { label: string; color: string; bg: string }> = {
    pending: { label: 'Sin resultado', color: 'text-slate-500', bg: 'bg-slate-50' },
    renewed: { label: '✅ Renovó', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    not_renewed: { label: '❌ No Renovó', color: 'text-red-700', bg: 'bg-red-50' },
    undecided: { label: '🤔 Indeciso', color: 'text-amber-700', bg: 'bg-amber-50' },
};

const DIRECTION_LABELS: Record<string, string> = {
    on_track: '✅ En buen camino',
    at_risk: '⚠️ En riesgo',
    off_track: '❌ Fuera de rumbo',
};

function getDaysColor(days: number): string {
    if (days <= 0) return 'text-red-600 font-bold';
    if (days <= 7) return 'text-red-600';
    if (days <= 15) return 'text-amber-600';
    return 'text-emerald-600';
}

function getDaysBadge(days: number): string {
    if (days <= 0) return 'bg-red-100 text-red-700 border border-red-200';
    if (days <= 7) return 'bg-red-50 text-red-600 border border-red-100';
    if (days <= 15) return 'bg-amber-50 text-amber-600 border border-amber-100';
    return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
}

// ─── Closer Summary Modal ───────────────────────────────────────
const CloserSummaryModal: React.FC<{
    call: RenewalCall;
    client: Client;
    onClose: () => void;
}> = ({ call, client, onClose }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [summaryData, setSummaryData] = useState<{
        review: QuarterlyReview | null;
        monthlies: MonthlyReview[];
        survey: OptimizationSurvey | null;
    }>({ review: null, monthlies: [], survey: null });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const loadSummaryData = async () => {
            setLoading(true);
            try {
                // Fetch quarterly review
                const review = await getQuarterlyReview(client.id, call.id);
                
                // Fetch monthly reviews for the last 3 months
                const allMonthlies = await getMonthlyReviews(client.id);
                const periodEnd = new Date();
                const periodStart = new Date();
                periodStart.setMonth(periodStart.getMonth() - 3);
                
                const filteredMonthlies = allMonthlies.filter(r => {
                    const rDate = new Date(r.month + '-15');
                    return rDate >= periodStart && rDate <= periodEnd;
                }).sort((a, b) => b.month.localeCompare(a.month));

                // Fetch optimization survey (most recent for this client)
                const { data: surveyData } = await supabase
                    .from('optimization_surveys')
                    .select('*')
                    .eq('client_id', client.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                setSummaryData({
                    review,
                    monthlies: filteredMonthlies,
                    survey: surveyData || null,
                });
            } catch (err) {
                console.error("Error loading summary data:", err);
            } finally {
                setLoading(false);
            }
        };
        loadSummaryData();
    }, [client.id, call.id]);

    const generateTextSummary = () => {
        const { review, monthlies, survey } = summaryData;
        const now = new Date().toLocaleDateString('es-ES');
        const phaseInfo = getCurrentProgramPhase(client.start_date);
        const prep = survey?.call_prep as CallPrep | undefined;
        
        let text = '';
        text += `════════════════════════════════════════════════════\n`;
        text += `📋 INFORME DE RENOVACIÓN PARA CLOSER\n`;
        text += `════════════════════════════════════════════════════\n`;
        text += `Fecha Informe: ${now}\n\n`;

        // ── SECCIÓN 1: DATOS DEL CLIENTE ──
        text += `┌──────────────────────────────────────────────────\n`;
        text += `│ 👤 DATOS DEL CLIENTE\n`;
        text += `├──────────────────────────────────────────────────\n`;
        text += `│ Nombre: ${client.name}\n`;
        text += `│ Email: ${client.email}\n`;
        text += `│ Teléfono: ${client.phone || 'No registrado'}\n`;
        text += `│ Coach: ${call.coach_name || 'No asignado'}\n`;
        text += `│ Fase actual: ${phaseInfo.phaseName} (${phaseInfo.monthsInProgram} meses en programa)\n`;
        text += `│ Fin de Contrato: ${new Date(call.contract_end_date).toLocaleDateString('es-ES')}\n`;
        text += `│ Días restantes: ${call.days_remaining ?? 0}\n`;
        text += `│\n`;
        
        // Explicit Renewal Details if set on client
        if (client.renewal_phase || call.renewal_phase) {
            text += `│ 📋 PROPUESTA DE RENOVACIÓN:\n`;
            text += `│    Fase: ${client.renewal_phase || call.renewal_phase}\n`;
            if (client.renewal_duration) text += `│    Duración: ${client.renewal_duration} meses\n`;
            if (client.renewal_amount) text += `│    Importe: ${client.renewal_amount} €\n`;
            if (client.renewal_payment_method) text += `│    Pago: ${client.renewal_payment_method}\n`;
            text += `│\n`;
        }

        text += `│ Peso inicial: ${client.initial_weight ? client.initial_weight + ' kg' : 'N/A'}\n`;
        text += `│ Peso actual: ${client.current_weight ? client.current_weight + ' kg' : 'N/A'}\n`;
        text += `│ Peso objetivo: ${client.target_weight ? client.target_weight + ' kg' : 'N/A'}\n`;
        if (client.initial_weight && client.current_weight) {
            const lost = client.initial_weight - client.current_weight;
            text += `│ Progreso: ${lost > 0 ? '-' : '+'}${Math.abs(lost).toFixed(1)} kg\n`;
        }
        if (client.medical?.lastHba1c) text += `│ HbA1c actual: ${client.medical.lastHba1c}%\n`;
        if (client.medical?.initialHba1c) text += `│ HbA1c inicial: ${client.medical.initialHba1c}%\n`;
        text += `└──────────────────────────────────────────────────\n\n`;

        // ── SECCIÓN 2: ENCUESTA DE OPTIMIZACIÓN (respuestas del cliente) ──
        text += `┌──────────────────────────────────────────────────\n`;
        text += `│ 📊 ENCUESTA PRE-LLAMADA (respuestas del cliente)\n`;
        text += `├──────────────────────────────────────────────────\n`;
        if (survey) {
            if (survey.satisfaction_rating != null) text += `│ Experiencia: ${survey.satisfaction_rating}/10\n`;
            if (survey.importance_rating != null) text += `│ Importancia de seguir: ${survey.importance_rating}/10\n`;
            text += `│\n`;
            if (survey.biggest_achievement) text += `│ 🏆 Logro: ${survey.biggest_achievement}\n`;
            if (survey.biggest_challenge) text += `│ ⚠️ Dificultad: ${survey.biggest_challenge}\n`;
            if (survey.future_goals) text += `│ 🎯 Quiere conseguir: ${survey.future_goals}\n`;
            if (survey.goal_feeling) text += `│ ⭐ Cómo se sentiría: ${survey.goal_feeling}\n`;
            if (survey.improvement_suggestions) text += `│ 💡 Sugerencias de mejora: ${survey.improvement_suggestions}\n`;
            if (survey.additional_comments) text += `│ 💬 Comentarios: ${survey.additional_comments}\n`;
            if (survey.rating_reason) text += `│ 📝 Motivo de la nota: ${survey.rating_reason}\n`;
            if (survey.has_referral) {
                text += `│ 👥 Referido: ${survey.referral_name || 'Sí'} ${survey.referral_phone ? '(' + survey.referral_phone + ')' : ''}\n`;
            }
        } else {
            text += `│ No se ha completado encuesta de optimización.\n`;
        }
        text += `└──────────────────────────────────────────────────\n\n`;

        // ── SECCIÓN 3: PREPARACIÓN DE LA LLAMADA (trabajo del coach) ──
        text += `┌──────────────────────────────────────────────────\n`;
        text += `│ 📞 PREPARACIÓN DE LA LLAMADA (plan del coach)\n`;
        text += `├──────────────────────────────────────────────────\n`;
        if (prep && (prep.achievements || prep.difficulties_approach || prep.proposal || prep.call_goal)) {
            if (prep.call_goal) text += `│ 🎯 OBJETIVO DE LA LLAMADA: ${prep.call_goal}\n│\n`;
            if (prep.achievements) text += `│ ✅ Logros a reforzar: ${prep.achievements}\n`;
            if (prep.difficulties_approach) text += `│ ⚠️ Dificultades y cómo abordarlas: ${prep.difficulties_approach}\n`;
            if (prep.proposal) text += `│ 💡 Propuesta para el cliente: ${prep.proposal}\n`;
            if (prep.proposal_reason) text += `│ 🔑 Por qué esta propuesta: ${prep.proposal_reason}\n`;
            if (prep.objections && prep.objections.length > 0) {
                text += `│\n│ 🛡️ OBJECIONES PREPARADAS:\n`;
                prep.objections.forEach((obj, i) => {
                    text += `│   ${i + 1}. Si dice: "${obj.objection}"\n`;
                    text += `│      Responder: "${obj.response}"\n`;
                });
            }
        } else {
            text += `│ El coach aún no ha preparado la llamada.\n`;
        }
        text += `└──────────────────────────────────────────────────\n\n`;

        // ── SECCIÓN 4: EVALUACIÓN TRIMESTRAL ──
        text += `┌──────────────────────────────────────────────────\n`;
        text += `│ 🎯 EVALUACIÓN DE OBJETIVOS (TRIMESTRE)\n`;
        text += `├──────────────────────────────────────────────────\n`;
        if (review?.goal_evaluations && review.goal_evaluations.length > 0) {
            review.goal_evaluations.forEach(goal => {
                const statusIcon = goal.status === 'on_track' ? '✅' : goal.status === 'partial' ? '🟡' : '❌';
                text += `│ ${statusIcon} ${goal.goal_text}\n`;
                if (goal.reason) text += `│    Motivo: ${goal.reason}\n`;
            });
        } else {
            text += `│ No hay evaluación de objetivos registrada.\n`;
        }
        if (review?.pre_call_notes) {
            text += `│\n│ 📝 Notas pre-llamada: ${review.pre_call_notes}\n`;
        }
        if (review?.post_call_notes) {
            text += `│ 🚀 Plan de acción: ${review.post_call_notes}\n`;
        }
        if (review?.client_classification) {
            const classLabels: Record<string, string> = {
                good_progress: '🟢 Buen progreso',
                slow_steady: '🔵 Lento pero constante',
                irregular: '🟡 Irregular',
                low_adherence: '🔴 Baja adherencia',
                technical_block: '⚙️ Bloqueo técnico',
            };
            text += `│ Clasificación: ${classLabels[review.client_classification] || review.client_classification}\n`;
        }
        if (review?.recommendation) {
            const recLabels: Record<string, string> = {
                continue: '➡️ Continuar igual',
                simplify: '⬇️ Simplificar',
                change_strategy: '🔄 Cambiar estrategia',
                redefine_goals: '🎯 Redefinir objetivos',
                do_not_renew: '🚫 No renovar',
            };
            text += `│ Recomendación coach: ${recLabels[review.recommendation] || review.recommendation}\n`;
        }
        text += `└──────────────────────────────────────────────────\n\n`;

        // ── SECCIÓN 5: REVISIONES MENSUALES ──
        text += `┌──────────────────────────────────────────────────\n`;
        text += `│ 📆 REVISIONES MENSUALES (últimos 3 meses)\n`;
        text += `├──────────────────────────────────────────────────\n`;
        if (monthlies.length > 0) {
            monthlies.forEach(m => {
                const dirLabel = DIRECTION_LABELS[m.direction_status] || m.direction_status;
                const monthName = new Date(m.month + '-15').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                text += `│ 📅 ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}\n`;
                text += `│    Dirección: ${dirLabel}\n`;
                text += `│    Objetivos: ${m.goals_fulfilled}✅ ${m.goals_partial}🟡 ${m.goals_not_fulfilled}❌ de ${m.total_goals}\n`;
                text += `│    Semanas: ${m.weeks_green}🟢 ${m.weeks_yellow}🟡 ${m.weeks_red}🔴 (${m.weeks_reviewed} revisadas)\n`;
                if (m.achievements) text += `│    Logros: ${m.achievements}\n`;
                if (m.next_month_change) text += `│    Cambio próximo mes: ${m.next_month_change}\n`;
                if (m.process_score) text += `│    Score proceso: ${m.process_score}/100\n`;
                text += `│\n`;
            });
        } else {
            text += `│ No hay revisiones mensuales en este periodo.\n`;
        }
        text += `└──────────────────────────────────────────────────\n\n`;

        // ── SECCIÓN 5.5: SUCCESS ROADMAP (HOJA DE RUTA) ──
        if (client.roadmap_data) {
            const roadmap = client.roadmap_data;
            text += `┌──────────────────────────────────────────────────\n`;
            text += `│ 🗺️ HOJA DE RUTA DEL ÉXITO\n`;
            text += `├──────────────────────────────────────────────────\n`;
            if (roadmap.dream_result) {
                text += `│ 🌈 Objetivo soñado: ${roadmap.dream_result.goal}\n`;
                text += `│ 🌅 Día perfecto: ${roadmap.dream_result.perfect_day}\n`;
            }
            if (roadmap.commitment) {
                text += `│ 🤝 Compromiso: ${roadmap.commitment.pasos} pasos/día, ${roadmap.commitment.dias_ejercicio} días/sem\n`;
            }
            if (roadmap.milestones && roadmap.milestones.length > 0) {
                text += `│\n│ 📍 Hitos clave:\n`;
                roadmap.milestones.forEach(m => {
                    const mIcon = m.status === 'completed' ? '✅' : m.status === 'current' ? '🔵' : '⚪';
                    text += `│   ${mIcon} ${m.title} (${new Date(m.target_date).toLocaleDateString('es-ES')})\n`;
                });
            }
            text += `└──────────────────────────────────────────────────\n\n`;
        }

        // ── SECCIÓN 6: ESTADO DE LA LLAMADA ──
        text += `┌──────────────────────────────────────────────────\n`;
        text += `│ 📞 ESTADO DE LA LLAMADA\n`;
        text += `├──────────────────────────────────────────────────\n`;
        text += `│ Estado: ${STATUS_CONFIG[call.call_status].label}\n`;
        text += `│ Resultado: ${RESULT_CONFIG[call.call_result].label}\n`;
        if (call.scheduled_call_date) {
            text += `│ Fecha agendada: ${new Date(call.scheduled_call_date).toLocaleString('es-ES')}\n`;
        }
        if (call.recording_url) text += `│ 🎥 Grabación: ${call.recording_url}\n`;
        text += `│\n│ 📝 Notas de la llamada:\n`;
        text += `│ ${call.call_notes || 'Sin notas registradas.'}\n`;
        if (call.not_renewed_reason) {
            text += `│\n│ ⚠️ MOTIVO NO RENOVACIÓN: ${call.not_renewed_reason}\n`;
        }
        text += `└──────────────────────────────────────────────────\n\n`;

        text += `════════════════════════════════════════════════════\n`;
        text += `Generado automáticamente por Padron Trainer CRM\n`;
        text += `════════════════════════════════════════════════════`;
        
        return text;
    };

    const handleCopy = () => {
        const text = generateTextSummary();
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Resumen copiado al portapapeles');
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const text = generateTextSummary();
        printWindow.document.write(`
            <html>
                <head>
                    <title>Resumen Renovación - ${client.name}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; line-height: 1.7; color: #333; max-width: 800px; margin: 0 auto; }
                        pre { white-space: pre-wrap; word-wrap: break-word; font-size: 13px; background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace; }
                        h1 { color: #1e293b; border-bottom: 3px solid #6366f1; padding-bottom: 12px; font-size: 22px; }
                        .meta { color: #64748b; font-size: 13px; margin-bottom: 16px; }
                        @media print {
                            body { padding: 20px; }
                            pre { border: none; background: white; padding: 0; font-size: 11px; }
                        }
                    </style>
                </head>
                <body>
                    <h1>📋 Informe de Renovación para Closer</h1>
                    <p class="meta">Cliente: ${client.name} · Coach: ${call.coach_name || 'N/A'} · Generado: ${new Date().toLocaleDateString('es-ES')}</p>
                    <pre>${text}</pre>
                    <script>
                        window.onload = () => { window.print(); };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Resumen para Closer</h2>
                            <p className="text-xs text-slate-500">Datos consolidados de renovación y proceso</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            <p className="text-sm text-slate-500 font-medium">Consolidando información del proceso...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <pre className="text-sm text-slate-700 font-mono whitespace-pre-wrap break-words leading-relaxed">
                                    {generateTextSummary()}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-white">
                    <button
                        onClick={handlePrint}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                        >
                            Cerrar
                        </button>
                        <button
                            onClick={handleCopy}
                            disabled={loading}
                            className={`flex items-center gap-2 px-6 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-md ${copied ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
                        >
                            {copied ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? '¡Copiado!' : 'Copiar Resumen'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Inline Editable Row ───────────────────────────────────────────
const RenewalCallRow: React.FC<{
    call: RenewalCall;
    isAdmin: boolean;
    currentUserId: string;
    clientMap: Map<string, Client>;
    onUpdate: (id: string, data: Partial<RenewalCall>) => Promise<void>;
    onNavigateToClient?: (client: Client) => void;
}> = ({ call, isAdmin, currentUserId, clientMap, onUpdate, onNavigateToClient }) => {
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editData, setEditData] = useState({
        call_status: call.call_status,
        call_result: call.call_result,
        scheduled_call_date: call.scheduled_call_date ? call.scheduled_call_date.slice(0, 16) : '',
        call_notes: call.call_notes || '',
        recording_url: call.recording_url || '',
        not_renewed_reason: call.not_renewed_reason || '',
    });
    const [showProcessFicha, setShowProcessFicha] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onUpdate(call.id, {
                call_status: editData.call_status,
                call_result: editData.call_result,
                scheduled_call_date: editData.scheduled_call_date || undefined,
                call_notes: editData.call_notes || undefined,
                recording_url: editData.recording_url || undefined,
                not_renewed_reason: editData.not_renewed_reason || undefined,
            });
            toast.success('Cambios guardados correctamente');
            setIsEditing(false);
        } catch (err) {
            toast.error('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditData({
            call_status: call.call_status,
            call_result: call.call_result,
            scheduled_call_date: call.scheduled_call_date ? call.scheduled_call_date.slice(0, 16) : '',
            call_notes: call.call_notes || '',
            recording_url: call.recording_url || '',
            not_renewed_reason: call.not_renewed_reason || '',
        });
        setIsEditing(false);
    };

    const statusConf = STATUS_CONFIG[call.call_status];
    const resultConf = RESULT_CONFIG[call.call_result];
    const client = clientMap.get(call.client_id);
    const daysRemaining = call.days_remaining ?? 0;

    return (
        <div className={`border rounded-xl mb-3 transition-all ${isEditing ? 'border-blue-300 shadow-lg bg-blue-50/30' : 'border-slate-200 bg-white hover:shadow-md'}`}>
            {/* Main Row */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                    {/* Left: Client info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <button
                                onClick={() => client && onNavigateToClient?.(client)}
                                className="font-semibold text-slate-900 hover:text-blue-600 transition-colors truncate text-left"
                            >
                                {call.client_name}
                            </button>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getDaysBadge(daysRemaining)}`}>
                                {daysRemaining <= 0 ? `VENCIDO hace ${Math.abs(daysRemaining)}d` : `${daysRemaining} días`}
                            </span>
                            {call.renewal_phase && (
                                <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                    {call.renewal_phase}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Fin: {new Date(call.contract_end_date).toLocaleDateString('es-ES')}
                            </span>
                            {isAdmin && (
                                <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {call.coach_name}
                                </span>
                            )}
                            {call.scheduled_call_date && (
                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                    <PhoneCall className="w-3 h-3" />
                                    Llamada: {new Date(call.scheduled_call_date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Right: Status badges + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {call.recording_url && (
                            <a
                                href={call.recording_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-colors border border-purple-100"
                                title="Ver grabación"
                            >
                                <PlayCircle className="w-3.5 h-3.5" />
                                Grabación
                            </a>
                        )}

                        <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border ${statusConf.bg} ${statusConf.color}`}>
                            {statusConf.icon} {statusConf.label}
                        </span>

                        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${resultConf.bg} ${resultConf.color}`}>
                            {resultConf.label}
                        </span>

                        <button
                            onClick={() => setShowProcessFicha(!showProcessFicha)}
                            className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${showProcessFicha
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                                }`}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            {showProcessFicha ? 'Cerrar Ficha' : 'Ficha del Proceso'}
                        </button>

                        <button
                            onClick={() => setShowSummaryModal(true)}
                            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 transition-all"
                            title="Generar resumen para el closer"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Resumen Closer
                        </button>

                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Editar"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title="Guardar"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                    title="Cancelar"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes preview (when not editing) */}
                {!isEditing && call.call_notes && (
                    <p className="text-xs text-slate-500 mt-2 pl-1 italic line-clamp-3 whitespace-pre-wrap break-words">📝 {call.call_notes}</p>
                )}
                {!isEditing && call.not_renewed_reason && (
                    <p className="text-xs text-red-500 mt-1 pl-1 italic line-clamp-1">❌ Motivo: {call.not_renewed_reason}</p>
                )}
            </div>

            {/* Edit Panel (expandible) */}
            {isEditing && (
                <div className="px-4 pb-4 border-t border-blue-100 pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Status */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Estado de la llamada</label>
                            <select
                                value={editData.call_status}
                                onChange={e => setEditData(d => ({ ...d, call_status: e.target.value as RenewalCallStatus }))}
                                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                            >
                                <option value="pending">⏳ Pendiente</option>
                                <option value="scheduled">📅 Agendada</option>
                                <option value="completed">✅ Realizada</option>
                                <option value="no_answer">📵 No Contestó</option>
                                <option value="cancelled">❌ Cancelada</option>
                            </select>
                        </div>

                        {/* Scheduled date */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha agendada</label>
                            <input
                                type="datetime-local"
                                value={editData.scheduled_call_date}
                                onChange={e => setEditData(d => ({ ...d, scheduled_call_date: e.target.value }))}
                                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                            />
                        </div>

                        {/* Result */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Resultado</label>
                            <select
                                value={editData.call_result}
                                onChange={e => setEditData(d => ({ ...d, call_result: e.target.value as RenewalCallResult }))}
                                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                            >
                                <option value="pending">⏳ Sin resultado</option>
                                <option value="renewed">✅ Renovó</option>
                                <option value="not_renewed">❌ No Renovó</option>
                                <option value="undecided">🤔 Indeciso</option>
                            </select>
                        </div>

                        {/* Recording URL */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">🎥 URL Grabación (Loom, Drive, etc.)</label>
                            <input
                                type="url"
                                value={editData.recording_url}
                                onChange={e => setEditData(d => ({ ...d, recording_url: e.target.value }))}
                                placeholder="https://www.loom.com/share/..."
                                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                            />
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Notas de la llamada</label>
                            <textarea
                                value={editData.call_notes}
                                onChange={e => setEditData(d => ({ ...d, call_notes: e.target.value }))}
                                rows={6}
                                placeholder="Resumen de la conversación, objeciones del cliente, próximos pasos..."
                                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-y min-h-[140px] leading-relaxed"
                            />
                        </div>

                        {/* Not renewed reason (conditional) */}
                        {editData.call_result === 'not_renewed' && (
                            <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-red-600 mb-1">⚠️ Motivo de no renovación</label>
                                <input
                                    type="text"
                                    value={editData.not_renewed_reason}
                                    onChange={e => setEditData(d => ({ ...d, not_renewed_reason: e.target.value }))}
                                    placeholder="Económico, insatisfacción, tiempo, otro..."
                                    className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none bg-red-50/50"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Process Ficha Panel (expandible) */}
            {showProcessFicha && (
                <div className="px-4 pb-4 border-t border-indigo-100 pt-4 bg-indigo-50/10">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Rocket className="w-4 h-4 text-indigo-500" />
                                Ficha de Análisis del Proceso
                            </h3>
                            <p className="text-[10px] text-slate-500">Datos consolidados del trimestre para toma de decisiones</p>
                        </div>
                        <button
                            onClick={() => setShowProcessFicha(false)}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {client ? (
                        <QuarterlyReviewPanel
                            client={client}
                            coachId={call.coach_id || currentUserId}
                            renewalCallId={call.id}
                            periodStart={new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString()} // Por defecto últimos 3 meses
                            periodEnd={new Date().toISOString()}
                        />
                    ) : (
                        <div className="p-4 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                            No se encontraron datos del cliente para generar la ficha.
                        </div>
                    )}
                </div>
            )}

            {/* Closer Summary Modal */}
            {showSummaryModal && client && (
                <CloserSummaryModal
                    call={call}
                    client={client}
                    onClose={() => setShowSummaryModal(false)}
                />
            )}

        </div>
    );
};

// ─── KPI Card Component ────────────────────────────────────────────
const KPICard: React.FC<{ label: string; value: number | string; icon: React.ReactNode; color: string; subLabel?: string }> = ({ label, value, icon, color, subLabel }) => (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow`}>
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                {icon}
            </div>
        </div>
        <p className="text-2xl font-black text-slate-900">{value}</p>
        {subLabel && <p className="text-[10px] text-slate-400 mt-1">{subLabel}</p>}
    </div>
);

// ─── Table View Component ──────────────────────────────────────────
const RenewalCallTable: React.FC<{
    calls: RenewalCall[];
    isAdmin: boolean;
    clientMap: Map<string, Client>;
    onNavigateToClient?: (client: Client) => void;
}> = ({ calls, isAdmin, clientMap, onNavigateToClient }) => {
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3 font-semibold">Cliente</th>
                        {isAdmin && <th className="px-4 py-3 font-semibold">Coach</th>}
                        <th className="px-4 py-3 font-semibold">Fase</th>
                        <th className="px-4 py-3 font-semibold">Fin Contrato</th>
                        <th className="px-4 py-3 font-semibold">Estado</th>
                        <th className="px-4 py-3 font-semibold">Resultado</th>
                        <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {calls.map(call => {
                        const statusConf = STATUS_CONFIG[call.call_status];
                        const resultConf = RESULT_CONFIG[call.call_result];
                        const client = clientMap.get(call.client_id);

                        return (
                            <tr key={call.id} className="bg-white hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                                    <button onClick={() => client && onNavigateToClient?.(client)} className="hover:text-blue-600 font-semibold transition-colors">
                                        {call.client_name}
                                    </button>
                                </td>
                                {isAdmin && <td className="px-4 py-3">{call.coach_name}</td>}
                                <td className="px-4 py-3">
                                    {call.renewal_phase && (
                                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                            {call.renewal_phase}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {new Date(call.contract_end_date).toLocaleDateString('es-ES')}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${statusConf.bg} ${statusConf.color}`}>
                                        {statusConf.label}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${resultConf.bg} ${resultConf.color}`}>
                                        {resultConf.label}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        {call.recording_url && (
                                            <a href={call.recording_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-1 rounded-md transition-colors" title="Ver grabación">
                                                <PlayCircle className="w-4 h-4" />
                                            </a>
                                        )}
                                        {call.call_notes && (
                                            <div className="group relative">
                                                <div className="cursor-help text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-md transition-colors">
                                                    <span className="sr-only">Notas</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
                                                </div>
                                                <div className="absolute right-0 bottom-full mb-2 w-80 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                    <p className="font-semibold mb-1 border-b border-slate-600 pb-1">Notas:</p>
                                                    <div className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed pr-1">
                                                        {call.call_notes}
                                                    </div>
                                                    {call.not_renewed_reason && (
                                                        <div className="mt-2 text-red-300 border-t border-slate-600 pt-1">
                                                            <p className="font-semibold">Motivo no renovación:</p>
                                                            {call.not_renewed_reason}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────
export const RenewalCallsManager: React.FC<RenewalCallsManagerProps> = ({
    clients,
    user,
    coaches = [],
    onNavigateToClient,
}) => {
    const { toast } = useToast();
    const [calls, setCalls] = useState<RenewalCall[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<RenewalCallStatus | 'all'>('all');
    const [filterResult, setFilterResult] = useState<RenewalCallResult | 'all'>('all');
    const [filterCoach, setFilterCoach] = useState<string>('all');
    const [filterUrgency, setFilterUrgency] = useState<'all' | 'overdue' | 'urgent' | 'warning' | 'ok'>('all');
    const [showArchived, setShowArchived] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.DIRECCION;
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

    // Load data
    const loadCalls = useCallback(async () => {
        setLoading(true);
        const data = await getRenewalCalls(user.id, isAdmin, clients, coaches);
        setCalls(data);
        setLoading(false);
    }, [user.id, isAdmin, clients, coaches]);

    useEffect(() => {
        loadCalls();
    }, [loadCalls]);

    // Auto-generate alerts
    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const count = await generateRenewalAlerts(clients, coaches);
            if (count > 0) {
                await loadCalls();
                toast.success(`Se han generado ${count} nuevas alertas de renovación`);
            } else {
                toast.info('No hay nuevas alertas que generar');
            }
        } catch (err) {
            toast.error('Error al sincronizar alertas');
        } finally {
            setGenerating(false);
        }
    };

    // Update handler
    const handleUpdate = async (id: string, data: Partial<RenewalCall>) => {
        const success = await updateRenewalCall(id, data);
        if (success) {
            setCalls(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
        }
    };

    // Stats
    const stats: RenewalCallStats = useMemo(() => calculateStats(calls), [calls]);

    // Filtered calls
    const filteredCalls = useMemo(() => {
        return calls.filter(call => {
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (
                    !call.client_name?.toLowerCase().includes(term) &&
                    !call.coach_name?.toLowerCase().includes(term) &&
                    !call.call_notes?.toLowerCase().includes(term)
                ) return false;
            }
            if (filterStatus !== 'all' && call.call_status !== filterStatus) return false;
            if (filterResult !== 'all' && call.call_result !== filterResult) return false;
            if (filterCoach !== 'all' && call.coach_id !== filterCoach) return false;
            if (filterUrgency !== 'all') {
                const d = call.days_remaining ?? 0;
                if (filterUrgency === 'overdue' && d > 0) return false;
                if (filterUrgency === 'urgent' && (d <= 0 || d > 7)) return false;
                if (filterUrgency === 'warning' && (d <= 7 || d > 15)) return false;
                if (filterUrgency === 'ok' && d <= 15) return false;
            }

            // Ocultar por defecto si está resuelto (Renovó/No Renovó) y la fecha ya pasó
            if (!showArchived && filterResult === 'all') {
                const isResolved = call.call_result === 'renewed' || call.call_result === 'not_renewed';
                const isOverdue = (call.days_remaining ?? 0) < 0;
                if (isResolved && isOverdue) return false;
            }

            return true;
        });
    }, [calls, searchTerm, filterStatus, filterResult, filterCoach, filterUrgency, showArchived]);

    // Unique coaches for filter
    const uniqueCoaches = useMemo(() => {
        const ids = [...new Set(calls.map(c => c.coach_id))];
        return ids.map(id => ({
            id,
            name: coaches.find(c => c.id === id)?.name || 'Desconocido',
        }));
    }, [calls, coaches]);

    return (
        <div className="space-y-6 p-1">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Phone className="w-5 h-5 text-white" />
                        </div>
                        Llamadas de Renovación
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {isAdmin ? 'Gestión de todas las llamadas de renovación del equipo' : 'Tus llamadas de renovación pendientes'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg mr-2">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Vista Tarjetas"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Vista Tabla"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md shadow-blue-200 disabled:opacity-50"
                    >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sincronizar Alertas
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <KPICard label="Pendientes" value={stats.pending} icon={<Clock className="w-4 h-4 text-amber-600" />} color="bg-amber-50" subLabel="Sin gestionar" />
                <KPICard label="Agendadas" value={stats.scheduled} icon={<Calendar className="w-4 h-4 text-blue-600" />} color="bg-blue-50" subLabel="Llamadas programadas" />
                <KPICard label="Completadas" value={stats.completed} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} color="bg-emerald-50" subLabel="Llamadas realizadas" />
                <KPICard label="Tasa Renovación" value={`${stats.renewalRate}%`} icon={<TrendingUp className="w-4 h-4 text-indigo-600" />} color="bg-indigo-50" subLabel={`${stats.renewed} de ${stats.renewed + stats.notRenewed} decididas`} />
                <KPICard label="Con Grabación" value={stats.withRecording} icon={<Video className="w-4 h-4 text-purple-600" />} color="bg-purple-50" subLabel="Calls grabadas" />
            </div>

            {/* Search & Filters */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, coach o notas..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                        />
                    </div>

                    {/* Quick Filters */}
                    <div className="flex items-center gap-2">
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value as any)}
                            className="text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="pending">⏳ Pendiente</option>
                            <option value="scheduled">📅 Agendada</option>
                            <option value="completed">✅ Realizada</option>
                            <option value="no_answer">📵 No Contestó</option>
                        </select>

                        <select
                            value={filterResult}
                            onChange={e => setFilterResult(e.target.value as any)}
                            className="text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                        >
                            <option value="all">Todos los resultados</option>
                            <option value="renewed">✅ Renovó</option>
                            <option value="not_renewed">❌ No Renovó</option>
                            <option value="undecided">🤔 Indeciso</option>
                        </select>

                        {isAdmin && (
                            <select
                                value={filterCoach}
                                onChange={e => setFilterCoach(e.target.value)}
                                className="text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                            >
                                <option value="all">Todos los coaches</option>
                                {uniqueCoaches.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}

                        <select
                            value={filterUrgency}
                            onChange={e => setFilterUrgency(e.target.value as any)}
                            className="text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                        >
                            <option value="all">Todas las urgencias</option>
                            <option value="overdue">🔴 Vencidos</option>
                            <option value="urgent">🟠 Urgente (≤7 días)</option>
                            <option value="warning">🟡 Pronto (8-15 días)</option>
                            <option value="ok">🟢 OK (16-30 días)</option>
                        </select>

                        <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                                type="checkbox"
                                checked={showArchived}
                                onChange={e => setShowArchived(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Ver históricos</span>
                        </label>
                    </div>
                </div>

                {/* Results count */}
                <div className="px-4 pb-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                        Mostrando <strong>{filteredCalls.length}</strong> de {calls.length} llamadas
                    </span>
                    {(filterStatus !== 'all' || filterResult !== 'all' || filterCoach !== 'all' || filterUrgency !== 'all' || searchTerm || showArchived) && (
                        <button
                            onClick={() => { setFilterStatus('all'); setFilterResult('all'); setFilterCoach('all'); setFilterUrgency('all'); setSearchTerm(''); setShowArchived(false); }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Call List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="ml-3 text-slate-500">Cargando llamadas...</span>
                </div>
            ) : filteredCalls.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-lg">Sin llamadas pendientes</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                        {calls.length === 0
                            ? 'No hay alertas de renovación. Pulsa "Sincronizar Alertas" para detectar contratos próximos a vencer.'
                            : 'No hay llamadas que coincidan con los filtros aplicados.'}
                    </p>
                </div>
            ) : viewMode === 'table' ? (
                <RenewalCallTable
                    calls={filteredCalls}
                    isAdmin={isAdmin}
                    clientMap={clientMap}
                    onNavigateToClient={onNavigateToClient}
                />
            ) : (
                <div className="space-y-4">
                    {filteredCalls.map(call => (
                        <RenewalCallRow
                            key={call.id}
                            call={call}
                            isAdmin={isAdmin}
                            currentUserId={user.id}
                            clientMap={clientMap}
                            onUpdate={handleUpdate}
                            onNavigateToClient={onNavigateToClient}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default RenewalCallsManager;
