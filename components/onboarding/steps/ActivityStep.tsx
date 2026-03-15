import React from 'react';
import { Activity, Dumbbell, Briefcase } from 'lucide-react';

interface Props {
    formData: any;
    updateField: (field: string, value: any) => void;
}

export function ActivityStep({ formData, updateField }: Props) {
    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Actividad Física</h3>
                <p className="text-slate-600">Información sobre tu nivel de actividad actual</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Pasos diarios aproximados *
                </label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                    value={formData.dailySteps}
                    onChange={(e) => updateField('dailySteps', e.target.value)}
                >
                    <option value="">-- Selecciona --</option>
                    <option value="Menos de 3.000">Menos de 3.000 pasos</option>
                    <option value="Entre 3.000 y 5.000">Entre 3.000 y 5.000 pasos</option>
                    <option value="Entre 5.000 y 8.000">Entre 5.000 y 8.000 pasos</option>
                    <option value="Más de 8.000">Más de 8.000 pasos</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Horario de trabajo y disponibilidad para ejercicio *
                </label>
                <textarea
                    required
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none"
                    value={formData.workSchedule}
                    onChange={(e) => updateField('workSchedule', e.target.value)}
                    placeholder="Ej: Trabajo de 9 a 17h, disponible para ejercicio de 18 a 20h y fines de semana por la mañana"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Tu trabajo es... *
                </label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                    value={formData.workType}
                    onChange={(e) => updateField('workType', e.target.value)}
                >
                    <option value="">-- Selecciona --</option>
                    <option value="Sedentario">Sedentario (oficina, escritorio)</option>
                    <option value="Activo">Activo (de pie, movimiento constante)</option>
                    <option value="Sedentario pero puedo moverme">Sedentario pero puedo regular mi horario para moverme más</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    ¿Has hecho ejercicio de fuerza antes? *
                </label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                    value={formData.hasStrengthTraining}
                    onChange={(e) => updateField('hasStrengthTraining', e.target.value)}
                >
                    <option value="">-- Selecciona --</option>
                    <option value="Nunca">Nunca, hasta ahora solo andar</option>
                    <option value="Hace tiempo">Sí, hace tiempo</option>
                    <option value="Actualmente">Sí, actualmente lo hago</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    ¿Dónde harías el ejercicio? *
                </label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                    value={formData.exerciseLocation}
                    onChange={(e) => updateField('exerciseLocation', e.target.value)}
                >
                    <option value="">-- Selecciona --</option>
                    <option value="Casa">En casa</option>
                    <option value="Gimnasio">En el gimnasio</option>
                    <option value="Ambos">Ambos (casa y gimnasio)</option>
                </select>
            </div>
        </div>
    );
}
