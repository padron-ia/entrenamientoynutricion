import React from 'react';
import { Lead, LeadStatus } from '../../types';
import { Calendar, MessageCircle, Phone, Smartphone, User, Target } from 'lucide-react';
import {
    getStatusOption, getSetterColor, getCloserColor, getSourceColor,
    getDaysAgo, getDaysAgoColor, LEAD_STATUS_OPTIONS
} from './leadsConstants';

interface LeadCardProps {
    lead: Lead;
    onClick: (lead: Lead) => void;
    onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick, onStatusChange }) => {
    const days = getDaysAgo(lead.created_at);
    const daysColor = getDaysAgoColor(days);
    const statusOpt = getStatusOption(lead.status);
    const sourceColor = getSourceColor(lead.source);

    return (
        <div
            onClick={() => onClick(lead)}
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
        >
            {/* Row 1: Name + Days */}
            <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusOpt.color}`} />
                    <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                        {lead.firstName} {lead.surname}
                    </h4>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${daysColor}`}>
                    {days === 0 ? 'Hoy' : `${days}d`}
                </span>
            </div>

            {/* Row 2: Setter / Closer */}
            {(lead.assigned_to_name || lead.closer_id) && (
                <div className="flex gap-1.5 mb-2 flex-wrap">
                    {lead.assigned_to_name && (() => {
                        const sc = getSetterColor(lead.assigned_to_name);
                        return (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${sc.bg} ${sc.text}`}>
                                <User className="w-2.5 h-2.5" /> {lead.assigned_to_name}
                            </span>
                        );
                    })()}
                    {lead.closer_id && (() => {
                        const cc = getCloserColor(lead.closer_id);
                        return (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${cc.bg} ${cc.text}`}>
                                <Target className="w-2.5 h-2.5" /> {lead.closer_id}
                            </span>
                        );
                    })()}
                </div>
            )}

            {/* Row 3: Source + In/Out */}
            <div className="flex gap-1.5 mb-2 flex-wrap">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${sourceColor.bg} ${sourceColor.text}`}>
                    {lead.source}
                </span>
                {lead.in_out && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${lead.in_out === 'Inbound' ? 'bg-cyan-50 text-cyan-600' : 'bg-amber-50 text-amber-600'}`}>
                        {lead.in_out === 'Inbound' ? 'INB' : 'OUT'}
                    </span>
                )}
            </div>

            {/* Row 4: Meeting date */}
            {lead.meeting_date && (
                <div className="flex items-center gap-1 text-[10px] text-purple-600 font-bold mb-2 bg-purple-50 px-2 py-1 rounded-lg">
                    <Calendar className="w-3 h-3" />
                    {new Date(lead.meeting_date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    {lead.meeting_time && <span className="text-purple-500">({lead.meeting_time})</span>}
                </div>
            )}

            {/* Row 5: Actions + Quick Status */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <div className="flex gap-1.5">
                    {lead.phone && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://wa.me/${lead.phone!.replace(/\+/g, '').replace(/\s/g, '')}`, '_blank');
                            }}
                            className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                            title="WhatsApp"
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {lead.instagram_user && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://instagram.com/${lead.instagram_user!.replace('@', '')}`, '_blank');
                            }}
                            className="p-1.5 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors"
                            title="Instagram"
                        >
                            <Smartphone className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {lead.phone && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(`tel:${lead.phone}`, '_self');
                            }}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Llamar"
                        >
                            <Phone className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Quick status change */}
                <select
                    value={lead.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                        e.stopPropagation();
                        onStatusChange(lead.id, e.target.value as LeadStatus);
                    }}
                    className="text-[10px] font-bold px-1.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400 max-w-[90px]"
                >
                    {LEAD_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LeadCard;
