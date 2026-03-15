import React from 'react';
import { Lead } from '../../types';
import { Calendar, MessageCircle, Phone, Smartphone, User } from 'lucide-react';

interface LeadCardProps {
    lead: Lead;
    onClick: (lead: Lead) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick }) => {

    const getSourceColor = (source: string) => {
        const s = source.toLowerCase();
        if (s.includes('ads')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (s.includes('instagram')) return 'bg-pink-100 text-pink-700 border-pink-200';
        if (s.includes('referido')) return 'bg-purple-100 text-purple-700 border-purple-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const daysSinceCreation = Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 3600 * 24));

    return (
        <div
            onClick={() => onClick(lead)}
            className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getSourceColor(lead.source)}`}>
                    {lead.source}
                </span>
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {daysSinceCreation === 0 ? 'Hoy' : `${daysSinceCreation}d`}
                </span>
            </div>

            {lead.status && !['NEW', 'CONTACTED', 'SCHEDULED', 'WON', 'LOST'].includes(lead.status) && (
                <div className="mb-2">
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black border border-slate-200 uppercase">
                        {lead.status.replace('_', ' ')}
                    </span>
                </div>
            )}

            {(lead.assigned_to_name || lead.closer_id) && (
                <div className="flex gap-2 mb-2">
                    {lead.assigned_to_name && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500">
                            <User className="w-2.5 h-2.5" /> {lead.assigned_to_name}
                        </div>
                    )}
                    {lead.closer_id && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded text-[9px] font-bold text-blue-600 border border-blue-100">
                            C: {lead.closer_id}
                        </div>
                    )}
                </div>
            )}

            <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">
                {lead.firstName} {lead.surname}
            </h4>

            {lead.meeting_date && (
                <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold mt-1">
                    <Calendar className="w-3 h-3" /> Agenda: {new Date(lead.meeting_date).toLocaleDateString()}
                    {lead.meeting_time && <span> ({lead.meeting_time})</span>}
                </div>
            )}

            <div className="flex gap-2 mt-3">
                {lead.phone && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://wa.me/${lead.phone.replace(/\+/g, '').replace(/\s/g, '')}`, '_blank');
                        }}
                        className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors"
                        title="Abrir WhatsApp"
                    >
                        <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                )}
                {lead.instagram_user && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://instagram.com/${lead.instagram_user.replace('@', '')}`, '_blank');
                        }}
                        className="p-1.5 bg-pink-50 text-pink-600 rounded-md hover:bg-pink-100 transition-colors"
                        title="Ver Instagram"
                    >
                        <Smartphone className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {(lead.last_contact_date || lead.call_date) && (
                <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-50 pt-1 italic">
                    {lead.call_date ? `Llamada: ${new Date(lead.call_date).toLocaleDateString()}` : `Último contacto: ${new Date(lead.last_contact_date!).toLocaleDateString()}`}
                </p>
            )}
        </div>
    );
};

export default LeadCard;
