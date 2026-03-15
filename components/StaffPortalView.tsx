import React, { useState } from 'react';
import { CoachTasksDashboard } from './CoachTasksDashboard';
import { StaffMetricsDashboard } from './StaffMetricsDashboard';
import { User as UserType, Client, UserRole } from '../types';
import { ListTodo, TrendingUp, LayoutDashboard } from 'lucide-react';

interface StaffAreaViewProps {
    user: UserType;
    clients: Client[];
}

export function StaffPortalView({ user, clients }: StaffAreaViewProps) {
    const [activeTab, setActiveTab] = useState<'tasks' | 'metrics'>('tasks');

    const getTitle = () => {
        switch (user.role) {
            case UserRole.COACH:
            case UserRole.HEAD_COACH:
                return 'Área del Coach';
            case UserRole.CLOSER:
                return 'Área del Closer';
            case UserRole.ENDOCRINO:
                return 'Área de Endocrinología';
            case UserRole.PSICOLOGO:
                return 'Área de Psicología';
            case UserRole.CONTABILIDAD:
                return 'Área de Contabilidad';
            default:
                return 'Mi Área de Trabajo';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                        <LayoutDashboard className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">{getTitle()}</h1>
                        <p className="text-slate-500 font-medium">Gestión de tareas, métricas y facturación personalizada</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'tasks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ListTodo className="w-4 h-4" />
                        Mis Tareas
                    </button>
                    <button
                        onClick={() => setActiveTab('metrics')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'metrics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Rendimiento & Facturas
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'tasks' ? (
                    <div className="h-[calc(100vh-280px)]">
                        <CoachTasksDashboard user={user} />
                    </div>
                ) : (
                    <StaffMetricsDashboard user={user} clients={clients} />
                )}
            </div>
        </div>
    );
}
