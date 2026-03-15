import React, { useState } from 'react';
import {
    CheckCircle2, Circle, ChevronDown, ChevronUp, Calendar,
    CreditCard, FileText, FileCheck, FileX, Upload, Loader2,
    Zap, AlertCircle, ExternalLink, Send, Clock, Eye, Link
} from 'lucide-react';
import { Client, ProgramData } from '../types';
import { supabase } from '../services/supabaseClient';

// ============================================
// PREMIUM RENEWAL TIMELINE COMPONENT
// Unified, simplified renewal management
// ============================================

interface PaymentLink {
    id: string;
    name: string;
    price: number;
    url: string;
    duration_months?: number;
}

interface RenewalTimelineProps {
    client: Client;
    formData: Client;
    isEditing: boolean;
    paymentLinks: PaymentLink[];
    paymentMethods: Array<{ id: string; name: string; platform_fee_percentage: number }>;
    onUpdate: (path: string, value: any) => void;
    onAutoActivate: (phase: string) => Promise<void>;
    onSave?: (data: Client) => Promise<void>;
}

// Helper function for payment method colors
const getPaymentMethodStyle = (method: string) => {
    switch (method?.toLowerCase()) {
        case 'stripe': return 'bg-gradient-to-r from-purple-500 to-indigo-600';
        case 'hotmart': return 'bg-gradient-to-r from-orange-500 to-red-500';
        case 'paypal': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
        case 'bizum': return 'bg-gradient-to-r from-teal-500 to-emerald-500';
        case 'transferencia': return 'bg-gradient-to-r from-slate-500 to-gray-600';
        default: return 'bg-slate-400';
    }
};

const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
        'stripe': 'Stripe',
        'hotmart': 'Hotmart',
        'transferencia': 'Transferencia',
        'paypal': 'PayPal',
        'bizum': 'Bizum'
    };
    return labels[method?.toLowerCase()] || method || '-';
};

// ============================================
// PHASE CARD - Compact, expandable design
// ============================================
interface PhaseCardProps {
    phase: number;
    title: string;
    isContracted: boolean;
    isActive: boolean; // Currently within this phase dates
    isPending: boolean; // Has start date but not contracted
    startDate?: string;
    endDate?: string;
    duration?: number;
    amount?: number;
    paymentMethod?: string;
    receiptUrl?: string;
    serviceName?: string;
    isEditing: boolean;
    formData: Client;
    onUpdate: (path: string, value: any) => void;
    isFirst?: boolean;
    isLast?: boolean;
    showPaymentPanel?: boolean;
    onAutoActivate?: () => Promise<void>;
    paymentMethods: Array<{ id: string; name: string; platform_fee_percentage: number }>;
    paymentLinks?: PaymentLink[];
    renewalStatus?: string; // none, pending, uploaded, verified
    renewalPhase?: string; // Current renewal phase being processed
    onSendRenewalLink?: (phase: string, link: string, duration: number) => Promise<void>;
}

const PhaseCard: React.FC<PhaseCardProps> = ({
    phase,
    title,
    isContracted,
    isActive,
    isPending,
    startDate,
    endDate,
    duration,
    amount,
    paymentMethod,
    receiptUrl,
    serviceName,
    isEditing,
    formData,
    onUpdate,
    isFirst = false,
    isLast = false,
    showPaymentPanel = false,
    onAutoActivate,
    paymentMethods,
    paymentLinks = [],
    renewalStatus,
    renewalPhase,
    onSendRenewalLink
}) => {
    const [isExpanded, setIsExpanded] = useState(isActive || showPaymentPanel);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedLinkId, setSelectedLinkId] = useState<string>('');
    const [isSendingLink, setIsSendingLink] = useState(false);

    // Check if this phase is the one being processed for renewal
    const isThisPhaseInRenewal = renewalPhase === `F${phase}`;
    const showRenewalPanel = phase > 1 && !isContracted && isPending;

    const hasData = !!startDate;
    const phaseKey = phase === 1 ? '' : `f${phase}`;

    // Calculate status
    const today = new Date().toISOString().split('T')[0];
    const isWithinDates = startDate && endDate && today >= startDate && today <= endDate;
    const isExpired = endDate && today > endDate;

    // Determine visual state
    let statusColor = 'slate';
    let statusLabel = 'Pendiente';
    let statusBg = 'bg-slate-100 border-slate-200';

    if (isContracted) {
        if (isExpired) {
            statusColor = 'blue';
            statusLabel = 'Completado';
            statusBg = 'bg-blue-50 border-blue-200';
        } else if (isWithinDates) {
            statusColor = 'green';
            statusLabel = 'Vigente';
            statusBg = 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200';
        } else {
            statusColor = 'green';
            statusLabel = 'Contratado';
            statusBg = 'bg-green-50 border-green-200';
        }
    } else if (isPending && hasData) {
        statusColor = 'amber';
        statusLabel = 'Pendiente Pago';
        statusBg = 'bg-amber-50 border-amber-200';
    }

    const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${formData.id}/phase${phase}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(fileName);

            if (phase === 1) {
                // For F1, we might use a different field - skip for now
            } else {
                onUpdate(`program.f${phase}_receipt_url`, publicUrl);
            }
        } catch (err) {
            console.error('Error uploading receipt:', err);
        } finally {
            setIsUploading(false);
        }
    };

    if (!hasData && phase !== 1) {
        // Future phase without dates yet - minimal display
        return (
            <div className="relative">
                {/* Timeline connector */}
                {!isFirst && (
                    <div className="absolute left-5 -top-4 w-0.5 h-4 bg-slate-200" />
                )}
                <div className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 opacity-60 transition-opacity hover:opacity-80`}>
                    <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center shrink-0">
                        <Circle className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-400 text-sm">{title}</h4>
                        <p className="text-xs text-slate-400">Pendiente fase anterior</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Timeline connector */}
            {!isFirst && (
                <div className={`absolute left-5 -top-4 w-0.5 h-4 ${isContracted ? 'bg-emerald-300' : 'bg-slate-200'}`} />
            )}

            <div className={`relative rounded-2xl border-2 ${statusBg} overflow-hidden transition-all duration-300 ${isWithinDates ? 'shadow-lg shadow-emerald-100 ring-2 ring-emerald-300' : 'shadow-sm'}`}>
                {/* Header - Always visible */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/30 transition-colors"
                >
                    {/* Status Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isContracted
                            ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-lg shadow-emerald-200'
                            : isPending
                                ? 'bg-amber-100 border-2 border-amber-300 text-amber-600'
                                : 'bg-slate-100 border-2 border-slate-200 text-slate-400'
                        }`}>
                        {isContracted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </div>

                    {/* Title & Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className={`font-black text-sm ${isContracted ? 'text-slate-900' : 'text-slate-600'}`}>
                                {title}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusColor === 'green' ? 'bg-emerald-100 text-emerald-700' :
                                    statusColor === 'blue' ? 'bg-blue-100 text-blue-700' :
                                        statusColor === 'amber' ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-100 text-slate-500'
                                }`}>
                                {statusLabel}
                            </span>
                        </div>
                        {startDate && (
                            <p className="text-xs text-slate-500 mt-0.5">
                                {new Date(startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                {endDate && ` → ${new Date(endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                                {duration && <span className="ml-2 text-slate-400">({duration} meses)</span>}
                            </p>
                        )}
                    </div>

                    {/* Amount Badge */}
                    {amount && amount > 0 && (
                        <div className="text-right">
                            <p className="font-black text-lg text-slate-900">{amount.toLocaleString()}€</p>
                            {paymentMethod && (
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold text-white ${getPaymentMethodStyle(paymentMethod)}`}>
                                    {getPaymentMethodLabel(paymentMethod)}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Expand icon */}
                    <div className="p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-black/5 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Dates */}
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Inicio</label>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={startDate || ''}
                                            onChange={(e) => onUpdate(phase === 1 ? 'start_date' : `program.f${phase}_renewalDate`, e.target.value)}
                                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                    ) : (
                                        <p className="text-sm font-semibold text-slate-700 mt-1">
                                            {startDate ? new Date(startDate).toLocaleDateString('es-ES') : '-'}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Fin</label>
                                    <p className="text-sm font-semibold text-slate-700 mt-1">
                                        {endDate ? new Date(endDate).toLocaleDateString('es-ES') : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Duración</label>
                                {isEditing ? (
                                    <select
                                        value={duration || '3'}
                                        onChange={(e) => onUpdate(phase === 1 ? 'program_duration_months' : `program.f${phase}_duration`, parseInt(e.target.value))}
                                        className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(m => (
                                            <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-sm font-semibold text-slate-700 mt-1">
                                        {duration ? `${duration} meses` : '-'}
                                    </p>
                                )}

                                {serviceName && (
                                    <div className="mt-3">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Servicio</label>
                                        <p className="text-sm font-medium text-slate-600 mt-1">{serviceName}</p>
                                    </div>
                                )}
                            </div>

                            {/* Payment Info */}
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Importe</label>
                                    {isEditing && phase !== 1 ? (
                                        <div className="relative mt-1">
                                            <input
                                                type="number"
                                                value={amount || ''}
                                                onChange={(e) => onUpdate(`program.f${phase}_amount`, parseFloat(e.target.value) || 0)}
                                                placeholder="0"
                                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-8"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                                        </div>
                                    ) : (
                                        <p className="text-xl font-black text-slate-900 mt-1">
                                            {amount ? `${amount.toLocaleString()}€` : <span className="text-slate-300 text-sm font-normal">-</span>}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Método</label>
                                    {isEditing && phase !== 1 ? (
                                        <select
                                            value={paymentMethod || 'stripe'}
                                            onChange={(e) => onUpdate(`program.f${phase}_payment_method`, e.target.value)}
                                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="stripe">Stripe</option>
                                            <option value="hotmart">Hotmart</option>
                                            <option value="transferencia">Transferencia</option>
                                            <option value="paypal">PayPal</option>
                                            <option value="bizum">Bizum</option>
                                        </select>
                                    ) : (
                                        <div className="mt-1">
                                            {paymentMethod ? (
                                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold text-white ${getPaymentMethodStyle(paymentMethod)}`}>
                                                    {getPaymentMethodLabel(paymentMethod)}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-slate-300">-</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Receipt */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Comprobante</label>
                                <div className="mt-2">
                                    {receiptUrl ? (
                                        <a
                                            href={receiptUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-200 hover:shadow-xl transition-all"
                                        >
                                            <FileCheck className="w-4 h-4" />
                                            Ver Documento
                                        </a>
                                    ) : (
                                        <div className="space-y-2">
                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 bg-slate-100 rounded-lg">
                                                <FileX className="w-3 h-3" /> Sin documento
                                            </span>
                                            {isEditing && phase !== 1 && (
                                                <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*,.pdf"
                                                        onChange={handleReceiptUpload}
                                                    />
                                                    {isUploading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                                    ) : (
                                                        <Upload className="w-4 h-4 text-slate-400" />
                                                    )}
                                                    <span className="text-xs font-medium text-slate-500">Subir</span>
                                                </label>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* === RENEWAL LINK PANEL === */}
                        {phase > 1 && !isContracted && (
                            <div className="mt-4 pt-4 border-t border-black/5">
                                {/* Status: No link sent yet */}
                                {(!isThisPhaseInRenewal || renewalStatus === 'none') && (
                                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 bg-indigo-100 rounded-lg">
                                                <Send className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">Enviar Enlace de Pago</h4>
                                                <p className="text-xs text-slate-500">El cliente verá un banner en su portal</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <select
                                                value={selectedLinkId}
                                                onChange={(e) => setSelectedLinkId(e.target.value)}
                                                className="flex-1 px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            >
                                                <option value="">Seleccionar enlace de pago...</option>
                                                {paymentLinks.filter(pl => pl.url !== 'MANUAL').map(link => (
                                                    <option key={link.id} value={link.id}>
                                                        {link.name} - {link.price}€ {link.duration_months ? `(${link.duration_months}m)` : ''}
                                                    </option>
                                                ))}
                                            </select>

                                            <button
                                                onClick={async () => {
                                                    const link = paymentLinks.find(pl => pl.id === selectedLinkId);
                                                    if (!link || !onSendRenewalLink) return;
                                                    setIsSendingLink(true);
                                                    try {
                                                        await onSendRenewalLink(`F${phase}`, link.url, link.duration_months || 3);
                                                        setSelectedLinkId('');
                                                    } finally {
                                                        setIsSendingLink(false);
                                                    }
                                                }}
                                                disabled={!selectedLinkId || isSendingLink}
                                                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                                            >
                                                {isSendingLink ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                                Enviar al Cliente
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Status: Link sent, waiting for payment */}
                                {isThisPhaseInRenewal && renewalStatus === 'pending' && (
                                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-amber-100 rounded-lg animate-pulse">
                                                    <Clock className="w-4 h-4 text-amber-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-amber-800 text-sm">Esperando pago del cliente</h4>
                                                    <p className="text-xs text-amber-600">El enlace ya está visible en su portal</p>
                                                </div>
                                            </div>
                                            {formData.renewal_payment_link && (
                                                <a
                                                    href={formData.renewal_payment_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium"
                                                >
                                                    <Link className="w-3 h-3" /> Ver enlace
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Status: Receipt uploaded, needs verification */}
                                {isThisPhaseInRenewal && renewalStatus === 'uploaded' && (
                                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-100 rounded-lg">
                                                    <FileCheck className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-emerald-800 text-sm">Comprobante recibido</h4>
                                                    <p className="text-xs text-emerald-600">Revisa y activa la renovación</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {formData.renewal_receipt_url && (
                                                    <a
                                                        href={formData.renewal_receipt_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 font-medium"
                                                    >
                                                        <Eye className="w-3 h-3" /> Ver comprobante
                                                    </a>
                                                )}
                                                {onAutoActivate && (
                                                    <button
                                                        onClick={onAutoActivate}
                                                        className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-xs font-bold shadow-lg hover:shadow-xl transition-all"
                                                    >
                                                        <Zap className="w-3 h-3" />
                                                        Verificar y Activar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Contracted Toggle (only in editing mode) */}
                        {isEditing && phase !== 1 && (
                            <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isContracted}
                                        onChange={(e) => onUpdate(`program.renewal_f${phase}_contracted`, e.target.checked)}
                                        className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-bold text-slate-700">Marcar como contratado</span>
                                </label>

                                {/* Quick activate button - only show if no renewal panel is visible */}
                                {!isContracted && onAutoActivate && !isThisPhaseInRenewal && (formData.renewal_receipt_url || amount) && (
                                    <button
                                        onClick={onAutoActivate}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-105 transition-all"
                                    >
                                        <Zap className="w-4 h-4" />
                                        Activar Renovación
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================
const RenewalTimeline: React.FC<RenewalTimelineProps> = ({
    client,
    formData,
    isEditing,
    paymentLinks,
    paymentMethods,
    onUpdate,
    onAutoActivate,
    onSave
}) => {
    const program = formData.program;
    const today = new Date().toISOString().split('T')[0];

    // Phase 1 data
    const f1Start = formData.start_date;
    const f1End = program.f1_endDate;
    const f1Duration = formData.program_duration_months;
    const f1Active = f1Start && f1End && today >= f1Start && today <= f1End;

    // Renewal status
    const renewalStatus = formData.renewal_payment_status || 'none';
    const renewalPhase = formData.renewal_phase;

    // Handler to send renewal link to client
    const handleSendRenewalLink = async (phase: string, linkUrl: string, duration: number) => {
        try {
            // Update database directly
            const { error } = await supabase
                .from('clientes_pt_notion')
                .update({
                    renewal_payment_link: linkUrl,
                    renewal_payment_status: 'pending',
                    renewal_phase: phase,
                    renewal_duration: duration
                })
                .eq('id', formData.id);

            if (error) throw error;

            // Update local state
            onUpdate('renewal_payment_link', linkUrl);
            onUpdate('renewal_payment_status', 'pending');
            onUpdate('renewal_phase', phase);
            onUpdate('renewal_duration', duration);

            alert(`✅ Enlace enviado al cliente.\n\nEl banner de renovación ya es visible en su portal.`);
        } catch (err: any) {
            console.error('Error sending renewal link:', err);
            alert('Error al enviar el enlace: ' + err.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 text-lg">Historial de Contratos</h3>
                        <p className="text-xs text-slate-500">Gestión unificada de renovaciones</p>
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-blue-800 font-medium">
                        Las fechas se calculan automáticamente en cascada.
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                        El fin de una fase determina el inicio de la siguiente. Marca "Contratado" para activar.
                    </p>
                </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
                {/* Phase 1 */}
                <PhaseCard
                    phase={1}
                    title="Fase 1 (Inicio)"
                    isContracted={true}
                    isActive={!!f1Active}
                    isPending={false}
                    startDate={f1Start}
                    endDate={f1End}
                    duration={f1Duration}
                    serviceName={program.contract1_name || program.programType}
                    isEditing={isEditing}
                    formData={formData}
                    onUpdate={onUpdate}
                    isFirst={true}
                    paymentMethods={paymentMethods}
                />

                {/* Phase 2 */}
                <PhaseCard
                    phase={2}
                    title="Renovación F2"
                    isContracted={!!program.renewal_f2_contracted}
                    isActive={program.f2_renewalDate && program.f2_endDate ? today >= program.f2_renewalDate && today <= program.f2_endDate : false}
                    isPending={!!program.f2_renewalDate && !program.renewal_f2_contracted}
                    startDate={program.f2_renewalDate}
                    endDate={program.f2_endDate}
                    duration={program.f2_duration}
                    amount={program.f2_amount}
                    paymentMethod={program.f2_payment_method}
                    receiptUrl={program.f2_receipt_url}
                    serviceName={program.contract2_name}
                    isEditing={isEditing}
                    formData={formData}
                    onUpdate={onUpdate}
                    showPaymentPanel={formData.renewal_phase === 'F2'}
                    onAutoActivate={() => onAutoActivate('F2')}
                    paymentMethods={paymentMethods}
                    paymentLinks={paymentLinks}
                    renewalStatus={renewalStatus}
                    renewalPhase={renewalPhase}
                    onSendRenewalLink={handleSendRenewalLink}
                />

                {/* Phase 3 */}
                <PhaseCard
                    phase={3}
                    title="Renovación F3"
                    isContracted={!!program.renewal_f3_contracted}
                    isActive={program.f3_renewalDate && program.f3_endDate ? today >= program.f3_renewalDate && today <= program.f3_endDate : false}
                    isPending={!!program.f3_renewalDate && !program.renewal_f3_contracted}
                    startDate={program.f3_renewalDate}
                    endDate={program.f3_endDate}
                    duration={program.f3_duration}
                    amount={program.f3_amount}
                    paymentMethod={program.f3_payment_method}
                    receiptUrl={program.f3_receipt_url}
                    serviceName={program.contract3_name}
                    isEditing={isEditing}
                    formData={formData}
                    onUpdate={onUpdate}
                    showPaymentPanel={formData.renewal_phase === 'F3'}
                    onAutoActivate={() => onAutoActivate('F3')}
                    paymentMethods={paymentMethods}
                    paymentLinks={paymentLinks}
                    renewalStatus={renewalStatus}
                    renewalPhase={renewalPhase}
                    onSendRenewalLink={handleSendRenewalLink}
                />

                {/* Phase 4 */}
                <PhaseCard
                    phase={4}
                    title="Renovación F4"
                    isContracted={!!program.renewal_f4_contracted}
                    isActive={program.f4_renewalDate && program.f4_endDate ? today >= program.f4_renewalDate && today <= program.f4_endDate : false}
                    isPending={!!program.f4_renewalDate && !program.renewal_f4_contracted}
                    startDate={program.f4_renewalDate}
                    endDate={program.f4_endDate}
                    duration={program.f4_duration}
                    amount={program.f4_amount}
                    paymentMethod={program.f4_payment_method}
                    receiptUrl={program.f4_receipt_url}
                    serviceName={program.contract4_name}
                    isEditing={isEditing}
                    formData={formData}
                    onUpdate={onUpdate}
                    showPaymentPanel={formData.renewal_phase === 'F4'}
                    onAutoActivate={() => onAutoActivate('F4')}
                    paymentMethods={paymentMethods}
                    paymentLinks={paymentLinks}
                    renewalStatus={renewalStatus}
                    renewalPhase={renewalPhase}
                    onSendRenewalLink={handleSendRenewalLink}
                />

                {/* Phase 5 */}
                <PhaseCard
                    phase={5}
                    title="Renovación F5 (Final)"
                    isContracted={!!program.renewal_f5_contracted}
                    isActive={program.f5_renewalDate && program.f5_endDate ? today >= program.f5_renewalDate && today <= program.f5_endDate : false}
                    isPending={!!program.f5_renewalDate && !program.renewal_f5_contracted}
                    startDate={program.f5_renewalDate}
                    endDate={program.f5_endDate}
                    duration={program.f5_duration}
                    amount={program.f5_amount}
                    paymentMethod={program.f5_payment_method}
                    receiptUrl={program.f5_receipt_url}
                    serviceName={program.contract5_name}
                    isEditing={isEditing}
                    formData={formData}
                    onUpdate={onUpdate}
                    isLast={true}
                    showPaymentPanel={formData.renewal_phase === 'F5'}
                    onAutoActivate={() => onAutoActivate('F5')}
                    paymentMethods={paymentMethods}
                    paymentLinks={paymentLinks}
                    renewalStatus={renewalStatus}
                    renewalPhase={renewalPhase}
                    onSendRenewalLink={handleSendRenewalLink}
                />
            </div>
        </div>
    );
};

export default RenewalTimeline;
