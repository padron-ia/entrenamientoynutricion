import React, { useEffect, useState } from 'react';
import {
    ArrowLeft,
    Utensils,
    Coffee,
    Sun,
    Moon,
    Cookie,
    ChevronDown,
    ChevronUp,
    Flame,
    AlertCircle,
    ExternalLink,
    FileText,
    Calendar,
    BookOpen,
    CalendarDays,
    ShoppingCart,
    Download,
    Clock,
    History,
    Eye,
    Heart,
    CheckCircle2,
    Zap,
    Layers3
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { nutritionService } from '../../services/nutritionService';
import { Client, NutritionPlan, NutritionRecipe, RecipeCategory, ClientNutritionOverride, NutritionAssignmentHistory, ClientFavoriteRecipe } from '../../types';
import { RecipeBookCard } from './RecipeBookCard';
import { RecipeDetailModal } from './RecipeDetailModal';
import { WeeklyPlanner } from './WeeklyPlanner';
import { ShoppingList } from './ShoppingList';
import { NutritionPdfGenerator } from './NutritionPdfGenerator';

interface NutritionViewProps {
    client: Client;
    onBack: () => void;
    initialSubView?: NutritionSubView;
}

type TabType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type NutritionSubView = 'recipes' | 'planner' | 'shopping' | 'favorites';

const TABS: { id: TabType; label: string; icon: React.FC<any> }[] = [
    { id: 'breakfast', label: 'Desayunos', icon: Coffee },
    { id: 'lunch', label: 'Comidas', icon: Sun },
    { id: 'dinner', label: 'Cenas', icon: Moon },
    { id: 'snack', label: 'Snacks', icon: Cookie }
];

interface RecipeWithOverride extends NutritionRecipe {
    override?: ClientNutritionOverride;
}

export function NutritionView({ client, onBack, initialSubView }: NutritionViewProps) {
    const [plan, setPlan] = useState<NutritionPlan | null>(null);
    const [recipes, setRecipes] = useState<RecipeWithOverride[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('breakfast');
    const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
    const [usingLegacy, setUsingLegacy] = useState(false);
    const [pendingApproval, setPendingApproval] = useState(false);
    const [nutritionView, setNutritionView] = useState<NutritionSubView>(initialSubView || 'recipes');
    const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<RecipeWithOverride | null>(null);

    // History state
    const [history, setHistory] = useState<NutritionAssignmentHistory[]>([]);
    const [allPlans, setAllPlans] = useState<NutritionPlan[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [historyPlan, setHistoryPlan] = useState<{ plan: NutritionPlan; recipes: NutritionRecipe[] } | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Favorites state
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [favoritesData, setFavoritesData] = useState<ClientFavoriteRecipe[]>([]);
    const [favoriteRecipesFull, setFavoriteRecipesFull] = useState<(NutritionRecipe & { plan_name?: string; plan_calories?: number; plan_diet_type?: string })[]>([]);
    const [loadingFavorites, setLoadingFavorites] = useState(false);

    // Legacy food plans state (for fallback)
    const [legacyPlans, setLegacyPlans] = useState<any[]>([]);

    // Planner Grid state (for consistency across devices)
    const [plannerGrid, setPlannerGrid] = useState<Record<string, string | null>>({});
    const [loadingPlanner, setLoadingPlanner] = useState(false);

    useEffect(() => {
        const fetchNutrition = async () => {
            try {
                setLoading(true);

                // First, try to get structured nutrition plan
                const { plan: nutritionPlan, recipes: nutritionRecipes, overrides, pendingApproval: isPending } =
                    await nutritionService.getClientPlanWithRecipes(client.id, client.nutrition_approved);

                if (isPending) {
                    setPendingApproval(true);
                    return;
                }

                // FIX: Strictly use Nutrition Plans. No fallback to legacy.
                if (nutritionPlan) {
                    setPlan(nutritionPlan);
                    // Apply overrides to recipes
                    const recipesWithOverrides = nutritionRecipes.map(r => ({
                        ...nutritionService.applyOverride(r, overrides.get(r.id)),
                        override: overrides.get(r.id)
                    }));
                    setRecipes(recipesWithOverrides);
                }

                // Fetch all accessible plans (replaces limited history)
                try {
                    const [historyData, accessiblePlans] = await Promise.all([
                        nutritionService.getAssignmentHistory(client.id),
                        nutritionService.getAllAccessiblePlans(client.id),
                    ]);
                    setHistory(historyData);
                    // Filter out the current plan from the list
                    setAllPlans(accessiblePlans.filter(p => p.id !== nutritionPlan?.id));
                } catch (err) {
                    console.error('Error fetching nutrition history:', err);
                }
            } catch (err) {
                console.error('Error fetching nutrition:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchNutrition();
    }, [client.id, client.nutrition_approved]);

    // Load planner grid when plan changes
    useEffect(() => {
        if (!client.id || !plan?.id) return;

        const loadPlanner = async () => {
            try {
                const { data, error } = await supabase
                    .from('client_weekly_plans')
                    .select('grid')
                    .eq('client_id', client.id)
                    .eq('plan_id', plan.id)
                    .single();

                if (data?.grid) {
                    setPlannerGrid(data.grid);
                } else {
                    // Migration from localStorage
                    const saved = localStorage.getItem(`ado_weekly_plan_${plan.id}`);
                    if (saved) {
                        try {
                            const parsed = JSON.parse(saved);
                            setPlannerGrid(parsed);
                            // Auto-migrate to DB
                            await supabase.from('client_weekly_plans').upsert({
                                client_id: client.id,
                                plan_id: plan.id,
                                grid: parsed
                            });
                        } catch (e) {
                            console.error('Error parsing localStorage planner:', e);
                        }
                    }
                }
            } catch (err) {
                console.error('Error loading planner grid:', err);
            }
        };

        loadPlanner();
    }, [client.id, plan?.id]);

    const handleUpdatePlannerGrid = async (newGrid: Record<string, string | null>) => {
        setPlannerGrid(newGrid);
        if (!client.id || !plan?.id) return;

        try {
            await supabase.from('client_weekly_plans').upsert({
                client_id: client.id,
                plan_id: plan.id,
                grid: newGrid
            });
            localStorage.setItem(`ado_weekly_plan_${plan.id}`, JSON.stringify(newGrid));
        } catch (err) {
            console.error('Error updating planner grid:', err);
        }
    };

    const fetchLegacyPlans = async () => {
        if (!client.nutrition?.assigned_nutrition_type || !client.nutrition?.assigned_calories) {
            return;
        }

        try {
            const { data, error } = await supabase
                .from('food_plans')
                .select('*')
                .eq('type', client.nutrition.assigned_nutrition_type)
                .order('year', { ascending: false })
                .order('month_number', { ascending: false })
                .order('fortnight_number', { ascending: false });

            if (data) {
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth() + 1;
                const currentDay = now.getDate();
                const currentFortnight = currentDay <= 15 ? 1 : 2;

                const validPlans = data.filter(plan => {
                    // Calories check
                    if (Number(plan.calories) !== Number(client.nutrition.assigned_calories)) {
                        return false;
                    }

                    // Timing check
                    let isReleased = false;
                    if (plan.year < currentYear) isReleased = true;
                    else if (plan.year === currentYear) {
                        if (plan.month_number < currentMonth) isReleased = true;
                        else if (plan.month_number === currentMonth) {
                            isReleased = plan.fortnight_number <= currentFortnight;
                        }
                    }

                    if (plan.year === 2025 || (plan.year === currentYear && plan.month_number === currentMonth)) {
                        isReleased = true;
                    }

                    return isReleased;
                });

                setLegacyPlans(validPlans);
            }
        } catch (err) {
            console.error('Error fetching legacy plans:', err);
        }
    };

    // Fetch favorites
    useEffect(() => {
        const fetchFavorites = async () => {
            try {
                const favs = await nutritionService.getFavoriteRecipes(client.id);
                setFavoritesData(favs);
                setFavoriteIds(new Set(favs.map(f => f.recipe_id)));
            } catch (err) {
                console.error('Error fetching favorites:', err);
            }
        };
        fetchFavorites();
    }, [client.id]);

    // Load full favorite recipes (needed for Mi Recetario tab + ShoppingList + WeeklyPlanner)
    useEffect(() => {
        if (favoriteIds.size === 0) {
            setFavoriteRecipesFull([]);
            return;
        }
        const loadFull = async () => {
            setLoadingFavorites(true);
            try {
                const full = await nutritionService.getFavoriteRecipesFull(client.id);
                setFavoriteRecipesFull(full);
            } catch (err) {
                console.error('Error loading full favorites:', err);
            } finally {
                setLoadingFavorites(false);
            }
        };
        loadFull();
    }, [client.id, favoriteIds]);

    const handleToggleFavorite = async (recipe: NutritionRecipe, fromPlan?: NutritionPlan) => {
        const currentlyFav = favoriteIds.has(recipe.id);
        const targetPlan = fromPlan || plan;
        if (!targetPlan) return;

        // Optimistic update
        const newIds = new Set(favoriteIds);
        if (currentlyFav) {
            newIds.delete(recipe.id);
        } else {
            newIds.add(recipe.id);
        }
        setFavoriteIds(newIds);

        const result = await nutritionService.toggleFavoriteRecipe(
            client.id,
            { id: recipe.id, name: recipe.name, category: recipe.category, plan_id: targetPlan.id },
            { name: targetPlan.name, target_calories: targetPlan.target_calories, diet_type: targetPlan.diet_type },
            currentlyFav
        );

        // If result doesn't match expected, revert
        if (result !== !currentlyFav) {
            setFavoriteIds(favoriteIds); // revert
        } else {
            // Refresh favorites data
            const favs = await nutritionService.getFavoriteRecipes(client.id);
            setFavoritesData(favs);
        }
    };

    const getRecipesByCategory = (category: RecipeCategory): RecipeWithOverride[] => {
        return recipes
            .filter(r => r.category === category)
            .sort((a, b) => a.position - b.position);
    };

    const getCategoryStats = (category: RecipeCategory) => {
        const categoryRecipes = getRecipesByCategory(category);
        const sosCount = categoryRecipes.filter(r => r.is_sos).length;
        return {
            total: categoryRecipes.length,
            sos: sosCount,
            standard: Math.max(categoryRecipes.length - sosCount, 0)
        };
    };

    const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const planPeriodLabel = plan?.target_month
        ? `${plan.target_fortnight === 1 ? '1ª' : '2ª'} Quincena de ${monthNames[plan.target_month] || ''}`
        : null;

    // Per-tab: priorizar recetas estructuradas sobre bloques de texto
    const hasRecipesForTab = (tab: RecipeCategory) => getRecipesByCategory(tab).length > 0;
    const hasBlockContentForTab = (tab: TabType) => !!getBlockContent(tab)?.trim();

    // Plan es de tipo "bloque" si NO tiene recetas estructuradas
    const isBlockPlan = recipes.length === 0 && plan != null && (
        !!plan.breakfast_content?.trim() || !!plan.lunch_content?.trim() ||
        !!plan.dinner_content?.trim() || !!plan.snack_content?.trim() ||
        !!plan.intro_content?.trim()
    );

    const getBlockContent = (tab: TabType) => {
        if (!plan) return '';
        switch (tab) {
            case 'breakfast': return plan.breakfast_content;
            case 'lunch': return plan.lunch_content;
            case 'dinner': return plan.dinner_content;
            case 'snack': return plan.snack_content;
            default: return '';
        }
    };

    const toggleRecipe = (recipeId: string) => {
        setExpandedRecipe(expandedRecipe === recipeId ? null : recipeId);
    };

    const loadHistoryPlan = async (entry: { plan_id: string }) => {
        if (!entry.plan_id) return;
        setLoadingHistory(true);
        try {
            const planData = await nutritionService.getPlanById(entry.plan_id);
            if (planData) {
                const recipesData = await nutritionService.getRecipesByPlan(entry.plan_id);
                setHistoryPlan({ plan: planData, recipes: recipesData });
            }
        } catch (err) {
            console.error('Error loading history plan:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const formatDateRange = (assignedAt: string, replacedAt: string) => {
        const from = new Date(assignedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        const to = new Date(replacedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        return `${from} — ${to}`;
    };

    // Pending approval view
    if (pendingApproval && !loading) {
        return (
            <div className="min-h-screen bg-gray-50 pb-12">
                <div className="bg-white shadow-sm sticky top-0 z-10">
                    <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Utensils className="w-6 h-6 text-accent-600" />
                            Tu Nutrici&oacute;n
                        </h1>
                    </div>
                </div>
                <div className="max-w-4xl mx-auto px-4 py-12">
                    <div className="bg-white p-8 sm:p-12 rounded-2xl text-center border border-amber-200 shadow-sm">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Clock className="w-8 h-8 text-amber-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-3">Tu plan nutricional est&aacute; siendo preparado</h2>
                        <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
                            Tu coach est&aacute; revisando tu perfil para personalizar tu plan de alimentaci&oacute;n.
                            Te notificaremos cuando est&eacute; listo.
                        </p>
                    </div>
                </div>
            </div>
        );
    }



    // New structured nutrition view
    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-10 print:hidden">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Utensils className="w-6 h-6 text-accent-600" />
                            Tu Plan Nutricional
                        </h1>
                    </div>
                    {plan && !loading && (
                        <div className="flex items-center gap-2">
                            <NutritionPdfGenerator
                                client={client}
                                plan={plan}
                                recipes={[...recipes, ...favoriteRecipesFull.filter(fr => !recipes.some(r => r.id === fr.id))]}
                                planId={plan.id}
                                plannerGrid={plannerGrid}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 print:hidden">
                {loading ? (
                    <div className="space-y-4">
                        <div className="animate-pulse h-24 bg-white rounded-2xl"></div>
                        <div className="animate-pulse h-12 bg-white rounded-xl"></div>
                        <div className="animate-pulse h-64 bg-white rounded-2xl"></div>
                    </div>
                ) : !plan ? (
                    <div className="bg-white p-8 rounded-2xl text-center border-2 border-dashed border-gray-200">
                        <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-800 mb-2">
                            No tienes un plan asignado
                        </h3>
                        <p className="text-gray-500">
                            Tu coach te asignará un plan nutricional personalizado próximamente.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Plan Info */}
                        <div className="bg-gradient-to-r from-accent-50 via-accent-100 to-white border border-accent-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="px-3 py-1 bg-accent-100 text-accent-700 text-xs font-bold uppercase rounded-full tracking-wider">
                                    Tu Plan
                                </span>
                                {plan.diet_type && (
                                    <span className="px-3 py-1 bg-white/90 text-slate-700 text-xs font-bold uppercase rounded-full tracking-wider border border-white/80">
                                        {plan.diet_type}
                                    </span>
                                )}
                                {planPeriodLabel && (
                                    <span className="px-3 py-1 bg-white/90 text-slate-600 text-xs font-semibold rounded-full border border-white/80">
                                        {planPeriodLabel}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h2>
                            {plan.description && (
                                <p className="text-gray-600 mb-4 max-w-3xl">{plan.description}</p>
                            )}
                            <div className="flex flex-wrap gap-3 text-sm mb-5">
                                {plan.target_calories && (
                                    <span className="flex items-center gap-1 px-3 py-1 bg-white rounded-full text-orange-600 font-medium shadow-sm">
                                        <Flame className="w-4 h-4" />
                                        {plan.target_calories} kcal/día
                                    </span>
                                )}
                                {!isBlockPlan && (
                                    <span className="px-3 py-1 bg-white rounded-full text-gray-600 shadow-sm">
                                        {recipes.length} recetas
                                    </span>
                                )}
                            </div>

                            {!isBlockPlan && recipes.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {TABS.map(tab => {
                                        const stats = getCategoryStats(tab.id as RecipeCategory);
                                        return (
                                            <div key={tab.id} className="bg-white/90 rounded-xl border border-white p-3 shadow-sm">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <tab.icon className="w-4 h-4 text-accent-600" />
                                                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{tab.label}</span>
                                                </div>
                                                <p className="text-xl font-black text-slate-800">{stats.total}</p>
                                                <p className="text-xs text-slate-500">
                                                    {stats.standard} normales{stats.sos > 0 ? ` · ${stats.sos} SOS` : ''}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* How to use plan */}
                        {!isBlockPlan && recipes.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
                                    <Layers3 className="w-5 h-5 text-accent-600" />
                                    Cómo usar tu plan
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                        <span>Elige 1 desayuno, 1 comida y 1 cena cada día.</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                        <span>Añade 1 snack si lo necesitas o si tu coach te lo ha indicado.</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Zap className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                        <span>Las recetas SOS están pensadas para días con menos tiempo, pero siguen siendo opciones válidas.</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                        <span>Intenta variar las opciones a lo largo de la semana para hacerlo más llevadero.</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Instructions Section */}
                        {plan.instructions && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-3">
                                    <FileText className="w-5 h-5 text-sea-500" />
                                    Instrucciones y Recomendaciones
                                </h3>
                                <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                                    {plan.instructions}
                                </div>
                            </div>
                        )}

                        {/* Intro Content for Block Plans */}
                        {isBlockPlan && plan.intro_content && (
                            <div className="bg-accent-50 border border-accent-100 rounded-2xl p-6 shadow-sm">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-accent-800 mb-3">
                                    <FileText className="w-5 h-5" />
                                    Introducción al Plan
                                </h3>
                                <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {plan.intro_content}
                                </div>
                            </div>
                        )}

                        {/* Sub-Navigation for structured plans with recipes */}
                        {!isBlockPlan && recipes.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                <div className="flex border-b border-gray-200">
                                    {([
                                        { id: 'recipes' as NutritionSubView, label: 'Recetas', icon: BookOpen },
                                        { id: 'favorites' as NutritionSubView, label: 'Mi Recetario', icon: Heart },
                                        { id: 'planner' as NutritionSubView, label: 'Planificador', icon: CalendarDays },
                                        { id: 'shopping' as NutritionSubView, label: 'Lista de la Compra', icon: ShoppingCart }
                                    ]).map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setNutritionView(tab.id)}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${nutritionView === tab.id
                                                ? 'border-accent-600 text-accent-600 bg-accent-50/50'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            <tab.icon className={`w-4 h-4 ${tab.id === 'favorites' && favoriteIds.size > 0 ? 'text-red-400 fill-current' : ''}`} />
                                            <span className="hidden sm:inline">{tab.label}</span>
                                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                                            {tab.id === 'favorites' && favoriteIds.size > 0 && (
                                                <span className="text-[10px] font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                    {favoriteIds.size}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Content based on sub-view */}
                        {!isBlockPlan && recipes.length > 0 && nutritionView === 'favorites' ? (
                            /* === MI RECETARIO === */
                            <div className="space-y-6">
                                {loadingFavorites ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="animate-pulse h-24 bg-white rounded-2xl" />
                                        ))}
                                    </div>
                                ) : favoriteRecipesFull.length === 0 ? (
                                    <div className="bg-white p-10 rounded-2xl text-center border-2 border-dashed border-slate-200">
                                        <Heart className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                                        <h3 className="text-lg font-bold text-slate-700 mb-2">Tu recetario est&aacute; vac&iacute;o</h3>
                                        <p className="text-slate-400 max-w-sm mx-auto">
                                            Pulsa el coraz&oacute;n en cualquier receta para guardarla aqu&iacute;.
                                            Tus favoritas de todos tus planes se acumulan en este recetario personal.
                                        </p>
                                    </div>
                                ) : (
                                    /* Favorites grouped by category */
                                    TABS.map(tab => {
                                        const tabFavs = favoriteRecipesFull
                                            .filter(r => r.category === tab.id)
                                            .sort((a, b) => a.name.localeCompare(b.name));
                                        if (tabFavs.length === 0) return null;
                                        return (
                                            <div key={tab.id}>
                                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">
                                                    <tab.icon className="w-4 h-4" />
                                                    {tab.label}
                                                    <span className="text-xs font-normal text-slate-400 normal-case">({tabFavs.length})</span>
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {tabFavs.map(recipe => {
                                                        const isFromCurrentPlan = recipe.plan_id === plan?.id;
                                                        const planLabel = isFromCurrentPlan ? undefined : (recipe as any).plan_name;
                                                        const calorieBadge = (recipe as any).plan_calories && (recipe as any).plan_calories !== plan?.target_calories
                                                            ? `${(recipe as any).plan_calories} kcal`
                                                            : undefined;
                                                        return (
                                                            <RecipeBookCard
                                                                key={recipe.id}
                                                                recipe={recipe}
                                                                onClick={() => setSelectedRecipeDetail(recipe)}
                                                                isFavorite={true}
                                                                onToggleFavorite={(e) => { e.stopPropagation(); handleToggleFavorite(recipe); }}
                                                                planLabel={planLabel}
                                                                calorieBadge={calorieBadge}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : !isBlockPlan && recipes.length > 0 && nutritionView === 'planner' ? (
                            <WeeklyPlanner
                                recipes={recipes}
                                planId={plan.id}
                                clientId={client.id}
                                initialGrid={plannerGrid}
                                onUpdateGrid={handleUpdatePlannerGrid}
                            />
                        ) : !isBlockPlan && recipes.length > 0 && nutritionView === 'shopping' ? (
                            <ShoppingList
                                recipes={[...recipes, ...favoriteRecipesFull.filter(fr => !recipes.some(r => r.id === fr.id))]}
                                planId={plan.id}
                                clientId={client.id}
                                initialPlannerGrid={plannerGrid}
                            />
                        ) : (
                            <>
                                {/* Category Tabs */}
                                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                    <div className="flex overflow-x-auto border-b border-gray-200">
                                        {TABS.map(tab => {
                                            const stats = getCategoryStats(tab.id as RecipeCategory);
                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={`flex-1 min-w-[100px] flex flex-col items-center gap-1 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                                        ? 'border-accent-600 text-accent-600 bg-accent-50/50'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <tab.icon className="w-5 h-5" />
                                                    <span>{tab.label}</span>
                                                    {stats.total > 0 && (
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id
                                                            ? 'bg-accent-100 text-accent-700'
                                                            : 'bg-gray-100 text-gray-500'
                                                            }`}>
                                                            {stats.total} opciones
                                                        </span>
                                                    )}
                                                    {stats.sos > 0 && (
                                                        <span className="text-[10px] font-semibold text-red-500">
                                                            {stats.sos} SOS
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Recipe Content */}
                                <div className="space-y-4">
                                    {hasRecipesForTab(activeTab as RecipeCategory) ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {getRecipesByCategory(activeTab).map((recipe) => (
                                                <RecipeBookCard
                                                    key={recipe.id}
                                                    recipe={recipe}
                                                    onClick={() => setSelectedRecipeDetail(recipe)}
                                                    isFavorite={favoriteIds.has(recipe.id)}
                                                    onToggleFavorite={(e) => { e.stopPropagation(); handleToggleFavorite(recipe); }}
                                                />
                                            ))}
                                        </div>
                                    ) : hasBlockContentForTab(activeTab) ? (
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[200px]">
                                            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-lg">
                                                {getBlockContent(activeTab)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white p-8 rounded-xl text-center border border-gray-200">
                                            <p className="text-gray-500">
                                                No hay recetas de {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} disponibles.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Recipe Detail Modal */}
                        {selectedRecipeDetail && (
                            <RecipeDetailModal
                                recipe={selectedRecipeDetail}
                                onClose={() => setSelectedRecipeDetail(null)}
                                isFavorite={favoriteIds.has(selectedRecipeDetail.id)}
                                onToggleFavorite={() => handleToggleFavorite(selectedRecipeDetail)}
                            />
                        )}

                        {/* All Accessible Plans */}
                        {allPlans.length > 0 && (
                            <div className="mt-8">
                                <button
                                    onClick={() => { setShowHistory(!showHistory); setHistoryPlan(null); }}
                                    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium"
                                >
                                    <History className="w-4 h-4" />
                                    Todos mis men&uacute;s ({allPlans.length})
                                    {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                {showHistory && (
                                    <div className="mt-3 space-y-2">
                                        {allPlans.map(p => {
                                            const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                                            const period = p.target_month
                                                ? `${p.target_fortnight === 1 ? '1ª' : '2ª'} Quincena de ${monthNames[p.target_month] || ''}`
                                                : new Date(p.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                                            // Check if this plan was assigned to the client
                                            const wasAssigned = history.some(h => h.plan_id === p.id);

                                            return (
                                                <div
                                                    key={p.id}
                                                    className={`bg-white border rounded-xl p-4 flex items-center justify-between ${wasAssigned ? 'border-accent-200' : 'border-gray-200'}`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-medium text-gray-800 truncate">
                                                                {p.name}
                                                            </p>
                                                            {wasAssigned && (
                                                                <span className="text-[10px] font-bold text-accent-700 bg-accent-50 px-2 py-0.5 rounded-full uppercase">
                                                                    Asignado
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {period} &middot; {p.target_calories} kcal
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => loadHistoryPlan({ plan_id: p.id } as any)}
                                                        disabled={loadingHistory}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-accent-700 bg-green-50 hover:bg-accent-100 rounded-lg transition-colors disabled:opacity-50 shrink-0 ml-3"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        Ver
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* History Plan Detail View */}
                                        {loadingHistory && (
                                            <div className="bg-white rounded-xl p-6 text-center">
                                                <div className="animate-pulse h-32 bg-gray-100 rounded-lg"></div>
                                            </div>
                                        )}

                                        {historyPlan && !loadingHistory && (
                                            <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-bold text-gray-800">
                                                        {historyPlan.plan.name}
                                                    </h3>
                                                    <button
                                                        onClick={() => setHistoryPlan(null)}
                                                        className="text-sm text-gray-400 hover:text-gray-600"
                                                    >
                                                        Cerrar
                                                    </button>
                                                </div>
                                                {historyPlan.plan.description && (
                                                    <p className="text-gray-500 text-sm mb-4">{historyPlan.plan.description}</p>
                                                )}

                                                {historyPlan.recipes.length > 0 ? (
                                                    <div className="space-y-6">
                                                        {TABS.map(tab => {
                                                            const tabRecipes = historyPlan.recipes
                                                                .filter(r => r.category === tab.id)
                                                                .sort((a, b) => a.position - b.position);
                                                            if (tabRecipes.length === 0) return null;
                                                            return (
                                                                <div key={tab.id}>
                                                                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">
                                                                        <tab.icon className="w-4 h-4" />
                                                                        {tab.label}
                                                                    </h4>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                        {tabRecipes.map(recipe => (
                                                                            <RecipeBookCard
                                                                                key={recipe.id}
                                                                                recipe={recipe}
                                                                                onClick={() => setSelectedRecipeDetail(recipe)}
                                                                                isFavorite={favoriteIds.has(recipe.id)}
                                                                                onToggleFavorite={(e) => { e.stopPropagation(); handleToggleFavorite(recipe, historyPlan.plan); }}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {/* Show block content for history plans without recipes */}
                                                        {historyPlan.plan.intro_content && (
                                                            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-lg">
                                                                {historyPlan.plan.intro_content}
                                                            </div>
                                                        )}
                                                        {TABS.map(tab => {
                                                            const content = (() => {
                                                                switch (tab.id) {
                                                                    case 'breakfast': return historyPlan.plan.breakfast_content;
                                                                    case 'lunch': return historyPlan.plan.lunch_content;
                                                                    case 'dinner': return historyPlan.plan.dinner_content;
                                                                    case 'snack': return historyPlan.plan.snack_content;
                                                                    default: return '';
                                                                }
                                                            })();
                                                            if (!content?.trim()) return null;
                                                            return (
                                                                <div key={tab.id}>
                                                                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">
                                                                        <tab.icon className="w-4 h-4" />
                                                                        {tab.label}
                                                                    </h4>
                                                                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-lg">
                                                                        {content}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* PRINT VIEW (Solo visible al imprimir) */}
            {plan && (
                <div className="hidden print:block bg-white p-8">
                    {/* Print Header */}
                    <div className="flex justify-between items-start border-b-2 border-accent-600 pb-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 mb-2">Padron Trainer</h1>
                            <p className="text-slate-500 text-sm">Plan Nutricional Personalizado</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold text-slate-800">{client.firstName} {client.surname}</h2>
                            <p className="text-slate-600 font-medium">{plan.name}</p>
                            {plan.target_calories && (
                                <span className="inline-block mt-2 px-3 py-1 bg-accent-100 text-accent-800 rounded-full text-sm font-bold">
                                    {plan.target_calories} kcal / día
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Descripción General */}
                    {plan.description && (
                        <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-sm italic">
                            <strong>Descripción:</strong> {plan.description}
                        </div>
                    )}

                    {/* Instrucciones del Coach */}
                    {plan.instructions && (
                        <div className="mb-8 p-6 bg-white rounded-xl border-2 border-sea-100 text-slate-800 break-inside-avoid">
                            <h3 className="text-lg font-bold text-sea-700 mb-3 flex items-center gap-2 uppercase tracking-wider">
                                <FileText className="w-5 h-5" />
                                Instrucciones y Recomendaciones del Coach
                            </h3>
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                {plan.instructions}
                            </div>
                        </div>
                    )}

                    {/* Introducción General (Block Plan) */}
                    {isBlockPlan && plan.intro_content && (
                        <div className="mb-8 p-6 bg-accent-50 rounded-xl border-2 border-accent-100 text-slate-800 break-inside-avoid">
                            <h3 className="text-lg font-bold text-accent-700 mb-3 flex items-center gap-2 uppercase tracking-wider">
                                <Utensils className="w-5 h-5" />
                                Introducción al Plan
                            </h3>
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                {plan.intro_content}
                            </div>
                        </div>
                    )}

                    {/* Print Recipes by Category */}
                    <div className="space-y-8">
                        {isBlockPlan ? (
                            <div className="space-y-8">
                                {TABS.map(tab => {
                                    const content = getBlockContent(tab.id);
                                    if (!content) return null;

                                    return (
                                        <div key={tab.id} className="break-inside-avoid page-break-inside-avoid mb-8">
                                            <h3 className="flex items-center gap-2 text-xl font-bold text-accent-800 border-b border-accent-200 pb-2 mb-4 uppercase tracking-wide">
                                                <tab.icon className="w-6 h-6" />
                                                {tab.label}
                                            </h3>
                                            <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                {content}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* PLANIFICADOR SEMANAL (Solo para planes de bloques) */}
                                <div className="break-before-page page-break-before-always mt-8 pt-8 border-t-2 border-dashed border-slate-300">
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-wider mb-2">Planificador Semanal</h2>
                                        <p className="text-slate-500">Organiza tu semana con las opciones que más te gusten</p>
                                    </div>

                                    <div className="border-2 border-slate-800 rounded-lg overflow-hidden">
                                        <div className="grid grid-cols-8 divide-x-2 divide-slate-800 bg-slate-100 border-b-2 border-slate-800">
                                            <div className="p-2 font-bold text-slate-900 text-center text-xs uppercase bg-slate-200">Comida / Día</div>
                                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                                                <div key={day} className="p-2 font-bold text-slate-900 text-center text-xs uppercase">{day}</div>
                                            ))}
                                        </div>
                                        {['Desayuno', 'Comida', 'Cena', 'Snack'].map((meal, i) => (
                                            <div key={meal} className={`grid grid-cols-8 divide-x-2 divide-slate-800 ${i !== 3 ? 'border-b-2 border-slate-800' : ''}`}>
                                                <div className="p-2 font-bold text-slate-800 text-xs sm:text-sm uppercase bg-slate-50 flex items-center justify-center -rotate-90 sm:rotate-0 h-32 sm:h-auto">
                                                    {meal}
                                                </div>
                                                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                                    <div key={day} className="h-32 bg-white"></div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Legacy/Recipe Print Loop
                            TABS.map(tab => {
                                const tabRecipes = getRecipesByCategory(tab.id as RecipeCategory);
                                if (tabRecipes.length === 0) return null;

                                return (
                                    <div key={tab.id} className="break-inside-avoid page-break-inside-avoid">
                                        <h3 className="flex items-center gap-2 text-xl font-bold text-accent-800 border-b border-accent-200 pb-2 mb-4 uppercase tracking-wide">
                                            <tab.icon className="w-6 h-6" />
                                            {tab.label}
                                        </h3>

                                        <div className="grid grid-cols-1 gap-6">
                                            {tabRecipes.map((recipe, index) => (
                                                <div key={recipe.id} className="border border-slate-200 rounded-xl p-5 break-inside-avoid bg-white">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                                            <span className="w-6 h-6 rounded-full bg-accent-100 text-accent-700 text-xs flex items-center justify-center">
                                                                {index + 1}
                                                            </span>
                                                            {recipe.name}
                                                        </h4>
                                                        <div className="flex gap-3 text-xs font-medium text-slate-500">
                                                            {recipe.calories && <span>🔥 {recipe.calories} kcal</span>}
                                                            {recipe.protein && <span>P: {recipe.protein}g</span>}
                                                            {recipe.carbs && <span>C: {recipe.carbs}g</span>}
                                                            {recipe.fat && <span>G: {recipe.fat}g</span>}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-12 gap-6">
                                                        {/* Ingredientes */}
                                                        <div className="col-span-4">
                                                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Ingredientes</p>
                                                            <ul className="text-sm space-y-1">
                                                                {recipe.ingredients.map((ing, i) => (
                                                                    <li key={i} className="text-slate-700 flex items-start gap-1.5">
                                                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-accent-500 flex-shrink-0"></span>
                                                                        <span>
                                                                            {ing.name}
                                                                            {ing.quantity > 0 && <span className="text-slate-400 text-xs ml-1">({ing.quantity} {ing.unit})</span>}
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        {/* Preparación */}
                                                        <div className="col-span-8">
                                                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Preparación</p>
                                                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                                                                {recipe.preparation || 'Sin instrucciones de preparación.'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Override Note */}
                                                    {recipe.override?.notes && (
                                                        <div className="mt-3 pt-3 border-t border-slate-100">
                                                            <p className="text-sm text-sea-700 bg-sea-50 p-2 rounded-lg italic">
                                                                <strong>Nota personalizada:</strong> {recipe.override.notes}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
                        <p>Generado por Padron Trainer • {new Date().toLocaleDateString('es-ES')}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
