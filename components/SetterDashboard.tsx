/**
 * Dashboard del Setter
 *
 * Panel principal para el rol de Setter con:
 * - KPIs del día
 * - Agenda (leads a contactar)
 * - Lista de leads con acciones
 */

import React, { useState, useEffect } from 'react';
import {
    Phone, Calendar, Clock, CheckCircle2, XCircle, User as UserIcon,
    MessageCircle, Instagram, Mail, ChevronRight, AlertCircle,
    Target, Zap, Users, PhoneCall, PhoneOff, CalendarClock,
    Loader2, Filter, Search, Plus, X
} from 'lucide-react';
import { User, UserRole, LeadStatus } from '../types';
import LeadDetailModal from './leads/LeadDetailModal';
import {
    fetchSetterLeads,
    getSetterDayAgenda,
    markLeadContacted,
    scheduleLeadCall,
    markLeadNoShow,
    fetchClosersForAssignment,
    SetterLead,
    SetterDayAgenda
} from '../services/setterMetricsService';

interface SetterDashboardProps {
    currentUser: User;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
    NEW: 'bg-blue-100 text-blue-700 border-blue-200',
    CONTACTED: 'bg-amber-100 text-amber-700 border-amber-200',
    SCHEDULED: 'bg-purple-100 text-purple-700 border-purple-200',
    WON: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    LOST: 'bg-rose-100 text-rose-700 border-rose-200',
    NO_SHOW: 'bg-slate-100 text-slate-700 border-slate-200',
    CANCELLED: 'bg-gray-100 text-gray-700 border-gray-200',
    "RE-SCHEDULED": 'bg-indigo-100 text-indigo-700 border-indigo-200',
    NO_ENTRY: 'bg-slate-50 text-slate-400 border-slate-100'
};

const STATUS_LABELS: Record<LeadStatus, string> = {
    NEW: 'Nuevo',
    CONTACTED: 'Contactado',
    SCHEDULED: 'Agendado',
    WON: 'Ganado',
    LOST: 'Perdido',
    NO_SHOW: 'No Show',
    CANCELLED: 'Cancelado',
    "RE-SCHEDULED": 'Re-Agendado',
    NO_ENTRY: 'Sin Entrada'
};

export default function SetterDashboard({ currentUser }: SetterDashboardProps) {
    const [loading, setLoading] = useState(true);
    const [leads, setLeads] = useState<SetterLead[]>([]);
    const [agenda, setAgenda] = useState<SetterDayAgenda | null>(null);
    const [closers, setClosers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
    const [projectFilter, setProjectFilter] = useState<'all' | 'PT' | 'ME'>('all');
    const [selectedLead, setSelectedLead] = useState<SetterLead | null>(null);
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleData, setScheduleData] = useState({
        closerId: '',
        callDate: '',
        callTime: '',
        project: 'PT' as 'PT' | 'ME'
    });
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [leadsData, closersData] = await Promise.all([
                fetchSetterLeads(currentUser.id),
                fetchClosersForAssignment()
            ]);
            setLeads(leadsData);
            setClosers(closersData);
            setAgenda(getSetterDayAgenda(currentUser.id, leadsData));
        } catch (err) {
            console.error('Error loading setter data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkContacted = async (lead: SetterLead) => {
        setActionLoading(true);
        const result = await markLeadContacted(lead.id, currentUser.id);
        if (result.success) {
            await loadData();
        } else {
            alert('Error al marcar como contactado: ' + result.error);
        }
        setActionLoading(false);
    };

    const handleScheduleCall = async () => {
        if (!selectedLead || !scheduleData.closerId || !scheduleData.callDate) {
            alert('Por favor completa todos los campos');
            return;
        }

        setActionLoading(true);
        const callDateTime = `${scheduleData.callDate}T${scheduleData.callTime || '10:00'}:00`;
        const result = await scheduleLeadCall(
            selectedLead.id,
            currentUser.id,
            scheduleData.closerId,
            callDateTime,
            scheduleData.project
        );

        if (result.success) {
            setShowScheduleModal(false);
            setSelectedLead(null);
            setScheduleData({ closerId: '', callDate: '', callTime: '', project: 'PT' });
            await loadData();
        } else {
            alert('Error al agendar: ' + result.error);
        }
        setActionLoading(false);
    };

    const handleMarkNoShow = async (lead: SetterLead) => {
        if (!window.confirm(`¿Marcar a ${lead.name} como No-Show?`)) return;

        setActionLoading(true);
        const result = await markLeadNoShow(lead.id);
        if (result.success) {
            await loadData();
        } else {
            alert('Error: ' + result.error);
        }
        setActionLoading(false);
    };

    // Filter leads
    const filteredLeads = leads.filter(l => {
        const matchesSearch = searchTerm === '' ||
            l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.phone?.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
        const matchesProject = projectFilter === 'all' || l.project === projectFilter;
        return matchesSearch && matchesStatus && matchesProject;
    });

    // Today's stats
    const todayStats = {
        toContact: agenda?.leadsToContact.length || 0,
        followUps: agenda?.followUps.length || 0,
        scheduled: agenda?.scheduledToday.length || 0,
        totalNew: leads.filter(l => l.status === 'NEW').length
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Cargando datos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <div className="flex items-center gap-4">
                                <h1 className="text-3xl font-black tracking-tight">Dashboard Setter</h1>
                                <button
                                    onClick={() => {
                                        setSelectedLead(null);
                                        setIsLeadModalOpen(true);
                                    }}
                                    className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nuevo Lead
                                </button>
                            </div>
                            <p className="text-slate-400 mt-1">
                                Hola, {currentUser.name} • {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Phone className="w-5 h-5 text-blue-400" />
                                <span className="text-slate-400 text-xs font-bold uppercase">Por Contactar</span>
                            </div>
                            <p className="text-3xl font-black">{todayStats.toContact}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-amber-400" />
                                <span className="text-slate-400 text-xs font-bold uppercase">Follow-ups</span>
                            </div>
                            <p className="text-3xl font-black">{todayStats.followUps}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <CalendarClock className="w-5 h-5 text-purple-400" />
                                <span className="text-slate-400 text-xs font-bold uppercase">Agendados Hoy</span>
                            </div>
                            <p className="text-3xl font-black">{todayStats.scheduled}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Target className="w-5 h-5 text-emerald-400" />
                                <span className="text-slate-400 text-xs font-bold uppercase">Leads Nuevos</span>
                            </div>
                            <p className="text-3xl font-black">{todayStats.totalNew}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Agenda del Día */}
            {agenda && (agenda.leadsToContact.length > 0 || agenda.followUps.length > 0 || agenda.scheduledToday.length > 0) && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            Agenda del Día
                        </h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Leads to Contact */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-blue-500" />
                                Por Contactar ({agenda.leadsToContact.length})
                            </h3>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {agenda.leadsToContact.slice(0, 5).map(lead => (
                                    <div
                                        key={lead.id}
                                        className="p-3 bg-blue-50 rounded-xl border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
                                        onClick={() => setSelectedLead(lead)}
                                    >
                                        <p className="font-bold text-slate-800">{lead.name}</p>
                                        <p className="text-xs text-slate-500">{lead.phone || lead.email}</p>
                                    </div>
                                ))}
                                {agenda.leadsToContact.length > 5 && (
                                    <p className="text-xs text-slate-400 text-center py-2">
                                        +{agenda.leadsToContact.length - 5} más
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Follow-ups */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                Follow-ups ({agenda.followUps.length})
                            </h3>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {agenda.followUps.slice(0, 5).map(lead => (
                                    <div
                                        key={lead.id}
                                        className="p-3 bg-amber-50 rounded-xl border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors"
                                        onClick={() => setSelectedLead(lead)}
                                    >
                                        <p className="font-bold text-slate-800">{lead.name}</p>
                                        <p className="text-xs text-slate-500">{lead.phone || lead.email}</p>
                                    </div>
                                ))}
                                {agenda.followUps.length > 5 && (
                                    <p className="text-xs text-slate-400 text-center py-2">
                                        +{agenda.followUps.length - 5} más
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Scheduled Today */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                                <CalendarClock className="w-4 h-4 text-purple-500" />
                                Llamadas Hoy ({agenda.scheduledToday.length})
                            </h3>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {agenda.scheduledToday.slice(0, 5).map(lead => (
                                    <div
                                        key={lead.id}
                                        className="p-3 bg-purple-50 rounded-xl border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors"
                                        onClick={() => setSelectedLead(lead)}
                                    >
                                        <p className="font-bold text-slate-800">{lead.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {lead.scheduled_call_date && new Date(lead.scheduled_call_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leads Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Mis Leads
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as LeadStatus | 'all')}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="NEW">Nuevos</option>
                            <option value="CONTACTED">Contactados</option>
                            <option value="SCHEDULED">Agendados</option>
                            <option value="WON">Ganados</option>
                            <option value="LOST">Perdidos</option>
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

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left font-bold">Lead</th>
                                <th className="px-6 py-4 text-left font-bold">Contacto</th>
                                <th className="px-6 py-4 text-center font-bold">Fuente</th>
                                <th className="px-6 py-4 text-center font-bold">Estado</th>
                                <th className="px-6 py-4 text-center font-bold">Fecha</th>
                                <th className="px-6 py-4 text-center font-bold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLeads.map(lead => (
                                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                                {lead.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{lead.name}</p>
                                                {lead.notes && (
                                                    <p className="text-xs text-slate-400 truncate max-w-[200px]">{lead.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {lead.phone && (
                                                <a
                                                    href={`tel:${lead.phone}`}
                                                    className="text-sm text-slate-600 hover:text-blue-600 flex items-center gap-1"
                                                >
                                                    <Phone className="w-3 h-3" /> {lead.phone}
                                                </a>
                                            )}
                                            {lead.email && (
                                                <a
                                                    href={`mailto:${lead.email}`}
                                                    className="text-sm text-slate-600 hover:text-blue-600 flex items-center gap-1"
                                                >
                                                    <Mail className="w-3 h-3" /> {lead.email}
                                                </a>
                                            )}
                                            {lead.instagram_user && (
                                                <a
                                                    href={`https://instagram.com/${lead.instagram_user}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-slate-600 hover:text-pink-600 flex items-center gap-1"
                                                >
                                                    <Instagram className="w-3 h-3" /> @{lead.instagram_user}
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase ${lead.project === 'ME' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white'}`}>
                                                {lead.project || 'PT'}
                                            </span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${lead.in_out === 'Inbound' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {lead.in_out || 'Inbound'}
                                            </span>
                                            <span className="text-xs text-slate-500 font-medium">
                                                {lead.procedencia_detalle || lead.source}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${STATUS_COLORS[lead.status]}`}>
                                            {STATUS_LABELS[lead.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-slate-500">
                                        {new Date(lead.created_at).toLocaleDateString('es-ES')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {lead.status === 'NEW' && (
                                                <button
                                                    onClick={() => handleMarkContacted(lead)}
                                                    disabled={actionLoading}
                                                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                                    title="Marcar como contactado"
                                                >
                                                    <PhoneCall className="w-4 h-4" />
                                                </button>
                                            )}
                                            {lead.status === 'CONTACTED' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedLead(lead);
                                                        setShowScheduleModal(true);
                                                    }}
                                                    className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                                                    title="Agendar llamada"
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                </button>
                                            )}
                                            {lead.status === 'SCHEDULED' && (
                                                <button
                                                    onClick={() => handleMarkNoShow(lead)}
                                                    disabled={actionLoading}
                                                    className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors"
                                                    title="Marcar No-Show"
                                                >
                                                    <PhoneOff className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setSelectedLead(lead)}
                                                className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                                title="Ver detalles"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredLeads.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        No hay leads que mostrar
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Schedule Modal */}
            {showScheduleModal && selectedLead && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">
                            Agendar Llamada con Closer
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Lead: <span className="font-bold">{selectedLead.name}</span>
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-600 block mb-1">Proyecto</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setScheduleData({ ...scheduleData, project: 'PT' })}
                                        className={`flex-1 py-2 px-3 rounded-lg border font-bold text-xs transition-all ${scheduleData.project === 'PT' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                    >
                                        Padron Trainer
                                    </button>
                                    <button
                                        onClick={() => setScheduleData({ ...scheduleData, project: 'ME' })}
                                        className={`flex-1 py-2 px-3 rounded-lg border font-bold text-xs transition-all ${scheduleData.project === 'ME' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                    >
                                        Médico Emprendedor
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-600 block mb-1">Closer</label>
                                <select
                                    value={scheduleData.closerId}
                                    onChange={e => setScheduleData({ ...scheduleData, closerId: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                                >
                                    <option value="">Seleccionar closer...</option>
                                    {closers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-600 block mb-1">Fecha</label>
                                <input
                                    type="date"
                                    value={scheduleData.callDate}
                                    onChange={e => setScheduleData({ ...scheduleData, callDate: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-600 block mb-1">Hora</label>
                                <input
                                    type="time"
                                    value={scheduleData.callTime}
                                    onChange={e => setScheduleData({ ...scheduleData, callTime: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowScheduleModal(false);
                                    setSelectedLead(null);
                                }}
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleScheduleCall}
                                disabled={actionLoading || !scheduleData.closerId || !scheduleData.callDate}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-bold flex items-center justify-center gap-2"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                                Agendar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lead Detail Modal - Para ver/editar o crear nuevo */}
            {(selectedLead || isLeadModalOpen) && !showScheduleModal && (
                <LeadDetailModal
                    isOpen={true}
                    lead={selectedLead}
                    currentUser={currentUser}
                    onClose={() => {
                        setSelectedLead(null);
                        setIsLeadModalOpen(false);
                    }}
                    onSave={() => {
                        setSelectedLead(null);
                        setIsLeadModalOpen(false);
                        loadData(); // Recargar datos tras guardar
                    }}
                />
            )}
        </div>
    );
}
