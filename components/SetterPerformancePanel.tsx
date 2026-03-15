/**
 * Panel de Rendimiento y Compensación de Setters
 *
 * Vista para Admin/Head Coach: Tabla editable con todos los setters
 * Vista para Setter: Panel de solo lectura con sus propios KPIs
 */

import React, { useState, useEffect } from 'react';
import {
    TrendingUp, Award, Users, Star, Phone, Calendar,
    Edit3, Save, X, ChevronDown, ChevronUp, Clock,
    Target, DollarSign, Trophy, Percent, CheckCircle2,
    ArrowUpRight, Zap, PhoneCall, CalendarCheck
} from 'lucide-react';
import { User, UserRole } from '../types';
import {
    SETTER_TIERS,
    SETTER_FIXED_SALARY,
    SETTER_COMMISSION_RATE,
    getSetterPerformanceData,
    fetchSetterLeads,
    fetchSetters,
    updateSetterTier,
    SetterMonthlyMetrics,
    SetterPerformanceData,
    SetterLead
} from '../services/setterMetricsService';
import { fetchSales, getTeamPerformanceMetrics, TeamPerformanceMetrics } from '../services/closerMetricsService';

interface SetterPerformancePanelProps {
    currentUser: User;
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

const TierBadge: React.FC<{ tier: 1 | 2 | 3; size?: 'sm' | 'md' | 'lg' }> = ({ tier, size = 'md' }) => {
    const styles = {
        1: 'bg-slate-100 text-slate-700 border-slate-200',
        2: 'bg-blue-100 text-blue-700 border-blue-200',
        3: 'bg-purple-100 text-purple-700 border-purple-200'
    };

    const names = {
        1: 'Trainee',
        2: 'Standard',
        3: 'Pro'
    };

    const rates = {
        1: '8€/h',
        2: '10€/h',
        3: '12€/h'
    };

    const sizeClasses = {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-3 py-1',
        lg: 'text-sm px-4 py-2'
    };

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-xl font-bold border ${styles[tier]} ${sizeClasses[size]}`}>
            <Star className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
            Nivel {tier} - {names[tier]}
        </span>
    );
};

const RateBadge: React.FC<{ rate: number; threshold: number; label: string }> = ({ rate, threshold, label }) => {
    const isGood = rate >= threshold;
    return (
        <div className={`flex flex-col items-center p-3 rounded-xl ${isGood ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
            <span className={`text-2xl font-black ${isGood ? 'text-emerald-600' : 'text-amber-600'}`}>{rate}%</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase">{label}</span>
        </div>
    );
};

const MonthlyMetricsTable: React.FC<{ metrics: SetterMonthlyMetrics[] }> = ({ metrics }) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left font-bold">Mes</th>
                        <th className="px-4 py-3 text-center font-bold">Leads</th>
                        <th className="px-4 py-3 text-center font-bold">Contactados</th>
                        <th className="px-4 py-3 text-center font-bold">Agendados</th>
                        <th className="px-4 py-3 text-center font-bold">Ventas Realizadas</th>
                        <th className="px-4 py-3 text-center font-bold">Tasa Contacto</th>
                        <th className="px-4 py-3 text-center font-bold">Ganancias</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {metrics.map((m, idx) => {
                        const isFuture = m.year > currentYear || (m.year === currentYear && m.month > currentMonth);
                        return (
                            <tr key={idx} className={`transition-colors ${isFuture ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50'}`}>
                                <td className="px-4 py-3 font-bold text-slate-800">{m.label}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className="font-bold text-slate-800">
                                        {isFuture ? '-' : m.leads.assigned}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="font-bold text-blue-600">
                                        {isFuture ? '-' : m.leads.contacted}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="font-bold text-purple-600">
                                        {isFuture ? '-' : m.leads.scheduled}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="font-bold text-emerald-600">
                                        {isFuture ? '-' : m.leads.converted}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`font-bold ${!isFuture && m.rates.contactRate >= 90 ? 'text-emerald-600' : isFuture ? 'text-slate-400' : m.rates.contactRate >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {isFuture ? '-' : `${m.rates.contactRate}%`}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="font-bold text-slate-800">
                                            {isFuture ? '-' : `${m.compensation.totalEarnings.toLocaleString()}€`}
                                        </span>
                                        {!isFuture && m.compensation.monthlyBonus > 0 && (
                                            <span className="text-[10px] text-emerald-500">
                                                +{m.compensation.monthlyBonus}€ bonus
                                            </span>
                                        )}
                                    </div>
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
// COMPONENTE PRINCIPAL
// ============================================================

export default function SetterPerformancePanel({ currentUser }: SetterPerformancePanelProps) {
    const [loading, setLoading] = useState(true);
    const [setters, setSetters] = useState<User[]>([]);
    const [leads, setLeads] = useState<SetterLead[]>([]);
    const [performanceData, setPerformanceData] = useState<Map<string, SetterPerformanceData>>(new Map());
    const [expandedSetter, setExpandedSetter] = useState<string | null>(null);
    const [editingSetter, setEditingSetter] = useState<string | null>(null);
    const [editTier, setEditTier] = useState<number>(1);
    const [projectFilter, setProjectFilter] = useState<'all' | 'PT' | 'ME'>('all');

    const [teamMetrics, setTeamMetrics] = useState<TeamPerformanceMetrics | null>(null);

    const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HEAD_COACH || (currentUser.role || '').toLowerCase() === 'direccion';
    const isSetter = currentUser.role === UserRole.SETTER;

    useEffect(() => {
        loadData();
    }, [projectFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [leadsData, settersData, salesData] = await Promise.all([
                fetchSetterLeads(),
                isAdmin ? fetchSetters() : Promise.resolve([currentUser]),
                fetchSales()
            ]);

            setLeads(leadsData);
            setSetters(settersData);

            // Fetch team metrics
            const tMetrics = await getTeamPerformanceMetrics(salesData);
            setTeamMetrics(tMetrics);

            // Filter by project
            const filteredLeads = projectFilter === 'all' ? leadsData : leadsData.filter(l => (l as any).project === projectFilter);

            // Calculate performance for each setter
            const perfMap = new Map<string, SetterPerformanceData>();
            for (const setter of settersData) {
                const data = await getSetterPerformanceData(setter, filteredLeads, 4);
                perfMap.set(setter.id, data);
            }
            setPerformanceData(perfMap);
        } catch (err) {
            console.error('Error loading setter performance data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTier = async (setterId: string) => {
        const result = await updateSetterTier(setterId, editTier);
        if (result.success) {
            setSetters(prev => prev.map(s =>
                s.id === setterId ? { ...s, tier: editTier as 1 | 2 | 3 } : s
            ));
            setEditingSetter(null);
            loadData();
        } else {
            alert('Error al actualizar el tier: ' + result.error);
        }
    };

    // Single Setter View
    const SingleSetterView: React.FC<{ data: SetterPerformanceData }> = ({ data }) => {
        const currentMonth = data.monthlyMetrics[0];
        const tier = SETTER_TIERS[data.setter.tier || 1];

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight">Mi Rendimiento</h2>
                                <p className="text-slate-400 mt-1">
                                    {data.setter.name} • <TierBadge tier={(data.setter.tier || 1) as 1 | 2 | 3} size="sm" />
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <select
                                    value={projectFilter}
                                    onChange={(e) => setProjectFilter(e.target.value as any)}
                                    className="bg-white/10 border border-white/20 text-white text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer backdrop-blur-sm"
                                >
                                    <option value="all" className="text-slate-900">Todos los Proyectos</option>
                                    <option value="PT" className="text-slate-900">Padron Trainer</option>
                                    <option value="ME" className="text-slate-900">Médico Emprendedor</option>
                                </select>
                                <div className="text-right border-l border-white/20 pl-4">
                                    <p className="text-slate-400 text-sm">Fijo Mensual</p>
                                    <p className="text-4xl font-black text-emerald-400">{SETTER_FIXED_SALARY}€</p>
                                </div>
                            </div>
                        </div>

                        {/* KPI Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Phone className="w-5 h-5 text-blue-400" />
                                    <span className="text-slate-400 text-xs font-bold uppercase">Leads Mes</span>
                                </div>
                                <p className="text-3xl font-black">{currentMonth?.leads.assigned || 0}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <PhoneCall className="w-5 h-5 text-emerald-400" />
                                    <span className="text-slate-400 text-xs font-bold uppercase">Contactados</span>
                                </div>
                                <p className="text-3xl font-black">{currentMonth?.leads.contacted || 0}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <CalendarCheck className="w-5 h-5 text-purple-400" />
                                    <span className="text-slate-400 text-xs font-bold uppercase">Agendados</span>
                                </div>
                                <p className="text-3xl font-black">{currentMonth?.leads.scheduled || 0}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Trophy className="w-5 h-5 text-amber-400" />
                                    <span className="text-slate-400 text-xs font-bold uppercase">Ventas Realizadas</span>
                                </div>
                                <p className="text-3xl font-black">{currentMonth?.leads.converted || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rates Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <RateBadge rate={currentMonth?.rates.contactRate || 0} threshold={90} label="Tasa Contacto" />
                    <RateBadge rate={currentMonth?.rates.scheduleRate || 0} threshold={30} label="Tasa Agenda" />
                    <RateBadge rate={100 - (currentMonth?.rates.noShowRate || 0)} threshold={70} label="Asistencia" />
                    <RateBadge rate={currentMonth?.rates.qualityRate || 0} threshold={60} label="Calidad" />
                </div>

                {/* Compensation Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Team Quarterly Card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 rounded-xl">
                                    <Target className="w-6 h-6 text-blue-600" />
                                </div>
                                <p className="font-bold text-slate-800">Meta Trimestral</p>
                            </div>
                            <span className="text-xs font-bold text-slate-400">{teamMetrics?.currentQuarter.label}</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Recaudado (Equipo): <span className="font-bold text-slate-800">{teamMetrics?.currentQuarter.totalCashCollected.toLocaleString()}€</span></span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (teamMetrics?.currentQuarter.totalCashCollected || 0) / (teamMetrics?.currentQuarter.goal || 1) * 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <span className="text-xs font-bold text-slate-400 uppercase">Multiplicador</span>
                                <span className="text-lg font-black text-blue-600">x{teamMetrics?.currentQuarter.multiplier || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Team Annual Card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-100 rounded-xl">
                                    <Trophy className="w-6 h-6 text-purple-600" />
                                </div>
                                <p className="font-bold text-slate-800">Meta Anual</p>
                            </div>
                            <span className="text-xs font-bold text-slate-400">{teamMetrics?.currentYear.label}</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Recaudado (Equipo): <span className="font-bold text-slate-800">{teamMetrics?.currentYear.totalCashCollected.toLocaleString()}€</span></span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div
                                    className="bg-purple-500 h-2 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (teamMetrics?.currentYear.totalCashCollected || 0) / (teamMetrics?.currentYear.goal || 1) * 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <span className="text-xs font-bold text-slate-400 uppercase">Pool Actual</span>
                                <span className="text-lg font-black text-purple-600 text-right">{teamMetrics?.currentYear.poolAmount.toLocaleString() || 0}€</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="w-6 h-6" />
                            <span className="font-bold">Total Mes</span>
                        </div>
                        <p className="text-5xl font-black">{currentMonth?.compensation.totalEarnings || 0}€</p>
                        <div className="mt-4 pt-4 border-t border-white/20 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="opacity-80">Fijo Mensual:</span>
                                <span className="font-bold">{currentMonth?.compensation.baseEarnings || 400}€</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="opacity-80">Comisiones (5%):</span>
                                <span className="font-bold">{currentMonth?.compensation.commissionEarnings || 0}€</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="opacity-80">Bonus Mes:</span>
                                <span className="font-bold">+{currentMonth?.compensation.monthlyBonus || 0}€</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Monthly Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            Histórico Mensual
                        </h3>
                    </div>
                    <MonthlyMetricsTable metrics={data.monthlyMetrics} />
                </div>

                {/* Tier Suggestion */}
                {data.tierSuggestion && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-amber-100 rounded-xl">
                                <ArrowUpRight className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-amber-800 mb-1">Posible Ascenso de Tier</h4>
                                <p className="text-sm text-amber-700">
                                    Basado en tu rendimiento, cumples los requisitos para el
                                    <span className="font-bold"> Nivel {data.tierSuggestion} ({SETTER_TIERS[data.tierSuggestion].name})</span>.
                                    Contacta con administración para solicitar la revisión.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Admin Table View
    const AdminTableView: React.FC = () => {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Users className="w-6 h-6 text-purple-600" />
                            Rendimiento de Setters
                        </h2>
                        <p className="text-sm text-slate-500">Gestión de tiers, tarifas y bonus</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value as any)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                        >
                            <option value="all">Todos los Proyectos</option>
                            <option value="PT">Padron Trainer</option>
                            <option value="ME">Médico Emprendedor</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left font-bold">Setter</th>
                                <th className="px-6 py-4 text-center font-bold">Fijo</th>
                                <th className="px-6 py-4 text-center font-bold">Leads</th>
                                <th className="px-6 py-4 text-center font-bold">Agendados</th>
                                <th className="px-6 py-4 text-center font-bold">Ventas Realizadas (5%)</th>
                                <th className="px-6 py-4 text-center font-bold">Bonus Mes</th>
                                <th className="px-6 py-4 text-center font-bold">Total</th>
                                <th className="px-6 py-4 text-center font-bold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {setters.map(setter => {
                                const data = performanceData.get(setter.id);
                                const isExpanded = expandedSetter === setter.id;
                                const isEditing = editingSetter === setter.id;

                                return (
                                    <React.Fragment key={setter.id}>
                                        <tr className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={setter.avatarUrl || setter.avatar_url || `https://ui-avatars.com/api/?name=${setter.name}`}
                                                        alt={setter.name}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                    <div>
                                                        <p className="font-bold text-slate-800">{setter.name}</p>
                                                        <p className="text-xs text-slate-400">{setter.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-slate-800">{data?.monthlyMetrics[0]?.compensation.baseEarnings || 400}€</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-slate-800">{data?.monthlyMetrics[0]?.leads.assigned || 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-purple-600">{data?.monthlyMetrics[0]?.leads.scheduled || 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-emerald-600">+{data?.monthlyMetrics[0]?.compensation.commissionEarnings || 0}€</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-purple-600">+{data?.monthlyMetrics[0]?.compensation.monthlyBonus || 0}€</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-slate-800">{data?.monthlyMetrics[0]?.compensation.totalEarnings.toLocaleString() || 0}€</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleSaveTier(setter.id)}
                                                                className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                                                            >
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingSetter(null)}
                                                                className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingSetter(setter.id);
                                                                    setEditTier(setter.tier || 1);
                                                                }}
                                                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setExpandedSetter(isExpanded ? null : setter.id)}
                                                                className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                                            >
                                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {
                                            isExpanded && data && (
                                                <tr>
                                                    <td colSpan={8} className="px-6 py-4 bg-slate-50">
                                                        <div className="space-y-4">
                                                            {data.tierSuggestion && (
                                                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                                                                    <ArrowUpRight className="w-5 h-5 text-amber-600" />
                                                                    <span className="text-sm text-amber-800">
                                                                        <span className="font-bold">Sugerencia:</span> Este setter cumple requisitos para
                                                                        <span className="font-bold"> Nivel {data.tierSuggestion}</span>
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <MonthlyMetricsTable metrics={data.monthlyMetrics} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        }
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div >
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Cargando datos de rendimiento...</p>
                </div>
            </div>
        );
    }

    if (isSetter && performanceData.has(currentUser.id)) {
        return <SingleSetterView data={performanceData.get(currentUser.id)!} />;
    }

    if (isAdmin) {
        return <AdminTableView />;
    }

    return (
        <div className="text-center py-12 text-slate-500">
            <p>No tienes permisos para ver esta sección.</p>
        </div>
    );
}
