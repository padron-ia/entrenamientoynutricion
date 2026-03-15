import React from 'react';
import { Target, CheckCircle2, AlertTriangle, PlayCircle, Award, Compass, TrendingUp, AlertOctagon } from 'lucide-react';
import { Client, StrategicAlignment, WeeklyCoachReview } from '../types';
import { analyzeStrategicAlignment } from '../services/processTrackingService';

export interface SuccessCompassProps {
    client: Client;
    weeklyReviews?: WeeklyCoachReview[];
    onViewRoadmap?: () => void;
    onEditMilestones?: () => void;
    onEmergencyCall?: () => void;
}

const PHASE_NAMES = [
    "Fase 1: Inicial",
    "Fase 2: Afianzamiento",
    "Fase 3: Consolidación",
    "Fase 4: Mantenimiento"
];

export const SuccessCompass: React.FC<SuccessCompassProps> = ({ client, weeklyReviews, onViewRoadmap, onEditMilestones, onEmergencyCall }) => {
    const alignment = client.roadmap_data ? analyzeStrategicAlignment(client.roadmap_data, weeklyReviews || []) : null;

    if (!client.roadmap_data || !alignment) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                <Compass className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">Brújula Estratégica No Inicializada</h3>
                <p className="text-slate-500 text-sm">El "Camino al Éxito" aún no ha sido configurado para este cliente.</p>
                <button
                    onClick={onViewRoadmap}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    Configurar Brújula
                </button>
            </div>
        );
    }

    const { alignmentPercent, totalMilestones, completedMilestones, isOnTrack, activePhaseIndex, deviationAlert } = alignment;

    const isCritical = alignmentPercent < 50;
    const metricsColor = isCritical ? 'text-rose-600' : isOnTrack ? 'text-emerald-600' : 'text-amber-600';
    const metricsBg = isCritical ? 'bg-rose-50' : isOnTrack ? 'bg-emerald-50' : 'bg-amber-50';
    const progressColor = isCritical ? 'bg-rose-500' : isOnTrack ? 'bg-emerald-500' : 'bg-amber-500';

    return (
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl shadow-xl overflow-hidden text-white border border-indigo-900/50">
            {/* Header Section */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10">
                    <Compass size={180} className="animate-[spin_60s_linear_infinite]" />
                </div>

                <div className="relative z-10 flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-400/30 backdrop-blur-sm shadow-inner">
                        <Compass className="w-8 h-8 text-indigo-300" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300">
                            La Brújula del Éxito
                        </h2>
                        <p className="text-indigo-200/60 text-sm font-semibold tracking-wider uppercase">Panel de Alineación Estratégica</p>
                    </div>
                </div>

                {/* KPI: Alignment Score */}
                <div className="relative z-10 hidden md:block text-right">
                    <p className="text-xs text-indigo-300/70 font-bold uppercase tracking-widest mb-1">Índice de Alineación</p>
                    <div className="flex items-baseline gap-1 justify-end">
                        <span className={`text-4xl font-black tracking-tighter ${isCritical ? 'text-rose-400' : isOnTrack ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                            {alignmentPercent}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Col 1: Phase and Milestones */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Phase Tracker */}
                    <div className="bg-black/20 rounded-xl p-5 border border-white/5 backdrop-blur-sm">
                        <h3 className="text-sm font-bold text-indigo-300 mb-4 flex items-center gap-2">
                            <PlayCircle className="w-4 h-4" /> Trayectoria de Fases
                        </h3>
                        <div className="flex justify-between items-center relative">
                            <div className="absolute left-0 top-1/2 -mt-[1px] w-full h-[2px] bg-slate-800 rounded-full" />
                            {PHASE_NAMES.map((phase, idx) => {
                                const isPast = idx < activePhaseIndex;
                                const isCurrent = idx === activePhaseIndex;

                                return (
                                    <div key={idx} className="relative z-10 flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isPast ? 'bg-indigo-600 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)]' :
                                            isCurrent ? 'bg-sky-500 border-sky-300 shadow-[0_0_20px_rgba(14,165,233,0.8)] scale-110' :
                                                'bg-slate-900 border-slate-700 text-slate-500'
                                            }`}>
                                            {isPast ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                                        </div>
                                        <span className={`mt-2 text-[10px] sm:text-xs font-bold w-20 text-center ${isCurrent ? 'text-sky-300' : isPast ? 'text-indigo-300/80' : 'text-slate-600'
                                            }`}>
                                            {phase.split(':')[0]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 text-center">
                            <span className="inline-block px-3 py-1 bg-sky-500/10 border border-sky-400/20 rounded-full text-xs font-bold text-sky-300">
                                Actualmente en: {PHASE_NAMES[activePhaseIndex] || 'Fase No Definida'}
                            </span>
                        </div>
                    </div>

                    {/* Goal Progress Bar */}
                    <div className="bg-black/20 rounded-xl p-5 border border-white/5 backdrop-blur-sm">
                        <div className="flex justify-between items-end mb-2">
                            <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                                <Target className="w-4 h-4" /> Avance de Hitos
                            </h3>
                            <span className="text-2xl font-black text-white">{completedMilestones}<span className="text-slate-500 text-lg">/{totalMilestones}</span></span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-3 mb-2 overflow-hidden border border-slate-700">
                            <div
                                className={`h-3 rounded-full ${progressColor} transition-all duration-1000 ease-out`}
                                style={{ width: `${totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0}%` }}
                            >
                                <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCA4TDggMFpNMCA0TDQgMFpNOCA0TDQgOFoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMiIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+Cjwvc3ZnPg==')] opacity-50" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Col 2: Alerts & Actions */}
                <div className="space-y-4">
                    {/* Status Panel */}
                    <div className={`rounded-xl p-5 border backdrop-blur-sm ${isCritical ? 'bg-rose-500/10 border-rose-500/30' :
                        isOnTrack ? 'bg-emerald-500/10 border-emerald-500/30' :
                            'bg-amber-500/10 border-amber-500/30'
                        }`}>
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${isCritical ? 'bg-rose-500/20 text-rose-400' :
                                isOnTrack ? 'bg-emerald-500/20 text-emerald-400' :
                                    'bg-amber-500/20 text-amber-400'
                                }`}>
                                {isCritical ? <AlertOctagon size={24} /> : isOnTrack ? <TrendingUp size={24} /> : <AlertTriangle size={24} />}
                            </div>
                            <div>
                                <h4 className={`font-bold ${isCritical ? 'text-rose-300' : isOnTrack ? 'text-emerald-300' : 'text-amber-300'
                                    }`}>
                                    {isCritical ? 'Desvío Estratégico Crítico' : isOnTrack ? 'Rumbo Excelente' : 'Rumbo con Fricciones'}
                                </h4>
                                <p className={`text-xs mt-1 leading-relaxed ${isCritical ? 'text-rose-200/80' : isOnTrack ? 'text-emerald-200/80' : 'text-amber-200/80'
                                    }`}>
                                    {deviationAlert || (isOnTrack ? 'El cliente está mostrando una excelente adherencia a los innegociables y progresando adecuadamente en los hitos.' : 'Hay señales de advertencia en el progreso. Revisa los innegociables o los hitos recientes.')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5 backdrop-blur-sm space-y-2">
                        <button
                            onClick={onViewRoadmap}
                            className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-indigo-200 transition-colors flex justify-between items-center group border border-transparent hover:border-white/10"
                        >
                            Ver Camino al Éxito Completo
                            <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <button
                            onClick={onEditMilestones}
                            className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-indigo-200 transition-colors flex justify-between items-center group border border-transparent hover:border-white/10"
                        >
                            Editar Hitos de S.M.A.R.T
                            <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                        {isCritical && (
                            <button
                                onClick={onEmergencyCall}
                                className="w-full text-left px-4 py-3 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-sm font-bold text-rose-300 transition-colors flex justify-between items-center border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                            >
                                Llamada de Re-alineación SOS
                                <AlertOctagon className="w-4 h-4 animate-pulse" />
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

// Helper component for small chevron icon
function ChevronRight(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m9 18 6-6-6-6" />
        </svg>
    );
}
