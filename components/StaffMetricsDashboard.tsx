import React, { useState, useEffect, useMemo } from 'react';
import { User, Client, UserRole, SupportTicket, ClientStatus, CoachInvoice } from '../types';
import { mockEvolution } from '../services/mockSupabase';
import {
    TrendingUp, BarChart3, Star, Phone, FileText, Upload,
    CheckCircle2, Clock, AlertCircle, ChevronRight, Filter,
    Download, Trash2, ExternalLink, Calendar, Wallet
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ToastProvider';

interface StaffMetricsDashboardProps {
    user: User;
    clients: Client[];
}

export function StaffMetricsDashboard({ user, clients }: StaffMetricsDashboardProps) {
    const toast = useToast();
    const [invoices, setInvoices] = useState<CoachInvoice[]>([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
    const [statsReal, setStatsReal] = useState({ testimonials: 0, calls: 0, salesCount: 0 });
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<CoachInvoice | null>(null);
    const [newInvoice, setNewInvoice] = useState({
        amount: '',
        period: new Date().toISOString().substring(0, 7), // YYYY-MM
        file: null as File | null,
        correctionNote: ''
    });
    const [isUploading, setIsUploading] = useState(false);

    const roleLower = (user.role || '').toLowerCase().replace(' ', '_');
    const isCoach = roleLower === 'coach' || roleLower === 'head_coach';
    const isCloser = roleLower === 'closer';

    // 1. RENEWALS CALCULATIONS (Only for Coaches)
    const stats = useMemo(() => {
        if (!isCoach) return null;
        const rLower = (user.role || '').toLowerCase().replace(' ', '_');
        const isHeadCoach = rLower === 'head_coach' || rLower === 'admin';
        const coachClients = isHeadCoach ? clients : clients.filter(c => {
            if (!c) return false;
            const cCoachId = (c.coach_id || '').toLowerCase();
            const userId = (user.id || '').toLowerCase();
            const userName = (user.name || '').toLowerCase();

            return cCoachId === userId ||
                cCoachId === userName ||
                (c.property_coach && (
                    c.property_coach.toLowerCase() === userName ||
                    c.property_coach.toLowerCase().includes(userName.split(' ')[0])
                ));
        });
        const [year, month] = selectedMonth.split('-').map(Number);

        let renewalsPotential = 0;
        let renewalsClosed = 0;

        coachClients.filter(c => c.status === ClientStatus.ACTIVE).forEach(c => {
            const phaseData = [
                { id: 'F2', date: c.program?.f1_endDate, contracted: c.program?.renewal_f2_contracted },
                { id: 'F3', date: c.program?.f2_endDate, contracted: c.program?.renewal_f3_contracted },
                { id: 'F4', date: c.program?.f3_endDate, contracted: c.program?.renewal_f4_contracted },
                { id: 'F5', date: c.program?.f4_endDate, contracted: c.program?.renewal_f5_contracted },
            ];

            const matches = phaseData.filter(p => {
                if (!p.date) return false;
                const d = new Date(p.date);
                // StaffMetricsDashboard uses month-1 because selectedMonth is YYYY-MM and getMonth() is 0-indexed
                return d.getMonth() === (month - 1) && d.getFullYear() === year;
            });

            if (matches.length > 0) {
                const bestMatch = matches.sort((a, b) => b.id.localeCompare(a.id))[0];
                renewalsPotential++;
                if (bestMatch.contracted) renewalsClosed++;
            }
        });

        const rate = renewalsPotential > 0 ? (renewalsClosed / renewalsPotential) * 100 : 0;

        return {
            totalClients: coachClients.length,
            renewalsPotential,
            renewalsClosed,
            renewalRate: rate.toFixed(1)
        };
    }, [clients, user.id, isCoach, selectedMonth]);

    useEffect(() => {
        loadInvoices();
        if (isCoach) loadRealStats();
        if (isCloser) loadCloserStats();
    }, [selectedMonth]); // Reload when month changes

    const getMonthDateRange = () => {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        // Start of month
        const start = new Date(year, month - 1, 1).toISOString();
        // End of month (last day)
        const end = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
        return { start, end };
    };

    const loadRealStats = async () => {
        const { start, end } = getMonthDateRange();
        const rLower = (user.role || '').toLowerCase().replace(' ', '_');
        try {
            let queryT = supabase
                .from('testimonials')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', start)
                .lte('created_at', end);

            let queryC = supabase
                .from('coaching_sessions')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', start)
                .lte('created_at', end);

            if (rLower !== 'head_coach' && rLower !== 'admin') {
                // If the DB has names instead of IDs, we should also check by coach_name or similar if available
                // For now, ID is the standard but let's be aware.
                queryT = queryT.or(`coach_id.eq.${user.id},coach_name.ilike.%${user.name.split(' ')[0]}%`);
                queryC = queryC.or(`coach_id.eq.${user.id},coach_name.ilike.%${user.name.split(' ')[0]}%`);
            }

            const { count: tCount } = await queryT;
            const { count: cCount } = await queryC;

            setStatsReal(prev => ({
                ...prev,
                testimonials: tCount || 0,
                calls: cCount || 0
            }));
        } catch (e) {
            console.error('Error fetching stats:', e);
        }
    };

    const loadCloserStats = async () => {
        const { start, end } = getMonthDateRange();
        try {
            const { count: sCount } = await supabase
                .from('sales')
                .select('*', { count: 'exact', head: true })
                .eq('closer_id', user.id)
                .gte('created_at', start)
                .lte('created_at', end);

            setStatsReal(prev => ({
                ...prev,
                salesCount: sCount || 0
            }));
        } catch (e) {
            console.error('Error fetching closer stats:', e);
        }
    };

    const loadInvoices = async () => {
        setIsLoadingInvoices(true);
        try {
            const data = await mockEvolution.invoices.getByCoach(user.id);
            setInvoices(data);
        } catch (error) {
            console.error('Error loading invoices:', error);
        } finally {
            setIsLoadingInvoices(false);
        }
    };

    const handleUploadInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting invoice...', newInvoice);

        if (!newInvoice.file || !newInvoice.amount) {
            toast.error("Selecciona un archivo y un importe");
            return;
        }

        setIsUploading(true);
        try {
            const file = newInvoice.file;
            const fileName = `${user.id}/${newInvoice.period}_${Date.now()}.pdf`;

            console.log('Step 1: Uploading to Storage...', fileName);
            // 1. Upload to Storage
            const { data: upData, error: upErr } = await supabase.storage
                .from('invoices')
                .upload(fileName, file);

            if (upErr) {
                console.error('Storage Upload Error:', upErr);
                throw new Error(`Error subiendo archivo: ${upErr.message}`);
            }

            console.log('Step 2: Getting Public URL...');
            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('invoices')
                .getPublicUrl(fileName);

            const invoiceData = {
                amount: parseFloat(newInvoice.amount),
                period_date: `${newInvoice.period}-01`,
                invoice_url: publicUrl,
                status: 'pending', // Reset to pending (corrección)
                coach_notes: editingInvoice ? newInvoice.correctionNote : undefined
            };

            console.log('Step 3: Saving to DB...', invoiceData);

            if (editingInvoice) {
                // UPDATE existing invoice
                const { error: dbErr } = await supabase
                    .from('coach_invoices')
                    .update(invoiceData)
                    .eq('id', editingInvoice.id);

                if (dbErr) throw dbErr;

                toast.success('Factura corregida enviada correctamente');
            } else {
                // CREATE new invoice
                const { error: dbErr } = await supabase
                    .from('coach_invoices')
                    .insert({
                        coach_id: user.id,
                        coach_name: user.name,
                        ...invoiceData
                    });

                if (dbErr) throw dbErr;

                toast.success('Factura subida correctamente');
            }

            setNewInvoice({ amount: '', period: new Date().toISOString().substring(0, 7), file: null, correctionNote: '' });
            setEditingInvoice(null);
            setShowUploadModal(false);
            loadInvoices();

        } catch (error: any) {
            console.error('Error in handleUploadInvoice:', error);
            toast.error(error.message || "Error al subir factura");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteInvoice = async (invoiceId: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta factura? Estás acción es permanente.')) {
            return;
        }

        try {
            await mockEvolution.invoices.delete(invoiceId);
            toast.success('Factura eliminada correctamente');
            loadInvoices();
        } catch (error) {
            console.error('Error deleting invoice:', error);
            toast.error('Error al eliminar la factura');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'approved': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header / KPI Row - Only for specific roles */}
            {(isCoach || isCloser) && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {isCoach && stats && (
                        <>
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <h4 className="font-bold text-slate-500 text-sm">Tasa Renovación</h4>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-800">{stats.renewalRate}%</span>
                                    <span className="text-xs font-bold text-slate-400">este mes</span>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <h4 className="font-bold text-slate-500 text-sm">Cerradas</h4>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-800">{stats.renewalsClosed}</span>
                                    <span className="text-xs font-bold text-slate-400">de {stats.renewalsPotential} posibles</span>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                                        <Star className="w-6 h-6" />
                                    </div>
                                    <h4 className="font-bold text-slate-500 text-sm">Testimonios</h4>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-800">{statsReal.testimonials}</span>
                                    <span className="text-xs font-bold text-slate-400">grabados</span>
                                </div>
                            </div>
                        </>
                    )}

                    {isCloser && (
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-slate-500 text-sm">Ventas</h4>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-800">{statsReal.salesCount}</span>
                                <span className="text-xs font-bold text-slate-400">este mes</span>
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                <Phone className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-slate-500 text-sm">Llamadas</h4>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-800">{statsReal.calls || 0}</span>
                            <span className="text-xs font-bold text-slate-400">totales</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoices Section - AVAILABLE FOR EVERYONE */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900 rounded-2xl text-white">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">Mis Facturas Mensuales</h3>
                            <p className="text-sm text-slate-500 font-medium">Gestiona tus cobros y sube tus facturas de servicio</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        <Upload className="w-5 h-5" />
                        Sube tu Factura
                    </button>
                </div>

                <div className="p-8">
                    {isLoadingInvoices ? (
                        <div className="py-20 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="py-20 text-center">
                            <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <h4 className="text-lg font-bold text-slate-400">Aún no has subido facturas</h4>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left border-b border-slate-100">
                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Periodo</th>
                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Imponible</th>
                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {invoices.map(invoice => (
                                        <tr key={invoice.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-4 font-bold text-slate-700 w-1/4">
                                                {new Date(invoice.period_date).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                                            </td>
                                            <td className="py-4 font-black text-slate-900 w-1/4">
                                                {invoice.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                            </td>
                                            <td className="py-4 w-1/3">
                                                <div className="flex flex-col gap-2">
                                                    <div>
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1.5 ${getStatusStyle(invoice.status)}`}>
                                                            {invoice.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                                                            {invoice.status === 'rejected' && <AlertCircle className="w-3 h-3" />}
                                                            {invoice.status === 'paid' ? 'Pagada' :
                                                                invoice.status === 'approved' ? 'Aprobada' :
                                                                    invoice.status === 'pending' ? 'Pendiente' : 'Devuelta'}
                                                        </span>
                                                    </div>
                                                    {invoice.status === 'rejected' && invoice.admin_notes && (
                                                        <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 text-xs text-orange-800 leading-relaxed max-w-sm">
                                                            <span className="font-bold block mb-1 flex items-center gap-1">
                                                                <FileText className="w-3 h-3" />
                                                                Nota de revisión:
                                                            </span>
                                                            "{invoice.admin_notes}"
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 text-right px-4">
                                                <div className="flex justify-end gap-2">
                                                    {/* Botón de Borrar (Permitir siempre para que pueda corregir errores) */}
                                                    <button
                                                        onClick={() => handleDeleteInvoice(invoice.id)}
                                                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-rose-500 rounded-xl text-xs font-bold hover:bg-rose-50 transition-all hover:border-rose-200"
                                                        title="Eliminar Factura"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>

                                                    <a
                                                        href={invoice.invoice_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all hover:border-indigo-200"
                                                        title="Descargar PDF"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                    {invoice.status === 'rejected' && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingInvoice(invoice);
                                                                setNewInvoice({
                                                                    amount: invoice.amount.toString(),
                                                                    period: invoice.period_date.substring(0, 7), // YYYY-MM
                                                                    file: null,
                                                                    correctionNote: ''
                                                                });
                                                                setShowUploadModal(true);
                                                            }}
                                                            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all hover:border-indigo-200 shadow-sm"
                                                            title="Corregir y Reenviar"
                                                        >
                                                            <Upload className="w-4 h-4" />
                                                            Corregir
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                {editingInvoice ? 'Corregir Factura' : 'Subir Factura'}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium">
                                {editingInvoice
                                    ? 'Sube la versión corregida y explica los cambios.'
                                    : 'Introduce los datos de tu liquidación mensual'}
                            </p>
                        </div>
                        <form onSubmit={handleUploadInvoice} className="p-8 space-y-6">
                            {editingInvoice && (
                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-xs text-orange-800 mb-4">
                                    <span className="font-bold block mb-1">Motivo de devolución:</span>
                                    "{editingInvoice.admin_notes}"
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Mes a Liquidar</label>
                                <input
                                    type="month"
                                    required
                                    value={newInvoice.period}
                                    onChange={e => setNewInvoice({ ...newInvoice, period: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Importe Total (con IVA)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="0.00 €"
                                    value={newInvoice.amount}
                                    onChange={e => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    {editingInvoice ? 'Nueva Factura Corregida (PDF)' : 'Archivo PDF de la Factura'}
                                </label>
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 transition-all cursor-pointer relative group">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        required
                                        onChange={e => setNewInvoice({ ...newInvoice, file: e.target.files?.[0] || null })}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className={`w-8 h-8 mx-auto mb-2 ${newInvoice.file ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`} />
                                    <p className="text-sm font-bold text-slate-600">
                                        {newInvoice.file ? newInvoice.file.name : 'Selecciona o arrastra tu PDF'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Máximo 10MB</p>
                                </div>
                            </div>

                            {editingInvoice && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nota de Corrección (Opcional)</label>
                                    <textarea
                                        rows={2}
                                        value={newInvoice.correctionNote}
                                        onChange={e => setNewInvoice({ ...newInvoice, correctionNote: e.target.value })}
                                        placeholder="Ej: He añadido el IRPF correcto..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 text-sm"
                                    />
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowUploadModal(false);
                                        setEditingInvoice(null);
                                        setNewInvoice({ amount: '', period: new Date().toISOString().substring(0, 7), file: null, correctionNote: '' });
                                    }}
                                    className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-50 rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className={`flex-1 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-slate-100 transition-all active:scale-95 flex items-center justify-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'}`}
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Subiendo...
                                        </>
                                    ) : (editingInvoice ? 'Enviar Corrección' : 'Enviar Factura')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
