import React from 'react';
import { NutritionAssessmentData } from '../NutritionAssessmentForm';

interface SectionProps {
    formData: NutritionAssessmentData;
    updateField: (field: keyof NutritionAssessmentData, value: any) => void;
    toggleArrayField: (field: keyof NutritionAssessmentData, value: string) => void;
}

export function DietaryPreferencesSection({ formData, updateField, toggleArrayField }: SectionProps) {
    const preferenceOptions = [
        { value: 'ninguna', label: 'Ninguna restricción' },
        { value: 'vegetariano', label: 'Vegetariano' },
        { value: 'vegano', label: 'Vegano' },
        { value: 'sin_gluten', label: 'Sin gluten' },
        { value: 'sin_lactosa', label: 'Sin lactosa' },
        { value: 'paleo', label: 'Paleo' },
        { value: 'keto', label: 'Keto' },
        { value: 'mediterranea', label: 'Mediterránea' },
        { value: 'otra', label: 'Otra' }
    ];

    const regularFoodOptions = [
        { value: 'frutas', label: '🍎 Frutas' },
        { value: 'verduras', label: '🥗 Verduras' },
        { value: 'legumbres', label: '🫘 Legumbres' },
        { value: 'cereales_integrales', label: '🌾 Cereales integrales' },
        { value: 'cereales_refinados', label: '🍞 Cereales refinados' },
        { value: 'carnes_rojas', label: '🥩 Carnes rojas' },
        { value: 'carnes_blancas', label: '🍗 Carnes blancas' },
        { value: 'pescado', label: '🐟 Pescado' },
        { value: 'huevos', label: '🥚 Huevos' },
        { value: 'lacteos', label: '🥛 Lácteos' },
        { value: 'frutos_secos', label: '🥜 Frutos secos' },
        { value: 'dulces', label: '🍰 Dulces' },
        { value: 'procesados', label: '🍕 Alimentos procesados' }
    ];

    const allergyOptions = [
        { value: 'ninguna', label: 'Ninguna' },
        { value: 'lactosa', label: 'Lactosa' },
        { value: 'gluten', label: 'Gluten' },
        { value: 'frutos_secos', label: 'Frutos secos' },
        { value: 'mariscos', label: 'Mariscos' },
        { value: 'huevo', label: 'Huevo' },
        { value: 'soja', label: 'Soja' },
        { value: 'pescado', label: 'Pescado' },
        { value: 'otra', label: 'Otra' }
    ];

    return (
        <div className="space-y-6">
            {/* Preferencias Dietéticas */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                    ¿Sigues alguna preferencia o restricción dietética? *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {preferenceOptions.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleArrayField('dietaryPreferences', option.value)}
                            className={`p-3 rounded-lg border-2 transition-all text-left ${formData.dietaryPreferences.includes(option.value)
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                                    : 'border-slate-200 hover:border-emerald-300 bg-white'
                                }`}
                        >
                            <span className="font-medium">{option.label}</span>
                        </button>
                    ))}
                </div>
                {formData.dietaryPreferences.includes('otra') && (
                    <div className="mt-3">
                        <input
                            type="text"
                            value={formData.otherDietaryPreferences}
                            onChange={(e) => updateField('otherDietaryPreferences', e.target.value)}
                            placeholder="Especifica tu preferencia dietética..."
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                )}
            </div>

            {/* Alimentos que NO quiere comer */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    ¿Hay alimentos que NO quieras comer?
                </label>
                <p className="text-sm text-slate-500 mb-3">
                    Indica alimentos que prefieres evitar (por gusto, no por alergia)
                </p>
                <textarea
                    value={formData.unwantedFoods}
                    onChange={(e) => updateField('unwantedFoods', e.target.value)}
                    placeholder="Ej: No me gusta el brócoli, evito las berenjenas..."
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
            </div>

            {/* Alimentos que consume habitualmente */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                    ¿Qué alimentos consumes habitualmente? *
                </label>
                <p className="text-sm text-slate-500 mb-3">
                    Selecciona todos los que apliquen
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {regularFoodOptions.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleArrayField('regularFoods', option.value)}
                            className={`p-3 rounded-lg border-2 transition-all text-center ${formData.regularFoods.includes(option.value)
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                                    : 'border-slate-200 hover:border-emerald-300 bg-white'
                                }`}
                        >
                            <span className="text-sm font-medium">{option.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Alergias e Intolerancias */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                    ¿Tienes alguna alergia o intolerancia alimentaria? *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allergyOptions.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleArrayField('allergies', option.value)}
                            className={`p-3 rounded-lg border-2 transition-all text-left ${formData.allergies.includes(option.value)
                                    ? 'border-red-500 bg-red-50 text-red-900'
                                    : 'border-slate-200 hover:border-red-300 bg-white'
                                }`}
                        >
                            <span className="font-medium">{option.label}</span>
                        </button>
                    ))}
                </div>
                {formData.allergies.includes('otra') && (
                    <div className="mt-3">
                        <input
                            type="text"
                            value={formData.otherAllergies}
                            onChange={(e) => updateField('otherAllergies', e.target.value)}
                            placeholder="Especifica tu alergia o intolerancia..."
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                )}
            </div>

            {/* Ayuda */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                    <strong>💡 Consejo:</strong> Ser específico con tus preferencias y alergias nos ayuda a crear un plan nutricional más personalizado y seguro para ti.
                </p>
            </div>
        </div>
    );
}
