import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import {
    LayoutDashboard, TrendingUp, DollarSign, Users,
    Globe, PhoneCall, PieChart, BarChart2,
    Calendar, Save, AlertCircle, CheckCircle2,
    RefreshCw, Filter, Video, MousePointerClick,
    MessageCircle, Hash, Star
} from 'lucide-react';
import { useToast } from './ToastProvider';
import { Client, ClientStatus } from '../types';


// ================= TYPES =================
type TabType = 'monthly' | 'webinars' | 'client-profile';

interface ClientProfileData {
    total: number;
    byGender: { label: string; value: number; color: string }[];
    byAge: { label: string; value: number; color: string }[];
    byProvince: { label: string; value: number }[];
    byInsulin: { label: string; value: number; color: string }[];
    byContractDuration: { label: string; value: number; color: string }[];
    byStatus: { label: string; value: number; color: string }[];
    byDiabetesType: { label: string; value: number; color: string }[];
    topPathologies: { label: string; value: number }[];
}

interface BusinessSnapshot {
    id: string;
    snapshot_date: string;
    // RRSS
    ig_followers: number;
    yt_subs: number;
    email_subs: number;
    // marketing
    ad_investment: number;
    leads_count: number;
    // funnel
    outbound_conv: number;
    inbound_conv: number;
    forms_submitted: number;
    calls_scheduled: number;
    calls_presented: number;
    closed_sales: number;
    reservations: number;
    // financials
    billing_total: number;
    cash_collected: number;
    expenses: number;
    taxes: number;
    // ops (automated usually)
    active_clients: number;
    churn_rate: number;
    renewals_pct: number;
    success_cases_pct: number;
    referrals_count: number;
    lost_count?: number;
    abandonment_count?: number;
    // New metrics from Notion
    program_satisfaction?: number;
    ltv?: number;
    cac?: number;
    contracted_money?: number; // Different from cash collected
    operating_costs?: number;
    marketing_costs?: number;
    taxes_paid?: number;
    project?: string;
}

interface WebinarMetric {
    id: string;
    name: string;
    date: string;
    // marketing
    ad_investment: number;
    leads_total: number;
    leads_whatsapp: number;
    conversations: number;
    // attendance
    live_leads_start: number;
    live_leads_end: number;
    views_total: number; // replay + live
    attendance_pct: number;
    // funnel
    forms_submitted: number;
    contacted_count: number;
    calls_scheduled: number;
    calls_presented_pct: number;
    closing_pct: number;
    total_sales: number;
    // financials
    contracted_money: number;
    cash_collected: number;
    roas: number;
}

interface AdminAnalyticsProps {
    defaultTab?: TabType;
    initialProject?: 'Global' | 'PT' | 'ME';
}

// ================= COMPONENT =================
const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ defaultTab = 'monthly', initialProject = 'Global' }) => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
    const [monthlyView, setMonthlyView] = useState<'entry' | 'evolution' | 'compare' | 'table'>('table');
    // Sync activeTab if defaultTab changes (from sidebar navigation)
    useEffect(() => {
        if (defaultTab) {
            setActiveTab(defaultTab);
        }
    }, [defaultTab]);

    // Sync project if initialProject changes
    useEffect(() => {
        if (initialProject) {
            setSelectedProject(initialProject);
        }
    }, [initialProject]);

    const [loading, setLoading] = useState(false);

    // Data State
    const [monthlyData, setMonthlyData] = useState<BusinessSnapshot | null>(null);
    const [webinarList, setWebinarList] = useState<WebinarMetric[]>([]);
    const [selectedWebinarId, setSelectedWebinarId] = useState<string | 'new'>('new');
    const [selectedProject, setSelectedProject] = useState<'Global' | 'PT' | 'ME'>(initialProject);

    // Form States
    const [monthForm, setMonthForm] = useState<Partial<BusinessSnapshot>>({
        snapshot_date: new Date().toISOString().split('T')[0],
        ad_investment: 0, leads_count: 0, billing_total: 0, cash_collected: 0, expenses: 0, taxes: 0,
        active_clients: 0, lost_count: 0, abandonment_count: 0, referrals_count: 0,
        outbound_conv: 0, inbound_conv: 0, forms_submitted: 0, calls_scheduled: 0, calls_presented: 0, closed_sales: 0,
        program_satisfaction: 0, contracted_money: 0, operating_costs: 0, marketing_costs: 0, taxes_paid: 0,
        success_cases_pct: 0, renewals_pct: 0, churn_rate: 0
    });

    const [webinarForm, setWebinarForm] = useState<Partial<WebinarMetric>>({
        name: '',
        date: new Date().toISOString().split('T')[0],
        ad_investment: 0, leads_total: 0, leads_whatsapp: 0, conversations: 0,
        live_leads_start: 0, live_leads_end: 0, views_total: 0, attendance_pct: 0,
        forms_submitted: 0, contacted_count: 0, calls_scheduled: 0, calls_presented_pct: 0,
        closing_pct: 0, total_sales: 0, contracted_money: 0, cash_collected: 0, roas: 0
    });

    // Client Profile State
    const [clientProfile, setClientProfile] = useState<ClientProfileData | null>(null);

    // Monthly History State (for comparisons)
    const [monthlyHistory, setMonthlyHistory] = useState<BusinessSnapshot[]>([]);
    const [compareMonth1, setCompareMonth1] = useState<string>('');
    const [compareMonth2, setCompareMonth2] = useState<string>('');

    useEffect(() => {
        if (activeTab === 'monthly') {
            fetchMonthlyData();
            fetchMonthlyHistory();
        }
        else if (activeTab === 'webinars') fetchWebinars();
        else if (activeTab === 'client-profile') fetchClientProfile();
    }, [activeTab, selectedProject]);

    // ================= DATA FETCHING =================
    const fetchMonthlyData = async () => {
        setLoading(true);
        try {
            // Fetch for selected date (defaults to today/current month snapshot)
            const { data, error } = await supabase
                .from('business_snapshots')
                .select('*')
                .eq('snapshot_date', monthForm.snapshot_date)
                .eq('project', selectedProject)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setMonthlyData(data);
                setMonthForm(data); // Populate form
            } else {
                setMonthlyData(null);
                // Reset form numbers but keep date
                // setMonthForm({ ...initial, snapshot_date: monthForm.snapshot_date });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('business_snapshots')
                .select('*')
                .eq('project', selectedProject)
                .order('snapshot_date', { ascending: true });

            if (error) throw error;
            setMonthlyHistory(data || []);

            // Auto-select months for comparison if available
            if (data && data.length >= 2) {
                setCompareMonth1(data[data.length - 2].snapshot_date);
                setCompareMonth2(data[data.length - 1].snapshot_date);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        }
    };

    const fetchWebinars = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('webinar_metrics')
                .select('*')
                .order('date', { ascending: false });
            if (error) throw error;
            setWebinarList(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClientProfile = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clientes_pt_notion')
                .select('property_sexo, property_edad, property_provincia, property_insulina, property_contratado_f1, status');

            if (error) throw error;
            if (!data) return;

            const total = data.length;

            // Process Gender
            const genderCounts: Record<string, number> = { 'Mujer': 0, 'Hombre': 0, 'Sin datos': 0 };
            data.forEach(d => {
                const g = d.property_sexo || 'Sin datos';
                genderCounts[g] = (genderCounts[g] || 0) + 1;
            });
            const byGender = [
                { label: 'Mujer', value: genderCounts['Mujer'], color: '#ec4899' },
                { label: 'Hombre', value: genderCounts['Hombre'], color: '#3b82f6' },
                { label: 'Sin datos', value: genderCounts['Sin datos'], color: '#94a3b8' }
            ];

            // Process Age
            const ageCounts: Record<string, number> = { '18-30': 0, '31-45': 0, '46-60': 0, '61+': 0, 'Sin datos': 0 };
            data.forEach(d => {
                const age = d.property_edad;
                if (!age) ageCounts['Sin datos']++;
                else if (age <= 30) ageCounts['18-30']++;
                else if (age <= 45) ageCounts['31-45']++;
                else if (age <= 60) ageCounts['46-60']++;
                else ageCounts['61+']++;
            });
            const byAge = [
                { label: '18-30', value: ageCounts['18-30'], color: '#22c55e' },
                { label: '31-45', value: ageCounts['31-45'], color: '#3b82f6' },
                { label: '46-60', value: ageCounts['46-60'], color: '#8b5cf6' },
                { label: '61+', value: ageCounts['61+'], color: '#f59e0b' },
                { label: 'Sin datos', value: ageCounts['Sin datos'], color: '#94a3b8' }
            ];

            // Process Province
            const provCounts: Record<string, number> = {};
            data.forEach(d => {
                if (d.property_provincia) {
                    const p = String(d.property_provincia).trim();
                    provCounts[p] = (provCounts[p] || 0) + 1;
                }
            });
            const byProvince = Object.entries(provCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15)
                .map(([label, value]) => ({ label, value }));

            // Process Insulin
            const insulinCounts: Record<string, number> = { 'No': 0, 'Sí': 0, 'Sin datos': 0 };
            data.forEach(d => {
                const ins = d.property_insulina;
                if (!ins) insulinCounts['Sin datos']++;
                else if (ins.toLowerCase() === 'si' || ins.toLowerCase() === 'sí') insulinCounts['Sí']++;
                else insulinCounts['No']++;
            });
            const byInsulin = [
                { label: 'No usa insulina', value: insulinCounts['No'], color: '#22c55e' },
                { label: 'Usa insulina', value: insulinCounts['Sí'], color: '#ef4444' },
                { label: 'Sin datos', value: insulinCounts['Sin datos'], color: '#94a3b8' }
            ];

            // Process Contract Duration
            const durCounts: Record<string, number> = {};
            data.forEach(d => {
                const dur = d.property_contratado_f1 || 'Sin datos';
                durCounts[dur] = (durCounts[dur] || 0) + 1;
            });
            const durationColors: Record<string, string> = {
                '3 meses': '#22c55e', '6 meses': '#3b82f6', '12 meses': '#8b5cf6',
                '7 meses': '#f59e0b', '4 meses': '#06b6d4', '13 meses': '#ec4899',
                'Sin datos': '#94a3b8'
            };
            const byContractDuration = Object.entries(durCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([label, value]) => ({
                    label,
                    value,
                    color: durationColors[label] || '#64748b'
                }));

            // Process Status
            const statusCounts: Record<string, number> = {};
            data.forEach(d => {
                const s = d.status || 'unknown';
                statusCounts[s] = (statusCounts[s] || 0) + 1;
            });
            const statusColors: Record<string, string> = {
                'active': '#22c55e', 'inactive': '#94a3b8', 'paused': '#f59e0b', 'dropout': '#ef4444'
            };
            const statusLabels: Record<string, string> = {
                'active': 'Activos', 'inactive': 'Inactivos', 'paused': 'Pausados', 'dropout': 'Bajas'
            };
            const byStatus = Object.entries(statusCounts)
                .map(([key, value]) => ({
                    label: statusLabels[key] || key,
                    value,
                    color: statusColors[key] || '#64748b'
                }));

            // Process Diabetes Type
            const dbTypeCounts: Record<string, number> = { 'Tipo 1': 0, 'Tipo 2': 0, 'Gestacional': 0, 'Prediabetes': 0, 'Otro': 0, 'Sin datos': 0 };
            data.forEach(d => {
                const raw = d.property_diabetesType;
                if (!raw) dbTypeCounts['Sin datos']++;
                else if (raw.includes('Tipo 1')) dbTypeCounts['Tipo 1']++;
                else if (raw.includes('Tipo 2')) dbTypeCounts['Tipo 2']++;
                else if (raw.toLowerCase().includes('gestacional')) dbTypeCounts['Gestacional']++;
                else if (raw.toLowerCase().includes('pre')) dbTypeCounts['Prediabetes']++;
                else dbTypeCounts['Otro']++;
            });
            const dbColors: Record<string, string> = {
                'Tipo 1': '#3b82f6', 'Tipo 2': '#ef4444', 'Gestacional': '#8b5cf6',
                'Prediabetes': '#f59e0b', 'Otro': '#ec4899', 'Sin datos': '#94a3b8'
            };
            const byDiabetesType = Object.entries(dbTypeCounts)
                .filter(([_, value]) => value > 0)
                .map(([label, value]) => ({ label, value, color: dbColors[label] || '#64748b' }));

            // Process Pathologies (Top 10)
            const pathCounts: Record<string, number> = {};
            data.forEach(d => {
                const diseases = d.property_enfermedades || '';
                // Split by common separators and clean up
                const list = diseases.split(/[,;\n\r]/).map((s: string) => s.trim()).filter((s: string) => s.length > 2);
                list.forEach((p: string) => {
                    const normalized = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
                    pathCounts[normalized] = (pathCounts[normalized] || 0) + 1;
                });
            });
            const topPathologies = Object.entries(pathCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([label, value]) => ({ label, value }));

            setClientProfile({
                total,
                byGender,
                byAge,
                byProvince,
                byInsulin,
                byContractDuration,
                byStatus,
                byDiabetesType,
                topPathologies
            });

        } catch (err) {
            console.error('Error fetching client profile:', err);
            toast.error('Error al cargar perfil de clientes');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoFillFromCRM = async () => {
        setLoading(true);
        try {
            const targetDate = new Date(monthForm.snapshot_date);
            const m = targetDate.getMonth();
            const y = targetDate.getFullYear();

            // Calculate start and end of selected month for filtering
            const startOfMonth = new Date(y, m, 1);
            const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59);
            const startISO = startOfMonth.toISOString();
            const endISO = endOfMonth.toISOString();

            // 1. Fetch CLIENTS Data (Original Logic + Fixes)
            const { data: clients, error: clientsError } = await supabase
                .from('clientes_pt_notion')
                .select('*');

            if (clientsError) throw clientsError;

            // Filter clients by project if necessary
            const filteredClients = clients?.filter(c => {
                if (selectedProject === 'PT') return !c.high_ticket;
                if (selectedProject === 'ME') return c.high_ticket === true;
                return true; // Global
            }) || [];

            // Helper to check dates for clients (handling string formats)
            const isSameMonth = (dateStr?: string) => {
                if (!dateStr) return false;
                const dt = new Date(dateStr);
                return dt.getMonth() === m && dt.getFullYear() === y;
            };

            // Clients Logic (HISTORICAL)
            const activeNow = filteredClients.filter(c => {
                const startStr = c.start_date || c.registration_date;
                if (!startStr) return false;

                // Debe haber empezado antes del fin del mes
                const start = new Date(startStr);
                if (start > endOfMonth) return false;

                // Y no debe haber terminado antes del inicio del mes
                const endStr = c.abandonmentDate || c.inactiveDate;
                if (endStr) {
                    const end = new Date(endStr);
                    if (end < startOfMonth) return false;
                }

                return true;
            }).length || 0;

            // New Signups (Reservations/Altas) - Based on start_date in this month
            const newSignups = filteredClients.filter(c => {
                // start_date is usually the contract start
                return isSameMonth(c.start_date) || isSameMonth(c.registration_date);
            }).length || 0;

            // Lost Clients (Bajas Normales)
            const lostCount = filteredClients.filter(c => {
                return c.status === ClientStatus.INACTIVE && isSameMonth(c.abandonmentDate || c.inactiveDate);
            }).length || 0;

            // Abandonment Clients (Dropouts/Abandono)
            const abandonmentCount = filteredClients.filter(c => {
                return c.status === ClientStatus.DROPOUT && isSameMonth(c.abandonmentDate || c.inactiveDate);
            }).length || 0;

            const totalLost = lostCount + abandonmentCount;

            // Renewals Logic
            const targetRenewals = filteredClients.filter(c => {
                const phases = [c.program?.f1_endDate, c.program?.f2_endDate, c.program?.f3_endDate, c.program?.f4_endDate];
                return phases.some(p => isSameMonth(p));
            }) || [];

            const completedRenewals = targetRenewals.filter(c => {
                const phases = [
                    { date: c.program?.f1_endDate, contracted: c.program?.renewal_f2_contracted },
                    { date: c.program?.f2_endDate, contracted: c.program?.renewal_f3_contracted },
                    { date: c.program?.f3_endDate, contracted: c.program?.renewal_f4_contracted },
                    { date: c.program?.f4_endDate, contracted: c.program?.renewal_f5_contracted },
                ];
                return phases.some(p => isSameMonth(p.date) && p.contracted);
            }).length;

            const renewalPct = targetRenewals.length > 0 ? Math.round((completedRenewals / targetRenewals.length) * 100) : 0;
            const churnRate = activeNow > 0 ? parseFloat(((totalLost / activeNow) * 100).toFixed(1)) : 0;


            // 2. Fetch LEADS/SALES Funnel Data (New Logic from notion_leads_metrics)
            // Query leads that have an agenda date within the selected month
            // This gives us "Llamadas Agendadas" accurately
            let leadsQuery = supabase
                .from('notion_leads_metrics')
                .select('*')
                .gte('dia_agenda', startISO)
                .lte('dia_agenda', endISO);

            // Filter by project if not Global
            if (selectedProject !== 'Global') {
                leadsQuery = leadsQuery.eq('project', selectedProject);
            }

            const { data: leads, error: leadsError } = await leadsQuery;

            if (leadsError) {
                console.error("Error fetching leads metrics:", leadsError);
                toast.error("Error al cargar métricas de leads, se usarán solo datos de clientes.");
            }

            let callsScheduled = 0;
            let callsPresented = 0;
            let closedSales = 0;
            let inboundLeads = 0;
            let outboundLeads = 0;
            let formsCount = 0;
            let referralsCount = 0;
            const uniqueClosedLeads = new Set<string>();

            if (leads) {
                callsScheduled = leads.length;

                leads.forEach((l: any) => {
                    // Robust normalization matching SalesIntelligenceDashboard to prevent duplicates with/without "medico" suffix
                    const rawName = l.nombre_lead || '';
                    const normalizedName = rawName.toLowerCase()
                        .trim()
                        .replace(/\s+/g, ' ') // Collapse spaces
                        .replace(/\(medica\)|\(medico\)|medica|medico/g, '') // Remove medical tags
                        .trim()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents

                    const status = (l.estado_lead || '').toLowerCase();
                    const closerName = (l.closer || '').toLowerCase().trim();

                    // Valid Closers Filter (Crucial: Dashboard only counts these)
                    const VALID_CLOSERS = ['sergi', 'yassine', 'elena', 'raquel'];
                    const isValidCloser = VALID_CLOSERS.some(vc => closerName.includes(vc));

                    // Check Payment existence (User rule: No payment usually means no sale)
                    const procedencia = (l.procedencia || '').toLowerCase();
                    const inbOut = (l.inb_out || '').toLowerCase();

                    // Standardized statuses matching SalesIntelligenceDashboard exactly
                    const closureStatuses = ['cerrado', 'reserva de plaza', 'cierre', 'mes de prueba'];
                    const presentedStatuses = [...closureStatuses, 'no entra', 'no cierre', 'no cualifica'];
                    const matchesStatus = (st: string, list: string[]) => list.some(s => s === st.trim());

                    // Check Payment existence (User rule: No payment usually means no sale)
                    const pagoStr = (l.pago || '').toString().toLowerCase();
                    // Basic numeric check for payment only
                    const hasPayment = pagoStr.length > 0 && /[0-9]/.test(pagoStr);

                    // Refund/Return Logic checks both status and payment field
                    const refundKeywords = ['devolución', 'devolucion', 'reembolso', 'pide devolución', 'pide devolucion'];
                    const isRefund = refundKeywords.some(key => status.includes(key) || pagoStr.includes(key));

                    // Presented Logic
                    const isPresented = l.presentado === true || matchesStatus(status, presentedStatuses);
                    if (isPresented) callsPresented++;

                    // Closed Logic (STRICT Checkbox + NO Refund)
                    // We only count if the 'Cierre' checkbox is explicitly checked in Notion.
                    // This matches the Sales Dashboard stricter accounting.
                    const isClosedStatus = l.cierre === true;

                    if (isClosedStatus && !isRefund && isValidCloser) {
                        if (normalizedName && !uniqueClosedLeads.has(normalizedName)) {
                            uniqueClosedLeads.add(normalizedName);
                            closedSales++;
                        }
                    }

                    // Referrals Logic
                    if (procedencia.includes('referido') || procedencia.includes('antiguo cliente')) {
                        referralsCount++;
                    }

                    // Origin / Type Logic
                    // Infer inbound/outbound from 'inb_out' column or 'procedencia'
                    const isInbound = inbOut.includes('inbound') ||
                        procedencia.includes('instagram') ||
                        procedencia.includes('web') ||
                        procedencia.includes('youtube') ||
                        procedencia.includes('tiktok') ||
                        procedencia.includes('ads');

                    const isOutbound = inbOut.includes('outbound') ||
                        procedencia.includes('prospeccion') ||
                        procedencia.includes('setter') ||
                        procedencia.includes('linkedin');

                    if (isInbound) inboundLeads++;
                    else if (isOutbound) outboundLeads++;
                    else {
                        // Default logic if unknown
                        if (['referido', 'antiguo cliente'].some(s => procedencia.includes(s))) inboundLeads++;
                        else inboundLeads++; // Fallback to inbound usually
                    }

                    // Forms submitted - approximating to Inbound leads from digital channels
                    if (isInbound) formsCount++;
                });
            }

            // Update form state
            setMonthForm(prev => ({
                ...prev,
                // Operations
                active_clients: activeNow,
                reservations: newSignups,
                renewals_pct: renewalPct,
                churn_rate: churnRate,
                referrals_count: referralsCount,
                lost_count: lostCount,
                abandonment_count: abandonmentCount,

                // Sales Funnel (New Automation)
                leads_count: leads ? leads.length : prev.leads_count,
                calls_scheduled: callsScheduled,
                calls_presented: callsPresented,
                closed_sales: closedSales,
                outbound_conv: outboundLeads, // Mapping count to field
                inbound_conv: inboundLeads,   // Mapping count to field
                forms_submitted: formsCount
            }));

            toast.success('Datos importados: ' + closedSales + ' ventas encontradas en ' + callsScheduled + ' agendas.');
        } catch (err: any) {
            console.error(err);
            toast.error('Error crítico al importar datos: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ================= ACTIONS =================
    const handleSaveMonthly = async () => {
        setLoading(true);
        try {
            // Calculate computed fields if possible (e.g. EBITDA) in frontend or backend triggers
            // For now specific calculated fields are displayed but raw data is saved

            // Ensure snapshot_date is normalized to the first day of the month to avoid duplicates
            // Uses local date components to avoid timezone shifts
            const rawDate = new Date(monthForm.snapshot_date);
            const normalizedDate = new Date(Date.UTC(rawDate.getFullYear(), rawDate.getMonth(), 1)).toISOString().split('T')[0];

            const payload = {
                ...monthForm,
                snapshot_date: normalizedDate,
                project: selectedProject,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('business_snapshots')
                .upsert(payload, { onConflict: 'snapshot_date,project' });

            if (error) throw error;
            toast.success('Métricas mensuales guardadas');
            fetchMonthlyData();
        } catch (err: any) {
            toast.error('Error al guardar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveWebinar = async () => {
        if (!webinarForm.name) return toast.error('El nombre del webinar es obligatorio');
        setLoading(true);
        try {
            // Auto-calc ROAS if not manual
            const inv = Number(webinarForm.ad_investment) || 0;
            const cash = Number(webinarForm.cash_collected) || 0;
            const calculatedRoas = inv > 0 ? (cash / inv) : 0;

            const payload = {
                ...webinarForm,
                roas: parseFloat(calculatedRoas.toFixed(2)),
                updated_at: new Date().toISOString()
            };

            if (selectedWebinarId === 'new') {
                const { error } = await supabase.from('webinar_metrics').insert([payload]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('webinar_metrics')
                    .update(payload)
                    .eq('id', selectedWebinarId);
                if (error) throw error;
            }

            toast.success('Webinar guardado correctamente');
            fetchWebinars();
            // Reset to new
            setSelectedWebinarId('new');
            setWebinarForm({ name: '', date: new Date().toISOString().split('T')[0] });
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ================= HELPERS (Calculations) =================
    // Monthly calculated fields
    const billing = Number(monthForm.billing_total) || 0;
    const expenses = Number(monthForm.expenses) || 0;
    const ebitda = billing - expenses;
    const margin = billing > 0 ? ((ebitda / billing) * 100).toFixed(1) : "0";

    const investment = Number(monthForm.ad_investment) || 0;
    const leadsCount = Number(monthForm.leads_count) || 0;
    const cpl = leadsCount > 0 ? (investment / leadsCount).toFixed(2) : "0";

    // We assume 'reservations' is for "Altas nuevas" in the form
    const newSales = Number(monthForm.reservations) || 0;
    const cac = newSales > 0 ? (investment / newSales).toFixed(2) : "0";

    // Webinar calculated fields
    const webInv = Number(webinarForm.ad_investment) || 0;
    const webLeads = Number(webinarForm.leads_total) || 0;
    const webAssistance = webLeads > 0 ? ((Number(webinarForm.live_leads_start) / webLeads) * 100).toFixed(1) : "0";
    const webCash = Number(webinarForm.cash_collected) || 0;
    const webRoas = webInv > 0 ? (webCash / webInv).toFixed(2) : "0";
    const webClosing = Number(webinarForm.calls_presented_pct) > 0 ? ((Number(webinarForm.total_sales) / (Number(webinarForm.calls_scheduled) * (Number(webinarForm.calls_presented_pct) / 100))) * 100).toFixed(1) : "0";
    // Actually simplicity is better for manual entry forms, keep them mostly manual but show calculated badges.


    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <BarChart2 className="w-8 h-8 text-indigo-600" />
                        Business Analytics
                    </h1>
                    <p className="text-slate-500 font-medium">Centro de inteligencia de negocio y métricas clave.</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-2xl flex-wrap gap-1">
                    <button
                        onClick={() => setActiveTab('monthly')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'monthly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Métricas Mensuales
                    </button>
                    <button
                        onClick={() => setActiveTab('webinars')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'webinars' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Campañas Webinars
                    </button>
                    <button
                        onClick={() => setActiveTab('client-profile')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'client-profile' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Perfil del Cliente
                    </button>
                </div>
            </div>


            {/* ==================== MONTHLY VIEW ==================== */}
            {activeTab === 'monthly' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        {/* SUB-MENU: Entry / Evolution / Compare */}
                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 w-fit">
                            <button
                                onClick={() => setMonthlyView('table')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${monthlyView === 'table' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                📊 Cuadro de Mandos
                            </button>
                            <button
                                onClick={() => setMonthlyView('entry')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${monthlyView === 'entry' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                📝 Entrada
                            </button>
                            <button
                                onClick={() => setMonthlyView('evolution')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${monthlyView === 'evolution' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                📈 Evolución
                            </button>
                        </div>

                        {/* PROJECT SELECTOR */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                            {(['Global', 'PT', 'ME'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setSelectedProject(p)}
                                    className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${selectedProject === p ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ========== TABLE VIEW ========== */}
                    {monthlyView === 'table' && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-black text-slate-800 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-indigo-600" />
                                    Cuadro de Mandos Global PT
                                </h3>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Desliza para ver todas las métricas →</div>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-[11px] text-left border-collapse min-w-[2200px]">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr className="divide-x divide-slate-200">
                                            <th className="p-3 font-black text-slate-900 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Mes / Año</th>
                                            {/* RRSS */}
                                            <th className="p-3 font-black text-indigo-600 bg-indigo-50/50"># IG</th>
                                            <th className="p-3 font-black text-indigo-600 bg-indigo-50/50"># YT</th>
                                            <th className="p-3 font-black text-indigo-600 bg-indigo-50/50"># Email M.</th>
                                            {/* Marketing */}
                                            <th className="p-3 font-black text-slate-800"># Inversión</th>
                                            <th className="p-3 font-black text-slate-800">CPL (Ads)</th>
                                            <th className="p-3 font-black text-slate-800"># Leads</th>
                                            {/* Ventas */}
                                            <th className="p-3 font-black text-blue-600 bg-blue-50/30"># Conv O.</th>
                                            <th className="p-3 font-black text-blue-600 bg-blue-50/30"># Conv I.</th>
                                            <th className="p-3 font-black text-blue-600 bg-blue-50/30"># Agendas</th>
                                            <th className="p-3 font-black text-blue-600 bg-blue-50/30"># Presentes</th>
                                            <th className="p-3 font-black text-blue-700 bg-blue-100/50">% Cierre</th>
                                            <th className="p-3 font-black text-slate-900 bg-slate-100"># Altas</th>
                                            {/* Operaciones */}
                                            <th className="p-3 font-black text-emerald-600 bg-emerald-50/30">% Éxito</th>
                                            <th className="p-3 font-black text-emerald-600 bg-emerald-50/30">% Renov.</th>
                                            <th className="p-3 font-black text-emerald-600 bg-emerald-50/30">Satis.</th>
                                            <th className="p-3 font-black text-slate-900">Activos</th>
                                            <th className="p-3 font-black text-orange-600">Churn</th>
                                            <th className="p-3 font-black text-slate-700">Referidos</th>
                                            {/* Finanzas */}
                                            <th className="p-3 font-black text-violet-700 bg-violet-50">LTV</th>
                                            <th className="p-3 font-black text-violet-700 bg-violet-50">CAC</th>
                                            <th className="p-3 font-black text-indigo-700 bg-indigo-100/50">Contratado</th>
                                            <th className="p-3 font-black text-emerald-700 bg-emerald-100/50 font-black">Cash Real</th>
                                            <th className="p-3 font-black text-slate-900 border-l border-slate-300">Gastos</th>
                                            <th className="p-3 font-black text-slate-900 bg-slate-100">EBITDA</th>
                                            <th className="p-3 font-black text-slate-900 bg-slate-950 text-white">% Margen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {monthlyHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan={26} className="p-10 text-center text-slate-400 italic">No hay datos históricos registrados.</td>
                                            </tr>
                                        ) : (
                                            <>
                                                {monthlyHistory.map((m, idx) => {
                                                    const billing = Number(m.billing_total) || 0;
                                                    const cash = Number(m.cash_collected) || 0;
                                                    const expenses = Number(m.expenses) || 0;
                                                    const ebitdaVal = billing - expenses;
                                                    const marginVal = billing > 0 ? ((ebitdaVal / billing) * 100).toFixed(1) : "0";
                                                    const investmentVal = Number(m.ad_investment) || 0;
                                                    const leadsVal = Number(m.leads_count) || 0;
                                                    const cplVal = leadsVal > 0 ? (investmentVal / leadsVal).toFixed(2) : "0";
                                                    const presentedVal = Number(m.calls_presented) || 0;
                                                    const closedVal = Number(m.closed_sales) || 0;
                                                    const closingPctVal = presentedVal > 0 ? ((closedVal / presentedVal) * 100).toFixed(1) : "0";
                                                    const cacVal = closedVal > 0 ? (investmentVal / closedVal).toFixed(2) : "0";

                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors divide-x divide-slate-100">
                                                            <td className="p-3 font-black text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] uppercase">
                                                                {new Date(m.snapshot_date).toLocaleDateString('es', { month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td className="p-3 text-slate-600">{(m.ig_followers || 0).toLocaleString()}</td>
                                                            <td className="p-3 text-slate-600">{(m.yt_subs || 0).toLocaleString()}</td>
                                                            <td className="p-3 text-slate-600">{(m.email_subs || 0).toLocaleString()}</td>
                                                            <td className="p-3 font-medium text-slate-900">{(m.ad_investment || 0).toLocaleString()} €</td>
                                                            <td className="p-3 text-slate-500">{cplVal} €</td>
                                                            <td className="p-3 text-slate-600">{m.leads_count || 0}</td>
                                                            <td className="p-3 text-slate-500">{m.outbound_conv || 0}</td>
                                                            <td className="p-3 text-slate-500">{m.inbound_conv || 0}</td>
                                                            <td className="p-3 text-slate-500">{m.calls_scheduled || 0}</td>
                                                            <td className="p-3 text-slate-500">{m.calls_presented || 0}</td>
                                                            <td className="p-3 font-black text-blue-600">{closingPctVal}%</td>
                                                            <td className="p-3 font-black text-slate-900 bg-slate-50/50">{m.closed_sales || 0}</td>
                                                            <td className="p-3 text-emerald-600 font-bold">{m.success_cases_pct || 0}%</td>
                                                            <td className="p-3 text-emerald-600 font-bold">{m.renewals_pct || 0}%</td>
                                                            <td className="p-3 text-slate-500">{m.program_satisfaction || 0}</td>
                                                            <td className="p-3 font-bold text-slate-800">{m.active_clients || 0}</td>
                                                            <td className="p-3 text-orange-600">{m.churn_rate || 0}%</td>
                                                            <td className="p-3 text-slate-500">{m.referrals_count || 0}</td>
                                                            <td className="p-3 text-violet-600">{(m.ltv || 0).toLocaleString()} €</td>
                                                            <td className="p-3 text-violet-600">{cacVal} €</td>
                                                            <td className="p-3 font-black text-indigo-700 bg-indigo-50/30">{(m.billing_total || 0).toLocaleString()} €</td>
                                                            <td className="p-3 font-black text-emerald-700 bg-emerald-50/30">{(m.cash_collected || 0).toLocaleString()} €</td>
                                                            <td className="p-3 text-slate-400">{(m.expenses || 0).toLocaleString()} €</td>
                                                            <td className="p-3 font-black text-slate-900 bg-slate-50">{ebitdaVal.toLocaleString()} €</td>
                                                            <td className={`p-3 font-black ${Number(marginVal) > 25 ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
                                                                {marginVal}%
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {/* TOTALS ROW */}
                                                <tr className="bg-slate-900 text-white font-black divide-x divide-slate-800">
                                                    <td className="p-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-700">TOTALES / PROMEDIOS</td>
                                                    <td className="p-3" colSpan={3}>-</td>
                                                    <td className="p-3">{monthlyHistory.reduce((s, m) => s + (m.ad_investment || 0), 0).toLocaleString()} €</td>
                                                    <td className="p-3 text-indigo-300">{(monthlyHistory.reduce((s, m) => s + (m.ad_investment || 0), 0) / (monthlyHistory.reduce((s, m) => s + (m.leads_count || 1), 0) || 1)).toFixed(2)} €</td>
                                                    <td className="p-3">{monthlyHistory.reduce((s, m) => s + (m.leads_count || 0), 0).toLocaleString()}</td>
                                                    <td className="p-3" colSpan={4}>-</td>
                                                    <td className="p-3 text-blue-300">{(monthlyHistory.reduce((s, m) => s + (m.closed_sales || 0), 0) / (monthlyHistory.reduce((s, m) => s + (m.calls_presented || 1), 0) || 1) * 100).toFixed(1)}%</td>
                                                    <td className="p-3">{monthlyHistory.reduce((s, m) => s + (m.closed_sales || 0), 0).toLocaleString()}</td>
                                                    <td className="p-3 text-emerald-300">{(monthlyHistory.reduce((s, m) => s + (m.success_cases_pct || 0), 0) / (monthlyHistory.length || 1)).toFixed(1)}%</td>
                                                    <td className="p-3 text-emerald-300">{(monthlyHistory.reduce((s, m) => s + (m.renewals_pct || 0), 0) / (monthlyHistory.length || 1)).toFixed(1)}%</td>
                                                    <td className="p-3 text-emerald-300">{(monthlyHistory.reduce((s, m) => s + (m.program_satisfaction || 0), 0) / (monthlyHistory.length || 1)).toFixed(1)}</td>
                                                    <td className="p-3">-</td>
                                                    <td className="p-3 text-orange-300">{(monthlyHistory.reduce((s, m) => s + (m.churn_rate || 0), 0) / (monthlyHistory.length || 1)).toFixed(1)}%</td>
                                                    <td className="p-3">{monthlyHistory.reduce((s, m) => s + (m.referrals_count || 0), 0).toLocaleString()}</td>
                                                    <td className="p-3" colSpan={2}>-</td>
                                                    <td className="p-3 text-indigo-300">{monthlyHistory.reduce((s, m) => s + (m.billing_total || 0), 0).toLocaleString()} €</td>
                                                    <td className="p-3 text-emerald-300">{monthlyHistory.reduce((s, m) => s + (m.cash_collected || 0), 0).toLocaleString()} €</td>
                                                    <td className="p-3 text-slate-400">{monthlyHistory.reduce((s, m) => s + (m.expenses || 0), 0).toLocaleString()} €</td>
                                                    <td className="p-3">{monthlyHistory.reduce((s, m) => s + (Number(m.billing_total || 0) - Number(m.expenses || 0)), 0).toLocaleString()} €</td>
                                                    <td className="p-3 text-emerald-300">{((monthlyHistory.reduce((s, m) => s + (Number(m.billing_total || 0) - Number(m.expenses || 0)), 0)) / (monthlyHistory.reduce((s, m) => s + (m.billing_total || 1), 0) || 1) * 100).toFixed(1)}%</td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ========== ENTRY VIEW ========== */}
                    {monthlyView === 'entry' && (
                        <div className="space-y-8">
                            {/* KPI CARDS (Live Calc from Form) */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-indigo-900 text-white p-6 rounded-3xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">EBITDA (Est)</p>
                                    <h3 className="text-3xl font-black">{ebitda.toLocaleString()} €</h3>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${Number(margin) > 20 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10'}`}>
                                            {margin}% Margen
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                                        <Users className="w-3 h-3" /> Coste por Lead
                                    </p>
                                    <h3 className="text-2xl font-black text-slate-800">{cpl} €</h3>
                                    <p className="text-xs text-slate-400 mt-1">Inversión / Leads Totales</p>
                                </div>
                                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                                        <PhoneCall className="w-3 h-3" /> Cierre Ventas
                                    </p>
                                    <h3 className="text-2xl font-black text-slate-800">
                                        {Number(monthForm.calls_presented) > 0
                                            ? ((Number(monthForm.closed_sales) / Number(monthForm.calls_presented)) * 100).toFixed(1)
                                            : 0}%
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">De llamadas presentadas</p>
                                </div>
                                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">DINERO EFECTIVO (CASH)</p>
                                    <h3 className="text-2xl font-black text-emerald-600">{Number(monthForm.cash_collected).toLocaleString()} €</h3>
                                    <p className="text-xs text-slate-400 mt-1">Dinero Contratado: {Number(monthForm.billing_total).toLocaleString()} €</p>
                                </div>
                            </div>

                            {/* DATA ENTRY FORM */}
                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                                <div className="bg-slate-50/50 p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">Entrada de Datos Mensual</h3>
                                        <p className="text-xs text-slate-500">Actualiza los datos del mes para generar los informes.</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                                        <Calendar className="w-4 h-4 text-slate-400 ml-2" />
                                        <input
                                            type="date"
                                            value={monthForm.snapshot_date}
                                            onChange={(e) => setMonthForm({ ...monthForm, snapshot_date: e.target.value })}
                                            onBlur={fetchMonthlyData} // Reload when date changes focus out
                                            className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                                        />
                                        <button onClick={fetchMonthlyData} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                                            <RefreshCw size={14} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleAutoFillFromCRM}
                                        disabled={loading}
                                        className="text-xs font-black bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all flex items-center gap-2"
                                    >
                                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                        IMPORTAR DATOS DEL CRM
                                    </button>
                                </div>

                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                                    {/* SECTION: RRSS & MARKETING */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Marketing & RRSS</h4>
                                        <NumberInput label="Seguidores Instagram" value={monthForm.ig_followers} onChange={v => setMonthForm({ ...monthForm, ig_followers: v })} icon={Users} />
                                        <NumberInput label="Suscriptores YouTube" value={monthForm.yt_subs} onChange={v => setMonthForm({ ...monthForm, yt_subs: v })} icon={Video} />
                                        <NumberInput label="Subs Email Mkt" value={monthForm.email_subs} onChange={v => setMonthForm({ ...monthForm, email_subs: v })} icon={MessageCircle} />
                                        <NumberInput label="Inversión Publicidad (€)" value={monthForm.ad_investment} onChange={v => setMonthForm({ ...monthForm, ad_investment: v })} icon={DollarSign} color="text-red-500" />
                                        <NumberInput label="Leads Totales" value={monthForm.leads_count} onChange={v => setMonthForm({ ...monthForm, leads_count: v })} icon={Filter} />
                                    </div>

                                    {/* SECTION: SALES FUNNEL */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Pipeline de Ventas</h4>
                                        <NumberInput label="Conv. Outbound" value={monthForm.outbound_conv} onChange={v => setMonthForm({ ...monthForm, outbound_conv: v })} />
                                        <NumberInput label="Conv. Inbound" value={monthForm.inbound_conv} onChange={v => setMonthForm({ ...monthForm, inbound_conv: v })} />
                                        <NumberInput label="Formularios Recibidos" value={monthForm.forms_submitted} onChange={v => setMonthForm({ ...monthForm, forms_submitted: v })} />
                                        <NumberInput label="Llamadas Agendadas" value={monthForm.calls_scheduled} onChange={v => setMonthForm({ ...monthForm, calls_scheduled: v })} />
                                        <NumberInput label="Llamadas Presentadas" value={monthForm.calls_presented} onChange={v => setMonthForm({ ...monthForm, calls_presented: v })} />
                                        <NumberInput label="Ventas Cerradas" value={monthForm.closed_sales} onChange={v => setMonthForm({ ...monthForm, closed_sales: v })} />
                                    </div>

                                    {/* SECTION: OPERATIONS */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Operaciones</h4>
                                        <NumberInput label="Clientes Activos" value={monthForm.active_clients} onChange={v => setMonthForm({ ...monthForm, active_clients: v })} />
                                        <NumberInput label="Altas Nuevas" value={monthForm.reservations} onChange={v => setMonthForm({ ...monthForm, reservations: v })} />
                                        <NumberInput label="Renovaciones (%)" value={monthForm.renewals_pct} onChange={v => setMonthForm({ ...monthForm, renewals_pct: v })} />
                                        <NumberInput label="Churn Rate (%)" value={monthForm.churn_rate} onChange={v => setMonthForm({ ...monthForm, churn_rate: v })} />
                                        <NumberInput label="Satisfacción Media (1-10)" value={monthForm.program_satisfaction} onChange={v => setMonthForm({ ...monthForm, program_satisfaction: v })} icon={Star} color="text-yellow-500" />
                                        <NumberInput label="Bajas (Churn)" value={monthForm.lost_count} onChange={v => setMonthForm({ ...monthForm, lost_count: v })} color="text-orange-500" />
                                        <NumberInput label="Abandono (Dropout)" value={monthForm.abandonment_count} onChange={v => setMonthForm({ ...monthForm, abandonment_count: v })} color="text-red-500" />
                                        <NumberInput label="Referidos" value={monthForm.referrals_count} onChange={v => setMonthForm({ ...monthForm, referrals_count: v })} />
                                    </div>

                                    {/* SECTION: FINANCIALS */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Finanzas</h4>
                                        <NumberInput label="Dinero Contratado (€)" value={monthForm.billing_total} onChange={v => setMonthForm({ ...monthForm, billing_total: v })} icon={DollarSign} color="text-indigo-600" />
                                        <NumberInput label="Dinero Efectivo (€)" value={monthForm.cash_collected} onChange={v => setMonthForm({ ...monthForm, cash_collected: v })} icon={DollarSign} color="text-emerald-600" />
                                        <NumberInput label="Gastos Operativos (€)" value={monthForm.operating_costs} onChange={v => setMonthForm({ ...monthForm, operating_costs: v })} />
                                        <NumberInput label="Gastos Marketing (€)" value={monthForm.marketing_costs} onChange={v => setMonthForm({ ...monthForm, marketing_costs: v })} />
                                        <NumberInput label="Impuestos (€)" value={monthForm.taxes} onChange={v => setMonthForm({ ...monthForm, taxes: v })} />
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                                    <button
                                        onClick={handleSaveMonthly}
                                        disabled={loading}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
                                    >
                                        {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                                        Guardar Métricas Mes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========== EVOLUTION VIEW ========== */}
                    {monthlyView === 'evolution' && (
                        <div className="space-y-6">
                            {monthlyHistory.length < 2 ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                                    <TrendingUp className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-black text-amber-800 mb-2">Aún no hay suficientes datos</h3>
                                    <p className="text-sm text-amber-600">
                                        Necesitas al menos <strong>2 meses</strong> de datos guardados para ver la evolución.
                                        <br />Ve a "Entrada de Datos" y guarda datos de diferentes meses.
                                    </p>
                                    <p className="text-xs text-amber-500 mt-4">
                                        Meses guardados: <strong>{monthlyHistory.length}</strong>
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* SUMMARY KPIs */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-5 rounded-2xl">
                                            <p className="text-indigo-200 text-xs font-bold uppercase">Meses Registrados</p>
                                            <h3 className="text-3xl font-black">{monthlyHistory.length}</h3>
                                        </div>
                                        <div className="bg-white border border-slate-200 p-5 rounded-2xl">
                                            <p className="text-slate-400 text-xs font-bold uppercase">Total Facturado (YTD)</p>
                                            <h3 className="text-2xl font-black text-slate-800">
                                                {monthlyHistory.reduce((sum, m) => sum + (m.billing_total || 0), 0).toLocaleString()} €
                                            </h3>
                                        </div>
                                        <div className="bg-white border border-slate-200 p-5 rounded-2xl">
                                            <p className="text-slate-400 text-xs font-bold uppercase">Total Cash (YTD)</p>
                                            <h3 className="text-2xl font-black text-emerald-600">
                                                {monthlyHistory.reduce((sum, m) => sum + (m.cash_collected || 0), 0).toLocaleString()} €
                                            </h3>
                                        </div>
                                        <div className="bg-white border border-slate-200 p-5 rounded-2xl">
                                            <p className="text-slate-400 text-xs font-bold uppercase">Promedio EBITDA</p>
                                            <h3 className="text-2xl font-black text-indigo-600">
                                                {Math.round(monthlyHistory.reduce((sum, m) => sum + ((m.billing_total || 0) - (m.expenses || 0)), 0) / monthlyHistory.length).toLocaleString()} €
                                            </h3>
                                        </div>
                                    </div>

                                    {/* EVOLUTION CHART - Facturación & Cash */}
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-indigo-500" />
                                            Evolución de Facturación y Cash
                                        </h3>
                                        <div className="h-64 relative">
                                            {/* Simple SVG Bar Chart */}
                                            <svg viewBox={`0 0 ${monthlyHistory.length * 80} 200`} className="w-full h-full" preserveAspectRatio="none">
                                                {monthlyHistory.map((m, i) => {
                                                    const maxVal = Math.max(...monthlyHistory.map(h => Math.max(h.billing_total || 0, h.cash_collected || 0)));
                                                    const billingHeight = maxVal > 0 ? ((m.billing_total || 0) / maxVal) * 150 : 0;
                                                    const cashHeight = maxVal > 0 ? ((m.cash_collected || 0) / maxVal) * 150 : 0;
                                                    return (
                                                        <g key={i}>
                                                            {/* Billing bar */}
                                                            <rect
                                                                x={i * 80 + 10}
                                                                y={180 - billingHeight}
                                                                width="25"
                                                                height={billingHeight}
                                                                fill="#6366f1"
                                                                rx="4"
                                                            />
                                                            {/* Cash bar */}
                                                            <rect
                                                                x={i * 80 + 40}
                                                                y={180 - cashHeight}
                                                                width="25"
                                                                height={cashHeight}
                                                                fill="#10b981"
                                                                rx="4"
                                                            />
                                                            {/* Month label */}
                                                            <text
                                                                x={i * 80 + 40}
                                                                y="195"
                                                                textAnchor="middle"
                                                                className="text-[10px] fill-slate-500 font-medium"
                                                            >
                                                                {new Date(m.snapshot_date).toLocaleDateString('es', { month: 'short' })}
                                                            </text>
                                                        </g>
                                                    );
                                                })}
                                            </svg>
                                            {/* Legend */}
                                            <div className="absolute top-0 right-0 flex gap-4 text-xs">
                                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500"></span> D. Contratado</span>
                                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500"></span> D. Efectivo</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* EVOLUTION TABLE */}
                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                        <div className="p-4 border-b border-slate-100">
                                            <h3 className="font-black text-slate-800">Histórico Detallado</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="text-left p-3 font-bold text-slate-500">Mes</th>
                                                        <th className="text-right p-3 font-bold text-slate-500">D. Contratado</th>
                                                        <th className="text-right p-3 font-bold text-slate-500">D. Efectivo</th>
                                                        <th className="text-right p-3 font-bold text-slate-500">Gastos</th>
                                                        <th className="text-right p-3 font-bold text-slate-500">EBITDA</th>
                                                        <th className="text-right p-3 font-bold text-slate-500">Leads</th>
                                                        <th className="text-right p-3 font-bold text-slate-500">Clientes</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {monthlyHistory.map((m, i) => (
                                                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                                            <td className="p-3 font-bold text-slate-700">
                                                                {new Date(m.snapshot_date).toLocaleDateString('es', { month: 'long', year: 'numeric' })}
                                                            </td>
                                                            <td className="p-3 text-right text-indigo-600 font-bold">{(m.billing_total || 0).toLocaleString()} €</td>
                                                            <td className="p-3 text-right text-emerald-600 font-bold">{(m.cash_collected || 0).toLocaleString()} €</td>
                                                            <td className="p-3 text-right text-orange-500 font-bold">{(m.expenses || 0).toLocaleString()} €</td>
                                                            <td className="p-3 text-right font-black text-slate-800">{((m.billing_total || 0) - (m.expenses || 0)).toLocaleString()} €</td>
                                                            <td className="p-3 text-right text-slate-600">{m.leads_count || 0}</td>
                                                            <td className="p-3 text-right text-slate-600">{m.active_clients || 0}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ========== COMPARE VIEW ========== */}
                    {monthlyView === 'compare' && (
                        <div className="space-y-6">
                            {monthlyHistory.length < 2 ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                                    <BarChart2 className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-black text-amber-800 mb-2">Necesitas más datos</h3>
                                    <p className="text-sm text-amber-600">
                                        Para comparar meses, necesitas al menos <strong>2 meses</strong> guardados.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* MONTH SELECTORS */}
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                        <h3 className="text-lg font-black text-slate-800 mb-4">Selecciona los meses a comparar</h3>
                                        <div className="flex flex-wrap gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Mes 1 (Base)</label>
                                                <select
                                                    value={compareMonth1}
                                                    onChange={(e) => setCompareMonth1(e.target.value)}
                                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                                                >
                                                    {monthlyHistory.map(m => (
                                                        <option key={m.snapshot_date} value={m.snapshot_date}>
                                                            {new Date(m.snapshot_date).toLocaleDateString('es', { month: 'long', year: 'numeric' })}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex items-end pb-2">
                                                <span className="text-2xl text-slate-300">→</span>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Mes 2 (Comparar)</label>
                                                <select
                                                    value={compareMonth2}
                                                    onChange={(e) => setCompareMonth2(e.target.value)}
                                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                                                >
                                                    {monthlyHistory.map(m => (
                                                        <option key={m.snapshot_date} value={m.snapshot_date}>
                                                            {new Date(m.snapshot_date).toLocaleDateString('es', { month: 'long', year: 'numeric' })}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* COMPARISON TABLE */}
                                    {(() => {
                                        const m1 = monthlyHistory.find(m => m.snapshot_date === compareMonth1);
                                        const m2 = monthlyHistory.find(m => m.snapshot_date === compareMonth2);
                                        if (!m1 || !m2) return null;

                                        const metrics = [
                                            { label: 'Dinero Contratado', key: 'billing_total', format: 'currency' },
                                            { label: 'Dinero Efectivo', key: 'cash_collected', format: 'currency' },
                                            { label: 'Gastos', key: 'expenses', format: 'currency' },
                                            { label: 'Inversión Ads', key: 'ad_investment', format: 'currency' },
                                            { label: 'Leads', key: 'leads_count', format: 'number' },
                                            { label: 'Clientes Activos', key: 'active_clients', format: 'number' },
                                            { label: 'Altas Nuevas', key: 'reservations', format: 'number' },
                                            { label: 'Ventas Cerradas', key: 'closed_sales', format: 'number' },
                                            { label: 'Renovaciones %', key: 'renewals_pct', format: 'percent' },
                                            { label: 'Churn Rate %', key: 'churn_rate', format: 'percent' },
                                        ];

                                        return (
                                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                                <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                                    <div className="p-4">Métrica</div>
                                                    <div className="p-4 text-center">{new Date(compareMonth1).toLocaleDateString('es', { month: 'short', year: '2-digit' })}</div>
                                                    <div className="p-4 text-center">{new Date(compareMonth2).toLocaleDateString('es', { month: 'short', year: '2-digit' })}</div>
                                                    <div className="p-4 text-center">Cambio</div>
                                                </div>
                                                {metrics.map((metric, i) => {
                                                    const val1 = (m1 as any)[metric.key] || 0;
                                                    const val2 = (m2 as any)[metric.key] || 0;
                                                    const diff = val2 - val1;
                                                    const pctChange = val1 > 0 ? ((diff / val1) * 100).toFixed(1) : '∞';
                                                    const isPositive = metric.key === 'churn_rate' || metric.key === 'expenses' ? diff < 0 : diff > 0;

                                                    const formatVal = (v: number) => {
                                                        if (metric.format === 'currency') return `${v.toLocaleString()} €`;
                                                        if (metric.format === 'percent') return `${v}%`;
                                                        return v.toString();
                                                    };

                                                    return (
                                                        <div key={i} className="grid grid-cols-4 border-b border-slate-100 hover:bg-slate-50">
                                                            <div className="p-4 font-bold text-slate-700">{metric.label}</div>
                                                            <div className="p-4 text-center font-mono text-slate-600">{formatVal(val1)}</div>
                                                            <div className="p-4 text-center font-mono text-slate-600">{formatVal(val2)}</div>
                                                            <div className={`p-4 text-center font-bold ${isPositive ? 'text-emerald-600' : diff === 0 ? 'text-slate-400' : 'text-red-500'}`}>
                                                                {diff === 0 ? '—' : (
                                                                    <>
                                                                        {diff > 0 ? '+' : ''}{metric.format === 'currency' ? `${diff.toLocaleString()}€` : diff}
                                                                        <span className="text-xs ml-1">({pctChange}%)</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ==================== WEBINARS VIEW ==================== */}
            {activeTab === 'webinars' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: LIST OF WEBINARS */}
                    <div className="lg:col-span-1 space-y-4">
                        <button
                            onClick={() => {
                                setSelectedWebinarId('new');
                                setWebinarForm({ name: '', date: new Date().toISOString().split('T')[0] });
                            }}
                            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                        >
                            <Calendar className="w-5 h-5" /> Registrar Nuevo Webinar
                        </button>

                        <div className="space-y-3">
                            {webinarList.map(w => (
                                <div
                                    key={w.id}
                                    onClick={() => { setSelectedWebinarId(w.id); setWebinarForm(w); }}
                                    className={`p-4 rounded-2xl cursor-pointer transition-all border ${selectedWebinarId === w.id ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-bold text-sm ${selectedWebinarId === w.id ? 'text-indigo-900' : 'text-slate-700'}`}>{w.name}</h4>
                                        <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg text-slate-500 font-mono">{w.date}</span>
                                    </div>
                                    <div className="flex gap-3 mt-3">
                                        <div className="text-center bg-white/50 p-1.5 rounded-lg flex-1">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">ROAS</p>
                                            <p className={`text-xs font-black ${w.roas >= 4 ? 'text-emerald-600' : 'text-slate-700'}`}>{w.roas}x</p>
                                        </div>
                                        <div className="text-center bg-white/50 p-1.5 rounded-lg flex-1">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Cash</p>
                                            <p className="text-xs font-black text-slate-700">{w.cash_collected > 1000 ? (w.cash_collected / 1000).toFixed(1) + 'k' : w.cash_collected}€</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: FORM */}
                    <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
                        <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">{selectedWebinarId === 'new' ? 'Nuevo Webinar' : 'Editar Webinar'}</h3>
                                <p className="text-xs text-slate-500 font-medium mt-1">Introduce los datos post-evento para calcular rentabilidad.</p>
                            </div>
                            {selectedWebinarId !== 'new' && (
                                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold">
                                    Editando ID: ...{selectedWebinarId.slice(-4)}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5">Nombre del Evento</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Ej: Masterclass Diabetes Enero"
                                    value={webinarForm.name}
                                    onChange={e => setWebinarForm({ ...webinarForm, name: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5">Fecha</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    value={webinarForm.date}
                                    onChange={e => setWebinarForm({ ...webinarForm, date: e.target.value })}
                                />
                            </div>

                            {/* MARKETING */}
                            <div className="col-span-2 pt-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4 flex items-center gap-2"><Filter size={14} /> Captación</h4>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <NumberInput label="Inversión Ads (€)" value={webinarForm.ad_investment} onChange={v => setWebinarForm({ ...webinarForm, ad_investment: v })} />
                                    <div className="group">
                                        <NumberInput label="Leads Totales" value={webinarForm.leads_total} onChange={v => setWebinarForm({ ...webinarForm, leads_total: v })} />
                                        <div className="text-[10px] mt-1 font-bold text-indigo-500">CPL: {(webInv / (webLeads || 1)).toFixed(2)}€</div>
                                    </div>
                                    <NumberInput label="Leads WhatsApp" value={webinarForm.leads_whatsapp} onChange={v => setWebinarForm({ ...webinarForm, leads_whatsapp: v })} />
                                    <NumberInput label="Conversaciones" value={webinarForm.conversations} onChange={v => setWebinarForm({ ...webinarForm, conversations: v })} />
                                </div>
                            </div>

                            {/* ATTENDANCE */}
                            <div className="col-span-2 pt-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4 flex items-center gap-2"><Users size={14} /> Directo & Asistencia</h4>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <NumberInput label="Asistentes Inicio" value={webinarForm.live_leads_start} onChange={v => setWebinarForm({ ...webinarForm, live_leads_start: v })} />
                                    <NumberInput label="Asistentes Final" value={webinarForm.live_leads_end} onChange={v => setWebinarForm({ ...webinarForm, live_leads_end: v })} />
                                    <NumberInput label="Views Totales" value={webinarForm.views_total} onChange={v => setWebinarForm({ ...webinarForm, views_total: v })} />
                                    <div className="group">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">Asistencia %</label>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black text-indigo-600">
                                            {webAssistance}%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SALES */}
                            <div className="col-span-2 pt-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4 flex items-center gap-2"><DollarSign size={14} /> Ventas & Cierre</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <NumberInput label="Formularios" value={webinarForm.forms_submitted} onChange={v => setWebinarForm({ ...webinarForm, forms_submitted: v })} />
                                    <NumberInput label="Contactados" value={webinarForm.contacted_count} onChange={v => setWebinarForm({ ...webinarForm, contacted_count: v })} />
                                    <NumberInput label="Llamadas Agend." value={webinarForm.calls_scheduled} onChange={v => setWebinarForm({ ...webinarForm, calls_scheduled: v })} />
                                    <NumberInput label="% Show Up" value={webinarForm.calls_presented_pct} onChange={v => setWebinarForm({ ...webinarForm, calls_presented_pct: v })} />
                                    <div className="group">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">% Cierre (Calc)</label>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black text-indigo-600">
                                            {webClosing}%
                                        </div>
                                    </div>
                                    <NumberInput label="Altas Totales" value={webinarForm.total_sales} onChange={v => setWebinarForm({ ...webinarForm, total_sales: v })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <NumberInput label="Dinero Contratado (€)" value={webinarForm.contracted_money} onChange={v => setWebinarForm({ ...webinarForm, contracted_money: v })} color="text-indigo-600" />
                                    <div className="group">
                                        <NumberInput label="Cash Collected (€)" value={webinarForm.cash_collected} onChange={v => setWebinarForm({ ...webinarForm, cash_collected: v })} color="text-emerald-600" />
                                        <div className="text-xs mt-1 font-black text-indigo-600">ROAS: {webRoas}x</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={handleSaveWebinar}
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                            >
                                {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                                Guardar Datos Webinar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== CLIENT PROFILE VIEW ==================== */}
            {activeTab === 'client-profile' && (
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    ) : clientProfile ? (
                        <>
                            {/* SUMMARY CARDS */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-6 rounded-3xl">
                                    <p className="text-indigo-200 text-xs font-bold uppercase mb-1">Total Clientes</p>
                                    <h3 className="text-4xl font-black">{clientProfile.total}</h3>
                                </div>
                                <div className="bg-white border border-slate-200 p-6 rounded-3xl">
                                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Activos</p>
                                    <h3 className="text-3xl font-black text-emerald-600">
                                        {clientProfile.byStatus.find(s => s.label === 'Activos')?.value || 0}
                                    </h3>
                                </div>
                                <div className="bg-white border border-slate-200 p-6 rounded-3xl">
                                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Usa Insulina</p>
                                    <h3 className="text-3xl font-black text-amber-600">
                                        {clientProfile.byInsulin.find(i => i.label === 'Usa insulina')?.value || 0}
                                        <span className="text-lg text-slate-400 ml-1">
                                            ({((clientProfile.byInsulin.find(i => i.label === 'Usa insulina')?.value || 0) / clientProfile.total * 100).toFixed(0)}%)
                                        </span>
                                    </h3>
                                </div>
                                <div className="bg-white border border-slate-200 p-6 rounded-3xl">
                                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">% Mujeres</p>
                                    <h3 className="text-3xl font-black text-pink-500">
                                        {((clientProfile.byGender.find(g => g.label === 'Mujer')?.value || 0) /
                                            (clientProfile.total - (clientProfile.byGender.find(g => g.label === 'Sin datos')?.value || 0)) * 100).toFixed(0)}%
                                    </h3>
                                </div>
                            </div>

                            {/* CHARTS ROW 1: Gender & Age */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Gender Distribution */}
                                <div className="bg-white rounded-3xl border border-slate-200 p-6">
                                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-pink-500" />
                                        Distribución por Sexo
                                    </h3>
                                    <div className="flex items-center gap-6">
                                        <div className="relative w-40 h-40">
                                            <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                                {(() => {
                                                    let cumulative = 0;
                                                    const total = clientProfile.byGender.reduce((acc, g) => acc + g.value, 0);
                                                    return clientProfile.byGender.map((segment, i) => {
                                                        const pct = (segment.value / total) * 100;
                                                        const dashArray = `${pct} ${100 - pct}`;
                                                        const dashOffset = -cumulative;
                                                        cumulative += pct;
                                                        return (
                                                            <circle
                                                                key={i}
                                                                cx="50" cy="50" r="40"
                                                                fill="none"
                                                                stroke={segment.color}
                                                                strokeWidth="20"
                                                                strokeDasharray={dashArray}
                                                                strokeDashoffset={dashOffset}
                                                                pathLength="100"
                                                            />
                                                        );
                                                    });
                                                })()}
                                            </svg>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            {clientProfile.byGender.map((g, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }}></div>
                                                        <span className="text-sm font-medium text-slate-600">{g.label}</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-800">{g.value} ({((g.value / clientProfile.total) * 100).toFixed(0)}%)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Age Distribution */}
                                <div className="bg-white rounded-3xl border border-slate-200 p-6">
                                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-blue-500" />
                                        Distribución por Edad
                                    </h3>
                                    <div className="space-y-3">
                                        {clientProfile.byAge.filter(a => a.label !== 'Sin datos').map((age, i) => {
                                            const maxVal = Math.max(...clientProfile.byAge.map(a => a.value));
                                            const pct = (age.value / maxVal) * 100;
                                            return (
                                                <div key={i}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="font-medium text-slate-600">{age.label} años</span>
                                                        <span className="font-bold text-slate-800">{age.value} ({((age.value / clientProfile.total) * 100).toFixed(0)}%)</span>
                                                    </div>
                                                    <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${pct}%`, backgroundColor: age.color }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* CHARTS ROW 2: Diabetes Type & Insulin/Status */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Diabetes Type Distribution */}
                                <div className="bg-white rounded-3xl border border-slate-200 p-6">
                                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                        <PieChart className="w-5 h-5 text-indigo-500" />
                                        Tipo de Diabetes
                                    </h3>
                                    <div className="flex items-center gap-6">
                                        <div className="relative w-40 h-40">
                                            <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                                {(() => {
                                                    let cumulative = 0;
                                                    const total = clientProfile.byDiabetesType.reduce((acc, g) => acc + g.value, 0);
                                                    return clientProfile.byDiabetesType.map((segment, i) => {
                                                        const pct = (segment.value / total) * 100;
                                                        const dashArray = `${pct} ${100 - pct}`;
                                                        const dashOffset = -cumulative;
                                                        cumulative += pct;
                                                        return (
                                                            <circle
                                                                key={i}
                                                                cx="50" cy="50" r="40"
                                                                fill="none"
                                                                stroke={segment.color}
                                                                strokeWidth="20"
                                                                strokeDasharray={dashArray}
                                                                strokeDashoffset={dashOffset}
                                                                pathLength="100"
                                                            />
                                                        );
                                                    });
                                                })()}
                                            </svg>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            {clientProfile.byDiabetesType.map((g, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }}></div>
                                                        <span className="text-sm font-medium text-slate-600">{g.label}</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-800">{g.value} ({((g.value / clientProfile.total) * 100).toFixed(0)}%)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Insulin & Status */}
                                <div className="space-y-6">
                                    {/* Insulin */}
                                    <div className="bg-white rounded-3xl border border-slate-200 p-6">
                                        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                            Uso de Insulina
                                        </h3>
                                        <div className="flex gap-3">
                                            {clientProfile.byInsulin.filter(i => i.label !== 'Sin datos').map((ins, i) => {
                                                const pct = ((ins.value / clientProfile.total) * 100).toFixed(0);
                                                return (
                                                    <div key={i} className="flex-1 text-center p-4 rounded-2xl" style={{ backgroundColor: ins.color + '15' }}>
                                                        <div className="text-3xl font-black" style={{ color: ins.color }}>{ins.value}</div>
                                                        <div className="text-xs font-bold text-slate-500 mt-1">{ins.label}</div>
                                                        <div className="text-sm font-bold mt-1" style={{ color: ins.color }}>{pct}%</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="bg-white rounded-3xl border border-slate-200 p-6">
                                        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                            <BarChart2 className="w-5 h-5 text-indigo-500" />
                                            Estado de Clientes
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {clientProfile.byStatus.map((status, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                                                    <div>
                                                        <div className="text-lg font-black text-slate-800">{status.value}</div>
                                                        <div className="text-xs font-medium text-slate-500">{status.label}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CHARTS ROW 3: Province & Top Pathologies */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Province Distribution */}
                                <div className="bg-white rounded-3xl border border-slate-200 p-6">
                                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-emerald-500" />
                                        Top 15 Provincias
                                    </h3>
                                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                        {clientProfile.byProvince.map((prov, i) => {
                                            const maxVal = clientProfile.byProvince[0]?.value || 1;
                                            const pct = (prov.value / maxVal) * 100;
                                            return (
                                                <div key={i} className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between text-sm mb-0.5">
                                                            <span className="font-medium text-slate-700">{prov.label}</span>
                                                            <span className="font-bold text-slate-800">{prov.value}</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                                                                style={{ width: `${pct}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Top Pathologies */}
                                <div className="bg-white rounded-3xl border border-slate-200 p-6">
                                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                        <Hash className="w-5 h-5 text-orange-500" />
                                        Top 10 Patologías / Comorbilidades
                                    </h3>
                                    <div className="space-y-3">
                                        {clientProfile.topPathologies.length > 0 ? (
                                            clientProfile.topPathologies.map((path, i) => {
                                                const maxVal = clientProfile.topPathologies[0]?.value || 1;
                                                const pct = (path.value / maxVal) * 100;
                                                return (
                                                    <div key={i}>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="font-medium text-slate-700">{path.label}</span>
                                                            <span className="font-bold text-slate-800">{path.value}</span>
                                                        </div>
                                                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full"
                                                                style={{ width: `${pct}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                                <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                                                <p className="text-sm">No hay datos de enfermedades registrados</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* CHARTS ROW 4: Contract Duration */}
                            <div className="bg-white rounded-3xl border border-slate-200 p-6">
                                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-purple-500" />
                                    Duración de Contratos (Fase 1)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                                    {clientProfile.byContractDuration.map((dur, i) => (
                                        <div key={i} className="text-center p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all">
                                            <div className="text-2xl font-black text-slate-800">{dur.value}</div>
                                            <div className="text-xs font-bold text-slate-500 mt-1">{dur.label}</div>
                                            <div className="text-xs font-medium text-slate-400">
                                                {((dur.value / clientProfile.total) * 100).toFixed(0)}%
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* INSIGHTS */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl border border-indigo-100 p-6">
                                <h3 className="text-lg font-black text-slate-800 mb-4">📊 Insights del Perfil</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="bg-white/60 backdrop-blur rounded-2xl p-4">
                                        <h4 className="font-bold text-indigo-600 text-sm mb-2">Perfil Típico</h4>
                                        <p className="text-sm text-slate-600">
                                            Mujer de 46-60 años, residente en Madrid o Barcelona,
                                            no usa insulina, contrato inicial de 3 meses.
                                        </p>
                                    </div>
                                    <div className="bg-white/60 backdrop-blur rounded-2xl p-4">
                                        <h4 className="font-bold text-emerald-600 text-sm mb-2">Oportunidad</h4>
                                        <p className="text-sm text-slate-600">
                                            {((clientProfile.byGender.find(g => g.label === 'Hombre')?.value || 0) / clientProfile.total * 100).toFixed(0)}% son hombres -
                                            potencial para campañas dirigidas al público masculino.
                                        </p>
                                    </div>
                                    <div className="bg-white/60 backdrop-blur rounded-2xl p-4">
                                        <h4 className="font-bold text-amber-600 text-sm mb-2">Segmento Especial</h4>
                                        <p className="text-sm text-slate-600">
                                            {clientProfile.byInsulin.find(i => i.label === 'Usa insulina')?.value || 0} clientes usan insulina -
                                            requieren seguimiento más específico.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* REFRESH */}
                            <div className="flex justify-center">
                                <button
                                    onClick={fetchClientProfile}
                                    className="text-indigo-600 hover:text-indigo-800 font-bold text-sm flex items-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Actualizar datos
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-20 text-slate-400">
                            <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No hay datos disponibles</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Sub-component for inputs to reduce repetition
const NumberInput = ({ label, value, onChange, icon: Icon, color }: any) => (
    <div className="group">
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
            {Icon && <Icon size={12} />} {label}
        </label>
        <div className="relative">
            <input
                type="number"
                className={`w-full bg-slate-50 group-hover:bg-white border border-slate-200 group-hover:border-indigo-300 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all ${color || 'text-slate-700'}`}
                value={value || 0}
                onChange={e => onChange(e.target.value)}
                onFocus={e => e.target.select()}
            />
        </div>
    </div>
);

export default AdminAnalytics;
