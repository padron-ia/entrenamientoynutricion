
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import {
    Users, Phone, Calendar, CheckCircle2,
    TrendingUp, Filter, DollarSign, Target,
    Layers, PieChart as PieIcon, Activity,
    Eye, ExternalLink, Instagram, MessageCircle, FileText
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

// Definición de tipos
interface NotionLead {
    notion_id: string;
    nombre_lead: string;
    setter: string | null;
    closer: string | null;
    procedencia: string | null;
    inb_out: string | null;
    dia_agenda: string | null;
    dia_llamada: string | null;
    estado_lead: string | null;
    presentado: boolean;
    cierre: boolean;
    pago: string | null;
    telefono: string | null;
    perfil_ig: string | null;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#475569'];

const MetricCard = ({ title, value, subtitle, icon: Icon, color = "indigo", trend }: any) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
        <div className="flex items-start justify-between">
            <div className={`p-2.5 rounded-xl bg-indigo-50 text-indigo-600`}>
                <Icon className="w-5 h-5" />
            </div>
            {trend && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
    </div>
);

const StaffMetricsView = () => {
    const [leads, setLeads] = useState<NotionLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterPerson, setFilterPerson] = useState<string>('all');
    const [filterSource, setFilterSource] = useState<string>('all');

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('notion_leads_metrics')
            .select('*')
            .order('dia_agenda', { ascending: false, nullsFirst: false })
            .limit(10000);

        if (error) console.error('Error fetching leads:', error);
        else setLeads((data as NotionLead[]) || []);
        setLoading(false);
    };

    // Listas únicas para filtros
    const filters = useMemo(() => {
        const names = new Set<string>();
        const sources = new Set<string>();
        leads.forEach(l => {
            if (l.setter) names.add(l.setter);
            if (l.closer) names.add(l.closer);
            if (l.procedencia) sources.add(l.procedencia);
        });
        return {
            staff: Array.from(names).sort(),
            sources: Array.from(sources).sort()
        };
    }, [leads]);

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            if (!lead.dia_agenda) return false;
            const isoPart = lead.dia_agenda.split('T')[0];
            const [y, m, d] = isoPart.split('-').map(Number);
            const date = new Date(y, m - 1, d);

            const matchesDate = date.getMonth() === filterMonth && date.getFullYear() === filterYear;
            const matchesPerson = filterPerson === 'all' || lead.setter === filterPerson || lead.closer === filterPerson;
            const matchesSource = filterSource === 'all' || lead.procedencia === filterSource;

            return matchesDate && matchesPerson && matchesSource;
        });
    }, [leads, filterMonth, filterYear, filterPerson, filterSource]);

    // Estadísticas Procesadas
    const stats = useMemo(() => {
        const total = filteredLeads.length;
        const closureStatuses = ['Cerrado', 'Reserva de plaza', 'Mes de prueba'];
        const refundStatuses = ['Devolución', 'Devolucion', 'Reembolso'];
        const presentedStatuses = [...closureStatuses, ...refundStatuses, 'No entra'];

        const presented = filteredLeads.filter(l =>
            l.presentado === true || (l.estado_lead && presentedStatuses.includes(l.estado_lead))).length;

        const grossClosed = filteredLeads.filter(l =>
            l.cierre === true || (l.estado_lead && closureStatuses.includes(l.estado_lead))).length;

        const refunded = filteredLeads.filter(l =>
            l.estado_lead && refundStatuses.includes(l.estado_lead)).length;

        const netClosed = Math.max(0, grossClosed - refunded);

        // Distribución por Origen
        const sourceDataMap: Record<string, number> = {};
        filteredLeads.forEach(l => {
            const src = l.procedencia || 'Otros';
            sourceDataMap[src] = (sourceDataMap[src] || 0) + 1;
        });
        const sourceData = Object.entries(sourceDataMap).map(([name, value]) => ({ name, value }));

        // Tendencia diaria
        const dailyMap: Record<string, number> = {};
        filteredLeads.forEach(l => {
            if (l.dia_agenda) {
                const day = l.dia_agenda.split('T')[0].split('-')[2];
                dailyMap[day] = (dailyMap[day] || 0) + 1;
            }
        });
        const trendData = Object.entries(dailyMap).sort().map(([day, count]) => ({ day, count }));

        // Estados
        const statusMap: Record<string, number> = {};
        filteredLeads.forEach(l => {
            const st = l.estado_lead || 'Sin Estado';
            statusMap[st] = (statusMap[st] || 0) + 1;
        });
        const statusData = Object.entries(statusMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

        return {
            total, presented, grossClosed, netClosed, refunded,
            sourceData, trendData, statusData,
            closingRate: presented > 0 ? ((grossClosed / presented) * 100).toFixed(1) : '0',
            netClosingRate: presented > 0 ? ((netClosed / presented) * 100).toFixed(1) : '0',
            showRate: total > 0 ? ((presented / total) * 100).toFixed(1) : '0'
        };
    }, [filteredLeads]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-slate-500 font-medium italic">Destilando inteligencia del equipo...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 bg-slate-50 min-h-screen">

            {/* Header Pro */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Intelligence Dashboard</h1>
                            <p className="text-slate-500 font-medium">Análisis de rendimiento y segmentación de leads</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full lg:w-auto bg-white p-3 rounded-2xl border shadow-sm">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 ml-1 mb-1">Periodo</span>
                        <div className="flex gap-1">
                            <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
                                className="bg-slate-50 border-none rounded-lg text-xs font-bold py-1.5 focus:ring-2 focus:ring-indigo-100">
                                {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
                                className="bg-slate-50 border-none rounded-lg text-xs font-bold py-1.5 focus:ring-2 focus:ring-indigo-100">
                                {[2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 ml-1 mb-1">Miembro</span>
                        <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)}
                            className="bg-slate-50 border-none rounded-lg text-xs font-bold py-1.5 focus:ring-2 focus:ring-indigo-100">
                            <option value="all">Todo el equipo</option>
                            {filters.staff.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 ml-1 mb-1">Canal</span>
                        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
                            className="bg-slate-50 border-none rounded-lg text-xs font-bold py-1.5 focus:ring-2 focus:ring-indigo-100">
                            <option value="all">Todos los canales</option>
                            {filters.sources.map(src => <option key={src} value={src}>{src}</option>)}
                        </select>
                    </div>
                    <button onClick={fetchLeads} className="bg-indigo-50 text-indigo-600 rounded-xl p-2 hover:bg-indigo-100 transition-colors flex items-center justify-center">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard title="Agendas Captadas" value={stats.total} icon={Calendar} />
                <MetricCard title="Presentadas" value={stats.presented} subtitle={`Show Rate: ${stats.showRate}%`} icon={Phone} />
                <MetricCard title="Ventas Brutas" value={stats.grossClosed} subtitle={`Cierre Bruto: ${stats.closingRate}%`} icon={TrendingUp} />
                <MetricCard title="Devoluciones" value={stats.refunded} subtitle="Ventas perdidas" icon={Activity} color="rose" />
                <MetricCard title="Ventas Netas" value={stats.netClosed} subtitle={`Cierre Real: ${stats.netClosingRate}%`} icon={CheckCircle2} color="emerald" />
            </div>

            {/* Main Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Tendencia Temporal */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-500" /> Ritmo de Agendas del Mes
                        </h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.trendData}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="count" name="Agendas" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Origen de Leads */}
                <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <PieIcon className="w-5 h-5 text-emerald-500" /> Canales de Origen
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.sourceData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.sourceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                        {stats.sourceData.slice(0, 3).map((s, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }}></span> {s.name}
                                </span>
                                <span className="font-bold text-slate-700">{((s.value / stats.total) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Tabla de Estados Críticos */}
                <div className="bg-white p-6 rounded-3xl border shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-amber-500" /> Clasificación de Estados (Top 5)
                    </h3>
                    <div className="space-y-4">
                        {stats.statusData.map((st, i) => (
                            <div key={i} className="flex flex-col gap-1">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-600">{st.name}</span>
                                    <span className="font-bold text-slate-900">{st.value} leads</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full bg-indigo-500"
                                        style={{ width: `${(st.value / stats.total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Leads Recientes Segmentados */}
                <div className="bg-white p-6 rounded-3xl border shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-rose-500" /> Últimos Leads del Segmento
                    </h3>
                    <div className="overflow-hidden">
                        <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-2">
                            {filteredLeads.slice(0, 10).map((l, i) => (
                                <div key={i} className="py-3 flex items-center justify-between hover:bg-slate-50 transition-colors px-2 rounded-xl group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                                            {l.nombre_lead?.[0] || 'L'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{l.nombre_lead}</p>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{l.procedencia || 'Sin Origen'} · {l.setter || 'Sin Setter'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.cierre ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {l.estado_lead || 'Pendiente'}
                                        </span>
                                        {l.perfil_ig && (
                                            <a href={l.perfil_ig} target="_blank" className="p-1.5 text-slate-400 hover:text-indigo-600">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffMetricsView;
