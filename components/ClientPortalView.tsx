
import React, { useState, useMemo, useEffect } from 'react';
import { Client, ClientStatus } from '../types';
import { mockDb } from '../services/mockSupabase';
import { supabase } from '../services/supabaseClient';
import {
    Briefcase, Calendar, Target, Flame, Quote,
    Activity, TrendingDown, Dumbbell, Zap,
    PlayCircle, Video, Lock, Utensils, FileText,
    Award, Moon, Droplets, AlertCircle, CheckCircle2,
    HeartPulse, Stethoscope, X, ChevronRight, CreditCard
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer
} from 'recharts';
import { ClientAnnouncements } from './ClientAnnouncements';
import { SecurityMigrationBanner } from './client-portal/SecurityMigrationBanner';
import MedicalReviews from './MedicalReviews';
import { NutritionAssessmentForm } from './nutrition/NutritionAssessmentForm';
import CoachGoalsManager from './CoachGoalsManager';
import { riskAlertService } from '../services/riskAlertService';
import { Loader2 } from 'lucide-react';

interface ClientPortalViewProps {
    client: Client;
}

const ReviewHistorySection = ({ client }: { client: Client }) => {
    const [reviews, setReviews] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchReviews = async () => {
            const data = await mockDb.getClientReviews(client.id);
            setReviews(data);
            setLoading(false);
        };
        fetchReviews();
    }, [client.id]);

    return (
        <div className="mt-6 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-500" /> Historial de Revisiones
            </h3>
            <div className="space-y-3">
                {reviews.length > 0 ? (
                    reviews.map((rev, idx) => {
                        let rawUrl = rev.recording_url ? String(rev.recording_url).trim() : '';
                        let validUrl = '';
                        if (rawUrl && rawUrl.length > 5) {
                            if (!rawUrl.startsWith('http')) {
                                validUrl = `https://${rawUrl}`;
                            } else {
                                validUrl = rawUrl;
                            }
                        }
                        return (
                            <a
                                key={idx}
                                href={validUrl || undefined}
                                target={validUrl ? "_blank" : undefined}
                                rel="noopener noreferrer"
                                className={`flex items-center justify-between p-4 rounded-xl transition-colors border group ${validUrl ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 cursor-pointer' : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg transition-colors ${validUrl ? 'bg-white group-hover:bg-indigo-500 group-hover:text-white text-slate-400' : 'bg-slate-200 text-slate-400'}`}>
                                        <PlayCircle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-700">Revisión Semanal</p>
                                        <p className="text-xs text-slate-500">{new Date(rev.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className={`text-xs font-bold px-3 py-1 rounded-full ${validUrl ? 'text-indigo-600 bg-indigo-50 group-hover:bg-white' : 'text-slate-400 bg-slate-200'}`}>
                                    {validUrl ? 'Ver Video' : 'No Disponible'}
                                </div>
                            </a>
                        );
                    })
                ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-slate-500 font-medium">No hay historial de revisiones aún</p>
                    </div>
                )}
                {loading && <p className="text-xs text-slate-400 text-center py-2">Cargando...</p>}
            </div>
        </div>
    );
};

const ClassesTabContent = () => {
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const load = async () => {
            const data = await mockDb.getClasses();
            setClasses(data);
            setLoading(false);
        }
        load();
    }, []);

    const upcoming = classes.filter(c => !c.is_recorded);
    const recorded = classes.filter(c => c.is_recorded);
    const nextClass = upcoming.length > 0 ? upcoming[upcoming.length - 1] : null;

    if (loading) return <div className="p-10 text-center text-slate-400">Cargando clases...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {nextClass ? (
                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 opacity-20 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-125"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse uppercase tracking-wide">En Vivo</span>
                                <span className="text-blue-300 text-sm font-bold tracking-wide uppercase">Próxima Clase Maestra</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">{nextClass.title}</h2>
                            <p className="text-slate-400 max-w-xl mb-6 text-lg leading-relaxed">
                                {nextClass.description || 'Únete a la sesión en vivo con tu coach.'}
                            </p>
                            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-300">
                                <span className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10"><Calendar className="w-4 h-4 text-blue-400" /> {new Date(nextClass.date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10"><Calendar className="w-4 h-4 text-blue-400" /> {new Date(nextClass.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                        <a href={nextClass.url} target="_blank" rel="noopener noreferrer" className="bg-white text-slate-900 hover:bg-blue-50 px-8 py-4 rounded-xl font-bold transition-all hover:scale-105 hover:shadow-lg shadow-blue-900/20 flex items-center gap-3 whitespace-nowrap">
                            <PlayCircle className="w-5 h-5" /> Entrar a la Sala
                        </a>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-900 rounded-3xl p-8 text-white text-center">
                    <p className="text-slate-400">No hay clases en vivo programadas próximamente.</p>
                </div>
            )}

            <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                    <Video className="w-6 h-6 text-blue-600" /> Biblioteca de Clases
                </h3>
                {recorded.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recorded.map((video, idx) => (
                            <a key={idx} href={video.url} target="_blank" rel="noopener noreferrer" className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer hover:-translate-y-1 block">
                                <div className="h-48 bg-slate-100 relative flex items-center justify-center overflow-hidden">
                                    <div className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-blue-500`}></div>
                                    <PlayCircle className="w-14 h-14 text-slate-400 group-hover:text-blue-600 transition-all duration-300 z-10 transform group-hover:scale-110" />
                                    <span className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded">Grabación</span>
                                </div>
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded text-white bg-blue-500`}>{video.category || 'General'}</span>
                                        <span className="text-xs text-slate-400 font-medium">{new Date(video.date).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">{video.title}</h4>
                                </div>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        <p className="text-slate-400">Aún no hay grabaciones disponibles.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const ClientPortalView: React.FC<ClientPortalViewProps> = ({ client }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'nutrition' | 'medical' | 'goals'>('overview');
    const [showNutritionForm, setShowNutritionForm] = useState(false);

    // Local state for immediate UI updates
    const [localGoals, setLocalGoals] = useState(client.goals);
    const [localTargetWeight, setLocalTargetWeight] = useState(client.target_weight);

    // --- Unread notifications logic from ClientPortalDashboard ---
    const [unreadReportsCount, setUnreadReportsCount] = useState(0);
    const [unreadReviewsCount, setUnreadReviewsCount] = useState(0);
    const [unreadMedicalReviewsCount, setUnreadMedicalReviewsCount] = useState(0);
    const [unreadCoachReviewsCount, setUnreadCoachReviewsCount] = useState(0);

    useEffect(() => {
        const loadUnreadCounts = async () => {
            if (!client.id) return;
            try {
                const REPORTS_READ_KEY = `ado_reports_last_seen_${client.id}`;
                const REVIEWS_READ_KEY = `ado_reviews_last_seen_${client.id}`;

                // Load from Supabase first, fallback to localStorage for migration
                const { data: settings } = await supabase
                    .from('client_portal_settings')
                    .select('reports_last_seen_at, reviews_last_seen_at')
                    .eq('client_id', client.id)
                    .maybeSingle();

                let reportsLastSeen = settings?.reports_last_seen_at || localStorage.getItem(REPORTS_READ_KEY);
                let reviewsLastSeen = settings?.reviews_last_seen_at || localStorage.getItem(REVIEWS_READ_KEY);

                // 1. Informes médicos (PDFs) no leídos
                let reportsQuery = supabase
                    .from('medical_reviews')
                    .select('id', { count: 'exact', head: true })
                    .eq('client_id', client.id)
                    .eq('report_type', 'Informe Médico');

                if (reportsLastSeen) {
                    reportsQuery = reportsQuery.gt('created_at', reportsLastSeen);
                }
                const { count: reportsCount } = await reportsQuery;
                setUnreadReportsCount(reportsCount || 0);

                // 2. Revisiones no leídas (valoración inicial + analíticas del endocrino + coach)
                // Medical Reviews (Endocrino)
                let medicalQuery = supabase
                    .from('medical_reviews')
                    .select('id', { count: 'exact', head: true })
                    .eq('client_id', client.id)
                    .neq('report_type', 'Informe Médico')
                    .eq('status', 'reviewed');
                if (reviewsLastSeen) {
                    medicalQuery = medicalQuery.gt('reviewed_at', reviewsLastSeen);
                }

                // Coach Reviews
                let coachQuery = supabase
                    .from('coaching_sessions')
                    .select('id', { count: 'exact', head: true })
                    .eq('client_id', client.id);
                if (reviewsLastSeen) {
                    coachQuery = coachQuery.gt('date', reviewsLastSeen.split('T')[0]);
                }

                const [{ count: medCount }, { count: coachCount }] = await Promise.all([medicalQuery, coachQuery]);
                const mCount = medCount || 0;
                const cCount = coachCount || 0;

                setUnreadMedicalReviewsCount(mCount);
                setUnreadCoachReviewsCount(cCount);
                setUnreadReviewsCount(mCount + cCount);
            } catch (err) {
                console.warn('Error loading unread counts in view:', err);
            }
        };
        loadUnreadCounts();
    }, [client.id]);

    React.useEffect(() => {
        setLocalGoals(client.goals);
        setLocalTargetWeight(client.target_weight);
    }, [client]);

    // Goal Editing States
    const [isEditingGoal3, setIsEditingGoal3] = useState(false);
    const [tempGoal3, setTempGoal3] = useState(client.goals?.goal_3_months || '');
    const [isSavingGoal3, setIsSavingGoal3] = useState(false);

    const [isEditingGoal6, setIsEditingGoal6] = useState(false);
    const [tempGoal6, setTempGoal6] = useState(client.goals?.goal_6_months || '');
    const [isSavingGoal6, setIsSavingGoal6] = useState(false);

    const [isEditingGoal1y, setIsEditingGoal1y] = useState(false);
    const [tempGoal1y, setTempGoal1y] = useState(client.goals?.goal_1_year || '');
    const [isSavingGoal1y, setIsSavingGoal1y] = useState(false);

    const [isEditingTargetWeight, setIsEditingTargetWeight] = useState(false);
    const [tempTargetWeight, setTempTargetWeight] = useState(client.target_weight?.toString() || '');
    const [isSavingTargetWeight, setIsSavingTargetWeight] = useState(false);

    const handleGoalSave = async (period: '3m' | '6m' | '1y' | 'target_weight') => {
        let value: any = '';
        let column = '';
        let setSaving: (v: boolean) => void = () => { };
        let setEditing: (v: boolean) => void = () => { };

        if (period === '3m') {
            value = tempGoal3;
            column = 'property_3_meses';
            setSaving = setIsSavingGoal3;
            setEditing = setIsEditingGoal3;
        } else if (period === '6m') {
            value = tempGoal6;
            column = 'property_6_meses';
            setSaving = setIsSavingGoal6;
            setEditing = setIsEditingGoal6;
        } else if (period === '1y') {
            value = tempGoal1y;
            column = 'property_1_a_o';
            setSaving = setIsSavingGoal1y;
            setEditing = setIsEditingGoal1y;
        } else if (period === 'target_weight') {
            value = parseFloat(tempTargetWeight);
            column = 'property_peso_objetivo';
            setSaving = setIsSavingTargetWeight;
            setEditing = setIsEditingTargetWeight;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('clientes_pt_notion')
                .update({ [column]: value })
                .eq('id', client.id);

            if (error) throw error;

            // Update local state for immediate feedback
            if (period === '3m') setLocalGoals(prev => ({ ...prev, goal_3_months: tempGoal3 }));
            if (period === '6m') setLocalGoals(prev => ({ ...prev, goal_6_months: tempGoal6 }));
            if (period === '1y') setLocalGoals(prev => ({ ...prev, goal_1_year: tempGoal1y }));
            if (period === 'target_weight') setLocalTargetWeight(Number(tempTargetWeight));

            setEditing(false);
        } catch (error) {
            console.error('Error saving goal:', error);
        } finally {
            setSaving(false);
        }
    };

    const liveLostWeight = useMemo(() => {
        const start = Number(client.initial_weight) || 0;
        const current = Number(client.current_weight) || 0;
        return start > 0 && current > 0 ? parseFloat((start - current).toFixed(1)) : 0;
    }, [client.initial_weight, client.current_weight]);

    const weightProgress = useMemo(() => {
        const start = Number(client.initial_weight) || 0;
        const target = Number(localTargetWeight) || 0;
        const current = Number(client.current_weight) || 0;
        if (!start || !target || !current) return 0;
        const totalToLose = start - target;
        const lost = start - current;
        if (totalToLose <= 0) return 100;
        return Math.min(Math.max(Math.round((lost / totalToLose) * 100), 0), 100);
    }, [client.initial_weight, client.current_weight, localTargetWeight]);

    const contractProgress = useMemo(() => {
        if (!client.start_date || !client.contract_end_date) return 0;
        const start = new Date(client.start_date).getTime();
        const end = new Date(client.contract_end_date).getTime();
        const now = new Date().getTime();
        if (end <= start) return 100;
        const totalDuration = end - start;
        const elapsed = now - start;
        return Math.min(Math.max(Math.round((elapsed / totalDuration) * 100), 0), 100);
    }, [client]);

    const isFriday = new Date().getDay() === 5;
    const isMondayOrTuesday = new Date().getDay() === 1 || new Date().getDay() === 2;

    const isCheckinDue = useMemo(() => {
        if (!isMondayOrTuesday) return false;
        if (!client.last_checkin_submitted) return true;

        const today = new Date();
        const day = today.getDay();
        const lastFriday = new Date();
        lastFriday.setDate(today.getDate() - ((day + 2) % 7));
        lastFriday.setHours(0, 0, 0, 0);

        const lastSubmit = new Date(client.last_checkin_submitted);
        return lastSubmit < lastFriday;
    }, [client.last_checkin_submitted, isMondayOrTuesday]);

    const [missedReason, setMissedReason] = useState(client.last_checkin_missed_reason || '');
    const [isSavingReason, setIsSavingReason] = useState(false);
    const [showReasonSaved, setShowReasonSaved] = useState(false);

    const handleSaveReason = async () => {
        if (!missedReason.trim()) return;
        setIsSavingReason(true);
        try {
            await riskAlertService.saveMissedCheckinReason(client.id, missedReason);
            setShowReasonSaved(true);
            setTimeout(() => setShowReasonSaved(false), 3000);
        } catch (e) {
            console.error('Error saving reason:', e);
            alert('Error al guardar el motivo. Por favor, inténtalo de nuevo.');
        } finally {
            setIsSavingReason(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
            <div className="container mx-auto px-6 py-4">
                <SecurityMigrationBanner clientId={client.id} />
            </div>

            <div className="relative mb-8 mx-4 md:mx-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl shadow-lg shadow-blue-200/50 overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                </div>
                <div className="relative z-10 p-6 md:p-10 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight">Hola, {client.firstName} 👋</h1>
                            <p className="text-blue-100 text-lg opacity-90 max-w-2xl font-light leading-relaxed">
                                {client.goals.motivation ? `"${client.goals.motivation}"` : "Bienvenido a tu portal de alumno. ¡A por todas!"}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {client.id && (
                                <div className="relative">
                                    <ClientAnnouncements clientId={client.id} />
                                </div>
                            )}
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 hover:bg-white/20 transition-all cursor-default">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <Briefcase className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-[10px] text-blue-100 uppercase font-bold tracking-wider">Tu Coach</p>
                                    <p className="font-bold">{client.property_coach || 'Equipo PT'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {client.target_weight && (
                        <div className="mt-10 bg-black/20 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
                            <div className="flex justify-between items-end mb-3">
                                <div>
                                    <p className="text-xs font-bold text-blue-100 uppercase mb-1 tracking-wider">Tu Progreso</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold tracking-tight">{weightProgress}%</span>
                                        <span className="text-sm opacity-80 font-medium">completado</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-blue-100 mb-0.5 opacity-80 uppercase font-bold">Meta</p>
                                    <p className="font-bold text-2xl tracking-tight">{client.target_weight} kg</p>
                                </div>
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-4 overflow-hidden p-0.5">
                                <div className="bg-gradient-to-r from-white/90 to-white h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${weightProgress}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="container mx-auto px-4">
                {activeTab === 'goals' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                            <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3 mb-2"><Target className="w-8 h-8 text-indigo-500" /> Tus Objetivos</h2>
                            <p className="text-slate-500 mb-8">Metas establecidas junto a tu coach.</p>

                            <CoachGoalsManager clientId={client.id} isCoach={false} />
                        </div>

                        {/* Visualización de Objetivos a Largo Plazo */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6"><Calendar className="w-5 h-5 text-green-500" /> Objetivos a Largo Plazo</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className={`p-6 rounded-2xl border ${client.goals.goal_3_months_status === 'achieved' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <p className="text-xs font-bold uppercase text-slate-400 mb-2">3 Meses</p>
                                    <p className="font-medium text-slate-800">{client.goals.goal_3_months || 'No definido'}</p>
                                </div>
                                <div className={`p-6 rounded-2xl border ${client.goals.goal_6_months_status === 'achieved' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <p className="text-xs font-bold uppercase text-slate-400 mb-2">6 Meses</p>
                                    <p className="font-medium text-slate-800">{client.goals.goal_6_months || 'No definido'}</p>
                                </div>
                                <div className={`p-6 rounded-2xl border ${client.goals.goal_1_year_status === 'achieved' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <p className="text-xs font-bold uppercase text-slate-400 mb-2">1 Año</p>
                                    <p className="font-medium text-slate-800">{client.goals.goal_1_year || 'No definido'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* --- NOTIFICATION BANNER (Synced with Dashboard) --- */}
                        {(unreadReportsCount > 0 || unreadReviewsCount > 0) && (
                            <div className={`rounded-3xl p-5 text-white shadow-xl mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 
                                ${(unreadCoachReviewsCount > 0 && unreadReportsCount === 0 && unreadMedicalReviewsCount === 0)
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-200'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-purple-200'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shrink-0">
                                        {(unreadCoachReviewsCount > 0 && unreadReportsCount === 0 && unreadMedicalReviewsCount === 0)
                                            ? <Video className="w-7 h-7 text-white" />
                                            : <Stethoscope className="w-7 h-7 text-white" />
                                        }
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">
                                            {(unreadCoachReviewsCount > 0 && unreadReportsCount === 0 && unreadMedicalReviewsCount === 0)
                                                ? "Tienes novedades de tu Coach"
                                                : (unreadCoachReviewsCount === 0 && (unreadReportsCount > 0 || unreadMedicalReviewsCount > 0))
                                                    ? "Tienes novedades del endocrino"
                                                    : "Tienes nuevas actualizaciones"
                                            }
                                        </h2>
                                        <p className="text-purple-100 text-sm mt-0.5">
                                            {[
                                                unreadReportsCount > 0 && `${unreadReportsCount} informe${unreadReportsCount > 1 ? 's' : ''} médico${unreadReportsCount > 1 ? 's' : ''}`,
                                                unreadMedicalReviewsCount > 0 && `${unreadMedicalReviewsCount} revisión${unreadMedicalReviewsCount > 1 ? 'es' : ''} médica${unreadMedicalReviewsCount > 1 ? 's' : ''}`,
                                                unreadCoachReviewsCount > 0 && `${unreadCoachReviewsCount} mensaje${unreadCoachReviewsCount > 1 ? 's' : ''} de tu coach`
                                            ].filter(Boolean).join(' y ')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    {unreadReviewsCount > 0 && (
                                        <button
                                            onClick={() => document.getElementById('review-history-section')?.scrollIntoView({ behavior: 'smooth' })}
                                            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
                                        >
                                            Ver Revisiones <ChevronRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* Friday Reminder */}
                        {isFriday && (
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg flex items-center gap-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Calendar className="w-24 h-24" /></div>
                                <div className="p-3 bg-white/20 rounded-xl"><Zap className="w-8 h-8 text-yellow-300" /></div>
                                <div>
                                    <h4 className="text-xl font-black uppercase tracking-tight mb-1">¡Viernes de Check-in! 📋</h4>
                                    <p className="text-blue-50 opacity-90 max-w-xl">
                                        No olvides enviar tu revisión hoy para que tu coach pueda revisarla y darte feedback al inicio de semana. ¡A por ello!
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Monday/Tuesday Missed Checkin Nudge */}
                        {isCheckinDue && (
                            <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-8 shadow-md relative overflow-hidden">
                                <div className="flex flex-col md:flex-row gap-8 items-center">
                                    <div className="bg-rose-100 p-5 rounded-3xl">
                                        <AlertCircle className="w-12 h-12 text-rose-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-black text-rose-900 mb-2 uppercase tracking-tight">Vemos que falta tu check-in...</h3>
                                        <p className="text-rose-700 font-medium mb-6">
                                            Tu coach está esperando tus datos para ajustar tu plan. Si no has podido enviarlo, dinos el motivo para que lo tengamos en cuenta:
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input
                                                type="text"
                                                value={missedReason}
                                                onChange={(e) => setMissedReason(e.target.value)}
                                                placeholder="Ej: He tenido un viaje familiar / Exámenes finales / ..."
                                                className="flex-1 bg-white border-2 border-rose-100 rounded-xl px-4 py-3 text-rose-900 font-medium focus:border-rose-400 focus:outline-none placeholder:text-rose-200"
                                            />
                                            <button
                                                onClick={handleSaveReason}
                                                disabled={isSavingReason || !missedReason.trim()}
                                                className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg flex items-center gap-2 justify-center"
                                            >
                                                {isSavingReason ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Motivo'}
                                            </button>
                                        </div>
                                        {showReasonSaved && (
                                            <p className="mt-3 text-emerald-600 font-bold flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                                <CheckCircle2 className="w-4 h-4" /> ¡Gracias! Tu coach ha sido informado.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-6">
                                <div className={`rounded-3xl p-8 shadow-sm border relative overflow-hidden transition-all duration-300 group ${client.weeklyReviewUrl ? 'bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-indigo-800' : 'bg-white border-slate-100'}`}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6 relative z-10">
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide ${client.weeklyReviewUrl ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`}>{client.weeklyReviewUrl ? 'Nuevo Video' : 'Sin Novedades'}</span>
                                                <span className={`text-sm font-medium ${client.weeklyReviewUrl ? 'text-indigo-200' : 'text-slate-400'}`}>Revisión Semanal</span>
                                            </div>
                                            <h3 className={`text-2xl font-bold mb-3 tracking-tight ${client.weeklyReviewUrl ? 'text-white' : 'text-slate-800'}`}>{client.weeklyReviewUrl ? '¡Tienes una nueva revisión!' : 'Tu Coach está revisando tu progreso'}</h3>
                                            <p className={`text-base max-w-lg mb-6 leading-relaxed ${client.weeklyReviewUrl ? 'text-indigo-100' : 'text-slate-500'}`}>
                                                {client.weeklyReviewUrl ? 'Haz clic para ver el feedback de esta semana.' : 'Aún no tienes una revisión grabada para esta semana.'}
                                            </p>
                                            {client.weeklyReviewUrl && (
                                                <a href={client.weeklyReviewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-lg">
                                                    <PlayCircle className="w-5 h-5" /> Ver Video Loom
                                                </a>
                                            )}
                                        </div>
                                        <div className={`p-4 rounded-2xl ${client.weeklyReviewUrl ? 'bg-white/10' : 'bg-slate-50'}`}>
                                            <Video className={`w-10 h-10 ${client.weeklyReviewUrl ? 'text-indigo-300' : 'text-slate-300'}`} />
                                        </div>
                                    </div>
                                    <div id="review-history-section">
                                        <ReviewHistorySection client={client} />
                                    </div>
                                </div>

                                {!client.nutrition?.assigned_nutrition_type && (
                                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-3xl p-8 border border-orange-100 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-10"><Utensils className="w-24 h-24 text-orange-500" /></div>
                                        <div className="relative z-10">
                                            <h3 className="text-xl font-bold text-orange-900 mb-4">Tu Primer Paso</h3>
                                            <p className="text-orange-800 font-medium mb-6">Completa tu evaluación para recibir tu plan nutricional.</p>
                                            <button onClick={() => { setActiveTab('nutrition'); setShowNutritionForm(true); }} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all flex items-center gap-3">
                                                <FileText className="w-5 h-5" /> Completar Evaluación
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6"><Briefcase className="w-5 h-5 text-indigo-600" /> Tu Suscripción Actual</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Servicio</p>
                                            <p className="font-bold text-slate-800 text-xl">{client.program.contract1_name || "Programa Personalizado"}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div><p className="text-xs font-bold text-slate-400 uppercase mb-2">Inicio</p><p className="font-bold text-slate-700">{client.start_date ? new Date(client.start_date).toLocaleDateString() : '-'}</p></div>
                                            <div className="text-right"><p className="text-xs font-bold text-slate-400 uppercase mb-2">Fin</p><p className="font-bold text-slate-700">{client.contract_end_date ? new Date(client.contract_end_date).toLocaleDateString() : '-'}</p></div>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                        <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${contractProgress}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Activity className="w-5 h-5 text-blue-500" /> Peso</h3>
                                    <div className="flex items-end gap-2 mb-4">
                                        <span className="text-5xl font-bold text-slate-900 tracking-tighter">{client.current_weight}</span>
                                        <span className="text-slate-400 font-medium mb-1.5">kg</span>
                                    </div>

                                    {/* Target Weight Section */}
                                    <div className="mb-6 pt-4 border-t border-slate-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Objetivo</span>
                                            {!isEditingTargetWeight && (
                                                <button
                                                    onClick={() => setIsEditingTargetWeight(true)}
                                                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <Target className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        {isEditingTargetWeight ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={tempTargetWeight}
                                                    onChange={(e) => setTempTargetWeight(e.target.value)}
                                                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleGoalSave('target_weight')}
                                                    disabled={isSavingTargetWeight}
                                                    className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {isSavingTargetWeight ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </button>
                                                <button
                                                    onClick={() => { setIsEditingTargetWeight(false); setTempTargetWeight(localTargetWeight?.toString() || ''); }}
                                                    className="text-slate-400 hover:text-slate-600 p-1.5"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-end gap-2">
                                                <span className="text-2xl font-bold text-slate-700">{localTargetWeight || '--'}</span>
                                                <span className="text-xs text-slate-400 font-medium mb-1">kg</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-32 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={[{ w: Number(client.initial_weight) }, { w: Number(client.current_weight) }]}>
                                                <Area type="monotone" dataKey="w" stroke="#3b82f6" strokeWidth={4} fill="#eff6ff" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Dumbbell className="w-5 h-5 text-emerald-500" /> Actividad Diaria</h3>
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center"><Zap className="w-8 h-8 text-emerald-500" /></div>
                                        <div>
                                            <p className="text-3xl font-bold text-slate-900">{client.training.stepsGoal?.toLocaleString()}</p>
                                            <p className="text-sm text-slate-500">pasos hoy</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'classes' && <ClassesTabContent />}

                {activeTab === 'nutrition' && (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 border-b border-slate-50">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><Utensils className="w-8 h-8 text-orange-500" /> Tu Plan Nutricional</h2>
                                    <p className="text-slate-500 mt-2">Horarios y estructura de tus comidas diarias.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowNutritionForm(!showNutritionForm)} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all">{showNutritionForm ? 'Volver' : 'Evaluación'}</button>
                                    {client.nutrition.planUrl && (
                                        <a href={client.nutrition.planUrl} target="_blank" rel="noopener noreferrer" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-200">Ver Plan PDF</a>
                                    )}
                                </div>
                            </div>
                        </div>
                        {showNutritionForm ? (
                            <div className="p-8"><NutritionAssessmentForm clientId={client.id} onComplete={() => setShowNutritionForm(false)} /></div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                                    {[
                                        { label: 'Desayuno', time: client.nutrition.schedules?.breakfast },
                                        { label: 'Media Mañana', time: client.nutrition.schedules?.morningSnack },
                                        { label: 'Almuerzo', time: client.nutrition.schedules?.lunch },
                                        { label: 'Merienda', time: client.nutrition.schedules?.afternoonSnack },
                                        { label: 'Cena', time: client.nutrition.schedules?.dinner }
                                    ].map((meal, idx) => (
                                        <div key={idx} className="p-8 group hover:bg-orange-50/50 transition-colors">
                                            <span className="text-xs font-bold uppercase text-slate-400 group-hover:text-orange-400 transition-colors">{meal.label}</span>
                                            <p className="text-2xl font-bold text-slate-800 mt-2">{meal.time || '-'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'medical' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                            <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3 mb-8"><HeartPulse className="w-8 h-8 text-pink-500" /> Perfil de Salud</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="p-8 bg-pink-50 rounded-2xl border border-pink-100 text-center">
                                    <p className="text-pink-800 font-bold mb-2 uppercase text-xs">Diabetes</p>
                                    <p className="text-4xl font-bold text-pink-600">{client.medical.diabetesType === 'N/A' ? 'No' : client.medical.diabetesType}</p>
                                </div>
                                <div className="md:col-span-2 space-y-4">
                                    <div className="flex items-center justify-between p-4 border-b border-slate-100"><span className="text-slate-500">Usa Insulina</span><span className="font-bold text-slate-800">{client.medical.insulin || 'No'}</span></div>
                                    <div className="flex items-center justify-between p-4 border-b border-slate-100"><span className="text-slate-500">Patologías</span><span className="font-bold text-slate-800">{client.medical.pathologies || 'Ninguna'}</span></div>
                                </div>
                            </div>
                        </div>
                        {client.allow_endocrine_access && <div className="max-w-4xl mx-auto"><MedicalReviews client={client} /></div>}
                    </div>
                )}

                {activeTab === 'goals' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                            <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3 mb-6">
                                <Target className="w-8 h-8 text-indigo-500" /> Objetivos y Metas
                            </h2>
                            <p className="text-slate-500 mb-8 max-w-2xl">
                                Aquí encontrarás los objetivos establecidos junto a tu coach para mantener el foco en tu progreso.
                            </p>

                            <CoachGoalsManager clientId={client.id} isCoach={false} />
                        </div>

                        {/* Long Term Goals Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* 3 Meses */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 group transition-all duration-300 hover:shadow-md">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
                                        <Target className="w-3.5 h-3.5 text-emerald-500" /> 3 Meses
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {client.goals.goal_3_months_status && (
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${client.goals.goal_3_months_status === 'achieved' ? 'bg-green-100 text-green-700' :
                                                client.goals.goal_3_months_status === 'failed' ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                {client.goals.goal_3_months_status === 'achieved' ? 'Conseguido' : client.goals.goal_3_months_status === 'failed' ? 'No Conseguido' : 'Pendiente'}
                                            </span>
                                        )}
                                        {!isEditingGoal3 && (
                                            <button
                                                onClick={() => setIsEditingGoal3(true)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Target className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {isEditingGoal3 ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={tempGoal3}
                                            onChange={(e) => setTempGoal3(e.target.value)}
                                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none min-h-[80px]"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setIsEditingGoal3(false); setTempGoal3(localGoals?.goal_3_months || ''); }}
                                                className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 px-2 py-1"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={() => handleGoalSave('3m')}
                                                disabled={isSavingGoal3}
                                                className="bg-blue-600 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isSavingGoal3 ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-800 font-medium italic">"{localGoals?.goal_3_months || 'Sin definir'}"</p>
                                )}
                            </div>

                            {/* 6 Meses */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 group transition-all duration-300 hover:shadow-md">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
                                        <TrendingDown className="w-3.5 h-3.5 text-blue-500" /> 6 Meses
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {client.goals.goal_6_months_status && (
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${client.goals.goal_6_months_status === 'achieved' ? 'bg-green-100 text-green-700' :
                                                client.goals.goal_6_months_status === 'failed' ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                {client.goals.goal_6_months_status === 'achieved' ? 'Conseguido' : client.goals.goal_6_months_status === 'failed' ? 'No Conseguido' : 'Pendiente'}
                                            </span>
                                        )}
                                        {!isEditingGoal6 && (
                                            <button
                                                onClick={() => setIsEditingGoal6(true)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Target className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {isEditingGoal6 ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={tempGoal6}
                                            onChange={(e) => setTempGoal6(e.target.value)}
                                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none min-h-[80px]"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setIsEditingGoal6(false); setTempGoal6(localGoals?.goal_6_months || ''); }}
                                                className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 px-2 py-1"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={() => handleGoalSave('6m')}
                                                disabled={isSavingGoal6}
                                                className="bg-blue-600 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isSavingGoal6 ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-800 font-medium italic">"{localGoals?.goal_6_months || 'Sin definir'}"</p>
                                )}
                            </div>

                            {/* 1 Año */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 group transition-all duration-300 hover:shadow-md">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
                                        <Award className="w-3.5 h-3.5 text-purple-500" /> 1 Año
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {client.goals.goal_1_year_status && (
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${client.goals.goal_1_year_status === 'achieved' ? 'bg-green-100 text-green-700' :
                                                client.goals.goal_1_year_status === 'failed' ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                {client.goals.goal_1_year_status === 'achieved' ? 'Conseguido' : client.goals.goal_1_year_status === 'failed' ? 'No Conseguido' : 'Pendiente'}
                                            </span>
                                        )}
                                        {!isEditingGoal1y && (
                                            <button
                                                onClick={() => setIsEditingGoal1y(true)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Target className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {isEditingGoal1y ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={tempGoal1y}
                                            onChange={(e) => setTempGoal1y(e.target.value)}
                                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none min-h-[80px]"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setIsEditingGoal1y(false); setTempGoal1y(localGoals?.goal_1_year || ''); }}
                                                className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 px-2 py-1"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={() => handleGoalSave('1y')}
                                                disabled={isSavingGoal1y}
                                                className="bg-blue-600 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isSavingGoal1y ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-800 font-medium italic">"{localGoals?.goal_1_year || 'Sin definir'}"</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default ClientPortalView;
