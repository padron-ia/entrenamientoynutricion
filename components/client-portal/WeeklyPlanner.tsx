import React, { useState, useEffect, useCallback } from 'react';
import {
    Trash2,
    Plus,
    Flame,
    Coffee,
    Sun,
    Moon,
    Cookie,
    X,
    ChevronDown,
    ChevronUp,
    RotateCcw,
    Heart,
    Copy,
    BarChart3
} from 'lucide-react';
import { NutritionRecipe, RecipeCategory, MealSlot } from '../../types';
import { nutritionService } from '../../services/nutritionService';
import { supabase } from '../../services/supabaseClient';

interface WeeklyPlannerProps {
    recipes: NutritionRecipe[];
    planId: string;
    clientId?: string;
    initialGrid?: Grid;
    onUpdateGrid?: (newGrid: Grid) => void;
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const MEALS: { id: MealSlot; label: string; icon: React.FC<any>; category: RecipeCategory }[] = [
    { id: 'breakfast', label: 'Desayuno', icon: Coffee, category: 'breakfast' },
    { id: 'lunch', label: 'Comida', icon: Sun, category: 'lunch' },
    { id: 'dinner', label: 'Cena', icon: Moon, category: 'dinner' },
    { id: 'snack', label: 'Snack', icon: Cookie, category: 'snack' }
];

type Grid = Record<string, string | null>; // key: "day-meal", value: recipeId

function getStorageKey(planId: string) {
    return `ado_weekly_plan_${planId}`;
}

export function WeeklyPlanner({ recipes, planId, clientId, initialGrid, onUpdateGrid }: WeeklyPlannerProps) {
    const [grid, setGrid] = useState<Grid>(initialGrid || {});
    const [pickerOpen, setPickerOpen] = useState<string | null>(null); // "day-meal" or null
    const [expandedDay, setExpandedDay] = useState<number | null>(null);
    const [favoriteRecipes, setFavoriteRecipes] = useState<(NutritionRecipe & { plan_name?: string })[]>([]);

    // Sync grid from props
    useEffect(() => {
        if (initialGrid) setGrid(initialGrid);
    }, [initialGrid]);

    // Load from DB (only if initialGrid not provided)
    useEffect(() => {
        if (!clientId || !planId || initialGrid) return;

        const loadFromDB = async () => {
            try {
                const { data, error } = await supabase
                    .from('client_weekly_plans')
                    .select('grid, prev_grid')
                    .eq('client_id', clientId)
                    .eq('plan_id', planId)
                    .single();

                if (data) {
                    if (data.grid) setGrid(data.grid);
                } else {
                    // Migration from localStorage
                    const saved = localStorage.getItem(getStorageKey(planId));
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        setGrid(parsed);
                        // Save to DB immediately to migrate
                        await supabase.from('client_weekly_plans').upsert({
                            client_id: clientId,
                            plan_id: planId,
                            grid: parsed
                        });
                    }
                }
            } catch (err) {
                console.error('Error loading weekly plan from DB:', err);
            }
        };

        loadFromDB();
    }, [planId, clientId]);

    // Load favorite recipes
    useEffect(() => {
        if (!clientId) return;
        const loadFavs = async () => {
            try {
                const full = await nutritionService.getFavoriteRecipesFull(clientId);
                // Exclude recipes already in current plan
                const currentIds = new Set(recipes.map(r => r.id));
                setFavoriteRecipes(full.filter(r => !currentIds.has(r.id)));
            } catch (err) {
                console.error('Error loading favorite recipes for planner:', err);
            }
        };
        loadFavs();
    }, [clientId, recipes]);

    // Save to DB
    const saveGrid = useCallback(async (newGrid: Grid) => {
        setGrid(newGrid);
        if (onUpdateGrid) {
            onUpdateGrid(newGrid);
            return;
        }

        if (!clientId || !planId) return;

        try {
            await supabase.from('client_weekly_plans').upsert({
                client_id: clientId,
                plan_id: planId,
                grid: newGrid
            });
            // Keep local as cache
            localStorage.setItem(getStorageKey(planId), JSON.stringify(newGrid));
        } catch (err) {
            console.error('Error saving weekly plan to DB:', err);
        }
    }, [planId, clientId, onUpdateGrid]);

    const cellKey = (day: number, meal: MealSlot) => `${day}-${meal}`;

    const setRecipeForCell = (day: number, meal: MealSlot, recipeId: string | null) => {
        const key = cellKey(day, meal);
        const newGrid = { ...grid };
        if (recipeId) {
            newGrid[key] = recipeId;
        } else {
            delete newGrid[key];
        }
        saveGrid(newGrid);
        setPickerOpen(null);
    };

    const getRecipeForCell = (day: number, meal: MealSlot): NutritionRecipe | undefined => {
        const key = cellKey(day, meal);
        const recipeId = grid[key];
        if (!recipeId) return undefined;
        return recipes.find(r => r.id === recipeId) || favoriteRecipes.find(r => r.id === recipeId);
    };

    const getRecipesForCategory = (category: RecipeCategory): NutritionRecipe[] => {
        return recipes.filter(r => r.category === category);
    };

    const getDayCalories = (day: number): number => {
        return MEALS.reduce((total, meal) => {
            const recipe = getRecipeForCell(day, meal.id);
            return total + (recipe?.calories || 0);
        }, 0);
    };

    const handleClearAll = () => {
        if (Object.keys(grid).length === 0) return;
        saveGrid({});
    };

    const totalFilledCells = Object.keys(grid).length;

    // Copy previous week
    const handleCopyPrevWeek = async () => {
        if (!clientId || !planId) return;

        try {
            const { data, error } = await supabase
                .from('client_weekly_plans')
                .select('prev_grid')
                .eq('client_id', clientId)
                .eq('plan_id', planId)
                .single();

            if (data?.prev_grid && Object.keys(data.prev_grid).length > 0) {
                setGrid(data.prev_grid);
                // Also update the main grid in DB
                await supabase.from('client_weekly_plans').upsert({
                    client_id: clientId,
                    plan_id: planId,
                    grid: data.prev_grid
                });
                return;
            }
        } catch { }

        // Fallback to localStorage migration if needed
        const prevKey = getStorageKey(planId) + '_prev';
        try {
            const prev = localStorage.getItem(prevKey);
            if (prev) {
                const parsed = JSON.parse(prev);
                if (Object.keys(parsed).length > 0) {
                    saveGrid(parsed);
                    return;
                }
            }
        } catch { }

        alert('No hay semana anterior guardada. Planifica esta semana y la proxima podras copiarla.');
    };

    // Save current week as "previous"
    const savePrevWeek = useCallback(async () => {
        if (!clientId || !planId || Object.keys(grid).length === 0) return;

        try {
            await supabase.from('client_weekly_plans').upsert({
                client_id: clientId,
                plan_id: planId,
                prev_grid: grid
            }, { onConflict: 'client_id,plan_id' });
        } catch (err) {
            console.error('Error saving prev week to DB:', err);
        }
    }, [grid, planId, clientId]);

    // Auto-save as prev week when clearing
    const handleClearAllWithSave = () => {
        if (Object.keys(grid).length === 0) return;
        savePrevWeek();
        saveGrid({});
    };

    // Weekly nutrition summary
    const weeklyTotals = DAYS.reduce(
        (acc, _, dayIdx) => {
            MEALS.forEach(meal => {
                const recipe = getRecipeForCell(dayIdx, meal.id);
                if (recipe) {
                    acc.calories += recipe.calories || 0;
                    acc.protein += recipe.protein || 0;
                    acc.carbs += recipe.carbs || 0;
                    acc.fat += recipe.fat || 0;
                    acc.meals++;
                }
            });
            return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 }
    );

    // Recipe Picker component
    const RecipePicker = ({ day, meal, category }: { day: number; meal: MealSlot; category: RecipeCategory }) => {
        const available = getRecipesForCategory(category);
        const favForCategory = favoriteRecipes.filter(r => r.category === category);

        return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPickerOpen(null)}>
                <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase">{DAYS[day]} - {MEALS.find(m => m.id === meal)?.label}</p>
                            <p className="font-bold text-slate-800">Elige una receta</p>
                        </div>
                        <button onClick={() => setPickerOpen(null)} className="p-1.5 hover:bg-slate-100 rounded-full">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto p-2">
                        {/* Favorite recipes section */}
                        {favForCategory.length > 0 && (
                            <>
                                <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                                    <Heart className="w-3.5 h-3.5 text-red-400 fill-current" />
                                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Mis Favoritos</span>
                                </div>
                                {favForCategory.map(recipe => (
                                    <button
                                        key={recipe.id}
                                        onClick={() => setRecipeForCell(day, meal, recipe.id)}
                                        className="w-full text-left p-3 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-3"
                                    >
                                        <Heart className="w-4 h-4 text-red-300 fill-current flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-800 text-sm truncate">{recipe.name}</p>
                                            <div className="flex gap-2 text-xs mt-0.5">
                                                {recipe.calories && (
                                                    <span className="text-orange-500 flex items-center gap-0.5">
                                                        <Flame className="w-3 h-3" /> {recipe.calories}
                                                    </span>
                                                )}
                                                {(recipe as any).plan_name && (
                                                    <span className="text-slate-400">{(recipe as any).plan_name}</span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                <div className="border-t border-slate-100 my-2" />
                                <div className="flex items-center gap-1.5 px-3 pt-1 pb-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Actual</span>
                                </div>
                            </>
                        )}
                        {available.length === 0 && favForCategory.length === 0 ? (
                            <p className="text-center text-slate-400 py-8 text-sm">No hay recetas de esta categor&iacute;a</p>
                        ) : (
                            available.map(recipe => (
                                <button
                                    key={recipe.id}
                                    onClick={() => setRecipeForCell(day, meal, recipe.id)}
                                    className="w-full text-left p-3 rounded-xl hover:bg-green-50 transition-colors flex items-center gap-3"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 text-sm truncate">{recipe.name}</p>
                                        <div className="flex gap-2 text-xs mt-0.5">
                                            {recipe.calories && (
                                                <span className="text-orange-500 flex items-center gap-0.5">
                                                    <Flame className="w-3 h-3" /> {recipe.calories}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Mobile: accordion view
    const MobileView = () => (
        <div className="space-y-3 sm:hidden">
            {DAYS.map((dayName, dayIdx) => {
                const isExpanded = expandedDay === dayIdx;
                const dayCal = getDayCalories(dayIdx);
                const filledMeals = MEALS.filter(m => getRecipeForCell(dayIdx, m.id)).length;

                return (
                    <div key={dayIdx} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <button
                            onClick={() => setExpandedDay(isExpanded ? null : dayIdx)}
                            className="w-full p-4 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-800">{dayName}</span>
                                <span className="text-xs text-slate-400">{filledMeals}/4 comidas</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {dayCal > 0 && (
                                    <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg">
                                        {dayCal} kcal
                                    </span>
                                )}
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                        </button>

                        {isExpanded && (
                            <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
                                {MEALS.map(meal => {
                                    const recipe = getRecipeForCell(dayIdx, meal.id);
                                    const Icon = meal.icon;
                                    return (
                                        <div key={meal.id} className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <Icon className="w-4 h-4 text-slate-500" />
                                            </div>
                                            {recipe ? (
                                                <div className="flex-1 flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{recipe.name}</p>
                                                        {recipe.calories && (
                                                            <p className="text-xs text-orange-500">{recipe.calories} kcal</p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => setRecipeForCell(dayIdx, meal.id, null)}
                                                        className="p-1 hover:bg-red-100 rounded-full ml-2 flex-shrink-0"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setPickerOpen(cellKey(dayIdx, meal.id))}
                                                    className="flex-1 py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm hover:border-green-300 hover:text-green-500 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Elegir {meal.label.toLowerCase()}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    // Desktop: grid view
    const DesktopView = () => (
        <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="p-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-left w-20"></th>
                        {DAYS.map((day, idx) => (
                            <th key={idx} className="p-2 text-center">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider hidden lg:inline">{day}</span>
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider lg:hidden">{DAYS_SHORT[idx]}</span>
                                {getDayCalories(idx) > 0 && (
                                    <div className="text-[10px] font-semibold text-orange-500 mt-0.5">{getDayCalories(idx)} kcal</div>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {MEALS.map(meal => {
                        const Icon = meal.icon;
                        return (
                            <tr key={meal.id} className="border-t border-slate-100">
                                <td className="p-2 align-middle">
                                    <div className="flex items-center gap-1.5">
                                        <Icon className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-500 hidden md:inline">{meal.label}</span>
                                    </div>
                                </td>
                                {DAYS.map((_, dayIdx) => {
                                    const recipe = getRecipeForCell(dayIdx, meal.id);
                                    const key = cellKey(dayIdx, meal.id);
                                    return (
                                        <td key={dayIdx} className="p-1 align-top">
                                            {recipe ? (
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-2 min-h-[60px] relative group">
                                                    <p className="text-xs font-medium text-slate-700 line-clamp-2 pr-4">{recipe.name}</p>
                                                    {recipe.calories && (
                                                        <p className="text-[10px] text-orange-500 mt-0.5 font-semibold">{recipe.calories} kcal</p>
                                                    )}
                                                    <button
                                                        onClick={() => setRecipeForCell(dayIdx, meal.id, null)}
                                                        className="absolute top-1 right-1 p-0.5 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                                    >
                                                        <X className="w-3 h-3 text-red-400" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setPickerOpen(key)}
                                                    className="w-full min-h-[60px] border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center hover:border-green-300 hover:bg-green-50/30 transition-colors"
                                                >
                                                    <Plus className="w-4 h-4 text-slate-300" />
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">Planificador Semanal</h3>
                    <p className="text-sm text-slate-500">Elige tus recetas para cada dia</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopyPrevWeek}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sea-600 hover:bg-sea-50 rounded-lg transition-colors"
                        title="Copiar semana anterior"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Copiar anterior</span>
                    </button>
                    {totalFilledCells > 0 && (
                        <button
                            onClick={handleClearAllWithSave}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Limpiar</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Weekly nutrition summary */}
            {weeklyTotals.meals > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="w-4 h-4 text-sea-500" />
                        <span className="text-xs font-bold text-sea-500 uppercase tracking-wider">Resumen semanal</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{weeklyTotals.meals} comidas planificadas</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-orange-50 rounded-xl p-3 text-center">
                            <p className="text-[10px] font-semibold text-orange-400 uppercase">Calorías/día</p>
                            <p className="text-lg font-black text-orange-600">{Math.round(weeklyTotals.calories / 7)}</p>
                            <p className="text-[10px] text-orange-400">kcal</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                            <p className="text-[10px] font-semibold text-blue-400 uppercase">Proteína/día</p>
                            <p className="text-lg font-black text-blue-600">{Math.round(weeklyTotals.protein / 7)}</p>
                            <p className="text-[10px] text-blue-400">g</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3 text-center">
                            <p className="text-[10px] font-semibold text-amber-400 uppercase">Carbos/día</p>
                            <p className="text-lg font-black text-amber-600">{Math.round(weeklyTotals.carbs / 7)}</p>
                            <p className="text-[10px] text-amber-400">g</p>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3 text-center">
                            <p className="text-[10px] font-semibold text-purple-400 uppercase">Grasa/día</p>
                            <p className="text-lg font-black text-purple-600">{Math.round(weeklyTotals.fat / 7)}</p>
                            <p className="text-[10px] text-purple-400">g</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <DesktopView />
                <MobileView />
            </div>

            {/* Picker modal */}
            {pickerOpen && (() => {
                const [dayStr, mealStr] = pickerOpen.split('-');
                const dayIdx = parseInt(dayStr);
                const mealObj = MEALS.find(m => m.id === mealStr);
                if (!mealObj) return null;
                return <RecipePicker day={dayIdx} meal={mealObj.id} category={mealObj.category} />;
            })()}
        </div>
    );
}
