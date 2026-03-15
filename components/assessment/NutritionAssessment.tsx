import React, { useState } from 'react';
import {
    Utensils, Coffee, Pizza, Wine, AlertCircle,
    Clock, Heart, ArrowRight, Loader2, Save
} from 'lucide-react';
import { Client } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../ToastProvider';

interface NutritionAssessmentProps {
    client: Client;
    onNext: () => void;
}

export function NutritionAssessment({ client, onNext }: NutritionAssessmentProps) {
    const toast = useToast();
    const [isSaving, setIsSaving] = useState(false);

    // Form State - Initialize with client data if available to avoid overwriting with defaults
    const [formData, setFormData] = useState({
        property_cocina_l_mismo: client.nutrition?.cooksForSelf ?? true,
        property_dispuesto_a_pesar_comida: client.nutrition?.willingToWeighFood ?? true,
        property_comidas_fuera_de_casa_semanales: client.nutrition?.mealsOutPerWeek ?? 0,
        property_n_mero_comidas_al_d_a: client.nutrition?.mealsPerDay ?? 3,
        property_come_con_pan: client.nutrition?.eatsWithBread ?? false,
        property_cantidad_pan: client.nutrition?.breadAmount || '',
        property_consumo_de_alcohol: client.nutrition?.alcohol || 'Nunca',
        property_bebida_en_la_comida: client.nutrition?.waterIntake || 'Agua',
        property_alergias_intolerancias: client.nutrition?.allergies || '',
        property_otras_alergias_o_intolerancias: client.nutrition?.otherAllergies || '',
        property_alimentos_a_evitar_detalle: client.nutrition?.dislikes || '',
        property_alimentos_consumidos: client.nutrition?.consumedFoods || '',
        property_tiene_antojos: client.nutrition?.cravings || 'No',
        property_especificar_antojos: client.nutrition?.cravingsDetail || '',
        property_pica_entre_horas: client.nutrition?.snacking ?? false,
        property_especificar_pica_entre_horas: client.nutrition?.snackingDetail || '',
        property_trastorno_alimenticio_diagnosticado: client.nutrition?.eatingDisorder || 'No',
        property_especificar_trastorno_alimenticio: client.nutrition?.eatingDisorderDetail || '',
        property_notas_diet_ticas_espec_ficas: client.nutrition?.dietaryNotes || '',
        property_ltima_comida_recuerdo: client.nutrition?.lastRecallMeal || '',
        property_preferencias_diet_ticas_generales: client.nutrition?.preferences || '',
        // Horarios
        property_horario_desayuno: client.nutrition?.schedules?.breakfast || '',
        property_horario_almuerzo: client.nutrition?.schedules?.lunch || '',
        property_horario_cena: client.nutrition?.schedules?.dinner || '',
        property_horario_merienda: client.nutrition?.schedules?.afternoonSnack || '',
        property_horario_media_ma_ana: client.nutrition?.schedules?.morningSnack || ''
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('clientes_pt_notion')
                .update({
                    ...formData,
                    // Convert booleans for some columns if database expects string 'Sí'/'No'
                    // But usually booleans are better if supported.
                })
                .eq('id', client.id);

            if (error) throw error;

            toast.success("Perfil nutricional guardado.");
            onNext();
        } catch (err: any) {
            console.error('Error saving nutrition assessment:', err);
            toast.error("Error al guardar los datos.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* 1. Habitos Generales */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-orange-500" /> Hábitos de Cocina y Compras
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">¿Cocinas tú mismo?</label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleChange('property_cocina_l_mismo', true)}
                                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${formData.property_cocina_l_mismo ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                            >Sí</button>
                            <button
                                onClick={() => handleChange('property_cocina_l_mismo', false)}
                                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${!formData.property_cocina_l_mismo ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                            >No / Compartido</button>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">¿Dispuesto a pesar comida?</label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleChange('property_dispuesto_a_pesar_comida', true)}
                                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${formData.property_dispuesto_a_pesar_comida ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                            >Sí</button>
                            <button
                                onClick={() => handleChange('property_dispuesto_a_pesar_comida', false)}
                                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${!formData.property_dispuesto_a_pesar_comida ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                            >Preferiría que no</button>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Comidas fuera / Restaurante al mes</label>
                        <input
                            type="number"
                            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-sm outline-none focus:border-orange-500"
                            value={formData.property_comidas_fuera_de_casa_semanales}
                            onChange={(e) => handleChange('property_comidas_fuera_de_casa_semanales', parseInt(e.target.value))}
                        />
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Comidas al día (actuales)</label>
                        <select
                            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-sm outline-none focus:border-orange-500"
                            value={formData.property_n_mero_comidas_al_d_a}
                            onChange={(e) => handleChange('property_n_mero_comidas_al_d_a', parseInt(e.target.value))}
                        >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                            <option value={5}>5 o más</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* 2. Preferencias y Alergias */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Pizza className="w-5 h-5 text-red-500" /> Preferencias y Restricciones
                </h3>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Alergias o Intolerancias Conocidas</label>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm outline-none focus:bg-white focus:border-orange-500 transition-all"
                            rows={2}
                            placeholder="Ej: Glúten, Lactosa, Frutos secos..."
                            value={formData.property_alergias_intolerancias}
                            onChange={(e) => handleChange('property_alergias_intolerancias', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Alimentos que NO te gustan / Evitar por gusto</label>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm outline-none focus:bg-white focus:border-orange-500 transition-all"
                            rows={3}
                            placeholder="Ej: No me gusta el brócoli, odio la berenjena..."
                            value={formData.property_alimentos_a_evitar_detalle}
                            onChange={(e) => handleChange('property_alimentos_a_evitar_detalle', e.target.value)}
                        />
                    </div>
                </div>
            </section>

            {/* 3. Comportamiento y Bebida */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Wine className="w-5 h-5 text-purple-500" /> Bebidas y Hábitos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Consumo de Alcohol</label>
                        <select
                            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-sm"
                            value={formData.property_consumo_de_alcohol}
                            onChange={(e) => handleChange('property_consumo_de_alcohol', e.target.value)}
                        >
                            <option value="Nunca">Nunca</option>
                            <option value="Fines de semana">Fines de semana</option>
                            <option value="Socialmente (puntual)">Socialmente (puntual)</option>
                            <option value="A diario">A diario</option>
                        </select>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Bebida principal en las comidas</label>
                        <input
                            type="text"
                            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-sm"
                            placeholder="Agua, Refrescos Zero..."
                            value={formData.property_bebida_en_la_comida}
                            onChange={(e) => handleChange('property_bebida_en_la_comida', e.target.value)}
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                            <input
                                type="checkbox"
                                checked={formData.property_pica_entre_horas}
                                onChange={(e) => handleChange('property_pica_entre_horas', e.target.checked)}
                                className="w-4 h-4 rounded text-orange-600"
                            /> ¿Sueles picar entre horas?
                        </label>
                        {formData.property_pica_entre_horas && (
                            <input
                                type="text"
                                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-sm mt-1"
                                placeholder="¿Qué sueles picar? Ej: Frutos secos, galletas..."
                                value={formData.property_especificar_pica_entre_horas}
                                onChange={(e) => handleChange('property_especificar_pica_entre_horas', e.target.value)}
                            />
                        )}
                    </div>
                </div>
            </section>

            {/* 4. Horarios */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" /> Tus Horarios de Comida
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {[
                        { label: 'Desayuno', key: 'property_horario_desayuno' },
                        { label: 'Media Mañana', key: 'property_horario_media_ma_ana' },
                        { label: 'Almuerzo', key: 'property_horario_almuerzo' },
                        { label: 'Merienda', key: 'property_horario_merienda' },
                        { label: 'Cena', key: 'property_horario_cena' }
                    ].map(item => (
                        <div key={item.key} className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm text-center">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">{item.label}</label>
                            <input
                                type="time"
                                className="w-full text-center font-bold text-slate-900 border-none bg-transparent outline-none focus:ring-0"
                                value={formData[item.key as keyof typeof formData]}
                                onChange={(e) => handleChange(item.key, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="group bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Guardando...
                        </>
                    ) : (
                        <>
                            Siguiente Paso <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
