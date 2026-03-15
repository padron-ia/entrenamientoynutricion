import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import {
    DollarSign, TrendingUp, Users, FileText, CheckCircle2,
    AlertCircle, Search, Calendar, Filter, Download,
    ChevronRight, ArrowUpRight, ArrowDownRight, Briefcase,
    Clock, Loader2, Play, PieChart as PieIcon,
    Target, Activity, ShieldAlert, BarChart3, LineChart, Trash2,
    Plus, Save, X, Wallet, Receipt, Percent
} from 'lucide-react';
import {
    calculateFinancialMetrics,
    fetchMarketingExpenses,
    createMarketingExpense,
    deleteMarketingExpense,
    MarketingExpense,
    MarketingChannel,
    MARKETING_CHANNELS,
    FinancialMetrics
} from '../services/financialMetricsService';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Line
} from 'recharts';
import { InvoicesManagement } from './InvoicesManagement';
import { paymentService } from '../services/paymentService'; // Added import
import RenewalsView from './RenewalsView';
import { User, Client, UserRole } from '../types';

interface Sale {
    id: string;
    client_first_name: string;
    client_last_name: string;
    client_email: string;
    sale_amount: number;
    status: string;
    payment_receipt_url: string | null;
    sale_date: string;
    closer_name?: string;
    net_amount?: number;
    commission_amount?: number;
}

interface AccountingDashboardProps {
    currentUser: User;
    clients: Client[];
    onNavigateToClient: (client: Client) => void;
    coaches: User[];
}

export function AccountingDashboard({ currentUser, clients, onNavigateToClient, coaches }: AccountingDashboardProps) {
    const [activeTab, setActiveTab] = useState<'cierres' | 'ventas' | 'pagos' | 'renovaciones' | 'analisis'>('cierres');
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [paymentLinks, setPaymentLinks] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [monthFilter, setMonthFilter] = useState<string>((new Date().getMonth() + 1).toString());
    const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

    // Helper to get coach name
    const getCoachName = (idOrName: string | null | undefined): string => {
        if (!idOrName || idOrName === 'Sin Asignar' || idOrName === 'Coach') return 'Sin Asignar';
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

    // Financial Metrics State
    const [marketingExpenses, setMarketingExpenses] = useState<MarketingExpense[]>([]);
    const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        channel: 'ads_instagram' as MarketingChannel,
        amount: '',
        description: ''
    });
    const [savingExpense, setSavingExpense] = useState(false);

    // Payment History State
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

    // Manual Renewal Registration State
    const [showRenewalModal, setShowRenewalModal] = useState(false);
    const [renewalForm, setRenewalForm] = useState({
        clientEmail: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        phase: 'F2',
        coachId: ''
    });
    const [savingRenewal, setSavingRenewal] = useState(false);

    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            await Promise.all([
                fetchSales(),
                fetchPaymentLinks(),
                fetchInvoices(),
                loadMarketingExpenses(),
                loadPaymentHistory() // Added
            ]);
            setLoading(false);
        };
        loadAllData();
    }, [monthFilter, yearFilter]);

    const loadPaymentHistory = async () => {
        const history = await paymentService.getPaymentHistory(yearFilter, monthFilter);
        setPaymentHistory(history);
    };

    const handleManualRenewalSubmit = async () => {
        if (!renewalForm.clientEmail || !renewalForm.amount) return;
        setSavingRenewal(true);
        try {
            // Find client to get name
            const client = clients.find(c => c.email.toLowerCase() === renewalForm.clientEmail.toLowerCase());

            const { error } = await supabase.from('sales').insert({
                client_email: renewalForm.clientEmail,
                client_first_name: client ? client.firstName : renewalForm.clientEmail.split('@')[0],
                client_last_name: client ? client.surname : '(Renovación Manual)',
                sale_amount: parseFloat(renewalForm.amount),
                sale_date: renewalForm.date,
                status: 'won',
                type: `Renovación ${renewalForm.phase}`,
                closer_id: renewalForm.coachId || (client ? client.property_coach : null) || currentUser.id, // Assign to coach or current user
                notes: 'Registrado manualmente desde Dashboard'
            });

            if (error) throw error;

            alert('Renovación registrada correctamente');
            setShowRenewalModal(false);
            fetchSales(); // Refresh sales list
            setRenewalForm({
                clientEmail: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                phase: 'F2',
                coachId: ''
            });

        } catch (err) {
            console.error('Error registering renewal:', err);
            alert('Error al registrar renovación');
        } finally {
            setSavingRenewal(false);
        }
    };

    const loadMarketingExpenses = async () => {
        const expenses = await fetchMarketingExpenses();
        setMarketingExpenses(expenses);
    };

    // Calculate financial metrics when data changes
    React.useEffect(() => {
        if (sales.length > 0 || clients.length > 0) {
            const month = monthFilter === 'all' ? new Date().getMonth() : parseInt(monthFilter) - 1;
            const year = yearFilter === 'all' ? new Date().getFullYear() : parseInt(yearFilter);
            const metrics = calculateFinancialMetrics(
                sales,
                clients,
                marketingExpenses,
                month,
                year,
                paymentLinks
            );
            setFinancialMetrics(metrics);
        }
    }, [sales, clients, marketingExpenses, monthFilter, yearFilter, paymentLinks]);

    const handleAddExpense = async () => {
        if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) return;
        setSavingExpense(true);
        try {
            const month = monthFilter === 'all' ? new Date().getMonth() + 1 : parseInt(monthFilter);
            const year = yearFilter === 'all' ? new Date().getFullYear() : parseInt(yearFilter);

            const result = await createMarketingExpense({
                period_month: month,
                period_year: year,
                channel: expenseForm.channel,
                amount: parseFloat(expenseForm.amount),
                description: expenseForm.description || undefined,
                created_by: currentUser.id
            });

            if (result.success) {
                await loadMarketingExpenses();
                setExpenseForm({ channel: 'ads_instagram', amount: '', description: '' });
                setShowExpenseForm(false);
            }
        } catch (err) {
            console.error('Error adding expense:', err);
        } finally {
            setSavingExpense(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!window.confirm('¿Eliminar este gasto de marketing?')) return;
        const result = await deleteMarketingExpense(id);
        if (result.success) {
            await loadMarketingExpenses();
        }
    };

    const fetchInvoices = async () => {
        try {
            const { data, error } = await supabase
                .from('coach_invoices')
                .select('*');
            if (error) throw error;
            setInvoices(data || []);
        } catch (err) {
            console.error('Error fetching invoices:', err);
        }
    };

    const fetchPaymentLinks = async () => {
        try {
            const { data } = await supabase.from('payment_links').select('*');
            if (data) setPaymentLinks(data);
        } catch (err) {
            console.error('Error fetching payment links:', err);
        }
    };

    const fetchSales = async () => {
        try {
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    closer:users!sales_closer_id_fkey(name)
                `)
                .order('sale_date', { ascending: false });

            if (error) {
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('sales')
                    .select('*')
                    .order('sale_date', { ascending: false });

                if (fallbackError) throw fallbackError;

                const formatted = (fallbackData || []).map(s => ({
                    ...s,
                    closer_name: s.closer_id === 'closer-1' ? 'Closer Demo' : 'Sistema'
                }));
                setSales(formatted);
            } else {
                const formatted = (data || []).map(s => ({
                    ...s,
                    closer_name: s.closer?.name || (s.closer_id === 'closer-1' ? 'Closer Demo' : 'Sistema')
                }));
                setSales(formatted);
            }
        } catch (error) {
            console.error('Error fetching sales:', error);
        }
    };

    const handleToggleCommission = async (saleId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('sales')
                .update({ commission_paid: !currentStatus })
                .eq('id', saleId);

            if (error) throw error;

            setSales(prev => prev.map(s => s.id === saleId ? { ...s, commission_paid: !currentStatus } : s));
        } catch (error) {
            console.error('Error updating commission status:', error);
            alert('Error al actualizar el estado de la comisión');
        }
    };

    const filteredSales = sales.filter(s => {
        const dateToUse = s.sale_date || (s as any).created_at;
        if (!dateToUse) return false;
        const d = new Date(dateToUse);
        if (isNaN(d.getTime())) return false;
        const matchesMonth = monthFilter === 'all' || (d.getMonth() + 1).toString() === monthFilter;
        const matchesYear = yearFilter === 'all' || d.getFullYear().toString() === yearFilter;
        return matchesMonth && matchesYear;
    });

    const failedSales = filteredSales.filter(s => s.status === 'failed').length;

    const renewalsRevenue = React.useMemo(() => {
        let total = 0;
        const targetMonth = monthFilter === 'all' ? -1 : parseInt(monthFilter) - 1;
        const targetYear = yearFilter === 'all' ? -1 : parseInt(yearFilter);

        clients.forEach(c => {
            if (c.status === 'dropout' || c.status === 'paused') return;
            const check = (dateStr?: string, isContracted?: boolean) => {
                if (!dateStr) return;
                const rDate = new Date(dateStr);
                const isMatch = (targetMonth === -1 || rDate.getMonth() === targetMonth) &&
                    (targetYear === -1 || rDate.getFullYear() === targetYear);
                if (isMatch) {
                    const linkedSale = sales.find(s => {
                        if (!s.sale_date || !s.client_email) return false;
                        const sDate = new Date(s.sale_date);
                        return s.client_email.toLowerCase().trim() === c.email.toLowerCase().trim() &&
                            sDate.getMonth() === rDate.getMonth() &&
                            sDate.getFullYear() === rDate.getFullYear() &&
                            s.status !== 'failed';
                    });
                    if (!linkedSale && (isContracted || c.renewal_receipt_url)) {
                        if (c.renewal_amount) {
                            total += c.renewal_amount;
                        } else if (c.renewal_payment_link && paymentLinks.length > 0) {
                            const link = (paymentLinks as any[]).find(pl => pl.url === c.renewal_payment_link);
                            if (link) {
                                const rawPrice = link.price;
                                total += typeof rawPrice === 'string'
                                    ? parseFloat(rawPrice.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, ''))
                                    : (rawPrice || 0);
                            }
                        }
                    }
                }
            }
            if (c.program) {
                check(c.program.f2_renewalDate, c.program.renewal_f2_contracted);
                check(c.program.f3_renewalDate, c.program.renewal_f3_contracted);
                check(c.program.f4_renewalDate, c.program.renewal_f4_contracted);
                check(c.program.f5_renewalDate, c.program.renewal_f5_contracted);
            }
        });
        return total;
    }, [clients, sales, monthFilter, yearFilter, paymentLinks]);

    const combinedTransactions = React.useMemo(() => {
        const list: any[] = filteredSales.map(s => ({ ...s, type: 'Venta' }));
        const targetMonth = monthFilter === 'all' ? -1 : parseInt(monthFilter) - 1;
        const targetYear = yearFilter === 'all' ? -1 : parseInt(yearFilter);
        clients.forEach(c => {
            const check = (phase: string, dateStr?: string, isContracted?: boolean) => {
                if (!dateStr || !isContracted) return;
                const rDate = new Date(dateStr);
                const isMatch = (targetMonth === -1 || rDate.getMonth() === targetMonth) &&
                    (targetYear === -1 || rDate.getFullYear() === targetYear);
                if (isMatch) {
                    const alreadyInSales = sales.some(s => {
                        if (!s.sale_date || !s.client_email) return false;
                        const sDate = new Date(s.sale_date);
                        return s.client_email.toLowerCase().trim() === c.email.toLowerCase().trim() &&
                            sDate.getMonth() === rDate.getMonth() &&
                            sDate.getFullYear() === rDate.getFullYear() &&
                            s.status !== 'failed';
                    });
                    if (!alreadyInSales) {
                        let amount = c.renewal_amount || 0;
                        if (!amount && c.renewal_payment_link) {
                            const link = (paymentLinks as any[]).find((pl: any) => pl.url === c.renewal_payment_link);
                            if (link) {
                                const rawPrice = link.price;
                                amount = typeof rawPrice === 'string'
                                    ? parseFloat(rawPrice.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, ''))
                                    : (rawPrice || 0);
                            }
                        }
                        list.push({
                            id: `ren-${c.id}-${phase}`,
                            sale_date: dateStr,
                            client_first_name: c.firstName,
                            client_last_name: c.surname,
                            closer_name: c.property_coach || getCoachName(c.coach_id),
                            sale_amount: amount,
                            status: 'onboarding_completed',
                            payment_receipt_url: c.renewal_receipt_url,
                            type: `Renovación ${phase}`
                        });
                    }
                }
            };
            if (c.program) {
                check('F2', c.program.f2_renewalDate, c.program.renewal_f2_contracted);
                check('F3', c.program.f3_renewalDate, c.program.renewal_f3_contracted);
                check('F4', c.program.f4_renewalDate, c.program.renewal_f4_contracted);
                check('F5', c.program.f5_renewalDate, c.program.renewal_f5_contracted);
            }
        });
        return list.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
    }, [filteredSales, clients, sales, monthFilter, yearFilter, paymentLinks]);

    const totalNewSalesRevenue = filteredSales.reduce((sum, s) => sum + (s.status !== 'failed' ? (s.net_amount || s.sale_amount) : 0), 0);
    const totalRevenue = totalNewSalesRevenue + renewalsRevenue;
    const filteredInvoices = invoices.filter(inv => {
        const d = new Date(inv.period_date);
        const matchesMonth = monthFilter === 'all' || (d.getMonth() + 1).toString() === monthFilter;
        const matchesYear = yearFilter === 'all' || d.getFullYear().toString() === yearFilter;
        return matchesMonth && matchesYear && inv.status !== 'rejected';
    });
    const totalExpenses = filteredInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const netMargin = totalRevenue - totalExpenses;
    const pendingReceipts = filteredSales.filter(s => !s.payment_receipt_url && s.status !== 'failed').length;

    // Monthly Evolution Data for the selected year
    const monthlyComparisonData = React.useMemo(() => {
        const data = Array.from({ length: 12 }, (_, i) => {
            const monthName = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(Number(yearFilter), i, 1));
            return {
                name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                ingresos: 0,
                gastos: 0,
                margen: 0,
                monthIndex: i,
                closers: {} as Record<string, number>,
                coaches: {} as Record<string, number>,
                dropoutsCount: 0,
                newSalesCount: 0,
                churn: 0,
                ltv: 0
            };
        });

        // 1. Sales
        sales.forEach(s => {
            if (s.status === 'failed') return;
            const d = new Date(s.sale_date || (s as any).created_at);
            if (d.getFullYear().toString() === yearFilter) {
                const month = d.getMonth();
                data[month].ingresos += s.sale_amount;
                data[month].newSalesCount += 1;

                const closer = s.closer_name || 'Sistema';
                data[month].closers[closer] = (data[month].closers[closer] || 0) + s.sale_amount;
            }
        });

        // 2. Renewals (Simplified version of renewalsRevenue logic per month)
        clients.forEach(c => {
            if (c.status === 'dropout' || c.status === 'paused') return;
            const check = (dateStr?: string, isContracted?: boolean) => {
                if (!dateStr) return;
                const rDate = new Date(dateStr);
                if (rDate.getFullYear().toString() !== yearFilter) return;

                const month = rDate.getMonth();

                // Avoid double count with sales
                const linkedSale = sales.find(s => {
                    if (!s.sale_date || !s.client_email) return false;
                    const sDate = new Date(s.sale_date);
                    return s.client_email.toLowerCase().trim() === c.email.toLowerCase().trim() &&
                        sDate.getMonth() === month &&
                        sDate.getFullYear() === rDate.getFullYear() &&
                        s.status !== 'failed';
                });

                if (!linkedSale && (isContracted || c.renewal_receipt_url)) {
                    let amount = c.renewal_amount || 0;
                    if (!amount && c.renewal_payment_link && paymentLinks.length > 0) {
                        const link = (paymentLinks as any[]).find(pl => pl.url === c.renewal_payment_link);
                        if (link) {
                            const rawPrice = link.price;
                            amount = typeof rawPrice === 'string'
                                ? parseFloat(rawPrice.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, ''))
                                : (rawPrice || 0);
                        }
                    }
                    data[month].ingresos += amount;

                    const coach = c.property_coach || getCoachName(c.coach_id);
                    data[month].coaches[coach] = (data[month].coaches[coach] || 0) + amount;
                }
            };
            if (c.program) {
                check(c.program.f2_renewalDate, c.program.renewal_f2_contracted);
                check(c.program.f3_renewalDate, c.program.renewal_f3_contracted);
                check(c.program.f4_renewalDate, c.program.renewal_f4_contracted);
                check(c.program.f5_renewalDate, c.program.renewal_f5_contracted);
            }
        });

        // 3. Expenses
        invoices.forEach(inv => {
            if (inv.status === 'rejected') return;
            const d = new Date(inv.period_date);
            if (d.getFullYear().toString() === yearFilter) {
                data[d.getMonth()].gastos += Number(inv.amount);
            }
        });

        // 4. Dropouts for churn calculation
        clients.forEach(c => {
            if (c.status !== 'dropout' || !c.abandonmentDate) return;
            const dDate = new Date(c.abandonmentDate);
            if (dDate.getFullYear().toString() === yearFilter) {
                data[dDate.getMonth()].dropoutsCount += 1;
            }
        });

        // 5. Final Calculations per Month (Reliable Date-Based Metrics)
        data.forEach((monthData, i) => {
            const yearNum = yearFilter === 'all' ? new Date().getFullYear() : Number(yearFilter);
            const monthStart = new Date(yearNum, i, 1);

            // Precise count: Who was active on the 1st day of this month?
            const activeAtStartCount = clients.filter(c => {
                const startStr = c.start_date || c.registration_date;
                if (!startStr) return false;
                const startDay = new Date(startStr);
                if (startDay >= monthStart) return false;

                const isCurrentlyActive = c.status === 'active' || c.status === 'paused';
                const leaveDateStr = c.abandonmentDate || c.inactiveDate;

                // Si es activo hoy y empezó antes del mes, estaba activo al inicio.
                if (isCurrentlyActive) return true;

                // Si NO es activo hoy, solo lo contamos si tenemos su fecha de salida
                // y esta es posterior (o igual) al inicio del mes que estamos analizando.
                if (leaveDateStr) {
                    const leaveDate = new Date(leaveDateStr);
                    return !isNaN(leaveDate.getTime()) && leaveDate >= monthStart;
                }

                // En cualquier otro caso (Bajas sin fecha, etc.), no lo contamos para evitar inflar la base.
                return false;
            }).length;

            const activeAtStart = Math.max(1, activeAtStartCount);
            monthData.churn = (monthData.dropoutsCount / activeAtStart) * 100;
            monthData.ltv = monthData.ingresos / Math.max(1, activeAtStart);
            monthData.margen = monthData.ingresos - monthData.gastos;
        });

        return data;
    }, [sales, invoices, clients, yearFilter, paymentLinks]);

    const advancedMetrics = React.useMemo(() => {
        // 1. Durations
        const initialDurations = sales.filter(s => s.status !== 'failed').map(s => (s as any).contract_duration || 6); // Default 6 if missing
        const avgInitialDuration = initialDurations.length > 0 ? initialDurations.reduce((a, b) => a + b, 0) / initialDurations.length : 0;

        const renewalDurations: number[] = [];
        clients.forEach(c => {
            if (c.program?.f2_duration && c.program.renewal_f2_contracted) renewalDurations.push(c.program.f2_duration);
            if (c.program?.f3_duration && c.program.renewal_f3_contracted) renewalDurations.push(c.program.f3_duration);
            if (c.program?.f4_duration && c.program.renewal_f4_contracted) renewalDurations.push(c.program.f4_duration);
        });
        const avgRenewalDuration = renewalDurations.length > 0 ? renewalDurations.reduce((a, b) => a + b, 0) / renewalDurations.length : 0;

        // 2. Comprehensive Churn & Movement Analysis (Reliable Date-Based)
        const isAllMonths = monthFilter === 'all';
        const targetYearNum = yearFilter === 'all' ? new Date().getFullYear() : parseInt(yearFilter);
        let churnRate = 0;
        let activeAtStartVal = 0;
        let monthlyDropouts = 0;
        let monthlyPauses = 0;
        let monthlyInactives = 0;
        let totalLosses = 0;

        if (isAllMonths) {
            const curMonth = new Date().getMonth();
            const monthsWithData = monthlyComparisonData.filter(m => m.monthIndex <= curMonth || targetYearNum < new Date().getFullYear());
            const count = monthsWithData.length || 1;

            churnRate = monthsWithData.reduce((acc, m) => acc + m.churn, 0) / count;
            monthlyDropouts = monthlyComparisonData.reduce((acc, m) => acc + m.dropoutsCount, 0);

            monthlyPauses = clients.filter(c => {
                if (c.status !== 'paused' || !c.pauseDate) return false;
                const d = new Date(c.pauseDate);
                return d.getFullYear() === targetYearNum;
            }).length;

            monthlyInactives = clients.filter(c => {
                if (c.status !== 'inactive' || !c.inactiveDate) return false;
                const d = new Date(c.inactiveDate);
                return d.getFullYear() === targetYearNum;
            }).length;

            totalLosses = monthlyDropouts + monthlyInactives;

            const activeBases = monthsWithData.map(m => {
                const mStart = new Date(targetYearNum, m.monthIndex, 1);
                return clients.filter(cl => {
                    const sStr = cl.start_date || cl.registration_date;
                    if (!sStr) return false;
                    const sd = new Date(sStr);
                    if (sd >= mStart) return false;

                    const isCurrentlyActive = cl.status === 'active' || cl.status === 'paused';
                    const leaveDateStr = cl.abandonmentDate || cl.inactiveDate;

                    if (isCurrentlyActive) return true;

                    if (leaveDateStr) {
                        const leaveDate = new Date(leaveDateStr);
                        return !isNaN(leaveDate.getTime()) && leaveDate >= mStart;
                    }
                    return false;
                }).length;
            });
            activeAtStartVal = Math.round(activeBases.reduce((a, b) => a + b, 0) / (activeBases.length || 1));
        } else {
            const targetMonth = parseInt(monthFilter);
            const mStartDate = new Date(targetYearNum, targetMonth - 1, 1);
            const mEndDate = new Date(targetYearNum, targetMonth, 0);

            // Precise Recount: Who was active on the 1st day of this month?
            activeAtStartVal = clients.filter(c => {
                const sStr = c.start_date || c.registration_date;
                if (!sStr) return false;
                const sd = new Date(sStr);
                if (sd >= mStartDate) return false;

                const isCurrentlyActive = c.status === 'active' || c.status === 'paused';
                const leaveDateStr = c.abandonmentDate || c.inactiveDate;

                if (isCurrentlyActive) return true;

                if (leaveDateStr) {
                    const leaveDate = new Date(leaveDateStr);
                    return !isNaN(leaveDate.getTime()) && leaveDate >= mStartDate;
                }

                return false;
            }).length;

            // Bajas del Mes (Categorizadas por fecha de evento)
            monthlyDropouts = clients.filter(c => {
                if (c.status !== 'dropout' || !c.abandonmentDate) return false;
                const d = new Date(c.abandonmentDate);
                return d >= mStartDate && d <= mEndDate;
            }).length;

            monthlyPauses = clients.filter(c => {
                if (c.status !== 'paused' || !c.pauseDate) return false;
                const d = new Date(c.pauseDate);
                return d >= mStartDate && d <= mEndDate;
            }).length;

            monthlyInactives = clients.filter(c => {
                if (c.status !== 'inactive' || !c.inactiveDate) return false;
                const d = new Date(c.inactiveDate);
                return d >= mStartDate && d <= mEndDate;
            }).length;

            totalLosses = monthlyDropouts + monthlyInactives;
            churnRate = activeAtStartVal > 0 ? (totalLosses / activeAtStartVal) * 100 : 0;
        }

        const activeAtStart = activeAtStartVal;

        // 3. Forecast (Next 6 Months)
        const forecastData = Array.from({ length: 9 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() + i);
            const mName = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(d);
            return {
                name: mName.charAt(0).toUpperCase() + mName.slice(1),
                amount: 0,
                month: d.getMonth(),
                year: d.getFullYear()
            };
        });

        clients.forEach(c => {
            if (c.status === 'dropout' || c.status === 'inactive') return;
            const check = (dateStr?: string, contracted?: boolean) => {
                if (!dateStr || contracted) return;
                const rDate = new Date(dateStr);
                const forecastItem = forecastData.find(f => f.month === rDate.getMonth() && f.year === rDate.getFullYear());
                if (forecastItem) {
                    forecastItem.amount += c.renewal_amount || 997; // Default estimate if no amount
                }
            };
            if (c.program) {
                check(c.program.f2_renewalDate, c.program.renewal_f2_contracted);
                check(c.program.f3_renewalDate, c.program.renewal_f3_contracted);
                check(c.program.f4_renewalDate, c.program.renewal_f4_contracted);
                check(c.program.f5_renewalDate, c.program.renewal_f5_contracted);
            }
        });

        // 4. LTV (Lifetime Value)
        let avgLTV = 0;
        if (isAllMonths) {
            // Average of the monthly LTVs calculated in comparison data
            const monthsWithData = monthlyComparisonData.filter(m => m.ingresos > 0 || m.monthIndex <= new Date().getMonth());
            avgLTV = monthsWithData.reduce((acc, m) => acc + m.ltv, 0) / (monthsWithData.length || 1);
        } else {
            const totalRev = combinedTransactions.reduce((acc, curr) => acc + (curr.sale_amount || 0), 0);
            const uniqueClients = new Set(combinedTransactions.map(t => t.client_email)).size;
            avgLTV = uniqueClients > 0 ? totalRev / uniqueClients : 0;
        }

        // 5. Retention Funnel (ONLY ACTIVE/PAUSED)
        const activeClients = clients.filter(c => c.status === 'active' || c.status === 'paused');
        const funnel = {
            f1: activeClients.length,
            f2: activeClients.filter(c => c.program?.renewal_f2_contracted).length,
            f3: activeClients.filter(c => c.program?.renewal_f3_contracted).length,
            f4: activeClients.filter(c => c.program?.renewal_f4_contracted).length,
            f5: activeClients.filter(c => c.program?.renewal_f5_contracted).length,
        };

        // 6. Coach Performance (Retention & Active)
        const coachStats = Array.from(new Set(clients.map(c => c.property_coach || 'Sin asignar'))).map(coachName => {
            const coachClients = clients.filter(c => (c.property_coach || 'Sin asignar') === coachName);
            const active = coachClients.filter(c => c.status === 'active').length;
            const dropouts = coachClients.filter(c => c.status === 'dropout').length;

            return {
                id: coachName,
                name: coachName,
                total: coachClients.length,
                active,
                dropouts,
                retentionRate: coachClients.length > 0 ? (active / (active + dropouts || 1)) * 100 : 0
            };
        }).sort((a, b) => b.retentionRate - a.retentionRate);

        // 7. Active Contracts Durations Breakdown (ONLY CURRENT PHASE)
        const durationStats = {
            f1: {} as Record<string, number>,
            f2: {} as Record<string, number>,
            f3: {} as Record<string, number>,
            f4: {} as Record<string, number>,
            f5: {} as Record<string, number>
        };

        const today = new Date().toISOString().split('T')[0];
        activeClients.forEach(c => {
            const p = c.program;
            let currentPhase: 'f1' | 'f2' | 'f3' | 'f4' | 'f5' = 'f1';

            // Determination of current phase based on dates and contracted status
            if (p?.renewal_f5_contracted && p.f4_endDate && today > p.f4_endDate) {
                currentPhase = 'f5';
            } else if (p?.renewal_f4_contracted && p.f3_endDate && today > p.f3_endDate) {
                currentPhase = 'f4';
            } else if (p?.renewal_f3_contracted && p.f2_endDate && today > p.f2_endDate) {
                currentPhase = 'f3';
            } else if (p?.renewal_f2_contracted && p.f1_endDate && today > p.f1_endDate) {
                currentPhase = 'f2';
            } else {
                currentPhase = 'f1';
            }

            // Assign duration based on determined current phase
            if (currentPhase === 'f1') {
                const dur = c.program_duration_months || 6;
                durationStats.f1[dur] = (durationStats.f1[dur] || 0) + 1;
            } else if (currentPhase === 'f2') {
                const dur = p?.f2_duration || 1;
                durationStats.f2[dur] = (durationStats.f2[dur] || 0) + 1;
            } else if (currentPhase === 'f3') {
                const dur = p?.f3_duration || 1;
                durationStats.f3[dur] = (durationStats.f3[dur] || 0) + 1;
            } else if (currentPhase === 'f4') {
                const dur = p?.f4_duration || 1;
                durationStats.f4[dur] = (durationStats.f4[dur] || 0) + 1;
            } else if (currentPhase === 'f5') {
                const dur = p?.f5_duration || 1;
                durationStats.f5[dur] = (durationStats.f5[dur] || 0) + 1;
            }
        });

        return {
            avgInitialDuration,
            avgRenewalDuration,
            churnRate,
            activeAtStart,
            monthlyDropouts,
            monthlyPauses,
            monthlyInactives,
            totalLosses,
            dropoutsThisMonth: totalLosses, // Keep for backward compatibility if needed
            activeAtStartVal: activeAtStart,
            forecastData,
            avgLTV,
            funnel,
            coachStats,
            avgTicket: totalNewSalesRevenue / (filteredSales.filter(s => s.status !== 'failed').length || 1),
            durationStats,
            isAllMonths
        };
    }, [sales, clients, combinedTransactions, monthFilter, yearFilter, filteredSales, monthlyComparisonData, totalNewSalesRevenue, paymentLinks]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Briefcase className="text-blue-600" /> Dashboard de Contabilidad
                    </h1>
                    <p className="text-slate-500 text-sm">Control de ingresos, pagos y cierres mensuales</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowRenewalModal(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                    >
                        <Plus size={16} /> Añadir Renovación
                    </button>
                    <select
                        value={monthFilter}
                        onChange={e => setMonthFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todos los meses</option>
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={(i + 1).toString()}>
                                {new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2022, i, 1))}
                            </option>
                        ))}
                    </select>
                    <select
                        value={yearFilter}
                        onChange={e => setYearFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                    </select>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 w-fit">
                <button
                    onClick={() => setActiveTab('cierres')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'cierres' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <TrendingUp className="w-4 h-4 inline mr-2" /> Resumen Cierre
                </button>
                <button
                    onClick={() => setActiveTab('ventas')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ventas' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <DollarSign className="w-4 h-4 inline mr-2" /> Ingresos y Ventas
                </button>
                <button
                    onClick={() => setActiveTab('pagos')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pagos' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <FileText className="w-4 h-4 inline mr-2" /> Pagos Colaboradores
                </button>
                <button
                    onClick={() => setActiveTab('renovaciones')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'renovaciones' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Clock className="w-4 h-4 inline mr-2" /> Renovaciones
                </button>
                <button
                    onClick={() => setActiveTab('analisis')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'analisis' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Target className="w-4 h-4 inline mr-2" /> Análisis Decisiones
                </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'cierres' && (
                <div className="space-y-6">
                    {/* Charts & Details Section */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Monthly Evolution Chart (Annual View) */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <TrendingUp size={18} className="text-blue-600" /> Evolución Mensual {yearFilter}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">Comparativa de ingresos vs gastos por mes</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Ingresos</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Gastos</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                            tickFormatter={(val) => `${val}€`}
                                        />
                                        <RechartsTooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                                        <Bar dataKey="gastos" fill="#f87171" radius={[4, 4, 0, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* KPI Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group">
                            <div className="flex justify-between items-start mb-2">
                                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={20} /></span>
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Bruto</span>
                            </div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Recaudación Total</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{(totalRevenue).toLocaleString('es-ES')}€</p>
                            <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span className="text-slate-400">ALTAS:</span>
                                    <span className="text-blue-600">{totalNewSalesRevenue.toLocaleString('es-ES')}€</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span className="text-slate-400">RENOV:</span>
                                    <span className="text-indigo-600">{renewalsRevenue.toLocaleString('es-ES')}€</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-2">
                                <span className="p-2 bg-red-50 text-red-600 rounded-lg"><ArrowDownRight size={20} /></span>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">Gastos</span>
                            </div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pagos Colaboradores</p>
                            <p className="text-2xl font-black text-red-600 mt-1">{totalExpenses.toLocaleString('es-ES')}€</p>
                            <p className="text-[10px] text-slate-400 mt-1">{filteredInvoices.length} facturas este mes</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-2">
                                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20} /></span>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Margen</span>
                            </div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Beneficio Neto</p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">{netMargin.toLocaleString('es-ES')}€</p>
                            <p className="text-[10px] text-slate-400 mt-1">Rentabilidad: {totalRevenue > 0 ? ((netMargin / totalRevenue) * 100).toFixed(1) : 0}%</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-2">
                                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={20} /></span>
                                {pendingReceipts > 0 && (
                                    <span className="animate-pulse w-2 h-2 bg-amber-500 rounded-full"></span>
                                )}
                            </div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Comp. Pendientes</p>
                            <p className="text-2xl font-black text-amber-600 mt-1">{pendingReceipts}</p>
                            <p className="text-[10px] text-slate-400 mt-1">Riesgo: {(pendingReceipts * 300).toLocaleString('es-ES')}€ aprox.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <PieIcon size={18} className="text-blue-600" /> Segmentación de Ingresos
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Altas', value: totalNewSalesRevenue },
                                                { name: 'Renovaciones', value: renewalsRevenue }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="#3b82f6" stroke="none" />
                                            <Cell fill="#6366f1" stroke="none" />
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: number) => [`${value.toLocaleString()}€`, 'Ingreso']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <p className="text-[10px] text-blue-600 font-bold uppercase">Nuevas Altas</p>
                                    <p className="text-lg font-black text-blue-900">{((totalNewSalesRevenue / totalRevenue) * 100 || 0).toFixed(1)}%</p>
                                </div>
                                <div className="p-3 bg-indigo-50 rounded-xl">
                                    <p className="text-[10px] text-indigo-600 font-bold uppercase">Renovaciones</p>
                                    <p className="text-lg font-black text-indigo-900">{((renewalsRevenue / totalRevenue) * 100 || 0).toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Users size={18} className="text-purple-600" /> Cierre por Closer
                            </h3>
                            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {Array.from(new Set(filteredSales.map(s => s.closer_name))).map(name => {
                                    const closerSales = filteredSales.filter(s => s.closer_name === name && s.status !== 'failed');
                                    const amount = closerSales.reduce((sum, s) => sum + s.sale_amount, 0);
                                    if (amount === 0 && closerSales.length === 0) return null;
                                    return (
                                        <div key={name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                                    {(String(name) || 'S').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-700 text-sm block">{name}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{closerSales.length} ventas</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-slate-900 text-base">{amount.toLocaleString()}€</p>
                                                <div className="w-24 bg-slate-200 h-1 rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className="bg-blue-600 h-full rounded-full"
                                                        style={{ width: `${(amount / totalNewSalesRevenue) * 100 || 0}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-xl shadow-blue-900/10">
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-8">
                                    <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest">Salud Financiera</h3>
                                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold ${netMargin > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                        <CheckCircle2 size={10} /> {netMargin > 0 ? 'POSITIVA' : 'REVISAR'}
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-5xl font-black tracking-tighter mb-1">{netMargin.toLocaleString()}€</p>
                                        <p className="text-slate-400 text-xs font-medium">Margen Neto Operativo</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 pt-6 border-t border-white/10">
                                        <div className="flex justify-between items-center group/item hover:bg-white/5 p-2 rounded-xl transition-colors">
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ingresos Brutos</p>
                                                <p className="text-xl font-bold">{totalRevenue.toLocaleString()}€</p>
                                            </div>
                                            <ArrowUpRight className="text-emerald-500 opacity-0 group-hover/item:opacity-100 transition-opacity" size={16} />
                                        </div>
                                        <div className="flex justify-between items-center group/item hover:bg-white/5 p-2 rounded-xl transition-colors">
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Gastos Totales</p>
                                                <p className="text-xl font-bold text-red-400">-{totalExpenses.toLocaleString()}€</p>
                                            </div>
                                            <ArrowDownRight className="text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity" size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 relative z-10">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Rentabilidad</p>
                                        <p className="text-2xl font-black text-emerald-400">{((netMargin / totalRevenue) * 100 || 0).toFixed(1)}%</p>
                                    </div>
                                    <TrendingUp className="text-emerald-500 mb-1" size={24} />
                                </div>
                                <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                        style={{ width: `${Math.max(5, Math.min(100, (netMargin / totalRevenue) * 100 || 0))}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>
                        </div>
                    </div>

                    {/* Team breakdown by month (Table) */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                    <Users size={20} className="text-blue-600" /> Desglose de Rendimiento Mensual
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">Contribución detallada de Closers y Coaches por mes</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Mes</th>
                                        <th className="px-6 py-4">Ingresos Totales</th>
                                        <th className="px-6 py-4">Gastos</th>
                                        <th className="px-6 py-4">Altas (Closers)</th>
                                        <th className="px-6 py-4">Renovaciones (Coaches)</th>
                                        <th className="px-6 py-4">Margen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {monthlyComparisonData.map(m => (
                                        <tr key={m.name} className={`hover:bg-slate-50 transition-colors group ${m.ingresos === 0 && m.gastos === 0 ? 'opacity-40' : ''}`}>
                                            <td className="px-6 py-4 font-bold text-slate-900">{m.name}</td>
                                            <td className="px-6 py-4 font-black text-slate-900">{m.ingresos.toLocaleString()}€</td>
                                            <td className="px-6 py-4 text-red-500 font-medium">{m.gastos > 0 ? `-${m.gastos.toLocaleString()}€` : '0€'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                    {Object.entries(m.closers || {})
                                                        .filter(([_, amount]) => (amount as number) > 0)
                                                        .map(([name, amount]) => (
                                                            <span key={name} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase trekking-wider border border-blue-100">
                                                                {name.split(' ')[0]}: {(amount as number).toLocaleString()}€
                                                            </span>
                                                        ))}
                                                    {(!m.closers || Object.entries(m.closers).filter(([_, a]) => (a as number) > 0).length === 0) && <span className="text-slate-300 italic text-[10px]">Sin altas</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                    {Object.entries(m.coaches || {})
                                                        .filter(([_, amount]) => (amount as number) > 0)
                                                        .map(([name, amount]) => (
                                                            <span key={name} className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase trekking-wider border border-indigo-100">
                                                                {name.split(' ')[0]}: {(amount as number).toLocaleString()}€
                                                            </span>
                                                        ))}
                                                    {(!m.coaches || Object.entries(m.coaches).filter(([_, a]) => (a as number) > 0).length === 0) && <span className="text-slate-300 italic text-[10px]">Sin renov.</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-black ${m.margen > 0 ? 'bg-emerald-50 text-emerald-600' : m.margen < 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                                                    {m.margen.toLocaleString()}€
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ventas' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Detalle de Ventas e Ingresos</h3>
                        <div className="flex gap-2">
                            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Search size={20} /></button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5">Fecha</th>
                                    <th className="px-6 py-5">Cliente / Tipo</th>
                                    <th className="px-6 py-5">Closer / Coach</th>
                                    <th className="px-6 py-5 text-right">Importe</th>
                                    <th className="px-6 py-5 text-center">Estado</th>
                                    <th className="px-6 py-5 text-center">Comisión</th>
                                    <th className="px-6 py-5 text-right">Comprobante</th>
                                    <th className="px-6 py-5 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center text-slate-400"><Loader2 className="animate-spin w-8 h-8 mx-auto" /></td>
                                    </tr>
                                ) : combinedTransactions.map(sale => (
                                    <tr key={sale.id} className={`hover:bg-slate-50/80 transition-all ${sale.status === 'failed' ? 'opacity-50 grayscale' : ''}`}>
                                        <td className="px-8 py-5 text-slate-500 font-medium whitespace-nowrap">
                                            {new Date(sale.sale_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 text-base">
                                                    {sale.client_first_name} {sale.client_last_name}
                                                </span>
                                                {sale.type && sale.type !== 'Venta' ? (
                                                    <span className="w-fit mt-1 px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-600 font-bold border border-indigo-100 uppercase tracking-wide">
                                                        {sale.type}
                                                    </span>
                                                ) : (
                                                    <span className="w-fit mt-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600 font-bold border border-blue-100 uppercase tracking-wide">
                                                        Nueva Alta
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm
                                                    ${sale.closer_name?.includes('Demo') ? 'bg-slate-400' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                                                    {(sale.closer_name || 'S').substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{sale.closer_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-black text-slate-900 text-lg tracking-tight">
                                                    {sale.sale_amount.toLocaleString('es-ES')}€
                                                </span>
                                                {sale.net_amount && sale.net_amount !== sale.sale_amount && (
                                                    <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-1.5 rounded flex items-center gap-1">
                                                        Neto: {sale.net_amount.toLocaleString('es-ES')}€
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm
                                                ${sale.status === 'failed' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    sale.status === 'onboarding_completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                        'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                {sale.status === 'onboarding_completed' && <CheckCircle2 size={10} />}
                                                {sale.status === 'failed' && <AlertCircle size={10} />}
                                                {sale.status === 'onboarding_completed' ? 'Verificado' : sale.status === 'failed' ? 'Fallido' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {sale.commission_amount ? (
                                                    <>
                                                        <span className="font-bold text-slate-700">{sale.commission_amount.toLocaleString('es-ES')}€</span>
                                                        <button
                                                            onClick={() => handleToggleCommission(sale.id, !!(sale as any).commission_paid)}
                                                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all border
                                                                ${(sale as any).commission_paid
                                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                                                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100'}`}
                                                        >
                                                            {(sale as any).commission_paid ? 'Pagada' : 'Pendiente'}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {sale.payment_receipt_url ? (
                                                <a
                                                    href={sale.payment_receipt_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-200"
                                                    title="Ver Comprobante"
                                                >
                                                    <FileText size={16} />
                                                </a>
                                            ) : (
                                                <span className="inline-block w-8 text-center text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.')) {
                                                        const handleDelete = async () => {
                                                            try {
                                                                const { error } = await supabase.from('sales').delete().eq('id', sale.id);
                                                                if (error) throw error;
                                                                setSales(prev => prev.filter(s => s.id !== sale.id));
                                                            } catch (err) {
                                                                console.error('Error deleting sale:', err);
                                                                alert('Error al eliminar el registro');
                                                            }
                                                        };
                                                        handleDelete();
                                                    }
                                                }}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                title="Eliminar Registro"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'pagos' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <InvoicesManagement currentUser={currentUser} />
                    </div>

                    {/* Payment History Section */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <FileText size={18} className="text-emerald-600" /> Historial de Pagos Realizados
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">Registro detallado de transferencias a colaboradores</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Fecha Pago</th>
                                        <th className="px-6 py-4">Colaborador</th>
                                        <th className="px-6 py-4">Concepto</th>
                                        <th className="px-6 py-4">Método</th>
                                        <th className="px-6 py-4 text-right">Importe</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paymentHistory.length > 0 ? (
                                        paymentHistory.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 text-slate-600">
                                                    {new Date(payment.payment_date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-800">
                                                    {payment.staff?.name || 'Desconocido'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-xs">
                                                    {payment.invoice_id ? 'Pago Factura' : 'Pago Manual'}
                                                    <span className="block text-[10px] text-slate-400">{payment.notes}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                                                        {payment.payment_method || 'Transferencia'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900">
                                                    {payment.amount.toLocaleString()}€
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase flex items-center justify-center gap-1 w-fit mx-auto">
                                                        <CheckCircle2 size={10} /> Completado
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">
                                                No hay pagos registrados en este periodo.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'renovaciones' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <RenewalsView
                        clients={clients}
                        user={currentUser}
                        onNavigateToClient={onNavigateToClient}
                        sales={sales}
                        paymentLinks={paymentLinks}
                        onlyPaid={true}
                        externalDate={{ month: parseInt(monthFilter), year: parseInt(yearFilter) }}
                    />
                </div>
            )}

            {activeTab === 'analisis' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    {/* Financial Metrics Section - CAC, Cash Contracted, Cash Collected */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>

                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                        <Wallet className="w-7 h-7 text-blue-400" />
                                        Métricas Financieras Clave
                                    </h2>
                                    <p className="text-slate-400 text-sm mt-1">CAC, Cash Flow y Tasa de Cobranza</p>
                                </div>
                                <button
                                    onClick={() => setShowExpenseForm(!showExpenseForm)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Añadir Gasto Marketing
                                </button>
                            </div>

                            {/* 4 Financial KPI Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                {/* CAC */}
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 bg-amber-500/20 rounded-lg">
                                            <Target className="w-5 h-5 text-amber-400" />
                                        </div>
                                        {financialMetrics && financialMetrics.cacTrend !== 'stable' && (
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${financialMetrics.cacTrend === 'down' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {financialMetrics.cacTrend === 'down' ? '↓ Mejor' : '↑ Peor'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">CAC (Coste Adquisición)</p>
                                    <p className="text-3xl font-black">{financialMetrics?.cac.toLocaleString() || 0}€</p>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                        {financialMetrics?.newClientsCount || 0} clientes | {financialMetrics?.totalMarketingExpenses.toLocaleString() || 0}€ en mkt
                                    </p>
                                </div>

                                {/* Cash Contracted */}
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 bg-blue-500/20 rounded-lg">
                                            <FileText className="w-5 h-5 text-blue-400" />
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cash Contracted</p>
                                    <p className="text-3xl font-black text-blue-400">{financialMetrics?.cashContracted.toLocaleString() || 0}€</p>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                        Ventas: {financialMetrics?.salesContracted.toLocaleString() || 0}€ | Renov: {financialMetrics?.renewalsContracted.toLocaleString() || 0}€
                                    </p>
                                </div>

                                {/* Cash Collected */}
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                                            <Receipt className="w-5 h-5 text-emerald-400" />
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cash Collected</p>
                                    <p className="text-3xl font-black text-emerald-400">{financialMetrics?.cashCollected.toLocaleString() || 0}€</p>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                        Ventas: {financialMetrics?.salesCollected.toLocaleString() || 0}€ | Renov: {financialMetrics?.renewalsCollected.toLocaleString() || 0}€
                                    </p>
                                </div>

                                {/* Collection Rate */}
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 bg-purple-500/20 rounded-lg">
                                            <Percent className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${(financialMetrics?.collectionRate || 0) >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                            {(financialMetrics?.collectionRate || 0) >= 80 ? 'Excelente' : 'Mejorable'}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Tasa de Cobranza</p>
                                    <p className="text-3xl font-black text-purple-400">{financialMetrics?.collectionRate.toFixed(1) || 0}%</p>
                                    <div className="mt-3 w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-purple-500 h-full rounded-full transition-all"
                                            style={{ width: `${financialMetrics?.collectionRate || 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Add Expense Form */}
                            {showExpenseForm && (
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> Nuevo Gasto de Marketing
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Canal</label>
                                            <select
                                                value={expenseForm.channel}
                                                onChange={e => setExpenseForm({ ...expenseForm, channel: e.target.value as MarketingChannel })}
                                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                                            >
                                                {MARKETING_CHANNELS.map(c => (
                                                    <option key={c.value} value={c.value} className="bg-slate-800">{c.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Importe (€)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={expenseForm.amount}
                                                onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                                placeholder="0.00"
                                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 placeholder-slate-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Descripción (Opcional)</label>
                                            <input
                                                type="text"
                                                value={expenseForm.description}
                                                onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                                placeholder="Campaña, concepto..."
                                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 placeholder-slate-500"
                                            />
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <button
                                                onClick={handleAddExpense}
                                                disabled={savingExpense || !expenseForm.amount}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm font-bold transition-colors"
                                            >
                                                {savingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                Guardar
                                            </button>
                                            <button
                                                onClick={() => setShowExpenseForm(false)}
                                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Expenses by Channel */}
                            {financialMetrics && financialMetrics.totalMarketingExpenses > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    {MARKETING_CHANNELS.map(channel => {
                                        const amount = financialMetrics.expensesByChannel[channel.value] || 0;
                                        const percentage = financialMetrics.totalMarketingExpenses > 0
                                            ? (amount / financialMetrics.totalMarketingExpenses) * 100
                                            : 0;
                                        return (
                                            <div key={channel.value} className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">{channel.label}</p>
                                                <p className="text-lg font-black text-white">{amount.toLocaleString()}€</p>
                                                <div className="mt-2 w-full bg-white/10 h-1 rounded-full overflow-hidden">
                                                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${percentage}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Marketing Expenses Table */}
                    {marketingExpenses.filter(e => {
                        const matchMonth = monthFilter === 'all' || e.period_month === parseInt(monthFilter);
                        const matchYear = yearFilter === 'all' || e.period_year === parseInt(yearFilter);
                        return matchMonth && matchYear;
                    }).length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-50">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-amber-600" />
                                        Gastos de Marketing del Período
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                            <tr>
                                                <th className="px-6 py-4">Fecha</th>
                                                <th className="px-6 py-4">Canal</th>
                                                <th className="px-6 py-4">Descripción</th>
                                                <th className="px-6 py-4 text-right">Importe</th>
                                                <th className="px-6 py-4 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {marketingExpenses
                                                .filter(e => {
                                                    const matchMonth = monthFilter === 'all' || e.period_month === parseInt(monthFilter);
                                                    const matchYear = yearFilter === 'all' || e.period_year === parseInt(yearFilter);
                                                    return matchMonth && matchYear;
                                                })
                                                .map(expense => (
                                                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 text-slate-500">
                                                            {new Date(expense.created_at).toLocaleDateString('es-ES')}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">
                                                                {MARKETING_CHANNELS.find(c => c.value === expense.channel)?.label || expense.channel}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-600">{expense.description || '-'}</td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-900">{expense.amount.toLocaleString()}€</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                onClick={() => handleDeleteExpense(expense.id)}
                                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                    {/* Top Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">
                                {advancedMetrics.isAllMonths ? 'Churn Rate Anual (Media)' : 'Churn Rate Mensual'}
                            </p>
                            <div className="flex items-end gap-2">
                                <p className="text-3xl font-black text-slate-900">{advancedMetrics.churnRate.toFixed(1)}%</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${advancedMetrics.churnRate < 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {advancedMetrics.churnRate < 5 ? 'Saludable' : 'Alerta'}
                                </span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-50 space-y-1">
                                <p className="text-[10px] text-slate-400 flex justify-between">
                                    <span>{advancedMetrics.isAllMonths ? 'Activos (Base Media):' : 'Activos al inicio:'}</span>
                                    <span className="font-bold text-slate-600">{advancedMetrics.activeAtStartVal}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 flex justify-between">
                                    <span>Bajas (Dropouts):</span>
                                    <span className="font-bold text-red-500">{advancedMetrics.monthlyDropouts}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 flex justify-between">
                                    <span>Inactivos/Cancel.:</span>
                                    <span className="font-bold text-orange-500">{advancedMetrics.monthlyInactives}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 flex justify-between">
                                    <span>{advancedMetrics.isAllMonths ? 'Pausas del año:' : 'Pausas del mes:'}</span>
                                    <span className="font-bold text-amber-500">{advancedMetrics.monthlyPauses}</span>
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Valor Vida Cliente (LTV)</p>
                            <p className="text-3xl font-black text-blue-600">{Math.round(advancedMetrics.avgLTV).toLocaleString()}€</p>
                            <p className="text-[11px] text-slate-400 mt-2">Ingreso medio por cliente único</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Media Contrato Inicial</p>
                            <p className="text-3xl font-black text-slate-900">{advancedMetrics.avgInitialDuration.toFixed(1)} <span className="text-lg font-bold text-slate-400">meses</span></p>
                            <p className="text-[11px] text-slate-400 mt-2">Duración media de captación</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Media Renovaciones</p>
                            <p className="text-3xl font-black text-indigo-600">{advancedMetrics.avgRenewalDuration.toFixed(1)} <span className="text-lg font-bold text-slate-400">meses</span></p>
                            <p className="text-[11px] text-slate-400 mt-2">Duración media tras renovación</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Ticket Medio (AOV)</p>
                            <p className="text-3xl font-black text-emerald-600">{Math.round(advancedMetrics.avgTicket).toLocaleString()}€</p>
                            <p className="text-[11px] text-slate-400 mt-2">Valor medio de cada venta inicial</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Forecast Chart */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <BarChart3 size={18} className="text-blue-600" /> Proyección de Ingresos (Forecast)
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">Basado en próximas renovaciones programadas</p>
                                </div>
                                <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded">PRÓX. 9 MESES</span>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={advancedMetrics.forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                            tickFormatter={(val) => `${val}€`}
                                        />
                                        <RechartsTooltip
                                            cursor={{ fill: '#eff6ff' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(val: number) => [`${val.toLocaleString()}€`, 'Ingreso Estimado']}
                                        />
                                        <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={34}>
                                            {advancedMetrics.forecastData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#1e293b' : '#3b82f6'} fillOpacity={1 - (index * 0.08)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Decision Logic & Insights */}
                        <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
                            <h3 className="font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                                <ShieldAlert size={18} className="text-amber-400" /> Insights y Decisiones Estratégicas
                            </h3>
                            <div className="space-y-4 relative z-10">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <p className="text-amber-400 text-[10px] font-black uppercase mb-1">Oportunidad de Crecimiento</p>
                                    <p className="text-sm text-slate-300">
                                        Tu LTV medio es de <b>{Math.round(advancedMetrics.avgLTV)}€</b>. Si el coste de adquisición (CPA) es menor al 20% de este valor (<b>{Math.round(advancedMetrics.avgLTV * 0.2)}€</b>), deberías escalar la inversión en captación inmediatamente.
                                    </p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <p className="text-blue-400 text-[10px] font-black uppercase mb-1">Análisis de Retención</p>
                                    <p className="text-sm text-slate-300">
                                        Las renovaciones duran de media <b>{advancedMetrics.avgRenewalDuration.toFixed(1)} meses</b> frente a los <b>{advancedMetrics.avgInitialDuration.toFixed(1)}</b> iniciales. Esto indica que los clientes confían más una vez dentro del programa.
                                    </p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <p className="text-emerald-400 text-[10px] font-black uppercase mb-1">Alerta de Churn</p>
                                    <p className="text-sm text-slate-300">
                                        {advancedMetrics.churnRate < 5
                                            ? "Tu tasa de abandono está en niveles óptimos. El enfoque debe ser la excelencia en el servicio para mantener este indicador."
                                            : "Atención: El Churn ha superado el 5%. Revisa las encuestas de salida de los dropouts para identificar fricciones en el servicio."
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                        </div>
                    </div>

                    {/* Retention Funnel & Coach Retention */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Funnel */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Target size={18} className="text-indigo-600" /> Embudo de Retención (F1 → F5)
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Fase 1 (Inicio)', count: advancedMetrics.funnel.f1, color: 'bg-blue-600', width: '100%' },
                                    { label: 'Fase 2 (Renov. 1)', count: advancedMetrics.funnel.f2, color: 'bg-blue-500', width: `${(advancedMetrics.funnel.f2 / advancedMetrics.funnel.f1) * 100}%` },
                                    { label: 'Fase 3 (Renov. 2)', count: advancedMetrics.funnel.f3, color: 'bg-blue-400', width: `${(advancedMetrics.funnel.f3 / advancedMetrics.funnel.f1) * 100}%` },
                                    { label: 'Fase 4 (Renov. 3)', count: advancedMetrics.funnel.f4, color: 'bg-blue-300', width: `${(advancedMetrics.funnel.f4 / advancedMetrics.funnel.f1) * 100}%` },
                                    { label: 'Fase 5 (Ex-Alumni)', count: advancedMetrics.funnel.f5, color: 'bg-blue-200', width: `${(advancedMetrics.funnel.f5 / advancedMetrics.funnel.f1) * 100}%` },
                                ].map((step, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{step.label}</span>
                                            <span className="text-[10px] font-black text-slate-900">{step.count} ({Math.round((step.count / (idx === 0 ? step.count || 1 : [advancedMetrics.funnel.f1, advancedMetrics.funnel.f2, advancedMetrics.funnel.f3, advancedMetrics.funnel.f4][idx] || 1)) * 100) || 0}%)</span>
                                        </div>
                                        <div className="w-full bg-slate-50 h-6 rounded-lg overflow-hidden border border-slate-100 p-0.5">
                                            <div
                                                className={`${step.color} h-full rounded-md transition-all duration-1000 flex items-center justify-center`}
                                                style={{ width: step.width }}
                                            >
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-6 text-[11px] text-slate-400 leading-relaxed italic">
                                * El porcentaje indica la tasa de conversión respecto a la fase anterior.
                            </p>
                        </div>

                        {/* Coach Performance */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Users size={18} className="text-purple-600" /> Rendimiento de Retención por Coach
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Coach</th>
                                            <th className="px-6 py-4">Cartera</th>
                                            <th className="px-6 py-4">Activos</th>
                                            <th className="px-6 py-4">Bajas</th>
                                            <th className="px-6 py-4">Tasa Retención</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {advancedMetrics.coachStats.map(coach => (
                                            <tr key={coach.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900">{coach.name}</td>
                                                <td className="px-6 py-4 font-medium text-slate-500">{coach.total}</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-emerald-600 font-bold">{coach.active}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-red-400 font-bold">{coach.dropouts}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden min-w-[60px]">
                                                            <div
                                                                className={`h-full rounded-full ${coach.retentionRate > 80 ? 'bg-emerald-500' : coach.retentionRate > 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                style={{ width: `${coach.retentionRate}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="font-black text-slate-800">{Math.round(coach.retentionRate)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Failed Sales List */}
                    <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-red-50 flex justify-between items-center bg-red-50/30">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <AlertCircle size={18} className="text-red-600" /> Ventas con Problemas (Failed)
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Potencial de recuperación: {(sales.filter(s => s.status === 'failed').reduce((a, b) => a + b.sale_amount, 0)).toLocaleString()}€</p>
                            </div>
                            <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded">ACCIONES REQUERIDAS</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-widest" >
                                    <tr>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4">Importe</th>
                                        <th className="px-6 py-4">Closer</th>
                                        <th className="px-6 py-4">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {sales.filter(s => s.status === 'failed').slice(0, 5).map(s => (
                                        <tr key={s.id} className="hover:bg-red-50/30 transition-colors">
                                            <td className="px-6 py-4 text-slate-400">{new Date(s.sale_date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-700 block">{s.client_first_name} {s.client_last_name}</span>
                                                <span className="text-[10px] text-slate-400">{s.client_email}</span>
                                            </td>
                                            <td className="px-6 py-4 font-black text-red-600">{s.sale_amount.toLocaleString()}€</td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">{s.closer_name}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1 group">
                                                    Contactar <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {sales.filter(s => s.status === 'failed').length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">No hay ventas fallidas que recuperar. ¡Buen trabajo!</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Contract Durations Breakdown */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Clock size={18} className="text-blue-600" /> Desglose de Contratos Activos (Meses)
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">Distribución de duraciones contratadas por fase</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {['f1', 'f2', 'f3', 'f4', 'f5'].map((phase, idx) => (
                                <div key={phase} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Fase {idx + 1}</p>
                                    <div className="space-y-2">
                                        {Object.entries((advancedMetrics.durationStats as any)[phase]).length > 0 ? (
                                            Object.entries((advancedMetrics.durationStats as any)[phase])
                                                .sort((a, b) => Number(a[0]) - Number(b[0]))
                                                .map(([months, count]) => (
                                                    <div key={months} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                                        <span className="text-[11px] font-bold text-slate-600">{months} Meses</span>
                                                        <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{count as number}</span>
                                                    </div>
                                                ))
                                        ) : (
                                            <p className="text-[10px] text-slate-300 italic py-2 text-center">Sin datos</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Historical metrics comparison */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <LineChart size={18} className="text-purple-600" /> Evolución de Métricas Clave ({yearFilter})
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">Histórico mensual de Churn Rate e Ingreso medio</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Churn %</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Avg Revenue</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                        tickFormatter={(val) => `${val}%`}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                        tickFormatter={(val) => `${val}€`}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="top" height={36} />
                                    <Bar yAxisId="right" dataKey="ingresos" name="Ingresos Totales" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={40} opacity={0.3} />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="churn"
                                        name="Churn Rate %"
                                        stroke="#8b5cf6"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
            {/* Manual Renewal Modal */}
            {showRenewalModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">Registrar Renovación Manual</h3>
                            <button onClick={() => setShowRenewalModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email del Cliente</label>
                                <input
                                    type="email"
                                    value={renewalForm.clientEmail}
                                    onChange={e => setRenewalForm({ ...renewalForm, clientEmail: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="cliente@ejemplo.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Importe (€)</label>
                                    <input
                                        type="number"
                                        value={renewalForm.amount}
                                        onChange={e => setRenewalForm({ ...renewalForm, amount: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={renewalForm.date}
                                        onChange={e => setRenewalForm({ ...renewalForm, date: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fase</label>
                                    <select
                                        value={renewalForm.phase}
                                        onChange={e => setRenewalForm({ ...renewalForm, phase: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="F2">Fase 2</option>
                                        <option value="F3">Fase 3</option>
                                        <option value="F4">Fase 4</option>
                                        <option value="F5">Fase 5</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Coach (Opcional)</label>
                                    <select
                                        value={renewalForm.coachId}
                                        onChange={e => setRenewalForm({ ...renewalForm, coachId: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Detectar --</option>
                                        {coaches.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                onClick={() => setShowRenewalModal(false)}
                                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleManualRenewalSubmit}
                                disabled={savingRenewal || !renewalForm.clientEmail || !renewalForm.amount}
                                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingRenewal && <Loader2 className="w-4 h-4 animate-spin" />}
                                Guardar Renovación
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

