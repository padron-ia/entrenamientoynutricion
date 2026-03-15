import React, { useState, useEffect } from 'react';
import {
    Zap,
    Check,
    ChevronRight,
    Search,
    AlertCircle,
    Clock,
    Flame,
    Tag,
    Eye,
    X,
    Calendar,
    Heart
} from 'lucide-react';
import { NutritionPlan, User, ClientNutritionAssignment } from '../../types';
import { nutritionService } from '../../services/nutritionService';
import { supabase } from '../../services/supabaseClient';
import { NutritionView } from '../client-portal/NutritionView';

interface ClientNutritionSelectorProps {
    clientId: string;
    currentUser: User;
    clientData?: any; // Recibe el objeto cliente completo para la vista previa
    onPlanAssigned?: (planId: string) => void;
    // Sugerencias basadas en el perfil actual
    suggestedCalories?: number;
    suggestedType?: string;
}

export function ClientNutritionSelector({
    clientId,
    currentUser,
    clientData,
    onPlanAssigned,
    suggestedCalories,
    suggestedType
}: ClientNutritionSelectorProps) {
    const [plans, setPlans] = useState<NutritionPlan[]>([]);
    const [currentAssignment, setCurrentAssignment] = useState<ClientNutritionAssignment | null>(null);
    const [autoPlan, setAutoPlan] = useState<NutritionPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewSubView, setPreviewSubView] = useState<'recipes' | 'planner' | 'shopping' | 'favorites'>('recipes');
    const [fullClientData, setFullClientData] = useState<any>(clientData);
    const [clientWeeklyPlan, setClientWeeklyPlan] = useState<Record<string, string | null>>({});
    const [clientFavorites, setClientFavorites] = useState<any[]>([]);
    const [loadingWeeklyPlan, setLoadingWeeklyPlan] = useState(false);
    const [weeklyPlanError, setWeeklyPlanError] = useState<string | null>(null);

    useEffect(() => {
        if (!clientData && clientId) {
            // Fetch minimal client data needed for visibility logic
            supabase.from('clients').select('*').eq('id', clientId).single()
                .then(({ data }) => setFullClientData(data));
        } else {
            setFullClientData(clientData);
        }
    }, [clientData, clientId]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Load plans first
                const allPlans = await nutritionService.getPlans({ status: 'published' });
                setPlans(allPlans);

                // Try to load current assignment
                const assignment = await nutritionService.getAssignmentByClient(clientId);
                setCurrentAssignment(assignment);

                // If no explicit assignment, look for an automatic plan
                if (!assignment) {
                    // Use suggested props if available to avoid extra DB hit and match CRM validation
                    if (suggestedType && suggestedCalories) {
                        const auto = await nutritionService.getAutoPlanForClient(suggestedType, suggestedCalories);
                        setAutoPlan(auto);
                    } else {
                        // Fallback to searching by clientId
                        const auto = await nutritionService.getAutoPlanForClient(clientId);
                        setAutoPlan(auto);
                    }
                } else {
                    setAutoPlan(null);
                }
            } catch (err: any) {
                console.error('Error loading nutrition data:', err);
                // Try one last fallback for autoPlan if only assignment failed
                if (suggestedType && suggestedCalories) {
                    try {
                        const auto = await nutritionService.getAutoPlanForClient(suggestedType, suggestedCalories);
                        setAutoPlan(auto);
                    } catch (e) { }
                }
                setError(err.message || 'Error al cargar datos de nutrición');
            } finally {
                setLoading(false);
            }
        };
        if (clientId) loadData();
    }, [clientId, suggestedType, suggestedCalories]);

    // Load client's weekly selections
    useEffect(() => {
        const activePlanId = currentAssignment?.plan_id || autoPlan?.id;
        if (!clientId || !activePlanId) {
            setClientWeeklyPlan({});
            return;
        }

        const loadWeeklyPlan = async () => {
            try {
                setLoadingWeeklyPlan(true);
                setWeeklyPlanError(null);
                const { data, error } = await supabase
                    .from('client_weekly_plans')
                    .select('grid')
                    .eq('client_id', clientId)
                    .eq('plan_id', activePlanId)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                if (data?.grid) {
                    setClientWeeklyPlan(data.grid);
                } else {
                    setClientWeeklyPlan({});
                }
            } catch (err) {
                console.error('Error loading client weekly plan:', err);
                setWeeklyPlanError('No se pudo cargar el planificador del cliente.');
                setClientWeeklyPlan({});
            } finally {
                setLoadingWeeklyPlan(false);
            }
        };

        loadWeeklyPlan();
    }, [clientId, currentAssignment?.plan_id, autoPlan?.id]);

    // Load client's favorite recipes
    useEffect(() => {
        if (!clientId) return;

        const loadFavorites = async () => {
            try {
                const favs = await nutritionService.getFavoriteRecipes(clientId);
                setClientFavorites(favs);
            } catch (err) {
                console.error('Error loading client favorites:', err);
            }
        };

        loadFavorites();
    }, [clientId]);

    const handleAssign = async (planId: string) => {
        // ... (rest of handles)
        try {
            setIsAssigning(true);
            setError(null);
            await nutritionService.assignPlanToClient(clientId, planId, currentUser.id);
            const newAssignment = await nutritionService.getAssignmentByClient(clientId);
            setCurrentAssignment(newAssignment);
            if (onPlanAssigned) onPlanAssigned(planId);
        } catch (err) {
            console.error('Error assigning plan:', err);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleUnassign = async () => {
        try {
            setIsAssigning(true);
            await nutritionService.unassignClient(clientId);
            setCurrentAssignment(null);
            if (onPlanAssigned) onPlanAssigned('');
        } catch (err) {
            console.error('Error unassigning plan:', err);
        } finally {
            setIsAssigning(false);
        }
    };

    const filteredPlans = plans.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Sorting: Suggested plans first
    const sortedPlans = [...filteredPlans].sort((a, b) => {
        const aMatch = (suggestedCalories && a.target_calories === suggestedCalories) || (suggestedType && a.tags?.includes(suggestedType.toLowerCase()));
        const bMatch = (suggestedCalories && b.target_calories === suggestedCalories) || (suggestedType && b.tags?.includes(suggestedType.toLowerCase()));
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
    });

    if (loading) return <div className="animate-pulse space-y-3">
        <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
        <div className="h-20 bg-slate-50 rounded-xl w-full"></div>
    </div>;

    if (error) return (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <div>
                <p className="text-sm text-rose-700 font-medium">Error al cargar planes</p>
                <p className="text-[10px] text-rose-500">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {currentAssignment ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                            <Check className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Plan Asignado Manualmente</p>
                            <h4 className="text-slate-800 font-bold">{currentAssignment.plan_name}</h4>
                            <p className="text-[10px] text-emerald-600 font-medium">Desde el {new Date(currentAssignment.assigned_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setPreviewSubView('recipes');
                                setShowPreview(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title="Ver recetas"
                        >
                            <Eye className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleUnassign}
                            disabled={isAssigning}
                            className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        >
                            Quitar asignación
                        </button>
                    </div>
                </div>
            ) : autoPlan ? (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Asignación Automática</p>
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black rounded uppercase">Activo</span>
                            </div>
                            <h4 className="text-slate-800 font-bold">{autoPlan.name}</h4>
                            <p className="text-[10px] text-blue-600 font-medium">Basado en tipo de dieta y calorías</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setPreviewSubView('recipes');
                            setShowPreview(true);
                        }}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100/50 rounded-lg transition-all cursor-pointer"
                        title="Ver recetas"
                    >
                        <Eye className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <div>
                        <p className="text-sm text-amber-700 font-medium">Sin plan asignado</p>
                        <p className="text-[10px] text-amber-600 mt-0.5">No se encontró un plan manual ni automático para este perfil.</p>
                    </div>
                </div>
            )}

            {/* Resumen del Planificador del Cliente */}
            {!loading && (currentAssignment || autoPlan) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Elecciones del Cliente</h4>
                        </div>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                            {loadingWeeklyPlan ? 'Cargando...' : `${Object.keys(clientWeeklyPlan).length} comidas planificadas`}
                        </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => {
                            const hasMeals = Array.from({ length: 4 }).some((_, mealIdx) => {
                                const mealSlots = ['breakfast', 'lunch', 'dinner', 'snack'];
                                return clientWeeklyPlan[`${i}-${mealSlots[mealIdx]}`];
                            });

                            return (
                                <div key={i} className="text-center">
                                    <div className="text-[9px] font-bold text-slate-400 mb-1">{day}</div>
                                    <div className={`h-1.5 rounded-full transition-colors ${loadingWeeklyPlan
                                        ? 'bg-slate-200 animate-pulse'
                                        : hasMeals
                                            ? 'bg-emerald-400'
                                            : 'bg-slate-100'
                                        }`} />
                                </div>
                            );
                        })}
                    </div>

                    {weeklyPlanError && (
                        <p className="mt-2 text-[10px] text-rose-600">{weeklyPlanError}</p>
                    )}

                    <button
                        onClick={() => {
                            setPreviewSubView('planner');
                            setShowPreview(true);
                        }}
                        className="w-full mt-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Ver Detalle del Planificador
                    </button>
                </div>
            )}

            {/* Favoritos del Cliente */}
            {!loading && clientFavorites.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-3">
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recetas Favoritas</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {clientFavorites.slice(0, 5).map((fav, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setPreviewSubView('favorites');
                                    setShowPreview(true);
                                }}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-medium rounded-lg border border-rose-100 transition-colors cursor-pointer"
                            >
                                {fav.recipe_name}
                            </button>
                        ))}
                        {clientFavorites.length > 5 && (
                            <button
                                onClick={() => {
                                    setPreviewSubView('favorites');
                                    setShowPreview(true);
                                }}
                                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-400 text-[10px] font-medium rounded-lg transition-colors cursor-pointer"
                            >
                                +{clientFavorites.length - 5} más
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && fullClientData && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] flex flex-col border border-white/20">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-50">
                            <div>
                                <h3 className="font-bold text-slate-800">Vista Previa: Plan de Nutrición</h3>
                                <p className="text-[10px] text-slate-400 font-medium">Visualizando como el cliente</p>
                            </div>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
                            >
                                <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50/30">
                            <NutritionView
                                client={fullClientData}
                                onBack={() => setShowPreview(false)}
                                initialSubView={previewSubView}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar plan por nombre o kcal..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {sortedPlans.map(plan => {
                        const isSuggested = (suggestedCalories && plan.target_calories === suggestedCalories) || (suggestedType && plan.tags?.includes(suggestedType.toLowerCase()));
                        const isCurrent = currentAssignment?.plan_id === plan.id;

                        return (
                            <button
                                key={plan.id}
                                onClick={() => !isCurrent && handleAssign(plan.id)}
                                disabled={isAssigning || isCurrent}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${isCurrent
                                    ? 'border-emerald-500 bg-emerald-50/30'
                                    : isSuggested
                                        ? 'border-blue-200 bg-white hover:border-blue-400 hover:shadow-md'
                                        : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isCurrent ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'
                                        }`}>
                                        {isCurrent ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-700">{plan.name}</span>
                                            {isSuggested && (
                                                <span className="text-[8px] font-black bg-blue-500 text-white px-1.5 py-0.5 rounded uppercase">Recomendado</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                <Flame className="w-3 h-3 text-orange-400" />
                                                {plan.target_calories} kcal
                                            </div>
                                            {plan.tags && plan.tags.length > 0 && (
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                    <Tag className="w-3 h-3" />
                                                    {plan.tags.slice(0, 2).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {!isCurrent && <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />}
                            </button>
                        );
                    })}

                    {sortedPlans.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No se encontraron planes que coincidan.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
