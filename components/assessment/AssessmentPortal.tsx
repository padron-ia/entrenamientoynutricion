import React, { useState } from 'react';
import {
    Utensils, Dumbbell, CheckCircle2, ArrowRight, ArrowLeft,
    Loader2, Heart, Award, Sparkles, BookOpen
} from 'lucide-react';
import { Client } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { NutritionAssessment } from './NutritionAssessment';
import { TrainingAssessment } from './TrainingAssessment';
import { useToast } from '../ToastProvider';

interface AssessmentPortalProps {
    client: Client;
    onComplete: () => void;
}

export function AssessmentPortal({ client, onComplete }: AssessmentPortalProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    const steps = [
        {
            id: 'nutrition',
            title: 'Perfil Nutricional',
            description: 'Cuéntanos qué te gusta y cómo te alimentas habitualmente.',
            icon: Utensils,
            component: <NutritionAssessment client={client} onNext={() => setCurrentStep(1)} />
        },
        {
            id: 'training',
            title: 'Plan de Movimiento',
            description: 'Vídeos formativos y evaluación de tu experiencia técnica.',
            icon: Dumbbell,
            component: <TrainingAssessment client={client} onBack={() => setCurrentStep(0)} onComplete={handleFinalize} />
        }
    ];

    async function handleFinalize() {
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('clientes_pt_notion')
                .update({
                    onboarding_phase2_completed: true,
                    onboarding_phase2_completed_at: new Date().toISOString(),
                    status: 'active' // Ensure they are active
                })
                .eq('id', client.id);

            if (error) throw error;

            toast.success("¡Valoración completada! Ahora tienes acceso completo a tu portal.");
            onComplete();
        } catch (err: any) {
            console.error('Error finalizing phase 2:', err);
            toast.error("Error al guardar la valoración final.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const StepIcon = steps[currentStep].icon;

    if (currentStep === -1) {
        // Optional Welcome back screen for phase 2 if needed
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4">
            <div className="max-w-4xl w-full">
                {/* Header Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
                        <Sparkles className="w-4 h-4" /> Casi listo: Fase de Valoración
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Paso Final de Alta</h1>
                    <p className="text-slate-500 max-w-lg mx-auto">
                        Para que tu coach pueda crear tu plan 100% personalizado, necesitamos estos últimos detalles sobre tu nutrición y entrenamiento.
                    </p>
                </div>

                {/* Progress Indicators */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {steps.map((step, idx) => {
                        const Icon = step.icon;
                        const active = idx === currentStep;
                        const completed = idx < currentStep;
                        return (
                            <div key={step.id} className="flex items-center gap-2">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${active ? 'bg-slate-900 text-white shadow-lg' :
                                        completed ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-300 border border-slate-200'
                                    }`}>
                                    {completed ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                                </div>
                                <div className="hidden sm:block">
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {step.title}
                                    </p>
                                </div>
                                {idx < steps.length - 1 && <div className="w-8 h-px bg-slate-200 mx-2"></div>}
                            </div>
                        );
                    })}
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden transform transition-all">
                    {/* Internal Header */}
                    <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-900">
                                <StepIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{steps[currentStep].title}</h2>
                                <p className="text-sm text-slate-500">{steps[currentStep].description}</p>
                            </div>
                        </div>
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-slate-400 font-bold uppercase">Progreso</p>
                            <p className="text-lg font-bold text-slate-900">{currentStep + 1} / {steps.length}</p>
                        </div>
                    </div>

                    {/* Step Component Rendering */}
                    <div className="p-8">
                        {steps[currentStep].component}
                    </div>

                    {/* Submitting Overlay */}
                    {isSubmitting && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in">
                            <Loader2 className="w-12 h-12 animate-spin text-slate-900 mb-4" />
                            <p className="font-bold text-slate-900">Finalizando tu alta...</p>
                            <p className="text-sm text-slate-500">Estamos preparando tu dashboard principal.</p>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="mt-8 flex items-center justify-center gap-8 text-slate-400 text-sm">
                    <div className="flex items-center gap-2"><Heart className="w-4 h-4 text-red-400" /> Datos protegidos</div>
                    <div className="flex items-center gap-2"><Award className="w-4 h-4 text-emerald-400" /> Calidad Academia</div>
                    <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-400" /> Método cientifico</div>
                </div>
            </div>
        </div>
    );
}
