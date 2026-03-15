import React from 'react';
import { Coffee, Sun, Moon, Cookie, Flame, Heart, Clock, Image as ImageIcon, Zap } from 'lucide-react';
import { NutritionRecipe, RecipeCategory } from '../../types';

interface RecipeBookCardProps {
  recipe: NutritionRecipe;
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  planLabel?: string;  // e.g. "Febrero 2026" for recipes from other plans
  calorieBadge?: string; // e.g. "1400 kcal" if different from current plan
}

const CATEGORY_CONFIG: Record<RecipeCategory, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.FC<any>;
  label: string;
}> = {
  breakfast: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200 hover:border-amber-300',
    icon: Coffee,
    label: 'Desayuno'
  },
  lunch: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200 hover:border-orange-300',
    icon: Sun,
    label: 'Comida'
  },
  dinner: {
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200 hover:border-indigo-300',
    icon: Moon,
    label: 'Cena'
  },
  snack: {
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200 hover:border-emerald-300',
    icon: Cookie,
    label: 'Snack'
  }
};

export const RecipeBookCard: React.FC<RecipeBookCardProps> = ({ recipe, onClick, isFavorite, onToggleFavorite, planLabel, calorieBadge }) => {
  const config = CATEGORY_CONFIG[recipe.category] || CATEGORY_CONFIG.snack;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border ${config.borderColor} shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group relative overflow-hidden`}
    >
      {onToggleFavorite && (
        <div
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(e); }}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer z-20 backdrop-blur-sm ${isFavorite
              ? 'bg-red-50/95 text-red-500 hover:bg-red-100 scale-110'
              : 'bg-white/85 text-slate-300 hover:bg-white hover:text-slate-400'
            }`}
        >
          <Heart className={`w-4 h-4 transition-all ${isFavorite ? 'fill-current' : ''}`} />
        </div>
      )}

      <div className="relative h-40 w-full overflow-hidden bg-slate-100">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={`h-full w-full ${config.bgColor} flex items-center justify-center`}>
            <div className="flex flex-col items-center gap-2 opacity-70">
              <div className="w-14 h-14 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
                <Icon className={`w-7 h-7 ${config.color}`} />
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                <ImageIcon className="w-3.5 h-3.5" />
                Sin imagen
              </div>
            </div>
          </div>
        )}

        <div className="absolute left-3 bottom-3 flex flex-wrap gap-2 z-10">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-sm ${config.color}`}>
            {config.label}
          </span>
          {recipe.is_sos && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/90 text-white backdrop-blur-sm">
              <Zap className="w-3 h-3" />
              SOS
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {(planLabel || calorieBadge) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {planLabel && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-medium">
                {planLabel}
              </span>
            )}
            {calorieBadge && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-medium border border-amber-200">
                {calorieBadge}
              </span>
            )}
          </div>
        )}

        <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 group-hover:text-green-700 transition-colors mb-3 pr-6">
          {recipe.name}
        </h3>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {recipe.calories != null && recipe.calories > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-semibold">
              <Flame className="w-3 h-3" />
              {recipe.calories} kcal
            </span>
          )}
          {recipe.protein != null && recipe.protein > 0 && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold">
              P: {recipe.protein}g
            </span>
          )}
          {recipe.prep_time_minutes != null && recipe.prep_time_minutes > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
              <Clock className="w-3 h-3" />
              {recipe.prep_time_minutes} min
            </span>
          )}
        </div>

        {recipe.notes && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {recipe.notes}
          </p>
        )}
      </div>
    </button>
  );
};
