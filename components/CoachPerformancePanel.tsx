/**
 * Panel de Rendimiento y Compensación de Coaches
 *
 * Vista para Admin/Head Coach: Tabla editable con todos los coaches
 * Vista para Coach: Panel de solo lectura con sus propios KPIs
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, TrendingDown, Award, Users, FileText,
    CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp,
    Edit3, Save, X, Clock, Star, Trophy, Target, Calendar,
    DollarSign, Zap, Shield, Info
} from 'lucide-react';
import { Client, User, UserRole, ClientStatus } from '../types';
import {
    COACH_TIERS,
    RENEWAL_BONUS_TIERS,
    SUCCESS_BONUS_TIERS,
    DOCUMENTATION_BONUS,
    getCurrentQuarter,
    calculateMonthlyMetrics,
    calculateQuarterMetrics,
    calculateRenewalBonus,
    calculateSuccessBonus,
    getKpiStatus,
    updateCoachTier,
    fetchTestimonials,
    isCoachMatch,
    fetchTierHistory,
    MonthlyMetrics,
    QuarterMetrics,
    CoachPerformanceData,
    TierChange
} from '../services/coachMetricsService';

interface CoachPerformancePanelProps {
    currentUser: User;
    clients: Client[];
    coaches: User[];
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

const KpiStatusBadge: React.FC<{ status: 'ok' | 'warning' | 'danger'; value: number; suffix?: string }> = ({ status, value, suffix = '%' }) => {
    const styles = {
        ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        danger: 'bg-rose-50 text-rose-700 border-rose-200'
    };

    const icons = {
        ok: <CheckCircle2 className="w-3.5 h-3.5" />,
        warning: <AlertTriangle className="w-3.5 h-3.5" />,
        danger: <XCircle className="w-3.5 h-3.5" />
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${styles[status]}`}>
            {icons[status]}
            {value}{suffix}
        </span>
    );
};

const TierBadge: React.FC<{ tier: 1 | 2 | 3; size?: 'sm' | 'md' | 'lg' }> = ({ tier, size = 'md' }) => {
    const styles = {
        1: 'bg-slate-100 text-slate-700 border-slate-200',
        2: 'bg-blue-100 text-blue-700 border-blue-200',
        3: 'bg-purple-100 text-purple-700 border-purple-200'
    };

    const names = {
        1: 'Operativo',
        2: 'Avanzado',
        3: 'Alto Impacto'
    };

    const prices = {
        1: '32.5€',
        2: '40€',
        3: '45€'
    };

    const sizeClasses = {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-3 py-1',
        lg: 'text-sm px-4 py-2'
    };

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-xl font-bold border ${styles[tier]} ${sizeClasses[size]}`}>
            <Star className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
            Nivel {tier} - {names[tier]} ({prices[tier]})
        </span>
    );
};

const BonusCard: React.FC<{
    title: string;
    value: number;
    rate: number;
    bonus: number;
    tiers: { min: number; max: number; amount: number }[];
    icon: React.ReactNode;
    color: string;
}> = ({ title, value, rate, bonus, tiers, icon, color }) => {
    const colorStyles: Record<string, string> = {
        emerald: 'from-emerald-500 to-emerald-600',
        blue: 'from-blue-500 to-blue-600',
        purple: 'from-purple-500 to-purple-600',
        amber: 'from-amber-500 to-amber-600'
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
            <div className={`bg-gradient-to-r ${colorStyles[color]} p-4 text-white`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {icon}
                        <span className="font-bold text-sm">{title}</span>
                    </div>
                    <span className="text-2xl font-black">{rate}%</span>
                </div>
            </div>
            <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-500">Valor actual</span>
                    <span className="font-bold text-slate-800">{value}</span>
                </div>
                <div className="space-y-1.5">
                    {tiers.map((t, idx) => (
                        <div
                            key={idx}
                            className={`flex items-center justify-between text-xs px-2 py-1 rounded ${rate >= t.min && rate <= t.max
                                ? 'bg-slate-800 text-white font-bold'
                                : 'text-slate-400'
                                }`}
                        >
                            <span>{t.min}-{t.max}%</span>
                            <span>{t.amount > 0 ? `+${t.amount}€` : '0€'}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">BONUS</span>
                    <span className={`text-lg font-black ${bonus > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        +{bonus}€
                    </span>
                </div>
            </div>
        </div>
    );
};

const MonthlyMetricsTable: React.FC<{ metrics: MonthlyMetrics[] }> = ({ metrics }) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left font-bold">Mes</th>
                        <th className="px-4 py-3 text-center font-bold">Clientes</th>
                        <th className="px-4 py-3 text-center font-bold">Renovaciones</th>
                        <th className="px-4 py-3 text-center font-bold">Testimonios</th>
                        <th className="px-4 py-3 text-center font-bold">Adherencia</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {metrics.map((m, idx) => {
                        const isFuture = m.year > currentYear || (m.year === currentYear && m.month > currentMonth);
                        return (
                            <tr key={idx} className={`transition-colors ${isFuture ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50'}`}>
                                <td className="px-4 py-3 font-bold text-slate-800">{m.label}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-bold text-xs">
                                        {isFuture ? '-' : m.activeClients}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={`font-bold ${!isFuture && m.renewals.target > 0 && m.renewals.rate >= 50 ? 'text-emerald-600' : isFuture ? 'text-slate-400' : 'text-rose-600'}`}>
                                            {isFuture || m.renewals.target === 0 ? '-' : `${m.renewals.rate}%`}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {isFuture ? '-/-' : `${m.renewals.completed}/${m.renewals.target}`}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={`font-bold ${isFuture ? 'text-slate-400' : 'text-blue-600'}`}>
                                            {isFuture ? '-' : m.testimonials.total}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {isFuture ? '-' : `Únicos: ${m.testimonials.uniqueClients}`}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`font-bold ${!isFuture && m.adherence.rate >= 80 ? 'text-emerald-600' : isFuture ? 'text-slate-400' : 'text-amber-600'}`}>
                                        {isFuture ? '-' : (m.activeClients > 0 ? `${m.adherence.rate}%` : '-')}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// ============================================================
// COMPONENTE PRINCIPAL - VISTA COACH (Solo lectura)
// ============================================================

const CoachOwnPerformance: React.FC<{
    coach: User;
    clients: Client[];
    testimonials: any[];
    allCoachesTestimonials: Map<string, number>;
}> = ({ coach, clients, testimonials, allCoachesTestimonials }) => {
    const tier = coach.tier || 1;
    const tierInfo = COACH_TIERS[tier];
    const quarterInfo = getCurrentQuarter();

    // Calcular métricas
    const monthlyMetrics: MonthlyMetrics[] = [];
    // Usar meses del cuatrimestre actual (Forward looking)
    for (let m = quarterInfo.endMonth; m >= quarterInfo.startMonth; m--) {
        monthlyMetrics.push(
            calculateMonthlyMetrics(coach.id, coach.name, clients, testimonials, m, quarterInfo.year)
        );
    }


    const quarterMetrics = calculateQuarterMetrics(
        coach.id,
        coach.name,
        clients,
        testimonials,
        allCoachesTestimonials,
        quarterInfo
    );

    const coachClients = clients.filter(c =>
        isCoachMatch(coach.id, coach.name, c.coach_id) ||
        isCoachMatch(coach.id, coach.name, c.property_coach)
    );
    const activeClients = coachClients.filter(
        c => c.status === ClientStatus.ACTIVE
    ).length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-blue-500 font-bold text-[10px] uppercase tracking-[3px] mb-2">
                        <Target className="w-4 h-4" />
                        MI RENDIMIENTO
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        {quarterMetrics.quarter}
                    </h1>
                    <p className="text-slate-500 mt-2">Tu evolución y bonus estimados del cuatrimestre actual.</p>
                </div>
                <TierBadge tier={tier as 1 | 2 | 3} size="lg" />
            </div>

            {/* Resumen rápido */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Users className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Clientes</span>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{activeClients}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-500 mb-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Renovaciones</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-600">{quarterMetrics.totals.renewalRate}%</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 text-blue-500 mb-2">
                        <Award className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Éxitos</span>
                    </div>
                    <p className="text-3xl font-black text-blue-600">{quarterMetrics.totals.documentationCount}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 text-purple-500 mb-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Bonus Est.</span>
                    </div>
                    <p className="text-3xl font-black text-purple-600">+{quarterMetrics.bonus.total}€</p>
                </div>
            </div>

            {/* Cards de Bonus */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <BonusCard
                    title="Renovaciones"
                    value={quarterMetrics.months.reduce((s, m) => s + m.renewals.completed, 0)}
                    rate={quarterMetrics.totals.renewalRate}
                    bonus={quarterMetrics.bonus.renewals}
                    tiers={RENEWAL_BONUS_TIERS}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="emerald"
                />
                <BonusCard
                    title="Casos de Éxito"
                    value={quarterMetrics.totals.documentationCount}
                    rate={quarterMetrics.totals.successRate}
                    bonus={quarterMetrics.bonus.success}
                    tiers={SUCCESS_BONUS_TIERS}
                    icon={<Award className="w-5 h-5" />}
                    color="blue"
                />
                <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
                    <div className={`bg-gradient-to-r ${quarterMetrics.bonus.isDocumentationLeader ? 'from-amber-500 to-amber-600' : 'from-slate-400 to-slate-500'} p-4 text-white`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5" />
                                <span className="font-bold text-sm">Documentación</span>
                            </div>
                            <span className="text-2xl font-black">{quarterMetrics.totals.documentationCount}</span>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="text-center py-4">
                            {quarterMetrics.bonus.isDocumentationLeader ? (
                                <div className="space-y-2">
                                    <Trophy className="w-12 h-12 mx-auto text-amber-500" />
                                    <p className="font-black text-amber-600">ERES EL LÍDER</p>
                                    <p className="text-xs text-slate-500">Tienes el bonus de +200€</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-slate-500 text-sm">Mínimo requerido: {DOCUMENTATION_BONUS.minPieces} piezas</p>
                                    <p className="text-xs text-slate-400">Solo el coach con más documentación lo cobra</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">BONUS</span>
                            <span className={`text-lg font-black ${quarterMetrics.bonus.documentation > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                +{quarterMetrics.bonus.documentation}€
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Requisitos de tu nivel */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    Requisitos para mantener tu nivel ({tierInfo.name})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                        <KpiStatusBadge
                            status={getKpiStatus(quarterMetrics.totals.renewalRate, tierInfo.kpiRequirements.renewalRate)}
                            value={quarterMetrics.totals.renewalRate}
                        />
                        <span className="text-sm text-slate-600">
                            Renovaciones ≥{tierInfo.kpiRequirements.renewalRate}%
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <KpiStatusBadge
                            status={getKpiStatus(quarterMetrics.totals.successRate, tierInfo.kpiRequirements.successRate)}
                            value={quarterMetrics.totals.successRate}
                        />
                        <span className="text-sm text-slate-600">
                            Éxitos ≥{tierInfo.kpiRequirements.successRate}%
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <KpiStatusBadge
                            status={getKpiStatus(quarterMetrics.totals.adherenceRate, tierInfo.kpiRequirements.adherence)}
                            value={quarterMetrics.totals.adherenceRate}
                        />
                        <span className="text-sm text-slate-600">
                            Adherencia ≥{tierInfo.kpiRequirements.adherence}%
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <KpiStatusBadge
                            status={getKpiStatus(coach.task_compliance_rate || 0, tierInfo.kpiRequirements.taskCompliance)}
                            value={coach.task_compliance_rate || 0}
                        />
                        <span className="text-sm text-slate-600">
                            Tareas ≥{tierInfo.kpiRequirements.taskCompliance}%
                        </span>
                    </div>
                    {tierInfo.kpiRequirements.minNps && (
                        <div className="flex items-center gap-3">
                            <KpiStatusBadge
                                status={(coach.internal_nps || 0) >= tierInfo.kpiRequirements.minNps ? 'ok' : 'danger'}
                                value={coach.internal_nps || 0}
                                suffix=""
                            />
                            <span className="text-sm text-slate-600">
                                NPS ≥{tierInfo.kpiRequirements.minNps}
                            </span>
                        </div>
                    )}
                </div>
                <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Más de 3 meses sin cumplir KPIs puede conllevar revisión del nivel.
                </p>
            </div>

            {/* Tabla mensual */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        Detalle Mensual
                    </h3>
                </div>
                <MonthlyMetricsTable metrics={monthlyMetrics} />
            </div>

            {/* Total Bonus */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 rounded-3xl text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">
                            Bonus Total Estimado - {quarterMetrics.quarter}
                        </p>
                        <div className="flex items-baseline gap-3">
                            <span className="text-5xl font-black">+{quarterMetrics.bonus.total}€</span>
                            <span className="text-slate-400 text-sm">
                                (se paga en el mes 4 del cuatrimestre)
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 text-right">
                        <div className="text-sm">
                            <span className="text-slate-400">Renovaciones:</span>{' '}
                            <span className="font-bold">+{quarterMetrics.bonus.renewals}€</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-slate-400">Éxitos:</span>{' '}
                            <span className="font-bold">+{quarterMetrics.bonus.success}€</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-slate-400">Documentación:</span>{' '}
                            <span className="font-bold">+{quarterMetrics.bonus.documentation}€</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// COMPONENTE PRINCIPAL - VISTA ADMIN (Editable)
// ============================================================

interface CoachRowData {
    coach: User;
    activeClients: number;
    quarterMetrics: QuarterMetrics;
    monthlyMetrics: MonthlyMetrics[];
}

const AdminPerformancePanel: React.FC<{
    coaches: User[];
    clients: Client[];
    testimonials: any[];
    onRefresh: () => void;
}> = ({ coaches, clients, testimonials, onRefresh }) => {
    const [expandedCoach, setExpandedCoach] = useState<string | null>(null);
    const [editingCoach, setEditingCoach] = useState<string | null>(null);
    const [editTier, setEditTier] = useState<number>(1);
    const [editExclusive, setEditExclusive] = useState(false);
    const [editNotes, setEditNotes] = useState('');
    const [editNps, setEditNps] = useState<number>(10);
    const [editTaskCompliance, setEditTaskCompliance] = useState<number>(100);
    const [saving, setSaving] = useState(false);

    const quarterInfo = getCurrentQuarter();

    // Calcular testimonios de todos los coaches usando matching flexible
    const allCoachesTestimonials = useMemo(() => {
        const map = new Map<string, number>();
        coaches.forEach(c => {
            const count = testimonials.filter(t => {
                if (!isCoachMatch(c.id, c.name, t.coach_id) && !isCoachMatch(c.id, c.name, t.coach_name)) return false;
                const d = new Date(t.created_at);
                return d.getMonth() >= quarterInfo.startMonth &&
                    d.getMonth() <= quarterInfo.endMonth &&
                    d.getFullYear() === quarterInfo.year;
            }).length;
            map.set(c.id, count);
        });
        return map;
    }, [coaches, testimonials, quarterInfo]);

    // Preparar datos de cada coach
    const coachData: CoachRowData[] = useMemo(() => {
        return coaches
            .filter(c => c.role === UserRole.COACH)
            .map(coach => {
                const coachClients = clients.filter(c =>
                    isCoachMatch(coach.id, coach.name, c.coach_id) ||
                    isCoachMatch(coach.id, coach.name, c.property_coach)
                );

                const activeClients = coachClients.filter(
                    c => c.status === ClientStatus.ACTIVE
                ).length;

                const monthlyMetrics: MonthlyMetrics[] = [];
                // Usar meses del cuatrimestre actual (Forward looking)
                for (let m = quarterInfo.endMonth; m >= quarterInfo.startMonth; m--) {
                    monthlyMetrics.push(
                        calculateMonthlyMetrics(coach.id, coach.name, clients, testimonials, m, quarterInfo.year)
                    );
                }

                const quarterMetrics = calculateQuarterMetrics(
                    coach.id,
                    coach.name,
                    clients,
                    testimonials,
                    allCoachesTestimonials,
                    quarterInfo
                );

                return { coach, activeClients, quarterMetrics, monthlyMetrics };
            })
            .sort((a, b) => b.activeClients - a.activeClients);
    }, [coaches, clients, testimonials, allCoachesTestimonials, quarterInfo]);

    const handleStartEdit = (coach: User) => {
        console.log('Iniciando edición para coach:', coach.name, coach.id);
        setEditingCoach(coach.id);
        setEditTier(coach.tier || 1);
        setEditExclusive(coach.is_exclusive || false);
        setEditNotes(coach.performance_notes || '');
        setEditNps(coach.internal_nps || 10);
        setEditTaskCompliance(coach.task_compliance_rate || 100);
    };

    const handleSave = async (coachId: string) => {
        console.log('Guardar pulsado: handleSave iniciado para coachId:', coachId, { editTier, editExclusive });
        setSaving(true);
        try {
            const result = await updateCoachTier(coachId, editTier, editExclusive, editNotes, editNps, editTaskCompliance);
            console.log('Resultado de updateCoachTier:', result);
            setSaving(false);

            if (result.success) {
                console.log('¡Éxito! Cerrando edición.');
                setEditingCoach(null);
                onRefresh();
            } else {
                console.error('Error reportado por el servicio:', result.error);
                alert('Error al guardar: ' + result.error);
            }
        } catch (err) {
            console.error('Error crítico en handleSave:', err);
            setSaving(false);
            alert('Error crítico al intentar guardar.');
        }
    };

    const handleCancel = () => {
        setEditingCoach(null);
    };

    // Totales
    const totals = useMemo(() => {
        const totalClients = coachData.reduce((s, d) => s + d.activeClients, 0);
        const totalBonus = coachData.reduce((s, d) => s + d.quarterMetrics.bonus.total, 0);
        const avgRenewal = coachData.length > 0
            ? Math.round(coachData.reduce((s, d) => s + d.quarterMetrics.totals.renewalRate, 0) / coachData.length)
            : 0;

        return { totalClients, totalBonus, avgRenewal };
    }, [coachData]);

    const quarterNames = ['Ene-Abr', 'May-Ago', 'Sep-Dic'];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-purple-500 font-bold text-[10px] uppercase tracking-[3px] mb-2">
                        <Award className="w-4 h-4" />
                        RENDIMIENTO Y COMPENSACIÓN
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        Panel de Coaches
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Cuatrimestre actual: <span className="font-bold">{quarterNames[quarterInfo.quarter - 1]} {quarterInfo.year}</span>
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-100 px-4 py-2 rounded-xl text-sm">
                        <span className="text-slate-500">Total Clientes:</span>{' '}
                        <span className="font-black text-slate-800">{totals.totalClients}</span>
                    </div>
                    <div className="bg-emerald-50 px-4 py-2 rounded-xl text-sm">
                        <span className="text-emerald-600">Bonus Total:</span>{' '}
                        <span className="font-black text-emerald-700">+{totals.totalBonus}€</span>
                    </div>
                </div>
            </div>

            {/* Tabla principal */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                            <th className="px-6 py-4 text-left font-bold">Coach</th>
                            <th className="px-4 py-4 text-center font-bold">Tier</th>
                            <th className="px-4 py-4 text-center font-bold">Excl.</th>
                            <th className="px-4 py-4 text-center font-bold">Clientes</th>
                            <th className="px-4 py-4 text-center font-bold">Renov. %</th>
                            <th className="px-4 py-4 text-center font-bold">Éxitos</th>
                            <th className="px-4 py-4 text-center font-bold">Tareas</th>
                            <th className="px-4 py-4 text-center font-bold">Docs</th>
                            <th className="px-4 py-4 text-center font-bold">Bonus Est.</th>
                            <th className="px-4 py-4 text-center font-bold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {coachData.map(({ coach, activeClients, quarterMetrics, monthlyMetrics }) => {
                            const isEditing = editingCoach === coach.id;
                            const isExpanded = expandedCoach === coach.id;
                            const tier = coach.tier || 1;
                            const tierInfo = COACH_TIERS[tier];

                            return (
                                <React.Fragment key={coach.id}>
                                    <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-blue-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                                                    {coach.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{coach.name}</p>
                                                    <p className="text-xs text-slate-400">{coach.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {isEditing ? (
                                                <select
                                                    value={editTier}
                                                    onChange={(e) => setEditTier(Number(e.target.value))}
                                                    className="border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold"
                                                >
                                                    <option value={1}>1 - 32.5€</option>
                                                    <option value={2}>2 - 40€</option>
                                                    <option value={3}>3 - 45€</option>
                                                </select>
                                            ) : (
                                                <TierBadge tier={tier as 1 | 2 | 3} size="sm" />
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {isEditing ? (
                                                <input
                                                    type="checkbox"
                                                    checked={editExclusive}
                                                    onChange={(e) => setEditExclusive(e.target.checked)}
                                                    className="w-5 h-5 rounded border-slate-300"
                                                />
                                            ) : (
                                                coach.is_exclusive ? (
                                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">SÍ</span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="font-black text-slate-800 text-lg">{activeClients}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <KpiStatusBadge
                                                status={getKpiStatus(quarterMetrics.totals.renewalRate, tierInfo.kpiRequirements.renewalRate)}
                                                value={quarterMetrics.totals.renewalRate}
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <KpiStatusBadge
                                                status={getKpiStatus(quarterMetrics.totals.successRate, tierInfo.kpiRequirements.successRate)}
                                                value={quarterMetrics.totals.successRate}
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <KpiStatusBadge
                                                status={getKpiStatus(coach.task_compliance_rate || 0, tierInfo.kpiRequirements.taskCompliance)}
                                                value={coach.task_compliance_rate || 0}
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="font-bold text-slate-700">{quarterMetrics.totals.documentationCount}</span>
                                                {quarterMetrics.bonus.isDocumentationLeader && (
                                                    <Trophy className="w-4 h-4 text-amber-500" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`font-black text-lg ${quarterMetrics.bonus.total > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                +{quarterMetrics.bonus.total}€
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleSave(coach.id)}
                                                            disabled={saving}
                                                            className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                                        >
                                                            <Save className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={handleCancel}
                                                            className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleStartEdit(coach)}
                                                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setExpandedCoach(isExpanded ? null : coach.id)}
                                                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                                        >
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Fila expandida con detalle */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={10} className="bg-slate-50 p-6">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    {/* Detalle mensual */}
                                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                                                            <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                                                <Calendar className="w-4 h-4" />
                                                                Detalle Mensual
                                                            </h4>
                                                        </div>
                                                        <MonthlyMetricsTable metrics={monthlyMetrics} />
                                                    </div>

                                                    {/* Desglose bonus */}
                                                    <div className="space-y-4">
                                                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                                                            <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                                                <DollarSign className="w-4 h-4" />
                                                                Desglose Bonus
                                                            </h4>
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-sm text-slate-600">Renovaciones ({quarterMetrics.totals.renewalRate}%)</span>
                                                                    <span className="font-bold text-emerald-600">+{quarterMetrics.bonus.renewals}€</span>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-sm text-slate-600">Casos de éxito ({quarterMetrics.totals.successRate}%)</span>
                                                                    <span className="font-bold text-blue-600">+{quarterMetrics.bonus.success}€</span>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-sm text-slate-600">
                                                                        Documentación ({quarterMetrics.totals.documentationCount} piezas)
                                                                        {quarterMetrics.bonus.isDocumentationLeader && ' 🏆'}
                                                                    </span>
                                                                    <span className="font-bold text-amber-600">+{quarterMetrics.bonus.documentation}€</span>
                                                                </div>
                                                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                                                                    <span className="font-bold text-slate-800">TOTAL</span>
                                                                    <span className="text-xl font-black text-purple-600">+{quarterMetrics.bonus.total}€</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Notas */}
                                                        {isEditing ? (
                                                            <div className="bg-white rounded-xl border border-slate-200 p-4">
                                                                <h4 className="font-bold text-slate-700 mb-2">Notas y KPIs manuales</h4>
                                                                <textarea
                                                                    value={editNotes}
                                                                    onChange={(e) => setEditNotes(e.target.value)}
                                                                    placeholder="Añade notas sobre el rendimiento, bonus, acuerdos..."
                                                                    className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-24"
                                                                />
                                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NPS Interno (0-10)</label>
                                                                        <input
                                                                            type="number"
                                                                            min="0" max="10" step="0.5"
                                                                            value={editNps}
                                                                            onChange={(e) => setEditNps(Number(e.target.value))}
                                                                            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">% Cumplimiento Tareas</label>
                                                                        <input
                                                                            type="number"
                                                                            min="0" max="100"
                                                                            value={editTaskCompliance}
                                                                            onChange={(e) => setEditTaskCompliance(Number(e.target.value))}
                                                                            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            coach.performance_notes && (
                                                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                                                    <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Notas del administrador</h4>
                                                                    <p className="text-sm text-blue-800 italic leading-relaxed">
                                                                        "{coach.performance_notes}"
                                                                    </p>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {coachData.length === 0 && (
                            <tr>
                                <td colSpan={10} className="px-6 py-20 text-center text-slate-400 italic">
                                    No hay coaches registrados para mostrar resultados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Referencia de niveles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80 border-t border-slate-100 pt-8">
                {[1, 2, 3].map(level => {
                    const t = COACH_TIERS[level];
                    return (
                        <div key={level} className="bg-white p-6 rounded-2xl border border-slate-100">
                            <TierBadge tier={level as 1 | 2 | 3} size="md" />
                            <ul className="mt-4 space-y-2">
                                {t.requirements.map((req, i) => (
                                    <li key={i} className="text-xs text-slate-500 flex items-start gap-2">
                                        <div className="w-1 h-1 bg-slate-300 rounded-full mt-1.5 shrink-0" />
                                        {req}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-6 pt-4 border-t border-slate-50">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">KPIs mínimos</p>
                                <div className="flex flex-wrap gap-2 text-[10px] font-black text-slate-600">
                                    <span>Renov. ≥{t.kpiRequirements.renewalRate}%</span>
                                    <span>|</span>
                                    <span>Éxito ≥{t.kpiRequirements.successRate}%</span>
                                    <span>|</span>
                                    <span>Adher. ≥{t.kpiRequirements.adherence}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================================
// COMPONENTE EXPORTADO
// ============================================================

export const CoachPerformancePanel: React.FC<CoachPerformancePanelProps> = ({ currentUser, clients, coaches }) => {
    const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HEAD_COACH || (currentUser.role || '').toLowerCase() === 'direccion';
    const [testimonials, setTestimonials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const data = await fetchTestimonials();
        setTestimonials(data);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-slate-400 font-bold animate-pulse">Sincronizando rendimiento...</p>
            </div>
        );
    }

    if (isAdmin) {
        return (
            <AdminPerformancePanel
                coaches={coaches}
                clients={clients}
                testimonials={testimonials}
                onRefresh={loadData}
            />
        );
    }

    // Calcular allCoachesTestimonials de forma simple para la vista de coach
    const coachesTestimonials = new Map<string, number>();
    coaches.forEach(c => {
        const quarterInfo = getCurrentQuarter();
        const count = testimonials.filter(t => {
            if (!isCoachMatch(c.id, c.name, t.coach_id) && !isCoachMatch(c.id, c.name, t.coach_name)) return false;
            const d = new Date(t.created_at);
            return d.getMonth() >= quarterInfo.startMonth &&
                d.getMonth() <= quarterInfo.endMonth &&
                d.getFullYear() === quarterInfo.year;
        }).length;
        coachesTestimonials.set(c.id, count);
    });

    return (
        <CoachOwnPerformance
            coach={currentUser}
            clients={clients}
            testimonials={testimonials}
            allCoachesTestimonials={coachesTestimonials}
        />
    );
};

export default CoachPerformancePanel;