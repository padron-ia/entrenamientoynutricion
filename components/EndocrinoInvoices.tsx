import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import {
    FileText,
    Upload,
    Calendar,
    CheckCircle2,
    Clock,
    X,
    ExternalLink,
    Plus,
    Euro,
    AlertCircle
} from 'lucide-react';

interface EndocrinoInvoice {
    id: string;
    user_id: string;
    user_name: string;
    file_url: string;
    file_name: string;
    month: string; // YYYY-MM format
    amount?: number;
    notes?: string;
    status: 'pending' | 'paid';
    created_at: string;
    paid_at?: string;
}

interface EndocrinoInvoicesProps {
    currentUser: User;
}

const EndocrinoInvoices: React.FC<EndocrinoInvoicesProps> = ({ currentUser }) => {
    const [invoices, setInvoices] = useState<EndocrinoInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [invoiceMonth, setInvoiceMonth] = useState(getCurrentMonth());
    const [invoiceAmount, setInvoiceAmount] = useState('');
    const [invoiceNotes, setInvoiceNotes] = useState('');

    function getCurrentMonth() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    useEffect(() => {
        loadInvoices();
    }, [currentUser.id]);

    const loadInvoices = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('staff_invoices')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvoices(data || []);
        } catch (err) {
            console.error('Error loading invoices:', err);
            // If table doesn't exist, just show empty
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            alert('Por favor selecciona un archivo');
            return;
        }

        setUploading(true);
        try {
            // Upload file to storage
            const fileName = `${currentUser.id}/${Date.now()}_${selectedFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from('staff-invoices')
                .upload(fileName, selectedFile);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('staff-invoices')
                .getPublicUrl(fileName);

            // Save invoice record
            const { error: insertError } = await supabase
                .from('staff_invoices')
                .insert({
                    user_id: currentUser.id,
                    user_name: currentUser.name,
                    file_url: publicUrl,
                    file_name: selectedFile.name,
                    month: invoiceMonth,
                    amount: invoiceAmount ? parseFloat(invoiceAmount) : null,
                    notes: invoiceNotes || null,
                    status: 'pending'
                });

            if (insertError) throw insertError;

            // Reset and reload
            setShowUploadModal(false);
            setSelectedFile(null);
            setInvoiceMonth(getCurrentMonth());
            setInvoiceAmount('');
            setInvoiceNotes('');
            loadInvoices();
        } catch (err) {
            console.error('Error uploading invoice:', err);
            alert('Error al subir la factura. Contacta con administracion.');
        } finally {
            setUploading(false);
        }
    };

    const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    };

    const pendingInvoices = invoices.filter(i => i.status === 'pending');
    const paidInvoices = invoices.filter(i => i.status === 'paid');

    return (
        <div className="p-6 max-w-4xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-2xl text-blue-700">
                            <FileText className="w-8 h-8" />
                        </div>
                        Mis Facturas
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Sube tus facturas mensuales para que contabilidad las procese.
                    </p>
                </div>

                <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 transition-all hover:scale-105"
                >
                    <Plus className="w-5 h-5" /> Nueva Factura
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-xl">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{pendingInvoices.length}</p>
                            <p className="text-xs text-slate-500">Pendientes de pago</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-xl">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{paidInvoices.length}</p>
                            <p className="text-xs text-slate-500">Pagadas</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl">
                            <Euro className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{invoices.length}</p>
                            <p className="text-xs text-slate-500">Total facturas</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoices List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900">Historial de Facturas</h2>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">Cargando facturas...</div>
                ) : invoices.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="font-bold text-slate-700 mb-1">Sin facturas</h3>
                        <p className="text-slate-500 text-sm">Aun no has subido ninguna factura.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {invoices.map(invoice => (
                            <div key={invoice.id} className="p-5 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                            invoice.status === 'paid'
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : 'bg-amber-100 text-amber-600'
                                        }`}>
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 capitalize">
                                                {formatMonth(invoice.month)}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Calendar className="w-3 h-3" />
                                                Subida: {new Date(invoice.created_at).toLocaleDateString('es-ES')}
                                                {invoice.amount && (
                                                    <span className="font-semibold text-slate-700">
                                                        - {invoice.amount.toFixed(2)}€
                                                    </span>
                                                )}
                                            </div>
                                            {invoice.notes && (
                                                <p className="text-xs text-slate-400 mt-1 italic">"{invoice.notes}"</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            invoice.status === 'paid'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {invoice.status === 'paid' ? 'Pagada' : 'Pendiente'}
                                        </span>
                                        <a
                                            href={invoice.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowUploadModal(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900">Subir Factura</h2>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* File Upload */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Archivo de Factura *</label>
                                <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                                    selectedFile
                                        ? 'border-emerald-300 bg-emerald-50'
                                        : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
                                }`}>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    />
                                    {selectedFile ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                            <span className="font-medium text-emerald-700">{selectedFile.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-blue-50 text-blue-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium">Click para seleccionar archivo</p>
                                            <p className="text-xs text-slate-400 mt-1">PDF, JPG o PNG</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Month */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Mes de la Factura *</label>
                                <input
                                    type="month"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    value={invoiceMonth}
                                    onChange={(e) => setInvoiceMonth(e.target.value)}
                                />
                            </div>

                            {/* Amount */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Importe (opcional)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        value={invoiceAmount}
                                        onChange={(e) => setInvoiceAmount(e.target.value)}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Notas (opcional)</label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[80px]"
                                    placeholder="Cualquier comentario relevante..."
                                    value={invoiceNotes}
                                    onChange={(e) => setInvoiceNotes(e.target.value)}
                                />
                            </div>

                            {/* Info */}
                            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-700">
                                    Contabilidad revisara tu factura y procesara el pago. Recibiras la confirmacion cuando este pagada.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading || !selectedFile}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                ) : (
                                    <Upload className="w-5 h-5" />
                                )}
                                Subir Factura
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EndocrinoInvoices;
