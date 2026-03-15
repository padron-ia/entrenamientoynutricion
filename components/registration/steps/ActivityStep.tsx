import React from 'react';
import { Footprints, Briefcase, Dumbbell, MapPin } from 'lucide-react';

interface Props {
    formData: any;
    updateField: (field: string, value: any) => void;
}

export function ActivityStep({ formData, updateField }: Props) {
    const dailyStepsOptions = [
        'Menos de 3.000',
        '3.000 - 5.000',
        '5.000 - 7.000',
        '7.000 - 10.000',
        'Más de 10.000'
    ];

    const workScheduleOptions = [
        'Mañana (8-15h)',
        'Tarde (15-22h)',
        'Noche',
        'Jornada partida',
        'Turno rotativo'
    ];

    const workTypeOptions = [
        'Sedentario (oficina)',
        'Moderadamente activo',
        'Muy activo (físico)'
    ];

    const strengthTrainingOptions = [
        'Sí, con experiencia',
        'Sí, pero soy principiante',
        'No'
    ];

    const exerciseLocationOptions = [
        'Casa',
        'Gimnasio',
        'Ambos'
    ];

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Actividad Física</h3>
                <p className="text-slate-600">Cuéntanos sobre tu nivel de actividad y rutinas</p>
            </div>

            {/* Pasos diarios */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    <Footprints className="w-4 h-4 inline-block mr-1 text-accent-600" />
                    Pasos diarios aproximados *
                </label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all bg-white"
                    value={formData.dailySteps}
                    onChange={(e) => updateField('dailySteps', e.target.value)}
                >
                    <option value="">Selecciona una opción</option>
                    {dailyStepsOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            {/* Horario laboral */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    <Briefcase className="w-4 h-4 inline-block mr-1 text-accent-600" />
                    Horario laboral *
                </label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all bg-white"
                    value={formData.workSchedule}
                    onChange={(e) => updateField('workSchedule', e.target.value)}
                >
                    <option value="">Selecciona una opción</option>
                    {workScheduleOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            {/* Tipo de trabajo */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Tipo de actividad laboral *
                </label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all bg-white"
                    value={formData.workType}
                    onChange={(e) => updateField('workType', e.target.value)}
                >
                    <option value="">Selecciona una opción</option>
                    {workTypeOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            {/* Entrenamiento de fuerza */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    <Dumbbell className="w-4 h-4 inline-block mr-1 text-accent-600" />
                    ¿Realizas entrenamiento de fuerza? *
                </label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all bg-white"
                    value={formData.hasStrengthTraining}
                    onChange={(e) => updateField('hasStrengthTraining', e.target.value)}
                >
                    <option value="">Selecciona una opción</option>
                    {strengthTrainingOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            {/* Lugar de ejercicio */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    <MapPin className="w-4 h-4 inline-block mr-1 text-accent-600" />
                    ¿Dónde prefieres entrenar? *
                </label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all bg-white"
                    value={formData.exerciseLocation}
                    onChange={(e) => updateField('exerciseLocation', e.target.value)}
                >
                    <option value="">Selecciona una opción</option>
                    {exerciseLocationOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
