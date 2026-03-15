
import React, { useMemo, useState } from 'react';
import { Client, ClientStatus, User, UserRole } from '../types';
import {
    TrendingUp, TrendingDown, Users, DollarSign,
    Target, Activity, AlertCircle, Calendar,
    ChevronRight, Award, Zap, ShieldAlert, Clock, Bell,
    Eye, X, CheckCircle2, AlertTriangle, Loader2, Rocket
} from 'lucide-react';
import { CreateAnnouncement } from './MassCommunication';
import { StaffPerformance } from './StaffPerformance';
import { RiskAlertsPanel } from './RiskAlertsPanel';
import { riskAlertService } from '../services/riskAlertService';

interface ExecutiveDashboardProps {
    clients: Client[];
    user: User;
    onNavigateToView: (view: any) => void;
    onNavigateToClient?: (client: Client) => void;
    coaches: User[];
    onRefreshData?: () => void;
}

const MetricBox = ({ label, value, color, onClick }: { label: string; value: number | string; color: string; onClick?: () => void }) => (
    <div
        onClick={onClick}
        className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:border-blue-200 group' : ''}`}
    >
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors">{label}</p>
        <div className="flex items-center justify-between">
            <p className={`text-2xl font-black text-${color}-600`}>{value}</p>
            {onClick && <Eye className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />}
        </div>
    </div>
);

const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ clients, user, onNavigateToView, onNavigateToClient, coaches, onRefreshData }) => {
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
    const [drillDown, setDrillDown] = useState<{ title: string; clients: Client[] } | null>(null);
    const [predefinedAnnouncementSettings, setPredefinedAnnouncementSettings] = useState<{
        coach?: string;
        channel?: string;
        title?: string;
        body?: string;
        target?: 'all_active' | 'my_clients' | 'all_team';
    } | null>(null);
    const [isProcessingAlerts, setIsProcessingAlerts] = useState(false);

    const handleAutomateAlerts = async (pendingClients: Client[]) => {
        if (!confirm(`¿Deseas generar alertas de riesgo semanales para ${pendingClients.length} alumnos que no han enviado su check-in antes del Martes? \n\nEsto también incrementará su contador de "Strikes" (Contador de revisiones fallidas).`)) return;

        setIsProcessingAlerts(true);
        try {
            for (const client of pendingClients) {
                // 1. Create the alert
                await riskAlertService.automateNoCheckinAlert(client.id, client.coach_id);
                // 2. Increment strikes
                await riskAlertService.incrementMissedCheckins(client.id);
            }
            alert('Proceso completado. Se han generado las alertas y actualizado los contadores.');
            onRefreshData?.();
        } catch (error) {
            console.error('Error automating alerts:', error);
            alert('Hubo un error al procesar algunas alertas.');
        } finally {
            setIsProcessingAlerts(false);
        }
    };

    const handleFridayReminder = () => {
        setPredefinedAnnouncementSettings({
            title: '📅 ¡Viernes de Check-in! 📋',
            body: '¡Hola! Recuerda que hoy es viernes y es el momento de enviar tu revisión semanal. \n\nTu coach está esperando tus datos para planificar la próxima semana y enviarte tu video de feedback. ¡No lo dejes para mañana! 💪',
            target: 'all_active',
            channel: 'telegram'
        });
        setShowAnnouncementModal(true);
    };

    // Date reference for drill-down filters
    const now = new Date();

    const getCoachDisplayName = (idOrName: string | null | undefined): string => {
        if (!idOrName || idOrName === 'Sin Asignar') return 'Sin Asignar';

        // If it's already a name (not a UUID), return it
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName);
        if (!isUUID) return idOrName;

        const coach = coaches.find(u => u.id === idOrName);
        if (coach) return coach.name;

        const coachNameMap: Record<string, string> = {
            'dec087e2-3bf5-43c7-8561-d22c049948db': 'Jesús',
            '0cfcb072-ae4c-4b33-a96d-f3aa8b5aeb62': 'Helena',
            '5d5bbbed-cbc0-495c-ac6f-3e56bf5ffe54': 'Álvaro',
            'e59de5e3-f962-48be-8392-04d9d59ba87d': 'Esperanza',
            'a2911cd6-e5c0-4fd3-8047-9f7f003e1d28': 'Juan',
            '19657835-6fb4-4783-9b37-1be1d556c42d': 'Victoria'
        };
        return coachNameMap[idOrName] || idOrName;
    };

    const metrics = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Snapshot: Who is active TODAY? (Direct Count)
        const activeClientsList = clients.filter(c => c.status === ClientStatus.ACTIVE || c.status === ClientStatus.PAUSED);

        const activeOnlyCount = clients.filter(c => c.status === ClientStatus.ACTIVE).length;
        const pausedOnlyCount = clients.filter(c => c.status === ClientStatus.PAUSED).length;
        const activeAtEnd = activeClientsList.length; // Total (Active + Paused)

        // 2. Movements during the month
        const newSignups = clients.filter(c => {
            const startStr = c.start_date || c.registration_date;
            if (!startStr) return false;
            const d = new Date(startStr);
            return d >= startOfMonth;
        }).length;

        // Unified "Lost" count (Inactives + Dropouts that left this month)
        const monthlyLost = clients.filter(c => {
            const isGone = c.status === ClientStatus.INACTIVE || c.status === ClientStatus.DROPOUT;
            if (!isGone) return false;
            const leaveDateStr = c.abandonmentDate || c.inactiveDate;
            if (!leaveDateStr) return false;
            const d = new Date(leaveDateStr);
            return d >= startOfMonth;
        }).length;

        const monthlyPauses = clients.filter(c => {
            if (c.status !== ClientStatus.PAUSED || !c.pauseDate) return false;
            const d = new Date(c.pauseDate);
            return d >= startOfMonth;
        }).length;

        // 3. Calculate "Active at Start" to maintain consistency: End - New + Lost + Pauses
        // This ensures: Start + New - Lost - Pauses = End
        const activeAtStartCount = activeAtEnd - newSignups + monthlyLost + monthlyPauses;
        const netGrowth = activeAtStartCount > 0 ? ((activeAtEnd - activeAtStartCount) / activeAtStartCount) * 100 : 0;

        // 3. Funnel data - Focused on Renewal Cycles (Maturity)
        const funnelData = [
            {
                name: 'Ciclo Inicial (F1)',
                value: activeClientsList.filter(c => !c.program?.renewal_f2_contracted).length,
                avgDur: Math.round(activeClientsList.filter(c => !c.program?.renewal_f2_contracted).reduce((acc, c) => acc + (c.program_duration_months || 6), 0) / (activeClientsList.filter(c => !c.program?.renewal_f2_contracted).length || 1)),
                fill: '#3b82f6'
            },
            {
                name: '1ª Renovación (F2)',
                value: activeClientsList.filter(c => c.program?.renewal_f2_contracted && !c.program?.renewal_f3_contracted).length,
                avgDur: Math.round(activeClientsList.filter(c => c.program?.renewal_f2_contracted && !c.program?.renewal_f3_contracted).reduce((acc, c) => acc + (c.program?.f2_duration || 3), 0) / (activeClientsList.filter(c => c.program?.renewal_f2_contracted && !c.program?.renewal_f3_contracted).length || 1)),
                fill: '#6366f1'
            },
            {
                name: '2ª Renovación (F3)',
                value: activeClientsList.filter(c => c.program?.renewal_f3_contracted && !c.program?.renewal_f4_contracted).length,
                avgDur: Math.round(activeClientsList.filter(c => c.program?.renewal_f3_contracted && !c.program?.renewal_f4_contracted).reduce((acc, c) => acc + (c.program?.f3_duration || 3), 0) / (activeClientsList.filter(c => c.program?.renewal_f3_contracted && !c.program?.renewal_f4_contracted).length || 1)),
                fill: '#8b5cf6'
            },
            {
                name: '3ª Renovación (F4)',
                value: activeClientsList.filter(c => c.program?.renewal_f4_contracted && !c.program?.renewal_f5_contracted).length,
                avgDur: Math.round(activeClientsList.filter(c => c.program?.renewal_f4_contracted && !c.program?.renewal_f5_contracted).reduce((acc, c) => acc + (c.program?.f4_duration || 3), 0) / (activeClientsList.filter(c => c.program?.renewal_f4_contracted && !c.program?.renewal_f5_contracted).length || 1)),
                fill: '#a855f7'
            },
            {
                name: 'Fidelidad (F5+)',
                value: activeClientsList.filter(c => c.program?.renewal_f5_contracted).length,
                avgDur: Math.round(activeClientsList.filter(c => c.program?.renewal_f5_contracted).reduce((acc, c) => acc + (c.program?.f5_duration || 3), 0) / (activeClientsList.filter(c => c.program?.renewal_f5_contracted).length || 1)),
                fill: '#d946ef'
            },
        ];

        // Capacity distribution - Dynamic based on active coaches in the list
        const activeClientsListForStats = clients.filter(c => c.status === ClientStatus.ACTIVE || c.status === ClientStatus.PAUSED);

        // Group by coach name
        const statsByCoach: Record<string, { value: number; loyalCount: number }> = {};

        activeClientsListForStats.forEach(c => {
            const coachName = getCoachDisplayName(c.property_coach || c.coach_id);
            if (!statsByCoach[coachName]) {
                statsByCoach[coachName] = { value: 0, loyalCount: 0 };
            }
            statsByCoach[coachName].value++;
            if (c.program?.renewal_f2_contracted) {
                statsByCoach[coachName].loyalCount++;
            }
        });

        const coachStats = Object.entries(statsByCoach)
            .filter(([name]) => name !== 'Sin Asignar')
            .map(([name, stats]) => ({
                name,
                value: stats.value,
                loyaltyRatio: stats.value > 0 ? Math.round((stats.loyalCount / stats.value) * 100) : 0
            }))
            .sort((a, b) => b.value - a.value);

        if (statsByCoach['Sin Asignar']) {
            coachStats.push({
                name: 'Sin Asignar',
                value: statsByCoach['Sin Asignar'].value,
                loyaltyRatio: 0
            });
        }


        // 4. Historical Metrics (Last 6 months)
        const historicalMonths = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth();
            const y = d.getFullYear();
            const label = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

            const isSameMonth = (dateStr?: string) => {
                if (!dateStr) return false;
                const dt = new Date(dateStr);
                return dt.getMonth() === m && dt.getFullYear() === y;
            };

            const coachFilter = (c: Client) => !selectedCoach || getCoachDisplayName(c.property_coach || c.coach_id) === selectedCoach;
            const relevantForHist = clients.filter(coachFilter);

            let hSignups, hLost, hPauses, hActiveEnd, hActiveStart;

            if (i === 0) {
                // CURRENT MONTH: Use pre-calculated "truth" from top
                hSignups = newSignups;
                hLost = monthlyLost;
                hPauses = monthlyPauses;
                hActiveEnd = activeAtEnd;
                hActiveStart = activeAtStartCount;
            } else {
                // PAST MONTHS: Apply unified logic
                hSignups = relevantForHist.filter(c => isSameMonth(c.start_date || c.registration_date || c.created_at)).length;
                hLost = relevantForHist.filter(c => {
                    const isGone = c.status === ClientStatus.INACTIVE || c.status === ClientStatus.DROPOUT;
                    if (!isGone) return false;
                    const leaveDateStr = c.abandonmentDate || c.inactiveDate;
                    return isSameMonth(leaveDateStr);
                }).length;
                hPauses = relevantForHist.filter(c => {
                    return c.status === ClientStatus.PAUSED && isSameMonth(c.pauseDate);
                }).length;

                // For historical snapshots, since we don't have full history, we estimate start from end
                // or vice-versa. To maintain visual logic:
                // End = Start + Signups - Lost - Pauses
                // We'll calculate end state based on status dates if possible, or just work backwards if it's recent.
                hActiveEnd = relevantForHist.filter(c => {
                    const startStr = c.start_date || c.registration_date || c.created_at;
                    if (!startStr) return false;
                    const startDay = new Date(startStr);
                    const endOfM = new Date(y, m + 1, 0);
                    if (startDay > endOfM) return false; // Started after this month

                    const leaveStr = c.abandonmentDate || c.inactiveDate || c.pauseDate;
                    if (!leaveStr) return c.status === ClientStatus.ACTIVE || c.status === ClientStatus.PAUSED;

                    const leaveDay = new Date(leaveStr);
                    return leaveDay > endOfM; // Left after this month
                }).length;

                hActiveStart = hActiveEnd - hSignups + hLost + hPauses;
            }

            let rTarget = 0;
            let rDone = 0;
            relevantForHist.forEach(c => {
                if (!c.program) return;
                const startOfNextM = new Date(y, m + 1, 1);

                const check = (date: string | undefined, done: boolean | undefined) => {
                    if (isSameMonth(date)) {
                        rTarget++;
                        if (done) rDone++;
                        return true;
                    }
                    return false;
                };
                check(c.program.f1_endDate, c.program.renewal_f2_contracted);
                check(c.program.f2_endDate, c.program.renewal_f3_contracted);
                check(c.program.f3_endDate, c.program.renewal_f4_contracted);
                check(c.program.f4_endDate, c.program.renewal_f5_contracted);
            });

            historicalMonths.push({
                label: label.charAt(0).toUpperCase() + label.slice(1),
                activeAtStart: hActiveStart,
                activeAtEnd: hActiveEnd,
                signups: hSignups,
                churn: hLost + hPauses, // Combined departures for the table
                renewals: { target: rTarget, done: rDone, rate: rTarget > 0 ? Math.round((rDone / rTarget) * 100) : 100 },
                key: `${y}-${m}`
            });
        }

        return {
            activeAtStart: activeAtStartCount,
            newSignups,
            monthlyLost,
            monthlyPauses,
            activeAtEnd,
            activeOnly: activeOnlyCount,
            pausedOnly: pausedOnlyCount,
            netGrowth,
            funnelData,
            coachStats,
            historicalMetrics: historicalMonths,
            alerts: {
                expired: clients.filter(c => c.status === ClientStatus.ACTIVE && c.contract_end_date && c.contract_end_date < new Date().toISOString().split('T')[0]).length,
            }
        };
    }, [clients, selectedCoach]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">

            {/* --- CEO HEADER --- */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-8">
                <div>
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-[10px] uppercase tracking-[3px] mb-2">
                        <ShieldAlert className="w-4 h-4" />
                        CONTROL ESTRATÉGICO
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">
                        Visión <span className="text-blue-600">Global</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-3 text-lg">Estado de la salud operativa y financiera del negocio.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleFridayReminder}
                        className="px-6 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl hover:shadow-2xl transition-all flex items-center gap-3 hover:scale-105 active:scale-95 border border-white/20"
                    >
                        <Calendar className="w-5 h-5" />
                        <span>RECORDATORIO VIERNES</span>
                    </button>

                    <button
                        onClick={() => setShowAnnouncementModal(true)}
                        className="px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl hover:shadow-2xl transition-all flex items-center gap-3 hover:scale-105 active:scale-95 border border-white/20"
                    >
                        <Bell className="w-5 h-5" />
                        <span>NUEVO ANUNCIO</span>
                    </button>

                    <div className="bg-white p-4 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-4 transition-all hover:scale-105">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividad CRM</p>
                            <p className="text-lg font-black text-slate-800">TIEMPO REAL</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CEO SNAPSHOT (CRECIMIENTO NETO) --- */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden relative group transition-all hover:shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-32 h-32 text-blue-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">Snapshot Mes en Curso (Actual)</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Flujo de activos: Inicio vs Final de mes</p>
                        </div>
                        <div className={`px-4 py-2 rounded-2xl font-black text-sm flex items-center gap-2 ${metrics.netGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {metrics.netGrowth >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                            {metrics.netGrowth >= 0 ? '+' : ''}{metrics.netGrowth.toFixed(1)}% CRECIMIENTO
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <MetricBox
                            label="Activos Inicio"
                            value={metrics.activeAtStart}
                            color="slate"
                            onClick={() => setDrillDown({
                                title: "Activos al Inicio de Mes", clients: clients.filter(c => {
                                    const startStr = c.start_date || c.registration_date || c.created_at;
                                    if (!startStr) return false;
                                    const startDay = new Date(startStr);
                                    const startOfM = new Date(now.getFullYear(), now.getMonth(), 1);
                                    if (startDay >= startOfM) return false;
                                    const leaveStr = c.abandonmentDate || c.inactiveDate || c.pauseDate;
                                    if (!leaveStr) return true;
                                    return new Date(leaveStr) >= startOfM;
                                })
                            })}
                        />
                        <MetricBox
                            label="+ Nuevas Altas"
                            value={metrics.newSignups}
                            color="emerald"
                            onClick={() => setDrillDown({
                                title: "Nuevas Altas del Mes", clients: clients.filter(c => {
                                    const startStr = c.start_date || c.registration_date || c.created_at;
                                    if (!startStr) return false;
                                    const dt = new Date(startStr);
                                    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
                                })
                            })}
                        />
                        <MetricBox
                            label="- Salidas (Baja/Abandono)"
                            value={metrics.monthlyLost}
                            color="rose"
                            onClick={() => setDrillDown({
                                title: "Bajas del Mes", clients: clients.filter(c => {
                                    const leaveStr = c.abandonmentDate || c.inactiveDate;
                                    if (!leaveStr) return false;
                                    const dt = new Date(leaveStr);
                                    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
                                })
                            })}
                        />
                        <MetricBox
                            label="- Pausas Mes"
                            value={metrics.monthlyPauses}
                            color="amber"
                            onClick={() => setDrillDown({
                                title: "Pausas del Mes", clients: clients.filter(c => {
                                    if (c.status !== ClientStatus.PAUSED || !c.pauseDate) return false;
                                    const dt = new Date(c.pauseDate);
                                    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
                                })
                            })}
                        />
                        <div className="md:col-span-2 grid grid-cols-2 gap-2 bg-slate-50/50 p-2 rounded-[2rem] border border-slate-100 shadow-inner">
                            <MetricBox
                                label="Activos Reales"
                                value={metrics.activeOnly}
                                color="indigo"
                                onClick={() => setDrillDown({ title: "Clientes Activos (Sin Pausas)", clients: clients.filter(c => c.status === ClientStatus.ACTIVE) })}
                            />
                            <MetricBox
                                label="Pausados"
                                value={metrics.pausedOnly}
                                color="amber"
                                onClick={() => setDrillDown({ title: "Clientes Pausados", clients: clients.filter(c => c.status === ClientStatus.PAUSED) })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- HISTÓRICO DESGLOSADO --- */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden relative">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900">Histórico de Crecimiento Real</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Evolución de activos desglosada por meses</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#0f172a] text-white font-bold text-[10px] uppercase tracking-[2px]">
                            <tr>
                                <th className="px-6 py-5 rounded-tl-2xl">Periodo</th>
                                <th className="px-6 py-5 text-center">Stock Inicial</th>
                                <th className="px-6 py-5 text-center">Nuevas Altas</th>
                                <th className="px-6 py-5 text-center">Bajas Totales</th>
                                <th className="px-6 py-5 text-center">Stock Final / Actual</th>
                                <th className="px-6 py-5 text-right rounded-tr-2xl">% Crecimiento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 border-x border-b border-slate-100 rounded-b-2xl">
                            {metrics.historicalMetrics.map((m: any, idx: number) => {
                                const growth = m.activeAtStart > 0 ? ((m.activeAtEnd - m.activeAtStart) / m.activeAtStart) * 100 : 0;
                                return (
                                    <tr key={m.key} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-black text-slate-800 capitalize italic">{m.label}</td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-500">{m.activeAtStart}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg font-black text-xs">+{m.signups}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-rose-50 text-rose-500 px-3 py-1 rounded-lg font-black text-xs">-{m.churn}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-black text-[#0f172a] text-lg">{m.activeAtEnd}</span>
                                                {idx === 0 && <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">Estado Actual</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`inline-flex items-center gap-1 font-black px-3 py-1 rounded-xl ${growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- RADAR DE RETENCIÓN & CAPACIDAD --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col h-full relative overflow-hidden">
                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                <Target className="w-6 h-6 text-blue-500" />
                                Situación por Ciclo de Vida
                            </h3>
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">Distribución Real por Fases (Sin Acumulado)</p>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[350px] flex flex-col relative z-10">
                        <div className="space-y-6">
                            {metrics.funnelData.map((phase, idx) => {
                                const totalActive = metrics.funnelData.reduce((acc: number, p: any) => acc + p.value, 0);
                                const percentage = Math.round((phase.value / (totalActive || 1)) * 100);
                                return (
                                    <div key={idx} className="group cursor-pointer">
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors">{phase.name}</span>
                                                <span className="text-[10px] text-slate-400 font-bold italic">Duración Media: {phase.avgDur} meses</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-black text-slate-900">{phase.value} <span className="text-slate-400">clientes</span></span>
                                                <span className="block text-[10px] font-black text-blue-500">{percentage}% del total</span>
                                            </div>
                                        </div>
                                        <div className="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5 shadow-inner">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000 ease-out shadow-lg"
                                                style={{ width: `${percentage}%`, backgroundColor: phase.fill }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-auto pt-10 flex items-center gap-3 text-xs text-slate-500 font-medium bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                <Zap className="w-4 h-4 animate-pulse" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-700">Contabilidad Elite:</p>
                                <p className="text-[11px] leading-relaxed">Las comisiones (10%) se calculan sobre el <strong>neto</strong> (tras descontar comisiones de pasarela). Cada ciclo F2-F5 es una nueva oportunidad de venta para el Coach.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col h-full relative overflow-hidden">
                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                < Award className="w-6 h-6 text-amber-500" />
                                Desempeño del Staff
                            </h3>
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">Liderazgo y calidad de fidelización</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onNavigateToView('coach-performance')}
                                className="text-[10px] font-black text-purple-600 hover:text-white hover:bg-purple-600 border-2 border-purple-600 bg-white px-4 py-2 rounded-2xl transition-all shadow-lg"
                            >
                                RENDIMIENTO
                            </button>
                            <button
                                onClick={() => onNavigateToView('coach-capacity')}
                                className="text-[10px] font-black text-blue-600 hover:text-white hover:bg-blue-600 border-2 border-blue-600 bg-white px-4 py-2 rounded-2xl transition-all shadow-lg"
                            >
                                CAPACIDAD
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-8 relative z-10">
                        {metrics.coachStats.map((coach, idx) => (
                            <div key={idx} className="flex items-center gap-6 group">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-[#0f172a] group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-sm">
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 text-base">{coach.name}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{coach.value} Alumnos Activos</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-right">
                                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                                {coach.loyaltyRatio}% Éxito Renov.
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPredefinedAnnouncementSettings({ coach: coach.name });
                                                    setShowAnnouncementModal(true);
                                                }}
                                                title={`Comunicar a clientes de ${coach.name}`}
                                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                            >
                                                <Bell size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100">
                                        <div
                                            className="h-full bg-gradient-to-r from-slate-400 to-slate-500 group-hover:from-blue-500 group-hover:to-blue-600 transition-all duration-500 rounded-full"
                                            style={{ width: `${(coach.loyaltyRatio)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {metrics.coachStats.length === 0 && (
                            <p className="text-slate-400 italic text-sm text-center py-10 font-medium">No hay datos de coaches todavía registrados.</p>
                        )}
                        {/* === GLOBAL TELEGRAM BROADCAST BUTTON (ADMIN ONLY) === */}
                        {(user.role === 'admin' || user.role === 'head_coach') && (
                            <button
                                onClick={() => {
                                    setPredefinedAnnouncementSettings({ coach: undefined });
                                    setShowAnnouncementModal(true);
                                }}
                                className="w-full mt-4 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
                            >
                                <Bell size={18} />
                                Comunicar a Todos los Activos
                            </button>
                        )}
                    </div>
                    <p className="mt-8 text-[11px] text-slate-400 font-medium text-center border-t border-slate-50 pt-6">
                        * Solo mostramos alumnos <strong>Activos/Pausa</strong>. Los coaches no ven el total histórico para evitar ruido visual.
                    </p>
                </div>

                {/* --- WEEKLY REVIEW COMPLIANCE (NEW) --- */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col h-full relative overflow-hidden">
                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                <Clock className="w-6 h-6 text-rose-500" />
                                Control de Revisiones
                            </h3>
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">Clientes sin check-in (Límite: Martes)</p>
                        </div>
                        {(() => {
                            const today = new Date();
                            const day = today.getDay();
                            const isLateWindow = day >= 2 || day === 0; // Martes a Domingo
                            return (
                                <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${isLateWindow ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {isLateWindow ? '⚠️ Período Crítico' : '⏳ En Plazo'}
                                </div>
                            );
                        })()}
                    </div>

                    <div className="flex-1 min-h-[400px] space-y-4 relative z-10 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                        {(() => {
                            const now = new Date();
                            const day = now.getDay();
                            // Último viernes
                            const daysSinceFriday = (day + 2) % 7;
                            const lastFriday = new Date(now);
                            lastFriday.setDate(now.getDate() - daysSinceFriday);
                            lastFriday.setHours(0, 0, 0, 0);

                            const pendingClients = clients
                                .filter(c => c.status === ClientStatus.ACTIVE)
                                .filter(c => {
                                    if (!c.last_checkin_submitted) return true;
                                    const lastSubmission = new Date(c.last_checkin_submitted);
                                    return lastSubmission < lastFriday;
                                })
                                .sort((a, b) => (a.coach_id || '').localeCompare(b.coach_id || ''));

                            if (pendingClients.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 italic">
                                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4" />
                                        <p>¡Todos los alumnos activos están al día!</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-2">
                                    {pendingClients.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => onNavigateToClient?.(c)}
                                            className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-white hover:shadow-lg rounded-2xl border border-slate-100 transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400 group-hover:bg-[#0f172a] group-hover:text-white transition-colors">
                                                    {c.firstName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                                                        {c.firstName} {c.surname}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                        Coach: {getCoachDisplayName(c.coach_id) || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div>
                                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Pendiente</p>
                                                    <p className="text-[9px] text-slate-400 italic">
                                                        Último: {c.last_checkin_submitted ? new Date(c.last_checkin_submitted).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Nunca'}
                                                    </p>
                                                </div>
                                                {c.missed_checkins_count ? (
                                                    <div className="bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 flex flex-col items-center min-w-[32px]">
                                                        <span className="text-[8px] font-black text-rose-400 leading-none">STRIKES</span>
                                                        <span className="text-xs font-black text-rose-600 leading-none">{c.missed_checkins_count}</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                            {c.last_checkin_missed_reason && (
                                                <div className="mt-2 text-[10px] bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg border border-rose-100 italic font-medium">
                                                    " {c.last_checkin_missed_reason} "
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {(new Date().getDay() >= 2 || new Date().getDay() === 0) && pendingClients.length > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAutomateAlerts(pendingClients);
                                            }}
                                            disabled={isProcessingAlerts}
                                            className="w-full mt-4 flex items-center justify-center gap-2 py-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all transform hover:scale-[1.02] active:scale-95"
                                        >
                                            {isProcessingAlerts ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Procesando...
                                                </>
                                            ) : (
                                                <>
                                                    <AlertTriangle className="w-4 h-4" />
                                                    GENERAR ALERTAS SEMANALES (MARTES)
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                    <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-center gap-4">
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Alertas Activas</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Contador Strikes</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium italic text-center">
                            * El botón de alertas aparece solo a partir del martes. Al pulsar, se crean registros históricos de riesgo y se aumenta el contador de fallos.
                        </p>
                    </div>
                </div>

                {/* --- INDIVIDUAL PERFORMANCE (ADMIN ONLY) --- */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-black text-slate-800">Detalle por Coach</h3>
                        <div className="flex gap-2">
                            <select
                                value={selectedCoach || ''}
                                onChange={(e) => setSelectedCoach(e.target.value || null)}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="">-- Todos los Coaches --</option>
                                {Array.from(new Set(clients.map(c => getCoachDisplayName(c.property_coach || c.coach_id)).filter(n => n !== 'Sin Asignar'))).sort().map(coachName => (
                                    <option key={coachName} value={coachName}>{coachName}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <StaffPerformance
                        performanceData={metrics.historicalMetrics}
                        title={selectedCoach ? `Rendimiento: ${selectedCoach}` : "Rendimiento Global Academia"}
                    />
                </div>

            </div>

            {/* --- RISK ALERTS PANEL --- */}
            <div className="mb-8">
                <RiskAlertsPanel
                    clients={clients}
                    coaches={coaches}
                    onNavigateToView={onNavigateToView}
                    onNavigateToClient={onNavigateToClient || (() => { })}
                />
            </div>

            {/* --- QUICK ACTION CENTER --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">

                <div className="md:col-span-2 bg-[#0f172a] p-10 rounded-[3.5rem] text-white relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px] -mr-40 -mt-40 transition-transform duration-1000 group-hover:scale-150" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
                                <Zap className="w-6 h-6 text-amber-400" />
                            </div>
                            <h3 className="text-3xl font-black tracking-tight">Acción Recomendada</h3>
                        </div>
                        <p className="text-slate-300 font-medium text-lg mb-8 max-w-xl leading-relaxed">
                            Detectamos <span className="text-white font-black underline decoration-blue-500 decoration-4 text-2xl">{metrics.alerts.expired} vencimientos</span> inmediatos.
                            Recuerda: Los coaches comisionan el 10% del neto por cada renovación cerrada.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={() => onNavigateToView('renewals')}
                                className="bg-white text-[#0f172a] px-10 py-4 rounded-[1.5rem] font-black text-sm hover:bg-blue-600 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-2xl flex items-center gap-3"
                            >
                                <span>GESTIONAR RENOVACIONES</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-[3.5rem] text-white flex flex-col justify-between group shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
                        <Calendar className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-200 mb-2">Previsión Financiera</p>
                        <h4 className="text-4xl font-black mb-2 tracking-tight">Caja Neta</h4>
                        <p className="text-blue-100/80 text-sm font-medium leading-relaxed">Estimación tras descontar comisiones de plataforma y staff.</p>
                    </div>

                    <div className="mt-8 flex items-end justify-between relative z-10">
                        <div>
                            <p className="text-4xl font-black">€14k+</p>
                            <p className="text-[10px] uppercase font-black text-blue-200 mt-1">Siguientes 15 días</p>
                        </div>
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 transition-transform">
                            <DollarSign className="w-7 h-7" />
                        </div>
                    </div>
                </div>

            </div>

            {showAnnouncementModal && (
                <CreateAnnouncement
                    currentUser={user.name}
                    isAdmin={(user.role || '').toLowerCase() === 'admin' || (user.role || '').toLowerCase() === 'head_coach'}
                    clients={clients}
                    onClose={() => {
                        setShowAnnouncementModal(false);
                        setPredefinedAnnouncementSettings(null);
                    }}
                    onSuccess={() => {
                        setShowAnnouncementModal(false);
                        setPredefinedAnnouncementSettings(null);
                    }}
                    defaultAudience={predefinedAnnouncementSettings?.target}
                    prefill={predefinedAnnouncementSettings ? {
                        title: predefinedAnnouncementSettings.title || '',
                        message: predefinedAnnouncementSettings.body || '',
                        target: predefinedAnnouncementSettings.target as any,
                        telegram: predefinedAnnouncementSettings.channel === 'telegram'
                    } : undefined}
                />
            )}

            {/* --- DRILL DOWN MODAL --- */}
            {drillDown && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDrillDown(null)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">{drillDown.title}</h3>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{drillDown.clients.length} clientes encontrados</p>
                            </div>
                            <button onClick={() => setDrillDown(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto">
                            <div className="grid grid-cols-1 gap-3">
                                {drillDown.clients.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(client => (
                                    <div
                                        key={client.id}
                                        className="flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all cursor-pointer group"
                                        onClick={() => {
                                            // Aquí podríamos navegar al detalle si tenemos la función
                                            setDrillDown(null);
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm border border-slate-200">
                                                {(client.name || '?')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 group-hover:text-blue-700">{client.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{getCoachDisplayName(client.property_coach || client.coach_id)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${client.status === ClientStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' :
                                                client.status === ClientStatus.PAUSED ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {client.status}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                ))}
                                {drillDown.clients.length === 0 && (
                                    <div className="text-center py-10">
                                        <p className="text-slate-400 font-bold italic">No se encontraron clientes para esta métrica.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ExecutiveDashboard;
