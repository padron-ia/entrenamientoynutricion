import React from 'react';
import { Utensils, Clock } from 'lucide-react';
import { parseIntegerFromInput } from '../../../utils/numberParsing';

interface Props {
    formData: any;
    updateField: (field: string, value: any) => void;
    toggleArrayField: (field: string, value: string) => void;
}

export function NutritionStep2({ formData, updateField, toggleArrayField }: Props) {
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
                <label className="block text-sm font-bold text-slate-700 mb-2">¿Cuántas comidas haces al día? *</label>
                <select required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.mealsPerDay} onChange={(e) => updateField('mealsPerDay', e.target.value)}>
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
                    <input type="time" required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.breakfastTime} onChange={(e) => updateField('breakfastTime', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hora media mañana</label>
                    <input type="time" className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.midMorningTime} onChange={(e) => updateField('midMorningTime', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hora comida *</label>
                    <input type="time" required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.lunchTime} onChange={(e) => updateField('lunchTime', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hora merienda</label>
                    <input type="time" className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.snackTime} onChange={(e) => updateField('snackTime', e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hora cena *</label>
                    <input type="time" required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.dinnerTime} onChange={(e) => updateField('dinnerTime', e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Cocinas tú mismo? *</label>
                    <select required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.cooksSelf} onChange={(e) => updateField('cooksSelf', e.target.value)}>
                        <option value="">-- Selecciona --</option>
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                        <option value="A veces">A veces</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Pesas la comida? *</label>
                    <select required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.weighsFood} onChange={(e) => updateField('weighsFood', e.target.value)}>
                        <option value="">-- Selecciona --</option>
                        <option value="Sí, siempre">Sí, siempre</option>
                        <option value="A veces">A veces</option>
                        <option value="No quiero pesar">No quiero pesar la comida</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Veces que comes fuera/semana *</label>
                    <input type="text" inputMode="numeric" required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.eatsOutPerWeek} onChange={(e) => updateField('eatsOutPerWeek', e.target.value ? parseIntegerFromInput(e.target.value) : '')} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Pan con las comidas? *</label>
                    <select required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.eatsBread} onChange={(e) => updateField('eatsBread', e.target.value)}>
                        <option value="">-- Selecciona --</option>
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                    </select>
                </div>
            </div>

            {formData.eatsBread === 'Sí' && (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cantidad aproximada de pan *</label>
                    <input type="text" required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.breadAmount} onChange={(e) => updateField('breadAmount', e.target.value)} placeholder="Ej: 40-50 gramos" />
                </div>
            )}

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">¿Picas entre horas? *</label>
                <select required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.snacksBetweenMeals} onChange={(e) => updateField('snacksBetweenMeals', e.target.value)}>
                    <option value="">-- Selecciona --</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                </select>
            </div>

            {formData.snacksBetweenMeals === 'Sí' && (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Qué sueles picar? *</label>
                    <input type="text" required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.snackFoods} onChange={(e) => updateField('snackFoods', e.target.value)} placeholder="Ej: Fruta, frutos secos..." />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Qué bebes con las comidas? *</label>
                    <input type="text" required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.drinkWithMeals} onChange={(e) => updateField('drinkWithMeals', e.target.value)} placeholder="Ej: Agua, refrescos..." />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Alcohol semanal *</label>
                    <input type="text" required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.alcoholPerWeek} onChange={(e) => updateField('alcoholPerWeek', e.target.value)} placeholder="Ej: No bebo alcohol..." />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">¿Tienes antojos? *</label>
                <select required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.hasCravings} onChange={(e) => updateField('hasCravings', e.target.value)}>
                    <option value="">-- Selecciona --</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                </select>
            </div>

            {formData.hasCravings === 'Sí' && (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Qué comes cuando tienes antojos? *</label>
                    <input type="text" required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.cravingFoods} onChange={(e) => updateField('cravingFoods', e.target.value)} placeholder="Ej: Chocolate, pastel..." />
                </div>
            )}

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">¿Qué comiste en las últimas 24 horas? *</label>
                <textarea required rows={4} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none" value={formData.last24hMeals} onChange={(e) => updateField('last24hMeals', e.target.value)} placeholder="Describe todo lo que comiste ayer..." />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">¿Trastorno alimentario diagnosticado? *</label>
                <select required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.eatingDisorder} onChange={(e) => updateField('eatingDisorder', e.target.value)}>
                    <option value="">-- Selecciona --</option>
                    <option value="No">No</option>
                    <option value="Sí">Sí</option>
                </select>
            </div>

            {formData.eatingDisorder === 'Sí' && (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Cuál? *</label>
                    <input type="text" required className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" value={formData.eatingDisorderType} onChange={(e) => updateField('eatingDisorderType', e.target.value)} placeholder="Especifica el trastorno..." />
                </div>
            )}

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">¿Te sucede alguna de estas situaciones?</label>
                <div className="space-y-2">
                    {emotionalEatingList.map(situation => (
                        <label key={situation} className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" checked={formData.emotionalEating.includes(situation)} onChange={() => toggleArrayField('emotionalEating', situation)} className="w-4 h-4 text-emerald-600 rounded" />
                            <span className="text-sm">{situation}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
