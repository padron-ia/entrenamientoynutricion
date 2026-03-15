import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
    Target, Plus, Trash2, Calendar, CheckCircle2, Circle, Save, RotateCcw, Sparkles,
    Dumbbell, Utensils, Heart, Footprints, Scale, Send, MessageSquare, ClipboardCheck,
    ChevronRight, ChevronLeft, Printer, AlertTriangle, PlayCircle, Maximize, Minimize,
    Rocket, TrendingUp, ShieldCheck, Crown, Activity
} from 'lucide-react';
import { Client, SuccessMilestone, RoadmapData, RoadmapObstacleSolutions, RoadmapCommitment } from '../types';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ToastProvider';
import { getCurrentProgramPhase } from '../services/processTrackingService';

interface SuccessRoadmapEditorProps {
    client: Client;
    onUpdate?: (updatedClient: Client) => void;
    initialStep?: number;
}

export interface SuccessRoadmapEditorRef {
    goToStep: (step: number) => void;
}

const PHASE_ICONS = [Rocket, TrendingUp, ShieldCheck, Crown];
const PHASE_COLORS = [
    { gradient: 'from-sky-500 to-blue-600', bg: 'bg-sky-50', bgDark: 'bg-sky-500/10', border: 'border-sky-200', borderDark: 'border-sky-500/30', text: 'text-sky-800', textDark: 'text-sky-200', accent: 'bg-sky-500' },
    { gradient: 'from-indigo-500 to-purple-600', bg: 'bg-indigo-50', bgDark: 'bg-indigo-500/10', border: 'border-indigo-200', borderDark: 'border-indigo-500/30', text: 'text-indigo-800', textDark: 'text-indigo-200', accent: 'bg-indigo-500' },
    { gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', bgDark: 'bg-emerald-500/10', border: 'border-emerald-200', borderDark: 'border-emerald-500/30', text: 'text-emerald-800', textDark: 'text-emerald-200', accent: 'bg-emerald-500' },
    { gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', bgDark: 'bg-amber-500/10', border: 'border-amber-200', borderDark: 'border-amber-500/30', text: 'text-amber-800', textDark: 'text-amber-200', accent: 'bg-amber-500' },
];

const PROGRAM_PHASES = [
    {
        name: "Fase 1: Inicial",
        subtitle: "Primer Trimestre",
        duration: "Mes 1-3",
        maxWeightLoss: 7,
        weightTarget: "Perder 5-7 kg",
        hba1cTarget: "HbA1c -0.5 a -1%",
        goals: [
            "Perder entre 5-7 kilos",
            "Bajar la HbA1c entre 0.5-1% (sin más medicación)"
        ],
        otherGoals: ["Crear hábitos de entrenamiento", "Adaptar alimentación"],
    },
    {
        name: "Fase 2: Afianzamiento",
        subtitle: "Segundo Trimestre",
        duration: "Mes 4-6",
        maxWeightLoss: 11,
        weightTarget: "7-11 kg total",
        hba1cTarget: "HbA1c -1 a -2% total",
        goals: [
            "Alcanzar una pérdida de 7-11 kilos en total",
            "Bajar la HbA1c entre 1-2% en total",
            "Posible reducción de medicación al 50%"
        ],
        otherGoals: ["Posible reducción medicación 50%", "Consolidar rutina"],
    },
    {
        name: "Fase 3: Consolidación",
        subtitle: "Segundo Semestre",
        duration: "Mes 7-12",
        maxWeightLoss: 20,
        weightTarget: "11-20 kg total",
        hba1cTarget: "Normalización HbA1c",
        goals: [
            "Alcanzar una pérdida de 11-20 kilos en total",
            "Posible normalización de la HbA1c",
            "Normalización de analíticas generales"
        ],
        otherGoals: ["Normalización analíticas generales", "Autonomía nutricional"],
    },
    {
        name: "Fase 4: Avanzada y Mantenimiento",
        subtitle: "Mantenimiento",
        duration: "+12 Meses",
        maxWeightLoss: 999,
        weightTarget: "Objetivo final de peso",
        hba1cTarget: "Posible reversión T2D",
        goals: [
            "Alcanzar objetivo final de peso",
            "Posible reversión de la diabetes tipo 2",
            "Mantenimiento de los resultados a largo plazo"
        ],
        otherGoals: ["Mantenimiento a largo plazo", "Estilo de vida consolidado"],
    }
];

export const SuccessRoadmapEditor = forwardRef<SuccessRoadmapEditorRef, SuccessRoadmapEditorProps>(({ client, onUpdate, initialStep }, ref) => {
    const { toast } = useToast();
    const [step, setStep] = useState(initialStep || 1);

    useImperativeHandle(ref, () => ({
        goToStep: (s: number) => setStep(s)
    }));
    const [loading, setLoading] = useState(false);
    const [isPresentationMode, setIsPresentationMode] = useState(false);

    // Roadmap State
    const [mainGoal, setMainGoal] = useState(client.roadmap_main_goal || '');
    const [commitmentScore, setCommitmentScore] = useState(client.roadmap_commitment_score || 0);
    const [milestones, setMilestones] = useState<SuccessMilestone[]>(client.roadmap_data?.milestones || []);
    const [dreamResult, setDreamResult] = useState(client.roadmap_data?.dream_result || { goal: '', perfect_day: '' });
    const [obstacleSolutions, setObstacleSolutions] = useState<RoadmapObstacleSolutions>(client.roadmap_data?.obstacle_solutions || {});
    const [coachAgreement, setCoachAgreement] = useState(client.roadmap_data?.coach_agreements?.client_response || '');
    const [commitment, setCommitment] = useState<RoadmapCommitment>(client.roadmap_data?.commitment || {});

    // Anamnesis Editable Goals
    const [anamnesisMotivation, setAnamnesisMotivation] = useState(client.goals?.motivation || '');
    const [anamnesis1Year, setAnamnesis1Year] = useState(client.goals?.goal_1_year || '');
    const [anamnesis6Months, setAnamnesis6Months] = useState(client.goals?.goal_6_months || '');
    const [anamnesis3Months, setAnamnesis3Months] = useState(client.goals?.goal_3_months || '');

    // Metrics (Synced with client)
    const [weightActual, setWeightActual] = useState(client.current_weight || 0);
    const [weightTarget, setWeightTarget] = useState(client.target_weight || 0);
    const isDiabetic = client.medical?.diabetesType === 'Type 2';

    const handleSave = async () => {
        setLoading(true);
        try {
            const roadmapData: RoadmapData = {
                milestones,
                dream_result: dreamResult,
                obstacle_solutions: obstacleSolutions,
                coach_agreements: { client_response: coachAgreement },
                commitment: {
                    ...commitment,
                    fecha_compromiso: commitment.fecha_compromiso || new Date().toISOString().split('T')[0]
                },
                adjusted_goals: {
                    goal_3_months: anamnesis3Months,
                    goal_3_months_status: client.goals?.goal_3_months_status || 'pending',
                    goal_6_months: anamnesis6Months,
                    goal_6_months_status: client.goals?.goal_6_months_status || 'pending',
                    goal_1_year: anamnesis1Year,
                    goal_1_year_status: client.goals?.goal_1_year_status || 'pending',
                    adjusted_at: new Date().toISOString(),
                    original_from_anamnesis: {
                        goal_3_months: client.goals?.goal_3_months || '',
                        goal_6_months: client.goals?.goal_6_months || '',
                        goal_1_year: client.goals?.goal_1_year || '',
                    },
                },
                last_updated: new Date().toISOString()
            };

            const { error } = await supabase
                .from('clientes_pt_notion')
                .update({
                    roadmap_main_goal: dreamResult.goal || mainGoal,
                    roadmap_commitment_score: commitmentScore,
                    roadmap_data: roadmapData,
                    current_weight: weightActual,
                    target_weight: weightTarget,
                    property_motivo_contrataci_n: anamnesisMotivation,
                    property_1_a_o: anamnesis1Year,
                    property_6_meses: anamnesis6Months,
                    property_3_meses: anamnesis3Months
                })
                .eq('id', client.id);

            if (error) throw error;

            toast.success('Camino al éxito actualizado correctamente');
            if (onUpdate) onUpdate({
                ...client,
                roadmap_main_goal: dreamResult.goal || mainGoal,
                roadmap_commitment_score: commitmentScore,
                roadmap_data: roadmapData,
                current_weight: weightActual,
                target_weight: weightTarget,
                goals: {
                    ...(client.goals || {}),
                    motivation: anamnesisMotivation,
                    goal_1_year: anamnesis1Year,
                    goal_6_months: anamnesis6Months,
                    goal_3_months: anamnesis3Months
                }
            });
        } catch (error: any) {
            toast.error('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // keyboard shortcut for ESC to exit presentation mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsPresentationMode(false);
            if (e.altKey && e.key === 'p') setIsPresentationMode(prev => !prev);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handlePrint = () => {
        const weightToLose = weightActual - weightTarget;
        const logoUrl = "https://i.postimg.cc/h4m6qRgP/Logo-Academia-Diabetes.jpg";

        const printContent = `
<html><head><title>Plan de Éxito - ${client.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Outfit', sans-serif; margin: 0; padding: 40px; color: #1e293b; background: #f8fafc; }
        .page { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 4px solid #0ea5e9; padding-bottom: 20px; }
        .header img { max-height: 80px; margin-bottom: 15px; }
        h1 { color: #0369a1; font-size: 28pt; margin: 0; font-weight: 700; }
        h2 { color: #0ea5e9; font-size: 18pt; margin-top: 35px; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
        .section { margin-bottom: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 25px 0; }
        .metric-box { background: #f0f9ff; padding: 20px; border-radius: 15px; text-align: center; border: 1px solid #bae6fd; }
        .metric-value { font-size: 22pt; font-weight: 700; color: #0369a1; display: block; }
        .metric-label { font-size: 9pt; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
        .response-box { background: #fff; border: 2px dashed #e2e8f0; padding: 20px; border-radius: 12px; font-style: italic; color: #334155; line-height: 1.6; }
        .highlight-box { background: #0369a1; color: white; padding: 25px; border-radius: 20px; margin: 30px 0; }
        .footer { text-align: center; margin-top: 60px; font-size: 10pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        ul { list-style: none; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        li { background: #f8fafc; padding: 12px 20px; border-radius: 10px; border-left: 4px solid #0ea5e9; font-weight: 600; }
        @media print {
            body { background: white; padding: 0; }
            .page { box-shadow: none; border-radius: 0; padding: 0; }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <img src="${logoUrl}" alt="Logo">
            <h1>TU CAMINO AL ÉXITO</h1>
            <p style="font-size: 14pt; color: #64748b;">Plan Estratégico para <strong>${client.name}</strong></p>
        </div>

        <div class="section">
            <div class="metric-grid">
                <div class="metric-box"><span class="metric-label">Peso Actual</span><span class="metric-value">${weightActual}kg</span></div>
                <div class="metric-box"><span class="metric-label">Peso Objetivo</span><span class="metric-value">${weightTarget}kg</span></div>
                <div class="metric-box"><span class="metric-label">Meta Total</span><span class="metric-value">-${weightToLose.toFixed(1)}kg</span></div>
            </div>
        </div>

        <div class="highlight-box">
            <h2 style="color: white; border: none; margin-top: 0;">🎯 El Resultado Soñado</h2>
            <p style="font-size: 16pt; line-height: 1.4; margin: 0;">"${dreamResult.goal}"</p>
        </div>

        <div class="section">
            <h2>💎 Los 4 Innegociables</h2>
            <ul>
                <li>Pesar la comida diariamente</li>
                <li>Cumplir los pasos: ${commitment.pasos || 10000}</li>
                <li>Entreno de fuerza: ${commitment.dias_ejercicio || 3} días/sem</li>
                <li>Reporte diario por Telegram</li>
            </ul>
        </div>

        <div class="section">
            <h2>⚡ Acuerdos de Acción</h2>
            <p><strong>Si me desconecto, mi coach actuará así:</strong></p>
            <div class="response-box">${coachAgreement || 'Apoyo incondicional y recordatorio de mis objetivos.'}</div>
        </div>

        <div class="footer">
            <p>Este es un compromiso mutuo. Juntos lo lograremos.</p>
            <p><strong>Padron Trainer</strong> • ${new Date().toLocaleDateString()}</p>
        </div>
    </div>
</body></html>
`;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(printContent);
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); }, 1000);
        }
    };

    const nextStep = () => setStep(s => Math.min(s + 1, 9));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    return (
        <div className={`rounded-xl shadow-2xl border transition-all duration-500 flex flex-col ${isPresentationMode
            ? 'fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-xl border-none rounded-none overflow-hidden'
            : 'bg-white border-slate-200 overflow-hidden min-h-[600px]'
            }`}>
            {/* Header / Wizard Progress */}
            <div className={`p-6 text-white no-print transition-all duration-700 ${isPresentationMode
                ? 'bg-transparent border-b border-white/10'
                : 'bg-gradient-to-br from-slate-900 to-indigo-950 border-b border-indigo-900/50'
                }`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl scale-125 transition-all ${isPresentationMode ? 'bg-indigo-500' : 'bg-indigo-500/20 border border-indigo-400/30'}`}>
                            <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
                        </div>
                        <div>
                            <h2 className={`text-2xl font-bold tracking-tight ${isPresentationMode ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300'}`}>Tu Camino al Éxito</h2>
                            <p className="text-indigo-200/60 text-xs font-semibold uppercase tracking-widest">Master Strategy Plan • {client.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsPresentationMode(!isPresentationMode)}
                            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-bold ${isPresentationMode
                                ? 'bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 border border-rose-500/50'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                        >
                            {isPresentationMode ? <Minimize size={18} /> : <Maximize size={18} />}
                            <span>{isPresentationMode ? 'Salir Modo Pro' : 'Modo Presentación'}</span>
                        </button>
                        {!isPresentationMode && (
                            <>
                                <button
                                    onClick={handlePrint}
                                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
                                >
                                    <Printer size={18} />
                                    <span>Imprimir</span>
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-xl flex items-center gap-2 font-bold shadow-lg disabled:opacity-50 transition-all transform hover:scale-105"
                                >
                                    {loading ? <RotateCcw className="animate-spin" size={18} /> : <Save size={18} />}
                                    Guardar
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="flex justify-between items-center px-4 mt-2 mb-4">
                    {[
                        { n: 1, label: 'Inicio' },
                        { n: 2, label: 'Resultado' },
                        { n: 3, label: 'Expectativas' },
                        { n: 4, label: 'Fases' },
                        { n: 5, label: 'Obstáculos' },
                        { n: 6, label: 'Acuerdos' },
                        { n: 7, label: 'Plan Acción' },
                        { n: 8, label: 'Compromiso' },
                        { n: 9, label: 'Resumen' }
                    ].map((s) => (
                        <div key={s.n} className="flex flex-col items-center gap-2 flex-1">
                            <div
                                onClick={() => setStep(s.n)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all border-2 relative
                                ${step === s.n ? 'bg-indigo-500 text-white border-indigo-400 font-bold scale-110 shadow-[0_0_20px_rgba(99,102,241,0.4)]' :
                                        step > s.n ? 'bg-indigo-900/50 text-indigo-300 border-indigo-700' : 'bg-transparent text-slate-500 border-slate-700'}`}
                            >
                                {step > s.n ? <CheckCircle2 size={24} /> : s.n}
                                {step === s.n && (
                                    <div className="absolute -top-1 -right-1">
                                        <div className="w-3 h-3 bg-rose-500 rounded-full animate-ping" />
                                        <div className="absolute inset-0 w-3 h-3 bg-rose-500 rounded-full" />
                                    </div>
                                )}
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider text-center px-1 leading-tight ${step === s.n ? 'text-indigo-400' : 'text-slate-500'}`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content Area */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-500 ${isPresentationMode ? 'bg-transparent' : 'bg-white'}`}>
                <div className={`max-w-5xl mx-auto p-10 min-h-full ${isPresentationMode ? 'flex flex-col justify-center py-20' : ''}`}>
                    {step === 1 && (
                        <div className="space-y-10 animate-in fade-in zoom-in duration-500">
                            <div className="text-center space-y-4">
                                <h3 className={`text-4xl font-extrabold tracking-tight ${isPresentationMode ? 'text-white' : 'text-slate-800'}`}>Paso 1: Tu Punto de Partida</h3>
                                <p className={isPresentationMode ? 'text-sky-200/70 text-lg' : 'text-slate-500 italic'}>Analicemos dónde estamos y hacia dónde vamos.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className={`p-8 rounded-2xl border transition-all ${isPresentationMode ? 'bg-white/5 border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-100'}`}>
                                    <label className={`flex items-center gap-2 font-bold mb-4 ${isPresentationMode ? 'text-sky-300' : 'text-slate-700'}`}>
                                        <Scale className="text-sky-500" /> Peso Actual (kg)
                                    </label>
                                    <input
                                        type="number"
                                        value={weightActual}
                                        onChange={(e) => setWeightActual(parseFloat(e.target.value))}
                                        className={`w-full text-2xl font-bold p-4 rounded-xl focus:ring-4 outline-none ${isPresentationMode ? 'bg-white/10 border-white/20 text-white focus:ring-sky-500/40' : 'bg-white border-slate-200 text-sky-600 focus:ring-sky-500/20'}`}
                                    />
                                </div>
                                <div className={`p-8 rounded-2xl border transition-all ${isPresentationMode ? 'bg-white/5 border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-100'}`}>
                                    <label className={`flex items-center gap-2 font-bold mb-4 ${isPresentationMode ? 'text-green-300' : 'text-slate-700'}`}>
                                        <Target className="text-green-500" /> Peso Objetivo (kg)
                                    </label>
                                    <input
                                        type="number"
                                        value={weightTarget}
                                        onChange={(e) => setWeightTarget(parseFloat(e.target.value))}
                                        className={`w-full text-2xl font-bold p-4 rounded-xl focus:ring-4 outline-none ${isPresentationMode ? 'bg-white/10 border-white/20 text-white focus:ring-green-500/40' : 'bg-white border-slate-200 text-green-600 focus:ring-green-500/20'}`}
                                    />
                                </div>
                            </div>
                            <div className={`p-6 rounded-2xl border flex items-start gap-4 transition-all ${isPresentationMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                                <AlertTriangle className="text-amber-500 w-12 h-12 flex-shrink-0" />
                                <div>
                                    <h4 className={`font-bold text-lg ${isPresentationMode ? 'text-amber-300' : 'text-amber-800'}`}>Análisis de Hoja de Ruta</h4>
                                    <p className={isPresentationMode ? 'text-amber-200/80' : 'text-amber-700'}>Debemos perder un total de <strong>{(weightActual - weightTarget).toFixed(1)} kg</strong>.</p>
                                    {isDiabetic && <p className={`font-medium text-sm mt-1 ${isPresentationMode ? 'text-amber-400' : 'text-amber-600'}`}>⚠️ Diagnóstico de Diabetes detectado: El objetivo de remisión requiere llegar a la Fase 3.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center">
                                <h3 className={`text-4xl font-extrabold tracking-tight ${isPresentationMode ? 'text-white' : 'text-slate-800'}`}>Paso 2: Tu Resultado Soñado</h3>
                                <p className={isPresentationMode ? 'text-sky-200/70 text-lg' : 'text-slate-500 italic'}>Visualiza el éxito para materializarlo.</p>
                            </div>

                            {/* Contexto del Cliente de la Anamnesis */}
                            {client.goals && (
                                <div className={`p-6 rounded-2xl border mb-6 transition-all ${isPresentationMode ? 'bg-sky-900/40 border-sky-700/50 backdrop-blur-md' : 'bg-sky-50 border-sky-100'}`}>
                                    <h4 className={`font-bold mb-3 flex items-center gap-2 ${isPresentationMode ? 'text-sky-300' : 'text-sky-800'}`}>
                                        <Target className="w-5 h-5 text-sky-500" />
                                        Contexto Original (Anamnesis)
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className={`block font-semibold mb-2 ${isPresentationMode ? 'text-sky-200' : 'text-sky-700'}`}>Motivación Principal:</span>
                                            {isPresentationMode ? (
                                                <p className="text-sky-100/80">{anamnesisMotivation || 'No especificada'}</p>
                                            ) : (
                                                <textarea
                                                    value={anamnesisMotivation}
                                                    onChange={(e) => setAnamnesisMotivation(e.target.value)}
                                                    className="w-full p-3 rounded-lg border border-sky-200 focus:ring-2 focus:ring-sky-400 outline-none text-slate-700 bg-white"
                                                    rows={3}
                                                    placeholder="Motivación..."
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <span className={`block font-semibold mb-2 ${isPresentationMode ? 'text-sky-200' : 'text-sky-700'}`}>Objetivo a 1 Año:</span>
                                            {isPresentationMode ? (
                                                <p className="text-sky-100/80">{anamnesis1Year || 'No especificado'}</p>
                                            ) : (
                                                <textarea
                                                    value={anamnesis1Year}
                                                    onChange={(e) => setAnamnesis1Year(e.target.value)}
                                                    className="w-full p-3 rounded-lg border border-sky-200 focus:ring-2 focus:ring-sky-400 outline-none text-slate-700 bg-white"
                                                    rows={3}
                                                    placeholder="Objetivo a 1 año..."
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className={`p-8 rounded-2xl border transition-all ${isPresentationMode ? 'bg-yellow-500/10 border-yellow-500/20 backdrop-blur-md' : 'bg-yellow-50 border-yellow-200'}`}>
                                    <label className={`block text-xl font-bold mb-4 ${isPresentationMode ? 'text-yellow-300' : 'text-yellow-700'}`}>Tu Resultado Soñado</label>
                                    <textarea
                                        value={dreamResult.goal}
                                        onChange={(e) => setDreamResult({ ...dreamResult, goal: e.target.value })}
                                        placeholder="Ej: Revertir mi diabetes tipo 2, perder 20 kilos, tener energía para jugar con mis nietos..."
                                        rows={4}
                                        className={`w-full p-6 rounded-xl focus:ring-4 outline-none transition-all ${isPresentationMode ? 'bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:ring-yellow-500/40' : 'bg-white border-yellow-200 text-slate-700 focus:ring-yellow-500'}`}
                                    />
                                </div>
                                <div className={`p-8 rounded-2xl border transition-all ${isPresentationMode ? 'bg-emerald-500/10 border-emerald-500/20 backdrop-blur-md' : 'bg-emerald-50 border-emerald-200'}`}>
                                    <label className={`block text-xl font-bold mb-4 ${isPresentationMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Describe un Día Perfecto</label>
                                    <textarea
                                        value={dreamResult.perfect_day}
                                        onChange={(e) => setDreamResult({ ...dreamResult, perfect_day: e.target.value })}
                                        placeholder="Imagina que ya lo has logrado... ¿Qué haces, cómo te sientes?"
                                        rows={4}
                                        className={`w-full p-6 rounded-xl focus:ring-4 outline-none transition-all ${isPresentationMode ? 'bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:ring-emerald-500/40' : 'bg-white border-emerald-200 text-slate-700 focus:ring-emerald-500'}`}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                            <h3 className={`text-4xl font-extrabold tracking-tight ${isPresentationMode ? 'text-white' : 'text-slate-800'}`}>Paso 3: Expectativa vs. Realidad</h3>
                            <p className={`max-w-2xl mx-auto ${isPresentationMode ? 'text-sky-200/70 text-lg' : 'text-slate-600'}`}>Es vital entender que el camino no es lineal. Las fluctuaciones son normales y parte necesaria del proceso.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className={`p-6 rounded-2xl border transition-all ${isPresentationMode ? 'bg-white/5 border-white/10 backdrop-blur-md shadow-2xl' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <h4 className={`font-bold mb-4 uppercase tracking-wider ${isPresentationMode ? 'text-sky-300' : 'text-sky-600'}`}>Expectativa Lineal</h4>
                                    <img src="https://i.postimg.cc/qRwYMzhp/TU-CAMINO-AL-XITO-page-0002.jpg" alt="Lineal" className="rounded-xl w-full" />
                                </div>
                                <div className={`p-6 rounded-2xl border transition-all ${isPresentationMode ? 'bg-indigo-500/10 border-indigo-400/30 backdrop-blur-md shadow-2xl ring-4 ring-indigo-500/20' : 'bg-white border-sky-300 shadow-md ring-4 ring-sky-50'}`}>
                                    <h4 className={`font-bold mb-4 uppercase tracking-wider ${isPresentationMode ? 'text-indigo-300' : 'text-indigo-600'}`}>Realidad Ondulada</h4>
                                    <img src="https://i.postimg.cc/5N6Gb9xM/TU-CAMINO-AL-XITO-page-0003.jpg" alt="Realidad" className="rounded-xl w-full" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (() => {
                        const phaseInfo = getCurrentProgramPhase(client.start_date);
                        return (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                            <h3 className={`text-4xl font-extrabold tracking-tight ${isPresentationMode ? 'text-white' : 'text-slate-800'}`}>Paso 4: Las 4 Fases de Transformación</h3>
                            <p className={`text-sm ${isPresentationMode ? 'text-indigo-300/70' : 'text-slate-500'}`}>Tu camino paso a paso hacia el objetivo final</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                                {PROGRAM_PHASES.map((phase, i) => {
                                    const isCurrentPhase = phaseInfo.phaseIndex === i;
                                    const isPast = i < phaseInfo.phaseIndex;
                                    const PhaseIcon = PHASE_ICONS[i];
                                    const colors = PHASE_COLORS[i];
                                    return (
                                        <div key={i} className={`relative overflow-hidden rounded-2xl border-2 p-6 transition-all ${
                                            isPresentationMode
                                                ? `${colors.bgDark} ${isCurrentPhase ? colors.borderDark + ' shadow-lg shadow-white/5' : 'border-white/10'}`
                                                : `${isCurrentPhase ? colors.bg + ' ' + colors.border + ' shadow-lg ring-2 ring-offset-2 ring-' + colors.accent.replace('bg-', '') : isPast ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200'}`
                                        }`}>
                                            {isCurrentPhase && (
                                                <div className={`absolute top-3 right-3 px-2.5 py-1 ${colors.accent} text-white text-[10px] font-bold rounded-full uppercase tracking-wider`}>
                                                    Fase Actual
                                                </div>
                                            )}
                                            {isPast && (
                                                <div className="absolute top-3 right-3 px-2.5 py-1 bg-slate-400 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                                                    Completada
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white shadow-md`}>
                                                    <PhaseIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h5 className={`font-bold ${isPresentationMode ? colors.textDark : colors.text}`}>{phase.name}</h5>
                                                    <p className={`text-xs ${isPresentationMode ? 'text-slate-400' : 'text-slate-500'}`}>{phase.subtitle} — {phase.duration}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Scale className={`w-4 h-4 ${isPresentationMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                                    <span className={`font-semibold ${isPresentationMode ? 'text-slate-200' : 'text-slate-700'}`}>{phase.weightTarget}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Activity className={`w-4 h-4 ${isPresentationMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                                    <span className={`font-semibold ${isPresentationMode ? 'text-slate-200' : 'text-slate-700'}`}>{phase.hba1cTarget}</span>
                                                </div>
                                                {phase.otherGoals.map((goal, j) => (
                                                    <div key={j} className="flex items-center gap-2">
                                                        <CheckCircle2 className={`w-3.5 h-3.5 ${isPresentationMode ? 'text-slate-600' : 'text-slate-300'}`} />
                                                        <span className={`text-xs ${isPresentationMode ? 'text-slate-400' : 'text-slate-600'}`}>{goal}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        );
                    })()}

                    {step === 5 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center">
                                <h3 className={`text-4xl font-extrabold tracking-tight ${isPresentationMode ? 'text-white' : 'text-slate-800'}`}>Paso 5: Plan de Acción ante Obstáculos</h3>
                                <p className="text-rose-500 font-bold uppercase tracking-widest text-sm">Ahora viene lo bueno</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className={`p-8 rounded-2xl border transition-all ${isPresentationMode ? 'bg-white/5 border-white/10 backdrop-blur-md shadow-xl' : 'bg-slate-50 border-slate-200'}`}>
                                    <label className={`flex items-center gap-2 font-bold mb-4 ${isPresentationMode ? 'text-indigo-300' : 'text-slate-700'}`}><Dumbbell className="text-indigo-500" /> Si no puedes entrenar...</label>
                                    <textarea
                                        value={obstacleSolutions.no_entrenamiento}
                                        onChange={(e) => setObstacleSolutions({ ...obstacleSolutions, no_entrenamiento: e.target.value })}
                                        className={`w-full p-4 rounded-xl focus:ring-4 outline-none transition-all ${isPresentationMode ? 'bg-white/10 border-white/10 text-white focus:ring-indigo-500/40' : 'bg-white border-slate-200 text-slate-700 focus:ring-indigo-500'}`}
                                        placeholder="¿Cuál es tu plan B?"
                                    />
                                </div>
                                <div className={`p-8 rounded-2xl border transition-all ${isPresentationMode ? 'bg-white/5 border-white/10 backdrop-blur-md shadow-xl' : 'bg-slate-50 border-slate-200'}`}>
                                    <label className={`flex items-center gap-2 font-bold mb-4 ${isPresentationMode ? 'text-sky-300' : 'text-slate-700'}`}><Footprints className="text-sky-500" /> Si no llegas a los pasos...</label>
                                    <textarea
                                        value={obstacleSolutions.no_pasos}
                                        onChange={(e) => setObstacleSolutions({ ...obstacleSolutions, no_pasos: e.target.value })}
                                        className={`w-full p-4 rounded-xl focus:ring-4 outline-none transition-all ${isPresentationMode ? 'bg-white/10 border-white/10 text-white focus:ring-sky-500/40' : 'bg-white border-slate-200 text-slate-700 focus:ring-sky-500'}`}
                                        placeholder="¿Cómo compensarás?"
                                    />
                                </div>
                                <div className={`p-8 rounded-2xl border transition-all ${isPresentationMode ? 'bg-white/5 border-white/10 backdrop-blur-md shadow-xl' : 'bg-slate-50 border-slate-200'}`}>
                                    <label className={`flex items-center gap-2 font-bold mb-4 ${isPresentationMode ? 'text-green-300' : 'text-slate-700'}`}><Utensils className="text-green-500" /> Si fallas en la comida...</label>
                                    <textarea
                                        value={obstacleSolutions.no_comidas}
                                        onChange={(e) => setObstacleSolutions({ ...obstacleSolutions, no_comidas: e.target.value })}
                                        className={`w-full p-4 rounded-xl focus:ring-4 outline-none transition-all ${isPresentationMode ? 'bg-white/10 border-white/10 text-white focus:ring-green-500/40' : 'bg-white border-slate-200 text-slate-700 focus:ring-green-500'}`}
                                        placeholder="¿Qué harás la siguiente?"
                                    />
                                </div>
                                <div className={`p-8 rounded-2xl border transition-all ${isPresentationMode ? 'bg-white/5 border-white/10 backdrop-blur-md shadow-xl' : 'bg-slate-50 border-slate-200'}`}>
                                    <label className={`flex items-center gap-2 font-bold mb-4 ${isPresentationMode ? 'text-rose-300' : 'text-slate-700'}`}><Heart className="text-rose-500" /> Si te desmotivas...</label>
                                    <textarea
                                        value={obstacleSolutions.desmotivacion_general}
                                        onChange={(e) => setObstacleSolutions({ ...obstacleSolutions, desmotivacion_general: e.target.value })}
                                        className={`w-full p-4 rounded-xl focus:ring-4 outline-none transition-all ${isPresentationMode ? 'bg-white/10 border-white/10 text-white focus:ring-rose-500/40' : 'bg-white border-slate-200 text-slate-700 focus:ring-rose-500'}`}
                                        placeholder="¿A quién llamarás?"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center">
                                <h3 className={`text-4xl font-extrabold tracking-tight ${isPresentationMode ? 'text-white' : 'text-slate-800'}`}>Paso 6: Acuerdo con el Coach</h3>
                                <p className={isPresentationMode ? 'text-sky-200/70 text-lg' : 'text-slate-500 italic'}>"Estoy aquí para ayudarte a lograr tu objetivo."</p>
                            </div>
                            <div className={`p-8 rounded-3xl shadow-xl space-y-6 transition-all border ${isPresentationMode ? 'bg-white/5 border-white/10 backdrop-blur-md' : 'bg-indigo-50 border-indigo-200 shadow-sm'}`}>
                                <h4 className={`text-2xl font-bold ${isPresentationMode ? 'text-indigo-300' : 'text-indigo-800'}`}>Si te desconectas del programa, ¿cómo quieres que yo actúe?</h4>
                                <textarea
                                    value={coachAgreement}
                                    onChange={(e) => setCoachAgreement(e.target.value)}
                                    placeholder="Dime exactamente qué tipo de 'tirones de orejas' o apoyo necesitas de mi parte..."
                                    rows={6}
                                    className={`w-full p-8 text-xl rounded-2xl focus:ring-4 outline-none transition-all ${isPresentationMode ? 'bg-white/10 border-white/10 text-white placeholder:text-white/20 focus:ring-indigo-500/40' : 'bg-white border-indigo-100 text-slate-700 focus:ring-indigo-500 shadow-inner'}`}
                                />
                            </div>
                        </div>
                    )}

                    {step === 7 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center">
                                <h3 className={`text-4xl font-extrabold tracking-tight ${isPresentationMode ? 'text-white' : 'text-slate-800'}`}>Paso 7: Los 4 Innegociables</h3>
                                <p className={isPresentationMode ? 'text-sky-200/70 text-lg' : 'text-slate-500'}>Estos puntos son la base de la transformación. Sin ellos, no hay camino.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className={`p-8 rounded-2xl border flex flex-col items-center text-center transition-all ${isPresentationMode ? 'bg-sky-500/10 border-sky-400/20 backdrop-blur-md' : 'bg-sky-50 border-sky-200 shadow-sm'}`}>
                                    <div className={`p-5 rounded-full mb-4 shadow-lg ${isPresentationMode ? 'bg-sky-500/20 text-sky-300' : 'bg-white text-sky-600'}`}><Scale size={40} /></div>
                                    <h4 className={`text-xl font-bold mb-2 ${isPresentationMode ? 'text-sky-200' : 'text-sky-800'}`}>Pesar la Comida</h4>
                                    <p className={isPresentationMode ? 'text-sky-100/60 text-sm' : 'text-sky-600 text-sm'}>Controlar porciones es fundamental para tener datos precisos.</p>
                                </div>
                                <div className={`p-8 rounded-2xl border flex flex-col items-center text-center transition-all ${isPresentationMode ? 'bg-indigo-500/10 border-indigo-400/20 backdrop-blur-md' : 'bg-indigo-50 border-indigo-200 shadow-sm'}`}>
                                    <div className={`p-5 rounded-full mb-4 shadow-lg ${isPresentationMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white text-indigo-600'}`}><Footprints size={40} /></div>
                                    <h4 className={`text-xl font-bold mb-2 ${isPresentationMode ? 'text-indigo-200' : 'text-indigo-800'}`}>Pasos Diarios</h4>
                                    <p className={isPresentationMode ? 'text-indigo-100/60 text-sm' : 'text-indigo-600 text-sm'}>Mantenerte activo metabólicamente fuera del entrenamiento.</p>
                                </div>
                                <div className={`p-8 rounded-2xl border flex flex-col items-center text-center transition-all ${isPresentationMode ? 'bg-emerald-500/10 border-emerald-400/20 backdrop-blur-md' : 'bg-emerald-50 border-emerald-200 shadow-sm'}`}>
                                    <div className={`p-5 rounded-full mb-4 shadow-lg ${isPresentationMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white text-emerald-600'}`}><Dumbbell size={40} /></div>
                                    <h4 className={`text-xl font-bold mb-2 ${isPresentationMode ? 'text-emerald-200' : 'text-emerald-800'}`}>Entreno Fuerza</h4>
                                    <p className={isPresentationMode ? 'text-emerald-100/60 text-sm' : 'text-emerald-600 text-sm'}>Clave para mejorar la sensibilidad a la insulina y metabolismo.</p>
                                </div>
                                <div className={`p-8 rounded-2xl border flex flex-col items-center text-center transition-all ${isPresentationMode ? 'bg-amber-500/10 border-amber-400/20 backdrop-blur-md' : 'bg-amber-50 border-amber-200 shadow-sm'}`}>
                                    <div className={`p-5 rounded-full mb-4 shadow-lg ${isPresentationMode ? 'bg-amber-500/20 text-amber-300' : 'bg-white text-amber-600'}`}><Send size={40} /></div>
                                    <h4 className={`text-xl font-bold mb-2 ${isPresentationMode ? 'text-amber-200' : 'text-amber-800'}`}>Reporte Diario</h4>
                                    <p className={isPresentationMode ? 'text-amber-100/60 text-sm' : 'text-amber-600 text-sm'}>Comunicación constante para ajustar el plan en tiempo real.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 8 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center">
                                <h3 className={`text-4xl font-extrabold tracking-tight ${isPresentationMode ? 'text-white' : 'text-slate-800'}`}>Paso 8: Mi Compromiso Visual</h3>
                                <p className={isPresentationMode ? 'text-sky-200/70 text-lg' : 'text-slate-500'}>Formaliza tu contrato contigo mismo.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className={`p-8 rounded-2xl border transition-all ${isPresentationMode ? 'bg-white/5 border-white/10 backdrop-blur-md shadow-xl' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
                                    <label className={`flex items-center gap-2 font-bold ${isPresentationMode ? 'text-sky-300' : 'text-slate-700'}`}><Footprints /> Pasos Mínimos</label>
                                    <input
                                        type="number"
                                        value={commitment.pasos}
                                        onChange={(e) => setCommitment({ ...commitment, pasos: parseInt(e.target.value) })}
                                        className={`w-full text-2xl font-bold p-4 rounded-xl focus:ring-4 outline-none transition-all ${isPresentationMode ? 'bg-white/10 border-white/10 text-white focus:ring-sky-500/40' : 'bg-white border-slate-200 text-slate-800 focus:ring-sky-500'}`}
                                        placeholder="10000"
                                    />
                                </div>
                                <div className={`p-8 rounded-2xl border transition-all ${isPresentationMode ? 'bg-white/5 border-white/10 backdrop-blur-md shadow-xl' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
                                    <label className={`flex items-center gap-2 font-bold ${isPresentationMode ? 'text-indigo-300' : 'text-slate-700'}`}><Dumbbell /> Días de Fuerza</label>
                                    <input
                                        type="number"
                                        value={commitment.dias_ejercicio}
                                        onChange={(e) => setCommitment({ ...commitment, dias_ejercicio: parseInt(e.target.value) })}
                                        className={`w-full text-2xl font-bold p-4 rounded-xl focus:ring-4 outline-none transition-all ${isPresentationMode ? 'bg-white/10 border-white/10 text-white focus:ring-indigo-500/40' : 'bg-white border-slate-200 text-slate-800 focus:ring-indigo-500'}`}
                                        placeholder="3"
                                    />
                                </div>
                                <div className={`md:col-span-2 p-8 rounded-2xl border transition-all ${isPresentationMode ? 'bg-white/5 border-white/10 backdrop-blur-md shadow-xl' : 'bg-white border-slate-200 shadow-sm'} grid grid-cols-1 sm:grid-cols-3 gap-6`}>
                                    <div className="space-y-2">
                                        <label className={`text-sm font-bold italic ${isPresentationMode ? 'text-white/60' : 'text-slate-600'}`}>Días de la semana</label>
                                        <input
                                            type="text"
                                            value={commitment.horario_ejercicio_dias}
                                            onChange={(e) => setCommitment({ ...commitment, horario_ejercicio_dias: e.target.value })}
                                            placeholder="L, X, V"
                                            className={`w-full p-4 rounded-xl border focus:ring-4 outline-none transition-all ${isPresentationMode ? 'bg-white/10 border-white/10 text-white focus:ring-sky-500/40' : 'bg-white border-slate-200 text-slate-800 focus:ring-sky-500'}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`text-sm font-bold italic ${isPresentationMode ? 'text-white/60' : 'text-slate-600'}`}>De (Hora)</label>
                                        <input
                                            type="time"
                                            value={commitment.horario_ejercicio_desde}
                                            onChange={(e) => setCommitment({ ...commitment, horario_ejercicio_desde: e.target.value })}
                                            className={`w-full p-4 rounded-xl border focus:ring-4 outline-none transition-all h-[56px] ${isPresentationMode ? 'bg-white/10 border-white/10 text-white focus:ring-sky-500/40 invert brightness-100' : 'bg-white border-slate-200 text-slate-800 focus:ring-sky-500'}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`text-sm font-bold italic ${isPresentationMode ? 'text-white/60' : 'text-slate-600'}`}>A (Hora)</label>
                                        <input
                                            type="time"
                                            value={commitment.horario_ejercicio_hasta}
                                            onChange={(e) => setCommitment({ ...commitment, horario_ejercicio_hasta: e.target.value })}
                                            className={`w-full p-4 rounded-xl border focus:ring-4 outline-none transition-all h-[56px] ${isPresentationMode ? 'bg-white/10 border-white/10 text-white focus:ring-sky-500/40 invert brightness-100' : 'bg-white border-slate-200 text-slate-800 focus:ring-sky-500'}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Milestones Integrated into Compromiso */}
                            <div className="pt-10 border-t border-slate-100 mt-10 space-y-8">
                                <div className="text-center">
                                    <h3 className={`text-3xl font-extrabold tracking-tight ${isPresentationMode ? 'text-white' : 'text-slate-800'}`}>Hitos del Camino</h3>
                                    <p className={isPresentationMode ? 'text-sky-200/70' : 'text-slate-500'}>Trazaremos hitos específicos para el seguimiento.</p>
                                </div>

                                {client.goals && (
                                    <div className={`p-6 rounded-2xl border mb-6 transition-all ${isPresentationMode ? 'bg-indigo-900/40 border-indigo-700/50' : 'bg-indigo-50 border-indigo-100'}`}>
                                        <h4 className={`font-bold mb-4 flex items-center gap-2 ${isPresentationMode ? 'text-indigo-300' : 'text-indigo-800'}`}>
                                            <Calendar className="w-5 h-5 text-indigo-500" />
                                            Metas Originales (Anamnesis)
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className={`block font-semibold mb-2 ${isPresentationMode ? 'text-indigo-200' : 'text-indigo-700'}`}>3 Meses:</span>
                                                {isPresentationMode ? (
                                                    <p className="text-indigo-100/80">{anamnesis3Months || 'No especificado'}</p>
                                                ) : (
                                                    <textarea
                                                        value={anamnesis3Months}
                                                        onChange={(e) => setAnamnesis3Months(e.target.value)}
                                                        className="w-full p-3 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none text-slate-700 bg-white"
                                                        rows={3}
                                                        placeholder="Meta a 3 meses..."
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <span className={`block font-semibold mb-2 ${isPresentationMode ? 'text-indigo-200' : 'text-indigo-700'}`}>6 Meses:</span>
                                                {isPresentationMode ? (
                                                    <p className="text-indigo-100/80">{anamnesis6Months || 'No especificado'}</p>
                                                ) : (
                                                    <textarea
                                                        value={anamnesis6Months}
                                                        onChange={(e) => setAnamnesis6Months(e.target.value)}
                                                        className="w-full p-3 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none text-slate-700 bg-white"
                                                        rows={3}
                                                        placeholder="Meta a 6 meses..."
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <span className={`block font-semibold mb-2 ${isPresentationMode ? 'text-indigo-200' : 'text-indigo-700'}`}>1 Año:</span>
                                                {isPresentationMode ? (
                                                    <p className="text-indigo-100/80">{anamnesis1Year || 'No especificado'}</p>
                                                ) : (
                                                    <textarea
                                                        value={anamnesis1Year}
                                                        onChange={(e) => setAnamnesis1Year(e.target.value)}
                                                        className="w-full p-3 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none text-slate-700 bg-white"
                                                        rows={3}
                                                        placeholder="Meta a 1 año..."
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <h4 className={`font-bold flex items-center gap-2 uppercase tracking-tight ${isPresentationMode ? 'text-sky-300' : 'text-slate-800'}`}>
                                            <MessageSquare className="text-sky-500" /> Planificación de Puntos de Control
                                        </h4>
                                        <button
                                            onClick={() => {
                                                const newM: SuccessMilestone = {
                                                    id: Math.random().toString(36).substr(2, 9),
                                                    title: '',
                                                    target_date: new Date().toISOString().split('T')[0],
                                                    status: 'pending'
                                                };
                                                setMilestones([...milestones, newM]);
                                            }}
                                            className={`p-3 rounded-full transition-all hover:scale-110 shadow-lg ${isPresentationMode ? 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/40' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'}`}
                                        >
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {milestones.map((m) => (
                                            <div key={m.id} className={`p-6 rounded-2xl border transition-all grid grid-cols-1 sm:grid-cols-12 gap-6 items-center shadow-md ${isPresentationMode ? 'bg-white/5 border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="sm:col-span-1 flex justify-center">
                                                    <button
                                                        onClick={() => {
                                                            const next = m.status === 'pending' ? 'current' : m.status === 'current' ? 'completed' : 'pending';
                                                            setMilestones(milestones.map(x => x.id === m.id ? { ...x, status: next } : x));
                                                        }}
                                                        className={`p-4 rounded-full transition-all shadow-md ${m.status === 'completed' ? 'bg-green-100 text-green-600' : m.status === 'current' ? 'bg-amber-100 text-amber-600 animate-pulse' : isPresentationMode ? 'bg-white/10 text-white/40' : 'bg-white'}`}
                                                    >
                                                        {m.status === 'completed' ? <CheckCircle2 size={24} /> : m.status === 'current' ? <Target size={24} /> : <Circle size={24} />}
                                                    </button>
                                                </div>
                                                <div className="sm:col-span-7">
                                                    <input
                                                        value={m.title}
                                                        onChange={(e) => setMilestones(milestones.map(x => x.id === m.id ? { ...x, title: e.target.value } : x))}
                                                        placeholder="Ej: Bajada de 5kg"
                                                        className={`w-full bg-transparent font-bold text-xl focus:ring-0 border-none outline-none ${isPresentationMode ? 'text-white placeholder:text-white/20' : 'text-slate-800'}`}
                                                    />
                                                </div>
                                                <div className="sm:col-span-3">
                                                    <input
                                                        type="date"
                                                        value={m.target_date}
                                                        onChange={(e) => setMilestones(milestones.map(x => x.id === m.id ? { ...x, target_date: e.target.value } : x))}
                                                        className={`w-full text-sm border-none bg-transparent rounded-lg p-2 focus:ring-2 focus:ring-sky-500/20 ${isPresentationMode ? 'text-white' : 'text-slate-600'}`}
                                                    />
                                                </div>
                                                <div className="sm:col-span-1 text-right">
                                                    <button onClick={() => setMilestones(milestones.filter(x => x.id !== m.id))} className={`transition-colors ${isPresentationMode ? 'text-red-400/40 hover:text-red-400' : 'text-red-300 hover:text-red-500'}`}><Trash2 size={20} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ============ STEP 9: Resumen de la Sesión ============ */}
                    {step === 9 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center">
                                <h3 className={`text-4xl font-extrabold tracking-tight ${isPresentationMode ? 'text-white' : 'text-slate-800'}`}>Resumen de la Sesión y Acuerdos</h3>
                                <p className={isPresentationMode ? 'text-sky-200/70 text-lg' : 'text-slate-500'}>Resumen de la Sesión para: <strong>{client.name || '(Cliente no definido)'}</strong></p>
                            </div>

                            {/* Summary: Hoja de Ruta Visual */}
                            <div className={`p-5 rounded-xl border-l-4 ${isPresentationMode ? 'bg-white/5 border-sky-400' : 'bg-sky-50 border-sky-400'}`}>
                                <h4 className={`font-bold mb-2 ${isPresentationMode ? 'text-sky-300' : 'text-sky-700'}`}>Tu Hoja de Ruta Visual y Análisis del Plan</h4>
                                {weightActual > 0 && weightTarget > 0 ? (
                                    <div className={`grid grid-cols-3 gap-4 text-center mb-3 ${isPresentationMode ? 'text-white/80' : 'text-slate-700'}`}>
                                        <div><span className="block text-2xl font-bold">{weightActual} kg</span><span className="text-xs uppercase text-slate-400">Peso Actual</span></div>
                                        <div><span className="block text-2xl font-bold">{weightTarget} kg</span><span className="text-xs uppercase text-slate-400">Peso Objetivo</span></div>
                                        <div><span className="block text-2xl font-bold text-sky-600">-{(weightActual - weightTarget).toFixed(1)} kg</span><span className="text-xs uppercase text-slate-400">Meta Total</span></div>
                                    </div>
                                ) : (
                                    <p className={`text-sm ${isPresentationMode ? 'text-white/50' : 'text-slate-400'}`}>Completa tus datos de peso y plan para ver el análisis de tu hoja de ruta.</p>
                                )}
                                <button onClick={() => setStep(1)} className="mt-2 px-4 py-1.5 bg-sky-500 text-white text-sm font-bold rounded-lg hover:bg-sky-600 transition-colors">Editar Métricas y Plan</button>
                            </div>

                            {/* Summary: Resultado Soñado */}
                            <div className={`p-5 rounded-xl border-l-4 ${isPresentationMode ? 'bg-white/5 border-amber-400' : 'bg-amber-50 border-amber-400'}`}>
                                <h4 className={`font-bold mb-2 ${isPresentationMode ? 'text-amber-300' : 'text-amber-700'}`}>Tu Resultado Soñado (Tu "Porqué")</h4>
                                {dreamResult.goal ? (
                                    <p className={`text-sm ${isPresentationMode ? 'text-white/80' : 'text-slate-700'}`}>{dreamResult.goal}</p>
                                ) : (
                                    <p className={`text-sm ${isPresentationMode ? 'text-white/50' : 'text-slate-400'}`}>No definido.</p>
                                )}
                                {dreamResult.perfect_day ? (
                                    <><p className={`text-sm font-medium mt-2 ${isPresentationMode ? 'text-amber-300/80' : 'text-amber-600'}`}>Un Día Perfecto en tu Vida:</p>
                                        <p className={`text-sm ${isPresentationMode ? 'text-white/80' : 'text-slate-700'}`}>{dreamResult.perfect_day}</p></>
                                ) : (
                                    <><p className={`text-sm font-medium mt-2 ${isPresentationMode ? 'text-amber-300/60' : 'text-amber-500'}`}>Un Día Perfecto en tu Vida:</p>
                                        <p className={`text-sm ${isPresentationMode ? 'text-white/50' : 'text-slate-400'}`}>No definido.</p></>
                                )}
                                <button onClick={() => setStep(2)} className="mt-2 px-4 py-1.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors">Editar Resultado</button>
                            </div>

                            {/* Summary: Plan de Acción ante Obstáculos */}
                            <div className={`p-5 rounded-xl border-l-4 ${isPresentationMode ? 'bg-white/5 border-rose-400' : 'bg-rose-50 border-rose-400'}`}>
                                <h4 className={`font-bold mb-2 ${isPresentationMode ? 'text-rose-300' : 'text-rose-700'}`}>Tu Plan de Acción ante Obstáculos</h4>
                                {Object.values(obstacleSolutions).some(v => typeof v === 'string' && v.trim()) ? (
                                    <div className={`text-sm space-y-1 ${isPresentationMode ? 'text-white/80' : 'text-slate-700'}`}>
                                        {obstacleSolutions.falta_tiempo && <p>• <strong>Falta de tiempo:</strong> {obstacleSolutions.falta_tiempo}</p>}
                                        {obstacleSolutions.falta_motivacion && <p>• <strong>Falta de motivación:</strong> {obstacleSolutions.falta_motivacion}</p>}
                                        {obstacleSolutions.eventos_sociales && <p>• <strong>Eventos sociales:</strong> {obstacleSolutions.eventos_sociales}</p>}
                                        {obstacleSolutions.ansiedad_comida && <p>• <strong>Ansiedad por comida:</strong> {obstacleSolutions.ansiedad_comida}</p>}
                                        {obstacleSolutions.lesiones && <p>• <strong>Lesiones:</strong> {obstacleSolutions.lesiones}</p>}
                                        {obstacleSolutions.viajes && <p>• <strong>Viajes:</strong> {obstacleSolutions.viajes}</p>}
                                    </div>
                                ) : (
                                    <p className={`text-sm ${isPresentationMode ? 'text-white/50' : 'text-slate-400'}`}>Aún no has definido tu plan de acción.</p>
                                )}
                                <button onClick={() => setStep(5)} className="mt-2 px-4 py-1.5 bg-rose-500 text-white text-sm font-bold rounded-lg hover:bg-rose-600 transition-colors">Editar Plan de Acción</button>
                            </div>

                            {/* Summary: Acuerdo con tu Coach */}
                            <div className={`p-5 rounded-xl border-l-4 ${isPresentationMode ? 'bg-white/5 border-purple-400' : 'bg-purple-50 border-purple-400'}`}>
                                <h4 className={`font-bold mb-2 ${isPresentationMode ? 'text-purple-300' : 'text-purple-700'}`}>Tu Acuerdo Clave con tu Coach</h4>
                                <p className={`text-sm mb-1 ${isPresentationMode ? 'text-white/60' : 'text-slate-500'}`}>Tu respuesta sobre cómo esperas el apoyo en momentos difíciles:</p>
                                {coachAgreement ? (
                                    <p className={`text-sm ${isPresentationMode ? 'text-white/80' : 'text-slate-700'}`}>{coachAgreement}</p>
                                ) : (
                                    <p className={`text-sm ${isPresentationMode ? 'text-white/50' : 'text-slate-400'}`}>Aún no has registrado un acuerdo.</p>
                                )}
                                <button onClick={() => setStep(6)} className="mt-2 px-4 py-1.5 bg-purple-500 text-white text-sm font-bold rounded-lg hover:bg-purple-600 transition-colors">Editar Acuerdo</button>
                            </div>

                            {/* Summary: Compromiso */}
                            <div className={`p-5 rounded-xl border-l-4 ${isPresentationMode ? 'bg-white/5 border-green-400' : 'bg-green-50 border-green-400'}`}>
                                <h4 className={`font-bold mb-2 ${isPresentationMode ? 'text-green-300' : 'text-green-700'}`}>Tu Compromiso</h4>
                                {(commitment.pasos || commitment.dias_ejercicio) ? (
                                    <div className={`text-sm space-y-1 ${isPresentationMode ? 'text-white/80' : 'text-slate-700'}`}>
                                        {commitment.pasos && <p>• <strong>Pasos diarios:</strong> {commitment.pasos}</p>}
                                        {commitment.dias_ejercicio && <p>• <strong>Días de ejercicio/sem:</strong> {commitment.dias_ejercicio}</p>}
                                        {commitment.horario_ejercicio_dias && <p>• <strong>Días:</strong> {commitment.horario_ejercicio_dias}</p>}
                                        {commitment.horario_ejercicio_desde && <p>• <strong>Horario:</strong> {commitment.horario_ejercicio_desde} - {commitment.horario_ejercicio_hasta || '?'}</p>}
                                    </div>
                                ) : (
                                    <p className={`text-sm ${isPresentationMode ? 'text-white/50' : 'text-slate-400'}`}>Aún no has definido un compromiso.</p>
                                )}
                                <button onClick={() => setStep(8)} className="mt-2 px-4 py-1.5 bg-green-500 text-white text-sm font-bold rounded-lg hover:bg-green-600 transition-colors">Editar Compromiso</button>
                            </div>

                            {/* Summary: Milestones */}
                            {milestones.length > 0 && (
                                <div className={`p-5 rounded-xl border-l-4 ${isPresentationMode ? 'bg-white/5 border-indigo-400' : 'bg-indigo-50 border-indigo-400'}`}>
                                    <h4 className={`font-bold mb-2 ${isPresentationMode ? 'text-indigo-300' : 'text-indigo-700'}`}>Hitos Definidos ({milestones.length})</h4>
                                    <div className="space-y-2">
                                        {milestones.map(m => (
                                            <div key={m.id} className={`flex items-center gap-3 text-sm ${isPresentationMode ? 'text-white/80' : 'text-slate-700'}`}>
                                                {m.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : m.status === 'current' ? <Target className="w-4 h-4 text-amber-500 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                                                <span>{m.title || '(Sin título)'}</span>
                                                <span className="text-xs text-slate-400 ml-auto">{m.target_date}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => setStep(8)} className="mt-2 px-4 py-1.5 bg-indigo-500 text-white text-sm font-bold rounded-lg hover:bg-indigo-600 transition-colors">Editar Hitos</button>
                                </div>
                            )}

                            {/* Print Summary */}
                            <div className="text-center pt-4">
                                <button
                                    onClick={handlePrint}
                                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                                >
                                    <Printer className="w-5 h-5" /> Imprimir Resumen de Sesión
                                </button>
                                <p className={`text-xs mt-2 ${isPresentationMode ? 'text-white/40' : 'text-slate-400'}`}>Genera un PDF o una copia física de tus acuerdos.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Footer Navigation */}
            <div className={`p-6 border-t no-print flex items-center justify-between transition-all duration-700 ${isPresentationMode
                ? 'bg-slate-900/50 border-white/5 backdrop-blur-xl'
                : 'bg-slate-50 border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]'
                }`}>
                <button
                    onClick={prevStep}
                    disabled={step === 1}
                    className={`px-6 py-2 flex items-center gap-2 font-bold transition-all disabled:opacity-20 ${isPresentationMode ? 'text-white/60 hover:text-white' : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    <ChevronLeft /> Anterior
                </button>
                <div className="flex gap-4">
                    {step < 9 ? (
                        <button
                            onClick={nextStep}
                            className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-xl ${isPresentationMode
                                ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-900/20'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                                }`}
                        >
                            Siguiente <ChevronRight />
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className={`px-10 py-3 rounded-xl font-extrabold flex items-center gap-3 transition-all transform hover:scale-105 shadow-xl ${isPresentationMode
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-900/20'
                                : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200'
                                }`}
                        >
                            Finalizar y Guardar <ClipboardCheck />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});
