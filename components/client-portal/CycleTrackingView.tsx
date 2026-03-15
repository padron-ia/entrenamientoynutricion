import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Heart, Calendar, Save, Loader2, AlertCircle,
    CheckCircle2, ChevronRight, Plus, Moon, Sun, Zap, SmilePlus
} from 'lucide-react';
import { Client } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface CycleTrackingViewProps {
    client: Client;
    onBack: () => void;
    onRefresh?: () => void | Promise<void>;
}

interface SymptomEntry {
    bloating: boolean;
    cramps: boolean;
    cravings: boolean;
    cravings_detail: string;
    hot_flashes: boolean;
    night_sweats: boolean;
    vaginal_dryness: boolean;
    energy_level: number;
    mood: number;
    sleep_quality: number;
    headache: boolean;
    breast_tenderness: boolean;
    irritability: boolean;
    notes: string;
}

const defaultSymptoms: SymptomEntry = {
    bloating: false,
    cramps: false,
    cravings: false,
    cravings_detail: '',
    hot_flashes: false,
    night_sweats: false,
    vaginal_dryness: false,
    energy_level: 3,
    mood: 3,
    sleep_quality: 3,
    headache: false,
    breast_tenderness: false,
    irritability: false,
    notes: '',
};

function getPhaseInfo(dayInCycle: number, cycleLength: number) {
    if (dayInCycle <= 5) return { name: 'Menstrual', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', emoji: '🔴' };
    if (dayInCycle <= Math.floor(cycleLength * 0.46)) return { name: 'Folicular', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', emoji: '🌱' };
    if (dayInCycle <= Math.floor(cycleLength * 0.57)) return { name: 'Ovulación', color: 'text-sea-600', bg: 'bg-sea-50', border: 'border-sea-200', emoji: '🌕' };
    return { name: 'Lútea', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', emoji: '🌙' };
}

export function CycleTrackingView({ client, onBack, onRefresh }: CycleTrackingViewProps) {
    const [activeSection, setActiveSection] = useState<'overview' | 'log_period' | 'log_symptoms'>('overview');
    const [cycles, setCycles] = useState<any[]>([]);
    const [symptoms, setSymptoms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [savingStatus, setSavingStatus] = useState(false);
    const [localHormonalStatus, setLocalHormonalStatus] = useState(client.hormonal_status || '');

    // Period logging
    const [periodStartDate, setPeriodStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [periodNotes, setPeriodNotes] = useState('');

    // Symptom logging
    const [symptomData, setSymptomData] = useState<SymptomEntry>({ ...defaultSymptoms });
    const [symptomDate, setSymptomDate] = useState(new Date().toISOString().split('T')[0]);

    const hormonalStatus = localHormonalStatus || client.hormonal_status;

    const handleSelectHormonalStatus = async (status: string) => {
        setSavingStatus(true);
        try {
            const { error } = await supabase
                .from('clientes_pt_notion')
                .update({ hormonal_status: status })
                .eq('id', client.id);
            if (error) throw error;
            setLocalHormonalStatus(status);
            if (onRefresh) await onRefresh();
        } catch (e: any) {
            console.error('Error saving hormonal status:', e);
            const detail = e?.message || e?.details || e?.code || JSON.stringify(e);
            alert(`Error al guardar estado hormonal: ${detail}`);
        } finally {
            setSavingStatus(false);
        }
    };
    const cycleLength = client.average_cycle_length || 28;
    const isPreOrPeri = hormonalStatus === 'pre_menopausica' || hormonalStatus === 'perimenopausica';

    useEffect(() => {
        fetchData();
    }, [client.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: cycleData } = await supabase
                .from('menstrual_cycles')
                .select('*')
                .eq('client_id', client.id)
                .order('period_start_date', { ascending: false })
                .limit(12);
            if (cycleData) setCycles(cycleData);

            const { data: symptomData } = await supabase
                .from('hormonal_symptoms')
                .select('*')
                .eq('client_id', client.id)
                .order('date', { ascending: false })
                .limit(30);
            if (symptomData) setSymptoms(symptomData);
        } catch (e) {
            console.error('Error fetching cycle data:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogPeriod = async () => {
        if (!periodStartDate) return;
        setIsSaving(true);
        try {
            // Calculate cycle_length from previous cycle
            let calculatedCycleLength: number | null = null;
            if (cycles.length > 0) {
                const prevStart = new Date(cycles[0].period_start_date);
                const newStart = new Date(periodStartDate);
                calculatedCycleLength = Math.round((newStart.getTime() - prevStart.getTime()) / (1000 * 60 * 60 * 24));
                if (calculatedCycleLength <= 0 || calculatedCycleLength > 90) calculatedCycleLength = null;
            }

            const { error } = await supabase.from('menstrual_cycles').insert({
                client_id: client.id,
                period_start_date: periodStartDate,
                cycle_length: calculatedCycleLength,
                notes: periodNotes || null,
            });

            if (error) throw error;

            // Denormalize for coach quick-view
            await supabase.from('clientes_pt_notion').update({ last_period_start_date: periodStartDate }).eq('id', client.id);

            setSaved(true);
            setPeriodNotes('');
            await fetchData();
            setTimeout(() => {
                setSaved(false);
                setActiveSection('overview');
            }, 1500);
        } catch (e: any) {
            console.error('Error logging period:', e);
            const detail = e?.message || e?.details || e?.code || JSON.stringify(e);
            alert(`Error al guardar periodo: ${detail}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogSymptoms = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase.from('hormonal_symptoms').insert({
                client_id: client.id,
                date: symptomDate,
                ...symptomData,
                cravings_detail: symptomData.cravings ? symptomData.cravings_detail : null,
                notes: symptomData.notes || null,
            });

            if (error) throw error;

            setSaved(true);
            setSymptomData({ ...defaultSymptoms });
            await fetchData();
            setTimeout(() => {
                setSaved(false);
                setActiveSection('overview');
            }, 1500);
        } catch (e: any) {
            console.error('Error logging symptoms:', e);
            const detail = e?.message || e?.details || e?.code || JSON.stringify(e);
            alert(`Error al guardar síntomas: ${detail}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Current phase calculation
    const currentPhase = (() => {
        if (!isPreOrPeri || cycles.length === 0) return null;
        const lastStart = new Date(cycles[0].period_start_date);
        const daysSinceStart = Math.floor((Date.now() - lastStart.getTime()) / (1000 * 60 * 60 * 24));
        const dayInCycle = (daysSinceStart % cycleLength) + 1;
        return { ...getPhaseInfo(dayInCycle, cycleLength), day: dayInCycle };
    })();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
            </div>
        );
    }

    // --- LOG PERIOD VIEW ---
    if (activeSection === 'log_period') {
        return (
            <div className="max-w-lg mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4">
                <button onClick={() => setActiveSection('overview')} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold group">
                    <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver
                </button>

                <div className="bg-white rounded-3xl p-6 shadow-xl border border-pink-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-pink-50 text-pink-600 rounded-xl"><Calendar className="w-6 h-6" /></div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Registrar Periodo</h2>
                            <p className="text-slate-500 text-sm">Marca el primer día de tu menstruación</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de inicio</label>
                            <input
                                type="date"
                                value={periodStartDate}
                                onChange={(e) => setPeriodStartDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-pink-400 focus:outline-none text-slate-700 font-medium"
                            />
                        </div>

                        {cycles.length > 0 && periodStartDate && (
                            <div className="p-3 bg-pink-50 rounded-xl border border-pink-100">
                                <p className="text-xs text-pink-700 font-medium">
                                    Duración de este ciclo: {Math.round((new Date(periodStartDate).getTime() - new Date(cycles[0].period_start_date).getTime()) / (1000 * 60 * 60 * 24))} días
                                    (desde {new Date(cycles[0].period_start_date).toLocaleDateString('es-ES')})
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Notas (opcional)</label>
                            <textarea
                                value={periodNotes}
                                onChange={(e) => setPeriodNotes(e.target.value)}
                                placeholder="Ej: más dolor que el mes pasado, flujo ligero..."
                                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-pink-400 focus:outline-none text-slate-700 resize-none h-24"
                            />
                        </div>

                        <button
                            onClick={handleLogPeriod}
                            disabled={isSaving || !periodStartDate}
                            className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold shadow-lg shadow-pink-200 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                            {isSaving ? 'Guardando...' : saved ? 'Guardado' : 'Registrar Periodo'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- LOG SYMPTOMS VIEW ---
    if (activeSection === 'log_symptoms') {
        const isMenopausica = hormonalStatus === 'menopausica';
        const showMenopauseSymptoms = hormonalStatus === 'menopausica' || hormonalStatus === 'perimenopausica';

        return (
            <div className="max-w-lg mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4">
                <button onClick={() => setActiveSection('overview')} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold group">
                    <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver
                </button>

                <div className="bg-white rounded-3xl p-6 shadow-xl border border-pink-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-sea-50 text-sea-600 rounded-xl"><SmilePlus className="w-6 h-6" /></div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Registrar Síntomas</h2>
                            <p className="text-slate-500 text-sm">¿Cómo te sientes hoy?</p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {/* Date */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Fecha</label>
                            <input
                                type="date"
                                value={symptomDate}
                                onChange={(e) => setSymptomDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sea-400 focus:outline-none text-slate-700 font-medium"
                            />
                        </div>

                        {/* Sliders */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bienestar General</h4>
                            {[
                                { key: 'energy_level' as const, label: 'Energía', icon: <Zap className="w-4 h-4" />, low: 'Muy baja', high: 'Muy alta', color: 'amber' },
                                { key: 'mood' as const, label: 'Estado de ánimo', icon: <Sun className="w-4 h-4" />, low: 'Muy bajo', high: 'Muy bueno', color: 'blue' },
                                { key: 'sleep_quality' as const, label: 'Calidad del sueño', icon: <Moon className="w-4 h-4" />, low: 'Muy mala', high: 'Excelente', color: 'indigo' },
                            ].map(slider => (
                                <div key={slider.key} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">{slider.icon} {slider.label}</label>
                                        <span className={`text-sm font-bold text-${slider.color}-600`}>{symptomData[slider.key]}/5</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={1}
                                        max={5}
                                        value={symptomData[slider.key]}
                                        onChange={(e) => setSymptomData(prev => ({ ...prev, [slider.key]: Number(e.target.value) }))}
                                        className="w-full accent-pink-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400">
                                        <span>{slider.low}</span><span>{slider.high}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Menstrual Symptoms (pre/peri) */}
                        {!isMenopausica && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Síntomas Menstruales</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: 'bloating' as const, label: 'Hinchazón' },
                                        { key: 'cramps' as const, label: 'Dolor/Calambres' },
                                        { key: 'breast_tenderness' as const, label: 'Sens. mamaria' },
                                        { key: 'headache' as const, label: 'Dolor de cabeza' },
                                        { key: 'irritability' as const, label: 'Irritabilidad' },
                                        { key: 'cravings' as const, label: 'Antojos' },
                                    ].map(item => (
                                        <button
                                            key={item.key}
                                            onClick={() => setSymptomData(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                            className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                                                symptomData[item.key]
                                                    ? 'border-pink-400 bg-pink-50 text-pink-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                            }`}
                                        >
                                            {symptomData[item.key] ? '✓ ' : ''}{item.label}
                                        </button>
                                    ))}
                                </div>
                                {symptomData.cravings && (
                                    <input
                                        type="text"
                                        value={symptomData.cravings_detail}
                                        onChange={(e) => setSymptomData(prev => ({ ...prev, cravings_detail: e.target.value }))}
                                        placeholder="¿Qué tipo de antojos? (chocolate, salado...)"
                                        className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-pink-400 focus:outline-none text-sm"
                                    />
                                )}
                            </div>
                        )}

                        {/* Menopause Symptoms */}
                        {showMenopauseSymptoms && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Síntomas {isMenopausica ? 'Menopáusicos' : 'Perimenopáusicos'}</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: 'hot_flashes' as const, label: 'Sofocos' },
                                        { key: 'night_sweats' as const, label: 'Sudores nocturnos' },
                                        { key: 'vaginal_dryness' as const, label: 'Sequedad vaginal' },
                                        { key: 'headache' as const, label: 'Dolor de cabeza' },
                                        { key: 'irritability' as const, label: 'Irritabilidad' },
                                        { key: 'breast_tenderness' as const, label: 'Sens. mamaria' },
                                    ].map(item => (
                                        <button
                                            key={item.key}
                                            onClick={() => setSymptomData(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                            className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                                                symptomData[item.key]
                                                    ? 'border-sea-400 bg-sea-50 text-sea-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                            }`}
                                        >
                                            {symptomData[item.key] ? '✓ ' : ''}{item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Notas adicionales</label>
                            <textarea
                                value={symptomData.notes}
                                onChange={(e) => setSymptomData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="¿Algo más que quieras comentar?"
                                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sea-400 focus:outline-none text-slate-700 resize-none h-20"
                            />
                        </div>

                        <button
                            onClick={handleLogSymptoms}
                            disabled={isSaving}
                            className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold shadow-lg shadow-pink-200 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                            {isSaving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar Síntomas'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- HORMONAL STATUS SELECTOR (if not set) ---
    if (!hormonalStatus) {
        return (
            <div className="max-w-lg mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4">
                <button onClick={onBack} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold group">
                    <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
                </button>

                <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-purple-500 rounded-3xl p-6 text-white shadow-xl shadow-pink-200/50 mb-6">
                    <div className="flex items-center gap-3">
                        <Heart className="w-8 h-8" />
                        <div>
                            <h1 className="text-2xl font-black">Mi Ciclo</h1>
                            <p className="text-pink-100 text-sm">Seguimiento hormonal</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-xl border border-pink-100">
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Selecciona tu estado hormonal</h2>
                    <p className="text-sm text-slate-500 mb-6">Esto nos ayuda a personalizar tu seguimiento y las recomendaciones de tu coach.</p>

                    <div className="space-y-3">
                        {[
                            { value: 'pre_menopausica', label: 'Pre-menopáusica', desc: 'Tengo ciclos menstruales regulares', color: 'pink' },
                            { value: 'perimenopausica', label: 'Perimenopáusica', desc: 'Mis ciclos son irregulares o están cambiando', color: 'amber' },
                            { value: 'menopausica', label: 'Menopáusica', desc: 'Ya no tengo ciclo menstrual', color: 'purple' },
                        ].map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => handleSelectHormonalStatus(opt.value)}
                                disabled={savingStatus}
                                className={`w-full text-left p-4 rounded-2xl border-2 transition-all hover:shadow-md active:scale-[0.98] ${
                                    opt.color === 'pink' ? 'border-pink-200 hover:border-pink-400 hover:bg-pink-50' :
                                    opt.color === 'amber' ? 'border-amber-200 hover:border-amber-400 hover:bg-amber-50' :
                                    'border-purple-200 hover:border-purple-400 hover:bg-purple-50'
                                } ${savingStatus ? 'opacity-50' : ''}`}
                            >
                                <p className="font-bold text-slate-900">{opt.label}</p>
                                <p className="text-sm text-slate-500 mt-0.5">{opt.desc}</p>
                            </button>
                        ))}
                    </div>

                    {savingStatus && (
                        <div className="flex items-center justify-center gap-2 mt-4 text-pink-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm font-medium">Guardando...</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- OVERVIEW ---
    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4">
            <button onClick={onBack} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold group">
                <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
            </button>

            {/* Header */}
            <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-purple-500 rounded-3xl p-6 text-white shadow-xl shadow-pink-200/50 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <Heart className="w-8 h-8" />
                    <div>
                        <h1 className="text-2xl font-black">Mi Ciclo</h1>
                        <p className="text-pink-100 text-sm">
                            {hormonalStatus === 'pre_menopausica' && 'Seguimiento de ciclo menstrual'}
                            {hormonalStatus === 'perimenopausica' && 'Seguimiento perimenopáusico'}
                            {hormonalStatus === 'menopausica' && 'Seguimiento menopáusico'}
                        </p>
                    </div>
                </div>

                {/* Phase indicator (pre/peri) */}
                {currentPhase && (
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mt-2">
                        <p className="text-xs text-pink-100 font-bold uppercase tracking-wider mb-1">Fase Actual</p>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{currentPhase.emoji}</span>
                            <div>
                                <p className="text-xl font-black">{currentPhase.name}</p>
                                <p className="text-pink-200 text-sm">Día {currentPhase.day} de {cycleLength}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className={`grid ${isPreOrPeri ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-6`}>
                {isPreOrPeri && (
                    <button
                        onClick={() => setActiveSection('log_period')}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white shadow-md border border-pink-100 hover:shadow-lg transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-50 rounded-xl text-pink-600"><Calendar className="w-5 h-5" /></div>
                            <div className="text-left">
                                <p className="font-bold text-slate-900 text-sm">Registrar Periodo</p>
                                <p className="text-xs text-slate-500">Primer día de regla</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                )}
                <button
                    onClick={() => setActiveSection('log_symptoms')}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white shadow-md border border-pink-100 hover:shadow-lg transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-xl text-purple-600"><SmilePlus className="w-5 h-5" /></div>
                        <div className="text-left">
                            <p className="font-bold text-slate-900 text-sm">Registrar Síntomas</p>
                            <p className="text-xs text-slate-500">¿Cómo te sientes hoy?</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Cycle History (pre/peri) */}
            {isPreOrPeri && cycles.length > 0 && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-pink-500" /> Historial de Ciclos
                    </h3>
                    <div className="space-y-2">
                        {cycles.map((c: any, i: number) => (
                            <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">🔴</span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">
                                            {new Date(c.period_start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                        {c.notes && <p className="text-xs text-slate-500">{c.notes}</p>}
                                    </div>
                                </div>
                                {c.cycle_length && (
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                        Math.abs(c.cycle_length - 28) <= 3 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {c.cycle_length}d
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Symptoms */}
            {symptoms.length > 0 && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-500" /> Síntomas Recientes
                    </h3>
                    <div className="space-y-3">
                        {symptoms.slice(0, 7).map((s: any) => (
                            <div key={s.id} className="p-3 bg-slate-50 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-500">
                                        {new Date(s.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </span>
                                    <div className="flex gap-1.5">
                                        {s.energy_level && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">E:{s.energy_level}</span>}
                                        {s.mood && <span className="text-[10px] bg-sea-100 text-sea-700 px-1.5 py-0.5 rounded-full font-bold">A:{s.mood}</span>}
                                        {s.sleep_quality && <span className="text-[10px] bg-sea-100 text-sea-700 px-1.5 py-0.5 rounded-full font-bold">S:{s.sleep_quality}</span>}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {s.bloating && <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full font-bold">Hinchazón</span>}
                                    {s.cramps && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">Dolor</span>}
                                    {s.cravings && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">Antojos</span>}
                                    {s.headache && <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-bold">Cabeza</span>}
                                    {s.irritability && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">Irritabilidad</span>}
                                    {s.hot_flashes && <span className="text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full font-bold">Sofocos</span>}
                                    {s.night_sweats && <span className="text-[10px] bg-sea-200 text-sea-800 px-1.5 py-0.5 rounded-full font-bold">Sudores</span>}
                                </div>
                                {s.notes && <p className="text-xs text-slate-500 mt-1 italic">{s.notes}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {cycles.length === 0 && symptoms.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Aún no tienes registros.</p>
                    <p className="text-xs mt-1">Empieza registrando tu periodo o tus síntomas de hoy.</p>
                </div>
            )}
        </div>
    );
}
