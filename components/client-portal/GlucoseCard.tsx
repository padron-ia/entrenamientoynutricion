import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Droplets, Plus, TrendingDown, TrendingUp, X, Clock, Utensils, Sunrise, Activity, AlertTriangle, Info } from 'lucide-react';
import { parseLocalizedNumber } from '../../utils/numberParsing';

interface GlucoseEntry {
    id: string;
    glucose_value: number;
    measurement_type: string;
    measured_at: string;
    notes?: string;
}

interface GlucoseCardProps {
    clientId: string;
    refreshKey?: number;
}

const MEASUREMENT_TYPES = [
    { value: 'fasting', label: 'En ayunas', icon: Sunrise },
    { value: 'post_meal', label: 'Post-comida', icon: Utensils },
    { value: 'before_meal', label: 'Pre-comida', icon: Clock },
    { value: 'random', label: 'Aleatorio', icon: Droplets }
];

export function GlucoseCard({ clientId, refreshKey }: GlucoseCardProps) {
    const [history, setHistory] = useState<GlucoseEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newValue, setNewValue] = useState('');
    const [measurementType, setMeasurementType] = useState('fasting');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadHistory();
    }, [clientId, refreshKey]);

    const loadHistory = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('glucose_history')
            .select('*')
            .eq('client_id', clientId)
            .order('measured_at', { ascending: false })
            .limit(30);
        if (data) setHistory(data);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedValue = parseLocalizedNumber(newValue);
        if (!parsedValue || parsedValue <= 0) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('glucose_history')
                .insert({
                    client_id: clientId,
                    glucose_value: parsedValue,
                    measurement_type: measurementType,
                    notes: notes || null
                });

            if (error) throw error;

            loadHistory();
            setIsModalOpen(false);
            setNewValue('');
            setNotes('');
        } catch (error: any) {
            console.error('Error saving glucose:', error);
            const detail = error?.message || error?.details || error?.code || JSON.stringify(error);
            alert(`Error al guardar la glucemia: ${detail}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate stats
    const latestValue = history.length > 0 ? history[0].glucose_value : null;
    const avgValue = history.length > 0
        ? Math.round(history.reduce((sum, h) => sum + h.glucose_value, 0) / history.length)
        : null;

    // Determine trend (last 7 days vs previous 7 days)
    const recentItems = history.slice(0, 7);
    const olderItems = history.slice(7, 14);

    const recentAvg = recentItems.length > 0
        ? recentItems.reduce((s, h) => s + h.glucose_value, 0) / recentItems.length
        : 0;

    const olderAvg = olderItems.length > 0
        ? olderItems.reduce((s, h) => s + h.glucose_value, 0) / olderItems.length
        : null; // Null if no previous history

    const trend = olderAvg === null ? 'stable' : recentAvg < olderAvg ? 'down' : recentAvg > olderAvg ? 'up' : 'stable';

    // Target zones for fasting glucose
    const targetMin = 70;
    const targetMax = 130;
    const isInTarget = latestValue !== null && latestValue >= targetMin && latestValue <= targetMax;

    // Chart data (reverse for chronological order)
    const chartData = [...history].reverse().map(h => ({
        date: new Date(h.measured_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        value: h.glucose_value,
        type: h.measurement_type
    }));

    return (
        <>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sea-500 to-sea-600 flex items-center justify-center text-white shadow-lg shadow-sea-200">
                            <Droplets className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Glucemia</h3>
                            <p className="text-sm text-slate-500">Control de glucosa</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-10 h-10 rounded-xl bg-sea-50 text-sea-600 flex items-center justify-center hover:bg-sea-100 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="text-center p-3 rounded-xl bg-slate-50">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Último</p>
                        <p className={`text-xl font-bold ${isInTarget ? 'text-accent-600' : 'text-sea-600'}`}>
                            {latestValue ?? '--'}
                        </p>
                        <p className="text-[10px] text-slate-400">mg/dL</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-slate-50">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Promedio</p>
                        <p className="text-xl font-bold text-slate-900">{avgValue ?? '--'}</p>
                        <p className="text-[10px] text-slate-400">mg/dL</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-slate-50">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Tendencia</p>
                        <div className="flex items-center justify-center gap-1">
                            {trend === 'down' && <TrendingDown className="w-5 h-5 text-accent-500" />}
                            {trend === 'up' && <TrendingUp className="w-5 h-5 text-sea-500" />}
                            {trend === 'stable' && <span className="text-slate-400">—</span>}
                            <span className={`text-sm font-bold ${trend === 'down' ? 'text-accent-500' : trend === 'up' ? 'text-sea-500' : 'text-slate-400'}`}>
                                {trend === 'down' ? 'Baja' : trend === 'up' ? 'Sube' : 'Estable'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                {chartData.length > 1 && (
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis domain={['dataMin - 10', 'dataMax + 10']} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    labelStyle={{ color: '#94a3b8' }}
                                />
                                {/* Target zone indicators */}
                                <ReferenceLine y={targetMax} stroke="#14b8a6" strokeDasharray="3 3" strokeOpacity={0.5} />
                                <ReferenceLine y={targetMin} stroke="#14b8a6" strokeDasharray="3 3" strokeOpacity={0.5} />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {chartData.length <= 1 && (
                    <div className="h-32 flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-xl">
                        Registra tu glucemia para ver la evolución
                    </div>
                )}

                {/* Patterns & Insights */}
                {history.length >= 5 && (() => {
                    const insights: { icon: React.FC<any>; text: string; type: 'warning' | 'info' | 'good' }[] = [];

                    // Count out-of-range values this week
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    const weekEntries = history.filter(h => new Date(h.measured_at) >= oneWeekAgo);
                    const outOfRange = weekEntries.filter(h => h.glucose_value < targetMin || h.glucose_value > targetMax);
                    if (outOfRange.length >= 3) {
                        insights.push({
                            icon: AlertTriangle,
                            text: `${outOfRange.length} de ${weekEntries.length} valores fuera de rango esta semana`,
                            type: 'warning',
                        });
                    } else if (weekEntries.length >= 3 && outOfRange.length === 0) {
                        insights.push({
                            icon: Activity,
                            text: `Todos los valores de la semana en rango objetivo`,
                            type: 'good',
                        });
                    }

                    // Post-meal pattern
                    const postMeal = history.filter(h => h.measurement_type === 'post_meal');
                    if (postMeal.length >= 3) {
                        const postMealAvg = Math.round(postMeal.reduce((s, h) => s + h.glucose_value, 0) / postMeal.length);
                        if (postMealAvg > targetMax) {
                            insights.push({
                                icon: Utensils,
                                text: `Tus picos post-comida promedian ${postMealAvg} mg/dL (por encima del objetivo)`,
                                type: 'warning',
                            });
                        }
                    }

                    // Fasting pattern
                    const fasting = history.filter(h => h.measurement_type === 'fasting');
                    if (fasting.length >= 3) {
                        const fastingAvg = Math.round(fasting.reduce((s, h) => s + h.glucose_value, 0) / fasting.length);
                        if (fastingAvg >= targetMin && fastingAvg <= 100) {
                            insights.push({
                                icon: Sunrise,
                                text: `Glucosa en ayunas promedio: ${fastingAvg} mg/dL (excelente)`,
                                type: 'good',
                            });
                        } else if (fastingAvg > 100) {
                            insights.push({
                                icon: Sunrise,
                                text: `Glucosa en ayunas promedio: ${fastingAvg} mg/dL (por encima de lo ideal)`,
                                type: 'info',
                            });
                        }
                    }

                    // Day-of-week pattern
                    const byDay: Record<number, number[]> = {};
                    for (const h of history) {
                        const day = new Date(h.measured_at).getDay();
                        if (!byDay[day]) byDay[day] = [];
                        byDay[day].push(h.glucose_value);
                    }
                    const dayNames = ['domingos', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabados'];
                    let worstDay = -1, worstAvg = 0;
                    for (const [day, vals] of Object.entries(byDay)) {
                        if (vals.length < 2) continue;
                        const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
                        if (avg > worstAvg) { worstAvg = avg; worstDay = parseInt(day); }
                    }
                    if (worstDay >= 0 && worstAvg > targetMax) {
                        insights.push({
                            icon: Info,
                            text: `Tus valores suelen ser mas altos los ${dayNames[worstDay]}`,
                            type: 'info',
                        });
                    }

                    if (insights.length === 0) return null;

                    const colors = {
                        warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
                        info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500' },
                        good: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-500' },
                    };

                    return (
                        <div className="mt-4 space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Patrones detectados</p>
                            {insights.slice(0, 3).map((insight, i) => {
                                const c = colors[insight.type];
                                const Icon = insight.icon;
                                return (
                                    <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl ${c.bg} border ${c.border}`}>
                                        <Icon className={`w-4 h-4 ${c.icon} flex-shrink-0 mt-0.5`} />
                                        <p className={`text-xs font-medium ${c.text}`}>{insight.text}</p>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}

                {/* Target Zone Legend */}
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-accent-500 rounded-full"></span>
                        Zona objetivo: {targetMin}-{targetMax} mg/dL
                    </span>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-slate-900">Registrar Glucemia</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Value Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Valor ({measurementType === 'hba1c' ? '%' : 'mg/dL'})</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        step={measurementType === 'hba1c' ? "0.1" : "1"}
                                        placeholder={measurementType === 'hba1c' ? "5.5" : "120"}
                                        className="w-full py-4 px-4 text-center text-3xl font-bold text-slate-900 border-2 border-slate-200 rounded-2xl focus:border-sea-500 focus:ring-4 focus:ring-sea-100 outline-none transition-all"
                                        value={newValue}
                                        onChange={e => setNewValue(e.target.value)}
                                        autoFocus
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{measurementType === 'hba1c' ? '%' : 'mg/dL'}</span>
                                </div>
                            </div>

                            {/* Measurement Type */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de medición</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {MEASUREMENT_TYPES.map(type => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setMeasurementType(type.value)}
                                            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-2 ${measurementType === type.value
                                                ? 'border-sea-500 bg-sea-50 text-sea-700'
                                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                                }`}
                                        >
                                            <type.icon className="w-4 h-4" />
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Notas (opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Después del desayuno..."
                                    className="w-full py-3 px-4 border-2 border-slate-200 rounded-xl focus:border-sea-500 focus:ring-4 focus:ring-sea-100 outline-none transition-all"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>

                            {/* Submit */}
                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !parseLocalizedNumber(newValue)}
                                    className="w-full py-4 bg-gradient-to-r from-sea-500 to-sea-600 text-white font-bold rounded-2xl shadow-lg shadow-sea-200 hover:shadow-xl disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {isSubmitting ? 'Guardando...' : 'Guardar Glucemia'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
