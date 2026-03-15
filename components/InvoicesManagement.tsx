import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import {
    Upload, FileText, CheckCircle2, AlertCircle,
    DollarSign, Search, Calendar, Clock, MessageSquare, X,
    Filter,
    Users,
    Briefcase,
    RotateCcw,
    Trash2,
    Copy,
    Check,
    CreditCard,
    Eye,
    EyeOff,
    Landmark
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { mockEvolution } from '../services/mockSupabase';
import { paymentService, PaymentReference } from '../services/paymentService'; // NEW IMPORT
import { useToast } from './ToastProvider';

// Extended Invoice type to include Role and Bank info locally
interface Invoice {
    id: string;
    coach_id: string;
    coach_name: string;
    coach_role?: string; // Add role
    period_date: string;
    amount: number;
    status: 'pending' | 'approved' | 'paid' | 'rejected';
    admin_notes?: string;
    invoice_url: string;
    submitted_at: string;
    coach_notes?: string;
    paid_at?: string; // Fecha de pago
    updated_at?: string;
    // Bank details
    bank_account_holder?: string;
    bank_account_iban?: string;
    bank_name?: string;
    tax_id?: string;
}

interface InvoicesManagementProps {
    currentUser: User;
}

export function InvoicesManagement({ currentUser }: InvoicesManagementProps) {
    // --- STATE ---
    const { toast } = useToast();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);

    // Modals
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        invoiceId: string | null;
        type: 'pay' | 'reject' | null;
    }>({ isOpen: false, invoiceId: null, type: null });

    // Review Data for Payment
    const [settlementPreview, setSettlementPreview] = useState<{
        items: PaymentReference[];
        total: number;
        loading: boolean;
    }>({ items: [], total: 0, loading: false });

    const [adminNote, setAdminNote] = useState('');
    const [processingAction, setProcessingAction] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'rejected'>('all');
    const [roleFilter, setRoleFilter] = useState<string>('all'); // New Role Filter

    // Bank details visibility
    const [expandedBankDetails, setExpandedBankDetails] = useState<string | null>(null);
    const [copiedIban, setCopiedIban] = useState<string | null>(null);

    const copyIban = (invoiceId: string, iban: string) => {
        navigator.clipboard.writeText(iban);
        setCopiedIban(invoiceId);
        setTimeout(() => setCopiedIban(null), 2000);
    };

    const currentYear = new Date().getFullYear();
    const [monthFilter, setMonthFilter] = useState<string>(String(new Date().getMonth() + 1)); // Default current month
    const [yearFilter, setYearFilter] = useState<string>(String(currentYear));

    // Upload Form
    const [uploading, setUploading] = useState(false);
    const [uploadData, setUploadData] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: '',
        file: null as File | null
    });

    const normalizedRole = (currentUser.role || '').toLowerCase();
    const isAdminOrAccounting = ['admin', 'contabilidad', 'direccion'].includes(normalizedRole);
    const availableRoles = [UserRole.COACH, UserRole.CLOSER, UserRole.ENDOCRINO, UserRole.PSICOLOGO, UserRole.CONTABILIDAD];

    // --- DATA FETCHING ---
    useEffect(() => {
        fetchData();
    }, [currentUser.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Users with Roles and Bank Details
            const { data: usersData } = await supabase.from('users').select('id, name, role, bank_account_holder, bank_account_iban, bank_name, tax_id');
            const userMap: Record<string, { name: string, role: string, bank_account_holder?: string, bank_account_iban?: string, bank_name?: string, tax_id?: string }> = {};
            if (usersData) {
                usersData.forEach(u => {
                    userMap[u.id] = {
                        name: u.name,
                        role: u.role,
                        bank_account_holder: u.bank_account_holder,
                        bank_account_iban: u.bank_account_iban,
                        bank_name: u.bank_name,
                        tax_id: u.tax_id
                    };
                });
            }

            // 2. Fetch Invoices
            let query = supabase
                .from('coach_invoices')
                .select('*')
                .order('submitted_at', { ascending: false });

            if (!isAdminOrAccounting) {
                query = query.eq('coach_id', currentUser.id);
            }

            const { data: invoicesData, error } = await query;
            if (error) throw error;

            // 3. Merge Data
            const mapped = invoicesData?.map(inv => {
                const userInfo = userMap[inv.coach_id];
                let resolvedRole = userInfo?.role;

                if (!resolvedRole && inv.coach_id === currentUser.id) {
                    resolvedRole = currentUser.role;
                }

                // Fallback for demo users or missing DB links
                if (!resolvedRole) {
                    const name = (inv.coach_name || '').toLowerCase();
                    if (name.includes('closer')) resolvedRole = 'closer';
                    else if (name.includes('endocrino') || name.includes('doctor')) resolvedRole = 'endocrino';
                    else if (name.includes('psico')) resolvedRole = 'psicologo';
                    else if (name.includes('coach') || name.includes('jesús') || name.includes('jesus')) resolvedRole = 'coach';
                    else resolvedRole = 'colaborador';
                }

                return {
                    ...inv,
                    coach_name: inv.coach_name || userInfo?.name || (inv.coach_id === currentUser.id ? currentUser.name : 'Desconocido'),
                    coach_role: resolvedRole,
                    bank_account_holder: userInfo?.bank_account_holder,
                    bank_account_iban: userInfo?.bank_account_iban,
                    bank_name: userInfo?.bank_name,
                    tax_id: userInfo?.tax_id
                };
            }) || [];

            setInvoices(mapped as any);

        } catch (err: any) {
            console.error("Error loading data:", err);
            toast.error(`Error cargando facturas: ${err.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    // --- ACTIONS ---
    const openActionModal = async (invoiceId: string, type: 'pay' | 'reject') => {
        setAdminNote('');
        setActionModal({ isOpen: true, invoiceId, type });

        // If paying, load commission preview
        if (type === 'pay') {
            const invoice = invoices.find(inv => inv.id === invoiceId);
            if (invoice) {
                setSettlementPreview({ items: [], total: 0, loading: true });
                try {
                    // Fetch staff user to properly pass to service
                    const { data: staffData } = await supabase.from('users').select('*').eq('id', invoice.coach_id).single();
                    if (staffData) {
                        const date = new Date(invoice.period_date);
                        const preview = await paymentService.getCommissionSettlementPreview(staffData, date.getMonth(), date.getFullYear());
                        setSettlementPreview({ items: preview.items, total: preview.total, loading: false });
                    }
                } catch (e) {
                    console.error("Error loading preview", e);
                    setSettlementPreview({ items: [], total: 0, loading: false });
                }
            }
        }
    };

    const confirmAction = async () => {
        if (!actionModal.invoiceId || !actionModal.type) return;

        setProcessingAction(true);
        const invoice = invoices.find(inv => inv.id === actionModal.invoiceId);

        if (!invoice) return;

        try {
            if (actionModal.type === 'pay') {
                // Fetch staff full object
                const { data: staffData } = await supabase.from('users').select('*').eq('id', invoice.coach_id).single();
                if (!staffData) throw new Error("Staff user not found");

                const result = await paymentService.confirmStaffPayment(
                    invoice,
                    staffData,
                    {
                        method: 'Transferencia',
                        paidDate: new Date().toISOString(),
                        notes: adminNote
                    }
                );

                if (!result.success) throw new Error(result.error);

                // Alert if there's a big mismatch
                const diff = Math.abs(invoice.amount - settlementPreview.total);
                if (diff > 5) {
                    // Just a warning log, we proceed anyway as amount is manual
                    console.warn(`Payment mismatch warning: Invoice ${invoice.amount} vs System ${settlementPreview.total}`);
                }

            } else {
                // Reject logic (standard update)
                const { error } = await supabase
                    .from('coach_invoices')
                    .update({
                        status: 'rejected',
                        admin_notes: adminNote,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', actionModal.invoiceId);

                if (error) throw error;
            }

            // UI Update
            const newStatus = actionModal.type === 'pay' ? 'paid' : 'rejected';
            const now = new Date().toISOString();

            setInvoices(prev => prev.map(inv =>
                inv.id === actionModal.invoiceId
                    ? { ...inv, status: newStatus, admin_notes: adminNote, paid_at: actionModal.type === 'pay' ? now : undefined }
                    : inv
            ));

            setActionModal({ isOpen: false, invoiceId: null, type: null });
            alert(actionModal.type === 'pay' ? 'Pago registrado y comisiones conciliadas correctamente.' : 'Factura devuelta correctamente.');

            // Refresh data from database to ensure sync
            fetchData();

        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setProcessingAction(false);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadData.file || !uploadData.amount) return;

        setUploading(true);
        try {
            const file = uploadData.file;
            const fileName = `${currentUser.id}/${uploadData.year}_${uploadData.month}_${Date.now()}.pdf`;

            const { error: upErr } = await supabase.storage.from('invoices').upload(fileName, file);
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(fileName);

            const { error: dbErr } = await supabase.from('coach_invoices').insert({
                coach_id: currentUser.id,
                coach_name: currentUser.name,
                period_date: `${uploadData.year}-${String(uploadData.month).padStart(2, '0')}-01`,
                amount: parseFloat(uploadData.amount),
                invoice_url: publicUrl,
                status: 'pending'
            });

            if (dbErr) throw dbErr;

            // Notify Admins
            const { data: adminUsers } = await supabase.from('users').select('id').in('role', ['admin', 'contabilidad', 'direccion']);
            if (adminUsers) {
                for (const admin of adminUsers) {
                    await mockEvolution.notifications.create({
                        user_id: admin.id,
                        title: '📄 Nueva Factura Recibida',
                        message: `${currentUser.name} ha subido una factura de ${uploadData.amount}€ para el periodo ${uploadData.month}/${uploadData.year}.`,
                        type: 'system'
                    });
                }
            }

            alert("Factura subida correctamente");
            setShowUploadModal(false);
            fetchData();

        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    // --- FILTER & CALCULATIONS ---
    const filteredInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.period_date);

        // 1. Search (Name)
        const matchSearch = inv.coach_name.toLowerCase().includes(searchTerm.toLowerCase());

        // 2. Status
        const matchStatus = statusFilter === 'all' || inv.status === statusFilter;

        // 3. Role
        const matchRole = roleFilter === 'all' || inv.coach_role === roleFilter;

        // 4. Date (Month/Year) - If "All", ignore.
        const matchYear = yearFilter === 'all' || invDate.getFullYear() === parseInt(yearFilter);
        const matchMonth = monthFilter === 'all' || (invDate.getMonth() + 1) === parseInt(monthFilter);

        return matchSearch && matchStatus && matchRole && matchYear && matchMonth;
    });

    // KPI Metrics (Based on CURRENT FILTERS to be responsive)
    const metrics = {
        pending: filteredInvoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0),
        paid: filteredInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0),
        count: filteredInvoices.length
    };

    const months = [
        { v: '1', l: 'Enero' }, { v: '2', l: 'Febrero' }, { v: '3', l: 'Marzo' },
        { v: '4', l: 'Abril' }, { v: '5', l: 'Mayo' }, { v: '6', l: 'Junio' },
        { v: '7', l: 'Julio' }, { v: '8', l: 'Agosto' }, { v: '9', l: 'Septiembre' },
        { v: '10', l: 'Octubre' }, { v: '11', l: 'Noviembre' }, { v: '12', l: 'Diciembre' }
    ];

    const years = [2024, 2025, 2026];

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                        Facturación y Pagos
                    </h1>
                    <p className="text-slate-500 mt-1">Gestión centralizada de finanzas y colaboradores</p>
                </div>
                {!isAdminOrAccounting && (
                    <button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white px-5 py-2.5 rounded-xl flex gap-2 items-center font-bold shadow-lg shadow-blue-500/20">
                        <Upload size={18} />
                        Subir Factura Mensual
                    </button>
                )}
            </div>

            {/* KPI CARDS (Responsive to filters) */}
            {isAdminOrAccounting && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Clock size={60} className="text-orange-500" />
                        </div>
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">Pendiente de Aprobación</p>
                        <p className="text-3xl font-extrabold text-slate-800 break-words">
                            {metrics.pending.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">En selección actual</p>
                    </div>

                    <div className="bg-slate-900 p-6 rounded-2xl shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <CheckCircle2 size={60} className="text-green-500" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pagado</p>
                        <p className="text-3xl font-extrabold text-white break-words">
                            {metrics.paid.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">En selección actual</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FileText size={60} className="text-blue-500" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Facturas Procesadas</p>
                        <p className="text-3xl font-extrabold text-slate-800">{metrics.count}</p>
                        <p className="text-xs text-slate-400 mt-2">Documentos totales</p>
                    </div>
                </div>
            )}

            {/* FILTERS TOOLBAR */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4">

                {/* Search - Only Admin */}
                {isAdminOrAccounting && (
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}

                <div className={`flex flex-wrap gap-2 items-center ${!isAdminOrAccounting ? 'w-full justify-between' : ''}`}>
                    {/* Role Filter - KEY FEATURE REQUEST - Only Admin */}
                    {isAdminOrAccounting && (
                        <>
                            <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-1">
                                <button
                                    onClick={() => setRoleFilter('all')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${roleFilter === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Todos
                                </button>
                                {availableRoles.map(role => (
                                    <button
                                        key={role}
                                        onClick={() => setRoleFilter(role)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md uppercase transition-all ${roleFilter === role ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                            <div className="w-px h-8 bg-slate-200 hidden sm:block mx-1"></div>
                        </>
                    )}

                    {/* Date Filters */}
                    <div className="flex gap-2">
                        <select
                            value={monthFilter}
                            onChange={e => setMonthFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium"
                        >
                            <option value="all">Todo el Año</option>
                            {months.map(m => (
                                <option key={m.v} value={m.v}>{m.l}</option>
                            ))}
                        </select>
                        <select
                            value={yearFilter}
                            onChange={e => setYearFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium"
                        >
                            <option value="all">Todos Años</option>
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-px h-8 bg-slate-200 hidden sm:block mx-1"></div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium"
                    >
                        <option value="all">Cualquier Estado</option>
                        <option value="pending">Pendientes</option>
                        <option value="paid">Pagados</option>
                        <option value="rejected">Rechazados</option>
                    </select>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-4">Colaborador</th>
                                <th className="px-6 py-4">Rol</th>
                                <th className="px-6 py-4">Periodo</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-right">Importe</th>
                                {isAdminOrAccounting && <th className="px-6 py-4 text-center">Datos Pago</th>}
                                <th className="px-6 py-4 text-center">Archivo</th>
                                {isAdminOrAccounting && <th className="px-6 py-4 text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdminOrAccounting ? 8 : 6} className="text-center py-12 text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search size={32} className="opacity-20" />
                                            <p>No se encontraron facturas con estos filtros.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredInvoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-slate-800">
                                        {inv.coach_name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wide border border-slate-200">
                                            {inv.coach_role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            <span className="capitalize">
                                                {new Date(inv.period_date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            {(() => {
                                                const isCorrected = inv.status === 'pending' && inv.coach_notes;
                                                return (
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm border
                                                        ${inv.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            inv.status === 'rejected' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                                isCorrected ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                                    'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                        {inv.status === 'paid' && <CheckCircle2 size={10} />}
                                                        {inv.status === 'rejected' && <RotateCcw size={10} />}
                                                        {isCorrected && <AlertCircle size={10} />}

                                                        {inv.status === 'paid' ? 'PAGADO' :
                                                            inv.status === 'rejected' ? 'DEVUELTA' :
                                                                isCorrected ? 'CORREGIDA' :
                                                                    'PENDIENTE'}
                                                    </span>
                                                );
                                            })()}

                                            {/* Admin Notes */}
                                            {inv.admin_notes && (
                                                <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] text-slate-500 max-w-[180px] italic shadow-inner" title={`Nota Admin: ${inv.admin_notes}`}>
                                                    <span className="font-bold not-italic text-slate-400 block text-[9px] uppercase mb-0.5">Admin:</span>
                                                    "{inv.admin_notes}"
                                                </div>
                                            )}

                                            {/* Coach Correction Notes */}
                                            {inv.coach_notes && inv.status === 'pending' && (
                                                <div className="mt-2 p-2 bg-indigo-50 rounded-lg border border-indigo-100 text-[10px] text-indigo-700 max-w-[180px] text-left shadow-sm animate-in fade-in slide-in-from-top-1" title={`Nota Corrección: ${inv.coach_notes}`}>
                                                    <span className="font-bold text-indigo-400 block text-[9px] uppercase mb-0.5 flex items-center gap-1">
                                                        <MessageSquare size={8} /> Corrección:
                                                    </span>
                                                    "{inv.coach_notes}"
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                                        {inv.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                    </td>

                                    {/* Datos bancarios - Solo Admin */}
                                    {isAdminOrAccounting && (
                                        <td className="px-4 py-4">
                                            {inv.bank_account_iban ? (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setExpandedBankDetails(expandedBankDetails === inv.id ? null : inv.id)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${expandedBankDetails === inv.id
                                                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600'
                                                            }`}
                                                    >
                                                        <Landmark size={12} />
                                                        {expandedBankDetails === inv.id ? 'Ocultar' : 'Ver IBAN'}
                                                    </button>

                                                    {/* Dropdown con datos bancarios */}
                                                    {expandedBankDetails === inv.id && (
                                                        <div className="absolute z-20 mt-2 right-0 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 animate-in fade-in slide-in-from-top-2">
                                                            <div className="space-y-3">
                                                                {inv.bank_account_holder && (
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Titular</p>
                                                                        <p className="text-sm font-medium text-slate-800">{inv.bank_account_holder}</p>
                                                                    </div>
                                                                )}
                                                                {inv.tax_id && (
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">NIF/CIF</p>
                                                                        <p className="text-sm font-mono text-slate-600">{inv.tax_id}</p>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">IBAN</p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <code className="flex-1 text-xs font-mono bg-slate-50 p-2 rounded border border-slate-200 text-slate-700">
                                                                            {inv.bank_account_iban}
                                                                        </code>
                                                                        <button
                                                                            onClick={() => copyIban(inv.id, inv.bank_account_iban!)}
                                                                            className="p-2 bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 rounded-lg border border-slate-200 transition-colors"
                                                                            title="Copiar IBAN"
                                                                        >
                                                                            {copiedIban === inv.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {inv.bank_name && (
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Banco</p>
                                                                        <p className="text-sm text-slate-600">{inv.bank_name}</p>
                                                                    </div>
                                                                )}
                                                                <div className="pt-2 border-t border-slate-100">
                                                                    <div className="flex items-center justify-between bg-emerald-50 p-2 rounded-lg">
                                                                        <span className="text-xs font-bold text-emerald-700">A transferir:</span>
                                                                        <span className="text-sm font-black text-emerald-700">{inv.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                                    <AlertCircle size={10} />
                                                    Sin datos
                                                </span>
                                            )}
                                        </td>
                                    )}

                                    <td className="px-6 py-4 text-center">
                                        <a
                                            href={inv.invoice_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                                        >
                                            <FileText size={14} />
                                            Ver PDF
                                        </a>
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        {isAdminOrAccounting ? (
                                            <div className="flex justify-end gap-2">
                                                {inv.status === 'pending' && (
                                                    <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => openActionModal(inv.id, 'pay')} title="Aprobar Pago" className="p-2 bg-white text-green-600 rounded-lg hover:bg-green-50 border border-slate-200 hover:border-green-200 shadow-sm transition-all hover:-translate-y-0.5">
                                                            <CheckCircle2 size={18} />
                                                        </button>
                                                        <button onClick={() => openActionModal(inv.id, 'reject')} title="Devolver para corregir" className="p-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 border border-slate-200 hover:border-orange-200 shadow-sm transition-all hover:-translate-y-0.5">
                                                            <RotateCcw size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                                {inv.status === 'rejected' && (
                                                    <button onClick={() => openActionModal(inv.id, 'pay')} title="Aprobar después de corrección" className="p-2 bg-white text-green-600 rounded-lg hover:bg-green-50 border border-slate-200 hover:border-green-200 shadow-sm transition-all hover:-translate-y-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100">
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            inv.status === 'rejected' && (
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('¿Quieres eliminar esta factura para subir una nueva corregida?')) {
                                                            try {
                                                                await supabase.from('coach_invoices').delete().eq('id', inv.id);
                                                                setInvoices(prev => prev.filter(i => i.id !== inv.id));
                                                            } catch (e) {
                                                                console.error(e);
                                                                alert('Error al eliminar');
                                                            }
                                                        }
                                                    }}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-100 transition-all font-bold text-xs"
                                                >
                                                    <Trash2 size={14} />
                                                    Corregir
                                                </button>
                                            )
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ACTION MODAL */}
            {actionModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className={`p-5 px-6 border-b flex justify-between items-center ${actionModal.type === 'pay' ? 'bg-green-50' : 'bg-orange-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${actionModal.type === 'pay' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {actionModal.type === 'pay' ? <CheckCircle2 size={20} /> : <RotateCcw size={20} />}
                                </div>
                                <h3 className={`font-bold text-lg ${actionModal.type === 'pay' ? 'text-green-900' : 'text-orange-900'}`}>
                                    {actionModal.type === 'pay' ? 'Confirmar Pago' : 'Devolver Factura'}
                                </h3>
                            </div>
                            <button onClick={() => setActionModal({ ...actionModal, isOpen: false })} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto">
                            {actionModal.type === 'pay' && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase flex items-center gap-2">
                                        <Briefcase size={14} /> Desglose de Comisiones (Sistema)
                                    </h4>

                                    {settlementPreview.loading ? (
                                        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-400" /></div>
                                    ) : (
                                        <div className="space-y-2">
                                            {settlementPreview.items.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">No se han detectado ventas o renovaciones en este periodo.</p>
                                            ) : (
                                                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                                    {settlementPreview.items.map(item => (
                                                        <div key={item.id} className="flex justify-between text-xs py-1 border-b border-slate-100">
                                                            <span>
                                                                <span className={`font-bold ${item.type === 'Renewal' ? 'text-purple-600' : 'text-slate-700'}`}>
                                                                    [{item.type === 'Renewal' ? 'R' : 'V'}]
                                                                </span> {item.clientName}
                                                            </span>
                                                            <span className="font-mono">{item.commission.toFixed(2)}€</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2 font-bold text-sm">
                                                <span>Total Calculado:</span>
                                                <span className={Math.abs(settlementPreview.total - (invoices.find(i => i.id === actionModal.invoiceId)?.amount || 0)) > 5 ? 'text-amber-600' : 'text-slate-800'}>
                                                    {settlementPreview.total.toFixed(2)}€
                                                </span>
                                            </div>
                                            {Math.abs(settlementPreview.total - (invoices.find(i => i.id === actionModal.invoiceId)?.amount || 0)) > 5 && (
                                                <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded mt-1">
                                                    ⚠️ El importe de la factura difiere del cálculo del sistema.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                                    Nota para el colaborador {actionModal.type === 'reject' && <span className="text-red-500">*</span>}
                                </label>
                                <textarea
                                    className="w-full border border-slate-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm resize-none"
                                    rows={3}
                                    placeholder={actionModal.type === 'pay' ? "Opcional: ID de transferencia, fecha..." : "Obligatorio: Razón del rechazo..."}
                                    value={adminNote}
                                    onChange={e => setAdminNote(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setActionModal({ ...actionModal, isOpen: false })} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmAction}
                                    disabled={processingAction || (actionModal.type === 'reject' && !adminNote.trim())}
                                    className={`flex-1 py-3 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50
                                        ${actionModal.type === 'pay' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
                                    `}
                                >
                                    {processingAction ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : (actionModal.type === 'pay' ? 'Confirmar Pago' : 'Devolver Factura')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* UPLOAD MODAL */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800">Subir Factura</h3>
                        </div>
                        <form onSubmit={handleUpload} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Año</label>
                                    <input className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" type="number" value={uploadData.year} onChange={e => setUploadData({ ...uploadData, year: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mes (1-12)</label>
                                    <input className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" type="number" min="1" max="12" value={uploadData.month} onChange={e => setUploadData({ ...uploadData, month: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Importe Total (€)</label>
                                <input className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" type="number" step="0.01" value={uploadData.amount} onChange={e => setUploadData({ ...uploadData, amount: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Archivo PDF</label>
                                <input type="file" accept=".pdf" onChange={e => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })} className="w-full" />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 p-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                                <button type="submit" disabled={uploading || !uploadData.file} className="flex-1 p-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">{uploading ? 'Subiendo...' : 'Subir'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}
