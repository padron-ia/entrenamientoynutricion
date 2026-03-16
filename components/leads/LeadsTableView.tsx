import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus } from '../../types';
import { MessageCircle, Phone, Pencil, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Inbox, Check, X as XIcon } from 'lucide-react';
import { getStatusOption, getSetterColor, getCloserColor, LEAD_STATUS_OPTIONS } from './leadsConstants';

interface LeadsTableViewProps {
    leads: Lead[];
    onLeadClick: (lead: Lead) => void;
    onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
    onToggleAttended: (leadId: string, value: boolean) => void;
    isLoading: boolean;
}

type SortField = 'name' | 'assigned_to_name' | 'closer_id' | 'meeting_date' | 'created_at';
type SortDir = 'asc' | 'desc';

const ITEMS_PER_PAGE = 30;

const LeadsTableView: React.FC<LeadsTableViewProps> = ({ leads, onLeadClick, onStatusChange, onToggleAttended, isLoading }) => {
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [currentPage, setCurrentPage] = useState(1);

    const sortedLeads = useMemo(() => {
        const sorted = [...leads].sort((a, b) => {
            let valA: string = '';
            let valB: string = '';
            switch (sortField) {
                case 'name':
                    valA = `${a.firstName} ${a.surname}`.toLowerCase();
                    valB = `${b.firstName} ${b.surname}`.toLowerCase();
                    break;
                case 'assigned_to_name':
                    valA = (a.assigned_to_name || '').toLowerCase();
                    valB = (b.assigned_to_name || '').toLowerCase();
                    break;
                case 'closer_id':
                    valA = (a.closer_id || '').toLowerCase();
                    valB = (b.closer_id || '').toLowerCase();
                    break;
                case 'meeting_date':
                    valA = a.meeting_date || '';
                    valB = b.meeting_date || '';
                    break;
                case 'created_at':
                    valA = a.created_at || '';
                    valB = b.created_at || '';
                    break;
            }
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [leads, sortField, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sortedLeads.length / ITEMS_PER_PAGE));
    const paginatedLeads = sortedLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
        setCurrentPage(1);
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ChevronDown className="w-3 h-3 text-slate-300" />;
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (leads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Inbox className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">No se encontraron leads</p>
            </div>
        );
    }

    return (
        <div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider cursor-pointer hover:text-blue-600" onClick={() => handleSort('name')}>
                                <div className="flex items-center gap-1">Nombre <SortIcon field="name" /></div>
                            </th>
                            <th className="text-left px-3 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider cursor-pointer hover:text-blue-600" onClick={() => handleSort('assigned_to_name')}>
                                <div className="flex items-center gap-1">Setter <SortIcon field="assigned_to_name" /></div>
                            </th>
                            <th className="text-left px-3 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider cursor-pointer hover:text-blue-600" onClick={() => handleSort('closer_id')}>
                                <div className="flex items-center gap-1">Closer <SortIcon field="closer_id" /></div>
                            </th>
                            <th className="text-left px-3 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Estado</th>
                            <th className="text-left px-3 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider cursor-pointer hover:text-blue-600" onClick={() => handleSort('meeting_date')}>
                                <div className="flex items-center gap-1">Fecha <SortIcon field="meeting_date" /></div>
                            </th>
                            <th className="text-left px-3 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Procedencia</th>
                            <th className="text-center px-3 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Presentado</th>
                            <th className="text-center px-3 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedLeads.map(lead => {
                            const statusOpt = getStatusOption(lead.status);
                            const setterCol = lead.assigned_to_name ? getSetterColor(lead.assigned_to_name) : null;
                            const closerCol = lead.closer_id ? getCloserColor(lead.closer_id) : null;

                            return (
                                <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    {/* Name + phone */}
                                    <td className="px-4 py-3">
                                        <button onClick={() => onLeadClick(lead)} className="text-left hover:text-blue-600 transition-colors">
                                            <span className="font-bold text-slate-800 block">{lead.firstName} {lead.surname}</span>
                                            {lead.phone && <span className="text-[11px] text-slate-400">{lead.phone}</span>}
                                        </button>
                                    </td>
                                    {/* Setter */}
                                    <td className="px-3 py-3">
                                        {lead.assigned_to_name && setterCol ? (
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${setterCol.bg} ${setterCol.text}`}>{lead.assigned_to_name}</span>
                                        ) : <span className="text-slate-300 text-xs">—</span>}
                                    </td>
                                    {/* Closer */}
                                    <td className="px-3 py-3">
                                        {lead.closer_id && closerCol ? (
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${closerCol.bg} ${closerCol.text}`}>{lead.closer_id}</span>
                                        ) : <span className="text-slate-300 text-xs">—</span>}
                                    </td>
                                    {/* Status select */}
                                    <td className="px-3 py-3">
                                        <select
                                            value={lead.status}
                                            onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
                                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400 ${statusOpt.textColor}`}
                                        >
                                            {LEAD_STATUS_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    {/* Meeting date */}
                                    <td className="px-3 py-3">
                                        {lead.meeting_date ? (
                                            <div>
                                                <span className="text-xs font-medium text-slate-700">
                                                    {new Date(lead.meeting_date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                </span>
                                                {lead.meeting_time && <span className="text-[10px] text-slate-400 ml-1">({lead.meeting_time})</span>}
                                            </div>
                                        ) : <span className="text-slate-300 text-xs">—</span>}
                                    </td>
                                    {/* Procedencia */}
                                    <td className="px-3 py-3">
                                        {lead.procedencia ? (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{lead.procedencia}</span>
                                        ) : <span className="text-slate-300 text-xs">—</span>}
                                    </td>
                                    {/* Attended toggle */}
                                    <td className="px-3 py-3 text-center">
                                        <button
                                            onClick={() => onToggleAttended(lead.id, !lead.attended)}
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors mx-auto ${lead.attended ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                        >
                                            {lead.attended ? <Check className="w-4 h-4" /> : <XIcon className="w-3.5 h-3.5" />}
                                        </button>
                                    </td>
                                    {/* Actions */}
                                    <td className="px-3 py-3">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button onClick={() => onLeadClick(lead)}
                                                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Editar">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            {lead.phone && (
                                                <button
                                                    onClick={() => window.open(`https://wa.me/${lead.phone!.replace(/\+/g, '').replace(/\s/g, '')}`, '_blank')}
                                                    className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="WhatsApp">
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                    <span className="text-xs text-slate-500">
                        {sortedLeads.length} leads &middot; Página {currentPage} de {totalPages}
                    </span>
                    <div className="flex gap-1">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeadsTableView;
