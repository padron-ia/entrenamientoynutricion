import React from 'react';
import {
    Heart, Calendar, CheckCircle2, Scale, Clock, Video, ExternalLink, Loader2, Check
} from 'lucide-react';
import { Client } from '../../../types';

interface HealthDataGridProps {
    client: Client;
    medical: any;
    programWeek: { current: number; total: number } | null;
    lastCheckinDate: Date | null;
    lastWeightDate: Date | null;
    weightHistory: any[];
    // Medication editing
    isEditingMedication: boolean;
    setIsEditingMedication: (v: boolean) => void;
    medicationValue: string;
    setMedicationValue: (v: string) => void;
    isSavingMedication: boolean;
    handleMedicationSave: () => void;
}

export function HealthDataGrid({
    client, medical, programWeek, lastCheckinDate, lastWeightDate, weightHistory,
    isEditingMedication, setIsEditingMedication, medicationValue, setMedicationValue,
    isSavingMedication, handleMedicationSave,
}: HealthDataGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Health Card */}
            <div className="glass rounded-3xl p-6 shadow-card">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-sea-50">
                    <div className="bg-sea-50 p-2 rounded-xl text-sea-500"><Heart className="w-5 h-5" /></div>
                    <h3 className="font-bold text-sea-900">Ficha de Salud</h3>
                </div>
                <div className="space-y-4 text-sm">
                    <div>
                        <p className="text-xs text-sea-400 font-bold uppercase mb-1">Diabetes</p>
                        <p className="font-medium text-sea-900 flex items-center gap-2">
                            {medical.diabetesType || 'No especificada'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-sea-400 font-bold uppercase mb-1">Glicosilada (HbA1c)</p>
                        <p className="font-medium text-sea-900">{medical.lastHba1c ? `${medical.lastHba1c}%` : '--'}</p>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-sea-400 font-bold uppercase">Medicación</p>
                            {!isEditingMedication && (
                                <button
                                    onClick={() => {
                                        setMedicationValue(medical.medication || '');
                                        setIsEditingMedication(true);
                                    }}
                                    className="text-xs text-accent-500 hover:text-accent-600 font-medium"
                                >
                                    Editar
                                </button>
                            )}
                        </div>
                        {isEditingMedication ? (
                            <div className="space-y-2">
                                <textarea
                                    value={medicationValue}
                                    onChange={(e) => setMedicationValue(e.target.value)}
                                    className="w-full p-3 border border-sea-200 rounded-lg text-sm focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                                    rows={4}
                                    placeholder="Escribe tu medicación actual..."
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleMedicationSave}
                                        disabled={isSavingMedication}
                                        className="flex-1 px-3 py-2 bg-sea-600 text-white rounded-lg text-sm font-medium hover:bg-sea-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSavingMedication ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                        ) : (
                                            <><Check className="w-4 h-4" /> Guardar</>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setIsEditingMedication(false)}
                                        className="px-3 py-2 border border-sea-200 text-sea-600 rounded-lg text-sm font-medium hover:bg-sea-50"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="font-medium text-sea-600 bg-sea-50 p-3 rounded-lg leading-relaxed">
                                {medical.medication || 'Sin medicación registrada'}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Activity Summary Card */}
            <div className="glass rounded-3xl p-6 shadow-card">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-sea-50">
                    <div className="bg-sea-50 p-2 rounded-xl text-sea-500"><Calendar className="w-5 h-5" /></div>
                    <h3 className="font-bold text-sea-900">Tu Actividad</h3>
                </div>
                <div className="space-y-4 text-sm">
                    {/* Program Week */}
                    {programWeek && (
                        <div className="bg-gradient-to-r from-sea-50 to-accent-50 p-4 rounded-xl border border-sea-100">
                            <p className="text-xs text-sea-600 font-bold uppercase mb-1">Semana del Programa</p>
                            <div className="flex items-center justify-between">
                                <p className="font-bold text-sea-900 text-2xl">
                                    {programWeek.current} <span className="text-sm font-medium text-sea-400">de {programWeek.total}</span>
                                </p>
                                <div className="w-16 h-16 relative">
                                    <svg className="w-16 h-16 transform -rotate-90">
                                        <circle cx="32" cy="32" r="28" stroke="hsl(210, 35%, 91%)" strokeWidth="6" fill="none" />
                                        <circle
                                            cx="32" cy="32" r="28"
                                            stroke="hsl(210, 45%, 40%)"
                                            strokeWidth="6"
                                            fill="none"
                                            strokeDasharray={`${(programWeek.current / programWeek.total) * 176} 176`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-sea-600">
                                        {Math.round((programWeek.current / programWeek.total) * 100)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Last Check-in */}
                    <div className="flex items-center justify-between p-3 bg-sea-50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${lastCheckinDate ? 'bg-accent-100 text-accent-600' : 'bg-sea-200 text-sea-400'}`}>
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-sea-400 font-bold uppercase">Último Check-in</p>
                                <p className="font-medium text-sea-700">
                                    {lastCheckinDate ? lastCheckinDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Sin registros'}
                                </p>
                            </div>
                        </div>
                        {lastCheckinDate && (
                            <span className="text-xs text-sea-400">
                                hace {Math.floor((new Date().getTime() - lastCheckinDate.getTime()) / (1000 * 60 * 60 * 24))} días
                            </span>
                        )}
                    </div>
                    {/* Last Weight */}
                    <div className="flex items-center justify-between p-3 bg-sea-50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${lastWeightDate ? 'bg-sea-100 text-sea-600' : 'bg-sea-200 text-sea-400'}`}>
                                <Scale className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-sea-400 font-bold uppercase">Último Peso</p>
                                <p className="font-medium text-sea-700">
                                    {lastWeightDate ? `${weightHistory[0].weight} kg` : 'Sin registros'}
                                </p>
                            </div>
                        </div>
                        {lastWeightDate && (
                            <span className="text-xs text-sea-400">
                                {lastWeightDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                        )}
                    </div>
                    {/* Next Appointment */}
                    {(client as any).next_appointment_date && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-amber-600 font-bold uppercase">Próxima Cita</p>
                                        <p className="font-medium text-amber-900">
                                            {new Date((client as any).next_appointment_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                                            {(client as any).next_appointment_time && (
                                                <span className="font-bold"> - {(client as any).next_appointment_time}h</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-lg">
                                    {(() => {
                                        const days = Math.ceil((new Date((client as any).next_appointment_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                        return days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`;
                                    })()}
                                </span>
                            </div>
                            {(client as any).next_appointment_note && (
                                <p className="text-sm text-amber-700 mt-2 pl-12 italic">
                                    "{(client as any).next_appointment_note}"
                                </p>
                            )}
                            {(client as any).next_appointment_link && (
                                <div className="mt-3 pl-12">
                                    <a
                                        href={(client as any).next_appointment_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 shadow-sm transition-all"
                                    >
                                        <Video className="w-4 h-4" />
                                        Unirse a la reunión
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
