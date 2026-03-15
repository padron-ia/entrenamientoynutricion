import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Save, Trophy, Target, Heart, MessageSquare, Users, Sparkles, Star } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { Client } from '../../types';

interface OptimizationSurveyOverlayProps {
    client: Client;
    contractPhase: string;
    contractEndDate?: string;
    onComplete: () => void;
}

export function OptimizationSurveyOverlay({ client, contractPhase, contractEndDate, onComplete }: OptimizationSurveyOverlayProps) {
    const [step, setStep] = useState(0); // 0 = intro, 1-3 = steps, 4 = success
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [answers, setAnswers] = useState({
        biggest_achievement: '',
        biggest_challenge: '',
        improvement_suggestions: '',
        satisfaction_rating: 8,
        rating_reason: '',
        has_referral: false,
        referral_name: '',
        referral_phone: '',
        future_goals: '',
        goal_feeling: '',
        importance_rating: 8,
        additional_comments: '',
    });

    const set = (field: string, value: any) => setAnswers(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        if (!answers.biggest_achievement || !answers.future_goals) {
            alert('Por favor completa al menos las preguntas principales.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('optimization_surveys')
                .insert({
                    client_id: client.id,
                    biggest_achievement: answers.biggest_achievement,
                    biggest_challenge: answers.biggest_challenge,
                    improvement_suggestions: answers.improvement_suggestions,
                    satisfaction_rating: answers.satisfaction_rating,
                    rating_reason: answers.satisfaction_rating <= 7 ? answers.rating_reason : null,
                    has_referral: answers.has_referral,
                    referral_name: answers.has_referral ? answers.referral_name : null,
                    referral_phone: answers.has_referral ? answers.referral_phone : null,
                    future_goals: answers.future_goals,
                    goal_feeling: answers.goal_feeling,
                    importance_rating: answers.importance_rating,
                    additional_comments: answers.additional_comments || null,
                    contract_phase: contractPhase,
                    contract_end_date: contractEndDate || null,
                });

            if (error) {
                console.error('Error saving optimization survey:', error);
                alert(`Error al guardar: ${error.message}`);
                setIsSubmitting(false);
                return;
            }

            setStep(4);
        } catch (e) {
            console.error(e);
            alert('Error al guardar la encuesta. Inténtalo de nuevo.');
            setIsSubmitting(false);
        }
    };

    // ── INTRO SCREEN ──
    if (step === 0) {
        return (
            <div className="fixed inset-0 z-[70] bg-gradient-to-br from-sea-700 via-sea-600 to-sea-800 flex items-center justify-center p-6 overflow-y-auto">
                <div className="max-w-lg w-full text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
                        <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">
                        Llamada de optimización de tu proceso
                    </h1>
                    <p className="text-sea-100 text-base leading-relaxed mb-3">
                        Hola <strong className="text-white">{client.firstName}</strong>, antes de tu llamada con tu coach queremos conocer tu perspectiva.
                    </p>
                    <p className="text-sea-200 text-sm leading-relaxed mb-10">
                        Esta llamada es para revisar juntos tu proceso, celebrar tus avances, ajustar objetivos y diseñar el siguiente paso de tu evolución. Tus respuestas nos ayudarán a preparar la mejor sesión para ti.
                    </p>
                    <button
                        onClick={() => setStep(1)}
                        className="px-10 py-4 bg-white text-sea-700 font-bold rounded-2xl shadow-xl shadow-sea-900/30 hover:bg-sea-50 transition-all text-lg"
                    >
                        Empezar (2 min)
                    </button>
                    <p className="mt-6 text-sea-300 text-xs">Solo te llevará un par de minutos</p>
                </div>
            </div>
        );
    }

    // ── SUCCESS SCREEN ──
    if (step === 4) {
        return (
            <div className="fixed inset-0 z-[70] bg-white flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="w-24 h-24 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <CheckCircle2 className="w-12 h-12 text-accent-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-4">¡Gracias, {client.firstName}!</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        Hemos recibido tus respuestas. Tu coach las revisará antes de vuestra llamada para poder ofrecerte la mejor sesión posible.
                    </p>
                    <button
                        onClick={onComplete}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    const totalSteps = 3;
    const progress = (step / totalSteps) * 100;

    return (
        <div className="fixed inset-0 z-[70] bg-white flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-sea-500 to-sea-700 p-6 text-white pb-20 shrink-0">
                <div className="max-w-3xl mx-auto">
                    <p className="text-sea-200 text-sm mb-2">Llamada de optimización</p>
                    <h1 className="text-2xl font-bold">
                        {step === 1 && 'Tu experiencia hasta ahora'}
                        {step === 2 && 'Valoración y comunidad'}
                        {step === 3 && 'Tus próximos objetivos'}
                    </h1>
                </div>
            </div>

            {/* Form Container */}
            <div className="flex-1 overflow-y-auto -mt-12">
                <div className="max-w-3xl mx-auto px-6 pb-20">
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

                        {/* Progress Bar */}
                        <div className="h-2 bg-slate-100 w-full">
                            <div
                                className="h-full bg-sea-500 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* ── STEP 1: Logros, dificultades, sugerencias ── */}
                        {step === 1 && (
                            <div className="p-8 animate-in slide-in-from-right duration-300">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                    <Trophy className="w-6 h-6 text-amber-500" /> Tu experiencia
                                </h3>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            1. ¿Cuál ha sido tu mayor logro en estas semanas?
                                        </label>
                                        <textarea
                                            value={answers.biggest_achievement}
                                            onChange={e => set('biggest_achievement', e.target.value)}
                                            className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none h-28 resize-none"
                                            placeholder="Algo de lo que te sientas orgulloso/a..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            2. ¿Qué es lo que más te está costando?
                                        </label>
                                        <textarea
                                            value={answers.biggest_challenge}
                                            onChange={e => set('biggest_challenge', e.target.value)}
                                            className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none h-28 resize-none"
                                            placeholder="Sé sincero/a, esto nos ayuda a mejorar..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            3. ¿Qué podemos hacer para que el programa sea aún mejor?
                                        </label>
                                        <textarea
                                            value={answers.improvement_suggestions}
                                            onChange={e => set('improvement_suggestions', e.target.value)}
                                            className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none h-24 resize-none"
                                            placeholder="Cualquier idea o sugerencia es bienvenida..."
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

                        {/* ── STEP 2: Satisfacción + Referido ── */}
                        {step === 2 && (
                            <div className="p-8 animate-in slide-in-from-right duration-300">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                    <Star className="w-6 h-6 text-sea-500" /> Valoración
                                </h3>

                                <div className="space-y-6">
                                    {/* Satisfaction slider */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-3">
                                            4. Del 0 al 10, ¿cómo valorarías tu experiencia?
                                        </label>
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="10"
                                                    value={answers.satisfaction_rating}
                                                    onChange={e => set('satisfaction_rating', parseInt(e.target.value))}
                                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sea-600"
                                                />
                                                <span className={`text-3xl font-bold w-10 text-center ${
                                                    answers.satisfaction_rating >= 8 ? 'text-accent-600' :
                                                    answers.satisfaction_rating >= 5 ? 'text-amber-600' : 'text-red-500'
                                                }`}>
                                                    {answers.satisfaction_rating}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-1">
                                                <span>Nada satisfecho</span>
                                                <span>Muy satisfecho</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Conditional: reason if ≤7 */}
                                    {answers.satisfaction_rating <= 7 && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                5. ¿Por qué esa nota? ¿Qué mejorarías?
                                            </label>
                                            <textarea
                                                value={answers.rating_reason}
                                                onChange={e => set('rating_reason', e.target.value)}
                                                className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none h-24 resize-none"
                                                placeholder="Tu feedback nos ayuda a mejorar..."
                                            />
                                        </div>
                                    )}

                                    {/* Referral */}
                                    <div className="bg-sea-50/50 p-5 rounded-xl border border-sea-100">
                                        <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-sea-500" />
                                            6. ¿Conoces a alguien que podría beneficiarse del programa?
                                        </label>
                                        <div className="flex gap-3 mb-3">
                                            <button
                                                onClick={() => set('has_referral', true)}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                                                    answers.has_referral
                                                        ? 'bg-sea-600 text-white shadow-md'
                                                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                                                }`}
                                            >
                                                Sí, conozco a alguien
                                            </button>
                                            <button
                                                onClick={() => set('has_referral', false)}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                                                    !answers.has_referral
                                                        ? 'bg-slate-700 text-white shadow-md'
                                                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                                                }`}
                                            >
                                                No, de momento no
                                            </button>
                                        </div>

                                        {answers.has_referral && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Nombre</label>
                                                    <input
                                                        type="text"
                                                        value={answers.referral_name}
                                                        onChange={e => set('referral_name', e.target.value)}
                                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none text-sm"
                                                        placeholder="Nombre de la persona"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Teléfono</label>
                                                    <input
                                                        type="tel"
                                                        value={answers.referral_phone}
                                                        onChange={e => set('referral_phone', e.target.value)}
                                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none text-sm"
                                                        placeholder="+34 600 000 000"
                                                    />
                                                </div>
                                            </div>
                                        )}
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

                        {/* ── STEP 3: Objetivos futuros ── */}
                        {step === 3 && (
                            <div className="p-8 animate-in slide-in-from-right duration-300">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                    <Target className="w-6 h-6 text-accent-500" /> Tus próximos objetivos
                                </h3>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            7. ¿Qué te gustaría conseguir en los próximos meses?
                                        </label>
                                        <textarea
                                            value={answers.future_goals}
                                            onChange={e => set('future_goals', e.target.value)}
                                            className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none h-28 resize-none"
                                            placeholder="Piensa en grande... ¿qué quieres lograr?"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            8. ¿Cómo te sentirías al conseguirlo?
                                        </label>
                                        <textarea
                                            value={answers.goal_feeling}
                                            onChange={e => set('goal_feeling', e.target.value)}
                                            className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none h-24 resize-none"
                                            placeholder="Visualízalo... ¿qué cambiaría en tu vida?"
                                        />
                                    </div>

                                    {/* Importance slider */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-3">
                                            9. Del 1 al 10, ¿cómo de importante es para ti seguir avanzando?
                                        </label>
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    value={answers.importance_rating}
                                                    onChange={e => set('importance_rating', parseInt(e.target.value))}
                                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent-500"
                                                />
                                                <span className={`text-3xl font-bold w-10 text-center ${
                                                    answers.importance_rating >= 8 ? 'text-accent-600' :
                                                    answers.importance_rating >= 5 ? 'text-amber-600' : 'text-red-500'
                                                }`}>
                                                    {answers.importance_rating}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-1">
                                                <span>Poco importante</span>
                                                <span>Muy importante</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            10. ¿Algo más que quieras compartir antes de la llamada?
                                            <span className="text-slate-400 font-normal ml-1">(opcional)</span>
                                        </label>
                                        <textarea
                                            value={answers.additional_comments}
                                            onChange={e => set('additional_comments', e.target.value)}
                                            className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sea-500 outline-none h-20 resize-none"
                                            placeholder="Cualquier cosa que quieras que tu coach sepa..."
                                        />
                                    </div>

                                    <div className="bg-sea-50 p-4 rounded-xl flex items-start gap-3">
                                        <Heart className="w-5 h-5 text-sea-600 mt-0.5 shrink-0" />
                                        <p className="text-sm text-sea-800">
                                            Tus respuestas son confidenciales y solo las verá tu coach para preparar la mejor sesión posible.
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
                                            className="px-8 py-3 bg-accent-500 text-white rounded-xl font-bold hover:bg-accent-600 flex items-center gap-2 shadow-lg shadow-accent-200 disabled:opacity-50"
                                        >
                                            {isSubmitting ? 'Enviando...' : <><Save className="w-4 h-4" /> Enviar respuestas</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
