import React, { useState, useEffect, useMemo } from 'react';
import {
    Sparkles, CheckCircle2, Clock, Save, ChevronDown, ChevronUp, Star, Users, Target,
    Trophy, MessageSquare, ClipboardList, Lightbulb, Shield, Crosshair, Plus, Trash2, AlertTriangle,
    Calendar, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { OptimizationSurvey, CallPrep, CallPrepObjection } from '../types';

interface OptimizationSurveyCardProps {
    clientId: string;
    coachId?: string;
}

// --- Compact Q&A display ---
const QA = ({ q, a, icon }: { q: string; a?: string | null; icon?: React.ReactNode }) => {
    return (
        <div className="p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{q}</p>
            </div>
            {a
                ? <p className="text-sm text-slate-700 whitespace-pre-wrap">{a}</p>
                : <p className="text-sm text-slate-400 italic">Sin respuesta</p>
            }
        </div>
    );
};

// --- Common objections suggestions ---
const COMMON_OBJECTIONS = [
    'No tengo tiempo para seguir el programa',
    'Es demasiado caro / no me lo puedo permitir',
    'No estoy viendo los resultados que esperaba',
    'Quiero pensarlo / consultarlo',
    'Ya me manejo solo/a, no necesito seguimiento',
];

// --- Empty prep factory ---
const emptyPrep = (survey: OptimizationSurvey): CallPrep => ({
    achievements: survey.biggest_achievement || '',
    difficulties_approach: '',
    proposal: '',
    proposal_reason: '',
    objections: [],
    call_goal: '',
});

// --- Completion calculator ---
const getCompletionInfo = (prep: CallPrep) => {
    const fields = [
        { name: 'Logros', filled: !!prep.achievements.trim() },
        { name: 'Dificultades', filled: !!prep.difficulties_approach.trim() },
        { name: 'Propuesta', filled: !!prep.proposal.trim() },
        { name: 'Justificación', filled: !!prep.proposal_reason.trim() },
        { name: 'Objeciones', filled: prep.objections.length > 0 && prep.objections.every(o => o.objection.trim() && o.response.trim()) },
        { name: 'Objetivo', filled: !!prep.call_goal.trim() },
    ];
    const filled = fields.filter(f => f.filled).length;
    const pct = Math.round((filled / fields.length) * 100);
    return { fields, filled, total: fields.length, pct };
};

// --- Days remaining helper ---
const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

// --- Cheat sheet component ---
const CheatSheet = ({ prep, survey }: { prep: CallPrep; survey: OptimizationSurvey }) => (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 space-y-2.5 print:break-inside-avoid">
        <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Chuleta para la llamada
        </p>
        {prep.call_goal && (
            <div className="p-2 bg-purple-600 text-white rounded-lg">
                <p className="text-[9px] font-bold uppercase opacity-80">Objetivo</p>
                <p className="text-xs font-bold">{prep.call_goal}</p>
            </div>
        )}
        <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-white/80 rounded-lg">
                <p className="text-[9px] font-bold text-green-600 uppercase">Reforzar</p>
                <p className="text-[11px] text-slate-700">{prep.achievements || '—'}</p>
            </div>
            <div className="p-2 bg-white/80 rounded-lg">
                <p className="text-[9px] font-bold text-red-500 uppercase">Abordar</p>
                <p className="text-[11px] text-slate-700">{prep.difficulties_approach || '—'}</p>
            </div>
            <div className="p-2 bg-white/80 rounded-lg">
                <p className="text-[9px] font-bold text-amber-600 uppercase">Proponer</p>
                <p className="text-[11px] text-slate-700">{prep.proposal || '—'}</p>
            </div>
            <div className="p-2 bg-white/80 rounded-lg">
                <p className="text-[9px] font-bold text-amber-500 uppercase">Por qué</p>
                <p className="text-[11px] text-slate-700">{prep.proposal_reason || '—'}</p>
            </div>
        </div>
        {prep.objections.length > 0 && (
            <div className="space-y-1">
                <p className="text-[9px] font-bold text-rose-600 uppercase">Si dice...</p>
                {prep.objections.map((o, i) => (
                    <div key={i} className="flex gap-2 p-1.5 bg-white/80 rounded-lg text-[11px]">
                        <span className="text-rose-500 font-medium shrink-0">«{o.objection}»</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-green-700">{o.response}</span>
                    </div>
                ))}
            </div>
        )}
    </div>
);

export function OptimizationSurveyCard({ clientId, coachId }: OptimizationSurveyCardProps) {
    const [surveys, setSurveys] = useState<OptimizationSurvey[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [preps, setPreps] = useState<Record<string, CallPrep>>({});
    const [saving, setSaving] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState<string | null>(null);
    const [showCheatSheet, setShowCheatSheet] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const { data, error } = await supabase
                .from('optimization_surveys')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });
            if (error) console.error('[OptSurveyCard]', error);
            if (data) {
                setSurveys(data);
                const p: Record<string, CallPrep> = {};
                data.forEach(s => {
                    if (s.call_prep && typeof s.call_prep === 'object' && s.call_prep.achievements !== undefined) {
                        p[s.id] = s.call_prep as CallPrep;
                    } else {
                        // Migrate from old fields or create empty
                        p[s.id] = {
                            achievements: s.coach_notes || s.biggest_achievement || '',
                            difficulties_approach: '',
                            proposal: s.coach_proposal || '',
                            proposal_reason: '',
                            objections: [],
                            call_goal: '',
                        };
                    }
                });
                setPreps(p);
                if (data.length > 0) setExpanded(data[0].id);
            }
            setLoading(false);
        };
        load();
    }, [clientId]);

    const updatePrep = (surveyId: string, field: keyof CallPrep, value: any) => {
        setPreps(prev => ({ ...prev, [surveyId]: { ...prev[surveyId], [field]: value } }));
    };

    const addObjection = (surveyId: string, objectionText = '') => {
        setPreps(prev => ({
            ...prev,
            [surveyId]: {
                ...prev[surveyId],
                objections: [...prev[surveyId].objections, { objection: objectionText, response: '' }]
            }
        }));
    };

    const updateObjection = (surveyId: string, index: number, field: keyof CallPrepObjection, value: string) => {
        setPreps(prev => {
            const objs = [...prev[surveyId].objections];
            objs[index] = { ...objs[index], [field]: value };
            return { ...prev, [surveyId]: { ...prev[surveyId], objections: objs } };
        });
    };

    const removeObjection = (surveyId: string, index: number) => {
        setPreps(prev => ({
            ...prev,
            [surveyId]: {
                ...prev[surveyId],
                objections: prev[surveyId].objections.filter((_, i) => i !== index)
            }
        }));
    };

    const handleSavePrep = async (surveyId: string) => {
        setSaving(true);
        const { error } = await supabase
            .from('optimization_surveys')
            .update({
                call_prep: preps[surveyId],
                reviewed_by: coachId,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', surveyId);
        if (error) console.error('[OptSurveyCard] save prep error:', error);
        else {
            setSurveys(prev => prev.map(s =>
                s.id === surveyId ? {
                    ...s,
                    call_prep: preps[surveyId],
                    reviewed_by: coachId,
                    reviewed_at: new Date().toISOString()
                } : s
            ));
        }
        setSaving(false);
    };

    if (loading || surveys.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-sea-50 to-indigo-50 border-b border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-sea-100 rounded-xl text-sea-600">
                    <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-sm">Encuesta Pre-Llamada de Optimización</h3>
                    <p className="text-xs text-slate-500">{surveys.length} encuesta{surveys.length > 1 ? 's' : ''} completada{surveys.length > 1 ? 's' : ''}</p>
                </div>
            </div>

            {/* Surveys list */}
            <div className="divide-y divide-slate-100">
                {surveys.map(survey => {
                    const isOpen = expanded === survey.id;
                    const isReviewed = !!survey.reviewed_at;
                    const prep = preps[survey.id] || emptyPrep(survey);
                    const lowRating = (survey.satisfaction_rating ?? 10) <= 7;
                    const daysLeft = getDaysRemaining(survey.contract_end_date);
                    const completion = getCompletionInfo(prep);

                    return (
                        <div key={survey.id}>
                            {/* Collapse header */}
                            <button
                                onClick={() => setExpanded(isOpen ? null : survey.id)}
                                className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isReviewed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {survey.contract_phase || 'F1'}
                                    </span>
                                    <span className="text-sm text-slate-700">
                                        {survey.submitted_at
                                            ? new Date(survey.submitted_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                                            : 'Sin fecha'}
                                    </span>
                                    {isReviewed
                                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        : <Clock className="w-4 h-4 text-amber-500" />
                                    }
                                    {daysLeft != null && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                            daysLeft <= 7 ? 'bg-red-100 text-red-700' :
                                            daysLeft <= 14 ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            <Calendar className="w-3 h-3" />
                                            {daysLeft <= 0 ? 'Vencido' : `${daysLeft}d`}
                                        </span>
                                    )}
                                </div>
                                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>

                            {/* Expanded content */}
                            {isOpen && (
                                <div className="px-5 pb-5 space-y-4 animate-in fade-in slide-in-from-top-1">

                                    {/* ===== SECTION 1: QUICK SUMMARY (from survey) ===== */}
                                    <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Resumen del cliente</p>

                                        {/* Ratings */}
                                        <div className="flex gap-3 mb-3">
                                            {survey.satisfaction_rating != null && (
                                                <div className="flex-1 p-2 bg-white rounded-xl text-center shadow-sm">
                                                    <p className="text-[9px] font-bold text-sea-400 uppercase">Experiencia</p>
                                                    <p className={`text-xl font-bold ${survey.satisfaction_rating >= 8 ? 'text-accent-600' :
                                                        survey.satisfaction_rating >= 5 ? 'text-amber-600' : 'text-red-500'
                                                        }`}>{survey.satisfaction_rating}<span className="text-[10px] text-slate-400">/10</span></p>
                                                </div>
                                            )}
                                            {survey.importance_rating != null && (
                                                <div className="flex-1 p-2 bg-white rounded-xl text-center shadow-sm">
                                                    <p className="text-[9px] font-bold text-indigo-400 uppercase">Importancia seguir</p>
                                                    <p className={`text-xl font-bold ${survey.importance_rating >= 8 ? 'text-indigo-600' :
                                                        survey.importance_rating >= 5 ? 'text-amber-600' : 'text-red-500'
                                                        }`}>{survey.importance_rating}<span className="text-[10px] text-slate-400">/10</span></p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Key data pills */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {survey.biggest_achievement && (
                                                <div className="flex gap-2 p-2 bg-white rounded-lg">
                                                    <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-[9px] font-bold text-amber-600 uppercase">Logro</p>
                                                        <p className="text-xs text-slate-700">{survey.biggest_achievement}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {survey.biggest_challenge && (
                                                <div className="flex gap-2 p-2 bg-white rounded-lg">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-[9px] font-bold text-red-500 uppercase">Dificultad</p>
                                                        <p className="text-xs text-slate-700">{survey.biggest_challenge}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {survey.future_goals && (
                                                <div className="flex gap-2 p-2 bg-white rounded-lg">
                                                    <Target className="w-3.5 h-3.5 text-accent-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-[9px] font-bold text-accent-600 uppercase">Quiere conseguir</p>
                                                        <p className="text-xs text-slate-700">{survey.future_goals}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {survey.goal_feeling && (
                                                <div className="flex gap-2 p-2 bg-white rounded-lg">
                                                    <Star className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-[9px] font-bold text-purple-600 uppercase">Cómo se sentiría</p>
                                                        <p className="text-xs text-slate-700">{survey.goal_feeling}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Low rating warning */}
                                        {lowRating && survey.rating_reason && (
                                            <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                                                <p className="text-[9px] font-bold text-red-600 uppercase">Motivo nota baja ({survey.satisfaction_rating}/10)</p>
                                                <p className="text-xs text-red-700">{survey.rating_reason}</p>
                                            </div>
                                        )}

                                        {/* Extra answers (collapsible) */}
                                        {(survey.improvement_suggestions || survey.additional_comments) && (
                                            <div className="mt-2 space-y-1.5">
                                                {survey.improvement_suggestions && (
                                                    <div className="flex gap-2 p-2 bg-white rounded-lg">
                                                        <MessageSquare className="w-3.5 h-3.5 text-sea-500 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-[9px] font-bold text-sea-600 uppercase">Sugerencias de mejora</p>
                                                            <p className="text-xs text-slate-700">{survey.improvement_suggestions}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {survey.additional_comments && (
                                                    <div className="flex gap-2 p-2 bg-white rounded-lg">
                                                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase">Comentarios adicionales</p>
                                                            <p className="text-xs text-slate-700">{survey.additional_comments}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Referral */}
                                        {survey.has_referral && (
                                            <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-100">
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="w-3.5 h-3.5 text-green-600" />
                                                    <p className="text-[9px] font-bold text-green-600 uppercase">Referido</p>
                                                </div>
                                                <p className="text-xs text-green-800 font-medium mt-0.5">
                                                    {survey.referral_name || 'Sin nombre'} {survey.referral_phone ? `· ${survey.referral_phone}` : ''}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* ===== SECTION 2: CALL PREPARATION ===== */}
                                    <div className="border-2 border-dashed border-purple-200 rounded-2xl p-4 bg-purple-50/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ClipboardList className="w-5 h-5 text-purple-600" />
                                            <h4 className="text-sm font-bold text-purple-900">Preparación de la Llamada</h4>
                                            <div className="ml-auto flex items-center gap-2">
                                                {isReviewed && (
                                                    <button
                                                        onClick={() => setShowCheatSheet(showCheatSheet === survey.id ? null : survey.id)}
                                                        className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors flex items-center gap-1"
                                                    >
                                                        {showCheatSheet === survey.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                        Chuleta
                                                    </button>
                                                )}
                                                {isReviewed && <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Preparada</span>}
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-[9px] text-purple-500 font-bold">{completion.filled}/{completion.total} secciones completadas</p>
                                                <p className={`text-[9px] font-black ${
                                                    completion.pct === 100 ? 'text-green-600' : completion.pct >= 50 ? 'text-amber-600' : 'text-slate-400'
                                                }`}>{completion.pct}%</p>
                                            </div>
                                            <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        completion.pct === 100 ? 'bg-green-500' : completion.pct >= 50 ? 'bg-purple-500' : 'bg-purple-300'
                                                    }`}
                                                    style={{ width: `${completion.pct}%` }}
                                                />
                                            </div>
                                            {completion.pct < 100 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {completion.fields.filter(f => !f.filled).map(f => (
                                                        <span key={f.name} className="text-[8px] px-1.5 py-0.5 bg-purple-100 text-purple-500 rounded font-medium">
                                                            {f.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Cheat sheet (collapsible) */}
                                        {showCheatSheet === survey.id && (
                                            <div className="mb-4">
                                                <CheatSheet prep={prep} survey={survey} />
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {/* 2a: Achievements to reinforce */}
                                            <div>
                                                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-700 mb-1.5">
                                                    <Trophy className="w-3 h-3" />
                                                    Logros a reforzar en la llamada
                                                </label>
                                                <textarea
                                                    value={prep.achievements}
                                                    onChange={e => updatePrep(survey.id, 'achievements', e.target.value)}
                                                    className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none h-16 resize-none text-sm bg-white"
                                                    placeholder="Empieza reconociendo lo que ha conseguido para marcar un tono positivo..."
                                                />
                                            </div>

                                            {/* 2b: How to address difficulties */}
                                            <div>
                                                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600 mb-1.5">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Dificultades: cómo las voy a abordar
                                                </label>
                                                {survey.biggest_challenge && (
                                                    <p className="text-[10px] text-red-400 mb-1 italic">El cliente dijo: «{survey.biggest_challenge}»</p>
                                                )}
                                                <textarea
                                                    value={prep.difficulties_approach}
                                                    onChange={e => updatePrep(survey.id, 'difficulties_approach', e.target.value)}
                                                    className="w-full p-3 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-300 outline-none h-16 resize-none text-sm bg-white"
                                                    placeholder="¿Qué solución concreta le voy a proponer para su dificultad?"
                                                />
                                            </div>

                                            {/* 2c: Proposal */}
                                            <div>
                                                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1.5">
                                                    <Lightbulb className="w-3 h-3" />
                                                    Propuesta para el cliente
                                                </label>
                                                <textarea
                                                    value={prep.proposal}
                                                    onChange={e => updatePrep(survey.id, 'proposal', e.target.value)}
                                                    className="w-full p-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none h-16 resize-none text-sm bg-white"
                                                    placeholder="¿Qué le voy a ofrecer? (plan, fase, ajuste de seguimiento, nuevo servicio...)"
                                                />
                                            </div>

                                            {/* 2d: Why this proposal fits */}
                                            <div>
                                                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1.5">
                                                    <Target className="w-3 h-3" />
                                                    ¿Por qué esta propuesta es la mejor para este cliente?
                                                </label>
                                                {survey.future_goals && (
                                                    <p className="text-[10px] text-amber-400 mb-1 italic">Su objetivo: «{survey.future_goals}»</p>
                                                )}
                                                <textarea
                                                    value={prep.proposal_reason}
                                                    onChange={e => updatePrep(survey.id, 'proposal_reason', e.target.value)}
                                                    className="w-full p-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-300 outline-none h-16 resize-none text-sm bg-white"
                                                    placeholder="Conecta la propuesta con sus objetivos y motivaciones..."
                                                />
                                            </div>

                                            {/* 2e: Objections */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                                                        <Shield className="w-3 h-3" />
                                                        Posibles objeciones y respuestas
                                                    </label>
                                                    <button
                                                        onClick={() => setShowSuggestions(showSuggestions === survey.id ? null : survey.id)}
                                                        className="text-[9px] text-purple-600 font-bold hover:text-purple-800 transition-colors"
                                                    >
                                                        {showSuggestions === survey.id ? 'Ocultar sugerencias' : 'Ver objeciones comunes'}
                                                    </button>
                                                </div>

                                                {/* Low rating auto-warning */}
                                                {lowRating && prep.objections.length === 0 && (
                                                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg mb-2">
                                                        <p className="text-[10px] text-red-700 font-medium">
                                                            La valoración es <span className="font-bold">{survey.satisfaction_rating}/10</span> — prepara respuestas para posibles quejas o insatisfacción.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Suggested objections */}
                                                {showSuggestions === survey.id && (
                                                    <div className="p-3 bg-purple-50 rounded-xl mb-3 border border-purple-100">
                                                        <p className="text-[9px] font-bold text-purple-600 uppercase mb-2">Haz clic para añadir:</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {COMMON_OBJECTIONS.map((obj, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => {
                                                                        addObjection(survey.id, obj);
                                                                        setShowSuggestions(null);
                                                                    }}
                                                                    className="text-[10px] px-2.5 py-1 bg-white border border-purple-200 rounded-full text-purple-700 hover:bg-purple-100 transition-colors font-medium"
                                                                >
                                                                    + {obj}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Objection blocks */}
                                                <div className="space-y-3">
                                                    {prep.objections.map((obj, i) => (
                                                        <div key={i} className="p-3 bg-white rounded-xl border border-rose-100 relative group">
                                                            <button
                                                                onClick={() => removeObjection(survey.id, i)}
                                                                className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <div className="mb-2">
                                                                <p className="text-[9px] font-bold text-rose-500 uppercase mb-1">Objeción</p>
                                                                <input
                                                                    value={obj.objection}
                                                                    onChange={e => updateObjection(survey.id, i, 'objection', e.target.value)}
                                                                    className="w-full p-2 border border-rose-100 rounded-lg text-sm focus:ring-2 focus:ring-rose-300 outline-none"
                                                                    placeholder="¿Qué podría decir el cliente?"
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-bold text-green-600 uppercase mb-1">Tu respuesta</p>
                                                                <textarea
                                                                    value={obj.response}
                                                                    onChange={e => updateObjection(survey.id, i, 'response', e.target.value)}
                                                                    className="w-full p-2 border border-green-100 rounded-lg text-sm focus:ring-2 focus:ring-green-300 outline-none h-14 resize-none"
                                                                    placeholder="¿Cómo vas a responder a esto?"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={() => addObjection(survey.id)}
                                                    className="mt-2 w-full py-2 border-2 border-dashed border-rose-200 rounded-xl text-rose-400 text-[10px] font-bold uppercase tracking-wider hover:border-rose-400 hover:text-rose-600 transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    Añadir objeción
                                                </button>
                                            </div>

                                            {/* 2f: Call goal */}
                                            <div>
                                                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 mb-1.5">
                                                    <Crosshair className="w-3 h-3" />
                                                    Objetivo de esta llamada
                                                </label>
                                                <input
                                                    value={prep.call_goal}
                                                    onChange={e => updatePrep(survey.id, 'call_goal', e.target.value)}
                                                    className="w-full p-3 border-2 border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none text-sm bg-white font-medium"
                                                    placeholder="¿Qué quiero conseguir con esta llamada? (Ej: Que renueve 3 meses, que acepte cambio de plan...)"
                                                />
                                            </div>
                                        </div>

                                        {/* Save button */}
                                        <div className="flex justify-end mt-4">
                                            <button
                                                onClick={() => handleSavePrep(survey.id)}
                                                disabled={saving}
                                                className="px-6 py-3 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-200 transition-all"
                                            >
                                                <Save className="w-4 h-4" />
                                                {saving ? 'Guardando...' : 'Guardar preparación'}
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
