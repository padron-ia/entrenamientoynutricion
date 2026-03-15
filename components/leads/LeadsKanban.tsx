import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus } from '../../types';
import { leadsService } from '../../services/leadsService';
import LeadCard from './LeadCard';
import LeadDetailModal from './LeadDetailModal';
import { Plus, Search, Filter, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '../ToastProvider';
import { User as UserType } from '../../types';

const COLUMNS: { id: LeadStatus, label: string, color: string }[] = [
    { id: 'NEW', label: 'Entrantes', color: 'border-t-blue-500' },
    { id: 'CONTACTED', label: 'Contactados', color: 'border-t-amber-500' },
    { id: 'SCHEDULED', label: 'Agendados', color: 'border-t-purple-500' },
    { id: 'WON', label: 'Ganados', color: 'border-t-green-500' },
    { id: 'LOST', label: 'Descartados', color: 'border-t-gray-400' }
];

interface LeadsKanbanProps {
    currentUser: UserType;
}

const LeadsKanban: React.FC<LeadsKanbanProps> = ({ currentUser }) => {
    const { toast } = useToast();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Partial<Lead> | null>(null);

    const fetchLeads = async () => {
        setIsLoading(true);
        try {
            const data = await leadsService.getLeads();
            setLeads(data);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar leads');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const handleOpenNew = () => {
        setSelectedLead(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (lead: Lead) => {
        setSelectedLead(lead);
        setIsModalOpen(true);
    };

    // Filter Logic
    const filteredLeads = leads.filter(l => {
        const searchLower = searchTerm.toLowerCase();
        return (
            l.firstName.toLowerCase().includes(searchLower) ||
            l.surname.toLowerCase().includes(searchLower) ||
            l.email?.toLowerCase().includes(searchLower) ||
            l.phone?.includes(searchLower) ||
            l.instagram_user?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* TOOLBAR */}
            <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200 sticky top-0 z-10">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Leads Pipeline</h1>
                    <p className="text-slate-500 text-sm">Gestiona tus prospectos desde la entrada hasta la venta.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none w-64"
                            placeholder="Buscar leads..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={fetchLeads}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Recargar"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleOpenNew}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> Nuevo Lead
                    </button>
                </div>
            </div>

            {/* KANBAN BOARD */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                <div className="flex gap-6 h-full min-w-max pb-4">
                    {/* Columns */}
                    {COLUMNS.map(col => {
                        const colLeads = filteredLeads.filter(l => l.status === col.id);
                        return (
                            <div key={col.id} className="w-80 flex flex-col h-full">
                                <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${col.color}`}>
                                    <h3 className="font-bold text-slate-700">{col.label}</h3>
                                    <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {colLeads.length}
                                    </span>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                                    {colLeads.map(lead => (
                                        <LeadCard
                                            key={lead.id}
                                            lead={lead}
                                            onClick={handleOpenEdit}
                                        />
                                    ))}
                                    {colLeads.length === 0 && (
                                        <div className="text-center py-8 text-slate-400 italic text-sm border border-dashed border-slate-200 rounded-lg">
                                            Sin leads
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MODAL */}
            <LeadDetailModal
                lead={selectedLead}
                currentUser={currentUser}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchLeads}
            />
        </div>
    );
};

export default LeadsKanban;
