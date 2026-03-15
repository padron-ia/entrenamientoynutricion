import React from 'react';
import { CheckCircle2, Clock, Scale, AlertCircle, Calendar, Video } from 'lucide-react';

interface WeekSummaryCardProps {
    programWeek: { current: number; total: number } | null;
    lastWeightDate: Date | null;
    currentWeight: number;
    lastCheckinDate: Date | null;
    checkinPending: boolean;
}

export function WeekSummaryCard({
    programWeek,
    lastWeightDate,
    currentWeight,
    lastCheckinDate,
    checkinPending,
}: WeekSummaryCardProps) {
    const daysSinceCheckin = lastCheckinDate
        ? Math.floor((new Date().getTime() - lastCheckinDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const daysSinceWeight = lastWeightDate
        ? Math.floor((new Date().getTime() - lastWeightDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const weekProgress = programWeek
        ? Math.round((programWeek.current / programWeek.total) * 100)
        : 0;

    const circumference = 2 * Math.PI * 26;

    return (
        <div className="glass rounded-3xl p-6 shadow-card">
            {/* Header: semana del programa */}
            {programWeek ? (
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xs text-sea-400 font-bold uppercase tracking-wider mb-1">Esta semana</p>
                        <h3 className="text-2xl font-bold text-sea-900">
                            Semana {programWeek.current}
                            <span className="text-base font-medium text-sea-400 ml-1.5">de {programWeek.total}</span>
                        </h3>
                    </div>

                    {/* Anillo de progreso del programa */}
                    <div className="relative w-14 h-14 shrink-0">
                        <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 56 56">
                            <circle cx="28" cy="28" r="26" stroke="hsl(210, 35%, 91%)" strokeWidth="4" fill="none" />
                            <circle
                                cx="28" cy="28" r="26"
                                stroke="hsl(210, 45%, 40%)"
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray={`${(weekProgress / 100) * circumference} ${circumference}`}
                                strokeLinecap="round"
                                className="transition-all duration-700"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-sea-700">
                            {weekProgress}%
                        </span>
                    </div>
                </div>
            ) : (
                <div className="mb-4">
                    <p className="text-xs text-sea-400 font-bold uppercase tracking-wider mb-1">Esta semana</p>
                    <h3 className="text-xl font-bold text-sea-900">Programa activo</h3>
                </div>
            )}

            {/* Barra de progreso lineal */}
            {programWeek && (
                <div className="w-full bg-sea-100 rounded-full h-1.5 mb-5 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-sea-500 to-accent-500 transition-all duration-700"
                        style={{ width: `${weekProgress}%` }}
                    />
                </div>
            )}

            {/* Pills de estado */}
            <div className="grid grid-cols-2 gap-3">

                {/* Check-in */}
                <div className={`p-4 rounded-2xl border-2 transition-colors ${
                    checkinPending
                        ? 'border-amber-200 bg-amber-50'
                        : lastCheckinDate
                            ? 'border-accent-100 bg-accent-50/50'
                            : 'border-sea-100 bg-sea-50'
                }`}>
                    <div className="flex items-center gap-1.5 mb-2">
                        {checkinPending
                            ? <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            : lastCheckinDate
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-accent-500" />
                                : <Clock className="w-3.5 h-3.5 text-sea-400" />
                        }
                        <p className="text-[10px] font-bold uppercase tracking-wider text-sea-400">Check-in</p>
                    </div>
                    <p className={`font-bold text-sm leading-tight ${
                        checkinPending ? 'text-amber-700' : lastCheckinDate ? 'text-accent-700' : 'text-sea-500'
                    }`}>
                        {checkinPending
                            ? 'Pendiente'
                            : lastCheckinDate
                                ? 'Enviado'
                                : 'Sin enviar'}
                    </p>
                    <p className="text-xs text-sea-400 mt-0.5">
                        {checkinPending
                            ? 'Tu coach te espera'
                            : daysSinceCheckin !== null
                                ? daysSinceCheckin === 0 ? 'Hoy' : `hace ${daysSinceCheckin} días`
                                : '—'}
                    </p>
                </div>

                {/* Último peso */}
                <div className="p-4 rounded-2xl border-2 border-sea-100 bg-sea-50">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Scale className="w-3.5 h-3.5 text-sea-500" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-sea-400">Peso actual</p>
                    </div>
                    <p className="font-bold text-sm text-sea-800 leading-tight">
                        {currentWeight ? `${currentWeight} kg` : '—'}
                    </p>
                    <p className="text-xs text-sea-400 mt-0.5">
                        {daysSinceWeight !== null
                            ? daysSinceWeight === 0
                                ? 'Registrado hoy'
                                : `hace ${daysSinceWeight} días`
                            : 'Sin registros'}
                    </p>
                </div>
            </div>
        </div>
    );
}
