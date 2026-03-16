import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Lead, LeadStatus, User as UserType } from '../../types';
import { leadsService } from '../../services/leadsService';
import { useToast } from '../ToastProvider';
import LeadCard from './LeadCard';
import LeadDetailModal from './LeadDetailModal';
import LeadsTableView from './LeadsTableView';
import { KANBAN_COLUMNS, DEFAULT_SETTERS, DEFAULT_CLOSERS, LEAD_STATUS_OPTIONS } from './leadsConstants';
import { LayoutGrid, List, Plus, RefreshCw, Search, X, Users, TrendingUp, Target, Calendar, CheckCircle, BarChart3 } from 'lucide-react';

type ViewMode = 'kanban' | 'table';

interface LeadsPipelineProps {
    currentUser: UserType;
}

const LeadsPipeline: React.FC<LeadsPipelineProps> = ({ currentUser }) => {
    const { toast } = useToast();

    // Data
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // View
    const [viewMode, setViewMode] = useState<ViewMode>('kanban');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSetter, setFilterSetter] = useState('');
    const [filterCloser, setFilterCloser] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Partial<Lead> | null>(null);

    const fetchLeads = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await leadsService.getLeads();
            setLeads(data);
        } catch (err) {
            console.error(err);
            toast.error('Error al cargar leads');
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Filtered leads
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            // Search
            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                const match = [lead.firstName, lead.surname, lead.email, lead.phone, lead.instagram_user]
                    .filter(Boolean).some(f => f!.toLowerCase().includes(q));
                if (!match) return false;
            }
            // Setter
            if (filterSetter && (lead.assigned_to_name || '') !== filterSetter) return false;
            // Closer
            if (filterCloser && (lead.closer_id || '') !== filterCloser) return false;
            // Status
            if (filterStatus && lead.status !== filterStatus) return false;
            return true;
        });
    }, [leads, searchTerm, filterSetter, filterCloser, filterStatus]);

    // Metrics
    const metrics = useMemo(() => leadsService.getMetrics(filteredLeads), [filteredLeads]);

    // Leads grouped by kanban column
    const leadsByColumn = useMemo(() => {
        const map: Record<string, Lead[]> = {};
        for (const col of KANBAN_COLUMNS) map[col.id] = [];
        for (const lead of filteredLeads) {
            const colId = KANBAN_COLUMNS.find(c => c.id === lead.status)?.id;
            if (colId) {
                map[colId].push(lead);
            } else {
                // If status isn't in the 5 kanban columns, put in nearest match
                if (['RE-SCHEDULED', 'NO_SHOW'].includes(lead.status)) map['SCHEDULED']?.push(lead);
                else if (['CANCELLED', 'NO_ENTRY'].includes(lead.status)) map['LOST']?.push(lead);
                else map['NEW']?.push(lead);
            }
        }
        return map;
    }, [filteredLeads]);

    const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
        try {
            await leadsService.updateLeadStatus(leadId, newStatus);
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
            toast.success('Estado actualizado');
        } catch (err) {
            toast.error('Error al actualizar estado');
        }
    };

    const handleToggleAttended = async (leadId: string, value: boolean) => {
        try {
            await leadsService.updateLead(leadId, { attended: value });
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, attended: value } : l));
        } catch (err) {
            toast.error('Error al actualizar');
        }
    };

    const openModal = (lead: Partial<Lead> | null) => {
        setSelectedLead(lead);
        setIsModalOpen(true);
    };

    const hasFilters = searchTerm || filterSetter || filterCloser || filterStatus;

    const clearFilters = () => {
        setSearchTerm('');
        setFilterSetter('');
        setFilterCloser('');
        setFilterStatus('');
    };

    return (
        <div className="h-full flex flex-col">

            {/* HEADER */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-black text-slate-800">Leads Pipeline</h1>
                        <p className="text-xs text-slate-500">Gestiona tus prospectos desde la entrada hasta la venta.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchLeads}
                            className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors" title="Refrescar">
                            <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => openModal(null)}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                            <Plus className="w-4 h-4" /> Nuevo Lead
                        </button>
                    </div>
                </div>

                {/* View Toggle + Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Toggle */}
                    <div className="flex bg-slate-100 rounded-xl p-1">
                        <button onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <LayoutGrid className="w-3.5 h-3.5" /> Kanban
                        </button>
                        <button onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <List className="w-3.5 h-3.5" /> Tabla
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar leads..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none transition-all border border-transparent focus:border-blue-200"
                        />
                    </div>

                    {/* Filter dropdowns */}
                    <select value={filterSetter} onChange={e => setFilterSetter(e.target.value)}
                        className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none border border-transparent focus:border-blue-200 appearance-none">
                        <option value="">Setter</option>
                        {DEFAULT_SETTERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <select value={filterCloser} onChange={e => setFilterCloser(e.target.value)}
                        className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none border border-transparent focus:border-blue-200 appearance-none">
                        <option value="">Closer</option>
                        {DEFAULT_CLOSERS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none border border-transparent focus:border-blue-200 appearance-none">
                        <option value="">Estado</option>
                        {LEAD_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>

                    {hasFilters && (
                        <button onClick={clearFilters}
                            className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors" title="Limpiar filtros">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* METRICS ROW */}
                <div className="grid grid-cols-6 gap-3 mt-4">
                    <MetricCard icon={<Users className="w-4 h-4" />} label="Total" value={metrics.total} color="blue" />
                    <MetricCard icon={<Calendar className="w-4 h-4" />} label="Agendados" value={metrics.byStatus['SCHEDULED'] || 0} color="purple" />
                    <MetricCard icon={<CheckCircle className="w-4 h-4" />} label="Presentados" value={metrics.presentados} color="amber" />
                    <MetricCard icon={<Target className="w-4 h-4" />} label="Cierres" value={metrics.cierres} color="green" />
                    <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Show Rate" value={`${metrics.showRate}%`} color="cyan" />
                    <MetricCard icon={<BarChart3 className="w-4 h-4" />} label="Close Rate" value={`${metrics.closeRate}%`} color="emerald" />
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-auto p-6">
                {viewMode === 'kanban' ? (
                    /* KANBAN VIEW */
                    <div className="flex gap-4 h-full min-h-0">
                        {KANBAN_COLUMNS.map(col => {
                            const colLeads = leadsByColumn[col.id] || [];
                            return (
                                <div key={col.id} className={`flex-shrink-0 w-80 flex flex-col bg-slate-50/50 rounded-xl border border-slate-200/60 ${col.borderColor} border-t-2`}>
                                    {/* Column header */}
                                    <div className="px-4 py-3 flex items-center justify-between">
                                        <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">{col.label}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.bgColor} text-slate-600`}>
                                            {colLeads.length}
                                        </span>
                                    </div>
                                    {/* Column body */}
                                    <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 custom-scrollbar">
                                        {colLeads.length === 0 ? (
                                            <div className="text-center py-8 text-slate-300">
                                                <p className="text-xs font-medium">Sin leads</p>
                                            </div>
                                        ) : (
                                            colLeads.map(lead => (
                                                <LeadCard
                                                    key={lead.id}
                                                    lead={lead}
                                                    onClick={openModal}
                                                    onStatusChange={handleStatusChange}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* TABLE VIEW */
                    <LeadsTableView
                        leads={filteredLeads}
                        onLeadClick={openModal}
                        onStatusChange={handleStatusChange}
                        onToggleAttended={handleToggleAttended}
                        isLoading={isLoading}
                    />
                )}
            </div>

            {/* MODAL */}
            <LeadDetailModal
                lead={selectedLead}
                currentUser={currentUser}
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedLead(null); }}
                onSave={fetchLeads}
            />
        </div>
    );
};

/* Metric Card */
const METRIC_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' },
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-500' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: 'text-cyan-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
};

const MetricCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) => {
    const c = METRIC_COLORS[color] || METRIC_COLORS.blue;
    return (
        <div className={`${c.bg} rounded-xl px-3 py-2.5 flex items-center gap-2.5`}>
            <div className={c.icon}>{icon}</div>
            <div>
                <p className={`text-lg font-black ${c.text} leading-tight`}>{value}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
            </div>
        </div>
    );
};

export default LeadsPipeline;
