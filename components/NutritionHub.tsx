import React, { useEffect, useState } from 'react';
import {
    Apple,
    Users,
    Library,
    LayoutGrid,
    TrendingUp,
    AlertCircle,
    BellDot
} from 'lucide-react';
import { User } from '../types';
import { NewClientNutrition } from './NewClientNutrition';
import { NutritionAssignments } from './NutritionAssignments';
import { NutritionManagement } from './NutritionManagement';
import { NutritionSpecialRequests } from './nutrition/NutritionSpecialRequests';
import { nutritionSpecialRequestsService } from '../services/nutritionSpecialRequestsService';

interface NutritionHubProps {
    user: User;
}

export function NutritionHub({ user }: NutritionHubProps) {
    const [activeTab, setActiveTab] = useState<'triage' | 'library' | 'control' | 'requests'>('triage');
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

    useEffect(() => {
        const loadPendingCount = async () => {
            try {
                const count = await nutritionSpecialRequestsService.getPendingCount();
                setPendingRequestsCount(count);
            } catch (err) {
                console.error('Error loading pending special requests count:', err);
            }
        };
        loadPendingCount();
    }, []);

    const tabs = [
        { id: 'triage', label: 'Nuevos Clientes', icon: Users, description: 'Triaje y asignación inicial' },
        { id: 'requests', label: 'Solicitudes Especiales', icon: BellDot, description: 'Solicitudes de plan especial' },
        { id: 'library', label: 'Biblioteca y Ocupación', icon: Library, description: 'Gestión de planes y ocupación' },
        { id: 'control', label: 'Control Total', icon: LayoutGrid, description: 'Tabla maestra de asignaciones' },
    ] as const;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 rounded-xl">
                            <Apple className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Centro de Nutrición</h1>
                    </div>
                    <p className="text-slate-500 font-medium">
                        Gestión centralizada de planes alimenticios y seguimiento de clientes.
                    </p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col gap-2 p-5 rounded-2xl border-2 transition-all duration-300 text-left group ${activeTab === tab.id
                                ? 'bg-blue-600 border-blue-600 shadow-xl shadow-blue-600/20'
                                : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50/30'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <tab.icon className={`w-6 h-6 transition-colors ${activeTab === tab.id ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'
                                }`} />
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                {tab.id === 'triage' ? 'Pendientes' : tab.id === 'requests' ? 'Alertas' : 'Activo'}
                            </div>
                        </div>
                        <div>
                            <p className={`font-bold transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'text-white' : 'text-slate-800'
                                }`}>
                                {tab.label}
                                {tab.id === 'requests' && pendingRequestsCount > 0 && (
                                    <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-black ${activeTab === tab.id ? 'bg-white text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                        {pendingRequestsCount}
                                    </span>
                                )}
                            </p>
                            <p className={`text-xs transition-colors ${activeTab === tab.id ? 'text-blue-100' : 'text-slate-400'
                                }`}>
                                {tab.description}
                            </p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-slate-50/50 rounded-3xl p-1 border border-slate-100">
                <div className="bg-white rounded-[22px] shadow-sm border border-slate-200/60 p-6 min-h-[500px]">
                    {activeTab === 'triage' && <NewClientNutrition user={user} />}
                    {activeTab === 'requests' && <NutritionSpecialRequests user={user} onPendingCountChange={setPendingRequestsCount} />}
                    {activeTab === 'library' && <NutritionManagement currentUser={user} />}
                    {activeTab === 'control' && <NutritionAssignments user={user} />}
                </div>
            </div>
        </div>
    );
}
