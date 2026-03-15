/**
 * Panel de Rendimiento y Compensación de Closers
 *
 * Vista para Admin/Head Coach: Tabla editable con todos los closers
 * Vista para Closer: Panel de solo lectura con sus propios KPIs
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, TrendingDown, Award, Users, FileText,
    CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp,
    Edit3, Save, X, Clock, Star, Trophy, Target, Calendar,
    DollarSign, Zap, Phone, Briefcase, Percent, ArrowUpRight
} from 'lucide-react';
import { User, UserRole, Lead } from '../types';
import {
    CLOSER_TIERS,
    CLOSER_FIXED_SALARY,
    getCloserPerformanceData,
    fetchSales,
    fetchLeads,
    fetchClosers,
    updateCloserTier,
    CloserMonthlyMetrics,
    CloserPerformanceData,
    Sale,
    getTeamPerformanceMetrics,
    TeamPerformanceMetrics
} from '../services/closerMetricsService';

interface CloserPerformancePanelProps {
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
        1: 'Junior',
        2: 'Senior',
        3: 'Elite'
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

const BonusCard: React.FC<{
    title: string;
    value: number;
    bonus: number;
    tiers: { min: number; max: number; amount: number }[];
    icon: React.ReactNode;
    color: string;
}> = ({ title, value, bonus, tiers, icon, color }) => {
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
                    <span className="text-2xl font-black">{value}</span>
                </div>
            </div>
            <div className="p-4">
                <div className="space-y-1.5">
                    {tiers.map((t, idx) => (
                        <div
                            key={idx}
                            className={`flex items-center justify-between text-xs px-2 py-1 rounded ${value >= t.min && value <= t.max
                                ? 'bg-slate-800 text-white font-bold'
                                : 'text-slate-400'
                                }`}
                        >
                            <span>{t.min}-{t.max === Infinity ? '+' : t.max} ventas</span>
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

const MonthlyMetricsTable: React.FC<{ metrics: CloserMonthlyMetrics[] }> = ({ metrics }) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left font-bold">Mes</th>
                        <th className="px-4 py-3 text-center font-bold">Llamadas</th>
                        <th className="px-4 py-3 text-center font-bold">Ventas Realizadas</th>
                        <th className="px-4 py-3 text-center font-bold">Ingresos</th>
                        <th className="px-4 py-3 text-center font-bold">% Éxito Venta</th>
                        <th className="px-4 py-3 text-center font-bold">No-Show</th>
                        <th className="px-4 py-3 text-center font-bold">Comisiones (10%)</th>
                        <th className="px-4 py-3 text-center font-bold">Bonus Mes</th>
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
                                        {isFuture ? '-' : m.leads.scheduled}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="font-bold text-slate-800">
                                            {isFuture ? '-' : m.sales.successful}
                                        </span>
                                        {!isFuture && m.sales.failed > 0 && (
                                            <span className="text-[10px] text-red-400">
                                                {m.sales.failed} fallidas
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="font-bold text-emerald-600">
                                        {isFuture ? '-' : `${m.revenue.gross.toLocaleString()}€`}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`font-bold ${!isFuture && m.rates.closeRate >= 25 ? 'text-emerald-600' : isFuture ? 'text-slate-400' : m.rates.closeRate >= 15 ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {isFuture ? '-' : `${m.rates.closeRate}%`}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`font-bold ${isFuture ? 'text-slate-400' : m.rates.noShowRate > 20 ? 'text-rose-600' : 'text-slate-600'}`}>
                                        {isFuture ? '-' : `${m.rates.noShowRate}%`}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="font-bold text-blue-600">
                                            {isFuture ? '-' : `${m.commissions.earned.toLocaleString()}€`}
                                        </span>
                                        {!isFuture && m.commissions.pending > 0 && (
                                            <span className="text-[10px] text-amber-500">
                                                {m.commissions.pending.toLocaleString()}€ pend.
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`font-bold ${m.bonus.total > 0 ? 'text-purple-600' : 'text-slate-400'}`}>
                                        {isFuture ? '-' : `+${m.bonus.total}€`}
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
// COMPONENTE PRINCIPAL
// ============================================================

export default function CloserPerformancePanel({ currentUser }: CloserPerformancePanelProps) {
    const [loading, setLoading] = useState(true);
    const [closers, setClosers] = useState<User[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [performanceData, setPerformanceData] = useState<Map<string, CloserPerformanceData>>(new Map());
    const [expandedCloser, setExpandedCloser] = useState<string | null>(null);
    const [editingCloser, setEditingCloser] = useState<string | null>(null);
    const [editTier, setEditTier] = useState<number>(1);
    const [projectFilter, setProjectFilter] = useState<'all' | 'PT' | 'ME'>('all');
    const [teamMetrics, setTeamMetrics] = useState<TeamPerformanceMetrics | null>(null);

    const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HEAD_COACH || (currentUser.role || '').toLowerCase() === 'direccion';
    const isCloser = currentUser.role === UserRole.CLOSER;

    useEffect(() => {
        loadData();
    }, [projectFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [salesData, leadsData, closersData] = await Promise.all([
                fetchSales(),
                fetchLeads(),
                isAdmin ? fetchClosers() : Promise.resolve([currentUser])
            ]);

            setSales(salesData);
            setLeads(leadsData);
            setClosers(closersData);

            // Fetch team metrics
            const tMetrics = await getTeamPerformanceMetrics(salesData);
            setTeamMetrics(tMetrics);

            // Filter by project
            const filteredSales = projectFilter === 'all' ? salesData : salesData.filter(s => s.project === projectFilter);
            const filteredLeads = projectFilter === 'all' ? leadsData : leadsData.filter(l => l.project === projectFilter);

            // Calculate performance for each closer
            const perfMap = new Map<string, CloserPerformanceData>();
            for (const closer of closersData) {
                const data = await getCloserPerformanceData(closer, filteredSales, filteredLeads, 4);
                perfMap.set(closer.id, data);
            }
            setPerformanceData(perfMap);
        } catch (err) {
            console.error('Error loading closer performance data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTier = async (closerId: string) => {
        const result = await updateCloserTier(closerId, editTier);
        if (result.success) {
            // Update local state
            setClosers(prev => prev.map(c =>
                c.id === closerId ? { ...c, tier: editTier as 1 | 2 | 3 } : c
            ));
            setEditingCloser(null);
            // Recalculate performance
            loadData();
        } else {
            alert('Error al actualizar el tier: ' + result.error);
        }
    };

    // Single Closer View (for closer role)
    const SingleCloserView: React.FC<{ data: CloserPerformanceData }> = ({ data }) => {
        const currentMonth = data.monthlyMetrics[0]; // Most recent month

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight">Mi Rendimiento</h2>
                                <p className="text-slate-400 mt-1">
                                    {data.closer.name} • <TierBadge tier={(data.closer.tier || 1) as 1 | 2 | 3} size="sm" />
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <select
                                    value={projectFilter}
                                    onChange={(e) => setProjectFilter(e.target.value as any)}
                                    className="bg-white/10 border border-white/20 text-white text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer backdrop-blur-sm"
                                >
                                    <option value="all" className="text-slate-900">Todos los Proyectos</option>
                                    <option value="PT" className="text-slate-900">Padron Trainer</option>
                                    <option value="ME" className="text-slate-900">Médico Emprendedor</option>
                                </select>
                                <div className="text-right border-l border-white/20 pl-4">
                                    <p className="text-slate-400 text-sm">Fijo Mensual</p>
                                    <p className="text-4xl font-black text-emerald-400">{CLOSER_FIXED_SALARY}€</p>
                                </div>
                            </div>
                        </div>

                        {/* KPI Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="w-5 h-5 text-blue-400" />
                                    <span className="text-slate-400 text-xs font-bold uppercase">Ventas Mes</span>
                                </div>
                                <p className="text-3xl font-black">{currentMonth?.sales.successful || 0}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-5 h-5 text-emerald-400" />
                                    <span className="text-slate-400 text-xs font-bold uppercase">Ingresos</span>
                                </div>
                                <p className="text-3xl font-black">{currentMonth?.revenue.gross.toLocaleString() || 0}€</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Percent className="w-5 h-5 text-purple-400" />
                                    <span className="text-slate-400 text-xs font-bold uppercase">% Éxito Venta</span>
                                </div>
                                <p className="text-3xl font-black">{currentMonth?.rates.closeRate || 0}%</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Trophy className="w-5 h-5 text-amber-400" />
                                    <span className="text-slate-400 text-xs font-bold uppercase">Comisiones</span>
                                </div>
                                <p className="text-3xl font-black">{currentMonth?.commissions.earned.toLocaleString() || 0}€</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bonus Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Team Quarterly Card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Target className="w-5 h-5" />
                                    <span className="font-bold text-sm">Objetivo Trimestral (Equipo)</span>
                                </div>
                                <span className="text-2xl font-black">{teamMetrics?.currentQuarter.label}</span>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-500">Recaudado: <span className="font-bold text-slate-800">{teamMetrics?.currentQuarter.totalCashCollected.toLocaleString()}€</span></span>
                                <span className="text-slate-500">Meta: {teamMetrics?.currentQuarter.goal.toLocaleString()}€</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (teamMetrics?.currentQuarter.totalCashCollected || 0) / (teamMetrics?.currentQuarter.goal || 1) * 100)}%` }}
                                ></div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">MULTIPLICADOR</span>
                                <span className={`text-lg font-black ${teamMetrics?.currentQuarter.multiplier || 0 > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                    x{teamMetrics?.currentQuarter.multiplier || 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Team Annual Card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5" />
                                    <span className="font-bold text-sm">Objetivo Anual (Equipo)</span>
                                </div>
                                <span className="text-2xl font-black">{teamMetrics?.currentYear.label}</span>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-500">Recaudado: <span className="font-bold text-slate-800">{teamMetrics?.currentYear.totalCashCollected.toLocaleString()}€</span></span>
                                <span className="text-slate-500">Meta: {teamMetrics?.currentYear.goal.toLocaleString()}€</span>
                            </div>
                            <div className="w-full bg-secondary-100 rounded-full h-2 mb-4">
                                <div
                                    className="bg-purple-500 h-2 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (teamMetrics?.currentYear.totalCashCollected || 0) / (teamMetrics?.currentYear.goal || 1) * 100)}%` }}
                                ></div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">POOL ACTUAL</span>
                                <span className={`text-lg font-black ${teamMetrics?.currentYear.poolAmount || 0 > 0 ? 'text-purple-600' : 'text-slate-400'}`}>
                                    {teamMetrics?.currentYear.poolAmount.toLocaleString() || 0}€
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="w-6 h-6" />
                            <span className="font-bold">Total Estimado Mes</span>
                        </div>
                        <p className="text-5xl font-black">{currentMonth?.totalEarnings.toLocaleString() || 0}€</p>
                        <div className="mt-4 pt-4 border-t border-white/20 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="opacity-80">Fijo + Comisiones:</span>
                                <span className="font-bold">{((currentMonth?.fixedSalary || 0) + (currentMonth?.commissions.earned || 0)).toLocaleString()}€</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="opacity-80">Bonus Vol.:</span>
                                <span className="font-bold">{currentMonth?.bonus.monthly || 0}€</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-1 mt-1">
                                <span className="opacity-80">Bonus Trimestral:</span>
                                <span className="font-bold">+{currentMonth?.bonus.quarterly || 0}€</span>
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
                                    Basado en tu rendimiento de los últimos meses, cumples los requisitos para el
                                    <span className="font-bold"> Nivel {data.tierSuggestion} ({CLOSER_TIERS[data.tierSuggestion].name})</span>.
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
                            <Users className="w-6 h-6 text-blue-600" />
                            Rendimiento de Closers
                        </h2>
                        <p className="text-sm text-slate-500">Gestión de tiers, comisiones y bonus</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value as any)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
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
                                <th className="px-6 py-4 text-left font-bold">Closer</th>
                                <th className="px-6 py-4 text-center font-bold">Fijo</th>
                                <th className="px-6 py-4 text-center font-bold">Llamadas</th>
                                <th className="px-6 py-4 text-center font-bold">Ventas Realizadas</th>
                                <th className="px-6 py-4 text-center font-bold">Ingresos</th>
                                <th className="px-6 py-4 text-center font-bold">% Éxito</th>
                                <th className="px-6 py-3 text-center font-bold">No-Show</th>
                                <th className="px-6 py-4 text-center font-bold">Comisión (10%)</th>
                                <th className="px-6 py-4 text-center font-bold">Bonus Mes</th>
                                <th className="px-6 py-4 text-center font-bold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {closers.map(closer => {
                                const data = performanceData.get(closer.id);
                                const isExpanded = expandedCloser === closer.id;
                                const isEditing = editingCloser === closer.id;

                                return (
                                    <React.Fragment key={closer.id}>
                                        <tr className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={closer.avatarUrl || closer.avatar_url || `https://ui-avatars.com/api/?name=${closer.name}`}
                                                        alt={closer.name}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                    <div>
                                                        <p className="font-bold text-slate-800">{closer.name}</p>
                                                        <p className="text-xs text-slate-400">{closer.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-slate-800">{data?.monthlyMetrics[0]?.fixedSalary || 500}€</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-slate-800">{data?.monthlyMetrics[0]?.leads.scheduled || 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-slate-800">{data?.monthlyMetrics[0]?.sales.successful || 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-emerald-600">{data?.monthlyMetrics[0]?.revenue.gross.toLocaleString() || 0}€</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`font-bold ${(data?.monthlyMetrics[0]?.rates.closeRate || 0) >= 25 ? 'text-emerald-600' : (data?.monthlyMetrics[0]?.rates.closeRate || 0) >= 15 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                    {data?.monthlyMetrics[0]?.rates.closeRate || 0}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs font-bold text-slate-500">
                                                    {data?.monthlyMetrics[0]?.rates.noShowRate || 0}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-blue-600">{data?.monthlyMetrics[0]?.commissions.earned.toLocaleString() || 0}€</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-purple-600">+{data?.monthlyMetrics[0]?.bonus.monthly || 0}€</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleSaveTier(closer.id)}
                                                                className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                                                            >
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingCloser(null)}
                                                                className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingCloser(closer.id);
                                                                    setEditTier(closer.tier || 1);
                                                                }}
                                                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setExpandedCloser(isExpanded ? null : closer.id)}
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
                                                                        <span className="font-bold">Sugerencia:</span> Este closer cumple requisitos para
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
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Cargando datos de rendimiento...</p>
                </div>
            </div>
        );
    }

    // Render based on role
    if (isCloser && performanceData.has(currentUser.id)) {
        return <SingleCloserView data={performanceData.get(currentUser.id)!} />;
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
