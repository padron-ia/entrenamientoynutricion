import React, { useState } from 'react';
import { AreaChart as ChartIcon, X, TrendingDown, TrendingUp, Minus, ArrowRight } from 'lucide-react';

interface Measurement {
    id: string;
    abdominal_cm: number | null;
    arm_cm: number | null;
    thigh_cm: number | null;
    hip_cm: number | null;
    chest_cm: number | null;
    measured_at: string;
}

interface BodyMeasurementsHistoryProps {
    history: Measurement[];
    onClose: () => void;
}

type MeasurementType = 'abdominal_cm' | 'arm_cm' | 'thigh_cm' | 'hip_cm' | 'chest_cm';

const MEASUREMENT_CONFIG: Record<MeasurementType, { label: string; color: string; bgLight: string; icon: string }> = {
    abdominal_cm: { label: 'Abdomen', color: 'text-blue-600', bgLight: 'bg-blue-50', icon: '🎯' },
    arm_cm: { label: 'Brazo', color: 'text-teal-600', bgLight: 'bg-teal-50', icon: '💪' },
    thigh_cm: { label: 'Muslo', color: 'text-amber-600', bgLight: 'bg-amber-50', icon: '🦵' },
    hip_cm: { label: 'Cadera', color: 'text-pink-600', bgLight: 'bg-pink-50', icon: '🍑' },
    chest_cm: { label: 'Pecho', color: 'text-cyan-600', bgLight: 'bg-cyan-50', icon: '👕' },
};

const ALL_METRICS = Object.keys(MEASUREMENT_CONFIG) as MeasurementType[];

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function formatFullDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function BodyMeasurementsHistory({ history, onClose }: BodyMeasurementsHistoryProps) {
    const [view, setView] = useState<'summary' | 'timeline'>('summary');

    if (history.length === 0) return null;

    // Chronological order (oldest first)
    const sorted = [...history].reverse();
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];

    // Detect which metrics have data
    const activeMetrics = ALL_METRICS.filter(key =>
        history.some(m => m[key] !== null && m[key] !== undefined)
    );

    // Calculate evolution for each metric
    const getEvolution = (key: MeasurementType) => {
        const firstVal = first[key];
        const latestVal = latest[key];
        if (firstVal == null || latestVal == null) return null;
        const diff = latestVal - firstVal;
        return { firstVal, latestVal, diff };
    };

    // Get previous value for a metric at a given index in sorted array
    const getPrevValue = (key: MeasurementType, idx: number): number | null => {
        for (let i = idx - 1; i >= 0; i--) {
            if (sorted[i][key] != null) return sorted[i][key];
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sea-50 text-sea-600 flex items-center justify-center">
                        <ChartIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Historial de Medidas</h3>
                        <p className="text-xs text-slate-500">
                            {sorted.length} mediciones · {formatDate(first.measured_at)} - {formatDate(latest.measured_at)}
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* View toggle */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4">
                <button
                    onClick={() => setView('summary')}
                    className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${view === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                    Resumen
                </button>
                <button
                    onClick={() => setView('timeline')}
                    className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${view === 'timeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                    Cronología
                </button>
            </div>

            {view === 'summary' ? (
                /* ── SUMMARY VIEW ── */
                <div className="flex-1 space-y-3 overflow-y-auto">
                    {activeMetrics.map(key => {
                        const config = MEASUREMENT_CONFIG[key];
                        const evo = getEvolution(key);
                        if (!evo) return null;

                        const isDown = evo.diff < 0;
                        const isUp = evo.diff > 0;
                        const isFlat = evo.diff === 0;

                        return (
                            <div key={key} className={`p-4 rounded-2xl border border-slate-100 ${config.bgLight}`}>
                                {/* Metric label */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>{config.icon}</span> {config.label}
                                    </span>
                                    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                                        isDown ? 'bg-green-100 text-green-700'
                                            : isUp ? 'bg-red-100 text-red-700'
                                                : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {isDown ? <TrendingDown className="w-3 h-3" /> : isUp ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                        {isFlat ? 'Sin cambio' : `${evo.diff > 0 ? '+' : ''}${evo.diff.toFixed(1)} cm`}
                                    </span>
                                </div>

                                {/* First → Latest */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 text-center">
                                        <p className="text-[10px] text-slate-400 font-medium mb-0.5">Inicio</p>
                                        <p className="text-lg font-bold text-slate-700">{evo.firstVal}<span className="text-xs font-normal text-slate-400 ml-0.5">cm</span></p>
                                        <p className="text-[10px] text-slate-400">{formatDate(first.measured_at)}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                    <div className="flex-1 text-center">
                                        <p className="text-[10px] text-slate-400 font-medium mb-0.5">Actual</p>
                                        <p className={`text-lg font-bold ${isDown ? 'text-green-600' : isUp ? 'text-red-600' : 'text-slate-700'}`}>
                                            {evo.latestVal}<span className="text-xs font-normal text-slate-400 ml-0.5">cm</span>
                                        </p>
                                        <p className="text-[10px] text-slate-400">{formatDate(latest.measured_at)}</p>
                                    </div>
                                </div>

                                {/* Mini bar showing all intermediate values */}
                                {sorted.length > 2 && (
                                    <div className="mt-3 flex items-end gap-[3px] h-8">
                                        {sorted.map((m, i) => {
                                            const val = m[key];
                                            if (val == null) return <div key={i} className="flex-1" />;

                                            // Normalize height relative to min/max of this metric
                                            const allVals = sorted.map(s => s[key]).filter((v): v is number => v != null);
                                            const min = Math.min(...allVals);
                                            const max = Math.max(...allVals);
                                            const range = max - min || 1;
                                            const pct = ((val - min) / range) * 100;
                                            const height = Math.max(15, 15 + (pct / 100) * 85);

                                            const prev = getPrevValue(key, i);
                                            const barColor = prev == null ? 'bg-slate-300'
                                                : val < prev ? 'bg-green-400'
                                                    : val > prev ? 'bg-red-300'
                                                        : 'bg-slate-300';

                                            return (
                                                <div
                                                    key={i}
                                                    className={`flex-1 rounded-sm ${barColor} transition-all`}
                                                    style={{ height: `${height}%` }}
                                                    title={`${formatDate(m.measured_at)}: ${val} cm`}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── TIMELINE VIEW ── */
                <div className="flex-1 overflow-y-auto">
                    <div className="space-y-2">
                        {/* Reverse to show newest first */}
                        {[...sorted].reverse().map((m, idx) => {
                            const chronIdx = sorted.length - 1 - idx; // index in sorted (chronological)
                            const isFirst = chronIdx === 0;
                            const isLatest = chronIdx === sorted.length - 1;

                            return (
                                <div key={m.id} className={`p-3 rounded-xl border transition-colors ${
                                    isLatest ? 'border-sea-200 bg-sea-50/50' : 'border-slate-100 bg-white'
                                }`}>
                                    {/* Date header */}
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-700">
                                            {formatFullDate(m.measured_at)}
                                        </span>
                                        {isLatest && (
                                            <span className="text-[10px] font-bold text-sea-600 bg-sea-100 px-2 py-0.5 rounded-full">Última</span>
                                        )}
                                        {isFirst && sorted.length > 1 && (
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Inicio</span>
                                        )}
                                    </div>

                                    {/* Metrics grid */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {activeMetrics.map(key => {
                                            const val = m[key];
                                            if (val == null) return null;

                                            const config = MEASUREMENT_CONFIG[key];
                                            const prev = getPrevValue(key, chronIdx);
                                            const diff = prev != null ? val - prev : null;

                                            return (
                                                <div key={key} className="text-center">
                                                    <p className="text-[10px] text-slate-400 font-medium">{config.icon} {config.label}</p>
                                                    <p className="text-sm font-bold text-slate-800">{val}<span className="text-[10px] text-slate-400 ml-0.5">cm</span></p>
                                                    {diff !== null && diff !== 0 && (
                                                        <p className={`text-[10px] font-bold ${diff < 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                            {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
