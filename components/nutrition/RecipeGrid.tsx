import React from 'react';
import { Plus, Coffee, Sun, Moon, Cookie, ChefHat } from 'lucide-react';
import { NutritionRecipe, RecipeCategory } from '../../types';
import { RecipeCard } from './RecipeCard';

interface RecipeGridProps {
  category: RecipeCategory;
  recipes: NutritionRecipe[];
  loading: boolean;
  onCreateRecipe: () => void;
  onEditRecipe: (recipe: NutritionRecipe) => void;
  onDeleteRecipe: (recipe: NutritionRecipe) => void;
}

const CATEGORY_CONFIG: Record<RecipeCategory, { label: string; icon: React.FC<any>; color: string }> = {
  breakfast: { label: 'Desayunos', icon: Coffee, color: 'amber' },
  lunch: { label: 'Comidas', icon: Sun, color: 'orange' },
  dinner: { label: 'Cenas', icon: Moon, color: 'indigo' },
  snack: { label: 'Snacks', icon: Cookie, color: 'pink' }
};

const MAX_RECIPES = 8;

export function RecipeGrid({
  category,
  recipes,
  loading,
  onCreateRecipe,
  onEditRecipe,
  onDeleteRecipe
}: RecipeGridProps) {
  const config = CATEGORY_CONFIG[category];
  const canAddMore = recipes.length < MAX_RECIPES;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-slate-100 rounded-xl aspect-[4/5] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-${config.color}-100`}>
            <config.icon className={`w-5 h-5 text-${config.color}-600`} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{config.label}</h3>
            <p className="text-sm text-slate-500">
              {recipes.length} de {MAX_RECIPES} opciones
            </p>
          </div>
        </div>

        {canAddMore && (
          <button
            onClick={onCreateRecipe}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Añadir Receta
          </button>
        )}
      </div>

      {/* Grid */}
      {recipes.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-8 text-center border-2 border-dashed border-slate-200">
          <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-medium text-slate-600 mb-2">
            No hay {config.label.toLowerCase()} aún
          </h4>
          <p className="text-sm text-slate-400 mb-4">
            Añade hasta {MAX_RECIPES} opciones de {config.label.toLowerCase()}
          </p>
          <button
            onClick={onCreateRecipe}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors text-sm"
          >
            Añadir Primera Receta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recipes.map((recipe, index) => (
            <div key={recipe.id} className="relative">
              <span className="absolute -top-2 -left-2 z-10 w-6 h-6 bg-slate-800 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {index + 1}
              </span>
              <RecipeCard
                recipe={recipe}
                onEdit={() => onEditRecipe(recipe)}
                onDelete={() => onDeleteRecipe(recipe)}
              />
            </div>
          ))}

          {/* Add More Card */}
          {canAddMore && recipes.length > 0 && (
            <button
              onClick={onCreateRecipe}
              className="aspect-[4/5] rounded-xl border-2 border-dashed border-slate-200 hover:border-green-400 hover:bg-green-50 transition-colors flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-green-600"
            >
              <Plus className="w-8 h-8" />
              <span className="text-sm font-medium">Añadir</span>
            </button>
          )}
        </div>
      )}

      {/* Full Message */}
      {!canAddMore && (
        <p className="text-center text-sm text-slate-500 bg-slate-50 rounded-xl p-3">
          Has alcanzado el máximo de {MAX_RECIPES} recetas para {config.label.toLowerCase()}
        </p>
      )}
    </div>
  );
}
