import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import {
    TrendingUp, TrendingDown, DollarSign, FileText, CheckCircle2,
    Calendar, Loader2, Eye,
    AlertTriangle, Info, ChevronDown, ChevronUp, CreditCard,
    Clock, AlertCircle, Edit, Trash2, X, Save, Copy, Sparkles, RefreshCw,
    Target, XCircle, BarChart3, Percent, Users, UserCheck, Smartphone, Share2, Phone,
    Trophy, Zap, Star
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, Cell, LineChart, Line
} from 'recharts';
import InstallationGuide from './InstallationGuide';
import { useToast } from './ToastProvider';

interface Sale {
    id: string;
    client_first_name: string;
    client_last_name: string;
    client_email: string;
    client_phone: string;
    client_dni?: string;
    client_address?: string;
    sale_amount: number;
    contract_duration: number;
    payment_method: string;
    assigned_coach_id: string | null;
    assigned_coach_name: string | null;
    status: string;
    payment_receipt_url: string | null;
    commission_paid: boolean;
    sale_date: string;
    admin_notes: string | null;
    coach_notes: string | null;
    hotmart_payment_link?: string;
    onboarding_token?: string;
    onboarding_completed?: boolean;
    net_amount?: number;
    platform_fee_amount?: number;
    commission_amount?: number;
    project?: 'PT' | 'ME';
}

interface CoachCapacity {
    id: string;
    name: string;
    role: string;
    max_clients: number;
    current_clients: number;
    available_slots: number;
    capacity_percentage: number;
    capacity_status: 'available' | 'moderate' | 'near_full' | 'full';
    available_for_assignment: boolean;
    status: 'active' | 'vacation' | 'sick_leave' | 'inactive';
    specialty: string[] | null;
}

interface Lead {
    id: string;
    firstName: string;
    surname: string;
    name?: string;
    email?: string;
    phone?: string;
    status: string;
    next_followup_date?: string;
    last_contact_date?: string;
    created_at: string;
    updated_at?: string;
    assigned_to?: string;
    notes?: string;
    source?: string;
    instagram_user?: string;
    // Enhanced fields
    closer_id?: string;
    setter_id?: string;
    setter_name?: string;
    in_out?: string;
    procedencia_detalle?: string;
    qualification_level?: number;
    attended?: boolean;
    objections?: string;
    recording_url?: string;
    correction_url?: string;
    sale_price?: number;
    commission_amount?: number;
    meeting_link?: string;
    closer_notes?: string;
    project?: 'PT' | 'ME';
    is_refund?: boolean;
}

// Interfaz para métricas de Notion (datos reales de llamadas)
interface NotionLeadMetric {
    notion_id: string;
    nombre_lead: string;
    setter: string;
    closer: string;
    dia_agenda: string | null;
    dia_llamada: string | null;
    presentado: boolean;
    cierre: boolean;
    estado_lead: string;
}

interface CloserDashboardProps {
    userId: string;
    userName: string;
    onNavigateToView?: (view: string, filter?: string) => void;
}

export function CloserDashboard({ userId, userName, onNavigateToView }: CloserDashboardProps) {
    const toast = useToast();

    const safeToFixed = (value: any, decimals: number = 2): string => {
        const num = Number(value);
        if (isNaN(num) || value === null || value === undefined) return (0).toFixed(decimals);
        return num.toFixed(decimals);
    };

    const [sales, setSales] = useState<Sale[]>([]);
    const [coaches, setCoaches] = useState<CoachCapacity[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<'all' | 'PT' | 'ME'>('all');
    const [expandedSale, setExpandedSale] = useState<string | null>(null);
    const [showCoachPanel, setShowCoachPanel] = useState(true);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [showLeadsPanel, setShowLeadsPanel] = useState(true);
    const [notionMetrics, setNotionMetrics] = useState<NotionLeadMetric[]>([]);

    // Month/Year Filtering
    const currentYear = new Date().getFullYear();
    const [monthFilter, setMonthFilter] = useState<string>((new Date().getMonth() + 1).toString());
    const [yearFilter, setYearFilter] = useState<string>(currentYear.toString());

    // Editing state
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [editingLeadOutcome, setEditingLeadOutcome] = useState<Lead | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    // Selection state for bulk actions
    const [selectedSales, setSelectedSales] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Cargar ventas, capacidad de coaches, leads y métricas Notion en paralelo
            const [salesResult, coachesResult, leadsResult, notionMetricsResult] = await Promise.all([
                supabase
                    .from('sales')
                    .select(`
                        *,
                        assigned_coach:users!sales_assigned_coach_id_fkey(name)
                    `)
                    .eq('closer_id', userId)
                    .order('sale_date', { ascending: false }),
                supabase
                    .from('coach_capacity_view')
                    .select('id, name, role, max_clients, current_clients, available_slots, capacity_percentage, capacity_status, available_for_assignment, status, specialty')
                    .order('available_slots', { ascending: false }),
                supabase
                    .from('leads')
                    .select('*')
                    .or(`assigned_to.eq.${userId},closer_id.eq.${userId}`)
                    .order('next_followup_date', { ascending: true }),
                // Cargar métricas de Notion filtradas por nombre del closer
                supabase
                    .from('notion_leads_metrics')
                    .select('notion_id, nombre_lead, setter, closer, dia_agenda, dia_llamada, presentado, cierre, estado_lead')
                    .ilike('closer', `%${userName}%`)
            ]);

            if (salesResult.error) throw salesResult.error;
            if (coachesResult.error) throw coachesResult.error;
            if (leadsResult.error) throw leadsResult.error;
            // No bloquear si falla notion_leads_metrics (puede no existir)
            if (notionMetricsResult.error) {
                console.warn('notion_leads_metrics not available:', notionMetricsResult.error);
            }

            const formattedSales = (salesResult.data || []).map(sale => ({
                ...sale,
                assigned_coach_name: sale.assigned_coach?.name || null
            }));

            setSales(formattedSales);
            setCoaches(coachesResult.data || []);
            setLeads((leadsResult.data || []).map(l => ({
                ...l,
                firstName: l.first_name || l.firstName || '',
                surname: l.surname || l.last_name || '',
                name: `${l.first_name || l.firstName || ''} ${l.surname || l.last_name || ''}`.trim(),
                setter_name: l.setter_name || 'Sistema'
            })));
            setNotionMetrics(notionMetricsResult.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (saleId: string, status: string) => {
        if (!window.confirm(`¿Seguro que quieres cambiar el estado a ${status === 'failed' ? 'FALLIDA' : 'ACTIVA'}?`)) return;

        try {
            const { error } = await supabase
                .from('sales')
                .update({ status: status })
                .eq('id', saleId);

            if (error) throw error;

            setSales(sales.map(s => s.id === saleId ? { ...s, status: status } : s));
            toast.success('Estado actualizado correctamente');
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Error al actualizar el estado');
        }
    };

    const handleDeleteSale = async (saleId: string) => {
        if (!window.confirm('¿Estas SEGURO de eliminar esta venta? Esta accion no se puede deshacer.')) return;

        try {
            const { error } = await supabase
                .from('sales')
                .delete()
                .eq('id', saleId);

            if (error) throw error;
            setSales(sales.filter(s => s.id !== saleId));
            setSelectedSales(prev => prev.filter(id => id !== saleId));
            setExpandedSale(null);
            toast.success('Venta eliminada correctamente');
        } catch (error) {
            console.error('Error deleting sale:', error);
            toast.error('Error al eliminar la venta');
        }
    };

    const handleToggleCommission = async (sale: Sale) => {
        const newStatus = !sale.commission_paid;
        try {
            const { error } = await supabase
                .from('sales')
                .update({ commission_paid: newStatus })
                .eq('id', sale.id);

            if (error) throw error;

            setSales(sales.map(s => s.id === sale.id ? { ...s, commission_paid: newStatus } : s));
            toast.success(newStatus ? 'Marcada como cobrada' : 'Marcada como pendiente');
        } catch (error) {
            console.error('Error updating commission:', error);
            toast.error('Error al actualizar el estado de comision');
        }
    };

    const handleBulkUpdateCommission = async (paid: boolean) => {
        if (selectedSales.length === 0) return;
        if (!window.confirm(`¿Marcar ${selectedSales.length} ventas como ${paid ? 'COBRADAS' : 'PENDIENTES'}?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('sales')
                .update({ commission_paid: paid })
                .in('id', selectedSales);

            if (error) throw error;

            await loadData();
            setSelectedSales([]);
            toast.success('Ventas actualizadas correctamente');
        } catch (error) {
            console.error('Error in bulk update:', error);
            toast.error('Error al realizar la actualizacion masiva');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectSale = (id: string) => {
        setSelectedSales(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const selectAllVisible = () => {
        const visibleIds = filteredSales.map(s => s.id);
        if (selectedSales.length === visibleIds.length) {
            setSelectedSales([]);
        } else {
            setSelectedSales(visibleIds);
        }
    };

    const handleUpdateSale = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSale) return;
        setIsSaving(true);

        try {
            const { error } = await supabase
                .from('sales')
                .update({
                    client_first_name: editingSale.client_first_name,
                    client_last_name: editingSale.client_last_name,
                    client_email: editingSale.client_email,
                    client_phone: editingSale.client_phone,
                    sale_amount: editingSale.sale_amount,
                    contract_duration: editingSale.contract_duration,
                    payment_method: editingSale.payment_method,
                    hotmart_payment_link: editingSale.hotmart_payment_link,
                    admin_notes: editingSale.admin_notes,
                    coach_notes: editingSale.coach_notes,
                    status: editingSale.status,
                    client_dni: editingSale.client_dni,
                    client_address: editingSale.client_address,
                    project: editingSale.project || 'PT'
                })
                .eq('id', editingSale.id);

            if (error) throw error;

            setEditingSale(null);
            await loadData();
            toast.success('Venta actualizada correctamente');
        } catch (error) {
            console.error('Error updating sale:', error);
            toast.error('Error al actualizar la venta');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAutoUpdateLead = async (leadId: string, updates: Partial<Lead>) => {
        try {
            const { error } = await supabase
                .from('leads')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', leadId);

            if (error) throw error;

            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));
            toast.success('Cambio guardado');

            // Si se marca como WON desde la tabla, notificar
            if (updates.status === 'WON') {
                toast.info('Lead ganado! Recuerda registrar la venta formalmente.');
            }
        } catch (error) {
            console.error('Error auto-updating lead:', error);
            toast.error('Error al guardar el cambio');
        }
    };

    const handleUpdateLeadOutcome = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLeadOutcome) return;
        setIsSaving(true);

        try {
            const { error } = await supabase
                .from('leads')
                .update({
                    qualification_level: editingLeadOutcome.qualification_level,
                    attended: editingLeadOutcome.attended,
                    objections: editingLeadOutcome.objections,
                    recording_url: editingLeadOutcome.recording_url,
                    sale_price: editingLeadOutcome.sale_price,
                    commission_amount: editingLeadOutcome.commission_amount,
                    meeting_link: editingLeadOutcome.meeting_link,
                    closer_notes: editingLeadOutcome.closer_notes,
                    status: editingLeadOutcome.status,
                    project: editingLeadOutcome.project || 'PT',
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingLeadOutcome.id);

            if (error) throw error;

            setEditingLeadOutcome(null);
            await loadData();
            toast.success('Resultado de llamada actualizado');

            // Si la venta es exitosa, podrías abrir el formulario de nueva venta
            if (editingLeadOutcome.status === 'WON') {
                toast.info('Lead ganado! Recuerda registrar la venta en "Nueva Venta"');
            }
        } catch (error) {
            console.error('Error updating lead outcome:', error);
            toast.error('Error al actualizar el resultado');
        } finally {
            setIsSaving(false);
        }
    };

    // ==================== METRICAS ====================

    // Ventas del mes seleccionado
    const salesThisMonth = sales.filter(s => {
        const d = new Date(s.sale_date);
        const matchesMonth = monthFilter === 'all' || (d.getMonth() + 1).toString() === monthFilter;
        const matchesYear = yearFilter === 'all' || d.getFullYear().toString() === yearFilter;
        const matchesProject = projectFilter === 'all' || s.project === projectFilter;
        return matchesMonth && matchesYear && matchesProject;
    });

    // Mes anterior para comparativa
    const getPreviousMonth = () => {
        if (monthFilter === 'all') return { month: 'all', year: yearFilter };
        const m = parseInt(monthFilter);
        const y = parseInt(yearFilter);
        if (m === 1) return { month: '12', year: (y - 1).toString() };
        return { month: (m - 1).toString(), year: y.toString() };
    };

    const prevMonthData = getPreviousMonth();
    const salesPreviousMonth = sales.filter(s => {
        if (prevMonthData.month === 'all') return false;
        const d = new Date(s.sale_date);
        const matchesProject = projectFilter === 'all' || s.project === projectFilter;
        return (d.getMonth() + 1).toString() === prevMonthData.month &&
            d.getFullYear().toString() === prevMonthData.year &&
            matchesProject;
    });

    // Métricas para el periodo seleccionado (desde leads)
    const leadsInPeriod = leads.filter(l => {
        const d = new Date(l.created_at);
        const matchesMonth = monthFilter === 'all' || (d.getMonth() + 1).toString() === monthFilter;
        const matchesYear = yearFilter === 'all' || d.getFullYear().toString() === yearFilter;
        const matchesProject = projectFilter === 'all' || l.project === projectFilter;
        return matchesMonth && matchesYear && matchesProject;
    });

    const leadsWon = leads.filter(l => {
        const d = new Date(l.updated_at || l.created_at);
        const matchesMonth = monthFilter === 'all' || (d.getMonth() + 1).toString() === monthFilter;
        const matchesYear = yearFilter === 'all' || d.getFullYear().toString() === yearFilter;
        const matchesProject = projectFilter === 'all' || l.project === projectFilter;
        return l.status === 'WON' && matchesMonth && matchesYear && matchesProject;
    });

    const leadsLost = leads.filter(l => {
        const d = new Date(l.updated_at || l.created_at);
        const matchesMonth = monthFilter === 'all' || (d.getMonth() + 1).toString() === monthFilter;
        const matchesYear = yearFilter === 'all' || d.getFullYear().toString() === yearFilter;
        const matchesProject = projectFilter === 'all' || l.project === projectFilter;
        return l.status === 'LOST' && matchesMonth && matchesYear && matchesProject;
    });

    // Agenda de Hoy (SCHEDULED)
    const todayStr = new Date().toISOString().split('T')[0];
    const scheduledToday = leads.filter(l =>
        l.status === 'SCHEDULED' &&
        l.next_followup_date &&
        l.next_followup_date.startsWith(todayStr)
    );

    // Llamadas realizadas hoy (last_contact_date === hoy)
    const performedToday = leads.filter(l =>
        l.last_contact_date &&
        l.last_contact_date.startsWith(todayStr)
    );

    // MÉTRICAS MENSUALES - Usando notion_leads_metrics (datos reales de Notion)
    // dia_agenda es la fecha de la llamada agendada
    const notionLeadsInPeriod = notionMetrics.filter(l => {
        const dateStr = l.dia_agenda || l.dia_llamada;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const matchesMonth = monthFilter === 'all' || (d.getMonth() + 1).toString() === monthFilter;
        const matchesYear = yearFilter === 'all' || d.getFullYear().toString() === yearFilter;
        return matchesMonth && matchesYear;
    });

    // Llamadas realizadas = leads con fecha en el período
    const callsInPeriod = notionLeadsInPeriod.length;
    // Presentados = leads donde presentado = true
    const attendedInPeriod = notionLeadsInPeriod.filter(l => l.presentado === true);
    // No presentados = leads donde presentado = false
    const noShowInPeriod = notionLeadsInPeriod.filter(l => l.presentado === false);
    // Llamadas sin venta = presentados sin cierre
    const callsWithoutSale = notionLeadsInPeriod.filter(l =>
        l.presentado === true && l.cierre !== true
    );

    // Fallback a datos de leads si no hay datos en notion_leads_metrics
    const leadsContactedInPeriod = leads.filter(l => {
        const dateStr = l.last_contact_date || l.updated_at;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const matchesMonth = monthFilter === 'all' || (d.getMonth() + 1).toString() === monthFilter;
        const matchesYear = yearFilter === 'all' || d.getFullYear().toString() === yearFilter;
        const matchesProject = projectFilter === 'all' || l.project === projectFilter;
        return matchesMonth && matchesYear && matchesProject && l.attended !== undefined && l.attended !== null;
    });

    // Tasa de cierre (Ventas vs Total Cerrados)
    const totalResolved = leadsWon.length + leadsLost.length;
    const closureRateLeads = totalResolved > 0 ? (leadsWon.length / totalResolved) * 100 : 0;

    // Metricas calculadas (desde sales para dinero)
    const successfulSalesThisMonth = salesThisMonth.filter(s => s.status !== 'failed');
    const failedSalesThisMonth = salesThisMonth.filter(s => s.status === 'failed');
    const successfulSalesPrevMonth = salesPreviousMonth.filter(s => s.status !== 'failed');

    const totalSalesCount = successfulSalesThisMonth.length;
    const totalSalesCountPrev = successfulSalesPrevMonth.length;
    const salesDiff = totalSalesCount - totalSalesCountPrev;

    const totalRevenue = successfulSalesThisMonth.reduce((sum, s) => sum + (s.sale_amount || 0), 0);
    const totalRevenuePrev = successfulSalesPrevMonth.reduce((sum, s) => sum + (s.sale_amount || 0), 0);

    const totalCommissions = successfulSalesThisMonth.reduce((sum, s) => sum + (s.commission_amount || 0), 0);
    const paidCommissions = successfulSalesThisMonth.filter(s => s.commission_paid).reduce((sum, s) => sum + (s.commission_amount || 0), 0);
    const pendingCommissions = totalCommissions - paidCommissions;
    const pendingCount = successfulSalesThisMonth.filter(s => !s.commission_paid).length;

    const failedCount = failedSalesThisMonth.length;
    const totalAttempts = salesThisMonth.length;
    // Usamos el closure rate de leads si hay datos, si no el success rate de sales
    const successRate = totalResolved > 0 ? closureRateLeads : (totalAttempts > 0 ? ((totalSalesCount / totalAttempts) * 100) : 0);

    // Historico total cobrado
    const totalHistoricPaid = sales
        .filter(s => s.status !== 'failed' && s.commission_paid)
        .reduce((sum, s) => sum + (s.commission_amount || 0), 0);

    // Filtrar ventas para la lista
    const filteredSales = salesThisMonth.filter(s => {
        const matchesSearch =
            s.client_first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.client_last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.client_email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            filterStatus === 'all' ||
            (filterStatus === 'success' && s.status !== 'failed') ||
            (filterStatus === 'failed' && s.status === 'failed') ||
            (filterStatus === 'pending_commission' && !s.commission_paid && s.status !== 'failed');
        const matchesProject =
            projectFilter === 'all' || s.project === projectFilter;
        return matchesSearch && matchesStatus && matchesProject;
    });

    // Procesar datos para gráficas (evolución mensual del año seleccionado)
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1;
        const targetYear = yearFilter === 'all' ? currentYear : parseInt(yearFilter);
        const monthSales = sales.filter(s => {
            const d = new Date(s.sale_date);
            const matchesProject = projectFilter === 'all' || s.project === projectFilter;
            return d.getMonth() === i && d.getFullYear() === targetYear && s.status !== 'failed' && matchesProject;
        });

        const revenue = monthSales.reduce((sum, s) => sum + (s.sale_amount || 0), 0);
        return {
            name: new Date(2024, i).toLocaleString('es-ES', { month: 'short' }),
            ventas: revenue,
            cierres: monthSales.length,
            comisiones: monthSales.reduce((sum, s) => sum + (s.commission_amount || 0), 0)
        };
    });

    // Calcular Récords Históricos
    const allSuccessfulSales = sales.filter(s => s.status !== 'failed' && (projectFilter === 'all' || s.project === projectFilter));

    // Mejor Mes de la historia
    const salesByMonthYear: Record<string, number> = {};
    allSuccessfulSales.forEach(s => {
        const d = new Date(s.sale_date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        salesByMonthYear[key] = (salesByMonthYear[key] || 0) + (s.sale_amount || 0);
    });
    const bestMonthValue = Math.max(...Object.values(salesByMonthYear), 0);

    // Mejor Día de la historia (en cierres)
    const closuresByDay: Record<string, number> = {};
    allSuccessfulSales.forEach(s => {
        const dayKey = s.sale_date.split('T')[0];
        closuresByDay[dayKey] = (closuresByDay[dayKey] || 0) + 1;
    });
    const bestDayClosures = Math.max(...Object.values(closuresByDay), 0);

    // Quarter Data (Q1-Q4)
    const getQuarterData = () => {
        const quarters = [
            { name: 'Q1 (Ene-Mar)', months: [0, 1, 2] },
            { name: 'Q2 (Abr-Jun)', months: [3, 4, 5] },
            { name: 'Q3 (Jul-Sep)', months: [6, 7, 8] },
            { name: 'Q4 (Oct-Dic)', months: [9, 10, 11] }
        ];

        return quarters.map(q => {
            const qSales = monthlyData.filter((_, idx) => q.months.includes(idx));
            return {
                name: q.name,
                total: qSales.reduce((sum, m) => sum + m.ventas, 0),
                cierres: qSales.reduce((sum, m) => sum + m.cierres, 0)
            };
        });
    };
    const quarterStats = getQuarterData();

    // Generar años dinamicos
    const availableYears = Array.from(new Set(sales.map(s => new Date(s.sale_date).getFullYear())))
        .sort((a: number, b: number) => b - a);
    if (!availableYears.includes(currentYear)) availableYears.unshift(currentYear);

    // --- SUBCOMPONENTES DE ANALÍTICA ---
    const AnalyticsSection = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-emerald-600" /> Evolución de Ventas
                    </h3>
                    <p className="text-xs text-slate-500">Rendimiento mensual del año {yearFilter === 'all' ? currentYear : yearFilter}</p>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                        <defs>
                            <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickFormatter={(value) => `€${value}`}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`€${value.toLocaleString()}`, 'Ventas']}
                        />
                        <Area
                            type="monotone"
                            dataKey="ventas"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorVentas)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    const RecordsSection = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-200/50 relative overflow-hidden group">
                <Zap className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
                <div className="relative">
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-amber-200" />
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Mejor Mes Histórico</span>
                    </div>
                    <div className="text-2xl font-black">€{bestMonthValue.toLocaleString()}</div>
                    <p className="text-[10px] mt-1 opacity-70">Récord absoluto de facturación</p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200/50 relative overflow-hidden group">
                <CheckCircle2 className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
                <div className="relative">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-emerald-200" />
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Mejor Día (Cierres)</span>
                    </div>
                    <div className="text-2xl font-black">{bestDayClosures} Cierres</div>
                    <p className="text-[10px] mt-1 opacity-70">Máximo potencial en 24h</p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-200/50 relative overflow-hidden group">
                <Star className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
                <div className="relative">
                    <div className="flex items-center gap-2 mb-1">
                        <Percent className="w-4 h-4 text-blue-200" />
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Tasa de Cierre Media</span>
                    </div>
                    <div className="text-2xl font-black">{closureRateLeads.toFixed(1)}%</div>
                    <p className="text-[10px] mt-1 opacity-70">Efectividad histórica total</p>
                </div>
            </div>
        </div>
    );

    const QuarterlyTable = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" /> Desglose Trimestral
                </h3>
            </div>
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="text-[10px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-50">
                        <th className="p-3">Trimestre</th>
                        <th className="p-3">Cierres</th>
                        <th className="p-3 text-right">Facturación</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {quarterStats.map(q => (
                        <tr key={q.name} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 font-bold text-slate-700">{q.name}</td>
                            <td className="p-3">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">
                                    {q.cierres} ventas
                                </span>
                            </td>
                            <td className="p-3 text-right font-black text-slate-900">€{q.total.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    if (loading && sales.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Modal de Edicion */}
            {editingSale && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Edit className="w-5 h-5" /> Editar Venta
                            </h2>
                            <button onClick={() => setEditingSale(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateSale} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                                    <input
                                        required
                                        className="w-full border rounded-lg p-2"
                                        value={editingSale.client_first_name}
                                        onChange={e => setEditingSale({ ...editingSale, client_first_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Apellidos</label>
                                    <input
                                        required
                                        className="w-full border rounded-lg p-2"
                                        value={editingSale.client_last_name}
                                        onChange={e => setEditingSale({ ...editingSale, client_last_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                                    <input
                                        required
                                        type="email"
                                        className="w-full border rounded-lg p-2"
                                        value={editingSale.client_email}
                                        onChange={e => setEditingSale({ ...editingSale, client_email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Telefono</label>
                                    <input
                                        required
                                        className="w-full border rounded-lg p-2"
                                        value={editingSale.client_phone}
                                        onChange={e => setEditingSale({ ...editingSale, client_phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Precio (EUR)</label>
                                    <input
                                        required
                                        type="number"
                                        className="w-full border rounded-lg p-2"
                                        value={editingSale.sale_amount}
                                        onChange={e => setEditingSale({ ...editingSale, sale_amount: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Duracion (Meses)</label>
                                    <input
                                        required
                                        type="number"
                                        className="w-full border rounded-lg p-2"
                                        value={editingSale.contract_duration}
                                        onChange={e => setEditingSale({ ...editingSale, contract_duration: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">DNI / NIE</label>
                                    <input
                                        className="w-full border rounded-lg p-2"
                                        value={editingSale.client_dni || ''}
                                        onChange={e => setEditingSale({ ...editingSale, client_dni: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Direccion</label>
                                    <input
                                        className="w-full border rounded-lg p-2"
                                        value={editingSale.client_address || ''}
                                        onChange={e => setEditingSale({ ...editingSale, client_address: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Proyecto</label>
                                    <select
                                        className="w-full border rounded-lg p-2 font-bold"
                                        value={editingSale.project || 'PT'}
                                        onChange={e => setEditingSale({ ...editingSale, project: e.target.value as any })}
                                    >
                                        <option value="PT">Padron Trainer</option>
                                        <option value="ME">Médico Emprendedor</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Estado</label>
                                    <select
                                        className="w-full border rounded-lg p-2"
                                        value={editingSale.status}
                                        onChange={e => setEditingSale({ ...editingSale, status: e.target.value })}
                                    >
                                        <option value="pending_onboarding">Pendiente Onboarding</option>
                                        <option value="onboarding_completed">Onboarding Completado</option>
                                        <option value="failed">Fallida / Cancelada</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Notas</label>
                                <textarea
                                    rows={2}
                                    className="w-full border rounded-lg p-2"
                                    value={editingSale.coach_notes || ''}
                                    onChange={e => setEditingSale({ ...editingSale, coach_notes: e.target.value })}
                                    placeholder="Notas sobre la venta..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Guardar Cambios
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Resultado de Llamada / Dashboard Closer */}
            {editingLeadOutcome && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Phone className="w-5 h-5 text-emerald-400" /> Resultado de Llamada
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">{editingLeadOutcome.name}</p>
                            </div>
                            <button onClick={() => setEditingLeadOutcome(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateLeadOutcome} className="p-6 space-y-5 overflow-y-auto">
                            {/* Qualification & Attendance */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Asistencia (Presentado)</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setEditingLeadOutcome({ ...editingLeadOutcome, attended: true })}
                                            className={`flex-1 py-2 px-3 rounded-lg border font-bold text-sm transition-all ${editingLeadOutcome.attended ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                        >
                                            <CheckCircle2 className="w-4 h-4 inline-block mr-1" /> SÍ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingLeadOutcome({ ...editingLeadOutcome, attended: false })}
                                            className={`flex-1 py-2 px-3 rounded-lg border font-bold text-sm transition-all ${editingLeadOutcome.attended === false ? 'bg-rose-100 border-rose-500 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                        >
                                            <XCircle className="w-4 h-4 inline-block mr-1" /> NO
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Cualificación (1-5)</label>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(num => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setEditingLeadOutcome({ ...editingLeadOutcome, qualification_level: num })}
                                                className={`w-10 h-10 rounded-lg border font-black transition-all ${editingLeadOutcome.qualification_level === num ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'}`}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Project Selection */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Proyecto</label>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditingLeadOutcome({ ...editingLeadOutcome, project: 'PT' })}
                                        className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${editingLeadOutcome.project === 'PT' || !editingLeadOutcome.project ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        Padron Trainer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingLeadOutcome({ ...editingLeadOutcome, project: 'ME' })}
                                        className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${editingLeadOutcome.project === 'ME' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        Médico Emprendedor
                                    </button>
                                </div>
                            </div>

                            {/* Outcome Status */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Estado Post-Llamada</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'WON', label: 'Vendido', color: 'emerald' },
                                        { id: 'SCHEDULED', label: 'Seguimiento', color: 'blue' },
                                        { id: 'LOST', label: 'No Interesado', color: 'rose' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setEditingLeadOutcome({ ...editingLeadOutcome, status: opt.id })}
                                            className={`py-3 rounded-xl border font-bold text-sm transition-all ${editingLeadOutcome.status === opt.id ? `bg-${opt.color}-600 border-${opt.color}-600 text-white shadow-lg shadow-${opt.color}-200` : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Objections (only if not WON) */}
                            {editingLeadOutcome.status !== 'WON' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Motivos de no cierre (Objeciones)</label>
                                    <textarea
                                        rows={2}
                                        className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-rose-300 outline-none transition-all"
                                        value={editingLeadOutcome.objections || ''}
                                        onChange={e => setEditingLeadOutcome({ ...editingLeadOutcome, objections: e.target.value })}
                                        placeholder="Dinero, tiempo, pareja, no califica..."
                                    />
                                </div>
                            )}

                            {/* Sale details (only if WON) */}
                            {editingLeadOutcome.status === 'WON' && (
                                <div className="grid grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Precio de Venta (€)</label>
                                        <input
                                            type="number"
                                            className="w-full border border-emerald-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                            value={editingLeadOutcome.sale_price || ''}
                                            onChange={e => setEditingLeadOutcome({ ...editingLeadOutcome, sale_price: parseFloat(e.target.value) })}
                                            placeholder="Ej: 1400"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Comisión Estimada (€)</label>
                                        <input
                                            type="number"
                                            className="w-full border border-emerald-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                            value={editingLeadOutcome.commission_amount || ''}
                                            onChange={e => setEditingLeadOutcome({ ...editingLeadOutcome, commission_amount: parseFloat(e.target.value) })}
                                            placeholder="Ej: 160"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Links & Notes */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2 flex items-center gap-2">
                                        <Share2 className="w-3 h-3" /> Link de Grabación (Zoom/Meet)
                                    </label>
                                    <input
                                        type="url"
                                        className="w-full border-2 border-slate-100 rounded-xl p-2.5 focus:border-blue-300 outline-none transition-all text-sm"
                                        value={editingLeadOutcome.recording_url || ''}
                                        onChange={e => setEditingLeadOutcome({ ...editingLeadOutcome, recording_url: e.target.value })}
                                        placeholder="https://zoom.us/rec/..."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Notas del Closer</label>
                                    <textarea
                                        rows={3}
                                        className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-blue-300 outline-none transition-all text-sm"
                                        value={editingLeadOutcome.closer_notes || ''}
                                        onChange={e => setEditingLeadOutcome({ ...editingLeadOutcome, closer_notes: e.target.value })}
                                        placeholder="Detalles sobre la llamada, acuerdos especiales..."
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                GUARDAR RESULTADO
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-7 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Sparkles className="text-emerald-500" /> Hola, {userName}
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Tu panel de ventas y comisiones</p>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <div className="flex bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-inner">
                        <select
                            value={monthFilter}
                            onChange={e => setMonthFilter(e.target.value)}
                            className="bg-transparent text-slate-600 text-xs font-bold px-3 py-1.5 outline-none cursor-pointer"
                        >
                            <option value="all">Todo el ano</option>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={(i + 1).toString()}>
                                    {new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2022, i, 1))}
                                </option>
                            ))}
                        </select>
                        <div className="w-px h-4 bg-slate-200 self-center"></div>
                        <select
                            value={yearFilter}
                            onChange={e => setYearFilter(e.target.value)}
                            className="bg-transparent text-slate-600 text-xs font-bold px-3 py-1.5 outline-none cursor-pointer"
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y.toString()}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => loadData()}
                        disabled={loading}
                        className="p-3 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-slate-200"
                        title="Recargar datos"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-50"></div>
            </div>

            {/* KPIs Grid Primario: Llamadas y Conversión */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Agenda de Hoy */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <Calendar className="w-5 h-5" />
                        </div>
                        {scheduledToday.length > 0 && (
                            <span className="animate-pulse flex h-2.5 w-2.5 rounded-full bg-blue-400"></span>
                        )}
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{scheduledToday.length}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Agenda para Hoy</p>
                </div>

                {/* Llamadas Realizadas Hoy */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                            <Phone className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{performedToday.length}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Contactos Hoy</p>
                </div>

                {/* Ganados / Ventas */}
                <div className="bg-emerald-600 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10 text-white">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-white/20 text-white rounded-xl">
                                <Target className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold bg-white/30 px-2 py-1 rounded-full">
                                {leadsWon.length} Leads
                            </span>
                        </div>
                        <h3 className="text-2xl font-black">{totalSalesCount}</h3>
                        <p className="text-[11px] font-bold text-emerald-100 uppercase tracking-wide">Ventas Cerradas</p>
                    </div>
                </div>

                {/* Tasa de Cierre */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                            <Percent className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{safeToFixed(successRate, 0)}%</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tasa de Cierre</p>
                    <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-amber-500 h-full rounded-full transition-all"
                            style={{ width: `${successRate}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* KPIs Grid: Métricas de Llamadas del Periodo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Llamadas Realizadas (Mes) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Phone className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{callsInPeriod || leadsContactedInPeriod.length}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Llamadas Realizadas</p>
                </div>

                {/* Presentados */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                            <UserCheck className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{attendedInPeriod.length}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Presentados</p>
                </div>

                {/* No Presentados */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                            <XCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{noShowInPeriod.length}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">No Presentados</p>
                </div>

                {/* Llamadas Sin Venta */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{callsWithoutSale.length}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Sin Venta</p>
                </div>
            </div>

            {/* KPIs Grid Secundario: Comisiones y Dinero */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Facturado */}
                <div className="bg-slate-900 p-4 rounded-xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-xl font-black text-white">{totalRevenue.toLocaleString()}€</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Facturación Brut.</p>
                    </div>
                </div>

                {/* Comisiones Totales */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-black text-slate-900">{safeToFixed(totalCommissions, 0)}€</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Comis. Totales</p>
                </div>

                {/* Cobradas */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm group">
                    <h3 className="text-xl font-black text-emerald-600">{safeToFixed(paidCommissions, 0)}€</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Comis. Cobradas</p>
                </div>

                {/* Pendientes */}
                <div className={`bg-white p-4 rounded-xl border shadow-sm ${pendingCommissions > 0 ? 'border-amber-200 bg-amber-50/10' : 'border-slate-100'}`}>
                    <h3 className="text-xl font-black text-slate-900">{safeToFixed(pendingCommissions, 0)}€</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Por Cobrar</p>
                </div>
            </div>

            {/* Comparativa mes anterior */}
            {monthFilter !== 'all' && (
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-purple-50 text-purple-500">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900">{totalSalesCountPrev}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Mes Anterior</p>
                    </div>
                </div>
            )}

            {/* Total Historico Cobrado */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 rounded-xl shadow-lg flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/20 text-white">
                    <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-white">{totalHistoricPaid.toLocaleString()}€</h3>
                    <p className="text-[10px] font-bold text-white/70 uppercase">Total Historico</p>
                </div>
            </div>

            {/* Nueva Sección de Analítica y Récords */}
            <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 px-1">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Rendimiento e Histórico</h2>
                </div>

                <RecordsSection />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <AnalyticsSection />
                    </div>
                    <div>
                        <QuarterlyTable />
                    </div>
                </div>
            </div>

            {/* Agenda de Hoy (Lista) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <button
                    onClick={() => setShowLeadsPanel(!showLeadsPanel)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <h2 className="font-bold text-slate-900">Agenda de Llamadas (Hoy)</h2>
                            <p className="text-xs text-slate-500">
                                {scheduledToday.length} llamadas programadas para hoy
                            </p>
                        </div>
                    </div>
                    {showLeadsPanel ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                {showLeadsPanel && (
                    <div className="border-t border-slate-100 overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Fecha / Hora</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Nombre del Lead</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Setter</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Estado</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Presentado</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Cierre</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Venta (€)</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Devolución</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Cualif.</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Recording / Notas / Link</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {scheduledToday.length > 0 ? (
                                    scheduledToday.map(lead => (
                                        <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group text-sm">
                                            {/* Fecha/Hora */}
                                            <td className="p-3">
                                                <input
                                                    type="datetime-local"
                                                    value={lead.next_followup_date ? lead.next_followup_date.substring(0, 16) : ''}
                                                    onChange={(e) => handleAutoUpdateLead(lead.id, { next_followup_date: e.target.value })}
                                                    className="bg-transparent border-none p-1 text-xs font-medium focus:ring-1 focus:ring-emerald-500 rounded outline-none"
                                                />
                                            </td>

                                            {/* Nombre */}
                                            <td className="p-3 font-bold text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">
                                                        {lead.firstName.substring(0, 1)}{lead.surname.substring(0, 1)}
                                                    </div>
                                                    <span className="truncate max-w-[150px]">{lead.firstName} {lead.surname}</span>
                                                    {lead.phone && (
                                                        <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Smartphone className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Setter */}
                                            <td className="p-3">
                                                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase">
                                                    {lead.setter_name}
                                                </span>
                                            </td>

                                            {/* Estado */}
                                            <td className="p-3">
                                                <select
                                                    value={lead.status}
                                                    onChange={(e) => handleAutoUpdateLead(lead.id, { status: e.target.value })}
                                                    className={`text-[10px] font-black border-none bg-transparent outline-none cursor-pointer uppercase py-1 px-2 rounded-lg ${lead.status === 'WON' ? 'text-emerald-600 bg-emerald-50' :
                                                        lead.status === 'LOST' ? 'text-red-500 bg-red-50' :
                                                            'text-amber-600 bg-amber-50'
                                                        }`}
                                                >
                                                    <option value="SCHEDULED">Agendado</option>
                                                    <option value="WON">Ganado</option>
                                                    <option value="LOST">Perdido</option>
                                                    <option value="CANCELLED">Cancelado</option>
                                                </select>
                                            </td>

                                            {/* Presentado (Attended) */}
                                            <td className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={lead.attended || false}
                                                    onChange={(e) => handleAutoUpdateLead(lead.id, { attended: e.target.checked })}
                                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                />
                                            </td>

                                            {/* Cierre (Status WON Toggle) */}
                                            <td className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={lead.status === 'WON'}
                                                    onChange={(e) => handleAutoUpdateLead(lead.id, { status: e.target.checked ? 'WON' : 'SCHEDULED' })}
                                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                />
                                            </td>

                                            {/* Venta / Precio */}
                                            <td className="p-3">
                                                <div className="relative">
                                                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                                                    <input
                                                        type="number"
                                                        value={lead.sale_price || ''}
                                                        onChange={(e) => handleAutoUpdateLead(lead.id, { sale_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                        placeholder="0"
                                                        className="w-20 bg-transparent border-none pl-4 pr-1 py-1 text-xs font-bold focus:ring-1 focus:ring-emerald-500 rounded outline-none"
                                                    />
                                                </div>
                                            </td>

                                            {/* Devolución */}
                                            <td className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={lead.is_refund || false}
                                                    onChange={(e) => handleAutoUpdateLead(lead.id, { is_refund: e.target.checked })}
                                                    className="w-4 h-4 rounded text-red-500 focus:ring-red-500 cursor-pointer"
                                                    title="Pide devolución"
                                                />
                                            </td>

                                            {/* Cualificación */}
                                            <td className="p-3 text-center">
                                                <select
                                                    value={lead.qualification_level || 1}
                                                    onChange={(e) => handleAutoUpdateLead(lead.id, { qualification_level: parseInt(e.target.value) })}
                                                    className="text-xs bg-transparent border-none outline-none cursor-pointer"
                                                >
                                                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}★</option>)}
                                                </select>
                                            </td>

                                            {/* Multimedia y Links */}
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const url = prompt('URL de grabación:', lead.recording_url || '');
                                                            if (url !== null) handleAutoUpdateLead(lead.id, { recording_url: url });
                                                        }}
                                                        className={`p-1.5 rounded-lg transition-colors ${lead.recording_url ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                                                        title="URL Grabación"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const url = prompt('URL de Corrección:', lead.correction_url || '');
                                                            if (url !== null) handleAutoUpdateLead(lead.id, { correction_url: url });
                                                        }}
                                                        className={`p-1.5 rounded-lg transition-colors ${lead.correction_url ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                                                        title="URL Corrección"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const notes = prompt('Notas del Closer:', lead.closer_notes || '');
                                                            if (notes !== null) handleAutoUpdateLead(lead.id, { closer_notes: notes });
                                                        }}
                                                        className={`p-1.5 rounded-lg transition-colors ${lead.closer_notes ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                                                        title="Notas"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingLeadOutcome(lead)}
                                                        className="p-1 text-slate-400 hover:text-emerald-600"
                                                        title="Ver mas detalles"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="p-8 text-center text-slate-400 italic text-sm">
                                            No tienes llamadas agendadas para hoy.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Panel de Capacidad de Coaches */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <button
                    onClick={() => setShowCoachPanel(!showCoachPanel)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <h2 className="font-bold text-slate-900">Disponibilidad de Coaches</h2>
                            <p className="text-xs text-slate-500">
                                {coaches.filter(c => c.available_for_assignment && c.available_slots > 0).length} coaches disponibles para asignar
                            </p>
                        </div>
                    </div>
                    {showCoachPanel ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                {showCoachPanel && (
                    <div className="border-t border-slate-100 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {coaches
                                .filter(c => c.status === 'active')
                                .map(coach => {
                                    const isAvailable = coach.available_for_assignment && coach.available_slots > 0;
                                    const capacityColor =
                                        coach.capacity_status === 'available' ? 'bg-emerald-500' :
                                            coach.capacity_status === 'moderate' ? 'bg-yellow-500' :
                                                coach.capacity_status === 'near_full' ? 'bg-orange-500' : 'bg-red-500';

                                    return (
                                        <div
                                            key={coach.id}
                                            className={`p-3 rounded-xl border transition-all ${isAvailable
                                                ? 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                                                : 'bg-slate-50 border-slate-100 opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                                                        }`}>
                                                        {coach.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">{coach.name}</p>
                                                        <p className="text-[10px] text-slate-500">
                                                            {coach.role === 'coach' ? 'Coach' : coach.role === 'nutritionist' ? 'Nutricionista' : 'Psicologo'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isAvailable ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                        <UserCheck className="w-3 h-3" /> Disponible
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                        Completo
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500">Capacidad</span>
                                                    <span className="font-bold text-slate-700">{coach.current_clients}/{coach.max_clients}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                    <div
                                                        className={`${capacityColor} h-1.5 rounded-full transition-all`}
                                                        style={{ width: `${Math.min(coach.capacity_percentage, 100)}%` }}
                                                    />
                                                </div>
                                                {coach.available_slots > 0 && (
                                                    <p className="text-[10px] font-bold text-emerald-600">
                                                        {coach.available_slots} {coach.available_slots === 1 ? 'plaza libre' : 'plazas libres'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {coaches.filter(c => c.status === 'active').length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No hay coaches disponibles</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Lista de Ventas */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500" /> Mis Ventas
                        </h2>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar cliente..."
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="all">Todas</option>
                                <option value="success">Exitosas</option>
                                <option value="failed">Fallidas</option>
                                <option value="pending_commission">Pendientes cobro</option>
                            </select>
                            <select
                                value={projectFilter}
                                onChange={(e) => setProjectFilter(e.target.value as any)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                            >
                                <option value="all">Todos los Proyectos</option>
                                <option value="PT">Padron Trainer</option>
                                <option value="ME">Médico Emprendedor</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-3">
                    {/* Barra de Acciones Masivas */}
                    {filteredSales.length > 0 && (
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                    checked={selectedSales.length > 0 && selectedSales.length === filteredSales.length}
                                    onChange={selectAllVisible}
                                />
                                <span className="text-sm font-bold text-slate-600">
                                    {selectedSales.length > 0 ? `${selectedSales.length} seleccionadas` : 'Seleccionar todas'}
                                </span>
                            </div>

                            {selectedSales.length > 0 && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleBulkUpdateCommission(true)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Cobradas
                                    </button>
                                    <button
                                        onClick={() => handleBulkUpdateCommission(false)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600"
                                    >
                                        <Clock className="w-3.5 h-3.5" /> Marcar Pendientes
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Lista */}
                    {filteredSales.map(sale => (
                        <div key={sale.id} className="flex gap-3 items-start">
                            <div className="pt-4 flex-shrink-0">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                    checked={selectedSales.includes(sale.id)}
                                    onChange={() => toggleSelectSale(sale.id)}
                                />
                            </div>
                            <div className={`flex-1 border rounded-xl overflow-hidden transition-all ${sale.status === 'failed' ? 'opacity-60 bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-emerald-200 hover:shadow-md'}`}>
                                <div
                                    className="p-4 cursor-pointer"
                                    onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                                {sale.client_first_name} {sale.client_last_name}
                                                {sale.commission_paid && (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" title="Comision Cobrada" />
                                                )}
                                                {sale.status === 'failed' && (
                                                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase font-black">Fallida</span>
                                                )}
                                            </h3>
                                            <p className="text-sm text-slate-500">{sale.client_email}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(sale.sale_date).toLocaleDateString('es-ES')}
                                                </span>
                                                <span className="text-xs bg-blue-50 px-2 py-0.5 rounded text-blue-600 font-medium">
                                                    {sale.contract_duration} meses
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right flex flex-col items-end">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className={`text-xl font-bold ${sale.status === 'failed' ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>{sale.sale_amount}€</p>
                                                {expandedSale === sale.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                            </div>
                                            {sale.commission_amount !== undefined && Number(sale.commission_amount) > 0 && (
                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                                    +{safeToFixed(sale.commission_amount, 0)}€ comision
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedSale === sale.id && (
                                    <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4">
                                        {/* Desglose Economico */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-emerald-600" /> Desglose
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <span className="text-xs text-slate-400 block mb-1">Venta Bruta</span>
                                                    <span className="font-bold text-slate-900">{sale.sale_amount}€</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-400 block mb-1">Fee Pasarela</span>
                                                    <span className="font-bold text-red-500">-{sale.platform_fee_amount || 0}€</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-400 block mb-1">Neto Academia</span>
                                                    <span className="font-bold text-slate-700">{sale.net_amount || sale.sale_amount}€</span>
                                                </div>
                                                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100 -my-2 flex flex-col justify-center">
                                                    <span className="text-[10px] text-emerald-600 font-bold uppercase">Tu Comision</span>
                                                    <span className="font-black text-emerald-600 text-lg">+{sale.commission_amount || 0}€</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Info adicional */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Coach Asignado</p>
                                                <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                                                        {sale.assigned_coach_name ? sale.assigned_coach_name.substring(0, 2).toUpperCase() : '?'}
                                                    </div>
                                                    <span className="font-medium text-slate-900 text-sm">{sale.assigned_coach_name || 'Sin asignar'}</span>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Comprobante</p>
                                                {sale.payment_receipt_url ? (
                                                    <a
                                                        href={sale.payment_receipt_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 bg-white p-2 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                        <span className="font-medium text-sm">Ver Comprobante</span>
                                                        <Eye className="w-4 h-4 ml-auto" />
                                                    </a>
                                                ) : (
                                                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200 text-slate-400">
                                                        <AlertCircle className="w-4 h-4" />
                                                        <span className="text-sm">No disponible</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Enlace Onboarding */}
                                        {sale.onboarding_token && (
                                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-2">
                                                        <Sparkles className="w-3.5 h-3.5" /> Enlace Onboarding
                                                    </p>
                                                    {sale.onboarding_completed ? (
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> COMPLETADO
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> PENDIENTE
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={`${window.location.origin}/#/activar-cuenta/${sale.onboarding_token}`}
                                                        className="flex-1 bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-900 font-mono outline-none"
                                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                                    />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const link = `${window.location.origin}/#/activar-cuenta/${sale.onboarding_token}`;
                                                            const message = `¡Bienvenido/a a Padron Trainer! 🎉 Aquí tienes tu enlace de acceso personal:\n\n${link}\n\n📱 *Móvil (Recomendado):* Abre el link y selecciona 'Añadir a la pantalla de inicio' para entrar siempre como una App.`;
                                                            navigator.clipboard.writeText(message);
                                                            toast.success('Mensaje con guía copiado');
                                                        }}
                                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 flex items-center gap-2"
                                                    >
                                                        <Share2 className="w-3.5 h-3.5" /> Mensaje Completo
                                                    </button>
                                                </div>
                                                <div className="mt-3 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsGuideOpen(true);
                                                        }}
                                                        className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                                                    >
                                                        <Smartphone className="w-3 h-3" /> Ver instrucciones para instalar como 'App'
                                                    </button>
                                                </div>
                                                <InstallationGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
                                            </div>
                                        )}

                                        {/* Notas */}
                                        {(sale.admin_notes || sale.coach_notes) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {sale.admin_notes && (
                                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                                        <p className="text-xs font-bold text-blue-700 uppercase mb-1 flex items-center gap-1">
                                                            <Info className="w-3 h-3" /> Notas Admin
                                                        </p>
                                                        <p className="text-sm text-blue-900">{sale.admin_notes}</p>
                                                    </div>
                                                )}
                                                {sale.coach_notes && (
                                                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                                                        <p className="text-xs font-bold text-purple-700 uppercase mb-1 flex items-center gap-1">
                                                            <Info className="w-3 h-3" /> Notas
                                                        </p>
                                                        <p className="text-sm text-purple-900">{sale.coach_notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Acciones */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                                            <div className="flex gap-2">
                                                {sale.status !== 'failed' ? (
                                                    <button
                                                        onClick={() => handleUpdateStatus(sale.id, 'failed')}
                                                        className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 flex items-center gap-1"
                                                    >
                                                        <AlertTriangle className="w-3.5 h-3.5" /> Marcar Fallida
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleUpdateStatus(sale.id, 'pending_onboarding')}
                                                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center gap-1"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Recuperar
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setEditingSale(sale)}
                                                    className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-1"
                                                >
                                                    <Edit className="w-3.5 h-3.5" /> Editar
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleCommission(sale);
                                                    }}
                                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 ${sale.commission_paid
                                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                        }`}
                                                >
                                                    {sale.commission_paid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                                    {sale.commission_paid ? 'Cobrado' : 'Pendiente'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSale(sale.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredSales.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No hay ventas en este periodo</p>
                            <p className="text-sm text-slate-400 mt-1">Ajusta los filtros para ver mas resultados</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
