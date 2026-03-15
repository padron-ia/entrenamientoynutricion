import React from 'react';
import { UtensilsCrossed, Clock, Droplets, Wine, AlertCircle } from 'lucide-react';

interface Props {
    formData: any;
    updateField: (field: string, value: any) => void;
}

export function NutritionBasicsStep({ formData, updateField }: Props) {
    const preferenceOptions = [
        'Sin restricciones',
        'Sin gluten',
        'Vegetariano',
        'Vegano',
        'Ovolactovegetariano',
        'Pescetariano'
    ];

    const waterOptions = [
        'Agua',
        'Agua con gas',
        'Refrescos',
        'Zumos'
    ];

    const alcoholOptions = [
        'No bebo',
        'Ocasional',
        'Fin de semana',
        'Regular'
    ];

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Nutrición y Hábitos Alimentarios</h3>
                <p className="text-slate-600">Cuéntanos sobre tu alimentación actual para personalizar tu plan</p>
            </div>

            {/* Comidas al día */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        <UtensilsCrossed className="w-4 h-4 inline-block mr-1 text-accent-600" />
                        Comidas al día *
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
                        value={formData.mealsPerDay}
                        onChange={(e) => updateField('mealsPerDay', e.target.value)}
                        placeholder="Ej: 5"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Comidas fuera de casa por semana
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="21"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
                        value={formData.mealsOutPerWeek}
                        onChange={(e) => updateField('mealsOutPerWeek', e.target.value)}
                        placeholder="Ej: 2"
                    />
                </div>
            </div>

            {/* Horarios de comidas */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                    <Clock className="w-4 h-4 inline-block mr-1 text-accent-600" />
                    Horarios habituales de comida
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Desayuno</label>
                        <input
                            type="time"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all text-sm"
                            value={formData.breakfastTime}
                            onChange={(e) => updateField('breakfastTime', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Media mañana</label>
                        <input
                            type="time"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all text-sm"
                            value={formData.morningSnackTime}
                            onChange={(e) => updateField('morningSnackTime', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Comida</label>
                        <input
                            type="time"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all text-sm"
                            value={formData.lunchTime}
                            onChange={(e) => updateField('lunchTime', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Merienda</label>
                        <input
                            type="time"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all text-sm"
                            value={formData.afternoonSnackTime}
                            onChange={(e) => updateField('afternoonSnackTime', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Cena</label>
                        <input
                            type="time"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all text-sm"
                            value={formData.dinnerTime}
                            onChange={(e) => updateField('dinnerTime', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Cocina y pesaje */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Cocinas tú? *</label>
                    <div className="flex gap-4">
                        {['Sí', 'No'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="cooksForSelf"
                                    value={opt}
                                    checked={formData.cooksForSelf === opt}
                                    onChange={(e) => updateField('cooksForSelf', e.target.value)}
                                    className="w-4 h-4 text-accent-600"
                                />
                                <span className="text-sm">{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Estás dispuesto/a a pesar alimentos? *</label>
                    <div className="flex gap-4">
                        {['Sí', 'No'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="willingToWeighFood"
                                    value={opt}
                                    checked={formData.willingToWeighFood === opt}
                                    onChange={(e) => updateField('willingToWeighFood', e.target.value)}
                                    className="w-4 h-4 text-accent-600"
                                />
                                <span className="text-sm">{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Preferencias alimentarias */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Preferencias alimentarias *</label>
                <select
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all bg-white"
                    value={formData.preferences}
                    onChange={(e) => updateField('preferences', e.target.value)}
                >
                    <option value="">Selecciona una opción</option>
                    {preferenceOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            {/* Alimentos habituales */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Alimentos que consumes habitualmente</label>
                <textarea
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
                    rows={3}
                    value={formData.consumedFoods}
                    onChange={(e) => updateField('consumedFoods', e.target.value)}
                    placeholder="Ej: Pollo, arroz, verduras, fruta, legumbres..."
                />
            </div>

            {/* Alergias */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Alergias o intolerancias alimentarias</label>
                <textarea
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
                    rows={2}
                    value={formData.allergies}
                    onChange={(e) => updateField('allergies', e.target.value)}
                    placeholder="Ej: Intolerancia a la lactosa, alergia a frutos secos..."
                />
            </div>

            {/* Alimentos que no le gustan */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Alimentos que prefieres evitar</label>
                <textarea
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
                    rows={2}
                    value={formData.dislikes}
                    onChange={(e) => updateField('dislikes', e.target.value)}
                    placeholder="Ej: Brócoli, hígado, marisco..."
                />
            </div>

            {/* Pan */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Comes con pan?</label>
                    <div className="flex gap-4">
                        {['Sí', 'No'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="eatsWithBread"
                                    value={opt}
                                    checked={formData.eatsWithBread === opt}
                                    onChange={(e) => updateField('eatsWithBread', e.target.value)}
                                    className="w-4 h-4 text-accent-600"
                                />
                                <span className="text-sm">{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>
                {formData.eatsWithBread === 'Sí' && (
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">¿Cuánto pan al día?</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all text-sm"
                            value={formData.breadAmount}
                            onChange={(e) => updateField('breadAmount', e.target.value)}
                            placeholder="Ej: 2 rebanadas en comida y cena"
                        />
                    </div>
                )}
            </div>

            {/* Picoteo */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Picoteas entre horas?</label>
                    <div className="flex gap-4">
                        {['Sí', 'No'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="snacking"
                                    value={opt}
                                    checked={formData.snacking === opt}
                                    onChange={(e) => updateField('snacking', e.target.value)}
                                    className="w-4 h-4 text-accent-600"
                                />
                                <span className="text-sm">{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>
                {formData.snacking === 'Sí' && (
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">¿Qué sueles picotear?</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all text-sm"
                            value={formData.snackingDetail}
                            onChange={(e) => updateField('snackingDetail', e.target.value)}
                            placeholder="Ej: Galletas, frutos secos, chocolate..."
                        />
                    </div>
                )}
            </div>

            {/* Antojos */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Tienes antojos frecuentes?</label>
                    <div className="flex gap-4">
                        {['Sí', 'No'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="cravings"
                                    value={opt}
                                    checked={formData.cravings === opt}
                                    onChange={(e) => updateField('cravings', e.target.value)}
                                    className="w-4 h-4 text-accent-600"
                                />
                                <span className="text-sm">{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>
                {formData.cravings === 'Sí' && (
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">¿De qué tipo?</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all text-sm"
                            value={formData.cravingsDetail}
                            onChange={(e) => updateField('cravingsDetail', e.target.value)}
                            placeholder="Ej: Dulce por las tardes, salado por las noches..."
                        />
                    </div>
                )}
            </div>

            {/* Bebidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        <Droplets className="w-4 h-4 inline-block mr-1 text-accent-600" />
                        Bebida principal *
                    </label>
                    <select
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all bg-white"
                        value={formData.waterIntake}
                        onChange={(e) => updateField('waterIntake', e.target.value)}
                    >
                        <option value="">Selecciona una opción</option>
                        {waterOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        <Wine className="w-4 h-4 inline-block mr-1 text-accent-600" />
                        Consumo de alcohol *
                    </label>
                    <select
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all bg-white"
                        value={formData.alcohol}
                        onChange={(e) => updateField('alcohol', e.target.value)}
                    >
                        <option value="">Selecciona una opción</option>
                        {alcoholOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Recordatorio 24h */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Recordatorio de 24 horas</label>
                <p className="text-xs text-slate-500 mb-2">Describe todo lo que comiste y bebiste ayer (desayuno, comida, cena, snacks...)</p>
                <textarea
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all resize-none"
                    rows={5}
                    value={formData.lastRecallMeal}
                    onChange={(e) => updateField('lastRecallMeal', e.target.value)}
                    placeholder="Ej: Desayuno: café con leche y tostada con aceite. Media mañana: una manzana. Comida: ensalada + pollo a la plancha + arroz. Merienda: yogur. Cena: tortilla francesa con ensalada."
                />
            </div>

            {/* Trastorno alimentario */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        <AlertCircle className="w-4 h-4 inline-block mr-1 text-amber-600" />
                        ¿Has tenido o tienes algún trastorno de conducta alimentaria?
                    </label>
                    <div className="flex gap-4">
                        {['Sí', 'No'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="eatingDisorder"
                                    value={opt}
                                    checked={formData.eatingDisorder === opt}
                                    onChange={(e) => updateField('eatingDisorder', e.target.value)}
                                    className="w-4 h-4 text-accent-600"
                                />
                                <span className="text-sm">{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>
                {formData.eatingDisorder === 'Sí' && (
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Cuéntanos más (confidencial)</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all text-sm"
                            value={formData.eatingDisorderDetail}
                            onChange={(e) => updateField('eatingDisorderDetail', e.target.value)}
                            placeholder="Ej: Anorexia en la adolescencia, atracones..."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
