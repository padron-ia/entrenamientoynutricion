import React, { useState, useEffect } from 'react';
import {
    Table,
    Search,
    Filter,
    User as UserIcon,
    Apple,
    History,
    AlertCircle,
    MoreVertical,
    ExternalLink,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    LayoutGrid
} from 'lucide-react';
import { User, Client, NutritionPlan } from '../types';
import { clientService } from '../services/mockSupabase';
import { nutritionService } from '../services/nutritionService';

import { AssignmentsBoard } from './nutrition/AssignmentsBoard';

interface NutritionAssignmentsProps {
    user: User;
}

export function NutritionAssignments({ user }: NutritionAssignmentsProps) {
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<Client[]>([]);
    const [plans, setPlans] = useState<NutritionPlan[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [clientsData, plansData] = await Promise.all([
                    clientService.getClients(),
                    nutritionService.getPlans()
                ]);
                setClients(clientsData.filter(c => c.status === 'active'));
                setPlans(plansData);
            } catch (err: any) {
                console.error('Error fetching assignments data:', err);
                setError('Error al cargar la tabla de control');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getPlanName = (planId?: string) => {
        if (!planId) return 'Sin asignar';
        return plans.find(p => p.id === planId)?.name || 'Plan no encontrado';
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Table className="w-5 h-5 text-indigo-600" />
                        Control Total de Nutrición
                    </h2>
                    <p className="text-sm text-slate-500">Vista maestra de todos los clientes activos y sus planes</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm font-medium' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista Lista"
                        >
                            <Table className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-white text-indigo-600 shadow-sm font-medium' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista Tablero"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>

                    {viewMode === 'list' && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                    )}
                    {/* Filter button reserved for future advanced filters */}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-medium">Cargando tabla de asignaciones...</p>
                </div>
            ) : viewMode === 'list' ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Actual</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Coach</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Restricciones</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredClients.map(client => (
                                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                    {client.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{client.name}</p>
                                                    <p className="text-[11px] text-slate-400">{client.email || 'Sin correo'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Apple className={`w-3.5 h-3.5 ${client.nutrition_plan_id ? 'text-emerald-500' : 'text-slate-300'}`} />
                                                <span className={`text-sm font-medium ${client.nutrition_plan_id ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                                                    {getPlanName(client.nutrition_plan_id)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-sm text-slate-600">{client.property_coach || 'Sin asignar'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-[200px] truncate">
                                                {(client.nutrition?.allergies || client.general_notes) ? (
                                                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                                        {client.nutrition?.allergies || client.general_notes}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Ver Historial">
                                                    <History className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Ver Detalle">
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredClients.length === 0 && (
                        <div className="p-12 text-center text-slate-500 italic">
                            No se encontraron clientes que coincidan con la búsqueda.
                        </div>
                    )}
                </div>
            ) : (
                <AssignmentsBoard
                    clients={clients} // Pass all clients, filtering is internal to Board for robustness or we filter here
                    plans={plans}
                    onManagePlan={(plan) => console.log('Manage plan', plan)}
                />
            )}
        </div>
    );
}
