import React, { useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { ClientAnnouncements } from '../../ClientAnnouncements';

interface PortalHeaderProps {
    clientId: string;
    coachId?: string;
    firstName: string;
    coachData: any;
}

const MOTIVATIONAL_MESSAGES = [
    'Cada paso cuenta, sigue asi',
    'Tu constancia marca la diferencia',
    'Hoy es un buen dia para cuidarte',
    'Tu esfuerzo tiene recompensa',
    'Un dia a la vez, vas genial',
    'Tu salud es tu mayor inversion',
    'Pequenos cambios, grandes resultados',
    'Confia en el proceso',
    'Lo estas haciendo increible',
    'Tu compromiso te define',
];

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos dias';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
}

function getGreetingEmoji(): string {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️';
    if (hour < 20) return '👋';
    return '🌙';
}

export function PortalHeader({ clientId, coachId, firstName, coachData }: PortalHeaderProps) {
    const greeting = getGreeting();
    const emoji = getGreetingEmoji();
    const motivational = useMemo(() => {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
        return MOTIVATIONAL_MESSAGES[dayOfYear % MOTIVATIONAL_MESSAGES.length];
    }, []);

    const [isDark, setIsDark] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('ado-dark-mode') === 'true';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) { root.classList.add('dark'); } else { root.classList.remove('dark'); }
        localStorage.setItem('ado-dark-mode', String(isDark));
    }, [isDark]);

    return (
        <header className="glass sticky top-0 z-40 border-b border-sea-100/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-xs font-black text-white shadow-lg shadow-emerald-500/20 hidden sm:grid">
                        PT
                    </div>
                    <div className="w-10 h-10 rounded-full bg-sea-900 text-white flex items-center justify-center font-bold text-lg shadow-lg shrink-0">
                        {firstName.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-sea-900 flex items-center gap-2">
                            {greeting}, {firstName} <span className="text-xl">{emoji}</span>
                        </h1>
                        <p className="text-xs text-sea-400 font-medium -mt-0.5">{motivational}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsDark((p: boolean) => !p)} className="w-9 h-9 rounded-full flex items-center justify-center bg-sea-50 border border-sea-100 text-sea-600 hover:bg-sea-100 transition-colors" title={isDark ? 'Modo claro' : 'Modo oscuro'}>
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                    <ClientAnnouncements clientId={clientId} coachId={coachId} />
                    {coachData && (
                        <div className="flex items-center gap-2 bg-sea-50 px-3 py-1.5 rounded-full border border-sea-100">
                            <img
                                src={coachData.photo_url || `https://ui-avatars.com/api/?name=${coachData.name}`}
                                alt="Coach"
                                className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="pr-1">
                                <p className="text-[10px] text-sea-400 font-medium leading-none">Tu Coach</p>
                                <p className="text-sm font-bold text-sea-700 leading-tight">{coachData.name}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
