import React, { useState, useEffect } from 'react';
import { UserPlus, Upload, Check, Loader2, Send, FileText, Phone, Mail, User, MessageSquare, DollarSign, CreditCard, Copy, ExternalLink, RefreshCw, MapPin, AlertTriangle, Info, ShieldAlert, Zap } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { normalizePhone, isValidPhone, PHONE_HELP_TEXT, PHONE_PLACEHOLDER } from '../utils/phoneUtils';

interface Coach {
    id: string;
    name: string;
    available_slots: number;
    capacity_status: string;
    available_for_assignment: boolean;
    status: string;
}

interface PaymentMethod {
    id: string;
    name: string;
    platform_fee_percentage: number;
}

interface NewSaleFormProps {
    currentUser?: any;
}

export function NewSaleForm({ currentUser: propUser }: NewSaleFormProps) {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [closers, setClosers] = useState<any[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(propUser || null);
    const [createdOnboardingLink, setCreatedOnboardingLink] = useState('');
    const [notificationStatus, setNotificationStatus] = useState<'pending' | 'sent' | 'failed' | 'none'>('none');

    const [formData, setFormData] = useState({
        client_first_name: '',
        client_last_name: '',
        client_email: '',
        client_phone: '',
        client_dni: '',
        client_address: '',
        contract_duration: '3',
        hotmart_payment_link: '',
        assigned_coach_id: '',
        admin_notes: '',
        coach_notes: '',
        sale_amount: '',
        payment_method_id: '',
        contract_template_id: '',
        custom_duration: '',
        selected_closer_id: ''
    });

    const [contractTemplates, setContractTemplates] = useState<any[]>([]);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadCoaches(),
                loadClosers(),
                loadPaymentMethods(),
                loadContractTemplates(),
                loadCurrentUser()
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        if (propUser) {
            setCurrentUser(propUser);
        }
    }, [propUser]);

    const loadCurrentUser = async () => {
        try {
            let emailToSearch = '';
            const { data: { user } } = await supabase.auth.getUser();

            if (user && user.email) {
                emailToSearch = user.email;
            } else if (currentUser && currentUser.email) {
                emailToSearch = currentUser.email;
            }

            if (emailToSearch) {
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', emailToSearch)
                    .single();

                if (userData) {
                    setCurrentUser(prev => ({ ...prev, ...userData, auth_email: emailToSearch }));
                    setFormData(prev => ({ ...prev, selected_closer_id: userData.id }));
                }
            }
        } catch (e) {
            console.error('Excepción en loadCurrentUser:', e);
        }
    };

    const loadClosers = async () => {
        const { data } = await supabase
            .from('users')
            .select('id, name')
            .in('role', ['closer', 'admin', 'head_coach'])
            .order('name');
        if (data) setClosers(data);
    };

    const loadCoaches = async () => {
        const { data } = await supabase
            .from('coach_capacity_view')
            .select('id, name, available_slots, capacity_status, available_for_assignment, status')
            .order('name');

        if (data) {
            const activeCoaches = (data as any[]).filter(c =>
                c.status === 'active' || c.available_for_assignment
            );
            setCoaches(activeCoaches);
        }
    };

    const loadPaymentMethods = async () => {
        const { data } = await supabase.from('payment_methods').select('*').order('name');
        if (data) setPaymentMethods(data);
    };

    const loadContractTemplates = async () => {
        const { data } = await supabase
            .from('contract_templates')
            .select('id, name, version')
            .eq('is_active', true)
            .order('name', { ascending: true })
            .order('version', { ascending: false });

        if (data) {
            setContractTemplates(data);
            if (data.length > 0) {
                setFormData(prev => ({ ...prev, contract_template_id: data[0].id }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setNotificationStatus('pending');

        try {
            let receiptUrl = null;
            if (receiptFile) {
                setUploadingReceipt(true);
                try {
                    const fileExt = receiptFile.name.split('.').pop();
                    const safeEmail = formData.client_email.replace(/[^a-zA-Z0-9]/g, '_');
                    const fileName = `${Date.now()}_${safeEmail}.${fileExt}`;
                    const filePath = `payment_receipts/${fileName}`;

                    await supabase.storage.from('documents').upload(filePath, receiptFile);
                    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
                    receiptUrl = publicUrl;
                } catch (error) {
                    console.error('Error uploading receipt:', error);
                } finally {
                    setUploadingReceipt(false);
                }
            }

            if (formData.client_phone && !isValidPhone(formData.client_phone)) {
                alert(`Por favor, introduce un teléfono válido.\n${PHONE_HELP_TEXT}`);
                setLoading(false);
                return;
            }

            const activationToken = crypto.randomUUID();
            const onboardingToken = activationToken; // keep for sale record compatibility
            const closerId = formData.selected_closer_id || currentUser?.id || 'unknown';

            const contractDuration = formData.contract_duration === 'custom'
                ? (parseInt(formData.custom_duration) || 3)
                : parseInt(formData.contract_duration);
            const grossAmount = parseFloat(formData.sale_amount) || 0;
            const selectedMethod = paymentMethods.find(m => m.id === formData.payment_method_id);
            const feePercentage = selectedMethod?.platform_fee_percentage || 0;
            const platformFeeAmount = grossAmount * (feePercentage / 100);
            const netAmount = grossAmount - platformFeeAmount;
            const commissionPercent = Number(currentUser?.commission_percentage) || 0;
            const commissionAmount = netAmount * (commissionPercent / 100);

            const cleanClientEmail = (formData.client_email || '').toLowerCase().trim();

            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .insert([{
                    client_first_name: formData.client_first_name,
                    client_last_name: formData.client_last_name,
                    client_email: cleanClientEmail,
                    client_phone: formData.client_phone,
                    client_dni: formData.client_dni,
                    client_address: formData.client_address,
                    contract_duration: contractDuration,
                    hotmart_payment_link: formData.hotmart_payment_link,
                    assigned_coach_id: formData.assigned_coach_id,
                    admin_notes: formData.admin_notes,
                    coach_notes: formData.coach_notes,
                    sale_amount: grossAmount,
                    payment_method_id: formData.payment_method_id,
                    contract_template_id: formData.contract_template_id,
                    payment_receipt_url: receiptUrl,
                    onboarding_token: onboardingToken,
                    closer_id: closerId,
                    status: 'pending_onboarding',
                    sale_date: new Date().toISOString(),
                    platform_fee_amount: platformFeeAmount,
                    net_amount: netAmount,
                    commission_amount: commissionAmount
                }])
                .select()
                .single();

            if (saleError) throw saleError;

            const selectedCoach = coaches.find(c => c.id === formData.assigned_coach_id);
            const selectedCoachName = (selectedCoach?.name || 'Sin Asignar').trim();

            const { data: existingClient } = await supabase
                .from('clientes_pt_notion')
                .select('id')
                .eq('property_correo_electr_nico', cleanClientEmail)
                .maybeSingle();

            const commonClientData = {
                property_nombre: formData.client_first_name,
                property_apellidos: formData.client_last_name,
                property_correo_electr_nico: cleanClientEmail,
                property_tel_fono: formData.client_phone,
                property_dni: formData.client_dni,
                property_direccion: formData.client_address,
                property_coach: selectedCoachName,
                coach_id: formData.assigned_coach_id,
                property_estado_cliente: 'Alta Reciente',
                status: 'active',
                property_fecha_alta: new Date().toISOString().split('T')[0],
                property_meses_servicio_contratados: contractDuration,
                property_informaci_n_extra_cliente: `NOTAS VENTA: ${formData.admin_notes || ''}\nNOTAS PARA COACH: ${formData.coach_notes || ''}`.trim(),
                onboarding_token: onboardingToken,
                activation_token: activationToken,
                activation_token_created_at: new Date().toISOString()
            };

            if (existingClient) {
                await supabase.from('clientes_pt_notion').update(commonClientData).eq('id', existingClient.id);
            } else {
                await supabase.from('clientes_pt_notion').insert([commonClientData]);
            }

            const link = `${window.location.origin}/#/activar-cuenta/${activationToken}`;
            setCreatedOnboardingLink(link);
            setSuccess(true);

            // Webhook N8N
            try {
                const { data: webhookSettings } = await supabase.from('app_settings').select('setting_key, setting_value');
                const webhookUrl = webhookSettings?.find((s: any) => s.setting_key === 'n8n_webhook_new_sale')?.setting_value;
                const webhookEnabled = webhookSettings?.find((s: any) => s.setting_key === 'n8n_webhook_enabled')?.setting_value === 'true';

                if (webhookUrl && webhookEnabled) {
                    const response = await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'NEW_SALE',
                            client_name: `${formData.client_first_name} ${formData.client_last_name}`,
                            client_email: cleanClientEmail,
                            onboarding_link: link,
                            sale_id: sale.id,
                            amount: grossAmount
                        })
                    });
                    setNotificationStatus(response.ok ? 'sent' : 'failed');
                }
            } catch (err) {
                setNotificationStatus('failed');
            }

        } catch (error: any) {
            console.error('Error creating sale:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            client_first_name: '',
            client_last_name: '',
            client_email: '',
            client_phone: '',
            client_dni: '',
            client_address: '',
            contract_duration: '3',
            hotmart_payment_link: '',
            assigned_coach_id: '',
            admin_notes: '',
            coach_notes: '',
            sale_amount: '',
            payment_method_id: '',
            contract_template_id: contractTemplates[0]?.id || '',
            custom_duration: '',
            selected_closer_id: currentUser?.id || ''
        });
        setReceiptFile(null);
        setSuccess(false);
        setCreatedOnboardingLink('');
        setNotificationStatus('none');
    };

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (success) {
        return (
            <div className="max-w-4xl mx-auto p-6 animate-in zoom-in duration-500">
                <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="bg-slate-900 p-12 text-center text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="bg-emerald-500 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-12 shadow-xl shadow-emerald-500/40">
                                <Check className="w-14 h-14" />
                            </div>
                            <h1 className="text-4xl font-black mb-3">¡Alta Completada!</h1>
                            <p className="text-slate-400 text-lg">Venta registrada y procesada correctamente.</p>
                        </div>
                    </div>
                    <div className="p-12 space-y-8">
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-8 text-center">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Enlace de Onboarding</h3>
                            <div className="bg-white border p-4 rounded-xl text-slate-700 font-mono text-sm mb-4 break-all">
                                {createdOnboardingLink}
                            </div>
                            <button
                                onClick={() => { navigator.clipboard.writeText(createdOnboardingLink); alert('Copiado'); }}
                                className="bg-slate-900 text-white px-8 py-4 rounded-xl hover:bg-slate-800 transition-all font-bold flex items-center justify-center gap-2 mx-auto"
                            >
                                <Copy className="w-5 h-5" /> Copiar Link
                            </button>
                        </div>
                        <button onClick={resetForm} className="w-full py-5 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-2xl font-black transition-all">
                            REGISTRAR OTRO SOCIO
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Nueva Alta de Socio</h1>
                    <p className="text-slate-500 mt-2">Registra los datos para el onboarding.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border p-8 space-y-8 relative overflow-hidden">

                        {(currentUser?.role === 'admin' || currentUser?.role === 'head_coach') && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <label className="text-xs font-black text-blue-900 uppercase block mb-2 flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4" /> Asignar Venta a (Closer)
                                </label>
                                <select
                                    className="w-full p-3 border rounded-lg bg-white font-bold"
                                    value={formData.selected_closer_id}
                                    onChange={(e) => updateField('selected_closer_id', e.target.value)}
                                >
                                    {closers.map(closer => (
                                        <option key={closer.id} value={closer.id}>{closer.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                                <User className="w-5 h-5 text-blue-600" /> Datos del Cliente
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input required className="w-full p-3 border rounded-lg" placeholder="Nombre *" value={formData.client_first_name} onChange={e => updateField('client_first_name', e.target.value)} />
                                <input required className="w-full p-3 border rounded-lg" placeholder="Apellidos *" value={formData.client_last_name} onChange={e => updateField('client_last_name', e.target.value)} />
                                <input required type="email" className="w-full p-3 border rounded-lg md:col-span-2" placeholder="Email *" value={formData.client_email} onChange={e => updateField('client_email', e.target.value)} />
                                <input required className="w-full p-3 border rounded-lg" placeholder="Teléfono *" value={formData.client_phone} onChange={e => updateField('client_phone', normalizePhone(e.target.value))} />
                                <input required className="w-full p-3 border rounded-lg" placeholder="DNI / NIE *" value={formData.client_dni} onChange={e => updateField('client_dni', e.target.value.toUpperCase())} />
                                <input required className="w-full p-3 border rounded-lg md:col-span-2" placeholder="Dirección Completa *" value={formData.client_address} onChange={e => updateField('client_address', e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                                <DollarSign className="w-5 h-5 text-emerald-600" /> Detalles Económicos
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Monto de Venta (€) *</label>
                                    <input required type="number" className="w-full p-3 border rounded-lg font-black text-xl" value={formData.sale_amount} onChange={e => updateField('sale_amount', e.target.value)} />
                                </div>
                                <select required className="w-full p-3 border rounded-lg bg-white" value={formData.payment_method_id} onChange={e => updateField('payment_method_id', e.target.value)}>
                                    <option value="">Método de Pago...</option>
                                    {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                <select required className="w-full p-3 border rounded-lg bg-white" value={formData.contract_duration} onChange={e => updateField('contract_duration', e.target.value)}>
                                    <option value="3">3 Meses</option>
                                    <option value="6">6 Meses</option>
                                    <option value="12">12 Meses</option>
                                    <option value="18">18 Meses</option>
                                    <option value="24">24 Meses</option>
                                    <option value="custom">Manual...</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                                <Zap className="w-5 h-5 text-orange-500" /> Coach y Contrato
                            </h3>
                            <div className="space-y-4">
                                <select required className="w-full p-3 border rounded-lg bg-white" value={formData.assigned_coach_id} onChange={e => updateField('assigned_coach_id', e.target.value)}>
                                    <option value="">Selecciona Coach...</option>
                                    {coaches.map(c => <option key={c.id} value={c.id}>{c.name} ({c.available_slots} cupos)</option>)}
                                </select>
                                {formData.assigned_coach_id && (
                                    <div className="p-3 bg-emerald-50 rounded-xl text-xs font-bold text-emerald-800">
                                        Capacidad: {coaches.find(c => c.id === formData.assigned_coach_id)?.capacity_status.replace('_', ' ')}
                                    </div>
                                )}
                                <select required className="w-full p-3 border rounded-lg bg-white" value={formData.contract_template_id} onChange={e => updateField('contract_template_id', e.target.value)}>
                                    {contractTemplates.map(t => <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>)}
                                </select>
                            </div>
                        </div>

                        <button disabled={loading} type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-lg hover:bg-black transition-all flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-6 h-6" /> Registrar Alta</>}
                        </button>
                    </form>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border shadow-sm">
                        <h4 className="font-bold text-slate-900 mb-4 text-sm uppercase">Resumen</h4>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-slate-500">Closer</span> <span className="font-bold">{closers.find(c => c.id === formData.selected_closer_id)?.name || currentUser?.name}</span></div>
                            <div className="flex justify-between border-t pt-3 font-bold text-emerald-600">
                                <span>Comisión Est.</span>
                                <span>
                                    {(() => {
                                        const gross = Number(formData.sale_amount) || 0;
                                        const method = paymentMethods.find(m => m.id === formData.payment_method_id);
                                        const fee = method?.platform_fee_percentage || 0;
                                        const net = gross * (1 - (fee / 100));
                                        return `~${(net * (Number(currentUser?.commission_percentage) / 100)).toFixed(0)}€`;
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
