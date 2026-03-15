import React from 'react';
import { MessageCircle } from 'lucide-react';

interface CoachMessageProps {
    message: string;
    coachName?: string;
}

export function CoachMessage({ message, coachName }: CoachMessageProps) {
    if (!message) return null;

    return (
        <div className="glass rounded-3xl p-6 shadow-card relative overflow-hidden border border-sea-100">
            <div className="absolute top-4 right-4 opacity-10">
                <MessageCircle className="w-16 h-16 text-sea-500" />
            </div>
            <div className="flex items-start gap-4 relative z-10">
                <div className="bg-sea-50 p-3 rounded-2xl text-sea-500 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-xs text-sea-500 font-bold uppercase mb-2">Mensaje de tu Coach</p>
                    <p className="text-sea-800 font-medium leading-relaxed italic">
                        "{message}"
                    </p>
                    {coachName && (
                        <p className="text-sea-500 text-sm mt-3 font-bold">— {coachName}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
