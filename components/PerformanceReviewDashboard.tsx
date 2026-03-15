import React, { useState, useMemo } from 'react';
import {
    BarChart3,
    TrendingUp,
    Target,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Activity,
    History,
    LayoutDashboard,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Scale,
    Footprints
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { Client, WeeklyCoachReview, MonthlyReview, QuarterlyReview, RoadmapData } from '../types';
import MonthlyReviewPanel from './MonthlyReviewPanel';
import QuarterlyReviewPanel from './QuarterlyReviewPanel';
import {
    analyzeStrategicAlignment,
    getCurrentProgramPhase
} from '../services/processTrackingService';

interface PerformanceReviewDashboardProps {
    client: Client;
    checkins: any[];
    weeklyReviews: WeeklyCoachReview[];
    monthlyReviews: MonthlyReview[];
    quarterlyReviews: QuarterlyReview[];
    weightHistory: any[];
    stepsHistory: any[];
    isCoach: boolean;
}

const PerformanceReviewDashboard: React.FC<PerformanceReviewDashboardProps> = ({
    client,
    checkins,
    weeklyReviews,
    monthlyReviews,
    quarterlyReviews,
    weightHistory,
    stepsHistory,
    isCoach
}) => {
    const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'history' | 'reviews'>('metrics');

    const strategicAlignment = useMemo(() => {
        return analyzeStrategicAlignment(client.roadmap_data as RoadmapData, weeklyReviews);
    }, [client.roadmap_data, weeklyReviews]);

    const currentPhase = useMemo(() => {
        return getCurrentProgramPhase(client.start_date);
    }, [client.start_date]);

    // Calculate Average Weight (last 4 entries)
    const avgWeight = useMemo(() => {
        if (weightHistory.length === 0) return client.current_weight || 0;
        const lastEntries = weightHistory.slice(-4);
        const sum = lastEntries.reduce((acc, curr) => acc + curr.weight, 0);
        return (sum / lastEntries.length).toFixed(1);
    }, [weightHistory, client.current_weight]);

    // Calculate Average Steps
    const avgSteps = useMemo(() => {
        if (stepsHistory.length === 0) return 0;
        const sum = stepsHistory.reduce((acc, curr) => acc + curr.steps, 0);
        return Math.round(sum / stepsHistory.length);
    }, [stepsHistory]);

    // Calculate Adherence Score (from process score or goal metrics)
    const adherenceScore = useMemo(() => {
        if (monthlyReviews.length > 0) {
            return monthlyReviews[monthlyReviews.length - 1].process_score || 0;
        }
        if (weeklyReviews.length > 0) {
            const last = weeklyReviews[weeklyReviews.length - 1];
            const total = last.goals_fulfilled + last.goals_partial + last.goals_not_fulfilled;
            if (total === 0) return 0;
            return Math.round(((last.goals_fulfilled + last.goals_partial * 0.5) / total) * 100);
        }
        return 0;
    }, [monthlyReviews, weeklyReviews]);

    // Calculate Process Score
    const processScore = useMemo(() => {
        if (monthlyReviews.length > 0) {
            return monthlyReviews[monthlyReviews.length - 1].process_score;
        }
        return adherenceScore;
    }, [monthlyReviews, adherenceScore]);

    const MetricCard = ({ title, value, icon: Icon, color, trend, trendValue }: any) => (
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-xl ${color} bg-opacity-10`}>
                    <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-0.5 text-xs font-bold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {trendValue}
                    </div>
                )}
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
                <p className="text-2xl font-black text-slate-800">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* --- STRATEGIC HEADER --- */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 shadow-2xl shadow-slate-900/20">
                {/* Background Accents */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px]" />

                <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                    {/* Left: Phase & Roadmap Context */}
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[10px] font-bold uppercase tracking-widest">
                            <Target className="w-3 h-3 text-indigo-400" />
                            {currentPhase.phaseName}
                        </div>
                        <h2 className="text-3xl font-black text-white leading-tight">
                            Estatus del Proceso <br />
                            <span className="text-indigo-400 underline decoration-indigo-400/30 underline-offset-8">Estratégico</span>
                        </h2>
                        <p className="text-slate-400 text-sm max-w-sm">
                            Análisis en tiempo real del progreso hacia los objetivos acordados en la Brújula de Éxito.
                        </p>
                    </div>

                    {/* Center: Radial Process Score */}
                    <div className="flex flex-col items-center justify-center py-4">
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="transparent"
                                    className="text-slate-800"
                                />
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="transparent"
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - (440 * (processScore || 0)) / 100}
                                    strokeLinecap="round"
                                    className="text-indigo-500 transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-white">{processScore}%</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Score Proceso</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Key Progress Metrics */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Alineación Estratégica</span>
                                <span className="text-indigo-400">{strategicAlignment.alignmentPercent}%</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-1000"
                                    style={{ width: `${strategicAlignment.alignmentPercent}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Hitos Logrados</p>
                                <p className="text-xl font-black text-white">
                                    {strategicAlignment.completedMilestones} <span className="text-slate-600 text-sm">/ {strategicAlignment.totalMilestones}</span>
                                </p>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Trayectoria</p>
                                <div className={`inline-flex items-center gap-1.5 text-sm font-bold ${strategicAlignment.isOnTrack ? 'text-green-400' : 'text-amber-400'}`}>
                                    {strategicAlignment.isOnTrack ? (
                                        <><CheckCircle2 className="w-4 h-4" /> En Ruta</>
                                    ) : (
                                        <><AlertCircle className="w-4 h-4" /> Riesgo</>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- DASHBOARD NAVIGATION --- */}
            <div className="flex items-center justify-between p-1 bg-slate-100/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 w-fit self-center mx-auto">
                <button
                    onClick={() => setActiveSubTab('metrics')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'metrics'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Activity className="w-4 h-4" /> Métricas Vitales
                </button>
                <button
                    onClick={() => setActiveSubTab('history')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'history'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <History className="w-4 h-4" /> Evolución
                </button>
                <button
                    onClick={() => setActiveSubTab('reviews')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'reviews'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <LayoutDashboard className="w-4 h-4" /> Revisiones Ciclo
                </button>
            </div>

            {/* --- TAB CONTENT --- */}
            <div className="space-y-6">
                {activeSubTab === 'metrics' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Note: In a final implementation, real chart data would be passed here */}
                        <MetricCard
                            title="Peso Promedio"
                            value={`${avgWeight} kg`}
                            icon={TrendingUp}
                            color="bg-indigo-500"
                            trend={weightHistory.length > 1 && weightHistory[weightHistory.length - 1].weight < weightHistory[0].weight ? "down" : "up"}
                            trendValue={weightHistory.length > 1 ? `${Math.abs(((weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight) / weightHistory[0].weight) * 100).toFixed(1)}%` : ""}
                        />
                        <MetricCard
                            title="Pasos Medios"
                            value={avgSteps.toLocaleString()}
                            icon={Activity}
                            color="bg-emerald-500"
                        />
                        <MetricCard
                            title="Adherencia Plan"
                            value={`${adherenceScore}%`}
                            icon={CheckCircle2}
                            color="bg-blue-500"
                        />
                        <MetricCard
                            title="Nivel de Energía"
                            value={weeklyReviews.length > 0 ? (weeklyReviews[weeklyReviews.length - 1].feeling === 'green' ? 'Alto' : weeklyReviews[weeklyReviews.length - 1].feeling === 'yellow' ? 'Medio' : 'Bajo') : 'N/A'}
                            icon={Target}
                            color="bg-amber-500"
                        />

                        <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-slate-800">Visualización de Tendencias</h3>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Peso (kg)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pasos</span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-72 w-full">
                                {weightHistory.length > 0 || stepsHistory.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={weightHistory.map((w, i) => ({
                                            date: new Date(w.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                                            weight: w.weight,
                                            steps: stepsHistory[i]?.steps || 0
                                        }))}>
                                            <defs>
                                                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                yAxisId="left"
                                                orientation="left"
                                                domain={['dataMin - 2', 'dataMax + 2']}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                            />
                                            <YAxis
                                                yAxisId="right"
                                                orientation="right"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                    borderRadius: '16px',
                                                    border: 'none',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                    fontSize: '12px',
                                                    fontWeight: '700'
                                                }}
                                            />
                                            <Area
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="weight"
                                                stroke="#6366f1"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorWeight)"
                                                animationDuration={1500}
                                            />
                                            <Area
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey="steps"
                                                stroke="#10b981"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorSteps)"
                                                animationDuration={1500}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                                        <Activity className="w-8 h-8 text-slate-200 mb-2" />
                                        <p className="text-slate-400 text-sm italic">Sin datos históricos suficientes para graficar</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeSubTab === 'history' && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-8">
                        <h3 className="text-xl font-black text-slate-800">Histórico de Alineación</h3>
                        <div className="space-y-4">
                            {monthlyReviews.length > 0 ? (
                                monthlyReviews.map((review, idx) => (
                                    <div key={review.id || idx} className="flex items-center gap-6 p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all group">
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                            <Calendar className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                                            <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-600">{review.month.split('-')[1]}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-800">Revisión de {review.month}</p>
                                            <p className="text-xs text-slate-500">{review.achievements || 'Sin observaciones detalladas.'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-slate-800">{review.process_score}%</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Score</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center space-y-2">
                                    <History className="w-12 h-12 text-slate-200 mx-auto" />
                                    <p className="text-slate-400 text-sm">No hay revisiones históricas disponibles aún.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeSubTab === 'reviews' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl border border-slate-200 p-8">
                                <MonthlyReviewPanel
                                    clientId={client.id}
                                    coachId={client.coach_id}
                                    month={new Date().toISOString().slice(0, 7)}
                                />
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl border border-slate-200 p-8">
                                <QuarterlyReviewPanel
                                    client={client}
                                    coachId={client.coach_id}
                                    periodStart={client.start_date}
                                    periodEnd={client.contract_end_date}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerformanceReviewDashboard;
