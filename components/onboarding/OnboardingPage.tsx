import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import {
    CheckCircle2, ArrowRight, ArrowLeft, Loader2,
    User, Heart, Activity, Target,
    Lock, MapPin, Stethoscope, TrendingUp, Calendar,
    Clock, Home, Dumbbell, AlertCircle, FileText, Smartphone
} from 'lucide-react';
import InstallationGuide from '../InstallationGuide';

// Import all step components
import { WelcomeStep } from './steps/WelcomeStep';
import { CredentialsStep } from './steps/CredentialsStep';
import { PersonalDataStep } from './steps/PersonalDataStep';
import { MedicalDataStep } from './steps/MedicalDataStep';
import { MeasurementsStep } from './steps/MeasurementsStep';
import { ActivityStep } from './steps/ActivityStep';
import { GoalsStep } from './steps/GoalsStep';
import { ContractStep } from './steps/ContractStep';

export interface OnboardingData {
    // Credenciales
    email: string;
    password: string;
    confirmPassword: string;

    // Personales
    firstName: string;
    surname: string;
    birthDate: string;
    age: number;
    gender: string;
    phone: string;
    address: string;
    city: string;
    province: string;

    // Médicos
    healthConditions: string[];
    otherHealthConditions: string;
    dailyMedication: string;
    usesInsulin: boolean;
    insulinBrand: string;
    insulinDose: string;
    insulinTime: string;
    usesFreestyleLibre: boolean;
    glucoseFasting: string;
    lastHba1c: string;
    specialSituations: string[];
    symptoms: string[];

    // Medidas
    currentWeight: number;
    targetWeight: number;
    height: number;
    armCircumference: number;
    waistCircumference: number;
    thighCircumference: number;

    // Actividad
    dailySteps: string;
    workSchedule: string;
    workType: string;
    hasStrengthTraining: string;
    exerciseLocation: string;

    // Objetivos
    goal3Months: string;
    goal6Months: string;
    goal1Year: string;
    whyTrustUs: string;
    additionalComments: string;

    // Firma (Nuevos campos)
    contractAccepted: boolean;
    healthConsent: boolean; // New RGPD field
    signatureImage: string;
    idNumber: string;
}

export function OnboardingPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saleData, setSaleData] = useState<any>(null);
    const [coachVideo, setCoachVideo] = useState<string>('');
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [contractTemplate, setContractTemplate] = useState<any>(null);

    const [formData, setFormData] = useState<OnboardingData>({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        surname: '',
        birthDate: '',
        age: 0,
        gender: '',
        phone: '',
        address: '',
        city: '',
        province: '',
        healthConditions: [],
        otherHealthConditions: '',
        dailyMedication: '',
        usesInsulin: false,
        insulinBrand: '',
        insulinDose: '',
        insulinTime: '',
        usesFreestyleLibre: false,
        glucoseFasting: '',
        lastHba1c: '',
        specialSituations: [],
        symptoms: [],
        currentWeight: 0,
        targetWeight: 0,
        height: 0,
        armCircumference: 0,
        waistCircumference: 0,
        thighCircumference: 0,
        dailySteps: '',
        workSchedule: '',
        workType: '',
        hasStrengthTraining: '',
        exerciseLocation: '',
        goal3Months: '',
        goal6Months: '',
        goal1Year: '',
        whyTrustUs: '',
        additionalComments: '',
        contractAccepted: false,
        healthConsent: false,
        signatureImage: '',
        idNumber: ''
    });

    useEffect(() => {
        validateToken();
    }, [token]);

    const validateToken = async () => {
        if (!token) {
            setError('Token inválido');
            setLoading(false);
            return;
        }

        try {
            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .select('*, assigned_coach_id')
                .eq('onboarding_token', token)
                .eq('status', 'pending_onboarding')
                .single();

            if (saleError || !sale) {
                setError('Este enlace ya fue usado o no es válido');
                setLoading(false);
                return;
            }

            setSaleData(sale);

            // Pre-fill email and phone from sale
            setFormData(prev => ({
                ...prev,
                email: sale.client_email || '',
                phone: sale.client_phone || '',
                firstName: sale.client_first_name || '',
                surname: sale.client_last_name || '',
                idNumber: sale.client_dni || '',
                address: sale.client_address || ''
            }));

            // Load contract template
            if (sale.contract_template_id) {
                const { data: template } = await supabase
                    .from('contract_templates')
                    .select('*')
                    .eq('id', sale.contract_template_id)
                    .single();

                if (template) {
                    setContractTemplate(template);
                }
            }

            setLoading(false);
        } catch (err) {
            console.error('Error validating token:', err);
            setError('Error al validar el enlace');
            setLoading(false);
        }
    };

    const updateField = (field: keyof OnboardingData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleArrayField = (field: keyof OnboardingData, value: string) => {
        setFormData(prev => {
            const currentArray = prev[field] as string[];
            const newArray = currentArray.includes(value)
                ? currentArray.filter(item => item !== value)
                : [...currentArray, value];
            return { ...prev, [field]: newArray };
        });
    };

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

    const validateForm = (): string | null => {
        // FLUJO SIMPLIFICADO: Solo validamos credenciales
        // El cliente ya tiene sus datos del formulario externo
        // Solo necesita crear su contraseña para autenticarse

        // Credenciales obligatorias
        if (!formData.password || formData.password.length < 6) {
            return 'La contraseña debe tener al menos 6 caracteres';
        }
        if (formData.password !== formData.confirmPassword) {
            return 'Las contraseñas no coinciden';
        }

        return null;
    };

    const handleSubmit = async () => {
        console.log('Finalizing onboarding...');
        // Validate form
        const validationError = validateForm();
        if (validationError) {
            console.warn('Validation error:', validationError);
            alert(validationError);
            return;
        }

        setSubmitting(true);

        try {
            console.log('Sending data to Supabase...', formData.email);
            // 1. Create/Update client in clientes_pt_notion
            const clientData = {
                // Personal Info
                property_nombre: formData.firstName,
                property_apellidos: formData.surname,
                property_correo_electr_nico: formData.email,
                property_tel_fono: formData.phone,
                property_fecha_de_nacimiento: formData.birthDate,
                property_edad: formData.age,
                property_sexo: formData.gender,
                property_direccion: formData.address,
                property_poblaci_n: formData.city,
                property_provincia: formData.province,
                property_dni: formData.idNumber,

                // Medical Info
                property_enfermedades: formData.healthConditions.join(', '),
                property_otras_enfermedades_o_condicionantes: formData.otherHealthConditions,
                property_medicaci_n: formData.dailyMedication,
                property_insulina: formData.usesInsulin ? 'Sí' : 'No',
                property_marca_insulina: formData.insulinBrand || null,
                property_dosis: formData.insulinDose || null,
                property_hora_inyecci_n: formData.insulinTime || null,
                property_usa_sensor_free_style: formData.usesFreestyleLibre,
                property_glucosa_en_ayunas_actual: formData.glucoseFasting || null,
                property_ultima_glicosilada_hb_a1c: formData.lastHba1c || null,
                property_situaciones_especiales: formData.specialSituations.join(', '),
                property_sintomas: formData.symptoms.join(', '),

                // Measurements
                property_peso_actual: formData.currentWeight,
                property_peso_inicial: formData.currentWeight,
                property_peso_objetivo: formData.targetWeight,
                property_altura: formData.height,
                property_per_metro_abdomen: formData.waistCircumference,
                property_per_metro_brazo: formData.armCircumference,
                property_per_metro_muslo: formData.thighCircumference,

                // Activity
                property_pasos_diarios_promedio: formData.dailySteps,
                property_horario_disponibilidad: formData.workSchedule,
                property_actividad_f_sica_general_cliente: formData.workType,
                property_ejercicio_fuerza: formData.hasStrengthTraining,
                property_lugar_entreno: formData.exerciseLocation,

                // Goals
                property_objetivo_3_meses: formData.goal3Months,
                property_objetivo_6_meses: formData.goal6Months,
                property_objetivo_1_anho: formData.goal1Year,
                property_motivo_confianza: formData.whyTrustUs,
                property_comentarios_adicionales: formData.additionalComments,
                property_informaci_n_extra_cliente: `NOTAS VENTA: ${saleData?.admin_notes || ''}\nNOTAS PARA COACH: ${saleData?.coach_notes || ''}`.trim(),

                // Bypass Limbo Mode (Phase 2)
                // Marcamos como completado para que pueda entrar directamente a su ficha
                onboarding_phase2_completed: true,

                // Metadata from sale
                coach_id: saleData?.assigned_coach_id,
                property_meses_servicio_contratados: saleData?.contract_duration || 3,
                property_fecha_alta: new Date().toISOString().split('T')[0],
                start_date: new Date().toISOString().split('T')[0],
                status: 'active'
            };

            // 1b. Check existence (Upsert Logic to prevent duplicates)
            const { data: existingClient, error: fetchError } = await supabase
                .from('clientes_pt_notion')
                .select('id')
                .eq('property_correo_electr_nico', formData.email)
                .maybeSingle();

            if (fetchError) {
                console.warn('Error fetching existing client:', fetchError);
            }

            let newClient;
            let clientError;

            const performUpsert = async (data) => {
                if (existingClient) {
                    return await supabase
                        .from('clientes_pt_notion')
                        .update(data)
                        .eq('id', existingClient.id)
                        .select('id')
                        .single();
                } else {
                    return await supabase
                        .from('clientes_pt_notion')
                        .insert([data])
                        .select('id')
                        .single();
                }
            };

            // First attempt with all columns
            const firstAttempt = await performUpsert(clientData);
            newClient = firstAttempt.data;
            clientError = firstAttempt.error;

            if (clientError) {
                console.error('Error upserting client:', clientError);
                throw new Error('Error al guardar ficha de cliente: ' + clientError.message);
            }

            // 2. Update sale status
            const { error: saleUpdateError } = await supabase
                .from('sales')
                .update({
                    status: 'onboarding_completed',
                    client_id: newClient.id,
                    onboarding_completed_at: new Date().toISOString()
                })
                .eq('id', saleData.id);

            if (saleUpdateError) {
                console.error('Error updating sale:', saleUpdateError);
                // Continue anyway, client was created
            }

            // 3. Create user account
            // First check if we're using Supabase Auth or custom users table
            try {
                // Try Supabase Auth first
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            name: `${formData.firstName} ${formData.surname}`,
                            role: 'client',
                            client_id: newClient.id
                        }
                    }
                });

                if (authError) {
                    console.warn('Supabase Auth error, trying users table:', authError);

                    // Fallback: Create in users table
                    const { error: userError } = await supabase
                        .from('users')
                        .insert([{
                            email: formData.email,
                            password: formData.password, // Note: In production, hash this!
                            name: `${formData.firstName} ${formData.surname}`,
                            role: 'client',
                            created_at: new Date().toISOString()
                        }]);

                    if (userError) {
                        console.error('Error creating user:', userError);
                        // Continue anyway, client is created
                    }
                }

                // 4. Auto-login
                if (!authError && authData?.user) {
                    await supabase.auth.signInWithPassword({
                        email: formData.email,
                        password: formData.password
                    });
                }
            } catch (authErr) {
                console.warn('Auth error:', authErr);
                // Continue to success screen anyway
            }

            // 5. (Optional) Notify coach/system via n8n webhook (Non-blocking)
            (async () => {
                try {
                    // Fetch dynamic webhook URL
                    const { data: webhookSettings } = await supabase
                        .from('app_settings')
                        .select('setting_key, setting_value');

                    const webhookUrl = webhookSettings?.find(s => s.setting_key === 'n8n_webhook_onboarding_completed')?.setting_value;
                    const webhookEnabled = webhookSettings?.find(s => s.setting_key === 'n8n_webhook_enabled')?.setting_value === 'true';

                    if (webhookUrl && webhookEnabled) {
                        const response = await fetch(webhookUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'ONBOARDING_COMPLETED',
                                client_name: `${formData.firstName} ${formData.surname}`,
                                client_email: formData.email,
                                coach_id: saleData.assigned_coach_id,
                                client_id: newClient.id,
                                contract_duration: saleData.contract_duration,
                                signature_image: formData.signatureImage,
                                completed_at: new Date().toISOString()
                            })
                        });

                        if (!response.ok) {
                            console.warn(`⚠️ Webhook N8N respondió con error ${response.status}`);
                        }
                    }
                } catch (webhookErr) {
                    console.warn('Webhook notification failed:', webhookErr);
                }
            })();

            // 6. Auto-create initial medical assessment for endocrinologist (Non-blocking)
            (async () => {
                try {
                    const diabetesInfo = (formData.healthConditions || []).find(c =>
                        c.toLowerCase().includes('diabetes') || c.toLowerCase().includes('tipo 1') || c.toLowerCase().includes('tipo 2')
                    ) || 'No especificado';

                    await supabase
                        .from('medical_reviews')
                        .insert({
                            client_id: newClient.id,
                            coach_id: saleData.assigned_coach_id || null,
                            submission_date: new Date().toISOString(),
                            diabetes_type: diabetesInfo,
                            insulin_usage: formData.usesInsulin ? 'Si' : 'No',
                            insulin_dose: formData.insulinDose || null,
                            medication: formData.dailyMedication || null,
                            comments: `Valoración inicial automática generada al completar el onboarding. Paciente: ${formData.firstName} ${formData.surname}. Condiciones: ${(formData.healthConditions || []).join(', ') || 'Ninguna reportada'}. HbA1c: ${formData.lastHba1c || 'N/D'}. Glucosa ayunas: ${formData.glucoseFasting || 'N/D'}.`,
                            report_type: 'Valoración Inicial',
                            status: 'pending'
                        });
                    console.log('✅ Valoración inicial creada para endocrino.');
                } catch (err) {
                    console.warn('⚠️ No se pudo crear la valoración inicial:', err);
                }
            })();

            // 7. Success! Navigate to portal or show success
            alert('¡Registro completado con éxito! Bienvenido/a a Padron Trainer 🎉');
            navigate('/');

        } catch (error: any) {
            console.error('Error in handleSubmit:', error);
            alert('Error al completar el registro: ' + (error.message || 'Error desconocido'));
        } finally {
            setSubmitting(false);
        }
    };

    // FLUJO SIMPLIFICADO: Solo 2 pasos
    // El cliente ya tiene sus datos del formulario externo
    // Solo necesita crear credenciales y acceder a su ficha
    const steps = [
        {
            title: 'Bienvenida',
            icon: Heart,
            component: <WelcomeStep />
        },
        {
            title: 'Crear Contraseña',
            icon: Lock,
            component: <CredentialsStep formData={formData} updateField={updateField} />
        }
    ];

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
                    <p className="text-slate-600">Validando tu acceso...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Enlace no válido</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-bold hover:from-emerald-700 hover:to-teal-700 transition-all"
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }

    const CurrentStepIcon = steps[currentStep].icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Progress Bar */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900">
                            Paso {currentStep + 1} de {steps.length}
                        </h2>
                        <span className="text-sm text-slate-500">
                            {Math.round(((currentStep + 1) / steps.length) * 100)}% completado
                        </span>
                        <button
                            onClick={() => setIsGuideOpen(true)}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full transition-all"
                        >
                            <Smartphone className="w-3.5 h-3.5" /> Instalar App
                        </button>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        />
                    </div>
                    {/* Step indicators */}
                    <div className="flex justify-between mt-4 overflow-x-auto">
                        {steps.map((step, index) => {
                            const StepIcon = step.icon;
                            const isCompleted = index < currentStep;
                            const isCurrent = index === currentStep;
                            return (
                                <div
                                    key={index}
                                    className={`flex flex-col items-center min-w-[60px] ${isCompleted ? 'text-emerald-600' : isCurrent ? 'text-emerald-700' : 'text-slate-400'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${isCompleted ? 'bg-emerald-100' : isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-100'
                                        }`}>
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : (
                                            <StepIcon className="w-4 h-4" />
                                        )}
                                    </div>
                                    <span className="text-xs text-center hidden sm:block">{step.title}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
                        <div className="flex items-center gap-3">
                            <CurrentStepIcon className="w-8 h-8" />
                            <div>
                                <h1 className="text-2xl font-bold">{steps[currentStep].title}</h1>
                                <p className="text-emerald-100 text-sm">Padron Trainer</p>
                            </div>
                        </div>
                    </div>

                    {/* Step Content */}
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
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-bold hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creando tu cuenta...
                                    </>
                                ) : (
                                    <>
                                        Completar Registro
                                        <CheckCircle2 className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={nextStep}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-bold hover:from-emerald-700 hover:to-teal-700 transition-all"
                            >
                                Siguiente
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
                <InstallationGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
            </div>
        </div>
    );
}
