
import React, { useEffect, useMemo, useState } from 'react';
import { Client, ClientStatus, User } from '../types';
import { Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, AlertOctagon, TrendingUp, BarChart3, ArrowUpRight, UserMinus, Calendar, CheckCircle2, Clock, FileText, Users, Edit2, Upload, X, Check, Loader2, Landmark, Copy, CreditCard, Eye, EyeOff, XCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface PaymentMethod {
  id: string;
  name: string;
  platform_fee_percentage: number;
}

interface RenewalsViewProps {
  clients: Client[];
  user: User;
  onNavigateToClient: (client: Client) => void;
  coaches?: User[];
  sales?: any[];
  paymentLinks?: any[]; // To lookup prices
  paymentMethods?: PaymentMethod[]; // Métodos de pago con fees desde BD
  onlyPaid?: boolean; // New prop for Accounting
  externalDate?: { month: number; year: number }; // To sync with dashboard filters
}

const FilterPill = ({ label, active = false, hasDropdown = false, onClick }: { label: string, active?: boolean, hasDropdown?: boolean, onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={`
    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
    ${active
        ? 'bg-slate-900 text-white shadow-md'
        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }
  `}>
    {label}
    {hasDropdown && <ChevronDown className={`w-3.5 h-3.5 ${active ? 'text-slate-300' : 'text-slate-400'}`} />}
  </button>
);

// --- FEES POR MÉTODO DE PAGO (Fallback si no hay datos de BD) ---
const DEFAULT_PAYMENT_METHOD_FEES: Record<string, number> = {
  'hotmart': 6.4,
  'stripe': 4.0,
  'transferencia': 0.0
};

// Busca el fee en los métodos de pago de BD, o usa fallback
const getPaymentMethodFee = (method: string | undefined, paymentMethods: PaymentMethod[]): number => {
  if (!method) return 4.0; // Default Stripe fee for calculations even if unknown, but label will be '-'

  // Buscar en los métodos de BD
  const found = paymentMethods.find(pm =>
    pm.name.toLowerCase().includes(method.toLowerCase()) ||
    method.toLowerCase().includes(pm.name.toLowerCase())
  );

  if (found) return found.platform_fee_percentage;

  // Fallback a valores por defecto
  return DEFAULT_PAYMENT_METHOD_FEES[method] ?? 4.0;
};

const getPaymentMethodLabel = (method?: string, paymentMethods: PaymentMethod[] = []): string => {
  if (!method) return '-';

  // Buscar nombre oficial en BD
  const found = paymentMethods.find(pm =>
    pm.name.toLowerCase().includes(method.toLowerCase()) ||
    method.toLowerCase().includes(pm.name.toLowerCase())
  );

  if (found) return found.name;

  // Fallback
  const labels: Record<string, string> = {
    'hotmart': 'Hotmart',
    'stripe': 'Stripe',
    'transferencia': 'Transferencia'
  };
  return labels[method] || method;
};

// --- ROW COMPONENT WITH EDIT STATE ---
interface RenewalRowProps {
  renewal: any;
  onNavigateToClient: (client: Client) => void;
  coachCommissionPercent: number;
  paymentMethods: PaymentMethod[];
  showFinancials?: boolean;
}

const RenewalRow: React.FC<RenewalRowProps> = ({ renewal, onNavigateToClient, coachCommissionPercent, paymentMethods, showFinancials = true }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(renewal.amount?.toString() || '');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(renewal.paymentMethod || renewal.client.renewal_payment_method || 'stripe');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cálculos financieros usando datos de BD
  const grossAmount = renewal.amount || 0;
  // FIX: Only assume a default if there is actual activity (contracted or amount > 0)
  // Otherwise, it's pending and we don't know the method yet.
  const paymentMethod = renewal.client.renewal_payment_method || (renewal.isContracted || grossAmount > 0 ? 'stripe' : undefined);
  const feePercent = getPaymentMethodFee(paymentMethod, paymentMethods);
  const feeAmount = grossAmount * (feePercent / 100);
  const netAmount = grossAmount - feeAmount;
  const commissionAmount = netAmount * (coachCommissionPercent / 100);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      const cleanAmount = parseFloat(amount.replace(',', '.'));
      const finalAmount = isNaN(cleanAmount) ? 0 : cleanAmount;

      const phaseNum = String(renewal.phase).replace(/\D/g, ''); // '2', '3', etc.
      const isPhaseSpecific = ['2', '3', '4', '5'].includes(phaseNum);

      const updatePayload: any = {};

      if (isPhaseSpecific) {
        updatePayload[`f${phaseNum}_amount`] = finalAmount;
        updatePayload[`f${phaseNum}_payment_method`] = selectedPaymentMethod;
      } else {
        // Fallback legacy global fields
        updatePayload.renewal_amount = finalAmount;
        updatePayload.renewal_payment_method = selectedPaymentMethod;
      }

      const { error } = await supabase
        .from('clientes_pt_notion')
        .update(updatePayload)
        .eq('id', renewal.client.id);

      if (error) throw error;

      // Update local object immediately to reflect changes
      renewal.amount = finalAmount;
      renewal.paymentMethod = selectedPaymentMethod;
      renewal.client.renewal_payment_method = selectedPaymentMethod; // optional, for safety
      if (isPhaseSpecific && renewal.client.program) {
        renewal.client.program[`f${phaseNum}_amount`] = finalAmount;
        renewal.client.program[`f${phaseNum}_payment_method`] = selectedPaymentMethod;
      }

      setIsEditing(false);
    } catch (err) {
      console.error("Error saving renewal amount:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const fileName = `renewal_receipt_${renewal.client.id}_${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

      const phaseNum = String(renewal.phase).replace(/\D/g, ''); // '2', '3', etc.
      const isPhaseSpecific = ['2', '3', '4', '5'].includes(phaseNum);

      const updatePayload: any = {};
      if (isPhaseSpecific) {
        updatePayload[`f${phaseNum}_receipt_url`] = publicUrl;
      } else {
        updatePayload.renewal_receipt_url = publicUrl;
      }

      const { error: dbError } = await supabase
        .from('clientes_pt_notion')
        .update(updatePayload)
        .eq('id', renewal.client.id);

      if (dbError) throw dbError;

      renewal.receipt_url = publicUrl;
      if (isPhaseSpecific && renewal.client.program) {
        renewal.client.program[`f${phaseNum}_receipt_url`] = publicUrl;
      }

    } catch (err) {
      console.error("Error uploading receipt:", err);
    } finally {
      setIsUploading(true); // Small delay to show success
      setTimeout(() => setIsUploading(false), 1000);
    }
  };

  return (
    <tr
      onClick={() => !isEditing && onNavigateToClient(renewal.client)}
      className="hover:bg-slate-50/80 cursor-pointer group transition-all"
    >
      <td className="px-6 py-5">
        <p className="font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{renewal.client.name}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{renewal.client.email}</p>
      </td>
      <td className="px-4 py-5 text-center">
        <span className="bg-white text-slate-600 px-3 py-1 rounded-full text-[10px] font-black border border-slate-200 shadow-sm">
          {renewal.phase}
        </span>
      </td>
      <td className="px-4 py-5 text-center">
        <div className="flex flex-col items-center justify-center">
          <span className={`text-xs font-black ${renewal.isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
            {new Date(renewal.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
          {renewal.isOverdue && <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-0.5">Vencido</span>}
        </div>
      </td>

      {/* Método de Pago con edición */}
      <td className="px-4 py-5 text-center" onClick={e => e.stopPropagation()}>
        {isEditing ? (
          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="w-24 px-2 py-1 text-xs border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="stripe">Stripe</option>
            <option value="hotmart">Hotmart</option>
            <option value="transferencia">Transferencia</option>
            <option value="paypal">Paypal</option>
            <option value="bizum">Bizum</option>
          </select>
        ) : (
          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${paymentMethod === 'hotmart' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
            paymentMethod === 'stripe' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
              'bg-slate-50 text-slate-600 border border-slate-200'
            }`}>
            {getPaymentMethodLabel(paymentMethod, paymentMethods)}
          </span>
        )}
      </td>

      {/* Importe Bruto con edición */}
      <td className="px-4 py-5 text-center font-black text-slate-900" onClick={e => e.stopPropagation()}>
        {isEditing ? (
          <div className="flex items-center justify-center gap-1">
            <input
              type="text"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-20 px-2 py-1 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner bg-slate-50"
              placeholder="0.00"
              autoFocus
            />
            <button onClick={handleSave} disabled={isSaving} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-100 shadow-sm">
              {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
            </button>
            <button onClick={() => setIsEditing(false)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg border border-rose-100 shadow-sm">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5 group/edit">
            <div className="flex items-center gap-1">
              <span className="text-sm">{grossAmount > 0 ? `${grossAmount.toLocaleString()}€` : <span className="text-slate-300 font-medium text-[11px] italic">-</span>}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  setAmount(renewal.amount?.toString() || '');
                  setSelectedPaymentMethod(renewal.client.renewal_payment_method || 'stripe');
                }}
                className="p-1 text-slate-300 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100 bg-white hover:bg-indigo-50 rounded-lg border border-slate-100 shadow-sm"
              >
                <Edit2 size={10} />
              </button>
            </div>
            {grossAmount > 0 && showFinancials && (
              <span className="text-[9px] text-slate-400">-{feePercent}% → {netAmount.toFixed(0)}€</span>
            )}
          </div>
        )}
      </td>

      {/* Comisión Coach */}
      {showFinancials && (
        <td className="px-4 py-5 text-center">
          {grossAmount > 0 && renewal.isContracted ? (
            <div className="flex flex-col items-center">
              <span className="text-sm font-black text-emerald-600">{commissionAmount.toFixed(2)}€</span>
              <span className="text-[9px] text-slate-400">{coachCommissionPercent}% del neto</span>
            </div>
          ) : (
            <span className="text-slate-300 text-[11px] italic">-</span>
          )}
        </td>
      )}

      <td className="px-4 py-5 text-center">
        {renewal.isContracted ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-widest">
            <CheckCircle2 size={12} /> Renovado
          </span>
        ) : renewal.status === 'Abandono' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-widest">
            <XCircle size={12} /> Abandono
          </span>
        ) : renewal.status === 'No Renovado' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-widest">
            <UserMinus size={12} /> No Renovado
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${renewal.isOverdue ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
            <Clock size={12} /> {renewal.isOverdue ? 'Vencido' : 'Pendiente'}
          </span>
        )}
      </td>

      <td className="px-4 py-5" onClick={e => e.stopPropagation()}>
        {renewal.call_notes ? (
          <div className="max-w-[280px]">
            <p className="text-[11px] text-slate-600 line-clamp-2 whitespace-pre-wrap break-words" title={renewal.call_notes}>
              {renewal.call_notes}
            </p>
            {renewal.call_status && renewal.call_status !== 'pending' && (
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mt-1">
                {renewal.call_status}
              </p>
            )}
          </div>
        ) : (
          <span className="text-[10px] font-bold text-slate-300 uppercase">Sin nota</span>
        )}
      </td>

      <td className="px-4 py-5 text-center" onClick={e => e.stopPropagation()}>
        {isUploading ? (
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-indigo-600 font-black uppercase">
            <Loader2 className="animate-spin w-3 h-3" /> Procesando
          </div>
        ) : renewal.receipt_url ? (
          <div className="flex items-center justify-center gap-2">
            <a
              href={renewal.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black border border-emerald-100 hover:bg-emerald-100 transition-colors uppercase flex items-center gap-1"
            >
              <FileText size={10} /> Ver
            </a>
            <label className="cursor-pointer p-1 border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
              <Upload size={12} />
            </label>
          </div>
        ) : (
          <label className="cursor-pointer inline-flex items-center gap-1 text-slate-400 hover:text-indigo-600 text-[9px] font-black bg-white border border-slate-100 px-2 py-1 rounded-lg transition-all hover:shadow-md uppercase">
            <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
            <Upload size={12} /> Subir
          </label>
        )}
      </td>
      <td className="px-4 py-5 text-right">
        <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
      </td>
    </tr>
  );
};

const normalizeDateKey = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

// --- COMPONENTE DATOS BANCARIOS DEL COACH ---
interface CoachBankDetailsProps {
  coach: User;
  commission: number;
}

const CoachBankDetails: React.FC<CoachBankDetailsProps> = ({ coach, commission }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);

  const copyIban = () => {
    if (coach.bank_account_iban) {
      navigator.clipboard.writeText(coach.bank_account_iban);
      setCopiedIban(true);
      setTimeout(() => setCopiedIban(false), 2000);
    }
  };

  const hasBankData = coach.bank_account_iban || coach.bank_account_holder;

  if (!hasBankData) {
    return (
      <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3">
        <Landmark className="w-4 h-4 text-amber-500" />
        <p className="text-xs text-amber-700">
          <span className="font-bold">{coach.name}</span> no ha configurado sus datos bancarios.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600 uppercase">Datos para Pago</span>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          {showDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showDetails ? 'Ocultar' : 'Ver Datos'}
        </button>
      </div>

      {showDetails && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Titular */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Titular</p>
              <p className="text-sm font-medium text-slate-800">{coach.bank_account_holder || '-'}</p>
            </div>
            {coach.tax_id && (
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">NIF/CIF</p>
                <p className="text-sm font-mono text-slate-600">{coach.tax_id}</p>
              </div>
            )}
          </div>

          {/* IBAN con botón copiar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-slate-50 rounded-lg">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">IBAN</p>
              <p className="text-sm font-mono text-slate-800 tracking-wide">{coach.bank_account_iban || '-'}</p>
            </div>
            {coach.bank_account_iban && (
              <button
                onClick={copyIban}
                className="p-3 bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 rounded-lg border border-slate-200 transition-colors shrink-0"
                title="Copiar IBAN"
              >
                {copiedIban ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Banco y SWIFT */}
          {(coach.bank_name || coach.bank_swift_bic) && (
            <div className="flex gap-4">
              {coach.bank_name && (
                <div className="flex-1 p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Banco</p>
                  <p className="text-sm text-slate-700">{coach.bank_name}</p>
                </div>
              )}
              {coach.bank_swift_bic && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">SWIFT/BIC</p>
                  <p className="text-sm font-mono text-slate-600">{coach.bank_swift_bic}</p>
                </div>
              )}
            </div>
          )}

          {/* Importe a transferir */}
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">Importe a Transferir</span>
            </div>
            <span className="text-lg font-black text-emerald-700">{commission.toFixed(2)}€</span>
          </div>
        </div>
      )}
    </div>
  );
};

const RenewalsView: React.FC<RenewalsViewProps> = ({ clients, user, onNavigateToClient, coaches = [], sales = [], paymentLinks = [], paymentMethods = [], onlyPaid = false, externalDate }) => {
  const [renewalCallsByKey, setRenewalCallsByKey] = useState<Record<string, any>>({});

  useEffect(() => {
    let cancelled = false;

    const loadRenewalNotes = async () => {
      const clientIds = clients.map(c => c.id).filter(Boolean);
      if (clientIds.length === 0) {
        if (!cancelled) setRenewalCallsByKey({});
        return;
      }

      const { data, error } = await supabase
        .from('renewal_calls')
        .select('client_id, contract_end_date, call_notes, call_status, call_result, scheduled_call_date, updated_at, created_at')
        .in('client_id', clientIds);

      if (error) {
        console.error('[RenewalsView] Error loading renewal notes:', error);
        if (!cancelled) setRenewalCallsByKey({});
        return;
      }

      const map: Record<string, any> = {};

      (data || []).forEach((call: any) => {
        const key = `${call.client_id}_${normalizeDateKey(call.contract_end_date)}`;
        if (!key.endsWith('_')) {
          const existing = map[key];
          if (!existing) {
            map[key] = call;
            return;
          }
          const existingDate = new Date(existing.updated_at || existing.created_at || 0).getTime();
          const newDate = new Date(call.updated_at || call.created_at || 0).getTime();
          if (newDate > existingDate) map[key] = call;
        }
      });

      if (!cancelled) setRenewalCallsByKey(map);
    };

    loadRenewalNotes();
    return () => {
      cancelled = true;
    };
  }, [clients]);

  const getCoachName = (idOrName: string | null | undefined): string => {
    if (!idOrName || idOrName === 'Sin Asignar') return 'Sin Asignar';

    // 1. Buscar en la lista de coaches (source of truth)
    const coach = coaches.find(u => u.id === idOrName);
    if (coach) return coach.name;

    // 2. Mapa estático de emergencia
    const coachNameMap: Record<string, string> = {
      'dec087e2-3bf5-43c7-8561-d22c049948db': 'Jesús',
      '0cfcb072-ae4c-4b33-a96d-f3aa8b5aeb62': 'Helena',
      '5d5bbbed-cbc0-495c-ac6f-3e56bf5ffe54': 'Álvaro',
      'e59de5e3-f962-48be-8392-04d9d59ba87d': 'Esperanza',
      'a2911cd6-e5c0-4fd3-8047-9f7f003e1d28': 'Juan',
      '19657835-6fb4-4783-9b37-1be1d556c42d': 'Victoria'
    };
    if (coachNameMap[idOrName]) return coachNameMap[idOrName];

    // 3. Si no es un UUID, probablemente es un nombre denormalizado
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName);
    if (!isUUID) return idOrName;

    return 'Sin Asignar';
  };

  // TIME TRAVEL STATE
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ACCORDION STATE
  const [expandedCoaches, setExpandedCoaches] = useState<Record<string, boolean>>({});

  // Sync with external date if provided
  const effectiveDate = externalDate ? new Date(externalDate.year, externalDate.month - 1, 1) : currentDate;

  const currentMonth = effectiveDate.getMonth();
  const currentYear = effectiveDate.getFullYear();

  const monthLabel = effectiveDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const toggleCoach = (coach: string) => {
    setExpandedCoaches(prev => ({ ...prev, [coach]: !prev[coach] }));
  };

  const isSelectedMonth = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  // --- RENEWALS LOGIC (SPLIT: MONTHLY vs OVERDUE) ---
  const { monthlyRenewals, overdueRenewals, monthlyBajas } = useMemo(() => {
    const monthlyList: any[] = [];
    const overdueList: any[] = [];

    const startOfMonth = new Date(currentYear, currentMonth, 1);

    clients.forEach(c => {
      // EXCLUDE PAUSED CLIENTS: Paused clients have their contract frozen.
      // They should not appear in renewal lists until they are reactivated.
      if (c.status === ClientStatus.PAUSED) return;

      // MODIFIED: We process ALL clients to check for renewals in this month.
      // Active clients: Standard processing.
      // Inactive/Dropout clients: Accounted for ONLY if their renewal date was THIS month (missed renewal).

      const phaseData = [
        { id: 'F2', date: c.program?.f1_endDate, contracted: c.program?.renewal_f2_contracted, prevContracted: true },
        { id: 'F3', date: c.program?.f2_endDate, contracted: c.program?.renewal_f3_contracted, prevContracted: c.program?.renewal_f2_contracted },
        { id: 'F4', date: c.program?.f3_endDate, contracted: c.program?.renewal_f4_contracted, prevContracted: c.program?.renewal_f3_contracted },
        { id: 'F5', date: c.program?.f4_endDate, contracted: c.program?.renewal_f5_contracted, prevContracted: c.program?.renewal_f4_contracted },
      ];

      const matches = phaseData.filter(p => {
        if (!p.date) return false;
        // CRITICAL FIX: Only consider a renewal "due" if the previous phase was actually contracted.
        // This prevents "ghost" renewals from appearing years later for clients who dropped out early
        // even if the system auto-calculated future dates.
        if (!p.prevContracted) return false;

        const d = new Date(p.date);
        const isThisMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        const isPastDue = d < startOfMonth && !p.contracted;
        return isThisMonth || isPastDue;
      });

      if (matches.length > 0) {
        // Pick the most advanced phase if there are multiple (prevents duplicates)
        const bestMatch = matches.sort((a, b) => b.id.localeCompare(a.id))[0];
        const d = new Date(bestMatch.date!);
        const isThisMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;

        if (isThisMonth) {
          // Determine status based on client status and contraction
          // Determine status based on client status and contraction
          let status = 'Pendiente';
          if (bestMatch.contracted) {
            status = 'Renovado';
          } else if (c.status === ClientStatus.DROPOUT) {
            status = 'Abandono';
          } else if (c.status === ClientStatus.INACTIVE || c.status === ClientStatus.COMPLETED) {
            status = 'No Renovado';
          }

          monthlyList.push({
            client: c,
            phase: bestMatch.id,
            date: bestMatch.date,
            status: status,
            clientStatus: c.status,
            isOverdue: false,
            isContracted: !!bestMatch.contracted
          });
        } else {
          // For OVERDUE list, we ONLY show ACTIVE clients.
          // Dropouts from previous months are history, not "Pending Action".
          if (c.status === ClientStatus.ACTIVE) {
            overdueList.push({
              client: c,
              phase: bestMatch.id,
              date: bestMatch.date,
              status: 'Vencido (Urgente)',
              clientStatus: c.status,
              isOverdue: true
            });
          }
        }
      }
    });

    // Sort lists by date
    const sortByDate = (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime();

    const churnList = clients.filter(c =>
      (c.status === ClientStatus.INACTIVE || c.status === ClientStatus.DROPOUT) &&
      (isSelectedMonth(c.abandonmentDate) || isSelectedMonth(c.inactiveDate))
    );

    return {
      monthlyRenewals: monthlyList.sort(sortByDate).map(renewal => {
        // Detect phase and use new specific fields if available
        let amount = 0;
        let receipt_url = null;
        let paymentMethod: any = null;

        const p = renewal.client.program;
        const phaseStr = String(renewal.phase).toLowerCase();

        // 1. New Schema: Specific Phase Fields (F2-F5)
        if (p) {
          if (phaseStr.includes('2')) {
            amount = p.f2_amount || 0;
            paymentMethod = p.f2_payment_method;
            receipt_url = p.f2_receipt_url;
          } else if (phaseStr.includes('3')) {
            amount = p.f3_amount || 0;
            paymentMethod = p.f3_payment_method;
            receipt_url = p.f3_receipt_url;
          } else if (phaseStr.includes('4')) {
            amount = p.f4_amount || 0;
            paymentMethod = p.f4_payment_method;
            receipt_url = p.f4_receipt_url;
          } else if (phaseStr.includes('5')) {
            amount = p.f5_amount || 0;
            paymentMethod = p.f5_payment_method;
            receipt_url = p.f5_receipt_url;
          }
        }

        // 2. Fallback: Legacy Logic (Use current Renewal fields only if Phase matches)
        const isThisClientPhase = renewal.client.renewal_phase === renewal.phase;

        // Only use legacy fields if we didn't find specific ones AND it matches current phase
        if (amount === 0 && !receipt_url && isThisClientPhase) {
          receipt_url = renewal.client.renewal_receipt_url || null;
          paymentMethod = renewal.client.renewal_payment_method;

          if (renewal.client.renewal_amount) {
            amount = renewal.client.renewal_amount;
          }
          // Guess from link
          else if (renewal.client.renewal_payment_link && paymentLinks) {
            const link = (paymentLinks as any[]).find(pl => pl.url === renewal.client.renewal_payment_link);
            if (link) {
              const rawPrice = link.price;
              amount = typeof rawPrice === 'string'
                ? parseFloat(rawPrice.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, ''))
                : (rawPrice || 0);
            }
          }
        }

        // 3. Fallback: Sales Table (for auto-detected payments not yet synced to client profile)
        if (amount === 0) {
          const renewalDate = new Date(renewal.date);
          const linkedSale = sales && sales.find(s => {
            if (!s.sale_date || !s.client_email) return false;
            const sDate = new Date(s.sale_date);
            const sameEmail = s.client_email.toLowerCase().trim() === renewal.client.email.toLowerCase().trim();
            if (!sameEmail) return false;

            const diffMonths = (renewalDate.getFullYear() - sDate.getFullYear()) * 12 + (renewalDate.getMonth() - sDate.getMonth());
            const isRecentlyPaid = diffMonths === 0 || diffMonths === 1;

            return isRecentlyPaid && s.status !== 'failed';
          });

          if (linkedSale && linkedSale.sale_amount) {
            amount = linkedSale.sale_amount;
            if (!receipt_url) receipt_url = linkedSale.payment_receipt_url;
          }
        }

        const callKey = `${renewal.client.id}_${normalizeDateKey(renewal.date)}`;
        const callData = renewalCallsByKey[callKey];

        return {
          ...renewal,
          client: { // Inject computed values into client object for child components that read from client
            ...renewal.client,
            renewal_payment_method: paymentMethod || renewal.client.renewal_payment_method // Ensure RenewalRow sees it if it looks there
          },
          amount, // Explicit field for RenewalRow
          receipt_url, // Explicit field
          paymentMethod, // New explicit field
          call_notes: callData?.call_notes || null,
          call_status: callData?.call_status || null,
          call_result: callData?.call_result || null,
          scheduled_call_date: callData?.scheduled_call_date || null
        };
      }),
      overdueRenewals: onlyPaid ? [] : overdueList.sort(sortByDate),
      monthlyBajas: churnList
    };
  }, [clients, currentMonth, currentYear, sales, paymentLinks, onlyPaid, renewalCallsByKey]);

  // --- GROUP BY COACH LOGIC ---
  const { renewalsByCoach, bajasByCoach } = useMemo(() => {
    const renewalGroups: Record<string, any[]> = {};
    const bajaGroups: Record<string, Client[]> = {};

    // Filter out pendings for accounting mode
    const filteredRenewals = onlyPaid
      ? monthlyRenewals.filter(r => r.isContracted || (r.amount && r.amount > 0) || r.receipt_url)
      : monthlyRenewals;

    filteredRenewals.forEach(item => {
      // Unify grouping by matching coach name or ID robustly
      const coach = getCoachName(item.client.coach_id) !== 'Sin Asignar'
        ? getCoachName(item.client.coach_id)
        : (item.client.property_coach || 'Sin Asignar');
      if (!renewalGroups[coach]) renewalGroups[coach] = [];
      renewalGroups[coach].push(item);
    });

    monthlyBajas.forEach(client => {
      const coach = getCoachName(client.coach_id) !== 'Sin Asignar'
        ? getCoachName(client.coach_id)
        : (client.property_coach || 'Sin Asignar');
      if (!bajaGroups[coach]) bajaGroups[coach] = [];
      bajaGroups[coach].push(client);
    });

    // Initialize expanded states if new groups appear
    const initialExpanded: Record<string, boolean> = {};
    Object.keys(renewalGroups).forEach(key => initialExpanded[key] = true);
    Object.keys(bajaGroups).forEach(key => initialExpanded[key] = true);

    if (Object.keys(expandedCoaches).length === 0 && (Object.keys(renewalGroups).length > 0 || Object.keys(bajaGroups).length > 0)) {
      setExpandedCoaches(initialExpanded);
    }

    return { renewalsByCoach: renewalGroups, bajasByCoach: bajaGroups };
  }, [monthlyRenewals, monthlyBajas, onlyPaid]);

  // --- METRICS LOGIC ---
  const metrics = useMemo(() => {
    const newClients = clients.filter(c => isSelectedMonth(c.start_date));
    const churnClients = monthlyBajas;

    // Net Growth = New - Churn (Excluding Dropouts)
    const netGrowth = newClients.length - churnClients.length;

    // RENEWAL METRICS (Derived strictly from the monthly list logic)
    const renewalsTarget = monthlyRenewals.length;
    const renewalsCompleted = monthlyRenewals.filter(r => r.status === 'Renovado').length;
    const renewalsPending = renewalsTarget - renewalsCompleted;
    const renewalsOverdueCount = overdueRenewals.length; // From the separate list

    const renewalSuccessRate = renewalsTarget > 0 ? ((renewalsCompleted / renewalsTarget) * 100).toFixed(0) : '0';

    // Total Revenue from Renewals (only counting completed or with amount)
    const totalRenewalsRevenue = monthlyRenewals
      .filter(r => r.isContracted || (r.amount && r.amount > 0))
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    return {
      newCount: newClients.length,
      churnCount: churnClients.length,
      netGrowth: netGrowth,
      renewalsTarget,
      renewalsCompleted,
      renewalsPending,
      renewalsOverdueCount,
      renewalSuccessRate,
      totalRenewalsRevenue
    };
  }, [clients, currentMonth, currentYear, monthlyRenewals, overdueRenewals]);

  const getClientStatusLabel = (status: ClientStatus) => {
    switch (status) {
      case ClientStatus.ACTIVE: return 'Activo';
      case ClientStatus.INACTIVE: return 'Baja';
      case ClientStatus.PAUSED: return 'Pausado';
      case ClientStatus.DROPOUT: return 'Abandono';
      case ClientStatus.COMPLETED: return 'Completado';
      default: return status;
    }
  };

  const getClientStatusColor = (status: ClientStatus) => {
    switch (status) {
      case ClientStatus.ACTIVE: return 'text-green-700 bg-green-50 ring-green-600/20';
      case ClientStatus.INACTIVE: return 'text-slate-600 bg-slate-100 ring-slate-500/10';
      case ClientStatus.PAUSED: return 'text-amber-700 bg-amber-50 ring-amber-600/20';
      case ClientStatus.DROPOUT: return 'text-red-700 bg-red-50 ring-red-600/20';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="space-y-8 font-sans">

      {/* Header & Time Travel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gestión de Renovaciones</h2>
          <p className="text-sm text-slate-500">Control de vencimientos y métricas mensuales</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 relative">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase">Período</span>
          </div>

          {/* TIME TRAVEL PILL */}
          <div className="relative">
            <FilterPill
              label={capitalizedMonthLabel}
              active
              hasDropdown
              onClick={() => setShowDatePicker(!showDatePicker)}
            />

            {showDatePicker && (
              <div className="absolute top-full mt-2 right-0 bg-white shadow-xl rounded-xl border border-slate-200 p-4 z-20 w-64 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-2">
                  <button onClick={() => handleMonthChange(-1)} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="font-bold text-slate-800">{capitalizedMonthLabel}</span>
                  <button onClick={() => handleMonthChange(1)} className="p-1 hover:bg-slate-100 rounded"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="flex justify-center mt-2">
                  <button onClick={() => { setCurrentDate(new Date()); setShowDatePicker(false); }} className="text-xs text-blue-600 font-medium hover:underline">
                    Volver a Hoy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Eficacia Total */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-12 h-12 text-blue-600" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Eficacia Renovación</p>
          <div className="flex items-end gap-2">
            <h4 className="text-3xl font-black text-slate-900">{metrics.renewalSuccessRate}%</h4>
            <span className="text-xs font-bold text-green-500 mb-1 flex items-center gap-0.5">
              <TrendingUp size={12} /> +2%
            </span>
          </div>
          <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
              style={{ width: `${metrics.renewalSuccessRate}%` }}
            />
          </div>
        </div>

        {/* Objetivo del Mes */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Objetivo del Mes</p>
          <h4 className="text-3xl font-black text-slate-900">{metrics.renewalsTarget} <span className="text-sm font-medium text-slate-400">clientes</span></h4>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />
              ))}
            </div>
            <span className="text-[10px] font-bold text-slate-500 italic">Vencimientos en {capitalizedMonthLabel}</span>
          </div>
        </div>

        {/* Logrado vs Pendiente */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado Actual</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-emerald-600">{metrics.renewalsCompleted}</p>
              <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-tighter">Logrado</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="text-right">
              <p className="text-2xl font-black text-amber-500">{metrics.renewalsPending}</p>
              <p className="text-[9px] font-black text-amber-500/60 uppercase tracking-tighter">Pendiente</p>
            </div>
          </div>
          <div className="mt-4 flex gap-1">
            <div className="h-1 bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${(metrics.renewalsCompleted / (metrics.renewalsTarget || 1)) * 100}%` }} />
            <div className="h-1 bg-amber-400 rounded-full transition-all duration-1000" style={{ width: `${(metrics.renewalsPending / (metrics.renewalsTarget || 1)) * 100}%` }} />
          </div>
        </div>

        {/* Vencidos Urgentes */}
        <div className={`p-6 rounded-[2rem] border shadow-sm relative overflow-hidden group hover:shadow-md transition-all ${metrics.renewalsOverdueCount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-rose-600">
            <AlertOctagon className="w-12 h-12" />
          </div>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${metrics.renewalsOverdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>Vencidos / Urgentes</p>
          <h4 className={`text-3xl font-black ${metrics.renewalsOverdueCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{metrics.renewalsOverdueCount}</h4>
          <p className={`text-[10px] font-bold mt-2 ${metrics.renewalsOverdueCount > 0 ? 'text-rose-600/70' : 'text-slate-400'}`}>
            {metrics.renewalsOverdueCount > 0 ? 'Requiere atención inmediata' : 'Todo al día'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Main Content: Tables (Coach Breakdown) */}
        <div className="flex flex-col gap-8">

          {/* OVERDUE ALERTS SECTION */}
          {overdueRenewals.length > 0 && (
            <div className="bg-white border border-rose-100 rounded-[2rem] overflow-hidden shadow-xl shadow-rose-900/5">
              <div className="px-8 py-5 border-b border-rose-50 flex items-center justify-between bg-rose-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                    <AlertOctagon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-rose-900 text-lg tracking-tight">Vencimientos Críticos</h3>
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Fuera de plazo - Requieren revisión inmediata</p>
                  </div>
                </div>
                <span className="bg-rose-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg shadow-rose-600/20">
                  {overdueRenewals.length} CLIENTES
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-[2px]">
                    <tr>
                      <th className="px-8 py-4">Cliente</th>
                      <th className="px-8 py-4 text-center">Fase</th>
                      <th className="px-8 py-4 text-center">Fecha Límite</th>
                      <th className="px-8 py-4 text-right">Acción Recomendada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50">
                    {overdueRenewals.map((r, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/50 cursor-pointer group transition-colors" onClick={() => onNavigateToClient(r.client)}>
                        <td className="px-8 py-4 font-black text-slate-800 group-hover:text-rose-700">{r.client.name}</td>
                        <td className="px-8 py-4 text-center">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-black text-[10px] border border-slate-200 uppercase">{r.phase}</span>
                        </td>
                        <td className="px-8 py-4 text-center font-black text-rose-600 italic">{new Date(r.date).toLocaleDateString('es-ES')}</td>
                        <td className="px-8 py-4 text-right">
                          <button className="text-[10px] font-black bg-rose-600 text-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105 uppercase">Contactar Coach</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MONTHLY RENEWALS GROUPED BY COACH */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-slate-200 flex-1" />
              <div className="bg-white px-6 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <Users size={18} className="text-slate-400" />
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Desglose por Coach: {capitalizedMonthLabel}</h3>
              </div>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            {Object.keys(renewalsByCoach).length === 0 ? (
              <div className="bg-white rounded-[2rem] border border-slate-200 p-20 text-center text-slate-400 shadow-sm">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-10" />
                <p className="font-black text-lg tracking-tight text-slate-500">No hay renovaciones programadas</p>
                <p className="text-xs font-medium mt-1">Todas las cuentas están al día para este período.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {(Object.entries(renewalsByCoach) as [string, any[]][]).map(([coachName, items]) => {
                  const isExpanded = expandedCoaches[coachName] ?? true;
                  const pendingCount = items.filter(i => !i.isContracted).length;
                  const completedCount = items.length - pendingCount;
                  const coachSuccessRate = Math.round((completedCount / items.length) * 100);

                  // Buscar el coach para obtener su porcentaje de comisión
                  const coachUser = coaches.find(c =>
                    c.name.toLowerCase() === coachName.toLowerCase() ||
                    c.name.toLowerCase().includes(coachName.toLowerCase())
                  );
                  const coachCommissionPercent = coachUser?.commission_percentage ?? 10;

                  // Calcular totales financieros del coach (solo renovaciones completadas)
                  const completedRenewals = items.filter(i => i.isContracted && i.amount > 0);
                  const totalGross = completedRenewals.reduce((sum, r) => sum + (r.amount || 0), 0);
                  const totalCommission = completedRenewals.reduce((sum, r) => {
                    const method = r.client.renewal_payment_method || 'stripe';
                    const fee = getPaymentMethodFee(method, paymentMethods);
                    const net = (r.amount || 0) * (1 - fee / 100);
                    return sum + (net * coachCommissionPercent / 100);
                  }, 0);

                  return (
                    <div key={coachName} className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all hover:shadow-2xl">
                      {/* Coach Header */}
                      <div
                        onClick={() => toggleCoach(coachName)}
                        className={`px-8 py-6 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50 border-b border-slate-100' : 'bg-white'}`}
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-slate-600 font-black text-xl bg-white border border-slate-200 shadow-sm transform transition-transform group-hover:scale-110`}>
                            {coachName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-lg tracking-tight">{coachName}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{items.length} CASOS</span>
                              <div className="w-1 h-1 bg-slate-300 rounded-full" />
                              <span className={`text-[10px] font-black uppercase tracking-widest ${pendingCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                                {pendingCount} PENDIENTES
                              </span>
                              <div className="w-1 h-1 bg-slate-300 rounded-full" />
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                {coachCommissionPercent}% COMISIÓN
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          {completedCount > 0 && (
                            <div className="hidden md:block text-right bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                              <p className="text-lg font-black text-emerald-600">{totalCommission.toFixed(2)}€</p>
                              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Comisión Mes</p>
                            </div>
                          )}
                          <div className="hidden md:block text-right">
                            <p className="text-xl font-black text-slate-800">{coachSuccessRate}%</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Eficacia</p>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>
                      </div>

                      {/* Client List */}
                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-[#0f172a] text-white font-black text-[10px] uppercase tracking-[2px]">
                              <tr>
                                <th className="px-6 py-5">Cliente</th>
                                <th className="px-4 py-5 text-center">Fase</th>
                                <th className="px-4 py-5 text-center">Vencimiento</th>
                                <th className="px-4 py-5 text-center">Método</th>
                                <th className="px-4 py-5 text-center">Importe</th>
                                <th className="px-4 py-5 text-center">Comisión</th>
                                <th className="px-4 py-5 text-center">Estado</th>
                                <th className="px-4 py-5 text-left">Notas llamada</th>
                                <th className="px-4 py-5 text-center">Gestión</th>
                                <th className="px-4 py-5 text-right w-10"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 border-x border-b border-slate-100 rounded-b-2xl">
                              {items.map((r, idx) => (
                                <RenewalRow
                                  key={`${r.client.id}-${idx}`}
                                  renewal={r}
                                  onNavigateToClient={onNavigateToClient}
                                  coachCommissionPercent={coachCommissionPercent}
                                  paymentMethods={paymentMethods}
                                />
                              ))}
                            </tbody>
                          </table>

                          {/* Resumen financiero del coach */}
                          {completedCount > 0 && (
                            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-emerald-50 border-t border-slate-100">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-6">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Renovaciones Completadas</p>
                                    <p className="text-lg font-black text-slate-800">{completedCount}</p>
                                  </div>
                                  <div className="w-px h-8 bg-slate-200" />
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Ingresos Brutos</p>
                                    <p className="text-lg font-black text-slate-800">{totalGross.toLocaleString()}€</p>
                                  </div>
                                </div>
                                <div className="text-right bg-emerald-100 px-6 py-3 rounded-2xl border border-emerald-200">
                                  <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Comisión {coachName}</p>
                                  <p className="text-2xl font-black text-emerald-700">{totalCommission.toFixed(2)}€</p>
                                </div>
                              </div>

                              {/* Datos bancarios del coach (solo visible para admin/head_coach) */}
                              {(user.role === 'admin' || user.role === 'head_coach') && coachUser && (
                                <CoachBankDetails coach={coachUser} commission={totalCommission} />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* BAJAS DEL MES */}
            <div className="mt-20">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px bg-rose-100 flex-1" />
                <div className="bg-rose-50 px-6 py-2 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-3">
                  <UserMinus size={18} className="text-rose-400" />
                  <h3 className="font-black text-rose-800 uppercase tracking-widest text-[11px]">Bajas Confirmadas: {capitalizedMonthLabel}</h3>
                </div>
                <div className="h-px bg-rose-100 flex-1" />
              </div>

              {Object.keys(bajasByCoach).length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-dashed border-slate-200 p-12 text-center text-slate-400">
                  <p className="text-sm font-bold italic tracking-tight uppercase opacity-50">No se registraron bajas en este período.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(Object.entries(bajasByCoach) as [string, Client[]][]).map(([coachName, items]) => {
                    return (
                      <div key={coachName} className="bg-white rounded-[2rem] shadow-lg shadow-slate-200/30 border border-slate-100 p-6 transition-all hover:scale-[1.02]">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-red-600 font-black text-sm bg-rose-50 border border-rose-100">
                            {coachName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800 text-sm tracking-tight">{coachName}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-purple-600 uppercase">{items.filter(c => c.status === ClientStatus.DROPOUT).length} Abandonos</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] font-black text-slate-500 uppercase">{items.filter(c => c.status === ClientStatus.INACTIVE).length} Bajas</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {items.map(client => {
                            const isAbandono = client.status === ClientStatus.DROPOUT;
                            const statusLabel = isAbandono ? 'Abandono' : 'Baja';
                            const statusColor = isAbandono
                              ? 'bg-purple-100 text-purple-700 border-purple-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200';
                            const reason = isAbandono
                              ? client.abandonmentReason
                              : client.inactiveReason;
                            const dateStr = isAbandono
                              ? client.abandonmentDate
                              : client.inactiveDate;

                            return (
                              <div
                                key={client.id}
                                onClick={() => onNavigateToClient(client)}
                                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 border border-transparent hover:border-rose-200 hover:bg-rose-50/20 cursor-pointer group transition-all"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-black text-slate-900 text-xs truncate group-hover:text-rose-700">{client.name}</p>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${statusColor}`}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase truncate mt-0.5">
                                    {reason || 'Causa no especificada'}
                                    {dateStr && <span className="ml-2 text-slate-300">• {new Date(dateStr).toLocaleDateString('es-ES')}</span>}
                                  </p>
                                </div>
                                <ChevronRight size={14} className="text-slate-300 group-hover:text-rose-400 shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenewalsView;
