import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
    Save, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
    Loader2, Apple, Clock, Heart, Coffee, Moon, Brain,
    Activity, Smartphone, MessageCircle, Target, Utensils,
    TrendingUp, Users, BookOpen, Pill, Globe, Droplet
} from 'lucide-react';

// Import sections
import { DietaryPreferencesSection } from './sections/DietaryPreferencesSection';
import {
    MealScheduleSection,
    EatingHabitsSection,
    SpecificConsumptionSection,
    EatingBehaviorSection,
    Recall24hSection,
    SupplementsSection,
    SocialContextSection,
    KnowledgeSection,
    NutritionGoalsSection,
    SleepSection,
    StressSection,
    MenstruationSection,
    DigestionSection,
    ExerciseNutritionSection,
    TechnologySection,
    CommunicationSection,
    GlucoseGoalsSection
} from './sections/AllSections';

export interface NutritionAssessmentData {
    // Preferencias Dietéticas
    dietaryPreferences: string[];
    otherDietaryPreferences: string;
    unwantedFoods: string;
    regularFoods: string[];
    allergies: string[];
    otherAllergies: string;

    // Horarios
    mealsPerDay: number;
    breakfastTime: string;
    midMorningTime: string;
    lunchTime: string;
    snackTime: string;
    dinnerTime: string;
    lateSnackTime: string;

    // Hábitos
    cooksSelf: boolean;
    whoCooks: string;
    weighsFood: boolean;
    eatsOutPerWeek: number;
    mealPreparationTime: string;
    cookingSkills: string;
    familyEatsSame: boolean;
    foodBudget: string;

    // Consumo Específico
    eatsBread: boolean;
    breadType: string;
    breadAmount: string;
    breadFrequency: string;
    snacksBetweenMeals: boolean;
    snackFrequency: string;
    whatSnacks: string;
    snackTriggers: string[];
    drinkWithMeals: string;
    waterIntakeLiters: number;
    coffeeCupsPerDay: number;
    teaCupsPerDay: number;
    sodaPerWeek: number;
    juicePerWeek: number;
    alcoholPerWeek: number;
    alcoholType: string[];
    alcoholOccasions: string;
    hasCravings: boolean;
    cravingFrequency: string;
    cravingFoods: string;
    cravingTimeOfDay: string[];

    // Conducta Alimentaria
    hasEatingDisorder: boolean;
    eatingDisorderType: string;
    eatingDisorderTreatment: boolean;
    emotionalEating: string[];
    bingeEatingEpisodes: boolean;
    bingeFrequency: string;
    compensatoryBehaviors: boolean;

    // Recordatorio 24h
    last24hMeals: string;
    last24hBreakfast: string;
    last24hLunch: string;
    last24hDinner: string;
    last24hSnacks: string;

    // Suplementos
    takesSupplements: boolean;
    supplements: string[];
    supplementsDetail: string;

    // Contexto Social
    culturalFoodRestrictions: string;
    socialEatingChallenges: string;
    workLunchSituation: string;
    weekendEatingPattern: string;

    // Conocimientos
    nutritionKnowledge: string;
    readsLabels: boolean;
    countsCalories: boolean;
    usesNutritionApps: boolean;
    whichApps: string;
    previousDiets: string;
    dietSuccessRate: string;

    // Objetivos Nutricionales
    nutritionGoals: string[];
    biggestChallenge: string;
    motivationLevel: string;
    supportSystem: string;

    // Sueño
    sleepHoursPerNight: number;
    sleepQuality: string;
    wakesUpToEat: boolean;
    nightEatingSyndrome: boolean;
    sleepAffectsAppetite: boolean;

    // Estrés
    stressLevel: string;
    stressEatingFrequency: string;
    anxietyMedication: boolean;
    stressManagementTechniques: string[];
    stressTriggers: string;

    // Menstruación
    hasMenstrualCycle: boolean;
    pmsAffectsEating: boolean;
    pmsCravings: string;
    menstrualCycleRegularity: string;
    menopauseStatus: string;

    // Digestión
    digestiveIssues: string[];
    bowelMovementFrequency: string;
    foodIntolerancesSuspected: string;
    takesDigestiveEnzymes: boolean;
    takesProbiotics: boolean;
    digestiveDiscomfortFoods: string;

    // Ejercicio-Nutrición
    exerciseAffectsAppetite: boolean;
    postWorkoutEatingPattern: string;
    preWorkoutEatingPattern: string;
    usesSportsNutrition: boolean;
    sportsSupplements: string[];
    exerciseTimingMeals: string;

    // Tecnología
    usesGlucoseMonitor: boolean;
    glucoseMonitorType: string;
    tracksFoodPhotos: boolean;
    willingToTrackDaily: boolean;
    preferredTrackingMethod: string;
    currentlyTracking: boolean;
    trackingAppsUsed: string;

    // Comunicación
    preferredContactMethod: string;
    preferredContactTime: string;
    needsReminders: boolean;
    reminderFrequency: string;
    communicationStylePreference: string;

    // Objetivos Glucosa
    targetFastingGlucose: number;
    targetPostMealGlucose: number;
    hypoglycemiaFrequency: string;
    hyperglycemiaFrequency: string;
    glucoseVariability: string;
    worstTimeOfDayGlucose: string;
    bestTimeOfDayGlucose: string;
    glucoseAwareness: string;
}

interface NutritionAssessmentFormProps {
    clientId: string;
    existingAssessment?: any;
    onComplete?: () => void;
}

export function NutritionAssessmentForm({ clientId, existingAssessment, onComplete }: NutritionAssessmentFormProps) {
    const [formData, setFormData] = useState<NutritionAssessmentData>(getInitialData(existingAssessment));
    const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0])); // Primera sección expandida
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Cargar borrador de Supabase al montar
    useEffect(() => {
        const loadDraft = async () => {
            try {
                const { data, error } = await supabase
                    .from('nutrition_assessment_drafts')
                    .select('form_data')
                    .eq('client_id', clientId)
                    .maybeSingle();

                if (error) throw error;
                if (data?.form_data) {
                    setFormData(data.form_data);
                }
            } catch (err) {
                console.warn('Error loading draft from Supabase:', err);
            }
        };

        if (clientId) {
            loadDraft();
        }
    }, [clientId]);

    // Auto-save cada 30 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            if (Object.keys(formData).length > 0) {
                saveDraft();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [formData]);

    const saveDraft = async () => {
        setSaving(true);
        try {
            // Guardar borrador en Supabase
            const { error } = await supabase
                .from('nutrition_assessment_drafts')
                .upsert({
                    client_id: clientId,
                    form_data: formData,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            // Mantener local solo como cache de respaldo
            localStorage.setItem(`nutrition_draft_${clientId}`, JSON.stringify(formData));
            setLastSaved(new Date());
        } catch (err) {
            console.error('Error saving draft to Supabase:', err);
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: keyof NutritionAssessmentData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleArrayField = (field: keyof NutritionAssessmentData, value: string) => {
        setFormData(prev => {
            const currentArray = prev[field] as string[];
            const newArray = currentArray.includes(value)
                ? currentArray.filter(item => item !== value)
                : [...currentArray, value];
            return { ...prev, [field]: newArray };
        });
    };

    const toggleSection = (index: number) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);

        try {
            // Preparar datos para BD
            const assessmentData = {
                client_id: clientId,
                // Preferencias Dietéticas
                dietary_preferences: formData.dietaryPreferences,
                other_dietary_preferences: formData.otherDietaryPreferences,
                unwanted_foods: formData.unwantedFoods,
                regular_foods: formData.regularFoods,
                allergies: formData.allergies,
                other_allergies: formData.otherAllergies,
                // Horarios
                meals_per_day: formData.mealsPerDay,
                breakfast_time: formData.breakfastTime || null,
                mid_morning_time: formData.midMorningTime || null,
                lunch_time: formData.lunchTime || null,
                snack_time: formData.snackTime || null,
                dinner_time: formData.dinnerTime || null,
                late_snack_time: formData.lateSnackTime || null,
                // Hábitos
                cooks_self: formData.cooksSelf,
                who_cooks: formData.whoCooks,
                weighs_food: formData.weighsFood,
                eats_out_per_week: formData.eatsOutPerWeek,
                meal_preparation_time: formData.mealPreparationTime,
                cooking_skills: formData.cookingSkills,
                family_eats_same: formData.familyEatsSame,
                food_budget: formData.foodBudget,
                // Consumo Específico
                eats_bread: formData.eatsBread,
                bread_type: formData.breadType,
                bread_amount: formData.breadAmount,
                bread_frequency: formData.breadFrequency,
                snacks_between_meals: formData.snacksBetweenMeals,
                snack_frequency: formData.snackFrequency,
                what_snacks: formData.whatSnacks,
                snack_triggers: formData.snackTriggers,
                drink_with_meals: formData.drinkWithMeals,
                water_intake_liters: formData.waterIntakeLiters,
                coffee_cups_per_day: formData.coffeeCupsPerDay,
                tea_cups_per_day: formData.teaCupsPerDay,
                soda_per_week: formData.sodaPerWeek,
                juice_per_week: formData.juicePerWeek,
                alcohol_per_week: formData.alcoholPerWeek,
                alcohol_type: formData.alcoholType,
                alcohol_occasions: formData.alcoholOccasions,
                has_cravings: formData.hasCravings,
                craving_frequency: formData.cravingFrequency,
                craving_foods: formData.cravingFoods,
                craving_time_of_day: formData.cravingTimeOfDay,
                // Conducta
                has_eating_disorder: formData.hasEatingDisorder,
                eating_disorder_type: formData.eatingDisorderType,
                eating_disorder_treatment: formData.eatingDisorderTreatment,
                emotional_eating: formData.emotionalEating,
                binge_eating_episodes: formData.bingeEatingEpisodes,
                binge_frequency: formData.bingeFrequency,
                compensatory_behaviors: formData.compensatoryBehaviors,
                // Recordatorio 24h
                last_24h_meals: formData.last24hMeals,
                last_24h_breakfast: formData.last24hBreakfast,
                last_24h_lunch: formData.last24hLunch,
                last_24h_dinner: formData.last24hDinner,
                last_24h_snacks: formData.last24hSnacks,
                // Suplementos
                takes_supplements: formData.takesSupplements,
                supplements: formData.supplements,
                supplements_detail: formData.supplementsDetail,
                // Contexto Social
                cultural_food_restrictions: formData.culturalFoodRestrictions,
                social_eating_challenges: formData.socialEatingChallenges,
                work_lunch_situation: formData.workLunchSituation,
                weekend_eating_pattern: formData.weekendEatingPattern,
                // Conocimientos
                nutrition_knowledge: formData.nutritionKnowledge,
                reads_labels: formData.readsLabels,
                counts_calories: formData.countsCalories,
                uses_nutrition_apps: formData.usesNutritionApps,
                which_apps: formData.whichApps,
                previous_diets: formData.previousDiets,
                diet_success_rate: formData.dietSuccessRate,
                // Objetivos
                nutrition_goals: formData.nutritionGoals,
                biggest_challenge: formData.biggestChallenge,
                motivation_level: formData.motivationLevel,
                support_system: formData.supportSystem,
                // Sueño
                sleep_hours_per_night: formData.sleepHoursPerNight,
                sleep_quality: formData.sleepQuality,
                wakes_up_to_eat: formData.wakesUpToEat,
                night_eating_syndrome: formData.nightEatingSyndrome,
                sleep_affects_appetite: formData.sleepAffectsAppetite,
                // Estrés
                stress_level: formData.stressLevel,
                stress_eating_frequency: formData.stressEatingFrequency,
                anxiety_medication: formData.anxietyMedication,
                stress_management_techniques: formData.stressManagementTechniques,
                stress_triggers: formData.stressTriggers,
                // Menstruación
                has_menstrual_cycle: formData.hasMenstrualCycle,
                pms_affects_eating: formData.pmsAffectsEating,
                pms_cravings: formData.pmsCravings,
                menstrual_cycle_regularity: formData.menstrualCycleRegularity,
                menopause_status: formData.menopauseStatus,
                // Digestión
                digestive_issues: formData.digestiveIssues,
                bowel_movement_frequency: formData.bowelMovementFrequency,
                food_intolerances_suspected: formData.foodIntolerancesSuspected,
                takes_digestive_enzymes: formData.takesDigestiveEnzymes,
                takes_probiotics: formData.takesProbiotics,
                digestive_discomfort_foods: formData.digestiveDiscomfortFoods,
                // Ejercicio
                exercise_affects_appetite: formData.exerciseAffectsAppetite,
                post_workout_eating_pattern: formData.postWorkoutEatingPattern,
                pre_workout_eating_pattern: formData.preWorkoutEatingPattern,
                uses_sports_nutrition: formData.usesSportsNutrition,
                sports_supplements: formData.sportsSupplements,
                exercise_timing_meals: formData.exerciseTimingMeals,
                // Tecnología
                uses_glucose_monitor: formData.usesGlucoseMonitor,
                glucose_monitor_type: formData.glucoseMonitorType,
                tracks_food_photos: formData.tracksFoodPhotos,
                willing_to_track_daily: formData.willingToTrackDaily,
                preferred_tracking_method: formData.preferredTrackingMethod,
                currently_tracking: formData.currentlyTracking,
                tracking_apps_used: formData.trackingAppsUsed,
                // Comunicación
                preferred_contact_method: formData.preferredContactMethod,
                preferred_contact_time: formData.preferredContactTime,
                needs_reminders: formData.needsReminders,
                reminder_frequency: formData.reminderFrequency,
                communication_style_preference: formData.communicationStylePreference,
                // Glucosa
                target_fasting_glucose: formData.targetFastingGlucose,
                target_post_meal_glucose: formData.targetPostMealGlucose,
                hypoglycemia_frequency: formData.hypoglycemiaFrequency,
                hyperglycemia_frequency: formData.hyperglycemiaFrequency,
                glucose_variability: formData.glucoseVariability,
                worst_time_of_day_glucose: formData.worstTimeOfDayGlucose,
                best_time_of_day_glucose: formData.bestTimeOfDayGlucose,
                glucose_awareness: formData.glucoseAwareness,
                // Metadatos
                completed_by_client: true,
                status: 'pending'
            };

            const { data, error: dbError } = await supabase
                .from('nutrition_assessments')
                .insert([assessmentData])
                .select()
                .single();

            if (dbError) throw dbError;

            // Limpiar borradores al completar
            await supabase
                .from('nutrition_assessment_drafts')
                .delete()
                .eq('client_id', clientId);

            localStorage.removeItem(`nutrition_draft_${clientId}`);

            // Callback de éxito
            if (onComplete) onComplete();

        } catch (err: any) {
            console.error('Error submitting assessment:', err);
            setError(err.message || 'Error al guardar la evaluación');
        } finally {
            setSubmitting(false);
        }
    };

    const sections = [
        { title: 'Preferencias Dietéticas', icon: Apple, component: DietaryPreferencesSection, color: 'emerald' },
        { title: 'Horarios de Comidas', icon: Clock, component: MealScheduleSection, color: 'blue' },
        { title: 'Hábitos Alimenticios', icon: Utensils, component: EatingHabitsSection, color: 'purple' },
        { title: 'Consumo Específico', icon: Coffee, component: SpecificConsumptionSection, color: 'orange' },
        { title: 'Conducta Alimentaria', icon: Heart, component: EatingBehaviorSection, color: 'pink' },
        { title: 'Recordatorio 24 Horas', icon: BookOpen, component: Recall24hSection, color: 'indigo' },
        { title: 'Suplementación', icon: Pill, component: SupplementsSection, color: 'teal' },
        { title: 'Contexto Social', icon: Users, component: SocialContextSection, color: 'cyan' },
        { title: 'Conocimientos Nutricionales', icon: Brain, component: KnowledgeSection, color: 'violet' },
        { title: 'Objetivos y Motivación', icon: Target, component: NutritionGoalsSection, color: 'rose' },
        { title: 'Sueño y Descanso', icon: Moon, component: SleepSection, color: 'slate' },
        { title: 'Estrés y Ansiedad', icon: TrendingUp, component: StressSection, color: 'red' },
        { title: 'Menstruación', icon: Heart, component: MenstruationSection, color: 'fuchsia' },
        { title: 'Digestión', icon: Droplet, component: DigestionSection, color: 'lime' },
        { title: 'Ejercicio y Nutrición', icon: Activity, component: ExerciseNutritionSection, color: 'amber' },
        { title: 'Tecnología y Tracking', icon: Smartphone, component: TechnologySection, color: 'sky' },
        { title: 'Comunicación', icon: MessageCircle, component: CommunicationSection, color: 'green' },
        { title: 'Objetivos de Glucosa', icon: Target, component: GlucoseGoalsSection, color: 'red' }
    ];

    const completedSections = sections.filter((_, index) => isSectionComplete(index)).length;
    const progress = (completedSections / sections.length) * 100;

    return (
        <div className="max-w-5xl mx-auto p-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold gradient-text">Evaluación Nutricional Completa</h1>
                        <p className="text-slate-600 mt-1">Completa esta evaluación para recibir un plan personalizado</p>
                    </div>
                    {lastSaved && (
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Guardado {formatTimeAgo(lastSaved)}
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Progreso</span>
                        <span className="font-bold text-emerald-600">{completedSections}/{sections.length} secciones</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-red-900">Error</p>
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Sections */}
            <div className="space-y-4">
                {sections.map((section, index) => {
                    const SectionIcon = section.icon;
                    const SectionComponent = section.component;
                    const isExpanded = expandedSections.has(index);
                    const isComplete = isSectionComplete(index);

                    return (
                        <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden">
                            {/* Section Header */}
                            <button
                                onClick={() => toggleSection(index)}
                                className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg bg-${section.color}-100 flex items-center justify-center`}>
                                        <SectionIcon className={`w-5 h-5 text-${section.color}-600`} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-slate-900">{section.title}</h3>
                                        <p className="text-sm text-slate-500">Sección {index + 1} de {sections.length}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {isComplete && (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    )}
                                    {isExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-slate-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                    )}
                                </div>
                            </button>

                            {/* Section Content */}
                            {isExpanded && (
                                <div className="p-6 border-t bg-slate-50">
                                    <SectionComponent
                                        formData={formData}
                                        updateField={updateField}
                                        toggleArrayField={toggleArrayField}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Submit Button */}
            <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-600">
                            {completedSections === sections.length
                                ? '¡Todas las secciones completadas! Ya puedes enviar tu evaluación.'
                                : `Completa las ${sections.length - completedSections} secciones restantes para continuar.`
                            }
                        </p>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || completedSections < sections.length}
                        className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-bold hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Enviar Evaluación
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    function isSectionComplete(index: number): boolean {
        switch (index) {
            case 0: // Preferencias
                return formData.dietaryPreferences.length > 0 && !!formData.unwantedFoods;
            case 1: // Horarios
                return !!formData.breakfastTime && !!formData.lunchTime && !!formData.dinnerTime;
            case 2: // Hábitos
                return !!formData.cookingSkills;
            case 3: // Consumo
                return formData.waterIntakeLiters > 0;
            case 4: // Conducta
                return true; // Opcional o requiere menos campos
            case 5: // Recordatorio 24h
                return !!formData.last24hMeals;
            case 6: // Suplementos
                return true;
            case 7: // Contexto Social
                return true;
            case 8: // Conocimientos
                return !!formData.nutritionKnowledge;
            case 9: // Objetivos
                return formData.nutritionGoals.length > 0;
            case 10: // Sueño
                return formData.sleepHoursPerNight > 0;
            case 11: // Estrés
                return !!formData.stressLevel;
            case 12: // Menstruación
                return true;
            case 13: // Digestión
                return true;
            case 14: // Ejercicio
                return true;
            case 15: // Tecnología
                return true;
            case 16: // Comunicación
                return !!formData.preferredContactMethod;
            case 17: // Glucosa
                return true;
            default:
                return true;
        }
    }
}

function getInitialData(existingAssessment?: any): NutritionAssessmentData {
    // Cargar draft si existe
    const draft = localStorage.getItem(`nutrition_draft_${existingAssessment?.client_id || ''}`);
    if (draft) {
        try {
            return JSON.parse(draft);
        } catch (e) {
            console.error('Error parsing draft:', e);
        }
    }

    // Valores por defecto
    return {
        dietaryPreferences: [],
        otherDietaryPreferences: '',
        unwantedFoods: '',
        regularFoods: [],
        allergies: [],
        otherAllergies: '',
        mealsPerDay: 3,
        breakfastTime: '',
        midMorningTime: '',
        lunchTime: '',
        snackTime: '',
        dinnerTime: '',
        lateSnackTime: '',
        cooksSelf: true,
        whoCooks: '',
        weighsFood: false,
        eatsOutPerWeek: 0,
        mealPreparationTime: '',
        cookingSkills: '',
        familyEatsSame: true,
        foodBudget: '',
        eatsBread: false,
        breadType: '',
        breadAmount: '',
        breadFrequency: '',
        snacksBetweenMeals: false,
        snackFrequency: '',
        whatSnacks: '',
        snackTriggers: [],
        drinkWithMeals: '',
        waterIntakeLiters: 0,
        coffeeCupsPerDay: 0,
        teaCupsPerDay: 0,
        sodaPerWeek: 0,
        juicePerWeek: 0,
        alcoholPerWeek: 0,
        alcoholType: [],
        alcoholOccasions: '',
        hasCravings: false,
        cravingFrequency: '',
        cravingFoods: '',
        cravingTimeOfDay: [],
        hasEatingDisorder: false,
        eatingDisorderType: '',
        eatingDisorderTreatment: false,
        emotionalEating: [],
        bingeEatingEpisodes: false,
        bingeFrequency: '',
        compensatoryBehaviors: false,
        last24hMeals: '',
        last24hBreakfast: '',
        last24hLunch: '',
        last24hDinner: '',
        last24hSnacks: '',
        takesSupplements: false,
        supplements: [],
        supplementsDetail: '',
        culturalFoodRestrictions: '',
        socialEatingChallenges: '',
        workLunchSituation: '',
        weekendEatingPattern: '',
        nutritionKnowledge: '',
        readsLabels: false,
        countsCalories: false,
        usesNutritionApps: false,
        whichApps: '',
        previousDiets: '',
        dietSuccessRate: '',
        nutritionGoals: [],
        biggestChallenge: '',
        motivationLevel: '',
        supportSystem: '',
        sleepHoursPerNight: 0,
        sleepQuality: '',
        wakesUpToEat: false,
        nightEatingSyndrome: false,
        sleepAffectsAppetite: false,
        stressLevel: '',
        stressEatingFrequency: '',
        anxietyMedication: false,
        stressManagementTechniques: [],
        stressTriggers: '',
        hasMenstrualCycle: false,
        pmsAffectsEating: false,
        pmsCravings: '',
        menstrualCycleRegularity: '',
        menopauseStatus: '',
        digestiveIssues: [],
        bowelMovementFrequency: '',
        foodIntolerancesSuspected: '',
        takesDigestiveEnzymes: false,
        takesProbiotics: false,
        digestiveDiscomfortFoods: '',
        exerciseAffectsAppetite: false,
        postWorkoutEatingPattern: '',
        preWorkoutEatingPattern: '',
        usesSportsNutrition: false,
        sportsSupplements: [],
        exerciseTimingMeals: '',
        usesGlucoseMonitor: false,
        glucoseMonitorType: '',
        tracksFoodPhotos: false,
        willingToTrackDaily: false,
        preferredTrackingMethod: '',
        currentlyTracking: false,
        trackingAppsUsed: '',
        preferredContactMethod: '',
        preferredContactTime: '',
        needsReminders: false,
        reminderFrequency: '',
        communicationStylePreference: '',
        targetFastingGlucose: 0,
        targetPostMealGlucose: 0,
        hypoglycemiaFrequency: '',
        hyperglycemiaFrequency: '',
        glucoseVariability: '',
        worstTimeOfDayGlucose: '',
        bestTimeOfDayGlucose: '',
        glucoseAwareness: ''
    };
}

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'hace un momento';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `hace ${hours}h`;
}
