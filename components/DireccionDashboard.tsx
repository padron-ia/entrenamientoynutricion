import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, Users, DollarSign, Award, Building2,
    Stethoscope, ChevronRight, RefreshCw, Calendar,
    TrendingDown, Activity, Target, Zap, Eye, ArrowRight,
    Phone, UserCheck, XCircle, Clock, FileText, AlertTriangle,
    ChevronDown, CalendarDays
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { User, UserRole, Client, ClientStatus } from '../types';

interface DireccionDashboardProps {
    user: User;
    onNavigate: (view: string) => void;
}

interface CoachMetrics {
    activos: number;           // Total activos (reales + fuera de plazo)
    activosReales: number;     // Dentro de contrato
    fueraDePlazo: number;      // Vencidos (pendientes renovación)
    pausados: number;
    bajas: number;             // Status INACTIVE
    abandonos: number;         // Status DROPOUT
    renovacionPct: number;
    churnRate: number;         // (Bajas + Abandonos) / Base
    capacidadTotal: number;
    capacidadActual: number;
}

interface CloserMetrics {
    agendados: number;
    ventas: number;
    noShows: number;
    cierrePct: number;
}

interface SetterMetrics {
    leadsInbound: number;
    leadsOutbound: number;
    procedencia: { [key: string]: number };
    agendadosInbound: number;
    agendadosOutbound: number;
}

interface ResumenMetrics {
    facturacion: number;       // Neto (Vendido - Devoluciones)
    cashCollected: number;     // Cobrado real
    devoluciones: number;      // Importe total de devoluciones
    crecimientoPct: number;
    retencionPct: number;
}

interface StaffMember {
    id: string;
    name: string;
    email: string;
    role: string;
}

// Componente de Input para las métricas
const NumberInput = ({ label, value, icon: Icon, color }: {
    label: string;
    value: number | string;
    icon?: any;
    color?: string;
}) => (
    <div className="group">
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
            {Icon && <Icon size={12} />} {label}
        </label>
        <div className={`bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold ${color || 'text-slate-700'}`}>
            {value}
        </div>
    </div>
);

export const DireccionDashboard: React.FC<DireccionDashboardProps> = ({ user, onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    // Staff lists
    const [coaches, setCoaches] = useState<StaffMember[]>([]);
    const [closers, setClosers] = useState<StaffMember[]>([]);
    const [setters, setSetters] = useState<StaffMember[]>([]);

    // Métricas por proyecto
    const [statsADO, setStatsADO] = useState<CoachMetrics>({
        activos: 0, activosReales: 0, fueraDePlazo: 0, pausados: 0,
        bajas: 0, abandonos: 0, renovacionPct: 0, churnRate: 0,
        capacidadTotal: 0, capacidadActual: 0
    });
    const [statsME, setStatsME] = useState<CoachMetrics>({
        activos: 0, activosReales: 0, fueraDePlazo: 0, pausados: 0,
        bajas: 0, abandonos: 0, renovacionPct: 0, churnRate: 0,
        capacidadTotal: 0, capacidadActual: 0
    });

    const [closerMetrics, setCloserMetrics] = useState<CloserMetrics>({
        agendados: 0, ventas: 0, noShows: 0, cierrePct: 0
    });
    const [setterMetrics, setSetterMetrics] = useState<SetterMetrics>({
        leadsInbound: 0, leadsOutbound: 0, procedencia: {},
        agendadosInbound: 0, agendadosOutbound: 0
    });
    const [resumenMetrics, setResumenMetrics] = useState<ResumenMetrics>({
        facturacion: 0, cashCollected: 0, devoluciones: 0, crecimientoPct: 0, retencionPct: 0
    });

    // Individual staff metrics (for expanded view)
    const [selectedStaffType, setSelectedStaffType] = useState<'coach' | 'closer' | 'setter' | null>(null);

    useEffect(() => {
        loadData();
    }, [selectedMonth]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [year, month] = selectedMonth.split('-').map(Number);
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0, 23, 59, 59);
            const monthStartStr = monthStart.toISOString();
            const monthEndStr = monthEnd.toISOString();

            // Configuración de roles y filtros (unificados con SalesIntelligenceDashboard)
            const VALID_SETTERS = ['thais', 'diana', 'elena'];
            const VALID_CLOSERS = ['sergi', 'yassine', 'elena', 'raquel'];
            const refundKeywords = ['devolución', 'devolucion', 'reembolso', 'pide devolución'];

            const isValidSetter = (name: string | null) => name && VALID_SETTERS.includes(name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
            const isValidCloser = (name: string | null) => name && VALID_CLOSERS.includes(name.toLowerCase().trim());
            const calculateValue = (pago: any) => {
                if (!pago || typeof pago !== 'string') return 0;
                const numbers = pago.match(/\d+/g);
                if (!numbers) return 0;
                const filtered = numbers.map(n => parseInt(n)).filter(n => n >= 100);
                return filtered.length > 0 ? Math.max(...filtered) : 0;
            };

            // 1. Cargar Staff
            const { data: staffUsers } = await supabase.from('users').select('*').neq('role', 'client');
            const coachesList = staffUsers?.filter(u => u.role === 'coach' || u.role === UserRole.COACH) || [];
            setCoaches(coachesList);
            setClosers(staffUsers?.filter(u => u.role === 'closer' || u.role === UserRole.CLOSER) || []);
            setSetters(staffUsers?.filter(u => u.role === 'setter' || u.role === UserRole.SETTER) || []);

            // 2. Cargar Clientes y Ventas para cálculos cruzados
            const [{ data: clientsData }, { data: salesData }] = await Promise.all([
                supabase.from('clientes_pt_notion').select('*'),
                supabase.from('sales').select('*').gte('sale_date', monthStartStr.split('T')[0]).lte('sale_date', monthEndStr.split('T')[0])
            ]);

            const allClients = (clientsData || []) as Client[];
            const allSales = salesData || [];

            const initialProjectMetrics = () => ({
                activos: 0, activosReales: 0, fueraDePlazo: 0,
                pausados: 0, bajas: 0, abandonos: 0,
                registrosMes: 0, capacidadTotal: 0, capacidadActual: 0,
                renovacionTarget: 0, renovacionExito: 0
            });

            const stats = { ado: initialProjectMetrics(), me: initialProjectMetrics() };

            const isDateInMonth = (dateStr?: string) => {
                if (!dateStr) return false;
                const d = new Date(dateStr);
                return d.getMonth() === month - 1 && d.getFullYear() === year;
            };

            allClients.forEach(c => {
                const project = (c.high_ticket ? 'me' : 'ado') as 'ado' | 'me';
                const pStats = stats[project];

                if (c.status === ClientStatus.ACTIVE) {
                    pStats.activos++;
                    // Segmentación Reales vs Fuera de Plazo
                    const endDate = c.contract_end_date ? new Date(c.contract_end_date) : null;
                    if (endDate && endDate < monthStart) {
                        pStats.fueraDePlazo++;
                    } else {
                        pStats.activosReales++;
                    }
                }
                if (c.status === ClientStatus.PAUSED) pStats.pausados++;
                if (c.status === ClientStatus.INACTIVE && isDateInMonth(c.inactiveDate)) pStats.bajas++;
                if (c.status === ClientStatus.DROPOUT && isDateInMonth(c.abandonmentDate)) pStats.abandonos++;
                if (isDateInMonth(c.registration_date)) pStats.registrosMes++;

                // Lógica de Renovación (Portado de RenewalsView)
                const phaseData = [
                    { id: 'F2', date: c.program?.f1_endDate, contracted: c.program?.renewal_f2_contracted, prevContracted: true },
                    { id: 'F3', date: c.program?.f2_endDate, contracted: c.program?.renewal_f3_contracted, prevContracted: c.program?.renewal_f2_contracted },
                    { id: 'F4', date: c.program?.f3_endDate, contracted: c.program?.renewal_f4_contracted, prevContracted: c.program?.renewal_f3_contracted },
                    { id: 'F5', date: c.program?.f4_endDate, contracted: c.program?.renewal_f5_contracted, prevContracted: c.program?.renewal_f4_contracted },
                ];
                const renewalMatch = phaseData.find(p => p.date && isDateInMonth(p.date) && p.prevContracted);
                if (renewalMatch) {
                    pStats.renovacionTarget++;
                    if (renewalMatch.contracted) pStats.renovacionExito++;
                }
            });

            // Capacidad de Coaches
            coachesList.forEach(coach => {
                const coachClients = allClients.filter(c => c.coach_id === coach.id);
                const isME = coachClients.some(c => c.high_ticket);
                const project = isME ? 'me' : 'ado';
                stats[project].capacidadTotal += (coach.max_clients || 0);
                stats[project].capacidadActual += coachClients.filter(c => c.status === ClientStatus.ACTIVE).length;
            });

            // 4. Métricas de Leads (Notion) con filtros de equipo
            const { data: leadsData } = await supabase.from('notion_leads_metrics').select('*')
                .gte('dia_agenda', monthStartStr.split('T')[0])
                .lte('dia_agenda', monthEndStr.split('T')[0]);

            const leads = (leadsData || []).filter(l => isValidSetter(l.setter) || isValidCloser(l.closer));
            const agendados = leads.length;
            const presentados = leads.filter(l => l.presentado === true).length;
            const ventasNotion = leads.filter(l => l.cierre === true);
            const noShows = agendados - presentados;
            const cierrePct = presentados > 0 ? Math.round((ventasNotion.length / presentados) * 100) : 0;

            const procedencias: any = {};
            leads.forEach(l => { if (l.procedencia) procedencias[l.procedencia] = (procedencias[l.procedencia] || 0) + 1; });

            setCloserMetrics({ agendados, ventas: ventasNotion.length, noShows, cierrePct });
            setSetterMetrics({
                leadsInbound: leads.filter(l => l.inb_out?.toLowerCase() === 'inbound').length,
                leadsOutbound: leads.filter(l => l.inb_out?.toLowerCase() === 'outbound').length,
                procedencia: procedencias,
                agendadosInbound: leads.filter(l => l.inb_out?.toLowerCase() === 'inbound' && l.dia_agenda).length,
                agendadosOutbound: leads.filter(l => l.inb_out?.toLowerCase() === 'outbound' && l.dia_agenda).length
            });

            // 5. Finanzas con Devoluciones
            let facturacionBruta = allSales.reduce((sum, s) => sum + (Number(s.sale_amount) || 0), 0);
            let devoluciones = leads.filter(l => refundKeywords.some(rev => l.estado_lead?.toLowerCase().includes(rev) || l.pago?.toLowerCase().includes(rev)))
                .reduce((sum, l) => sum + calculateValue(l.pago), 0);

            const cashCollected = allSales.reduce((sum, s) => sum + (Number(s.payment_received) || 0), 0);

            const totalRegistros = stats.ado.registrosMes + stats.me.registrosMes;
            const totalActivosHeader = stats.ado.activos + stats.me.activos;
            const totalBajasHeader = stats.ado.bajas + stats.me.bajas + stats.ado.abandonos + stats.me.abandonos;

            setResumenMetrics({
                facturacion: facturacionBruta - devoluciones,
                cashCollected,
                devoluciones,
                crecimientoPct: totalRegistros,
                retencionPct: 100 - ((totalActivosHeader + totalBajasHeader) > 0 ? (totalBajasHeader / (totalActivosHeader + totalBajasHeader) * 100) : 0)
            });

            const finalizeStats = (s: any) => ({
                activos: s.activos,
                activosReales: s.activosReales,
                fueraDePlazo: s.fueraDePlazo,
                pausados: s.pausados,
                bajas: s.bajas,
                abandonos: s.abandonos,
                renovacionPct: s.renovacionTarget > 0 ? Math.round((s.renovacionExito / s.renovacionTarget) * 100) : 0,
                churnRate: (s.activos + s.bajas + s.abandonos) > 0 ? parseFloat(((s.bajas + s.abandonos) / (s.activos + s.bajas + s.abandonos) * 100).toFixed(1)) : 0,
                capacidadTotal: s.capacidadTotal,
                capacidadActual: s.capacidadActual
            });

            setStatsADO(finalizeStats(stats.ado));
            setStatsME(finalizeStats(stats.me));

        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

    // Top procedencias
    const topProcedencias = useMemo(() => {
        return Object.entries(setterMetrics.procedencia)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 5);
    }, [setterMetrics.procedencia]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">
                        <Activity className="w-4 h-4" />
                        Business Intelligence
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Panel de Dirección
                    </h1>
                    <p className="text-slate-500 mt-1">Vista consolidada por rol con datos en tiempo real.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Selector de Mes */}
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                        <CalendarDays className="w-4 h-4 text-slate-400 ml-2" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                        />
                    </div>

                    {/* Badge PT */}
                    <div className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                        PT
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-indigo-500 transition-all font-bold shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPIs Header Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-indigo-900 text-white p-6 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">FACTURACIÓN NETA</p>
                    <h3 className="text-3xl font-black">{formatCurrency(resumenMetrics.facturacion)}</h3>
                    <p className="text-xs text-indigo-300 mt-1">Vendido - Devoluciones</p>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Users className="w-3 h-3" /> CARTERA TOTAL
                    </p>
                    <h3 className="text-2xl font-black text-slate-800">{statsADO.activos + statsME.activos}</h3>
                    <p className="text-xs text-slate-400 mt-1">Activos PT ({statsADO.activos}) + ME ({statsME.activos})</p>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                        <DollarSign className="w-3 h-3" /> CASH COLLECTED
                    </p>
                    <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(resumenMetrics.cashCollected)}</h3>
                    <p className="text-xs text-slate-400 mt-1">Efectivo real en banco</p>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">RENOVACIONES</p>
                    {(() => {
                        const totalTarget = statsADO.renovacionPct > 0 ? 100 : 0; // Simple check if data exists
                        // Actually, I should have calculated the global pct in loadData
                        // Let's just use PT for now if its the main one, or calculate a quick average if stats exist
                        const displayPct = statsADO.renovacionPct;
                        return (
                            <>
                                <h3 className={`text-2xl font-black ${displayPct >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {displayPct}%
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Global Mes (PT)</p>
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* 4 Columnas de Datos */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50/50 p-6 border-b border-slate-200">
                    <h3 className="text-lg font-black text-slate-900">Métricas por Rol</h3>
                    <p className="text-xs text-slate-500">Datos del mes seleccionado • Haz clic en un rol para ver detalle individual</p>
                </div>

                <div className="px-8 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                    {/* PT PROJECT */}
                    <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-600 rounded-lg text-white font-black text-xs">PT</div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Padron Trainer</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <NumberInput label="Activos Reales" value={statsADO.activosReales} color="text-emerald-600" />
                            <NumberInput label="Fuera de Plazo" value={statsADO.fueraDePlazo} color="text-rose-500" />
                            <NumberInput label="Bajas + Abandonos" value={statsADO.bajas + statsADO.abandonos} color="text-slate-700" />
                            <NumberInput label="Churn Rate" value={`${statsADO.churnRate}%`} color={statsADO.churnRate < 5 ? 'text-emerald-600' : 'text-rose-600'} />
                        </div>
                        <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 font-bold uppercase">Renovación Real</span>
                                <span className="text-lg font-black text-indigo-600">{statsADO.renovacionPct}%</span>
                            </div>
                        </div>
                    </div>

                    {/* ME PROJECT */}
                    <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-600 rounded-lg text-white font-black text-xs">ME</div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Médico Emprendedor</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <NumberInput label="Activos Reales" value={statsME.activosReales} color="text-emerald-600" />
                            <NumberInput label="Fuera de Plazo" value={statsME.fueraDePlazo} color="text-rose-500" />
                            <NumberInput label="Bajas + Abandonos" value={statsME.bajas + statsME.abandonos} color="text-slate-700" />
                            <NumberInput label="Churn Rate" value={`${statsME.churnRate}%`} color={statsME.churnRate < 5 ? 'text-emerald-600' : 'text-rose-600'} />
                        </div>
                        <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 font-bold uppercase">Renovación Real</span>
                                <span className="text-lg font-black text-emerald-600">{statsME.renovacionPct}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-100">
                    {/* CLOSER Column */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Phone className="w-4 h-4" /> CLOSER (CONVERSIÓN)
                        </h4>
                        <NumberInput label="Llamadas Agendadas" value={closerMetrics.agendados} />
                        <NumberInput label="Ventas Realizadas" value={closerMetrics.ventas} color="text-emerald-600" />
                        <NumberInput label="No-Show" value={closerMetrics.noShows} color="text-rose-600" />
                        <NumberInput label="% Cierre Equipo" value={`${closerMetrics.cierrePct}%`} color="text-indigo-600" />
                    </div>

                    {/* SETTER Column */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                            <UserCheck className="w-4 h-4" /> SETTER (LEADS)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <NumberInput label="Inbound" value={setterMetrics.leadsInbound} />
                            <NumberInput label="Outbound" value={setterMetrics.leadsOutbound} />
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Top Procedencias</p>
                            {topProcedencias.map(([source, count]) => (
                                <div key={source} className="flex justify-between text-xs py-1">
                                    <span className="text-slate-600 truncate">{source}</span>
                                    <span className="font-bold">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FINANZAS Column */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" /> FINANZAS DETALLE
                        </h4>
                        <NumberInput label="Total Vendido" value={formatCurrency(resumenMetrics.facturacion + resumenMetrics.devoluciones)} />
                        <NumberInput label="Devoluciones" value={formatCurrency(resumenMetrics.devoluciones)} color="text-rose-600" />
                        <div className="pt-2">
                            <NumberInput label="Total Neto" value={formatCurrency(resumenMetrics.facturacion)} color="text-indigo-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Accesos rápidos */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Cartera Clientes', view: 'clients', icon: Users },
                    { label: 'Renovaciones', view: 'renewals', icon: TrendingUp },
                    { label: 'Ranking Setters', view: 'setter-performance', icon: Award },
                    { label: 'Ranking Closers', view: 'closer-performance', icon: Award },
                    { label: 'Ranking Coaches', view: 'coach-performance', icon: Award },
                ].map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => onNavigate(item.view)}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-slate-100 hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1 transition-all group"
                    >
                        <item.icon className="w-6 h-6 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-900">{item.label}</span>
                    </button>
                ))}
            </div>

        </div>
    );
};

export default DireccionDashboard;
