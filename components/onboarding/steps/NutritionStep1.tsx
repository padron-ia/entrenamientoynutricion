import React from 'react';
import { Apple } from 'lucide-react';

interface Props {
    formData: any;
    updateField: (field: string, value: any) => void;
    toggleArrayField: (field: string, value: string) => void;
}

export function NutritionStep1({ formData, updateField, toggleArrayField }: Props) {
    const dietaryPreferencesList = ['Dieta Flexible', 'Vegetariana', 'Vegana', 'Sin gluten', 'Sin lactosa', 'Otras'];
    const regularFoodsList = [
        'Carnes (pollo, pavo, cerdo, conejo)',
        'Pescados',
        'Legumbres',
        'Huevos',
        'Leche, yogur y queso',
        'Pan',
        'Chocolate 70-85%',
        'Fiambres',
        'Verduras',
        'Frutas',
        'Patata y boniato',
        'Pasta',
        'Arroz',
        'Frutos secos'
    ];
    const allergiesList = ['Ninguna', 'Gluten', 'Lactosa', 'Frutos secos', 'Marisco', 'Huevo', 'Otras'];

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Nutrición - Parte 1</h3>
                <p className="text-slate-600">Preferencias y hábitos alimenticios</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                    Preferencias dietéticas *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {dietaryPreferencesList.map(pref => (
                        <label key={pref} className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.dietaryPreferences.includes(pref)}
                                onChange={() => toggleArrayField('dietaryPreferences', pref)}
                                className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <span className="text-sm">{pref}</span>
                        </label>
                    ))}
                </div>
                {formData.dietaryPreferences.includes('Otras') && (
                    <input
                        type="text"
                        className="w-full mt-3 px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.otherDietaryPreferences}
                        onChange={(e) => updateField('otherDietaryPreferences', e.target.value)}
                        placeholder="Especifica..."
                    />
                )}
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Alimentos que NO quieres ver en tu plan *
                </label>
                <textarea
                    required
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none"
                    value={formData.unwantedFoods}
                    onChange={(e) => updateField('unwantedFoods', e.target.value)}
                    placeholder="Ej: Brócoli, coliflor, pescado azul..."
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                    Alimentos que consumes regularmente (2+ veces/semana) *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {regularFoodsList.map(food => (
                        <label key={food} className="flex items-center gap-2 p-2 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.regularFoods.includes(food)}
                                onChange={() => toggleArrayField('regularFoods', food)}
                                className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <span className="text-sm">{food}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                    Alergias o Intolerancias *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {allergiesList.map(allergy => (
                        <label key={allergy} className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.allergies.includes(allergy)}
                                onChange={() => toggleArrayField('allergies', allergy)}
                                className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <span className="text-sm">{allergy}</span>
                        </label>
                    ))}
                </div>
                {formData.allergies.includes('Otras') && (
                    <input
                        type="text"
                        className="w-full mt-3 px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.otherAllergies}
                        onChange={(e) => updateField('otherAllergies', e.target.value)}
                        placeholder="Especifica otras alergias..."
                    />
                )}
            </div>
        </div>
    );
}
