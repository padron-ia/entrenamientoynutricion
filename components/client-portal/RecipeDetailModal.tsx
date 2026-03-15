import React from 'react';
import { X, Flame, Coffee, Sun, Moon, Cookie, UtensilsCrossed, ListChecks, MessageSquare, Heart, Clock, Zap, Image as ImageIcon, ChefHat } from 'lucide-react';
import { NutritionRecipe, RecipeCategory, ClientNutritionOverride } from '../../types';

interface RecipeDetailModalProps {
  recipe: NutritionRecipe & { override?: ClientNutritionOverride };
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const CATEGORY_META: Record<RecipeCategory, { icon: React.FC<any>; label: string; gradient: string }> = {
  breakfast: { icon: Coffee, label: 'Desayuno', gradient: 'from-amber-500 to-orange-400' },
  lunch: { icon: Sun, label: 'Comida', gradient: 'from-orange-500 to-red-400' },
  dinner: { icon: Moon, label: 'Cena', gradient: 'from-indigo-500 to-purple-500' },
  snack: { icon: Cookie, label: 'Snack', gradient: 'from-emerald-500 to-teal-400' }
};

function renderPreparationSteps(text?: string) {
  if (!text) return null;
  const rawParts = text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  if (rawParts.length >= 2) {
    return (
      <ol className="space-y-3">
        {rawParts.map((step, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">
              {idx + 1}
            </span>
            <span>{step.replace(/^\d+[.)-]?\s*/, '')}</span>
          </li>
        ))}
      </ol>
    );
  }

  return <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{text}</p>;
}

export function RecipeDetailModal({ recipe, onClose, isFavorite, onToggleFavorite }: RecipeDetailModalProps) {
  const meta = CATEGORY_META[recipe.category] || CATEGORY_META.snack;
  const Icon = meta.icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-56 w-full bg-slate-100 overflow-hidden">
          {recipe.image_url ? (
            <img src={recipe.image_url} alt={recipe.name} className="h-full w-full object-cover" />
          ) : (
            <div className={`h-full w-full bg-gradient-to-r ${meta.gradient} flex items-center justify-center`}>
              <div className="flex flex-col items-center gap-3 text-white/90">
                <div className="p-4 bg-white/15 rounded-3xl backdrop-blur-sm">
                  <Icon className="w-10 h-10" />
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ImageIcon className="w-4 h-4" />
                  Receta sin imagen
                </div>
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className={`p-2 rounded-full transition-all ${
                  isFavorite
                    ? 'bg-white/30 hover:bg-white/40 scale-110 text-white'
                    : 'hover:bg-white/20 text-white'
                }`}
              >
                <Heart className={`w-5 h-5 transition-all ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute left-6 right-6 bottom-6 z-10 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-3 pr-24">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm font-semibold">
                <Icon className="w-4 h-4" />
                {meta.label}
              </span>
              {recipe.is_sos && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/90 text-sm font-bold backdrop-blur-sm">
                  <Zap className="w-4 h-4" />
                  SOS
                </span>
              )}
              {recipe.prep_time_minutes != null && recipe.prep_time_minutes > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm font-semibold">
                  <Clock className="w-4 h-4" />
                  {recipe.prep_time_minutes} min
                </span>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-black leading-tight max-w-2xl pr-24">{recipe.name}</h2>
            {recipe.notes && (
              <p className="mt-2 text-sm text-white/90 max-w-2xl leading-relaxed">{recipe.notes}</p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-wrap gap-3">
            {recipe.calories != null && recipe.calories > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl">
                <Flame className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-xs text-orange-400 font-medium">Calorías</p>
                  <p className="text-lg font-black text-orange-600">{recipe.calories}</p>
                </div>
              </div>
            )}
            {recipe.protein != null && recipe.protein > 0 && (
              <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs text-blue-400 font-medium">Proteína</p>
                <p className="text-lg font-black text-blue-600">{recipe.protein}g</p>
              </div>
            )}
            {recipe.carbs != null && recipe.carbs > 0 && (
              <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-400 font-medium">Carbohidratos</p>
                <p className="text-lg font-black text-amber-600">{recipe.carbs}g</p>
              </div>
            )}
            {recipe.fat != null && recipe.fat > 0 && (
              <div className="px-4 py-2 bg-purple-50 border border-purple-200 rounded-xl">
                <p className="text-xs text-purple-400 font-medium">Grasas</p>
                <p className="text-lg font-black text-purple-600">{recipe.fat}g</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                  <ListChecks className="w-4 h-4 text-green-500" />
                  Ingredientes
                </h3>
                <ul className="space-y-2.5">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                      <span className="font-medium">{ing.name}</span>
                      {ing.quantity > 0 && (
                        <span className="text-slate-400 ml-auto text-xs whitespace-nowrap font-semibold">
                          {ing.quantity} {ing.unit}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recipe.preparation && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                  <UtensilsCrossed className="w-4 h-4 text-indigo-500" />
                  Preparación
                </h3>
                {renderPreparationSteps(recipe.preparation)}
              </div>
            )}
          </div>

          {recipe.leftover_tip && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <ChefHat className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-700">Aprovechamiento</p>
              </div>
              <p className="text-sm text-emerald-700 leading-relaxed">{recipe.leftover_tip}</p>
            </div>
          )}

          {recipe.override?.notes && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <p className="text-sm font-bold text-blue-700">Nota de tu coach</p>
              </div>
              <p className="text-sm text-blue-600">{recipe.override.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
