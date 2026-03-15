import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../ToastProvider';
import {
    Search, Filter, RefreshCw, Plus, Save, X, Edit2, Trash2,
    Phone, Calendar, CheckCircle2, XCircle, Users, TrendingUp,
    ChevronLeft, ChevronRight, Download, Upload, Eye,
    PhoneCall, DollarSign, User, Clock, ExternalLink,
    CalendarDays, Hash, Zap, Target, ArrowUpDown
} from 'lucide-react';

// Tipos de datos para leads de Notion
interface NotionLead {
    notion_id: string;
    nombre_lead: string;
    setter: string | null;
    closer: string | null;
    procedencia: string | null;
    inb_out: string | null;
    dia_agenda: string | null;
    dia_llamada: string | null;
    estado_lead: string | null;
    presentado: boolean;
    cierre: boolean;
    pago: string | null;
    telefono: string | null;
    perfil_ig: string | null;
    project: 'PT' | 'ME' | null;
    last_updated_at: string;
}

// Estados disponibles para leads con colores
const LEAD_STATES = [
    { value: 'Sin empezar', color: 'bg-slate-500', textColor: 'text-slate-300' },
    { value: 'Agendado', color: 'bg-blue-500', textColor: 'text-blue-300' },
    { value: 'Reagenda', color: 'bg-yellow-500', textColor: 'text-yellow-300' },
    { value: 'Cancela', color: 'bg-purple-500', textColor: 'text-purple-300' },
    { value: 'No show', color: 'bg-orange-500', textColor: 'text-orange-300' },
    { value: 'En progreso', color: 'bg-cyan-500', textColor: 'text-cyan-300' },
    { value: 'No cierre', color: 'bg-red-500', textColor: 'text-red-300' },
    { value: 'Cierre', color: 'bg-emerald-500', textColor: 'text-emerald-300' },
    { value: 'Cerrado', color: 'bg-emerald-500', textColor: 'text-emerald-300' },
    { value: 'No cualifica', color: 'bg-gray-600', textColor: 'text-gray-400' },
];

// Colores únicos por SETTER
const SETTER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'thais': { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/50' },
    'diana': { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/50' },
    'elena': { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/50' },
};

// Colores únicos por CLOSER
const CLOSER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'sergi': { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/50' },
    'yassine': { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/50' },
    'elena': { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/50' },
    'raquel': { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/50' },
};

// Setters y closers válidos
const VALID_SETTERS = ['Thais', 'Diana', 'Elena'];
const VALID_CLOSERS = ['Sergi', 'Yassine', 'Elena', 'Raquel'];

// Procedencias comunes
const PROCEDENCIAS = ['Instagram', 'Facebook', 'Referido', 'Web', 'YouTube', 'TikTok', 'Otro'];

const LeadsManagement: React.FC = () => {
    const { toast } = useToast();
    const [leads, setLeads] = useState<NotionLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSetter, setFilterSetter] = useState<string>('');
    const [filterCloser, setFilterCloser] = useState<string>('');
    const [filterState, setFilterState] = useState<string>('');
    const [filterProcedencia, setFilterProcedencia] = useState<string>('');
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [projectFilter, setProjectFilter] = useState<string>('');
    const [showOnlyCierres, setShowOnlyCierres] = useState(false);
    const [showOnlyPresentados, setShowOnlyPresentados] = useState(false);

    // Ordenamiento
    const [sortField, setSortField] = useState<'dia_agenda' | 'nombre_lead' | 'closer' | 'setter'>('dia_agenda');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(30);

    // Modal de edición
    const [editingLead, setEditingLead] = useState<NotionLead | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<NotionLead>>({});

    // Modal de nuevo lead
    const [showNewModal, setShowNewModal] = useState(false);
    const [newLeadData, setNewLeadData] = useState<Partial<NotionLead>>({
        nombre_lead: '',
        setter: '',
        closer: '',
        estado_lead: 'Sin empezar',
        procedencia: '',
        telefono: '',
        perfil_ig: '',
        presentado: false,
        cierre: false,
        pago: '',
        inb_out: ''
    });

    // Cargar leads
    const fetchLeads = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notion_leads_metrics')
                .select('*')
                .order('dia_agenda', { ascending: false });

            if (error) throw error;
            setLeads(data || []);
        } catch (err) {
            console.error('Error fetching leads:', err);
            toast.error('Error al cargar los leads');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    // Filtrar y ordenar leads
    const filteredLeads = useMemo(() => {
        let result = leads.filter(lead => {
            // Filtro por búsqueda
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const matchesSearch =
                    lead.nombre_lead?.toLowerCase().includes(search) ||
                    lead.telefono?.includes(search) ||
                    lead.perfil_ig?.toLowerCase().includes(search);
                if (!matchesSearch) return false;
            }

            // Filtro por setter - Normalizado para Thais/Thaïs
            if (filterSetter) {
                const leadSetter = (lead.setter || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const targetSetter = filterSetter.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (leadSetter !== targetSetter) return false;
            }

            // Filtro por closer
            if (filterCloser && lead.closer?.toLowerCase() !== filterCloser.toLowerCase()) return false;

            // Filtro por estado
            if (filterState && lead.estado_lead?.toLowerCase() !== filterState.toLowerCase()) return false;

            // Filtro por procedencia
            if (filterProcedencia && lead.procedencia?.toLowerCase() !== filterProcedencia.toLowerCase()) return false;

            // Filtro solo cierres
            if (showOnlyCierres && !lead.cierre) return false;

            // Filtro solo presentados
            if (showOnlyPresentados && !lead.presentado) return false;

            // Filtro por proyecto
            if (projectFilter && lead.project !== projectFilter) return false;

            // Filtro por mes/año
            if (lead.dia_agenda) {
                const date = new Date(lead.dia_agenda);
                if (date.getMonth() !== filterMonth || date.getFullYear() !== filterYear) {
                    return false;
                }
            }

            return true;
        });

        // Ordenar
        result.sort((a, b) => {
            let valA: any, valB: any;
            switch (sortField) {
                case 'dia_agenda':
                    valA = a.dia_agenda ? new Date(a.dia_agenda).getTime() : 0;
                    valB = b.dia_agenda ? new Date(b.dia_agenda).getTime() : 0;
                    break;
                case 'nombre_lead':
                    valA = a.nombre_lead?.toLowerCase() || '';
                    valB = b.nombre_lead?.toLowerCase() || '';
                    break;
                case 'closer':
                    valA = a.closer?.toLowerCase() || '';
                    valB = b.closer?.toLowerCase() || '';
                    break;
                case 'setter':
                    valA = a.setter?.toLowerCase() || '';
                    valB = b.setter?.toLowerCase() || '';
                    break;
                default:
                    valA = 0;
                    valB = 0;
            }
            if (sortDirection === 'asc') {
                return valA > valB ? 1 : -1;
            } else {
                return valA < valB ? 1 : -1;
            }
        });

        return result;
    }, [leads, searchTerm, filterSetter, filterCloser, filterState, filterProcedencia, filterMonth, filterYear, showOnlyCierres, showOnlyPresentados, sortField, sortDirection]);

    // Paginación
    const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
    const paginatedLeads = filteredLeads.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Métricas rápidas
    const metrics = useMemo(() => {
        const total = filteredLeads.length;
        const presentados = filteredLeads.filter(l => l.presentado).length;
        const cierres = filteredLeads.filter(l => l.cierre).length;
        const showRate = total > 0 ? ((presentados / total) * 100).toFixed(1) : '0';
        const closeRate = presentados > 0 ? ((cierres / presentados) * 100).toFixed(1) : '0';

        // Calcular revenue
        let revenue = 0;
        filteredLeads.forEach(l => {
            if (l.pago) {
                const numMatch = l.pago.toString().match(/[\d,.]+/);
                if (numMatch) {
                    revenue += parseFloat(numMatch[0].replace(',', '.')) || 0;
                }
            }
        });

        return { total, presentados, cierres, showRate, closeRate, revenue };
    }, [filteredLeads]);

    // Guardar cambios de un lead
    const handleSaveLead = async (lead: NotionLead, updates: Partial<NotionLead>) => {
        setSaving(lead.notion_id);
        try {
            const { error } = await supabase
                .from('notion_leads_metrics')
                .update({ ...updates, last_updated_at: new Date().toISOString() })
                .eq('notion_id', lead.notion_id);

            if (error) throw error;

            // Actualizar estado local
            setLeads(prev => prev.map(l =>
                l.notion_id === lead.notion_id ? { ...l, ...updates } : l
            ));
            toast.success('Lead actualizado correctamente');
            setEditingLead(null);
        } catch (err) {
            console.error('Error saving lead:', err);
            toast.error('Error al guardar el lead');
        }
        setSaving(null);
    };

    // Crear nuevo lead
    const handleCreateLead = async () => {
        if (!newLeadData.nombre_lead?.trim()) {
            toast.error('El nombre del lead es requerido');
            return;
        }

        setSaving('new');
        try {
            const newLead = {
                ...newLeadData,
                notion_id: `crm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                dia_agenda: new Date().toISOString(),
                last_updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('notion_leads_metrics')
                .insert([newLead]);

            if (error) throw error;

            toast.success('Lead creado correctamente');
            setShowNewModal(false);
            setNewLeadData({
                nombre_lead: '',
                setter: '',
                closer: '',
                estado_lead: 'Sin empezar',
                procedencia: '',
                telefono: '',
                perfil_ig: '',
                presentado: false,
                cierre: false,
                pago: '',
                inb_out: ''
            });
            fetchLeads();
        } catch (err) {
            console.error('Error creating lead:', err);
            toast.error('Error al crear el lead');
        }
        setSaving(null);
    };

    // Eliminar lead
    const handleDeleteLead = async (notionId: string) => {
        if (!window.confirm('¿Seguro que quieres eliminar este lead?')) return;

        try {
            const { error } = await supabase
                .from('notion_leads_metrics')
                .delete()
                .eq('notion_id', notionId);

            if (error) throw error;

            setLeads(prev => prev.filter(l => l.notion_id !== notionId));
            toast.success('Lead eliminado');
        } catch (err) {
            console.error('Error deleting lead:', err);
            toast.error('Error al eliminar el lead');
        }
    };

    // Toggle rápido de checkbox
    const handleQuickToggle = async (lead: NotionLead, field: 'presentado' | 'cierre') => {
        const newValue = !lead[field];
        await handleSaveLead(lead, { [field]: newValue });
    };

    // Cambio rápido de campo select inline
    const handleQuickChange = async (lead: NotionLead, field: keyof NotionLead, value: any) => {
        await handleSaveLead(lead, { [field]: value });
    };

    // Obtener color del estado
    const getStateStyle = (state: string | null) => {
        const found = LEAD_STATES.find(s => s.value.toLowerCase() === state?.toLowerCase());
        return found || { color: 'bg-slate-600', textColor: 'text-slate-300' };
    };

    // Obtener color del setter - Normalizado
    const getSetterStyle = (setter: string | null) => {
        if (!setter) return { bg: 'bg-slate-700', text: 'text-slate-400', border: 'border-slate-600' };
        // Normalizar nombre para buscar en el mapa (thais = thaïs)
        const normalizedSetter = setter.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // Mapeo manual para casos específicos si es necesario
        const key = normalizedSetter === 'thais' ? 'thais' : normalizedSetter;

        return SETTER_COLORS[key] || { bg: 'bg-slate-700', text: 'text-slate-400', border: 'border-slate-600' };
    };

    // Obtener color del closer
    const getCloserStyle = (closer: string | null) => {
        if (!closer) return { bg: 'bg-slate-700', text: 'text-slate-400', border: 'border-slate-600' };
        return CLOSER_COLORS[closer.toLowerCase()] || { bg: 'bg-slate-700', text: 'text-slate-400', border: 'border-slate-600' };
    };

    // Formatear fecha
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    };

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    // Toggle ordenamiento
    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // Reset filtros
    const resetFilters = () => {
        setSearchTerm('');
        setFilterSetter('');
        setFilterCloser('');
        setFilterState('');
        setFilterProcedencia('');
        setShowOnlyCierres(false);
        setShowOnlyPresentados(false);
        setProjectFilter('');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <Target className="w-7 h-7 text-violet-400" />
                        Gestión de Leads
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Base de datos completa con todos los leads. Edita directamente.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchLeads}
                        disabled={loading}
                        className="p-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                        title="Recargar datos"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-violet-500/25 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Lead
                    </button>
                </div>
            </div>

            {/* Métricas Rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/20 rounded-lg">
                            <Users className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{metrics.total}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Leads</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/20 rounded-lg">
                            <PhoneCall className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{metrics.presentados}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Llamadas</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{metrics.cierres}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Cierres</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{metrics.showRate}%</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Show Rate</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <Zap className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{metrics.closeRate}%</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Close Rate</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <DollarSign className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{metrics.revenue.toLocaleString()}€</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Revenue</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Búsqueda */}
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar nombre, teléfono, IG..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none"
                        />
                    </div>

                    {/* Filtro por Mes */}
                    <select
                        value={filterMonth}
                        onChange={(e) => { setFilterMonth(Number(e.target.value)); setCurrentPage(1); }}
                        className="px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm focus:ring-2 focus:ring-violet-500/50 outline-none"
                    >
                        {monthNames.map((m, i) => (
                            <option key={i} value={i} className="bg-slate-800">{m}</option>
                        ))}
                    </select>

                    {/* Filtro por Año */}
                    <select
                        value={filterYear}
                        onChange={(e) => { setFilterYear(Number(e.target.value)); setCurrentPage(1); }}
                        className="px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm focus:ring-2 focus:ring-violet-500/50 outline-none"
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y} className="bg-slate-800">{y}</option>
                        ))}
                    </select>

                    {/* Filtro por Setter */}
                    <select
                        value={filterSetter}
                        onChange={(e) => { setFilterSetter(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm focus:ring-2 focus:ring-violet-500/50 outline-none"
                    >
                        <option value="">Setter</option>
                        {VALID_SETTERS.map(s => (
                            <option key={s} value={s} className="bg-slate-800">{s}</option>
                        ))}
                    </select>

                    {/* Filtro por Closer */}
                    <select
                        value={filterCloser}
                        onChange={(e) => { setFilterCloser(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm focus:ring-2 focus:ring-violet-500/50 outline-none"
                    >
                        <option value="">Closer</option>
                        {VALID_CLOSERS.map(c => (
                            <option key={c} value={c} className="bg-slate-800">{c}</option>
                        ))}
                    </select>

                    {/* Filtro por Estado */}
                    <select
                        value={filterState}
                        onChange={(e) => { setFilterState(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm focus:ring-2 focus:ring-violet-500/50 outline-none"
                    >
                        <option value="">Estado</option>
                        {LEAD_STATES.map(s => (
                            <option key={s.value} value={s.value} className="bg-slate-800">{s.value}</option>
                        ))}
                    </select>

                    {/* Filtro por Procedencia */}
                    <select
                        value={filterProcedencia}
                        onChange={(e) => { setFilterProcedencia(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm focus:ring-2 focus:ring-violet-500/50 outline-none"
                    >
                        <option value="">Procedencia</option>
                        {PROCEDENCIAS.map(p => (
                            <option key={p} value={p} className="bg-slate-800">{p}</option>
                        ))}
                    </select>

                    {/* Filtro por Proyecto */}
                    <select
                        value={projectFilter}
                        onChange={(e) => { setProjectFilter(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm focus:ring-2 focus:ring-violet-500/50 outline-none"
                    >
                        <option value="">Proyecto</option>
                        <option value="PT" className="bg-slate-800">PT</option>
                        <option value="ME" className="bg-slate-800">ME</option>
                    </select>

                    {/* Toggle Cierres */}
                    <button
                        onClick={() => { setShowOnlyCierres(!showOnlyCierres); setCurrentPage(1); }}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${showOnlyCierres ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'}`}
                    >
                        Solo Cierres
                    </button>

                    {/* Toggle Presentados */}
                    <button
                        onClick={() => { setShowOnlyPresentados(!showOnlyPresentados); setCurrentPage(1); }}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${showOnlyPresentados ? 'bg-cyan-500 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'}`}
                    >
                        Solo Llamadas
                    </button>

                    {/* Limpiar filtros */}
                    <button
                        onClick={resetFilters}
                        className="px-3 py-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors text-sm"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Tabla de Leads */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700/50 text-left">
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('nombre_lead')} className="flex items-center gap-1 hover:text-white">
                                        Nombre {sortField === 'nombre_lead' && <ArrowUpDown className="w-3 h-3" />}
                                    </button>
                                </th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('setter')} className="flex items-center gap-1 hover:text-white">
                                        Setter {sortField === 'setter' && <ArrowUpDown className="w-3 h-3" />}
                                    </button>
                                </th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('closer')} className="flex items-center gap-1 hover:text-white">
                                        Closer {sortField === 'closer' && <ArrowUpDown className="w-3 h-3" />}
                                    </button>
                                </th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('dia_agenda')} className="flex items-center gap-1 hover:text-white">
                                        Fecha {sortField === 'dia_agenda' && <ArrowUpDown className="w-3 h-3" />}
                                    </button>
                                </th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Procedencia</th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Presentado</th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Cierre</th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proyecto</th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pago</th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center">
                                        <div className="flex items-center justify-center gap-3 text-slate-400">
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            Cargando leads...
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-slate-500">
                                        No se encontraron leads con los filtros seleccionados
                                    </td>
                                </tr>
                            ) : (
                                paginatedLeads.map((lead) => {
                                    const setterStyle = getSetterStyle(lead.setter);
                                    const closerStyle = getCloserStyle(lead.closer);
                                    const stateStyle = getStateStyle(lead.estado_lead);

                                    return (
                                        <tr key={lead.notion_id} className="hover:bg-slate-700/30 transition-colors group">
                                            {/* Nombre */}
                                            <td className="p-3">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-white text-sm">{lead.nombre_lead || 'Sin nombre'}</span>
                                                    {lead.telefono && (
                                                        <a href={`tel:${lead.telefono}`} className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-0.5">
                                                            <Phone className="w-3 h-3" />
                                                            {lead.telefono}
                                                        </a>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Setter */}
                                            <td className="p-3">
                                                <span className={`px-2.5 py-1 ${setterStyle.bg} ${setterStyle.text} border ${setterStyle.border} text-xs font-bold rounded-lg inline-block`}>
                                                    {lead.setter || '-'}
                                                </span>
                                            </td>

                                            {/* Closer */}
                                            <td className="p-3">
                                                <span className={`px-2.5 py-1 ${closerStyle.bg} ${closerStyle.text} border ${closerStyle.border} text-xs font-bold rounded-lg inline-block`}>
                                                    {lead.closer || '-'}
                                                </span>
                                            </td>

                                            {/* Fecha */}
                                            <td className="p-3">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-white font-medium">{formatDate(lead.dia_agenda)}</span>
                                                    {lead.dia_llamada && (
                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            Llamada: {formatDate(lead.dia_llamada)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Procedencia */}
                                            <td className="p-3">
                                                <span className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded">
                                                    {lead.procedencia || '-'}
                                                </span>
                                            </td>

                                            {/* Estado */}
                                            <td className="p-3">
                                                <span className={`px-2 py-1 ${stateStyle.color} text-white text-[10px] font-bold uppercase rounded-lg inline-block`}>
                                                    {lead.estado_lead || 'Sin estado'}
                                                </span>
                                            </td>

                                            {/* Presentado */}
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleQuickToggle(lead, 'presentado')}
                                                    disabled={saving === lead.notion_id}
                                                    className={`p-2 rounded-lg transition-all ${lead.presentado
                                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                                        : 'bg-slate-700/50 text-slate-500 hover:bg-slate-600'
                                                        }`}
                                                >
                                                    {lead.presentado ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                </button>
                                            </td>

                                            {/* Cierre */}
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleQuickToggle(lead, 'cierre')}
                                                    disabled={saving === lead.notion_id}
                                                    className={`p-2 rounded-lg transition-all ${lead.cierre
                                                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                        : 'bg-slate-700/50 text-slate-500 hover:bg-slate-600'
                                                        }`}
                                                >
                                                    {lead.cierre ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                </button>
                                            </td>

                                            {/* Proyecto */}
                                            <td className="p-3 text-center">
                                                <select
                                                    value={lead.project || ''}
                                                    onChange={(e) => handleQuickChange(lead, 'project', e.target.value || null)}
                                                    className="bg-slate-700/50 text-[10px] font-bold text-slate-300 border-none rounded p-1 outline-none"
                                                >
                                                    <option value="">-</option>
                                                    <option value="PT">PT</option>
                                                    <option value="ME">ME</option>
                                                </select>
                                            </td>

                                            {/* Pago */}
                                            <td className="p-3">
                                                <span className="text-sm text-emerald-400 font-bold">
                                                    {lead.pago || '0€'}
                                                </span>
                                            </td>

                                            {/* Acciones */}
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingLead(lead);
                                                            setEditFormData(lead);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteLead(lead.notion_id)}
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-700/50 flex items-center justify-between">
                        <span className="text-sm text-slate-400">
                            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredLeads.length)} de {filteredLeads.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-white font-medium px-3">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Edición */}
            {editingLead && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Editar Lead</h2>
                            <button onClick={() => setEditingLead(null)} className="p-2 hover:bg-slate-700 rounded-lg">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        value={editFormData.nombre_lead || ''}
                                        onChange={e => setEditFormData(p => ({ ...p, nombre_lead: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        value={editFormData.telefono || ''}
                                        onChange={e => setEditFormData(p => ({ ...p, telefono: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Instagram</label>
                                    <input
                                        type="text"
                                        value={editFormData.perfil_ig || ''}
                                        onChange={e => setEditFormData(p => ({ ...p, perfil_ig: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                        placeholder="@usuario"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Procedencia</label>
                                    <select
                                        value={editFormData.procedencia || ''}
                                        onChange={e => setEditFormData(p => ({ ...p, procedencia: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    >
                                        <option value="">-</option>
                                        {PROCEDENCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Setter</label>
                                    <select
                                        value={editFormData.setter || ''}
                                        onChange={e => setEditFormData(p => ({ ...p, setter: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    >
                                        <option value="">Sin asignar</option>
                                        {VALID_SETTERS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Closer</label>
                                    <select
                                        value={editFormData.closer || ''}
                                        onChange={e => setEditFormData(p => ({ ...p, closer: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    >
                                        <option value="">Sin asignar</option>
                                        {VALID_CLOSERS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Estado</label>
                                    <select
                                        value={editFormData.estado_lead || ''}
                                        onChange={e => setEditFormData(p => ({ ...p, estado_lead: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    >
                                        {LEAD_STATES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Pago</label>
                                    <input
                                        type="text"
                                        value={editFormData.pago || ''}
                                        onChange={e => setEditFormData(p => ({ ...p, pago: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                        placeholder="Ej: 1000€"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Fecha Agenda</label>
                                    <input
                                        type="datetime-local"
                                        value={editFormData.dia_agenda ? new Date(editFormData.dia_agenda).toISOString().slice(0, 16) : ''}
                                        onChange={e => setEditFormData(p => ({ ...p, dia_agenda: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Fecha Llamada</label>
                                    <input
                                        type="datetime-local"
                                        value={editFormData.dia_llamada ? new Date(editFormData.dia_llamada).toISOString().slice(0, 16) : ''}
                                        onChange={e => setEditFormData(p => ({ ...p, dia_llamada: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">INB/OUT</label>
                                    <select
                                        value={editFormData.inb_out || ''}
                                        onChange={e => setEditFormData(p => ({ ...p, inb_out: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    >
                                        <option value="">-</option>
                                        <option value="INB">Inbound</option>
                                        <option value="OUT">Outbound</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 py-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editFormData.presentado || false}
                                        onChange={e => setEditFormData(p => ({ ...p, presentado: e.target.checked }))}
                                        className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500"
                                    />
                                    <span className="text-white">Presentado (llegó a llamada)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editFormData.cierre || false}
                                        onChange={e => setEditFormData(p => ({ ...p, cierre: e.target.checked }))}
                                        className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500"
                                    />
                                    <span className="text-white">Cierre (venta)</span>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingLead(null)}
                                className="px-4 py-2 text-slate-400 hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleSaveLead(editingLead, editFormData)}
                                disabled={saving === editingLead.notion_id}
                                className="flex items-center gap-2 px-5 py-2 bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving === editingLead.notion_id ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Nuevo Lead */}
            {showNewModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Nuevo Lead</h2>
                            <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Nombre *</label>
                                    <input
                                        type="text"
                                        value={newLeadData.nombre_lead || ''}
                                        onChange={e => setNewLeadData(p => ({ ...p, nombre_lead: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                        placeholder="Nombre completo"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        value={newLeadData.telefono || ''}
                                        onChange={e => setNewLeadData(p => ({ ...p, telefono: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                        placeholder="+34 600..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Setter</label>
                                    <select
                                        value={newLeadData.setter || ''}
                                        onChange={e => setNewLeadData(p => ({ ...p, setter: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    >
                                        <option value="">Sin asignar</option>
                                        {VALID_SETTERS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Closer</label>
                                    <select
                                        value={newLeadData.closer || ''}
                                        onChange={e => setNewLeadData(p => ({ ...p, closer: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    >
                                        <option value="">Sin asignar</option>
                                        {VALID_CLOSERS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Procedencia</label>
                                    <select
                                        value={newLeadData.procedencia || ''}
                                        onChange={e => setNewLeadData(p => ({ ...p, procedencia: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {PROCEDENCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Instagram</label>
                                    <input
                                        type="text"
                                        value={newLeadData.perfil_ig || ''}
                                        onChange={e => setNewLeadData(p => ({ ...p, perfil_ig: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                                        placeholder="@usuario"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="px-4 py-2 text-slate-400 hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateLead}
                                disabled={saving === 'new'}
                                className="flex items-center gap-2 px-5 py-2 bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" />
                                {saving === 'new' ? 'Creando...' : 'Crear Lead'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeadsManagement;
