import React from 'react';
import { Target, Calendar, Star, MessageSquare } from 'lucide-react';

interface Props {
    formData: any;
    updateField: (field: string, value: any) => void;
}

export function GoalsStep({ formData, updateField }: Props) {
    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Tus Objetivos</h3>
                <p className="text-slate-600">Cuéntanos qué quieres conseguir para poder ayudarte mejor</p>
            </div>

            {/* Objetivo 3 meses */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    <Target className="w-4 h-4 inline-block mr-1 text-accent-600" />
                    ¿Qué te gustaría conseguir en 3 meses? *
                </label>
                <textarea
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
                    rows={3}
                    value={formData.goal3Months}
                    onChange={(e) => updateField('goal3Months', e.target.value)}
                    placeholder="Ej: Perder 5 kg, mejorar mis niveles de glucosa, crear hábitos de ejercicio..."
                />
            </div>

            {/* Objetivo 6 meses */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    <Calendar className="w-4 h-4 inline-block mr-1 text-accent-600" />
                    ¿Qué te gustaría conseguir en 6 meses? *
                </label>
                <textarea
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
                    rows={3}
                    value={formData.goal6Months}
                    onChange={(e) => updateField('goal6Months', e.target.value)}
                    placeholder="Ej: Reducir mi HbA1c, ganar masa muscular, sentirme con más energía..."
                />
            </div>

            {/* Objetivo 1 año */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    <Star className="w-4 h-4 inline-block mr-1 text-accent-600" />
                    ¿Qué te gustaría conseguir en 1 año? *
                </label>
                <textarea
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
                    rows={3}
                    value={formData.goal1Year}
                    onChange={(e) => updateField('goal1Year', e.target.value)}
                    placeholder="Ej: Tener un estilo de vida saludable, controlar mi diabetes sin esfuerzo..."
                />
            </div>

            {/* Por qué confías en nosotros */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    ¿Por qué has decidido confiar en nosotros?
                </label>
                <textarea
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
                    rows={3}
                    value={formData.whyTrustUs}
                    onChange={(e) => updateField('whyTrustUs', e.target.value)}
                    placeholder="Ej: Me recomendó un amigo, vi vuestros resultados en redes sociales..."
                />
            </div>

            {/* Comentarios adicionales */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    <MessageSquare className="w-4 h-4 inline-block mr-1 text-accent-600" />
                    ¿Algo más que quieras contarnos?
                </label>
                <textarea
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
                    rows={4}
                    value={formData.additionalComments}
                    onChange={(e) => updateField('additionalComments', e.target.value)}
                    placeholder="Cualquier información adicional que creas relevante para que te conozcamos mejor..."
                />
            </div>

            <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
                <p className="text-sm text-accent-900">
                    <strong>Recuerda:</strong> No hay respuestas correctas o incorrectas. Cuanto más detallado seas, mejor podremos personalizar tu plan.
                </p>
            </div>
        </div>
    );
}
