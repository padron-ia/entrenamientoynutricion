// ARCHIVO CONSOLIDADO - SEPARAR EN 4 ARCHIVOS INDIVIDUALES
// ActivityStep.tsx, NutritionStep1.tsx, NutritionStep2.tsx, GoalsStep.tsx

// ============================================
// ActivityStep.tsx
// ============================================
import React from 'react';
import { Activity, Dumbbell, Briefcase, Home } from 'lucide-react';
import { parseIntegerFromInput } from '../../../utils/numberParsing';

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

// ============================================
// NutritionStep1.tsx
// ============================================
export function NutritionStep1({ formData, updateField, toggleArrayField }: Props & { toggleArrayField: any }) {
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

// ============================================
// NutritionStep2.tsx
// ============================================
export function NutritionStep2({ formData, updateField, toggleArrayField }: Props & { toggleArrayField: any }) {
    const emotionalEatingList = [
        'Comer cuando estoy estresado',
        'Tengo antojos constantes',
        'Como por aburrimiento',
        'Como cuando estoy triste'
    ];

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Nutrición - Parte 2</h3>
                <p className="text-slate-600">Horarios y hábitos de comida</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    ¿Cuántas comidas haces al día? *
                </label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                    value={formData.mealsPerDay}
                    onChange={(e) => updateField('mealsPerDay', e.target.value)}
                >
                    <option value="">-- Selecciona --</option>
                    <option value="2-3 ingestas">2-3 ingestas al día</option>
                    <option value="4 ingestas">4 ingestas al día</option>
                    <option value="5 ingestas">5 ingestas al día</option>
                    <option value="Más de 5">Más de 5 ingestas al día</option>
                </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hora desayuno *</label>
                    <input
                        type="time"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.breakfastTime}
                        onChange={(e) => updateField('breakfastTime', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hora media mañana</label>
                    <input
                        type="time"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.midMorningTime}
                        onChange={(e) => updateField('midMorningTime', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hora comida *</label>
                    <input
                        type="time"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.lunchTime}
                        onChange={(e) => updateField('lunchTime', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hora merienda</label>
                    <input
                        type="time"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.snackTime}
                        onChange={(e) => updateField('snackTime', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hora cena *</label>
                    <input
                        type="time"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.dinnerTime}
                        onChange={(e) => updateField('dinnerTime', e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Cocinas tú mismo? *</label>
                    <select
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.cooksSelf}
                        onChange={(e) => updateField('cooksSelf', e.target.value)}
                    >
                        <option value="">-- Selecciona --</option>
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                        <option value="A veces">A veces</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Pesas la comida? *</label>
                    <select
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.weighsFood}
                        onChange={(e) => updateField('weighsFood', e.target.value)}
                    >
                        <option value="">-- Selecciona --</option>
                        <option value="Sí, siempre">Sí, siempre</option>
                        <option value="A veces">A veces</option>
                        <option value="No quiero pesar">No quiero pesar la comida</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Veces que comes fuera/semana *</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.eatsOutPerWeek}
                        onChange={(e) => updateField('eatsOutPerWeek', e.target.value ? parseIntegerFromInput(e.target.value) : '')}
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Pan con las comidas? *</label>
                    <select
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.eatsBread}
                        onChange={(e) => updateField('eatsBread', e.target.value)}
                    >
                        <option value="">-- Selecciona --</option>
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                    </select>
                </div>
            </div>

            {formData.eatsBread === 'Sí' && (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cantidad aproximada de pan *</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.breadAmount}
                        onChange={(e) => updateField('breadAmount', e.target.value)}
                        placeholder="Ej: 40-50 gramos"
                    />
                </div>
            )}

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">¿Picas entre horas? *</label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                    value={formData.snacksBetweenMeals}
                    onChange={(e) => updateField('snacksBetweenMeals', e.target.value)}
                >
                    <option value="">-- Selecciona --</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                </select>
            </div>

            {formData.snacksBetweenMeals === 'Sí' && (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Qué sueles picar? *</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.snackFoods}
                        onChange={(e) => updateField('snackFoods', e.target.value)}
                        placeholder="Ej: Fruta, frutos secos, galletas..."
                    />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Qué bebes con las comidas? *</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.drinkWithMeals}
                        onChange={(e) => updateField('drinkWithMeals', e.target.value)}
                        placeholder="Ej: Agua, refrescos, vino..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Alcohol semanal *</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.alcoholPerWeek}
                        onChange={(e) => updateField('alcoholPerWeek', e.target.value)}
                        placeholder="Ej: No bebo alcohol, 2 cervezas/semana..."
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">¿Tienes antojos? *</label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                    value={formData.hasCravings}
                    onChange={(e) => updateField('hasCravings', e.target.value)}
                >
                    <option value="">-- Selecciona --</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                </select>
            </div>

            {formData.hasCravings === 'Sí' && (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Qué comes cuando tienes antojos? *</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.cravingFoods}
                        onChange={(e) => updateField('cravingFoods', e.target.value)}
                        placeholder="Ej: Chocolate, pastel, helado..."
                    />
                </div>
            )}

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">¿Qué comiste en las últimas 24 horas? *</label>
                <textarea
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none"
                    value={formData.last24hMeals}
                    onChange={(e) => updateField('last24hMeals', e.target.value)}
                    placeholder="Describe todo lo que comiste ayer..."
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">¿Trastorno alimentario diagnosticado? *</label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                    value={formData.eatingDisorder}
                    onChange={(e) => updateField('eatingDisorder', e.target.value)}
                >
                    <option value="">-- Selecciona --</option>
                    <option value="No">No</option>
                    <option value="Sí">Sí</option>
                </select>
            </div>

            {formData.eatingDisorder === 'Sí' && (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Cuál? *</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                        value={formData.eatingDisorderType}
                        onChange={(e) => updateField('eatingDisorderType', e.target.value)}
                        placeholder="Especifica el trastorno..."
                    />
                </div>
            )}

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">¿Te sucede alguna de estas situaciones?</label>
                <div className="space-y-2">
                    {emotionalEatingList.map(situation => (
                        <label key={situation} className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.emotionalEating.includes(situation)}
                                onChange={() => toggleArrayField('emotionalEating', situation)}
                                className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <span className="text-sm">{situation}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================
// GoalsStep.tsx
// ============================================
export function GoalsStep({ formData, updateField, coachVideo }: Props & { coachVideo: string }) {
    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Tus Objetivos</h3>
                <p className="text-slate-600">Define tus metas y conoce a tu coach</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Objetivo a 3 meses *</label>
                <textarea
                    required
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none"
                    value={formData.goal3Months}
                    onChange={(e) => updateField('goal3Months', e.target.value)}
                    placeholder="Ej: Perder 5kg y mejorar mi HbA1c..."
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Objetivo a 6 meses *</label>
                <textarea
                    required
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none"
                    value={formData.goal6Months}
                    onChange={(e) => updateField('goal6Months', e.target.value)}
                    placeholder="Ej: Alcanzar mi peso objetivo..."
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Objetivo a 1 año *</label>
                <textarea
                    required
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none"
                    value={formData.goal1Year}
                    onChange={(e) => updateField('goal1Year', e.target.value)}
                    placeholder="Ej: Mantener el peso y tener hábitos saludables consolidados..."
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">¿Por qué decidiste confiar en nosotros? *</label>
                <textarea
                    required
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none"
                    value={formData.whyTrustUs}
                    onChange={(e) => updateField('whyTrustUs', e.target.value)}
                    placeholder="Cuéntanos qué te motivó a unirte..."
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Comentarios adicionales</label>
                <textarea
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none"
                    value={formData.additionalComments}
                    onChange={(e) => updateField('additionalComments', e.target.value)}
                    placeholder="Cualquier cosa que quieras que sepamos..."
                />
            </div>

            {coachVideo && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                    <h4 className="text-lg font-bold text-slate-900 mb-4 text-center">
                        🎥 Mensaje de Bienvenida de tu Coach
                    </h4>
                    <div className="aspect-video rounded-lg overflow-hidden">
                        <iframe
                            src={coachVideo}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
                <p className="text-emerald-900 font-bold text-lg mb-2">
                    ¡Estás a un paso de comenzar tu transformación!
                </p>
                <p className="text-emerald-700 text-sm">
                    Al completar este formulario, tu coach recibirá toda la información necesaria para diseñar tu plan personalizado.
                </p>
            </div>
        </div>
    );
}
