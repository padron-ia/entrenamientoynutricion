import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus, User as UserType, UserRole } from '../../types';
import { leadsService } from '../../services/leadsService';
import { useToast } from '../ToastProvider';
import { X, Save, User, Smartphone, Mail, Calendar, Trash2, ArrowRightCircle, Clock, Info, PhoneCall, Target, MessageCircle, Phone, ExternalLink } from 'lucide-react';
import { DEFAULT_SETTERS, DEFAULT_CLOSERS, LEAD_STATUS_OPTIONS, PROCEDENCIAS } from './leadsConstants';

interface LeadDetailModalProps {
    lead: Partial<Lead> | null;
    currentUser: UserType;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

type ModalTab = 'info' | 'pipeline';

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, currentUser, isOpen, onClose, onSave }) => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<ModalTab>('info');
    const [formData, setFormData] = useState<Partial<Lead>>({
        firstName: '', surname: '', email: '', phone: '', instagram_user: '',
        source: 'Manual', status: 'NEW', notes: '', assigned_to_name: '', closer_id: '',
        in_out: 'Inbound', procedencia: 'Instagram', meeting_date: '', call_date: '', meeting_time: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isConverting, setIsConverting] = useState(false);

    useEffect(() => {
        if (lead && lead.id) {
            setFormData(lead);
        } else {
            let initialSetter = '';
            if (currentUser.role === UserRole.SETTER) {
                const name = currentUser.name.split(' ')[0];
                initialSetter = DEFAULT_SETTERS.find(s => s.toLowerCase() === name.toLowerCase()) || currentUser.name;
            }
            setFormData({
                firstName: '', surname: '', email: '', phone: '', instagram_user: '',
                source: 'Manual', status: 'NEW', notes: '', assigned_to_name: initialSetter, closer_id: '',
                in_out: 'Inbound', procedencia: 'Instagram',
                meeting_date: new Date().toISOString().split('T')[0], call_date: '', meeting_time: ''
            });
        }
        setActiveTab('info');
    }, [lead, isOpen, currentUser]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (formData.id) {
                await leadsService.updateLead(formData.id, formData);
                toast.success('Lead actualizado correctamente');
            } else {
                await leadsService.createLead(formData);
                toast.success('Lead creado correctamente');
            }
            onSave();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error('Error al guardar el lead');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!formData.id || !window.confirm('¿Seguro que quieres eliminar este lead?')) return;
        try {
            await leadsService.deleteLead(formData.id);
            toast.success('Lead eliminado');
            onSave();
            onClose();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const handleConvertToClient = async () => {
        if (!formData.id) return;
        if (!window.confirm('¿Convertir este Lead en CLIENTE? Se creará una ficha de cliente vacía con estos datos.')) return;
        setIsConverting(true);
        try {
            await leadsService.convertLeadToClient(formData as Lead, currentUser.id, currentUser.name);
            toast.success('¡Cliente Creado! Lead marcado como WON.');
            onSave();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error('Error al convertir: ' + error.message);
        } finally {
            setIsConverting(false);
        }
    };

    const hasPhone = !!formData.phone;
    const hasEmail = !!formData.email;
    const hasInstagram = !!formData.instagram_user;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">

                {/* HEADER */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Target className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">
                                {formData.id ? 'Editar Lead' : 'Nuevo Lead'}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                {formData.id ? `ID: ${formData.id.substring(0, 8)}` : 'Información de prospecto'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* QUICK ACTIONS */}
                {formData.id && (hasPhone || hasEmail || hasInstagram) && (
                    <div className="px-6 pt-4 flex gap-2 flex-wrap">
                        {hasPhone && (
                            <a href={`https://wa.me/${formData.phone!.replace(/\+/g, '').replace(/\s/g, '')}`} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors border border-green-100">
                                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                            </a>
                        )}
                        {hasInstagram && (
                            <a href={`https://instagram.com/${formData.instagram_user!.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-700 rounded-lg text-xs font-bold hover:bg-pink-100 transition-colors border border-pink-100">
                                <ExternalLink className="w-3.5 h-3.5" /> Instagram
                            </a>
                        )}
                        {hasPhone && (
                            <a href={`tel:${formData.phone}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-100">
                                <Phone className="w-3.5 h-3.5" /> Llamar
                            </a>
                        )}
                        {hasEmail && (
                            <a href={`mailto:${formData.email}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors border border-amber-100">
                                <Mail className="w-3.5 h-3.5" /> Email
                            </a>
                        )}
                    </div>
                )}

                {/* TABS */}
                <div className="px-6 pt-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button type="button" onClick={() => setActiveTab('info')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            Info y Contacto
                        </button>
                        <button type="button" onClick={() => setActiveTab('pipeline')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'pipeline' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            Pipeline
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    <form id="lead-form" onSubmit={handleSubmit} className="space-y-5">

                        {/* TAB: Info y Contacto */}
                        <div className={activeTab === 'info' ? '' : 'hidden'}>
                            <div className="space-y-4">
                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</label>
                                            <div className="relative">
                                                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                                <input required
                                                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                                    placeholder="Ej. Juan"
                                                    value={formData.firstName || ''}
                                                    onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Apellidos</label>
                                            <input required
                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                                placeholder="Ej. Pérez"
                                                value={formData.surname || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, surname: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono (WhatsApp)</label>
                                            <div className="relative">
                                                <Smartphone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                                <input
                                                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                                    placeholder="+34 600..."
                                                    value={formData.phone || ''}
                                                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                                            <div className="relative">
                                                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                                <input type="email"
                                                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                                    placeholder="email@ejemplo.com"
                                                    value={formData.email || ''}
                                                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instagram User</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">@</span>
                                            <input
                                                className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                                placeholder="usuario_ig"
                                                value={formData.instagram_user || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, instagram_user: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notas / Historial</label>
                                    <textarea
                                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[140px] resize-none"
                                        placeholder="Escribe aquí notas sobre la conversación, dolores, objetivos..."
                                        value={formData.notes || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* TAB: Pipeline */}
                        <div className={activeTab === 'pipeline' ? '' : 'hidden'}>
                            <div className="space-y-5">
                                {/* Status Bar */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Info className="w-3 h-3" /> Estado del Pipeline
                                    </label>
                                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl">
                                        {LEAD_STATUS_OPTIONS.map(opt => (
                                            <button type="button" key={opt.value}
                                                onClick={() => setFormData(prev => ({ ...prev, status: opt.value }))}
                                                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all border ${formData.status === opt.value
                                                    ? `${opt.color} text-white border-transparent shadow-sm scale-105`
                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Setter / Closer */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Setter (Prospección)</label>
                                        <div className="relative">
                                            <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                            <select
                                                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none"
                                                value={formData.assigned_to_name || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, assigned_to_name: e.target.value }))}>
                                                <option value="">Sin asignar</option>
                                                {DEFAULT_SETTERS.map(s => <option key={s} value={s}>{s}</option>)}
                                                {formData.assigned_to_name && !DEFAULT_SETTERS.includes(formData.assigned_to_name) && (
                                                    <option value={formData.assigned_to_name}>{formData.assigned_to_name}</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Closer (Venta)</label>
                                        <div className="relative">
                                            <Target className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                            <select
                                                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none"
                                                value={formData.closer_id || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, closer_id: e.target.value }))}>
                                                <option value="">Seleccionar Closer...</option>
                                                {DEFAULT_CLOSERS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* INB/OUT + Procedencia */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">INB / OUT</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl">
                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, in_out: 'Inbound' }))}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${formData.in_out === 'Inbound' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                                Inbound
                                            </button>
                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, in_out: 'Outbound' }))}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${formData.in_out === 'Outbound' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                                Outbound
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Procedencia</label>
                                        <select
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                            value={formData.procedencia || 'Instagram'}
                                            onChange={e => setFormData(prev => ({ ...prev, procedencia: e.target.value as any }))}>
                                            {PROCEDENCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50 space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Día Agenda</label>
                                            <div className="relative">
                                                <Calendar className="w-4 h-4 absolute left-3 top-3 text-blue-400" />
                                                <input type="date"
                                                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-blue-100 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                                    value={formData.meeting_date || ''}
                                                    onChange={e => setFormData(prev => ({ ...prev, meeting_date: e.target.value }))} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Día Llamada</label>
                                            <div className="relative">
                                                <PhoneCall className="w-4 h-4 absolute left-3 top-3 text-blue-400" />
                                                <input type="date"
                                                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-blue-100 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                                    value={formData.call_date || ''}
                                                    onChange={e => setFormData(prev => ({ ...prev, call_date: e.target.value }))} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Hora Cita</label>
                                            <div className="relative">
                                                <Clock className="w-4 h-4 absolute left-3 top-3 text-blue-400" />
                                                <input type="time"
                                                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-blue-100 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                                    value={formData.meeting_time || ''}
                                                    onChange={e => setFormData(prev => ({ ...prev, meeting_time: e.target.value }))} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* FOOTER */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <div>
                        {formData.id && (
                            <button type="button" onClick={handleDelete}
                                className="text-red-500 p-2.5 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                                title="Eliminar Lead">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {formData.id && formData.status === 'WON' && (
                            <button type="button" onClick={handleConvertToClient} disabled={isConverting}
                                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-70">
                                <ArrowRightCircle className="w-4 h-4" />
                                {isConverting ? 'Convirtiendo...' : 'Convertir a Cliente'}
                            </button>
                        )}
                        <button type="button" onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors text-sm">
                            Cancelar
                        </button>
                        <button type="submit" form="lead-form" disabled={isSaving}
                            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Guardando...' : 'Guardar Lead'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadDetailModal;
