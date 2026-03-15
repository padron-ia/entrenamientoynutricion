import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight, FileHeart, BookOpen, X, ListChecks, Footprints, Droplets, Utensils, Video, PlayCircle } from 'lucide-react';
import { Client } from '../../types';
import { ClassesView } from './ClassesView';
import { ReviewsView } from './ReviewsView';
import { CheckinView } from './CheckinView';
import { NutritionView } from './NutritionView';
import MedicalReviews from '../../components/MedicalReviews';
import ClientMaterials from '../../components/ClientMaterials';
import { ContractView } from './ContractView';
import { MedicalReportsView } from './MedicalReportsView';
import { CycleTrackingView } from './CycleTrackingView';
import { GlucoseCard } from './GlucoseCard';
import { BodyMeasurementsCard } from './BodyMeasurementsCard';
import { WellnessCard } from './WellnessCard';
import { AchievementsCard } from './AchievementsCard';
import { StepsCard } from './StepsCard';
import { TrainingHubView } from './TrainingHubView';
import { ClientChatView } from './ClientChatView';

// Hooks
import { useWeightTracking } from './hooks/useWeightTracking';
import { useContractStatus } from './hooks/useContractStatus';
import { useUnreadCounts } from './hooks/useUnreadCounts';
import { useGoalsEditor } from './hooks/useGoalsEditor';
import { useClientPortalData } from './hooks/useClientPortalData';

// Sections
import { PortalHeader } from './sections/PortalHeader';
import { BannersSection } from './sections/BannersSection';
import { ProgressCard } from './sections/ProgressCard';
import { ContractStatusCard } from './sections/ContractStatusCard';
import { HealthDataGrid } from './sections/HealthDataGrid';
import { CoachMessage } from './sections/CoachMessage';
import { ObjectivesCard } from './sections/ObjectivesCard';
import { QuickActions } from './sections/QuickActions';
import { ResourcesList } from './sections/ResourcesList';
import { WeightChartSection } from './sections/WeightChartSection';
import { WeightModal } from './sections/WeightModal';
import { PaymentModal } from './sections/PaymentModal';
import { PortalTabNav, PortalTab } from './sections/PortalTabNav';
import { WeeklyGoalsCard } from './sections/WeeklyGoalsCard';
import { WeekSummaryCard } from './sections/WeekSummaryCard';
import { QuickLogButtons } from './sections/QuickLogButtons';
import { ActivityFeed } from './sections/ActivityFeed';
import { StreakCard } from './sections/StreakCard';
import { MyWeekGrid } from './sections/MyWeekGrid';
import { WeeklySummaryCard } from './sections/WeeklySummaryCard';
import { CoachSeenStatus } from './sections/CoachSeenStatus';
import { OptimizationSurveyOverlay } from './OptimizationSurveyOverlay';
import { supabase } from '../../services/supabaseClient';

interface ClientPortalDashboardProps {
    client: Client;
    onRefresh?: () => void | Promise<void>;
    onStartAnamnesis?: () => void;
}

export function ClientPortalDashboard({ client, onRefresh, onStartAnamnesis }: ClientPortalDashboardProps) {
    const [activeView, setActiveView] = useState<'dashboard' | 'classes' | 'reviews' | 'checkin' | 'nutrition' | 'medical' | 'materials' | 'contract' | 'reports' | 'cycle' | 'strength' | 'training' | 'chat'>('dashboard');
    const [portalTab, setPortalTab] = useState<PortalTab>('hoy');
    const [glucoseRefreshKey, setGlucoseRefreshKey] = useState(0);
    const [stepsRefreshKey, setStepsRefreshKey] = useState(0);
    const [stepsComposerSignal, setStepsComposerSignal] = useState(0);

    // Custom hooks
    const weight = useWeightTracking(client, onRefresh);
    const contract = useContractStatus(client);
    const unread = useUnreadCounts(client.id, activeView);
    const goalsEditor = useGoalsEditor(client, onRefresh);
    const portal = useClientPortalData(client, onRefresh);

    // Optimization survey state
    const [showOptimizationSurvey, setShowOptimizationSurvey] = useState(false);
    const [showTour, setShowTour] = useState(false);
    const [showGuideHub, setShowGuideHub] = useState(false);
    const [tourStep, setTourStep] = useState(0);
    const [hasSeenTour, setHasSeenTour] = useState(false);
    const [startChecklist, setStartChecklist] = useState({
        savedLink: false,
        firstLog: false,
        firstCheckin: false,
        seenNutrition: false
    });
    const [tourPointer, setTourPointer] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

    const tourPanelRef = useRef<HTMLDivElement | null>(null);
    const hoySectionRef = useRef<HTMLDivElement | null>(null);
    const progresoSectionRef = useRef<HTMLDivElement | null>(null);
    const recursosMobileRef = useRef<HTMLDivElement | null>(null);
    const recursosDesktopRef = useRef<HTMLDivElement | null>(null);
    const perfilSectionRef = useRef<HTMLDivElement | null>(null);

    const tourSeenStorageKey = `ado_client_tour_seen_${client.id}`;
    const checklistStorageKey = `ado_client_start_checklist_${client.id}`;

    const tourSteps = [
        {
            title: 'Tu semana en 6 acciones',
            description: 'Te enseno donde hacer check-in, registrar pasos y glucosa, ver nutricion, revisiones y clases.'
        },
        {
            title: '1) Check-in + registros rapidos',
            description: 'En Hoy completas tu check-in semanal y registras glucosa, pasos y peso en menos de 2 minutos.'
        },
        {
            title: '2) Ver tu progreso',
            description: 'En Progreso ves peso, medidas, glucosa, pasos y logros para entender como vas.'
        },
        {
            title: '3) Nutricion y revisiones',
            description: 'En Recursos entras a tu plan nutricional y a Mis Revisiones para ver feedback del coach y endocrino.'
        },
        {
            title: '4) Clases grabadas y directos',
            description: 'En Recursos -> Clases Semanales puedes ver grabaciones y entrar al directo de la semana cuando este activo.'
        },
        {
            title: '5) Perfil y ayuda',
            description: 'En Perfil revisas datos y objetivos. Si tienes dudas, abre "Como usar mi portal" cuando quieras.'
        }
    ];

    const tourTargets = ['Portal', 'Hoy', 'Progreso', 'Recursos', 'Perfil', 'Ayuda'];
    const tourTabByStep: Partial<Record<number, PortalTab>> = {
        1: 'hoy',
        2: 'progreso',
        3: 'recursos',
        4: 'recursos',
        5: 'perfil'
    };

    // Load data on mount
    useEffect(() => {
        const loadAll = async () => {
            portal.setLoading(true);
            await Promise.all([weight.loadWeightHistory(), portal.loadCoachData()]);
            portal.setLoading(false);
        };
        loadAll();
    }, [client.id, client.coach_id]);

    // Check if optimization survey should be shown (≤30 days to contract end)
    useEffect(() => {
        const checkSurvey = async () => {
            if (!contract.daysRemaining || contract.daysRemaining > 30 || client.status !== 'active') return;
            const phase = contract.activeContract?.phase || 'F1';
            const { data, error } = await supabase
                .from('optimization_surveys')
                .select('id')
                .eq('client_id', client.id)
                .eq('contract_phase', phase)
                .limit(1);
            if (error) { console.error('[OptSurvey] check error:', error); return; }
            if (!data || data.length === 0) setShowOptimizationSurvey(true);
        };
        checkSurvey();
    }, [client.id, contract.daysRemaining, client.status]);

    // Persistence for tour and checklist
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('client_portal_settings')
                    .select('*')
                    .eq('client_id', client.id)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    setHasSeenTour(data.tour_seen);
                    setStartChecklist(data.checklist_state || {
                        savedLink: false,
                        firstLog: false,
                        firstCheckin: false,
                        seenNutrition: false
                    });
                    if (!data.tour_seen && !showOptimizationSurvey) setShowTour(true);
                } else {
                    const localSeen = localStorage.getItem(tourSeenStorageKey) === 'true';
                    const localChecklist = JSON.parse(localStorage.getItem(checklistStorageKey) || 'null');

                    setHasSeenTour(localSeen);
                    if (localChecklist) setStartChecklist(localChecklist);
                    if (!localSeen && !showOptimizationSurvey) setShowTour(true);

                    await supabase.from('client_portal_settings').upsert({
                        client_id: client.id,
                        tour_seen: localSeen,
                        checklist_state: localChecklist || startChecklist,
                        updated_at: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.error('Error loading portal settings:', err);
            }
        };
        loadSettings();
    }, [client.id, showOptimizationSurvey]);

    const currentTourTab = showTour ? (tourTabByStep[tourStep] ?? null) : null;

    const showSection = (sections: PortalTab[]) => {
        return sections.includes(portalTab);
    };

    const getTourFocusClass = (tab: PortalTab) => {
        if (!currentTourTab) return '';
        if (currentTourTab === tab) return 'ring-2 ring-sea-500 ring-offset-2 ring-offset-surface shadow-2xl';
        return 'opacity-35';
    };

    const getSectionVisibilityClass = (tab: PortalTab) => {
        if (currentTourTab) {
            return tab === currentTourTab ? '' : 'hidden';
        }
        return !showSection([tab]) ? 'hidden lg:block' : '';
    };

    const isVisible = (el: HTMLElement | null) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };

    const getTourTargetElement = () => {
        if (!currentTourTab) return null;
        if (currentTourTab === 'hoy') return hoySectionRef.current;
        if (currentTourTab === 'progreso') return progresoSectionRef.current;
        if (currentTourTab === 'perfil') return perfilSectionRef.current;
        if (currentTourTab === 'recursos') {
            if (isVisible(recursosDesktopRef.current)) return recursosDesktopRef.current;
            if (isVisible(recursosMobileRef.current)) return recursosMobileRef.current;
        }
        return null;
    };

    const closeTour = async () => {
        setShowTour(false);
        setHasSeenTour(true);
        localStorage.setItem(tourSeenStorageKey, 'true');
        await supabase.from('client_portal_settings').upsert({
            client_id: client.id,
            tour_seen: true,
            updated_at: new Date().toISOString()
        });
    };

    const nextTourStep = () => {
        if (tourStep < tourSteps.length - 1) {
            setTourStep(s => s + 1);
        } else {
            closeTour();
        }
    };

    const prevTourStep = () => {
        if (tourStep > 0) setTourStep(s => s - 1);
    };

    const getTourAction = () => {
        if (tourStep === 1) return { label: 'Hacer check-in', onClick: () => setActiveView('checkin') };
        if (tourStep === 3) return { label: 'Ver nutricion', onClick: () => setActiveView('nutrition') };
        return null;
    };

    const medical = client.medical;

    const openGuideHub = () => {
        setShowTour(false);
        setShowGuideHub(true);
    };

    const openGuideAction = (view: any) => {
        setShowGuideHub(false);
        setActiveView(view);
    };

    const openGuideTour = () => {
        setShowGuideHub(false);
        setTourStep(0);
        setShowTour(true);
    };

    const handleOpenStepsComposer = () => {
        setPortalTab('progreso');
        setStepsComposerSignal((k) => k + 1);

        requestAnimationFrame(() => {
            progresoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const toggleChecklistItem = async (key: keyof typeof startChecklist) => {
        const newState = { ...startChecklist, [key]: !startChecklist[key] };
        setStartChecklist(newState);
        localStorage.setItem(checklistStorageKey, JSON.stringify(newState));
        await supabase.from('client_portal_settings').upsert({
            client_id: client.id,
            checklist_state: newState,
            updated_at: new Date().toISOString()
        });
    };

    useLayoutEffect(() => {
        if (!showTour || !currentTourTab) {
            setTourPointer(null);
            return;
        }

        const updatePointer = () => {
            const panel = tourPanelRef.current;
            const target = getTourTargetElement();
            if (!panel || !target) {
                setTourPointer(null);
                return;
            }

            const panelRect = panel.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();

            setTourPointer({
                x1: panelRect.left + 12,
                y1: panelRect.top + panelRect.height * 0.42,
                x2: targetRect.left + Math.min(targetRect.width * 0.55, targetRect.width - 16),
                y2: targetRect.top + Math.min(targetRect.height * 0.18 + 16, targetRect.height - 12)
            });
        };

        const target = getTourTargetElement();
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        const timer = window.setTimeout(updatePointer, 220);
        window.addEventListener('resize', updatePointer);
        window.addEventListener('scroll', updatePointer, true);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('resize', updatePointer);
            window.removeEventListener('scroll', updatePointer, true);
        };
    }, [showTour, currentTourTab, portalTab, tourStep]);

    // --- OPTIMIZATION SURVEY OVERLAY (blocking) ---
    if (showOptimizationSurvey) {
        return (
            <OptimizationSurveyOverlay
                client={client}
                contractPhase={contract.activeContract?.phase || 'F1'}
                contractEndDate={contract.activeContract?.endDate}
                onComplete={() => setShowOptimizationSurvey(false)}
            />
        );
    }

    // --- SUB-VIEWS ---
    if (activeView === 'classes') return <ClassesView onBack={() => setActiveView('dashboard')} />;
    if (activeView === 'reviews') return <ReviewsView clientId={client.id} onBack={() => setActiveView('dashboard')} currentWeeklyComments={client.weeklyReviewComments} />;
    if (activeView === 'checkin') {
        if (!portal.isCheckinWindowOpen) { setActiveView('dashboard'); return null; }
        return <CheckinView client={client} onBack={async () => { if (onRefresh) await onRefresh(); setActiveView('dashboard'); }} />;
    }
    if (activeView === 'nutrition') return <NutritionView client={client} onBack={() => setActiveView('dashboard')} />;
    if (activeView === 'medical') return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4">
            <button onClick={() => setActiveView('dashboard')} className="mb-6 flex items-center gap-2 text-sea-400 hover:text-sea-800 transition-colors font-bold group">
                <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
            </button>
            <MedicalReviews client={client} />
        </div>
    );
    if (activeView === 'materials') return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4">
            <button onClick={() => setActiveView('dashboard')} className="mb-6 flex items-center gap-2 text-sea-400 hover:text-sea-800 transition-colors font-bold group">
                <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
            </button>
            <div className="glass rounded-3xl p-6 shadow-card">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-sea-50 text-sea-600 rounded-xl">
                        <FileHeart className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-sea-900">Materiales y Recursos</h2>
                        <p className="text-sea-400 text-sm">Documentos y enlaces compartidos por tu coach</p>
                    </div>
                </div>
                <ClientMaterials clientId={client.id} currentUser={{ role: 'client', id: client.id, name: client.firstName, email: client.email || '' } as any} readOnly={true} />
            </div>
        </div>
    );
    if (activeView === 'contract') return <ContractView client={client} onBack={() => setActiveView('dashboard')} onRefresh={onRefresh} />;
    if (activeView === 'reports') return <MedicalReportsView clientId={client.id} clientName={`${client.firstName || ''} ${client.surname || ''}`.trim()} onBack={() => setActiveView('dashboard')} />;
    if (activeView === 'cycle') return <CycleTrackingView client={client} onBack={() => setActiveView('dashboard')} onRefresh={onRefresh} />;
    if (activeView === 'strength' || activeView === 'training') return <TrainingHubView clientId={client.id} onBack={() => setActiveView('dashboard')} initialTab={activeView === 'strength' ? 'strength' : 'workspace'} />;
    if (activeView === 'chat') return <ClientChatView clientId={client.id} coachId={client.coach_id} coachName={portal.coachData?.name} coachPhoto={portal.coachData?.photo_url} clientName={`${client.firstName || ''} ${client.surname || ''}`.trim()} onBack={() => setActiveView('dashboard')} />;

    // --- MAIN DASHBOARD ---
    return (
        <div className="min-h-screen bg-surface font-sans text-sea-900 pb-24 lg:pb-20 animate-fade-in">
            {showTour && (
                <div className="fixed inset-0 z-[75] pointer-events-none">
                    {tourPointer && (
                        <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
                            <defs>
                                <marker id="tour-arrow-head" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                                    <polygon points="0 0, 10 4, 0 8" fill="#0ea5a4" />
                                </marker>
                            </defs>
                            <line
                                x1={tourPointer.x1}
                                y1={tourPointer.y1}
                                x2={tourPointer.x2}
                                y2={tourPointer.y2}
                                stroke="#0ea5a4"
                                strokeWidth="3"
                                strokeDasharray="8 6"
                                markerEnd="url(#tour-arrow-head)"
                            />
                        </svg>
                    )}
                    <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-[460px] pointer-events-auto">
                        <div ref={tourPanelRef} className="w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 md:p-7">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-sea-600">Tour del portal</p>
                                    <h3 className="text-2xl font-black text-slate-900 mt-1">{tourSteps[tourStep].title}</h3>
                                    <p className="text-xs font-semibold text-slate-500 mt-1">
                                        Viendo ahora: <span className="text-sea-700">{tourTargets[tourStep]}</span>
                                    </p>
                                </div>
                                <button onClick={closeTour} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-slate-600 leading-relaxed">{tourSteps[tourStep].description}</p>

                            {getTourAction() && (
                                <button
                                    onClick={getTourAction()!.onClick}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                                >
                                    <PlayCircle className="w-4 h-4" /> {getTourAction()!.label}
                                </button>
                            )}

                            <div className="mt-5 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-sea-500 transition-all"
                                    style={{ width: `${((tourStep + 1) / tourSteps.length) * 100}%` }}
                                />
                            </div>

                            <div className="mt-6 flex items-center justify-between gap-3">
                                <button
                                    onClick={prevTourStep}
                                    disabled={tourStep === 0}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold disabled:opacity-40"
                                >
                                    Atras
                                </button>
                                <button
                                    onClick={nextTourStep}
                                    className="px-5 py-2 rounded-xl bg-sea-600 hover:bg-sea-500 text-white font-black"
                                >
                                    {tourStep === tourSteps.length - 1 ? 'Finalizar' : 'Siguiente'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showGuideHub && (
                <div className="fixed inset-0 z-[74] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider text-sea-600">Guia practica</p>
                                <h2 className="text-2xl font-black text-slate-900 mt-1">Como usar mi portal (2 minutos)</h2>
                                <p className="text-sm text-slate-600 mt-2">Sigue estas acciones semanales. Tienes botones directos para entrar ahora.</p>
                            </div>
                            <button onClick={() => setShowGuideHub(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button onClick={() => openGuideAction('checkin')} className="text-left rounded-2xl border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100 transition-colors">
                                <p className="text-xs font-black uppercase tracking-wider text-amber-700 mb-1">Paso 1</p>
                                <p className="font-black text-amber-900 flex items-center gap-2"><ListChecks className="w-4 h-4" /> Haz tu check-in semanal</p>
                                <p className="text-sm text-amber-800 mt-1">Cuenta como te fue la semana. Tarda 2 minutos.</p>
                            </button>

                            <button onClick={() => openGuideAction('hoy')} className="text-left rounded-2xl border border-cyan-200 bg-cyan-50 p-4 hover:bg-cyan-100 transition-colors">
                                <p className="text-xs font-black uppercase tracking-wider text-cyan-700 mb-1">Paso 2</p>
                                <p className="font-black text-cyan-900 flex items-center gap-2"><Footprints className="w-4 h-4" /> Registra pasos de hoy</p>
                                <p className="text-sm text-cyan-800 mt-1">En "Hoy" pulsa Pasos y guarda tu numero diario.</p>
                            </button>

                            <button onClick={() => openGuideAction('hoy')} className="text-left rounded-2xl border border-sea-200 bg-sea-50 p-4 hover:bg-sea-100 transition-colors">
                                <p className="text-xs font-black uppercase tracking-wider text-sea-700 mb-1">Paso 3</p>
                                <p className="font-black text-sea-900 flex items-center gap-2"><Droplets className="w-4 h-4" /> Registra tu glucosa</p>
                                <p className="text-sm text-sea-800 mt-1">En "Hoy" pulsa Glucosa y elige el momento de medicion.</p>
                            </button>

                            <button onClick={() => openGuideAction('nutrition')} className="text-left rounded-2xl border border-lime-200 bg-lime-50 p-4 hover:bg-lime-100 transition-colors">
                                <p className="text-xs font-black uppercase tracking-wider text-lime-700 mb-1">Paso 4</p>
                                <p className="font-black text-lime-900 flex items-center gap-2"><Utensils className="w-4 h-4" /> Revisa tu plan nutricional</p>
                                <p className="text-sm text-lime-800 mt-1">Empieza por instrucciones y luego ve recetas, planificador y lista.</p>
                            </button>

                            <button onClick={() => openGuideAction('reviews')} className="text-left rounded-2xl border border-indigo-200 bg-indigo-50 p-4 hover:bg-indigo-100 transition-colors">
                                <p className="text-xs font-black uppercase tracking-wider text-indigo-700 mb-1">Paso 5</p>
                                <p className="font-black text-indigo-900 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Mira tus revisiones</p>
                                <p className="text-sm text-indigo-800 mt-1">Aqui ves videos y notas nuevas de coach/endocrino.</p>
                            </button>

                            <button onClick={() => openGuideAction('classes')} className="text-left rounded-2xl border border-violet-200 bg-violet-50 p-4 hover:bg-violet-100 transition-colors">
                                <p className="text-xs font-black uppercase tracking-wider text-violet-700 mb-1">Paso 6</p>
                                <p className="font-black text-violet-900 flex items-center gap-2"><Video className="w-4 h-4" /> Clases grabadas y directo</p>
                                <p className="text-sm text-violet-800 mt-1">En Clases Semanales tienes grabaciones y arriba veras el directo cuando toque.</p>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <p className="font-bold text-blue-900 mb-2">Android: anadir a pantalla de inicio</p>
                                <ol className="list-decimal list-inside text-blue-800 space-y-1">
                                    <li>Abre el portal en Chrome.</li>
                                    <li>Pulsa menu (tres puntos).</li>
                                    <li>Pulsa "Anadir a pantalla de inicio".</li>
                                </ol>
                            </div>
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                <p className="font-bold text-indigo-900 mb-2">iPhone: anadir a pantalla de inicio</p>
                                <ol className="list-decimal list-inside text-indigo-800 space-y-1">
                                    <li>Abre el portal en Safari.</li>
                                    <li>Pulsa Compartir.</li>
                                    <li>Pulsa "Anadir a pantalla de inicio".</li>
                                </ol>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={startChecklist.savedLink} onChange={() => toggleChecklistItem('savedLink')} />
                                Ya guarde mi acceso en pantalla de inicio
                            </label>
                            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={startChecklist.firstLog} onChange={() => toggleChecklistItem('firstLog')} />
                                Ya hice mi primer registro rapido
                            </label>
                            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={startChecklist.firstCheckin} onChange={() => toggleChecklistItem('firstCheckin')} />
                                Ya complete mi primer check-in semanal
                            </label>
                            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={startChecklist.seenNutrition} onChange={() => toggleChecklistItem('seenNutrition')} />
                                Ya entre a mi plan nutricional
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button onClick={openGuideTour} className="w-full bg-sea-600 hover:bg-sea-500 text-white font-black py-3 rounded-xl inline-flex items-center justify-center gap-2">
                                <BookOpen className="w-4 h-4" /> Iniciar tour visual
                            </button>
                            <button
                                onClick={() => setShowGuideHub(false)}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl inline-flex items-center justify-center gap-2"
                            >
                                Cerrar guia
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PortalHeader
                clientId={client.id}
                coachId={client.coach_id}
                firstName={client.firstName}
                coachData={portal.coachData}
            />

            <BannersSection
                client={client}
                hasMigratedSecurity={portal.hasMigratedSecurity}
                handleSecurityMigration={portal.handleSecurityMigration}
                onStartAnamnesis={onStartAnamnesis}
                setActiveView={setActiveView as any}
                setIsPaymentModalOpen={portal.setIsPaymentModalOpen}
                shouldShowCheckinReminder={portal.shouldShowCheckinReminder}
                unreadReportsCount={unread.unreadReportsCount}
                unreadReviewsCount={unread.unreadReviewsCount}
                unreadMedicalReviewsCount={unread.unreadMedicalReviewsCount}
                unreadCoachReviewsCount={unread.unreadCoachReviewsCount}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Objetivo semanal — siempre visible en todos los tabs */}
                        <WeeklyGoalsCard clientId={client.id} />

                        {/* Tab: HOY — acciones de la semana, objetivo y mensaje del coach */}
                        <div ref={hoySectionRef} className={`space-y-6 ${getSectionVisibilityClass('hoy')} ${getTourFocusClass('hoy')}`}>
                            {!hasSeenTour && (
                                <div className="glass rounded-3xl p-4 shadow-card border border-sea-100/60 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-sea-500 font-black uppercase tracking-wider">Empieza por aqui</p>
                                        <p className="text-sm font-bold text-sea-900">Abre "Como usar mi portal" para ver guia y checklist</p>
                                    </div>
                                    <button
                                        onClick={openGuideHub}
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-sea-600 text-white text-sm font-bold hover:bg-sea-500 shrink-0"
                                    >
                                        <BookOpen className="w-4 h-4" /> Abrir
                                    </button>
                                </div>
                            )}

                            {/* Resumen semanal — siempre tiene datos, evita pantalla vacía */}
                            <WeekSummaryCard
                                programWeek={contract.programWeek}
                                lastWeightDate={weight.lastWeightDate}
                                currentWeight={weight.currentWeight}
                                lastCheckinDate={portal.lastCheckinDate}
                                checkinPending={portal.shouldShowCheckinReminder}
                            />
                            <StreakCard
                                clientId={client.id}
                                refreshKey={glucoseRefreshKey + stepsRefreshKey}
                            />
                            <MyWeekGrid
                                clientId={client.id}
                                refreshKey={glucoseRefreshKey + stepsRefreshKey}
                            />
                            <WeeklySummaryCard clientId={client.id} />
                            {/* Botones de registro rápido: glucosa, pasos, peso */}
                            <QuickLogButtons
                                clientId={client.id}
                                onWeightClick={() => weight.setIsWeightModalOpen(true)}
                                onGlucoseSaved={() => setGlucoseRefreshKey(k => k + 1)}
                                onStepsClick={handleOpenStepsComposer}
                            />
                            {/* Check-in y acciones del programa — solo móvil */}
                            <div className="lg:hidden">
                                <QuickActions
                                    setIsWeightModalOpen={weight.setIsWeightModalOpen}
                                    setActiveView={setActiveView as any}
                                    activeView={activeView}

                                />
                            </div>
                            <CoachMessage
                                message={(client as any).coach_message}
                                coachName={portal.coachData?.name}
                            />
                            <CoachSeenStatus clientId={client.id} coachName={portal.coachData?.name} />
                        </div>

                        {/* Tab: PROGRESO — todo el seguimiento numérico */}
                        <div ref={progresoSectionRef} className={`space-y-6 ${getSectionVisibilityClass('progreso')} ${getTourFocusClass('progreso')}`}>
                            <ProgressCard
                                startWeight={weight.startWeight}
                                currentWeight={weight.currentWeight}
                                targetWeight={weight.targetWeight}
                                weightProgress={weight.weightProgress}
                                remainingWeight={weight.remainingWeight}
                                isWeightLoss={weight.isWeightLoss}
                                isEditingTargetWeight={weight.isEditingTargetWeight}
                                setIsEditingTargetWeight={weight.setIsEditingTargetWeight}
                                tempTargetWeight={weight.tempTargetWeight}
                                setTempTargetWeight={weight.setTempTargetWeight}
                                isSavingTargetWeight={weight.isSavingTargetWeight}
                                handleTargetWeightSave={weight.handleTargetWeightSave}
                                clientTargetWeight={client.target_weight}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <GlucoseCard clientId={client.id} refreshKey={glucoseRefreshKey} />
                                <BodyMeasurementsCard
                                    clientId={client.id}
                                    initialAbdominal={client.abdominal_perimeter}
                                    initialArm={client.arm_perimeter}
                                    initialThigh={client.thigh_perimeter}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <WellnessCard clientId={client.id} />
                                <AchievementsCard clientId={client.id} />
                            </div>
                            <StepsCard
                                clientId={client.id}
                                isClientView={true}
                                refreshKey={stepsRefreshKey}
                                openComposerSignal={stepsComposerSignal}
                                onStepsSaved={() => setStepsRefreshKey(k => k + 1)}
                            />
                        </div>

                        {/* Tab: RECURSOS — solo móvil (en desktop está en columna derecha siempre visible) */}
                        <div ref={recursosMobileRef} className={`space-y-4 lg:hidden ${currentTourTab ? (currentTourTab === 'recursos' ? '' : 'hidden') : (!showSection(['recursos']) ? 'hidden' : '')} ${getTourFocusClass('recursos')}`}>
                            <ResourcesList
                                client={client}
                                setActiveView={setActiveView as any}
                                unreadReviewsCount={unread.unreadReviewsCount}
                                unreadReportsCount={unread.unreadReportsCount}
                                onOpenGuide={openGuideTour}
                            />
                            <ActivityFeed
                                clientId={client.id}
                                refreshKey={glucoseRefreshKey + stepsRefreshKey}
                            />
                        </div>

                        <div className={`hidden lg:block space-y-4 ${!showSection(['recursos']) ? 'hidden' : ''}`}>
                            <ActivityFeed
                                clientId={client.id}
                                refreshKey={glucoseRefreshKey + stepsRefreshKey}
                            />
                        </div>

                        {/* Tab: PERFIL — datos estables: contrato, ficha médica, objetivos */}
                        <div ref={perfilSectionRef} className={`space-y-6 ${getSectionVisibilityClass('perfil')} ${getTourFocusClass('perfil')}`}>
                            <ContractStatusCard activeContract={contract.activeContract} isUrgent={contract.isUrgent} />

                            <HealthDataGrid
                                client={client}
                                medical={medical}
                                programWeek={contract.programWeek}
                                lastCheckinDate={portal.lastCheckinDate}
                                lastWeightDate={weight.lastWeightDate}
                                weightHistory={weight.weightHistory}
                                isEditingMedication={portal.isEditingMedication}
                                setIsEditingMedication={portal.setIsEditingMedication}
                                medicationValue={portal.medicationValue}
                                setMedicationValue={portal.setMedicationValue}
                                isSavingMedication={portal.isSavingMedication}
                                handleMedicationSave={portal.handleMedicationSave}
                            />
                            <ObjectivesCard
                                clientId={client.id}
                                goals={goalsEditor.goals}
                                isEditingGoal3={goalsEditor.isEditingGoal3}
                                setIsEditingGoal3={goalsEditor.setIsEditingGoal3}
                                tempGoal3={goalsEditor.tempGoal3}
                                setTempGoal3={goalsEditor.setTempGoal3}
                                isSavingGoal3={goalsEditor.isSavingGoal3}
                                isEditingGoal6={goalsEditor.isEditingGoal6}
                                setIsEditingGoal6={goalsEditor.setIsEditingGoal6}
                                tempGoal6={goalsEditor.tempGoal6}
                                setTempGoal6={goalsEditor.setTempGoal6}
                                isSavingGoal6={goalsEditor.isSavingGoal6}
                                isEditingGoal1={goalsEditor.isEditingGoal1}
                                setIsEditingGoal1={goalsEditor.setIsEditingGoal1}
                                tempGoal1={goalsEditor.tempGoal1}
                                setTempGoal1={goalsEditor.setTempGoal1}
                                isSavingGoal1={goalsEditor.isSavingGoal1}
                                handleGoalSave={goalsEditor.handleGoalSave}
                            />
                        </div>
                    </div>

                    {/* RIGHT COLUMN — solo desktop, siempre visible */}
                    <div className={`hidden lg:block lg:col-span-4 space-y-8 ${currentTourTab && currentTourTab !== 'recursos' ? 'opacity-35' : ''}`}>
                        <QuickActions
                            setIsWeightModalOpen={weight.setIsWeightModalOpen}
                            setActiveView={setActiveView as any}
                            activeView={activeView}

                        />
                        <div ref={recursosDesktopRef} className={getTourFocusClass('recursos')}>
                            <ResourcesList
                                client={client}
                                setActiveView={setActiveView as any}
                                unreadReviewsCount={unread.unreadReviewsCount}
                                unreadReportsCount={unread.unreadReportsCount}
                                onOpenGuide={openGuideTour}
                            />
                        </div>
                    </div>
                </div>

                {/* Gráfico de peso — visible en Progreso */}
                <div className={currentTourTab ? (currentTourTab === 'progreso' ? '' : 'hidden') : (!showSection(['progreso']) ? 'hidden lg:block' : '')}>
                    <WeightChartSection
                        weightHistory={weight.weightHistory}
                        targetWeight={weight.targetWeight}
                        startWeight={weight.startWeight}
                    />
                </div>
            </main>

            {/* Modals */}
            <WeightModal
                isOpen={weight.isWeightModalOpen}
                onClose={() => weight.setIsWeightModalOpen(false)}
                newWeight={weight.newWeight}
                setNewWeight={weight.setNewWeight}
                isSubmitting={weight.isSubmitting}
                handleWeightSubmit={weight.handleWeightSubmit}
            />
            <PaymentModal
                isOpen={portal.isPaymentModalOpen}
                onClose={() => portal.setIsPaymentModalOpen(false)}
                paymentFile={portal.paymentFile}
                setPaymentFile={portal.setPaymentFile}
                isUploadingPayment={portal.isUploadingPayment}
                handlePaymentUpload={portal.handlePaymentUpload}
            />

            {/* Mobile Tab Navigation */}
            <PortalTabNav activeTab={portalTab} setActiveTab={setPortalTab} />
        </div>
    );
}
