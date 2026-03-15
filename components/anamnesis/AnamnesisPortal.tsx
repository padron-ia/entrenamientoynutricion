import React, { useState } from 'react';
import {
    Pill, Heart, Thermometer, Scissors, ClipboardList, Brain, FileUp,
    CheckCircle2, ArrowRight, ArrowLeft, Loader2,
    Award, Sparkles, BookOpen, Shield
} from 'lucide-react';
import { Client } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../ToastProvider';

// Import step components
import { AllergyHabitsStep } from './steps/AllergyHabitsStep';
import { CardiovascularDiabeticStep } from './steps/CardiovascularDiabeticStep';
import { MenopausalHistoryStep } from './steps/MenopausalHistoryStep';
import { DiseaseSurgeryStep } from './steps/DiseaseSurgeryStep';
import { FullTreatmentStep } from './steps/FullTreatmentStep';
import { BehaviorDigestionStep } from './steps/BehaviorDigestionStep';
import { AnalyticsUploadStep } from './steps/AnalyticsUploadStep';

interface AnamnesisPortalProps {
    client: Client;
    onComplete: () => void;
}

export interface AnamnesisFormData {
    // Step 1: Allergies & Habits
    alergias_medicamentos: string;
    habito_tabaco: string;
    consumo_ultraprocesados: string;
    horas_sueno: string;
    nivel_estres: number;

    // Step 2: Cardiovascular & Diabetic
    hipertension: boolean;
    dislipemia: boolean;
    infarto_previo: boolean;
    ictus_previo: boolean;
    fecha_diagnostico_diabetes: string;
    peso_al_diagnostico: number;
    perdida_peso_reciente: string;
    sospecha_lada: boolean;

    // Step 3: Menopause
    edad_menopausia: number;
    sintomas_menopausia: string;
    osteoporosis: boolean;
    niebla_mental: boolean;
    candidata_thm: string;

    // Step 4: Diseases & Surgeries
    enfermedades_previas: string;
    cirugias_previas: string;

    // Step 5: Full Treatment
    tratamiento_actual_completo: string;
    detalle_antidiabeticos: string;
    detalle_insulina_completo: string;

    // Step 6: Behavior & Digestion
    comer_emocional: string;
    episodios_atracon: string;
    tca_detalle: string;
    calidad_sueno: string;
    sueno_afecta_apetito: boolean;
    problemas_digestivos: string;

    // Step 7: Analytics Upload
    analitica_urls: string[];
}

export function AnamnesisPortal({ client, onComplete }: AnamnesisPortalProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    const [formData, setFormData] = useState<AnamnesisFormData>({
        alergias_medicamentos: client.anamnesis?.alergias_medicamentos || '',
        habito_tabaco: client.anamnesis?.habito_tabaco || '',
        consumo_ultraprocesados: client.anamnesis?.consumo_ultraprocesados || '',
        horas_sueno: client.anamnesis?.horas_sueno || '',
        nivel_estres: client.anamnesis?.nivel_estres || 5,
        hipertension: client.anamnesis?.hipertension || false,
        dislipemia: client.anamnesis?.dislipemia || false,
        infarto_previo: client.anamnesis?.infarto_previo || false,
        ictus_previo: client.anamnesis?.ictus_previo || false,
        fecha_diagnostico_diabetes: client.anamnesis?.fecha_diagnostico_diabetes || '',
        peso_al_diagnostico: client.anamnesis?.peso_al_diagnostico || 0,
        perdida_peso_reciente: client.anamnesis?.perdida_peso_reciente || '',
        sospecha_lada: client.anamnesis?.sospecha_lada || false,
        edad_menopausia: client.anamnesis?.edad_menopausia || 0,
        sintomas_menopausia: client.anamnesis?.sintomas_menopausia || '',
        osteoporosis: client.anamnesis?.osteoporosis || false,
        niebla_mental: client.anamnesis?.niebla_mental || false,
        candidata_thm: client.anamnesis?.candidata_thm ? 'Si' : '',
        enfermedades_previas: client.anamnesis?.enfermedades_previas || '',
        cirugias_previas: client.anamnesis?.cirugias_previas || '',
        tratamiento_actual_completo: client.anamnesis?.tratamiento_actual_completo || '',
        detalle_antidiabeticos: client.anamnesis?.detalle_antidiabeticos || '',
        detalle_insulina_completo: client.anamnesis?.detalle_insulina_completo || '',
        comer_emocional: client.anamnesis?.comer_emocional || '',
        episodios_atracon: client.anamnesis?.episodios_atracon || '',
        tca_detalle: client.anamnesis?.tca_detalle || '',
        calidad_sueno: client.anamnesis?.calidad_sueno || '',
        sueno_afecta_apetito: client.anamnesis?.sueno_afecta_apetito || false,
        problemas_digestivos: client.anamnesis?.problemas_digestivos || '',
        analitica_urls: client.anamnesis?.analitica_urls || [],
    });

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const isWoman = (client.gender || '').toLowerCase() === 'mujer';

    // Build steps, conditionally including menopause step
    const allSteps = [
        {
            id: 'allergy-habits',
            title: 'Alergias y Hábitos',
            description: 'Alergias, tabaco, sueño y nivel de estrés.',
            icon: Pill,
            component: <AllergyHabitsStep formData={formData} updateField={updateField} />
        },
        {
            id: 'cardiovascular',
            title: 'Historial Cardiovascular',
            description: 'Factores de riesgo cardiovascular y diagnóstico diabético.',
            icon: Heart,
            component: <CardiovascularDiabeticStep formData={formData} updateField={updateField} />
        },
        ...(isWoman ? [{
            id: 'menopause',
            title: 'Menopausia',
            description: 'Información hormonal relevante para tu tratamiento.',
            icon: Thermometer,
            component: <MenopausalHistoryStep formData={formData} updateField={updateField} />
        }] : []),
        {
            id: 'diseases-surgery',
            title: 'Enfermedades y Cirugías',
            description: 'Historial médico previo.',
            icon: Scissors,
            component: <DiseaseSurgeryStep formData={formData} updateField={updateField} />
        },
        {
            id: 'treatment',
            title: 'Tratamiento Completo',
            description: 'Toda tu medicación actual con detalle.',
            icon: ClipboardList,
            component: <FullTreatmentStep formData={formData} updateField={updateField} />
        },
        {
            id: 'behavior-digestion',
            title: 'Conducta y Digestión',
            description: 'Hábitos alimentarios emocionales y salud digestiva.',
            icon: Brain,
            component: <BehaviorDigestionStep formData={formData} updateField={updateField} />
        },
        {
            id: 'analytics-upload',
            title: 'Analíticas',
            description: 'Sube tu última analítica de sangre.',
            icon: FileUp,
            component: <AnalyticsUploadStep
                clientId={client.id}
                uploadedUrls={formData.analitica_urls}
                onUrlsChange={(urls) => updateField('analitica_urls', urls)}
            />
        },
    ];

    const steps = allSteps;

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            window.scrollTo(0, 0);
        }
    };

    const handleFinalize = async () => {
        setIsSubmitting(true);
        try {
            const updateData: any = {
                onboarding_phase2_completed: true,
                onboarding_phase2_completed_at: new Date().toISOString(),
                status: 'active',
                property_estado_cliente: 'Activo',
                // All anamnesis fields
                property_alergias_medicamentos: formData.alergias_medicamentos || null,
                property_habito_tabaco: formData.habito_tabaco || null,
                property_consumo_ultraprocesados: formData.consumo_ultraprocesados || null,
                property_horas_sueno: formData.horas_sueno || null,
                property_nivel_estres: formData.nivel_estres || null,
                property_hipertension: formData.hipertension,
                property_dislipemia: formData.dislipemia,
                property_infarto_previo: formData.infarto_previo,
                property_ictus_previo: formData.ictus_previo,
                property_fecha_diagnostico_diabetes: formData.fecha_diagnostico_diabetes || null,
                property_peso_al_diagnostico: formData.peso_al_diagnostico || null,
                property_perdida_peso_reciente: formData.perdida_peso_reciente || null,
                property_sospecha_lada: formData.sospecha_lada,
                property_enfermedades_previas: formData.enfermedades_previas || null,
                property_cirugias_previas: formData.cirugias_previas || null,
                property_tratamiento_actual_completo: formData.tratamiento_actual_completo || null,
                property_detalle_antidiabeticos: formData.detalle_antidiabeticos || null,
                property_detalle_insulina_completo: formData.detalle_insulina_completo || null,
                property_comer_emocional: formData.comer_emocional || null,
                property_episodios_atracon: formData.episodios_atracon || null,
                property_tca_detalle: formData.tca_detalle || null,
                property_calidad_sueno: formData.calidad_sueno || null,
                property_sueno_afecta_apetito: formData.sueno_afecta_apetito,
                property_problemas_digestivos: formData.problemas_digestivos || null,
                property_analitica_urls: formData.analitica_urls.length > 0 ? JSON.stringify(formData.analitica_urls) : null,
            };

            // Add menopause fields only for women
            if (isWoman) {
                updateData.property_edad_menopausia = formData.edad_menopausia || null;
                updateData.property_sintomas_menopausia = formData.sintomas_menopausia || null;
                updateData.property_osteoporosis = formData.osteoporosis;
                updateData.property_niebla_mental = formData.niebla_mental;
                updateData.property_candidata_thm = formData.candidata_thm === 'Si';
            }

            const { error } = await supabase
                .from('clientes_pt_notion')
                .update(updateData)
                .eq('id', client.id);

            if (error) throw error;

            // Create comprehensive medical review with data from Phase 1 + Phase 2
            try {
                const conditions = [
                    ...(client.healthConditions || []),
                    ...(client.otherConditions || []),
                ].filter(Boolean);

                const anamnesisSummary = [
                    formData.hipertension ? 'Hipertensión' : null,
                    formData.dislipemia ? 'Dislipemia' : null,
                    formData.infarto_previo ? 'Infarto previo' : null,
                    formData.ictus_previo ? 'Ictus previo' : null,
                    formData.sospecha_lada ? 'Sospecha LADA' : null,
                    formData.enfermedades_previas ? `Enfermedades previas: ${formData.enfermedades_previas}` : null,
                    formData.cirugias_previas ? `Cirugías: ${formData.cirugias_previas}` : null,
                    formData.alergias_medicamentos ? `Alergias med.: ${formData.alergias_medicamentos}` : null,
                ].filter(Boolean).join('. ');

                const treatmentSummary = [
                    formData.tratamiento_actual_completo ? `Tratamiento: ${formData.tratamiento_actual_completo}` : null,
                    formData.detalle_antidiabeticos ? `Antidiabéticos: ${formData.detalle_antidiabeticos}` : null,
                    formData.detalle_insulina_completo ? `Insulina: ${formData.detalle_insulina_completo}` : null,
                ].filter(Boolean).join('. ');

                const habitsSummary = [
                    formData.habito_tabaco ? `Tabaco: ${formData.habito_tabaco}` : null,
                    formData.horas_sueno ? `Sueño: ${formData.horas_sueno}` : null,
                    formData.nivel_estres ? `Estrés: ${formData.nivel_estres}/10` : null,
                    formData.consumo_ultraprocesados ? `Ultraprocesados: ${formData.consumo_ultraprocesados}` : null,
                    formData.problemas_digestivos ? `Digestivo: ${formData.problemas_digestivos}` : null,
                ].filter(Boolean).join('. ');

                const diabetesInfo = conditions.find(c =>
                    c.toLowerCase().includes('diabetes') || c.toLowerCase().includes('tipo 1') || c.toLowerCase().includes('tipo 2')
                ) || 'No especificado';

                const comments = [
                    `VALORACIÓN INICIAL COMPLETA (Registro + Anamnesis)`,
                    `Paciente: ${client.firstName} ${client.surname || ''}`,
                    ``,
                    `--- DATOS REGISTRO ---`,
                    `Condiciones: ${conditions.join(', ') || 'Ninguna'}`,
                    `HbA1c: ${client.lastHba1c || 'N/D'} | Glucosa ayunas: ${client.glucoseFasting || 'N/D'}`,
                    `Peso: ${client.weight || 'N/D'} kg | Altura: ${client.height || 'N/D'} cm`,
                    client.usesInsulin ? `Insulina: ${client.insulinBrand || ''} - ${client.insulinDose || ''}` : 'No usa insulina',
                    client.dailyMedication ? `Medicación: ${client.dailyMedication}` : '',
                    ``,
                    `--- ANAMNESIS ---`,
                    anamnesisSummary ? `Historial: ${anamnesisSummary}` : '',
                    treatmentSummary || '',
                    habitsSummary ? `Hábitos: ${habitsSummary}` : '',
                    formData.comer_emocional ? `Comer emocional: ${formData.comer_emocional}` : '',
                    formData.episodios_atracon ? `Atracones: ${formData.episodios_atracon}` : '',
                    formData.fecha_diagnostico_diabetes ? `Diagnóstico diabetes: ${formData.fecha_diagnostico_diabetes}` : '',
                    formData.peso_al_diagnostico ? `Peso al diagnóstico: ${formData.peso_al_diagnostico} kg` : '',
                    formData.perdida_peso_reciente ? `Pérdida peso reciente: ${formData.perdida_peso_reciente}` : '',
                    isWoman && formData.edad_menopausia ? `Menopausia: ${formData.edad_menopausia} años. Síntomas: ${formData.sintomas_menopausia || 'N/D'}` : '',
                ].filter(Boolean).join('\n');

                const fileUrls = formData.analitica_urls.length > 0 ? formData.analitica_urls : [];

                await supabase
                    .from('medical_reviews')
                    .insert({
                        client_id: client.id,
                        coach_id: client.coach_id || null,
                        submission_date: new Date().toISOString(),
                        diabetes_type: diabetesInfo,
                        insulin_usage: client.usesInsulin ? 'Si' : 'No',
                        insulin_dose: client.insulinDose || null,
                        medication: client.dailyMedication || null,
                        comments,
                        report_type: 'Valoración Inicial',
                        status: 'pending',
                        file_urls: fileUrls,
                    });
            } catch (err) {
                console.warn('No se pudo crear la valoración médica:', err);
            }

            toast.success("Anamnesis completada. Tu portal está ahora disponible.");
            onComplete();
        } catch (err: any) {
            console.error('Error finalizing anamnesis:', err);
            toast.error("Error al guardar la anamnesis. Inténtalo de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const StepIcon = steps[currentStep].icon;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4">
            <div className="max-w-4xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-accent-100 text-accent-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
                        <Sparkles className="w-4 h-4" /> Paso final: Anamnesis Médica
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Hola, {client.firstName}
                    </h1>
                    <p className="text-slate-500 max-w-lg mx-auto">
                        Necesitamos esta información para que tu coach y nuestros endocrinos puedan personalizar tu tratamiento.
                        Completa estos datos para desbloquear tu portal.
                    </p>
                </div>

                {/* Progress Indicators */}
                <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
                    {steps.map((step, idx) => {
                        const Icon = step.icon;
                        const active = idx === currentStep;
                        const completed = idx < currentStep;
                        return (
                            <div key={step.id} className="flex items-center gap-2">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${active ? 'bg-slate-900 text-white shadow-lg' :
                                    completed ? 'bg-sea-100 text-sea-600' : 'bg-white text-slate-300 border border-slate-200'
                                    }`}>
                                    {completed ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                                </div>
                                <div className="hidden sm:block">
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {step.title}
                                    </p>
                                </div>
                                {idx < steps.length - 1 && <div className="w-6 h-px bg-slate-200 mx-1"></div>}
                            </div>
                        );
                    })}
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
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

                    {/* Step Component */}
                    <div className="p-8">
                        {steps[currentStep].component}
                    </div>

                    {/* Navigation */}
                    <div className="border-t p-6 flex justify-between items-center bg-slate-50">
                        <button
                            onClick={prevStep}
                            disabled={currentStep === 0}
                            className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Anterior
                        </button>

                        {currentStep === steps.length - 1 ? (
                            <button
                                onClick={handleFinalize}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-8 py-3 text-white rounded-lg font-bold transition-all disabled:opacity-50"
                                style={{ background: 'var(--gradient-accent)' }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        Completar Anamnesis
                                        <CheckCircle2 className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={nextStep}
                                className="flex items-center gap-2 px-8 py-3 text-white rounded-lg font-bold transition-all"
                                style={{ background: 'var(--gradient-accent)' }}
                            >
                                Siguiente
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Submitting Overlay */}
                    {isSubmitting && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                            <Loader2 className="w-12 h-12 animate-spin text-slate-900 mb-4" />
                            <p className="font-bold text-slate-900">Guardando tu anamnesis...</p>
                            <p className="text-sm text-slate-500">Preparando tu portal personalizado.</p>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="mt-8 flex items-center justify-center gap-8 text-slate-400 text-sm">
                    <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-accent-400" /> Datos protegidos</div>
                    <div className="flex items-center gap-2"><Award className="w-4 h-4 text-accent-400" /> Calidad Academia</div>
                    <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-400" /> Método científico</div>
                </div>
            </div>
        </div>
    );
}
