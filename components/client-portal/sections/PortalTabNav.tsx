import React from 'react';
import { Home, TrendingUp, BookOpen, User } from 'lucide-react';

export type PortalTab = 'hoy' | 'progreso' | 'recursos' | 'perfil';

interface PortalTabNavProps {
    activeTab: PortalTab;
    setActiveTab: (tab: PortalTab) => void;
}

const tabs: { id: PortalTab; label: string; icon: typeof Home }[] = [
    { id: 'hoy', label: 'Hoy', icon: Home },
    { id: 'progreso', label: 'Progreso', icon: TrendingUp },
    { id: 'recursos', label: 'Recursos', icon: BookOpen },
    { id: 'perfil', label: 'Perfil', icon: User },
];

export function PortalTabNav({ activeTab, setActiveTab }: PortalTabNavProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass border-t border-sea-100/50 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
                {tabs.map(({ id, label, icon: Icon }) => {
                    const isActive = activeTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                                isActive ? 'text-accent-500' : 'text-sea-400 hover:text-sea-600'
                            }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                            <span className={`text-[10px] font-bold ${isActive ? 'text-accent-600' : ''}`}>{label}</span>
                            {isActive && (
                                <div className="absolute bottom-0 w-8 h-0.5 bg-accent-500 rounded-full"></div>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
