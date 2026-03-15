import React, { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Filter,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Apple,
    Clock,
    User as UserIcon,
    Copy,
    ArrowRight,
    Sparkles,
    Scale,
    Utensils
} from 'lucide-react';
import { User, NutritionPlan, Client, DietType } from '../types';
import { nutritionService } from '../services/nutritionService';
import { clientService } from '../services/mockSupabase';
import { ClientNutritionSelector } from './nutrition/ClientNutritionSelector';
import { X } from 'lucide-react';

interface NewClientNutritionProps {
    user: User;
}

export function NewClientNutrition({ user }: NewClientNutritionProps) {
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<Client[]>([]);
    const [plans, setPlans] = useState<NutritionPlan[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Clone & Assign State
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedClientForManual, setSelectedClientForManual] = useState<Client | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch clients who are active but don't have a plan assigned
                const allClients = await clientService.getClients();
                const pendingClients = allClients.filter(c =>
                    c.status === 'active' && (!c.nutrition_plan_id)
                );
                setClients(pendingClients);

                // Fetch published plans for suggestions
                const allPlans = await nutritionService.getPlans({ status: 'published' });
                setPlans(allPlans);
            } catch (err: any) {
                console.error('Error fetching triage data:', err);
                setError('Error al cargar datos de triaje');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCloneAndAssign = async (client: Client, plan: NutritionPlan) => {
        if (!confirm(`¿Estás seguro de crear una copia personalizada del plan "${plan.name}" para ${client.name}?`)) return;

        setProcessingId(client.id);
        try {
            // 1. Clone the plan
            const newPlan = await nutritionService.clonePlan(plan.id, user.id);

            // 2. Rename it specifically for the client
            const personalizedName = `Plan ${plan.diet_type || 'Nutricional'} - ${client.name}`;
            await nutritionService.updatePlan(newPlan.id, { name: personalizedName });

            // 3. Assign the new plan to the client
            await nutritionService.assignPlanToClient(client.id, newPlan.id, user.id);

            // 4. Update UI: remove client from list
            setClients(prev => prev.filter(c => c.id !== client.id));

            alert(`Plan asignado correctamente: ${personalizedName}`);
        } catch (err) {
            console.error('Error in clone & assign:', err);
            alert('Hubo un error al asignar el plan. Por favor inténtalo de nuevo.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleAssignDirectly = async (client: Client, plan: NutritionPlan) => {
        if (!confirm(`¿Asignar el plan "${plan.name}" directamente a ${client.name} sin crear copia?`)) return;

        setProcessingId(client.id);
        try {
            await nutritionService.assignPlanToClient(client.id, plan.id, user.id);
            setClients(prev => prev.filter(c => c.id !== client.id));
            alert(`Plan "${plan.name}" asignado correctamente.`);
        } catch (err) {
            console.error('Error in direct assign:', err);
            alert('Hubo un error al asignar el plan.');
        } finally {
            setProcessingId(null);
        }
    };

    const getSmartSuggestions = (client: Client): { plan: NutritionPlan, reason: string, score: number }[] => {
        return plans.map(plan => {
            let score = 0;
            let reasons: string[] = [];

            // 1. Match Calories
            if (client.nutrition?.assigned_calories && plan.target_calories) {
                const diff = Math.abs(client.nutrition.assigned_calories - plan.target_calories);
                if (diff === 0) {
                    score += 50;
                    reasons.push(`Calorías exactas (${plan.target_calories})`);
                } else if (diff <= 200) {
                    score += 30;
                    reasons.push(`Calorías cercanas (${plan.target_calories})`);
                }
            }

            // 2. Match Diet Type
            if (client.nutrition?.assigned_nutrition_type && plan.diet_type) {
                if (client.nutrition.assigned_nutrition_type.toLowerCase() === plan.diet_type.toLowerCase()) {
                    score += 40;
                    reasons.push(`Tipo de dieta: ${plan.diet_type}`);
                }
            }

            // 3. Text Matching in Preferences (Fallback)
            const preferences = (client.nutrition?.preferences || '').toLowerCase();
            const notes = (client.general_notes || '').toLowerCase();
            const planTags = (plan.tags || []).join(' ').toLowerCase();

            if (preferences.includes('vegetariano') && plan.diet_type === 'Vegetariano') score += 20;
            if (preferences.includes('keto') && planTags.includes('keto')) {
                score += 20;
                reasons.push('Coincidencia en preferencias (Keto)');
            }

            return { plan, reason: reasons.join(' • '), score };
        })
            .filter(match => match.score > 0) // Only keep relevant matches
            .sort((a, b) => b.score - a.score) // Sort best first
            .slice(0, 3); // Top 3
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
                        <Users className="w-5 h-5 text-blue-600" />
                        Nuevos Clientes (Triaje)
                    </h2>
                    <p className="text-sm text-slate-500">Clientes activos pendientes de asignación de plan</p>
                </div>

                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500">Analizando base de clientes...</p>
                </div>
            ) : error ? (
                <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-700 font-medium">{error}</p>
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="p-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
                    <p className="text-slate-600 font-medium">No hay clientes pendientes de asignación</p>
                    <p className="text-sm text-slate-500 mt-1">¡Buen trabajo! Todo está al día.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredClients.map(client => {
                        const suggestions = getSmartSuggestions(client);
                        const hasSuggestions = suggestions.length > 0;
                        const hasMedicalIssues = client.nutrition?.allergies || client.medical?.pathologies || client.medical?.diabetesType;

                        return (
                            <div key={client.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 transition-all shadow-sm hover:shadow-md group relative overflow-hidden">
                                {processingId === client.id && (
                                    <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center backdrop-blur-sm">
                                        <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-xl shadow-lg border border-slate-100">
                                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="font-medium text-slate-700">Creando copia personalizada...</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col lg:flex-row gap-6">
                                    {/* Client Profile Section */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 font-bold text-xl flex-shrink-0 border-2 border-white shadow-sm">
                                                {client.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                                    {client.name}
                                                    {hasMedicalIssues && (
                                                        <AlertTriangle className="w-4 h-4 text-amber-500" title="Información médica importante" />
                                                    )}
                                                </h3>

                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
                                                    {client.nutrition?.assigned_calories && (
                                                        <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-md">
                                                            <Scale className="w-4 h-4 text-blue-500" />
                                                            <span className="font-medium">{client.nutrition.assigned_calories} kcal</span>
                                                        </div>
                                                    )}
                                                    {client.nutrition?.assigned_nutrition_type && (
                                                        <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-md">
                                                            <Utensils className="w-4 h-4 text-emerald-500" />
                                                            <span className="font-medium">{client.nutrition.assigned_nutrition_type}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {(client.nutrition?.allergies || client.medical?.pathologies) && (
                                                    <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                                                        <div className="flex items-start gap-2">
                                                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                                            <div className="text-xs text-amber-800">
                                                                {client.nutrition?.allergies && <p className="font-medium">⚠️ Alergias: {client.nutrition.allergies}</p>}
                                                                {client.medical?.pathologies && <p>Patologías: {client.medical.pathologies}</p>}
                                                                {client.medical?.diabetesType && <p>Diabetes: {client.medical.diabetesType}</p>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Section */}
                                    <div className="lg:w-96 flex-shrink-0 flex flex-col gap-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                                Sugerencias de Plan
                                            </p>
                                        </div>

                                        {hasSuggestions ? (
                                            <div className="space-y-2">
                                                {suggestions.map(({ plan, reason }) => (
                                                    <div key={plan.id} className="group/plan relative">
                                                        <div className="flex items-start justify-between p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all">
                                                            <div className="min-w-0 pr-2">
                                                                <p className="text-sm font-bold text-slate-700 truncate">{plan.name}</p>
                                                                <p className="text-xs text-indigo-600 font-medium mt-0.5">{reason}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleAssignDirectly(client, plan)}
                                                                    className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                                    title="Asignar este plan directamente"
                                                                >
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    Asignar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCloneAndAssign(client, plan)}
                                                                    className="flex items-center gap-1 bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                                    title="Crear copia personalizada"
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                    Clonar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                <p className="text-xs text-slate-400 italic">No hay coincidencias exactas encontradas</p>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setSelectedClientForManual(client)}
                                            className="w-full mt-auto py-2.5 bg-white border-2 border-slate-200 hover:border-slate-400 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <Search className="w-3.5 h-3.5" />
                                            Buscar otro plan manualmente
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Manual Assignment Modal */}
            {selectedClientForManual && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Utensils className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Asignar Plan Manual</h3>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                        Cliente: {selectedClientForManual.name}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedClientForManual(null)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <ClientNutritionSelector
                                clientId={selectedClientForManual.id}
                                currentUser={user}
                                suggestedCalories={selectedClientForManual.nutrition?.assigned_calories}
                                suggestedType={selectedClientForManual.nutrition?.assigned_nutrition_type}
                                onPlanAssigned={() => {
                                    setClients(prev => prev.filter(c => c.id !== selectedClientForManual.id));
                                    setSelectedClientForManual(null);
                                    alert('Plan asignado correctamente');
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
