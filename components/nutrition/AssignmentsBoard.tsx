import React, { useState } from 'react';
import {
    MoreVertical,
    Edit2,
    Users,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Search
} from 'lucide-react';
import { Client, NutritionPlan } from '../../types';

interface AssignmentsBoardProps {
    clients: Client[];
    plans: NutritionPlan[];
    onManagePlan: (plan: NutritionPlan) => void;
}

export function AssignmentsBoard({ clients, plans, onManagePlan }: AssignmentsBoardProps) {
    const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');

    const togglePlan = (planId: string) => {
        setExpandedPlans(prev => ({
            ...prev,
            [planId]: !prev[planId]
        }));
    };

    // Group clients by plan
    const clientsByPlan = clients.reduce((acc, client) => {
        const planId = client.nutrition_plan_id || 'unassigned';
        if (!acc[planId]) acc[planId] = [];
        acc[planId].push(client);
        return acc;
    }, {} as Record<string, Client[]>);

    // Calculate total stats
    const totalAssigned = clients.filter(c => c.nutrition_plan_id).length;
    const totalUnassigned = clients.length - totalAssigned;

    // Sort plans by number of clients (descending)
    const sortedPlans = [...plans].sort((a, b) => {
        const countA = clientsByPlan[a.id]?.length || 0;
        const countB = clientsByPlan[b.id]?.length || 0;
        return countB - countA;
    });

    const unassignedClients = clientsByPlan['unassigned'] || [];

    // Filter logic for client search within boards
    const filterClients = (clientList: Client[]) => {
        if (!searchTerm) return clientList;
        const lowerTerm = searchTerm.toLowerCase();
        return clientList.filter(c =>
            c.name.toLowerCase().includes(lowerTerm) ||
            c.email?.toLowerCase().includes(lowerTerm)
        );
    };

    return (
        <div className="space-y-6">
            {/* Search within board */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Filtrar clientes en el tablero..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 w-full"
                />
                <div className="text-sm text-slate-500 font-medium">
                    {clients.length} Clientes Totales
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                {/* 1. Unassigned Column (Special Case) */}
                {unassignedClients.length > 0 && (
                    <div className="bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 p-4 space-y-4 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-600 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Sin Plan Asignado
                            </h3>
                            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
                                {unassignedClients.length}
                            </span>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {filterClients(unassignedClients).map(client => (
                                <ClientCard key={client.id} client={client} />
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Plan Columns */}
                {sortedPlans.map(plan => {
                    const planClients = clientsByPlan[plan.id] || [];
                    const filteredPlanClients = filterClients(planClients);

                    if (planClients.length === 0 && !searchTerm) return null; // Hide empty plans if not searching
                    if (filteredPlanClients.length === 0 && searchTerm) return null; // Hide if no matches with search

                    return (
                        <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col max-h-[800px]">
                            {/* Header */}
                            <div className="p-4 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-bold text-slate-800 text-base leading-tight line-clamp-2" title={plan.name}>
                                        {plan.name}
                                    </h3>
                                    <button
                                        onClick={() => onManagePlan(plan)}
                                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <span className={`px-2 py-0.5 rounded-full font-medium ${plan.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {plan.diet_type || 'Flexible'}
                                        </span>
                                        <span>{plan.target_calories ? `${plan.target_calories} kcal` : ''}</span>
                                    </div>
                                    <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {planClients.length}
                                    </span>
                                </div>
                            </div>

                            {/* Clients List */}
                            <div className="p-3 space-y-2 overflow-y-auto custom-scrollbar flex-1">
                                {filteredPlanClients.map(client => (
                                    <ClientCard key={client.id} client={client} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ClientCard({ client }: { client: Client }) {
    const hasIssues = client.nutrition?.allergies || client.general_notes;

    return (
        <div className="bg-white border border-slate-100 hover:border-blue-300 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group cursor-pointer relative">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs ring-2 ring-white">
                    {client.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-700 truncate group-hover:text-blue-700">
                        {client.name}
                    </p>
                    {client.property_coach && (
                        <p className="text-[10px] text-slate-400 truncate">
                            Coach: {client.property_coach}
                        </p>
                    )}
                </div>

                {hasIssues && (
                    <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="Tiene restricciones/notas"></div>
                    </div>
                )}
            </div>

            {/* Quick Tags */}
            {hasIssues && (
                <div className="mt-2 pt-2 border-t border-slate-50">
                    <p className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded inline-block truncate max-w-full">
                        ⚠️ {client.nutrition?.allergies || 'Ver notas'}
                    </p>
                </div>
            )}
        </div>
    );
}
