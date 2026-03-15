import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  Image,
  Flame,
  AlertCircle,
  Clock,
  Zap,
  StickyNote,
  ChefHat
} from 'lucide-react';
import { NutritionRecipe, RecipeCategory, RecipeIngredient } from '../../types';

interface RecipeEditorProps {
  recipe: NutritionRecipe | null;
  category: RecipeCategory;
  onSave: (recipe: Partial<NutritionRecipe>) => Promise<void>;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
  snack: 'Snack'
};

export function RecipeEditor({ recipe, category, onSave, onClose }: RecipeEditorProps) {
  const [name, setName] = useState(recipe?.name || '');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    recipe?.ingredients || [{ name: '', quantity: 0, unit: 'g' }]
  );
  const [preparation, setPreparation] = useState(recipe?.preparation || '');
  const [calories, setCalories] = useState(recipe?.calories?.toString() || '');
  const [protein, setProtein] = useState(recipe?.protein?.toString() || '');
  const [carbs, setCarbs] = useState(recipe?.carbs?.toString() || '');
  const [fat, setFat] = useState(recipe?.fat?.toString() || '');
  const [fiber, setFiber] = useState(recipe?.fiber?.toString() || '');
  const [imageUrl, setImageUrl] = useState(recipe?.image_url || '');
  const [isSos, setIsSos] = useState(!!recipe?.is_sos);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(recipe?.prep_time_minutes?.toString() || '');
  const [leftoverTip, setLeftoverTip] = useState(recipe?.leftover_tip || '');
  const [notes, setNotes] = useState(recipe?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: 0, unit: 'g' }]);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length === 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (
    index: number,
    field: keyof RecipeIngredient,
    value: string | number
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Filter out empty ingredients
      const validIngredients = ingredients.filter(i => i.name.trim());

      await onSave({
        name: name.trim(),
        ingredients: validIngredients,
        preparation: preparation.trim() || undefined,
        calories: calories ? parseInt(calories) : undefined,
        protein: protein ? parseFloat(protein) : undefined,
        carbs: carbs ? parseFloat(carbs) : undefined,
        fat: fat ? parseFloat(fat) : undefined,
        fiber: fiber ? parseFloat(fiber) : undefined,
        image_url: imageUrl.trim() || undefined,
        is_sos: isSos,
        prep_time_minutes: prepTimeMinutes ? parseInt(prepTimeMinutes) : undefined,
        leftover_tip: leftoverTip.trim() || undefined,
        notes: notes.trim() || undefined
      });

      onClose();
    } catch (err: any) {
      console.error('Error saving recipe:', err);
      setError(err.message || 'Error al guardar la receta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {recipe ? 'Editar Receta' : `Nueva Receta de ${CATEGORY_LABELS[category]}`}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Completa los datos de la receta
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre de la Receta *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Tostadas con aguacate y huevo"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                URL de Imagen
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                {imageUrl && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Recipe metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Zap className="w-4 h-4 text-red-500" />
                  Ajustes rápidos
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isSos}
                    onChange={e => setIsSos(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  Marcar como receta SOS
                </label>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tiempo estimado</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={prepTimeMinutes}
                      onChange={e => setPrepTimeMinutes(e.target.value)}
                      placeholder="Ej: 10"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> min
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <StickyNote className="w-4 h-4 text-amber-500" />
                  Notas visibles para cliente
                </div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ej: Muy rápida y saciante. Ideal para días con poco tiempo."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Aprovechamiento / Consejo extra
              </label>
              <div className="relative">
                <textarea
                  value={leftoverTip}
                  onChange={e => setLeftoverTip(e.target.value)}
                  placeholder="Ej: Si haces más pollo hoy, úsalo mañana en una ensalada o cena rápida."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                />
                <ChefHat className="w-4 h-4 text-emerald-500 absolute top-3 right-3" />
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ingredientes
              </label>
              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={ingredient.name}
                      onChange={e => handleIngredientChange(index, 'name', e.target.value)}
                      placeholder="Ingrediente"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                    <input
                      type="number"
                      value={ingredient.quantity || ''}
                      onChange={e => handleIngredientChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="Cant."
                      className="w-20 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                    <select
                      value={ingredient.unit}
                      onChange={e => handleIngredientChange(index, 'unit', e.target.value)}
                      className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm bg-white"
                    >
                      <option value="g">gramos</option>
                      <option value="ml">ml</option>
                      <option value="unidad">unidad</option>
                      <option value="cucharada">cuchda.</option>
                      <option value="taza">taza</option>
                      <option value="pizca">pizca</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(index)}
                      disabled={ingredients.length === 1}
                      className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="mt-2 flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Añadir Ingrediente
              </button>
            </div>

            {/* Preparation */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Preparación
              </label>
              <textarea
                value={preparation}
                onChange={e => setPreparation(e.target.value)}
                placeholder="Describe los pasos para preparar la receta..."
                rows={4}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              />
            </div>

            {/* Macros */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Información Nutricional
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Calorías</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={calories}
                      onChange={e => setCalories(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      kcal
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Proteínas</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={protein}
                      onChange={e => setProtein(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      g
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Carbos</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={carbs}
                      onChange={e => setCarbs(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      g
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Grasas</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={fat}
                      onChange={e => setFat(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      g
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fibra</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={fiber}
                      onChange={e => setFiber(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      g
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Receta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
