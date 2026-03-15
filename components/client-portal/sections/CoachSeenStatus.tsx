import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { Eye, CheckCircle2, Clock, Scale, FileText } from 'lucide-react';

interface CoachSeenStatusProps {
    clientId: string;
    coachName?: string;
}

interface SeenData {
    lastCheckinReviewed: string | null;
    lastCheckinSubmitted: string | null;
    checkinStatus: 'reviewed' | 'pending' | 'none';
    lastWeightCoachSaw: string | null;
    lastCoachReview: string | null;
}

function timeAgo(date: string): string {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'hace unos minutos';
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays === 1) return 'ayer';
    if (diffDays < 7) return `hace ${diffDays} dias`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function CoachSeenStatus({ clientId, coachName }: CoachSeenStatusProps) {
    const [data, setData] = useState<SeenData | null>(null);

    useEffect(() => {
        loadData();
    }, [clientId]);

    async function loadData() {
        try {
            const [checkin, coachReview] = await Promise.all([
                supabase.from('weekly_checkins').select('created_at, status')
                    .eq('client_id', clientId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                supabase.from('weekly_coach_review').select('created_at')
                    .eq('client_id', clientId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
            ]);

            const lastCheckin = checkin.data;
            setData({
                lastCheckinReviewed: lastCheckin?.status === 'reviewed' ? lastCheckin.created_at : null,
                lastCheckinSubmitted: lastCheckin?.created_at || null,
                checkinStatus: lastCheckin ? lastCheckin.status : 'none',
                lastWeightCoachSaw: null,
                lastCoachReview: coachReview.data?.created_at || null,
            });
        } catch (err) {
            console.error('CoachSeenStatus error:', err);
        }
    }

    if (!data) return null;

    const items: { icon: React.FC<any>; label: string; status: 'seen' | 'pending' | 'none'; detail: string; color: string }[] = [];

    if (data.checkinStatus === 'reviewed') {
        items.push({
            icon: CheckCircle2,
            label: 'Check-in revisado',
            status: 'seen',
            detail: data.lastCheckinReviewed ? timeAgo(data.lastCheckinReviewed) : '',
            color: 'text-accent-500',
        });
    } else if (data.checkinStatus === 'pending') {
        items.push({
            icon: Clock,
            label: 'Check-in pendiente de revision',
            status: 'pending',
            detail: 'Tu coach lo revisara pronto',
            color: 'text-amber-500',
        });
    }

    if (data.lastCoachReview) {
        items.push({
            icon: Eye,
            label: 'Ultima evaluacion semanal',
            status: 'seen',
            detail: timeAgo(data.lastCoachReview),
            color: 'text-sea-500',
        });
    }

    if (items.length === 0) return null;

    return (
        <div className="glass rounded-3xl p-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
                <Eye className="w-3.5 h-3.5 text-sea-400" />
                <p className="text-[10px] text-sea-400 font-bold uppercase tracking-wider">
                    {coachName ? `${coachName} esta al tanto` : 'Tu coach esta al tanto'}
                </p>
            </div>
            <div className="space-y-2">
                {items.map((item, i) => {
                    const Icon = item.icon;
                    return (
                        <div key={i} className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-sea-800">{item.label}</p>
                                <p className="text-xs text-sea-400">{item.detail}</p>
                            </div>
                            {item.status === 'seen' && (
                                <div className="flex gap-0.5">
                                    <div className="w-3.5 h-3.5 text-blue-500">
                                        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 8l4 4L13 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </div>
                                    <div className="w-3.5 h-3.5 text-blue-500 -ml-2">
                                        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 8l4 4L13 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </div>
                                </div>
                            )}
                            {item.status === 'pending' && (
                                <div className="w-3.5 h-3.5 text-slate-300">
                                    <svg viewBox="0 0 16 16"><path d="M1 8l4 4L13 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
