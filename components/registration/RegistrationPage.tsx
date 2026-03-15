import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import {
    CheckCircle2, ArrowRight, ArrowLeft, Loader2,
    Heart, User, Stethoscope, Scale, Activity,
    Utensils, Target, Users, Lock, AlertCircle, Smartphone, Mail
} from 'lucide-react';

// Import step components
import { RegistrationWelcome } from './steps/RegistrationWelcome';
import { PersonalDataStep } from './steps/PersonalDataStep';
import { MedicalBasicsStep } from './steps/MedicalBasicsStep';
import { MeasurementsStep } from './steps/MeasurementsStep';
import { ActivityStep } from './steps/ActivityStep';
import { NutritionBasicsStep } from './steps/NutritionBasicsStep';
import { GoalsStep } from './steps/GoalsStep';
import { CoachSelectionStep } from './steps/CoachSelectionStep';
import { CredentialsStep } from './steps/CredentialsStep';

export interface RegistrationData {
    // Personal
    firstName: string;
    surname: string;
    email: string;
    phone: string;
    birthDate: string;
    age: number;
    gender: string;
    idNumber: string;
    address: string;
    city: string;
    province: string;

    // Medical
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

    // Measurements
    currentWeight: number;
    targetWeight: number;
    height: number;
    armCircumference: number;
    waistCircumference: number;
    thighCircumference: number;

    // Activity
    dailySteps: string;
    workSchedule: string;
    workType: string;
    hasStrengthTraining: string;
    exerciseLocation: string;

    // Nutrition
    mealsPerDay: number;
    breakfastTime: string;
    morningSnackTime: string;
    lunchTime: string;
    afternoonSnackTime: string;
    dinnerTime: string;
    cooksForSelf: string;
    willingToWeighFood: string;
    mealsOutPerWeek: number;
    preferences: string;
    consumedFoods: string;
    allergies: string;
    dislikes: string;
    eatsWithBread: string;
    breadAmount: string;
    snacking: string;
    snackingDetail: string;
    cravings: string;
    cravingsDetail: string;
    waterIntake: string;
    alcohol: string;
    lastRecallMeal: string;
    eatingDisorder: string;
    eatingDisorderDetail: string;

    // Goals
    goal3Months: string;
    goal6Months: string;
    goal1Year: string;
    whyTrustUs: string;
    additionalComments: string;

    // Coach
    coachId: string;
    coachName: string;

    // Credentials
    password: string;
    confirmPassword: string;
}

const initialFormData: RegistrationData = {
    firstName: '',
    surname: '',
    email: '',
    phone: '',
    birthDate: '',
    age: 0,
    gender: '',
    idNumber: '',
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
    mealsPerDay: 0,
    breakfastTime: '',
    morningSnackTime: '',
    lunchTime: '',
    afternoonSnackTime: '',
    dinnerTime: '',
    cooksForSelf: '',
    willingToWeighFood: '',
    mealsOutPerWeek: 0,
    preferences: '',
    consumedFoods: '',
    allergies: '',
    dislikes: '',
    eatsWithBread: '',
    breadAmount: '',
    snacking: '',
    snackingDetail: '',
    cravings: '',
    cravingsDetail: '',
    waterIntake: '',
    alcohol: '',
    lastRecallMeal: '',
    eatingDisorder: '',
    eatingDisorderDetail: '',
    goal3Months: '',
    goal6Months: '',
    goal1Year: '',
    whyTrustUs: '',
    additionalComments: '',
    coachId: '',
    coachName: '',
    password: '',
    confirmPassword: '',
};

const SESSION_KEY = 'pt_crm_session';

export function RegistrationPage() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [registrationComplete, setRegistrationComplete] = useState(false);
    const [formData, setFormData] = useState<RegistrationData>(initialFormData);

    const updateField = (field: keyof RegistrationData | string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleArrayField = (field: keyof RegistrationData | string, value: string) => {
        setFormData(prev => {
            const currentArray = (prev as any)[field] as string[];
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
        if (!formData.firstName.trim()) return 'El nombre es obligatorio';
        if (!formData.surname.trim()) return 'Los apellidos son obligatorios';
        if (!formData.email.trim()) return 'El email es obligatorio';
        if (!formData.phone.trim()) return 'El teléfono es obligatorio';
        if (!formData.gender) return 'El sexo es obligatorio';
        if (!formData.coachId) return 'Debes seleccionar un coach';
        if (!formData.password || formData.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
        if (formData.password !== formData.confirmPassword) return 'Las contraseñas no coinciden';
        return null;
    };

    const handleSubmit = async () => {
        const validationError = validateForm();
        if (validationError) {
            alert(validationError);
            return;
        }

        setSubmitting(true);

        try {
            // 1. Build client data for clientes_pt_notion
            const clientData: any = {
                // Personal
                property_nombre: formData.firstName,
                property_apellidos: formData.surname,
                property_correo_electr_nico: formData.email,
                property_tel_fono: formData.phone,
                property_fecha_de_nacimiento: formData.birthDate,
                property_edad: formData.age,
                property_sexo: formData.gender,
                property_dni: formData.idNumber || null,
                property_direccion: formData.address,
                property_poblaci_n: formData.city,
                property_provincia: formData.province,

                // Medical
                property_enfermedades: formData.healthConditions.join(', '),
                property_otras_enfermedades_o_condicionantes: formData.otherHealthConditions,
                property_medicaci_n: formData.dailyMedication,
                property_insulina: formData.usesInsulin ? 'Si' : 'No',
                property_marca_insulina: formData.insulinBrand || null,
                property_dosis: formData.insulinDose || null,
                property_hora_inyecci_n: formData.insulinTime || null,
                property_usa_sensor_free_style: formData.usesFreestyleLibre,
                property_glucosa_en_ayunas_actual: formData.glucoseFasting || null,
                property_ultima_glicosilada_hb_a1c: formData.lastHba1c || null,
                property_situaciones_especiales: formData.specialSituations.join(', '),
                property_sintomas: formData.symptoms.join(', '),

                // Measurements
                property_peso_actual: formData.currentWeight || null,
                property_peso_inicial: formData.currentWeight || null,
                property_peso_objetivo: formData.targetWeight || null,
                property_altura: formData.height || null,
                property_per_metro_abdomen: formData.waistCircumference || null,
                property_per_metro_brazo: formData.armCircumference || null,
                property_per_metro_muslo: formData.thighCircumference || null,

                // Activity
                property_pasos_diarios_promedio: formData.dailySteps,
                property_horario_disponibilidad: formData.workSchedule,
                property_actividad_f_sica_general_cliente: formData.workType,
                property_ejercicio_fuerza: formData.hasStrengthTraining,
                property_lugar_entreno: formData.exerciseLocation,

                // Nutrition
                property_n_mero_comidas_al_d_a: formData.mealsPerDay || null,
                property_horario_desayuno: formData.breakfastTime,
                property_horario_media_ma_ana: formData.morningSnackTime,
                property_horario_almuerzo: formData.lunchTime,
                property_horario_merienda: formData.afternoonSnackTime,
                property_horario_cena: formData.dinnerTime,
                property_cocina_l_mismo: formData.cooksForSelf === 'Si',
                property_dispuesto_a_pesar_comida: formData.willingToWeighFood === 'Si',
                property_comidas_fuera_de_casa_semanales: formData.mealsOutPerWeek || null,
                property_preferencias_diet_ticas_generales: formData.preferences,
                property_alimentos_consumidos: formData.consumedFoods,
                property_alergias_intolerancias: formData.allergies,
                property_alimentos_a_evitar_detalle: formData.dislikes,
                property_come_con_pan: formData.eatsWithBread === 'Si',
                property_cantidad_pan: formData.breadAmount,
                property_pica_entre_horas: formData.snacking === 'Si',
                property_especificar_pica_entre_horas: formData.snackingDetail,
                property_tiene_antojos: formData.cravings,
                property_especificar_antojos: formData.cravingsDetail,
                property_bebida_en_la_comida: formData.waterIntake,
                property_consumo_de_alcohol: formData.alcohol,
                property_ltima_comida_recuerdo: formData.lastRecallMeal,
                property_trastorno_alimenticio_diagnosticado: formData.eatingDisorder,
                property_especificar_trastorno_alimenticio: formData.eatingDisorderDetail,

                // Goals
                property_objetivo_3_meses: formData.goal3Months,
                property_objetivo_6_meses: formData.goal6Months,
                property_objetivo_1_anho: formData.goal1Year,
                property_motivo_confianza: formData.whyTrustUs,
                property_comentarios_adicionales: formData.additionalComments,

                // Coach & Program
                coach_id: formData.coachId,
                property_coach: formData.coachName,

                // Defaults
                assigned_nutrition_type: 'Flexible',
                assigned_calories: 1400,
                status: 'active',
                property_estado_cliente: 'Activo',
                property_fecha_alta: new Date().toISOString().split('T')[0],
                start_date: new Date().toISOString().split('T')[0],
                property_inicio_programa: new Date().toISOString().split('T')[0],

                // Phase 2 NOT completed - forces anamnesis limbo
                onboarding_phase2_completed: false,
            };

            // 2. Check if email exists (upsert logic)
            const { data: existingClient } = await supabase
                .from('clientes_pt_notion')
                .select('id')
                .eq('property_correo_electr_nico', formData.email)
                .maybeSingle();

            let newClient;
            let clientError;

            if (existingClient) {
                const result = await supabase
                    .from('clientes_pt_notion')
                    .update(clientData)
                    .eq('id', existingClient.id)
                    .select('id')
                    .single();
                newClient = result.data;
                clientError = result.error;
            } else {
                const result = await supabase
                    .from('clientes_pt_notion')
                    .insert([clientData])
                    .select('id')
                    .single();
                newClient = result.data;
                clientError = result.error;
            }

            if (clientError) {
                console.error('Error upserting client:', clientError);
                throw new Error('Error al guardar ficha de cliente: ' + clientError.message);
            }

            // 3. Create user account
            let userId: string | null = null;
            try {
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
                    const { data: fallbackUser } = await supabase
                        .from('users')
                        .insert([{
                            email: formData.email,
                            password: formData.password,
                            name: `${formData.firstName} ${formData.surname}`,
                            role: 'client',
                            created_at: new Date().toISOString()
                        }])
                        .select('id')
                        .single();
                    if (fallbackUser) userId = fallbackUser.id;
                } else if (authData?.user) {
                    userId = authData.user.id;
                }

                // 4. Auto-login
                if (authData?.user) {
                    await supabase.auth.signInWithPassword({
                        email: formData.email,
                        password: formData.password
                    });
                }
            } catch (authErr) {
                console.warn('Auth error:', authErr);
            }

            // 4b. Link user account to client record so it shows "Cuenta activa"
            if (userId) {
                await supabase
                    .from('clientes_pt_notion')
                    .update({ user_id: userId })
                    .eq('id', newClient.id);
            }

            // 5. Do NOT auto-login. Client will login manually so they learn the access flow.

            // 6. Medical review is created when Phase 2 (anamnesis) is completed, not here

            // 6b. Non-blocking: Create sale record to notify coach of new client
            (async () => {
                try {
                    await supabase.from('sales').insert({
                        client_first_name: formData.firstName,
                        client_last_name: formData.surname,
                        client_email: formData.email,
                        client_phone: formData.phone || null,
                        assigned_coach_id: formData.coachId || null,
                        sale_date: new Date().toISOString(),
                        status: 'won',
                        type: 'Auto-registro',
                        transaction_type: 'new',
                        coach_notification_seen: false,
                        notes: 'Cliente registrado desde formulario público (/#/registro)',
                        sale_amount: 0,
                    });
                } catch (err) {
                    console.warn('No se pudo crear notificación para el coach:', err);
                }
            })();

            // 7. Non-blocking: Notify via webhook
            (async () => {
                try {
                    const { data: webhookSettings } = await supabase
                        .from('app_settings')
                        .select('setting_key, setting_value');

                    const webhookUrl = webhookSettings?.find(s => s.setting_key === 'n8n_webhook_onboarding_completed')?.setting_value;
                    const webhookEnabled = webhookSettings?.find(s => s.setting_key === 'n8n_webhook_enabled')?.setting_value === 'true';

                    if (webhookUrl && webhookEnabled) {
                        await fetch(webhookUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'REGISTRATION_COMPLETED',
                                client_name: `${formData.firstName} ${formData.surname}`,
                                client_email: formData.email,
                                coach_id: formData.coachId,
                                client_id: newClient.id,
                                completed_at: new Date().toISOString()
                            })
                        });
                    }
                } catch (webhookErr) {
                    console.warn('Webhook notification failed:', webhookErr);
                }
            })();

            // 8. Show success screen
            setRegistrationComplete(true);
            window.scrollTo(0, 0);

        } catch (error: any) {
            console.error('Error in registration:', error);
            alert('Error al completar el registro: ' + (error.message || 'Error desconocido'));
        } finally {
            setSubmitting(false);
        }
    };

    const steps = [
        { title: 'Bienvenida', icon: Heart, component: <RegistrationWelcome /> },
        { title: 'Datos Personales', icon: User, component: <PersonalDataStep formData={formData} updateField={updateField} /> },
        { title: 'Datos Médicos', icon: Stethoscope, component: <MedicalBasicsStep formData={formData} updateField={updateField} toggleArrayField={toggleArrayField} /> },
        { title: 'Medidas', icon: Scale, component: <MeasurementsStep formData={formData} updateField={updateField} /> },
        { title: 'Actividad', icon: Activity, component: <ActivityStep formData={formData} updateField={updateField} /> },
        { title: 'Nutrición', icon: Utensils, component: <NutritionBasicsStep formData={formData} updateField={updateField} /> },
        { title: 'Objetivos', icon: Target, component: <GoalsStep formData={formData} updateField={updateField} /> },
        { title: 'Coach', icon: Users, component: <CoachSelectionStep formData={formData} updateField={updateField} /> },
        { title: 'Credenciales', icon: Lock, component: <CredentialsStep formData={formData} updateField={updateField} /> },
    ];

    const CurrentStepIcon = steps[currentStep].icon;

    if (registrationComplete) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-sea-50 to-sea-100 flex items-center justify-center px-4">
                <div className="max-w-lg w-full text-center">
                    <div className="glass rounded-[32px] shadow-2xl shadow-sea-200/50 border border-sea-100 p-10 space-y-6">
                        <div className="w-24 h-24 bg-accent-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-14 h-14 text-accent-600" />
                        </div>

                        <div>
                            <h1 className="text-3xl font-black text-slate-900 mb-3">
                                ¡Enhorabuena, {formData.firstName}!
                            </h1>
                            <p className="text-slate-600 text-lg leading-relaxed">
                                Tu registro se ha completado con éxito. Ya formas parte de la Padron Trainer.
                            </p>
                        </div>

                        <div className="bg-accent-50 border border-accent-200 rounded-2xl p-5 text-left space-y-3">
                            <p className="text-sm font-bold text-accent-800">Tus datos de acceso:</p>
                            <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-accent-100">
                                <Mail className="w-5 h-5 text-accent-600 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-500">Correo electrónico</p>
                                    <p className="font-bold text-slate-900">{formData.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-accent-100">
                                <Lock className="w-5 h-5 text-accent-600 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-500">Contraseña</p>
                                    <p className="font-bold text-slate-900">La que elegiste en el registro</p>
                                </div>
                            </div>
                        </div>

                        <p className="text-slate-500 text-sm">
                            A partir de ahora, accede siempre desde la página de inicio con tu correo y contraseña.
                        </p>

                        <button
                            onClick={() => {
                                window.location.hash = '/';
                                window.location.reload();
                            }}
                            className="w-full py-4 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-accent-200 flex items-center justify-center gap-2"
                            style={{ background: 'var(--gradient-accent)' }}
                        >
                            Acceder a mi portal
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] py-6 px-4 font-sans text-slate-900">
            {/* Top Branding Banner */}
            <div className="max-w-4xl mx-auto mb-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/40 shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-inner p-1 overflow-hidden flex items-center justify-center border border-slate-100">
                        <img
                            src="https://i.postimg.cc/W1GDwQWd/Logo_Academia_Diabetes.jpg"
                            alt="Padron Trainer Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase">Formulario Inicial</h1>
                        <p className="text-sm font-medium text-accent-600 tracking-wide uppercase">Tu camino hacia el control total</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Progreso General</div>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-slate-800">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
                        <div className="w-32 h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-accent-400 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                {/* Steps Navigation - Scrollable on mobile, Grid on Desktop */}
                <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl shadow-slate-200/40 p-4 md:p-6 mb-6 md:mb-8 border border-slate-100 overflow-hidden">
                    <div className="flex justify-start md:justify-between items-center overflow-x-auto pb-4 md:pb-2 gap-6 md:gap-4 scroll-smooth no-scrollbar touch-pan-x">
                        {steps.map((step, index) => {
                            const StepIcon = step.icon;
                            const isCompleted = index < currentStep;
                            const isCurrent = index === currentStep;
                            return (
                                <div
                                    key={index}
                                    className={`flex flex-col items-center flex-shrink-0 transition-all duration-500 ${isCurrent ? 'scale-110' : 'scale-100'}`}
                                >
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 transition-all duration-500 shadow-sm ${isCompleted ? 'bg-sea-100 text-sea-600 opacity-60' :
                                        isCurrent ? 'bg-sea-600 text-white shadow-lg shadow-sea-200' :
                                            'bg-slate-50 text-slate-400'
                                        }`}>
                                        {isCompleted ? <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" /> : <StepIcon className="w-4 h-4 md:w-5 md:h-5" />}
                                    </div>
                                    <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-tighter text-center max-w-[50px] md:max-w-[60px] leading-tight ${isCurrent ? 'text-slate-800' : 'text-slate-400'
                                        }`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-slate-300/30 overflow-hidden border border-slate-100 transition-all duration-500">
                    {/* Step Header */}
                    <div className="bg-[#1a1a1a] p-6 md:p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-sea-600/10 rounded-full -mr-32 -mt-32 blur-3xl" />

                        <div className="relative flex items-center gap-4 md:gap-6">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 backdrop-blur-md rounded-xl md:rounded-[1.25rem] flex items-center justify-center border border-white/10">
                                <CurrentStepIcon className="w-6 h-6 md:w-8 md:h-8 text-accent-400" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-3xl font-black tracking-tight leading-tight">{steps[currentStep].title}</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
                                    <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">Paso {currentStep + 1} de {steps.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step Content */}
                    <div className="p-6 md:p-10 md:min-h-[400px]">
                        <div className="focus-within:ring-0"> {/* Wrapper to handle mobile keyboard issues */}
                            {steps[currentStep].component}
                        </div>
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
                                className="flex items-center gap-2 px-8 py-3 text-white rounded-lg font-bold transition-all disabled:opacity-50"
                                style={{ background: 'var(--gradient-accent)' }}
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
                                className="flex items-center gap-2 px-8 py-3 text-white rounded-lg font-bold transition-all"
                                style={{ background: 'var(--gradient-accent)' }}
                            >
                                Siguiente
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-slate-500">
                        ¿Ya tienes cuenta?{' '}
                        <button onClick={() => navigate('/')} className="text-accent-600 font-bold hover:underline">
                            Iniciar sesión
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
