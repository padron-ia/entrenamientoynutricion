
import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Save, Scale, Star, HelpCircle, Trophy, Target, Heart, AlertCircle, TrendingUp } from 'lucide-react';
import { mockDb } from '../../services/mockSupabase';
import { Client } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface CheckinViewProps {
    client: Client;
    onBack: () => void;
}

export function CheckinView({ client, onBack }: CheckinViewProps) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Data
    const [answers, setAnswers] = useState({
        q1_logro: '', // ¿Cuál ha sido tu principal logro esta semana?
        q2_porque: '', // ¿Por qué lo crees así?
        q3_alimentacion: '', // ¿Cómo te estás sintiendo con el plan de alimentación?
        q4_ejercicio: '', // ¿Cómo te estás sintiendo con el plan de ejercicio?
        q5_obstaculos: '', // ¿Qué obstáculos te han surgido?
        q6_nota: 5, // Nota del 1 al 10
        weight: '', // Peso actual (Opcional pero recomendado)
    });

    const handleChange = (field: string, value: any) => {
        setAnswers(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!answers.q1_logro || !answers.q3_alimentacion) {
            alert("Por favor completa al menos las preguntas principales.");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Submit the Check-in Form
            await mockDb.submitCheckin({
                client_id: client.id,
                responses: {
                    question_1: answers.q1_logro,
                    question_2: answers.q2_porque,
                    question_3: answers.q3_alimentacion,
                    question_4: answers.q4_ejercicio,
                    question_5: answers.q5_obstaculos,
                    question_6: answers.q6_nota.toString(),
                    weight_log: answers.weight
                },
                rating: answers.q6_nota
            });

            // 2. If weight is provided, update weight history AND client profile
            if (answers.weight) {
                const weightVal = parseFloat(answers.weight);
                if (!isNaN(weightVal)) {
                    // A. Add/Update history (Upsert)
                    // We use upsert to avoid duplicate key errors if user checks in multiple times same day
                    const { error: historyError } = await supabase
                        .from('weight_history')
                        .upsert([{
                            client_id: client.id,
                            weight: weightVal,
                            date: new Date().toISOString().split('T')[0],
                            notes: 'Vía Check-in Semanal (Actualizado)'
                        }], { onConflict: 'client_id,date' });

                    if (historyError) {
                        console.warn("Weight history upsert failed, might be conflicting but proceeding to sync profile", historyError);
                    }

                    // B. Update Client Current Weight (Sync with Profile)
                    await supabase
                        .from('clientes_pt_notion')
                        .update({ property_peso_actual: weightVal })
                        .eq('id', client.id);
                }
            }

            // Success Animation or Message
            setStep(4); // Success Step

        } catch (error) {
            console.error(error);
            alert("Ocurrió un error al guardar tu reporte. Inténtalo de nuevo.");
            setIsSubmitting(false);
        }
    };

    if (step === 4) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-accent-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <CheckCircle2 className="w-12 h-12 text-accent-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-4">¡Reporte Enviado!</h2>
                <p className="text-slate-600 max-w-md mb-8">
                    Gracias por tu compromiso. Tu coach revisará tus respuestas y preparará tu siguiente revisión semanal.
                </p>
                <button
                    onClick={onBack}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-sea-500 to-sea-700 p-6 text-white pb-24">
                <div className="max-w-3xl mx-auto">
                    <button onClick={onBack} className="flex items-center gap-2 text-sea-200 hover:text-white transition-colors mb-6">
                        <ArrowLeft className="w-5 h-5" /> Cancelar
                    </button>
                    <h1 className="text-3xl font-bold mb-2">Check-in Semanal</h1>
                    <p className="text-sea-200 opacity-90">Tómate 5 minutos para reflexionar sobre tu semana. Esto ayuda mucho a tu coach.</p>
                </div>
            </div>

            {/* Form Container */}
            <div className="max-w-3xl mx-auto -mt-16 px-6 pb-20">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">

                    {/* Progress Bar */}
                    <div className="h-2 bg-slate-100 w-full flex">
                        <div className={`h-full bg-sea-500 transition-all duration-500 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`}></div>
                    </div>

                    {/* Step 1: Mindset & Logros */}
                    {step === 1 && (
                        <div className="p-8 animate-in slide-in-from-right duration-300">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                <Trophy className="w-6 h-6 text-amber-500" /> Logros y Mentalidad
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">1. ¿Cuál ha sido tu principal logro esta semana?</label>
                                    <textarea
                                        value={answers.q1_logro}
                                        onChange={e => handleChange('q1_logro', e.target.value)}
                                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none h-32 resize-none"
                                        placeholder="Ej: He cumplido con todos los entrenamientos, he dormido mejor..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">2. ¿Por qué lo crees así? ¿Cómo te sientes?</label>
                                    <textarea
                                        value={answers.q2_porque}
                                        onChange={e => handleChange('q2_porque', e.target.value)}
                                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none h-24 resize-none"
                                        placeholder="Tómate tu tiempo y escribe cómo te sientes."
                                    />
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={() => setStep(2)}
                                        className="px-6 py-3 bg-sea-600 text-white rounded-xl font-bold hover:bg-sea-700 flex items-center gap-2"
                                    >
                                        Siguiente <ArrowLeft className="w-4 h-4 rotate-180" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Feedback Plan */}
                    {step === 2 && (
                        <div className="p-8 animate-in slide-in-from-right duration-300">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                <Target className="w-6 h-6 text-sea-500" /> Feedback del Plan
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">3. ¿Cómo te estás sintiendo con la alimentación?</label>
                                    <textarea
                                        value={answers.q3_alimentacion}
                                        onChange={e => handleChange('q3_alimentacion', e.target.value)}
                                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none h-24 resize-none"
                                        placeholder="¿Hambre? ¿Saciedad? ¿Algo que cambiarías?"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">4. ¿Cómo te estás sintiendo con el ejercicio?</label>
                                    <textarea
                                        value={answers.q4_ejercicio}
                                        onChange={e => handleChange('q4_ejercicio', e.target.value)}
                                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none h-24 resize-none"
                                        placeholder="¿Energía? ¿Dificultad? ¿Progresos?"
                                    />
                                </div>

                                <div className="flex justify-between pt-4">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
                                    >
                                        Atrás
                                    </button>
                                    <button
                                        onClick={() => setStep(3)}
                                        className="px-6 py-3 bg-sea-600 text-white rounded-xl font-bold hover:bg-sea-700 flex items-center gap-2"
                                    >
                                        Siguiente <ArrowLeft className="w-4 h-4 rotate-180" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Obstacles & Rating */}
                    {step === 3 && (
                        <div className="p-8 animate-in slide-in-from-right duration-300">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                <TrendingUp className="w-6 h-6 text-sea-500" /> Cierre y Peso
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">5. ¿Qué obstáculos te han surgido esta semana?</label>
                                    <textarea
                                        value={answers.q5_obstaculos}
                                        onChange={e => handleChange('q5_obstaculos', e.target.value)}
                                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none h-24 resize-none"
                                        placeholder="Y qué has hecho para solventarlos (o si necesitas ayuda)."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-3">6. Nota de Cumplimiento (1-10)</label>
                                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                value={answers.q6_nota}
                                                onChange={e => handleChange('q6_nota', parseInt(e.target.value))}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sea-600"
                                            />
                                            <span className="text-2xl font-bold text-sea-600 w-8 text-center">{answers.q6_nota}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <Scale className="w-4 h-4" /> Peso Actual (kg)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={answers.weight}
                                            onChange={e => handleChange('weight', e.target.value)}
                                            className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none font-bold text-lg"
                                            placeholder="00.0"
                                        />
                                    </div>
                                </div>

                                <div className="bg-sea-50 p-4 rounded-xl flex items-start gap-3">
                                    <HelpCircle className="w-5 h-5 text-sea-600 mt-0.5 shrink-0" />
                                    <p className="text-sm text-sea-800">
                                        Al enviar este reporte, tu coach recibirá una notificación. Asegúrate de haber contado todo lo importante.
                                    </p>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <button
                                        onClick={() => setStep(2)}
                                        className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
                                    >
                                        Atrás
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="px-8 py-3 bg-accent-500 text-white rounded-xl font-bold hover:bg-accent-600 flex items-center gap-2 shadow-lg shadow-accent-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Enviando...' : <><Save className="w-4 h-4" /> Enviar Reporte</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
