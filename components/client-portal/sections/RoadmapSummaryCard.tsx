import React from 'react';
import { Sparkles, Target, Footprints, Dumbbell, Utensils, MessageSquare, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { Client } from '../../../types';

export interface RoadmapSummaryCardProps {
    client: Client;
    onViewDetails?: () => void;
}

export function RoadmapSummaryCard({ client, onViewDetails }: RoadmapSummaryCardProps) {
    const roadmapData = client.roadmap_data;
    if (!roadmapData) return null;

    const { dream_result, commitment, milestones } = roadmapData;

    return (
        <div className="glass rounded-3xl p-6 sm:p-8 shadow-card space-y-8 overflow-hidden relative border border-white/20">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-sea-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-accent-500" /> Tu Camino al Éxito
                </h3>
                {onViewDetails && (
                    <button
                        onClick={onViewDetails}
                        className="text-xs font-bold uppercase tracking-wider text-accent-600 bg-accent-50 hover:bg-accent-100 px-4 py-2 rounded-xl transition-colors border border-accent-100 shadow-sm flex items-center gap-2 max-w-fit"
                    >
                        Ver Brújula Detallada →
                    </button>
                )}
            </div>

            {/* Dream Result */}
            {dream_result && (dream_result.goal || dream_result.perfect_day) && (
                <div className="bg-gradient-to-br from-accent-50 to-white p-6 rounded-2xl border border-accent-100 shadow-sm space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-accent-500/5 rounded-full blur-xl"></div>
                    <div className="flex items-center gap-2 text-accent-700 font-bold uppercase tracking-wider text-xs">
                        <Target className="w-4 h-4" /> El Resultado Soñado
                    </div>
                    {dream_result.goal && (
                        <div className="space-y-1">
                            <p className="text-[10px] text-sea-400 font-bold uppercase tracking-tight">Mi Gran Objetivo</p>
                            <p className="text-sea-800 text-sm font-medium leading-relaxed italic">"{dream_result.goal}"</p>
                        </div>
                    )}
                    {dream_result.perfect_day && (
                        <div className="space-y-1">
                            <p className="text-[10px] text-sea-400 font-bold uppercase tracking-tight">Mi Día Perfecto</p>
                            <p className="text-sea-800 text-sm font-medium leading-relaxed italic">"{dream_result.perfect_day}"</p>
                        </div>
                    )}
                </div>
            )}

            {/* Commitments Bar */}
            {commitment && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-sea-50/50 p-4 rounded-2xl border border-sea-100 flex flex-col items-center text-center backdrop-blur-sm group hover:bg-sea-50 transition-colors">
                        <Footprints className="w-5 h-5 text-sea-500 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-[9px] text-sea-400 font-extrabold uppercase mb-1 tracking-tighter">Pasos</p>
                        <p className="text-lg font-black text-sea-900">{(commitment.pasos || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-sea-50/50 p-4 rounded-2xl border border-sea-100 flex flex-col items-center text-center backdrop-blur-sm group hover:bg-sea-50 transition-colors">
                        <Dumbbell className="w-5 h-5 text-sea-500 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-[9px] text-sea-400 font-extrabold uppercase mb-1 tracking-tighter">Entreno</p>
                        <p className="text-lg font-black text-sea-900">{commitment.dias_ejercicio || 0} d/sem</p>
                    </div>
                    <div className="bg-sea-50/50 p-4 rounded-2xl border border-sea-100 flex flex-col items-center text-center backdrop-blur-sm group hover:bg-sea-50 transition-colors">
                        <Utensils className="w-5 h-5 text-sea-500 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-[9px] text-sea-400 font-extrabold uppercase mb-1 tracking-tighter">Dieta</p>
                        <p className="text-xs font-black text-sea-900 leading-tight">{commitment.pesar_comida_compromiso === 'Sí' ? 'PESAR SIEMPRE' : 'FLEXIBLE'}</p>
                    </div>
                    <div className="bg-sea-50/50 p-4 rounded-2xl border border-sea-100 flex flex-col items-center text-center backdrop-blur-sm group hover:bg-sea-50 transition-colors">
                        <MessageSquare className="w-5 h-5 text-sea-500 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-[9px] text-sea-400 font-extrabold uppercase mb-1 tracking-tighter">Comunicación</p>
                        <p className="text-xs font-black text-sea-900 leading-tight">{commitment.reporte_telegram_compromiso === 'Sí' ? 'REPORTE DIARIO' : 'OCASIONAL'}</p>
                    </div>
                </div>
            )}

            {/* Milestones / Road to Success */}
            {milestones && milestones.length > 0 && (
                <div className="space-y-4 relative">
                    <h4 className="text-[10px] font-black text-sea-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                        <Calendar className="w-3.5 h-3.5" /> Plan de Hitos
                    </h4>
                    <div className="space-y-3">
                        {milestones.map((m) => (
                            <div key={m.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${m.status === 'completed' ? 'bg-accent-50/50 border-accent-100' :
                                m.status === 'current' ? 'bg-sea-50 border-sea-200 ring-4 ring-sea-500/5 shadow-md scale-[1.02]' : 'bg-white border-sea-50'
                                }`}>
                                <div className="shrink-0">
                                    {m.status === 'completed' ? (
                                        <div className="w-10 h-10 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center shadow-sm">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                    ) : m.status === 'current' ? (
                                        <div className="w-10 h-10 rounded-full bg-sea-100 text-sea-600 flex items-center justify-center shadow-sm relative">
                                            <Target className="w-6 h-6" />
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sea-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-sea-500"></span>
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-white border-2 border-sea-50 text-sea-200 flex items-center justify-center">
                                            <Circle className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-bold truncate ${m.status === 'completed' ? 'text-accent-700' : 'text-sea-900'}`}>
                                        {m.title}
                                    </p>
                                    <p className="text-[10px] text-sea-400 font-bold uppercase tracking-tight">
                                        {new Date(m.target_date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="pt-4 border-t border-sea-50 flex items-center justify-center">
                <p className="text-[9px] text-sea-300 font-bold uppercase tracking-widest flex items-center gap-1.5 leading-none">
                    <Calendar className="w-3 h-3" />
                    Actualizado el {new Date(roadmapData.last_updated).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>
        </div>
    );
}
