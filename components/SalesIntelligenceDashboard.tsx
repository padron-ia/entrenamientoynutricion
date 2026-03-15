import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import {
    Users, Phone, Calendar, CheckCircle2, TrendingUp, TrendingDown,
    Target, Activity, Zap, Award, Crown, Medal, Star,
    ArrowUpRight, ArrowDownRight, ChevronRight, Filter,
    BarChart3, PieChart as PieIcon, Layers, UserCheck, PhoneCall,
    DollarSign, Percent, Eye, Clock, Flame, Trophy, Database, Edit2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';
import LeadsManagement from './leads/LeadsManagement';
import { User, UserRole } from '../types';

// Props para el dashboard
interface SalesIntelligenceDashboardProps {
    currentUser?: User;
}

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
    pago: any;
    telefono: string | null;
    perfil_ig: string | null;
}

interface SetterStats {
    name: string;
    agendas: number;
    presented: number;
    closed: number;
    showRate: number;
    qualityRate: number;
    trend: number;
}

interface CloserStats {
    name: string;
    calls: number;
    closed: number;
    closingRate: number;
    revenue: number;
    trend: number;
}

const COLORS_GRADIENT = {
    setter: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
    closer: ['#06b6d4', '#22d3ee', '#67e8f9'],
    success: ['#10b981', '#34d399', '#6ee7b7'],
    warning: ['#f59e0b', '#fbbf24', '#fcd34d'],
};

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

// Configuración de roles del equipo de ventas
const VALID_SETTERS = ['thais', 'diana', 'elena'];
const VALID_CLOSERS = ['sergi', 'yassine', 'elena', 'raquel'];

const isValidSetter = (name: string | null): boolean => {
    if (!name) return false;
    const normalized = name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return VALID_SETTERS.includes(normalized);
};

const isValidCloser = (name: string | null): boolean => {
    if (!name) return false;
    return VALID_CLOSERS.includes(name.toLowerCase().trim());
};

// Helper para obtener nombre normalizado (para deduplicar)
const normalizeName = (name: string | null): string => {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
};

const SalesIntelligenceDashboard = ({ currentUser }: SalesIntelligenceDashboardProps) => {
    // Determinar si es setter (solo puede ver sus propios datos)
    const isSetter = currentUser?.role === UserRole.SETTER ||
        (currentUser?.role || '').toLowerCase() === 'setter';
    const isAdmin = !isSetter; // Admin, Head Coach, Dirección, etc. ven todo

    // Nombre del setter actual para filtrar (normalizado)
    const currentSetterName = isSetter && currentUser?.name
        ? currentUser.name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        : null;
    const [leads, setLeads] = useState<NotionLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [projectFilter, setProjectFilter] = useState<'all' | 'PT' | 'ME'>('all');
    const [activeTab, setActiveTab] = useState<'overview' | 'setters' | 'closers' | 'management'>('overview');

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            // Solo traer leads que tienen dia_agenda (fecha de agenda)
            const { data, error } = await supabase
                .from('notion_leads_metrics')
                .select('*')
                .not('dia_agenda', 'is', null)
                .order('dia_agenda', { ascending: false });

            if (error) {
                console.error('Error fetching leads:', error);
            } else {
                console.log('Leads cargados (con fecha):', data?.length || 0);
                setLeads((data as NotionLead[]) || []);
            }
        } catch (err) {
            console.error('Exception fetching leads:', err);
        }
        setLoading(false);
    };

    // Helper para comparar estados (case-insensitive)
    const matchesStatus = (leadStatus: string | null, statusList: string[]): boolean => {
        if (!leadStatus) return false;
        const normalized = leadStatus.toLowerCase().trim();
        return statusList.some(s => s.toLowerCase() === normalized);
    };

    // Filtrar por mes/año (y por setter si es un setter)
    const filteredLeads = useMemo(() => {
        const filtered = leads.filter(lead => {
            if (!lead.dia_agenda) return false;
            const date = new Date(lead.dia_agenda);
            const matchesDate = date.getMonth() === filterMonth && date.getFullYear() === filterYear;
            const matchesProject = projectFilter === 'all' || (lead as any).project === projectFilter;

            // Si es setter, solo mostrar sus propios leads
            if (currentSetterName) {
                const leadSetterNormalized = lead.setter
                    ? lead.setter.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    : '';
                if (leadSetterNormalized !== currentSetterName) return false;
            }

            return matchesDate && matchesProject;
        });
        console.log(`Leads filtrados para ${filterMonth + 1}/${filterYear} [${projectFilter}]${currentSetterName ? ` (Setter: ${currentSetterName})` : ''}:`, filtered.length);
        return filtered;
    }, [leads, filterMonth, filterYear, projectFilter, currentSetterName]);

    // Leads del mes anterior para comparar tendencias (también filtrado para setters)
    const previousMonthLeads = useMemo(() => {
        const prevMonth = filterMonth === 0 ? 11 : filterMonth - 1;
        const prevYear = filterMonth === 0 ? filterYear - 1 : filterYear;
        return leads.filter(lead => {
            if (!lead.dia_agenda) return false;
            const date = new Date(lead.dia_agenda);
            const matchesDate = date.getMonth() === prevMonth && date.getFullYear() === prevYear;

            // Si es setter, solo mostrar sus propios leads
            if (currentSetterName) {
                const leadSetterNormalized = lead.setter
                    ? lead.setter.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    : '';
                if (leadSetterNormalized !== currentSetterName) return false;
            }

            return matchesDate;
        });
    }, [leads, filterMonth, filterYear, currentSetterName]);

    // Estados de cierre (ventas iniciales)
    const closureStatuses = ['cerrado', 'reserva de plaza', 'cierre', 'mes de prueba'];
    // Estados o etiquetas de devolución
    const refundKeywords = ['devolución', 'devolucion', 'reembolso', 'pide devolución', 'pide devolucion'];

    // Función helper para detectar devoluciones de forma robusta
    const isRefund = (l: NotionLead): boolean => {
        const inStatus = l.estado_lead && refundKeywords.some(key => l.estado_lead!.toLowerCase().includes(key));
        const inPago = l.pago && typeof l.pago === 'string' && refundKeywords.some(key => l.pago!.toLowerCase().includes(key));
        return !!(inStatus || inPago);
    };

    // Normalizar nombres para deduplicación agresiva
    const normalizeName = (name: string | null | undefined): string => {
        if (!name) return '';
        return name.toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/\(medica\)|\(medico\)|medica|medico/g, '') // Eliminar etiquetas médicas
            .trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Quitar acentos
    };

    // Helper para calcular el valor de un lead basándose en la columna pago
    const calculateLeadValue = (pago: any): number => {
        if (!pago || typeof pago !== 'string') return 0;

        // Limpiamos etiquetas de texto para quedarnos con números y separadores
        const cleanPago = pago.toLowerCase()
            .replace(/pide devolución|pide devolucion|devolución|devolucion|reembolso/g, '')
            .trim();

        if (!cleanPago) return 0;

        const parts = cleanPago.split(',').map(s => s.trim());
        const values: number[] = [];

        parts.forEach(part => {
            if (part.includes('x')) {
                const match = part.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+)/);
                if (match) {
                    values.push(parseFloat(match[1]) * parseInt(match[2]));
                }
            } else {
                const numbers = part.match(/\d+/g);
                if (numbers) {
                    // Solo números de 3 o más cifras para evitar IDs de fila o días
                    const filteredNumbers = numbers.map(n => parseInt(n)).filter(n => n >= 100);
                    if (filteredNumbers.length > 0) {
                        values.push(Math.max(...filteredNumbers));
                    }
                }
            }
        });

        if (values.length === 0) return 0;
        // Tomamos el valor máximo para evitar duplicar (ej: "1000x4, 4000")
        return Math.max(...values);
    };

    // Estados que indican que el lead fue presentado (llegó a llamada)
    const presentedStatuses = [...closureStatuses, 'no entra', 'no cierre', 'no cualifica'];

    // Estadísticas de SETTERS (solo setters válidos)
    const setterStats = useMemo((): SetterStats[] => {
        const setterMap: Record<string, { agendas: number; presented: number; closed: number }> = {};
        const prevSetterMap: Record<string, { agendas: number; presented: number }> = {};

        // Mes actual - solo contar si el setter es válido
        filteredLeads.forEach(l => {
            if (!isValidSetter(l.setter)) return; // Ignorar si no es setter válido
            // Normalizar el nombre para agrupar (thais = thaïs)
            const setter = l.setter!.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (!setterMap[setter]) setterMap[setter] = { agendas: 0, presented: 0, closed: 0 };
            setterMap[setter].agendas++;
            if (l.presentado || matchesStatus(l.estado_lead, presentedStatuses) || isRefund(l)) {
                setterMap[setter].presented++;
            }
            if (l.cierre || matchesStatus(l.estado_lead, closureStatuses)) {
                setterMap[setter].closed++;
            }
        });

        // Mes anterior para tendencia - solo setters válidos
        previousMonthLeads.forEach(l => {
            if (!isValidSetter(l.setter)) return;
            const setter = l.setter!.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (!prevSetterMap[setter]) prevSetterMap[setter] = { agendas: 0, presented: 0 };
            prevSetterMap[setter].agendas++;
            if (l.presentado || matchesStatus(l.estado_lead, presentedStatuses) || isRefund(l)) {
                prevSetterMap[setter].presented++;
            }
        });

        return Object.entries(setterMap)
            .filter(([name]) => name !== 'Sin Asignar')
            .map(([name, data]) => {
                const prevData = prevSetterMap[name] || { agendas: 0, presented: 0 };
                const showRate = data.agendas > 0 ? (data.presented / data.agendas) * 100 : 0;
                const prevShowRate = prevData.agendas > 0 ? (prevData.presented / prevData.agendas) * 100 : 0;
                const qualityRate = data.presented > 0 ? (data.closed / data.presented) * 100 : 0;

                return {
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    agendas: data.agendas,
                    presented: data.presented,
                    closed: data.closed,
                    showRate,
                    qualityRate,
                    trend: showRate - prevShowRate
                };
            })
            .sort((a, b) => b.agendas - a.agendas);
    }, [filteredLeads, previousMonthLeads]);

    // Estadísticas de CLOSERS (solo closers válidos, contando personas únicas)
    const closerStats = useMemo((): CloserStats[] => {
        const closerMap: Record<string, { callsSet: Set<string>; closedSet: Set<string> }> = {};
        const prevCloserMap: Record<string, { callsSet: Set<string>; closedSet: Set<string> }> = {};

        // Mes actual - Closers trabajan con leads presentados (deduplicar por nombre)
        filteredLeads.forEach(l => {
            if (!isValidCloser(l.closer)) return;
            const closer = l.closer!;
            const leadName = normalizeName(l.nombre_lead);
            if (!leadName) return;

            if (!closerMap[closer]) closerMap[closer] = { callsSet: new Set(), closedSet: new Set() };

            // Solo contar si el lead fue presentado (llegó a llamada)
            const isCierre = l.cierre || (l.presentado && matchesStatus(l.estado_lead, closureStatuses));
            if (l.presentado || matchesStatus(l.estado_lead, presentedStatuses) || isRefund(l)) {
                closerMap[closer].callsSet.add(leadName);
                if (isCierre) {
                    closerMap[closer].closedSet.add(leadName);
                }
            }
        });

        // Mes anterior - solo closers válidos (deduplicar por nombre)
        previousMonthLeads.forEach(l => {
            if (!isValidCloser(l.closer)) return;
            const closer = l.closer!;
            const leadName = normalizeName(l.nombre_lead);
            if (!leadName) return;

            if (!prevCloserMap[closer]) prevCloserMap[closer] = { callsSet: new Set(), closedSet: new Set() };
            if (l.presentado || matchesStatus(l.estado_lead, presentedStatuses) || isRefund(l)) {
                prevCloserMap[closer].callsSet.add(leadName);
                if (l.cierre || matchesStatus(l.estado_lead, closureStatuses)) {
                    prevCloserMap[closer].closedSet.add(leadName);
                }
            }
        });

        return Object.entries(closerMap)
            .map(([name, data]) => {
                const calls = data.callsSet.size;
                const closed = data.closedSet.size;
                const prevData = prevCloserMap[name];
                const prevCalls = prevData ? prevData.callsSet.size : 0;
                const prevClosed = prevData ? prevData.closedSet.size : 0;

                const closingRate = calls > 0 ? (closed / calls) * 100 : 0;
                const prevClosingRate = prevCalls > 0 ? (prevClosed / prevCalls) * 100 : 0;

                // Estimación de revenue REAL sumando importes de pago y restando devoluciones
                let closerRevenue = 0;
                filteredLeads.forEach(l => {
                    if (l.closer === name) {
                        const val = calculateLeadValue(l.pago);
                        const isC = (l.cierre || matchesStatus(l.estado_lead, closureStatuses));
                        const isD = isRefund(l);
                        if (isC) closerRevenue += val;
                        if (isD) closerRevenue -= val;
                    }
                });

                return {
                    name,
                    calls,
                    closed,
                    closingRate,
                    revenue: closerRevenue,
                    trend: closingRate - prevClosingRate
                };
            })
            .sort((a, b) => b.closed - a.closed);
    }, [filteredLeads, previousMonthLeads]);

    // KPIs Globales (contando personas únicas para cierres y devoluciones)
    const globalStats = useMemo(() => {
        const total = filteredLeads.length;
        const presented = filteredLeads.filter(l =>
            l.presentado || matchesStatus(l.estado_lead, presentedStatuses) || isRefund(l)
        ).length;

        // Contar ventas brutas únicas
        const grossClosedSet = new Set<string>();
        filteredLeads.forEach(l => {
            const isCierre = l.cierre || (l.presentado && matchesStatus(l.estado_lead, closureStatuses));
            if (isValidCloser(l.closer) && isCierre) {
                const name = normalizeName(l.nombre_lead);
                if (name) grossClosedSet.add(name);
            }
        });
        const grossClosed = grossClosedSet.size;

        // Contar devoluciones únicas (buscando en estado y en columna pago)
        const refundedSet = new Set<string>();
        filteredLeads.forEach(l => {
            if (isRefund(l)) {
                const name = normalizeName(l.nombre_lead);
                if (name) refundedSet.add(name);
            }
        });
        const refunded = refundedSet.size;

        // Ventas Netas
        const netClosed = Math.max(0, grossClosed - refunded);

        // --- CÁLCULO DE FACTURACIÓN REAL ---
        let currentRevenue = 0;
        filteredLeads.forEach(l => {
            const val = calculateLeadValue(l.pago);
            const isCierre = l.cierre || (l.presentado && matchesStatus(l.estado_lead, closureStatuses));
            const isDev = isRefund(l);
            if (isValidCloser(l.closer) && isCierre) currentRevenue += val;
            if (isDev) currentRevenue -= val;
        });

        let pastRevenue = 0;
        previousMonthLeads.forEach(l => {
            const val = calculateLeadValue(l.pago);
            const isCierre = (isValidCloser(l.closer) && (l.cierre || matchesStatus(l.estado_lead, closureStatuses)));
            const isDev = isRefund(l);
            if (isCierre) pastRevenue += val;
            if (isDev) pastRevenue -= val;
        });

        const prevTotal = previousMonthLeads.length;

        return {
            total,
            presented,
            grossClosed,
            netClosed,
            refunded,
            showRate: total > 0 ? (presented / total) * 100 : 0,
            closingRate: presented > 0 ? (grossClosed / presented) * 100 : 0,
            netClosingRate: presented > 0 ? (netClosed / presented) * 100 : 0,
            overallRate: total > 0 ? (netClosed / total) * 100 : 0,
            revenue: currentRevenue,
            leadsTrend: prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0,
            revenueTrend: pastRevenue > 0 ? ((currentRevenue - pastRevenue) / pastRevenue) * 100 : 0
        };
    }, [filteredLeads, previousMonthLeads]);

    // Datos del embudo
    const funnelData = useMemo(() => [
        { name: 'Leads Captados', value: globalStats.total, fill: '#6366f1', percent: 100 },
        { name: 'Llamadas Hechas', value: globalStats.presented, fill: '#8b5cf6', percent: globalStats.showRate },
        { name: 'Ventas Brutas', value: globalStats.grossClosed, fill: '#10b981', percent: globalStats.closingRate },
        { name: 'Ventas Netas', value: globalStats.netClosed, fill: '#059669', percent: globalStats.netClosingRate }
    ], [globalStats]);

    // Datos por canal (cierres únicos por nombre)
    const channelData = useMemo(() => {
        const channelMap: Record<string, { leads: number; closedSet: Set<string> }> = {};

        filteredLeads.forEach(l => {
            const channel = l.procedencia || 'Otros';
            if (!channelMap[channel]) channelMap[channel] = { leads: 0, closedSet: new Set() };
            channelMap[channel].leads++;
            // Solo contar cierres únicos con closer válido
            if (isValidCloser(l.closer) && (l.cierre || matchesStatus(l.estado_lead, closureStatuses))) {
                const name = normalizeName(l.nombre_lead);
                if (name) channelMap[channel].closedSet.add(name);
            }
        });

        return Object.entries(channelMap)
            .map(([name, data]) => {
                const closed = data.closedSet.size;
                return {
                    name: name.length > 12 ? name.substring(0, 12) + '...' : name,
                    fullName: name,
                    leads: data.leads,
                    closed,
                    rate: data.leads > 0 ? ((closed / data.leads) * 100).toFixed(1) : '0'
                };
            })
            .sort((a, b) => b.leads - a.leads)
            .slice(0, 6);
    }, [filteredLeads]);

    // Tendencia semanal (cierres únicos por nombre)
    const weeklyTrend = useMemo(() => {
        const weekMap: Record<number, { leads: number; closedSet: Set<string> }> = {};

        filteredLeads.forEach(l => {
            if (!l.dia_agenda) return;
            const date = new Date(l.dia_agenda);
            const week = Math.ceil(date.getDate() / 7);
            if (!weekMap[week]) weekMap[week] = { leads: 0, closedSet: new Set() };
            weekMap[week].leads++;
            // Solo contar cierres únicos con closer válido
            if (isValidCloser(l.closer) && (l.cierre || matchesStatus(l.estado_lead, closureStatuses))) {
                const name = normalizeName(l.nombre_lead);
                if (name) weekMap[week].closedSet.add(name);
            }
        });

        return Object.entries(weekMap)
            .map(([week, data]) => ({
                week: `Sem ${week}`,
                leads: data.leads,
                closed: data.closedSet.size
            }))
            .sort((a, b) => parseInt(a.week.split(' ')[1]) - parseInt(b.week.split(' ')[1]));
    }, [filteredLeads]);

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-violet-500/30 rounded-full animate-spin border-t-violet-500"></div>
                        <Zap className="w-8 h-8 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="mt-6 text-violet-300 font-medium animate-pulse">Cargando Intelligence Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6 lg:p-8">
            <div className="max-w-[1800px] mx-auto space-y-6">

                {/* === HEADER EJECUTIVO === */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/25">
                            <Activity className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">
                                Sales Intelligence
                            </h1>
                            <p className="text-slate-400 font-medium">
                                Panel de Control · {monthNames[filterMonth]} {filterYear}
                            </p>
                        </div>
                    </div>

                    {/* Filtro de Periodo */}
                    <div className="flex items-center gap-3 bg-slate-800/50 backdrop-blur-sm p-2 rounded-2xl border border-slate-700/50">
                        <Calendar className="w-5 h-5 text-slate-400 ml-2" />
                        <select
                            value={filterMonth}
                            onChange={e => setFilterMonth(Number(e.target.value))}
                            className="bg-transparent text-white font-bold text-sm border-none focus:ring-0 cursor-pointer"
                        >
                            {monthNames.map((m, i) => <option key={i} value={i} className="bg-slate-800">{m}</option>)}
                        </select>
                        <select
                            value={filterYear}
                            onChange={e => setFilterYear(Number(e.target.value))}
                            className="bg-transparent text-white font-bold text-sm border-none focus:ring-0 cursor-pointer"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-slate-800">{y}</option>)}
                        </select>

                        <div className="w-px h-6 bg-slate-700 mx-1"></div>

                        <select
                            value={projectFilter}
                            onChange={e => setProjectFilter(e.target.value as any)}
                            className="bg-transparent text-white font-bold text-sm border-none focus:ring-0 cursor-pointer"
                        >
                            <option value="all" className="bg-slate-800">Todos</option>
                            <option value="PT" className="bg-slate-800">PT</option>
                            <option value="ME" className="bg-slate-800">ME</option>
                        </select>

                        <button
                            onClick={fetchLeads}
                            className="p-2 bg-violet-500/20 text-violet-400 rounded-xl hover:bg-violet-500/30 transition-colors"
                        >
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* === KPIs EJECUTIVOS === */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Total Leads */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
                        <div className="flex items-start justify-between">
                            <div className="p-3 bg-violet-500/20 rounded-xl">
                                <Users className="w-6 h-6 text-violet-400" />
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${globalStats.leadsTrend >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                }`}>
                                {globalStats.leadsTrend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(globalStats.leadsTrend).toFixed(0)}%
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-slate-400 text-sm font-medium">Leads Captados</p>
                            <p className="text-4xl font-black text-white mt-1">{globalStats.total}</p>
                        </div>
                    </div>

                    {/* Show Rate */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
                        <div className="flex items-start justify-between">
                            <div className="p-3 bg-cyan-500/20 rounded-xl">
                                <PhoneCall className="w-6 h-6 text-cyan-400" />
                            </div>
                            <span className="text-xs font-bold text-slate-500">{globalStats.presented} llamadas</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-slate-400 text-sm font-medium">Tasa de Show</p>
                            <p className="text-4xl font-black text-white mt-1">{globalStats.showRate.toFixed(1)}%</p>
                        </div>
                        <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-1000"
                                style={{ width: `${globalStats.showRate}%` }}
                            />
                        </div>
                    </div>

                    {/* Closing Rate (Gross) */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
                        <div className="flex items-start justify-between">
                            <div className="p-3 bg-indigo-500/20 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-indigo-400" />
                            </div>
                            <span className="text-xs font-bold text-slate-500">{globalStats.grossClosed} cierres</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-slate-400 text-sm font-medium">Cierre Bruto</p>
                            <p className="text-4xl font-black text-white mt-1">{globalStats.closingRate.toFixed(1)}%</p>
                        </div>
                    </div>

                    {/* Refunds */}
                    <div className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 p-6 rounded-3xl border border-rose-500/30 backdrop-blur-sm">
                        <div className="flex items-start justify-between">
                            <div className="p-3 bg-rose-500/20 rounded-xl">
                                <Activity className="w-6 h-6 text-rose-400" />
                            </div>
                            <span className="text-xs font-bold text-rose-400">{globalStats.refunded} devueltos</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-rose-300/80 text-sm font-medium">Devoluciones</p>
                            <p className="text-4xl font-black text-rose-400 mt-1">{globalStats.refunded}</p>
                        </div>
                    </div>

                    {/* Revenue (Net) */}
                    <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 p-6 rounded-3xl border border-emerald-500/30 backdrop-blur-sm">
                        <div className="flex items-start justify-between">
                            <div className="p-3 bg-emerald-500/20 rounded-xl">
                                <DollarSign className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${globalStats.revenueTrend >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                }`}>
                                {globalStats.revenueTrend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(globalStats.revenueTrend).toFixed(1)}%
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-emerald-300/80 text-sm font-medium">Facturación Neta</p>
                            <p className="text-3xl font-black text-emerald-400 mt-1">
                                {globalStats.revenue.toLocaleString('es-ES')}€
                            </p>
                        </div>
                    </div>
                </div>

                {/* === TABS DE NAVEGACIÓN === */}
                <div className="flex gap-2 bg-slate-800/30 p-1.5 rounded-2xl w-fit">
                    {[
                        { id: 'overview', label: 'Resumen', icon: BarChart3 },
                        { id: 'setters', label: 'Setters', icon: Calendar },
                        // Ocultar estas pestañas para setters
                        ...(!isSetter ? [
                            { id: 'closers', label: 'Closers', icon: PhoneCall },
                            { id: 'management', label: 'Gestión', icon: Database }
                        ] : [])
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id
                                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* === CONTENIDO POR TAB === */}

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Embudo de Conversión */}
                        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-700/50">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Layers className="w-5 h-5 text-violet-400" />
                                Embudo de Conversión
                            </h3>

                            <div className="space-y-4">
                                {funnelData.map((stage, i) => (
                                    <div key={i} className="relative">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-slate-300">{stage.name}</span>
                                            <span className="text-sm font-bold text-white">{stage.value}</span>
                                        </div>
                                        <div className="h-12 bg-slate-700/50 rounded-xl overflow-hidden relative">
                                            <div
                                                className="h-full rounded-xl transition-all duration-1000 flex items-center justify-end pr-4"
                                                style={{
                                                    width: `${(stage.value / funnelData[0].value) * 100}%`,
                                                    background: `linear-gradient(90deg, ${stage.fill}dd, ${stage.fill})`
                                                }}
                                            >
                                                {i > 0 && (
                                                    <span className="text-white font-bold text-sm">
                                                        {stage.percent.toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {i < funnelData.length - 1 && (
                                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                                                <ChevronRight className="w-5 h-5 text-slate-600 rotate-90" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Mini insight */}
                            <div className="mt-6 p-4 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                                <div className="flex items-center gap-2 text-violet-400 text-sm">
                                    <Zap className="w-4 h-4" />
                                    <span className="font-bold">Insight:</span>
                                    <span className="text-violet-300">
                                        De cada 100 leads, {globalStats.overallRate.toFixed(1)} se convierten en clientes
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Rendimiento por Canal */}
                        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-700/50">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <PieIcon className="w-5 h-5 text-cyan-400" />
                                Por Canal de Origen
                            </h3>

                            <div className="space-y-3">
                                {channelData.map((ch, i) => (
                                    <div key={i} className="group">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                                                {ch.name}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-500">{ch.leads} leads</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${parseFloat(ch.rate) >= 20 ? 'bg-emerald-500/20 text-emerald-400' :
                                                    parseFloat(ch.rate) >= 10 ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-slate-600/50 text-slate-400'
                                                    }`}>
                                                    {ch.rate}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-500 group-hover:opacity-100 opacity-80"
                                                style={{ width: `${(ch.leads / channelData[0].leads) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tendencia Semanal */}
                        <div className="lg:col-span-3 bg-slate-800/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-700/50">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                Evolución Semanal
                            </h3>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyTrend} barGap={8}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '12px',
                                                boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                                            }}
                                            labelStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
                                        />
                                        <Bar dataKey="leads" name="Leads" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="closed" name="Cerrados" fill="#10b981" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'setters' && (
                    <div className="space-y-6">
                        {/* Header Setters */}
                        <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 p-6 rounded-3xl border border-violet-500/30">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-violet-500/30 rounded-2xl">
                                    <Calendar className="w-8 h-8 text-violet-300" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Rendimiento Setters</h2>
                                    <p className="text-violet-300">Agendamiento y captación de leads · {setterStats.length} setters activos</p>
                                </div>
                            </div>
                        </div>

                        {/* Leaderboard Setters */}
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-slate-700/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700/50">
                                            <th className="text-left p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Ranking</th>
                                            <th className="text-left p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Setter</th>
                                            <th className="text-center p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Agendas</th>
                                            <th className="text-center p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Presentados</th>
                                            <th className="text-center p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Show Rate</th>
                                            <th className="text-center p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Calidad</th>
                                            <th className="text-center p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Tendencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/30">
                                        {setterStats.map((setter, i) => (
                                            <tr key={setter.name} className="hover:bg-slate-700/30 transition-colors group">
                                                <td className="p-5">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full"
                                                        style={{ backgroundColor: i < 3 ? `${MEDAL_COLORS[i]}20` : '#334155' }}>
                                                        {i < 3 ? (
                                                            <Trophy className="w-5 h-5" style={{ color: MEDAL_COLORS[i] }} />
                                                        ) : (
                                                            <span className="text-slate-400 font-bold">{i + 1}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                            {setter.name[0]}
                                                        </div>
                                                        <span className="font-bold text-white">{setter.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <span className="text-2xl font-black text-white">{setter.agendas}</span>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <span className="text-lg font-bold text-slate-300">{setter.presented}</span>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <div className="inline-flex items-center gap-2">
                                                        <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                                                                style={{ width: `${setter.showRate}%` }}
                                                            />
                                                        </div>
                                                        <span className={`font-bold ${setter.showRate >= 80 ? 'text-emerald-400' :
                                                            setter.showRate >= 60 ? 'text-amber-400' : 'text-rose-400'
                                                            }`}>
                                                            {setter.showRate.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${setter.qualityRate >= 30 ? 'bg-emerald-500/20 text-emerald-400' :
                                                        setter.qualityRate >= 20 ? 'bg-amber-500/20 text-amber-400' :
                                                            'bg-slate-600/50 text-slate-400'
                                                        }`}>
                                                        {setter.qualityRate.toFixed(0)}%
                                                    </span>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${setter.trend >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                                        }`}>
                                                        {setter.trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                        {Math.abs(setter.trend).toFixed(0)}%
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Insights Setters */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl">
                                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                    <Star className="w-5 h-5" />
                                    <span className="font-bold">Mejor Show Rate</span>
                                </div>
                                <p className="text-white font-bold text-lg">
                                    {setterStats.length > 0 ? [...setterStats].sort((a, b) => b.showRate - a.showRate)[0]?.name : '-'}
                                </p>
                                <p className="text-emerald-300 text-sm">
                                    {setterStats.length > 0 ? `${[...setterStats].sort((a, b) => b.showRate - a.showRate)[0]?.showRate.toFixed(0)}% de leads llegan a llamada` : ''}
                                </p>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl">
                                <div className="flex items-center gap-2 text-amber-400 mb-2">
                                    <Flame className="w-5 h-5" />
                                    <span className="font-bold">Más Productivo</span>
                                </div>
                                <p className="text-white font-bold text-lg">
                                    {setterStats.length > 0 ? setterStats[0]?.name : '-'}
                                </p>
                                <p className="text-amber-300 text-sm">
                                    {setterStats.length > 0 ? `${setterStats[0]?.agendas} agendas este mes` : ''}
                                </p>
                            </div>
                            <div className="bg-violet-500/10 border border-violet-500/30 p-5 rounded-2xl">
                                <div className="flex items-center gap-2 text-violet-400 mb-2">
                                    <Award className="w-5 h-5" />
                                    <span className="font-bold">Mejor Calidad</span>
                                </div>
                                <p className="text-white font-bold text-lg">
                                    {setterStats.length > 0 ? [...setterStats].sort((a, b) => b.qualityRate - a.qualityRate)[0]?.name : '-'}
                                </p>
                                <p className="text-violet-300 text-sm">
                                    {setterStats.length > 0 ? `${[...setterStats].sort((a, b) => b.qualityRate - a.qualityRate)[0]?.qualityRate.toFixed(0)}% de sus leads cierran` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'closers' && (
                    <div className="space-y-6">
                        {/* Header Closers */}
                        <div className="bg-gradient-to-r from-cyan-500/20 to-teal-500/20 p-6 rounded-3xl border border-cyan-500/30">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-cyan-500/30 rounded-2xl">
                                    <PhoneCall className="w-8 h-8 text-cyan-300" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Rendimiento Closers</h2>
                                    <p className="text-cyan-300">Conversión y cierre de ventas · {closerStats.length} closers activos</p>
                                </div>
                            </div>
                        </div>

                        {/* Leaderboard Closers */}
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-slate-700/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700/50">
                                            <th className="text-left p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Ranking</th>
                                            <th className="text-left p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Closer</th>
                                            <th className="text-center p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Llamadas</th>
                                            <th className="text-center p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Cierres</th>
                                            <th className="text-center p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Tasa Cierre</th>
                                            <th className="text-center p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Facturación</th>
                                            <th className="text-center p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Tendencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/30">
                                        {closerStats.map((closer, i) => (
                                            <tr key={closer.name} className="hover:bg-slate-700/30 transition-colors group">
                                                <td className="p-5">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full"
                                                        style={{ backgroundColor: i < 3 ? `${MEDAL_COLORS[i]}20` : '#334155' }}>
                                                        {i < 3 ? (
                                                            <Trophy className="w-5 h-5" style={{ color: MEDAL_COLORS[i] }} />
                                                        ) : (
                                                            <span className="text-slate-400 font-bold">{i + 1}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white font-bold">
                                                            {closer.name[0]}
                                                        </div>
                                                        <span className="font-bold text-white">{closer.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <span className="text-lg font-bold text-slate-300">{closer.calls}</span>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <span className="text-2xl font-black text-white">{closer.closed}</span>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <div className="inline-flex items-center gap-2">
                                                        <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"
                                                                style={{ width: `${Math.min(closer.closingRate * 2, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className={`font-bold ${closer.closingRate >= 35 ? 'text-emerald-400' :
                                                            closer.closingRate >= 25 ? 'text-amber-400' : 'text-rose-400'
                                                            }`}>
                                                            {closer.closingRate.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <span className="text-lg font-bold text-amber-400">
                                                        {closer.revenue.toLocaleString('es-ES')}€
                                                    </span>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${closer.trend >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                                        }`}>
                                                        {closer.trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                        {Math.abs(closer.trend).toFixed(0)}%
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Insights Closers */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl">
                                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                    <Target className="w-5 h-5" />
                                    <span className="font-bold">Mejor Tasa</span>
                                </div>
                                <p className="text-white font-bold text-lg">
                                    {closerStats.length > 0 ? [...closerStats].sort((a, b) => b.closingRate - a.closingRate)[0]?.name : '-'}
                                </p>
                                <p className="text-emerald-300 text-sm">
                                    {closerStats.length > 0 ? `${[...closerStats].sort((a, b) => b.closingRate - a.closingRate)[0]?.closingRate.toFixed(0)}% de cierre` : ''}
                                </p>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl">
                                <div className="flex items-center gap-2 text-amber-400 mb-2">
                                    <DollarSign className="w-5 h-5" />
                                    <span className="font-bold">Top Facturación</span>
                                </div>
                                <p className="text-white font-bold text-lg">
                                    {closerStats.length > 0 ? closerStats[0]?.name : '-'}
                                </p>
                                <p className="text-amber-300 text-sm">
                                    {closerStats.length > 0 ? `${closerStats[0]?.revenue.toLocaleString('es-ES')}€ generados` : ''}
                                </p>
                            </div>
                            <div className="bg-cyan-500/10 border border-cyan-500/30 p-5 rounded-2xl">
                                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                                    <Phone className="w-5 h-5" />
                                    <span className="font-bold">Más Llamadas</span>
                                </div>
                                <p className="text-white font-bold text-lg">
                                    {closerStats.length > 0 ? [...closerStats].sort((a, b) => b.calls - a.calls)[0]?.name : '-'}
                                </p>
                                <p className="text-cyan-300 text-sm">
                                    {closerStats.length > 0 ? `${[...closerStats].sort((a, b) => b.calls - a.calls)[0]?.calls} llamadas realizadas` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* === PESTAÑA GESTIÓN === */}
                {activeTab === 'management' && (
                    <LeadsManagement />
                )}

            </div>
        </div>
    );
};

export default SalesIntelligenceDashboard;
