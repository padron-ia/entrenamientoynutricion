import React, { useState } from 'react';
import { Droplets, Footprints, Scale, X, Loader2, Sunrise, Utensils, Clock } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';

interface QuickLogButtonsProps {
    clientId: string;
    onWeightClick: () => void;
    onGlucoseSaved?: () => void;
    onStepsClick?: () => void;
}

const MEASUREMENT_TYPES = [
    { value: 'fasting', label: 'Ayunas', icon: Sunrise },
    { value: 'post_meal', label: 'Post-comida', icon: Utensils },
    { value: 'before_meal', label: 'Pre-comida', icon: Clock },
    { value: 'random', label: 'Aleatorio', icon: Droplets },
];

export function QuickLogButtons({ clientId, onWeightClick, onGlucoseSaved, onStepsClick }: QuickLogButtonsProps) {
    // Glucose modal
    const [showGlucose, setShowGlucose] = useState(false);
    const [glucoseValue, setGlucoseValue] = useState('');
    const [measurementType, setMeasurementType] = useState('fasting');
    const [savingGlucose, setSavingGlucose] = useState(false);

    const handleGlucoseSave = async () => {
        if (!glucoseValue) return;
        setSavingGlucose(true);
        try {
            await supabase.from('glucose_history').insert({
                client_id: clientId,
                glucose_value: parseFloat(glucoseValue),
                measurement_type: measurementType,
                measured_at: new Date().toISOString(),
            });
            setShowGlucose(false);
            setGlucoseValue('');
            setMeasurementType('fasting');
            onGlucoseSaved?.();
        } catch (e) {
            console.error('Error saving glucose:', e);
        } finally {
            setSavingGlucose(false);
        }
    };

    const buttons = [
        {
            label: 'Glucosa',
            icon: Droplets,
            color: 'bg-sea-50 text-sea-600 hover:bg-sea-100',
            onClick: () => setShowGlucose(true),
        },
        {
            label: 'Pasos',
            hint: 'Hoy o fecha',
            icon: Footprints,
            color: 'bg-accent-50 text-accent-600 hover:bg-accent-100',
            onClick: () => onStepsClick?.(),
        },
        {
            label: 'Peso',
            icon: Scale,
            color: 'bg-sea-50 text-sea-600 hover:bg-sea-100',
            onClick: onWeightClick,
        },
    ];

    return (
        <>
            {/* Botones rápidos */}
            <div className="glass rounded-3xl p-5 shadow-card">
                <p className="text-xs text-sea-400 font-bold uppercase tracking-wider mb-4">Registro rápido</p>
                <div className="grid grid-cols-3 gap-3">
                    {buttons.map(({ label, hint, icon: Icon, color, onClick }) => (
                        <button
                            key={label}
                            onClick={onClick}
                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${color}`}
                        >
                            <Icon className="w-6 h-6" />
                            <span className="text-xs font-bold leading-tight">{label}</span>
                            {hint && <span className="text-[10px] font-medium opacity-80 leading-none">{hint}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Modal Glucosa */}
            {showGlucose && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-sea-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95">
                        <div className="flex items-center justify-between p-5 border-b border-sea-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-sea-100 rounded-xl text-sea-600">
                                    <Droplets className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-sea-900">Registrar Glucosa</h3>
                            </div>
                            <button onClick={() => setShowGlucose(false)} className="text-sea-300 hover:text-sea-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-sea-400 uppercase tracking-wider mb-2">Valor (mg/dL)</label>
                                <input
                                    type="number"
                                    placeholder="120"
                                    value={glucoseValue}
                                    onChange={e => setGlucoseValue(e.target.value)}
                                    autoFocus
                                    className="w-full text-center text-4xl font-bold text-sea-900 py-4 border-2 border-sea-100 rounded-2xl focus:border-sea-400 focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-sea-400 uppercase tracking-wider mb-2">Momento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {MEASUREMENT_TYPES.map(type => (
                                        <button
                                            key={type.value}
                                            onClick={() => setMeasurementType(type.value)}
                                            className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                                                measurementType === type.value
                                                    ? 'border-sea-500 bg-sea-50 text-sea-700'
                                                    : 'border-sea-100 text-sea-400 hover:border-sea-200'
                                            }`}
                                        >
                                            <type.icon className="w-4 h-4" />
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={() => setShowGlucose(false)}
                                    className="flex-1 py-3 rounded-xl border-2 border-sea-100 text-sea-500 font-bold text-sm hover:bg-sea-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGlucoseSave}
                                    disabled={savingGlucose || !glucoseValue}
                                    className="flex-1 py-3 rounded-xl bg-sea-600 text-white font-bold text-sm hover:bg-sea-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {savingGlucose ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}
