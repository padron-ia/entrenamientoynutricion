import React from 'react';
import { Edit2, Trash2, Flame, Clock, AlertCircle, ImageIcon } from 'lucide-react';
import { NutritionRecipe } from '../../types';

interface RecipeCardProps {
  recipe: NutritionRecipe;
  onEdit: () => void;
  onDelete: () => void;
}

export function RecipeCard({ recipe, onEdit, onDelete }: RecipeCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="aspect-video bg-slate-100 relative overflow-hidden">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-slate-300" />
          </div>
        )}

        {/* Draft Badge */}
        {recipe.is_draft && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Sin publicar
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 bg-white/90 hover:bg-white text-slate-600 hover:text-blue-600 rounded-lg transition-colors shadow-sm"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 bg-white/90 hover:bg-white text-slate-600 hover:text-red-600 rounded-lg transition-colors shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className="font-semibold text-slate-800 mb-2 line-clamp-1">{recipe.name}</h4>

        {/* Macros */}
        <div className="flex flex-wrap gap-2 text-xs">
          {recipe.calories && (
            <span className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-600 rounded-lg">
              <Flame className="w-3 h-3" />
              {recipe.calories} kcal
            </span>
          )}
          {recipe.protein && (
            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">
              P: {recipe.protein}g
            </span>
          )}
          {recipe.carbs && (
            <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg">
              C: {recipe.carbs}g
            </span>
          )}
          {recipe.fat && (
            <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg">
              G: {recipe.fat}g
            </span>
          )}
        </div>

        {/* Ingredients Preview */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <p className="text-xs text-slate-500 mt-2 line-clamp-2">
            {recipe.ingredients.map(i => i.name).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
