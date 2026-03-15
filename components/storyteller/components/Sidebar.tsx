import React from 'react';
import { LayoutGrid, Plus, CreditCard, Zap, User } from 'lucide-react';
import { User as CRMUser, UserRole } from '../../../types';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: any) => void;
    currentUser?: CRMUser;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentUser }) => {
    const canCreate = currentUser?.role === UserRole.COACH ||
        currentUser?.role === UserRole.HEAD_COACH ||
        currentUser?.role === UserRole.ADMIN;

    const menuItems = [
        { id: 'dashboard', icon: <LayoutGrid className="w-5 h-5" />, label: 'Casos de Éxito' },
        ...(canCreate ? [{ id: 'new-case', icon: <Plus className="w-5 h-5" />, label: 'Nuevo Caso' }] : []),
        { id: 'pricing', icon: <CreditCard className="w-5 h-5" />, label: 'Suscripción' },
    ];

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-6 space-y-8 sticky top-0 h-screen text-slate-300">
            <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
                    <Zap className="text-white w-5 h-5" />
                </div>
                <h1 className="text-lg font-bold leading-tight text-white">Storyteller AI</h1>
            </div>

            <nav className="flex-1 space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                            }`}
                    >
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="pt-8 border-t border-slate-800">
                <div className="flex items-center space-x-3 p-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold truncate text-white">Coach Health</p>
                        <p className="text-xs text-blue-400">Pro Active</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
