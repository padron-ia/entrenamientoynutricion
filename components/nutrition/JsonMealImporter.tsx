import React, { useState } from 'react';
import { X, Loader2, AlertCircle, Check, FileJson, ChevronRight, Flame, Utensils, Edit3 } from 'lucide-react';
import { nutritionService } from '../../services/nutritionService';
import { DietType } from '../../types';
import { parseIntegerFromInput, parseLocalizedNumber } from '../../utils/numberParsing';

interface JsonMealImporterProps {
  currentUser: any;
  onSuccess: (plan: any) => void;
  onClose: () => void;
}

type Step = 'input' | 'preview';

interface ParsedRecipe {
  category: string;
  name: string;
  preparation: string;
  ingredients: { name: string; quantity: number | string; unit: string; section?: string }[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ParsedPlan {
  plan: {
    name: string;
    description?: string;
    target_calories?: number;
    diet_type?: string;
    target_month?: number;
    target_fortnight?: 1 | 2;
    tags?: string[];
    instructions?: string;
  };
  recipes: ParsedRecipe[];
}

export function JsonMealImporter({ currentUser, onSuccess, onClose }: JsonMealImporterProps) {
  const [step, setStep] = useState<Step>('input');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedPlan | null>(null);

  // Editable plan fields
  const [editName, setEditName] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [editDietType, setEditDietType] = useState<DietType | ''>('');

  const handleParse = () => {
    setError(null);
    try {
      let cleaned = jsonText.trim();
      // Remove markdown code fences if present
      cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();

      const parsed = JSON.parse(cleaned) as ParsedPlan;

      // Validate structure
      if (!parsed.plan || !parsed.recipes || !Array.isArray(parsed.recipes)) {
        throw new Error('El JSON debe tener las claves "plan" y "recipes" (array).');
      }

      if (parsed.recipes.length === 0) {
        throw new Error('El array de recetas está vacío.');
      }

      // Validate each recipe has required fields
      for (let i = 0; i < parsed.recipes.length; i++) {
        const r = parsed.recipes[i];
        if (!r.category || !r.name) {
          throw new Error(`Receta #${i + 1} necesita al menos "category" y "name".`);
        }
        // Normalize category
        const validCategories = ['breakfast', 'lunch', 'dinner', 'snack'];
        const categoryMap: Record<string, string> = {
          desayuno: 'breakfast', desayunos: 'breakfast',
          comida: 'lunch', comidas: 'lunch', almuerzo: 'lunch',
          cena: 'dinner', cenas: 'dinner',
          snack: 'snack', snacks: 'snack', merienda: 'snack', meriendas: 'snack'
        };
        const normalizedCat = categoryMap[r.category.toLowerCase()] || r.category.toLowerCase();
        if (!validCategories.includes(normalizedCat)) {
          throw new Error(`Receta "${r.name}": categoría "${r.category}" no válida. Use: breakfast, lunch, dinner, snack.`);
        }
        parsed.recipes[i].category = normalizedCat;

        // Normalize ingredients
        if (r.ingredients && Array.isArray(r.ingredients)) {
          parsed.recipes[i].ingredients = r.ingredients.map(ing => ({
            name: ing.name || '',
            quantity: parseLocalizedNumber(String(ing.quantity ?? '')) || 0,
            unit: ing.unit || 'g',
            section: ing.section
          }));
        } else {
          parsed.recipes[i].ingredients = [];
        }
      }

      setPreviewData(parsed);
      setEditName(parsed.plan.name || '');
      setEditCalories(String(parsed.plan.target_calories || ''));
      setEditDietType((parsed.plan.diet_type as DietType) || '');
      setStep('preview');
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('JSON inválido. Verifica la sintaxis (llaves, comas, comillas).');
      } else {
        setError(err.message || 'Error al parsear el JSON.');
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Create Plan
      const uniqueness = await nutritionService.validatePlanRecipeUniqueness({
        diet_type: (editDietType || previewData.plan.diet_type) as string | undefined,
        target_calories: editCalories ? (parseIntegerFromInput(editCalories) ?? previewData.plan.target_calories) : previewData.plan.target_calories,
        target_month: previewData.plan.target_month,
        target_fortnight: previewData.plan.target_fortnight,
        recipeNames: previewData.recipes.map(r => r.name),
        maxOverlapPct: 20
      });

      if (uniqueness.checked && !uniqueness.isValid) {
        throw new Error(
          `Este plan se parece demasiado al de la quincena anterior (${uniqueness.overlapPct}% de recetas repetidas). ` +
          `Plan previo: ${uniqueness.previousPlanName || 'N/A'}. Cambia recetas hasta <= 20% de solape.`
        );
      }

      const newPlan = await nutritionService.createPlan({
        name: editName || previewData.plan.name,
        description: previewData.plan.description,
        target_calories: editCalories ? (parseIntegerFromInput(editCalories) ?? previewData.plan.target_calories) : previewData.plan.target_calories,
        diet_type: (editDietType || previewData.plan.diet_type) as DietType | undefined,
        target_month: previewData.plan.target_month,
        target_fortnight: previewData.plan.target_fortnight,
        tags: previewData.plan.tags || [],
        instructions: previewData.plan.instructions,
        created_by: currentUser.id
      });

      // 2. Create Recipes Batch
      const recipes = previewData.recipes.map((r, idx) => ({
        plan_id: newPlan.id,
        category: r.category as any,
        name: r.name,
        preparation: r.preparation || '',
        ingredients: r.ingredients.map(ing => ({
          name: ing.name,
          quantity: parseLocalizedNumber(String(ing.quantity ?? '')) || 0,
          unit: ing.unit || 'g',
          ...(ing.section ? { section: ing.section } : {})
        })),
        calories: parseLocalizedNumber(String(r.calories ?? '')) || undefined,
        protein: parseLocalizedNumber(String(r.protein ?? '')) || undefined,
        carbs: parseLocalizedNumber(String(r.carbs ?? '')) || undefined,
        fat: parseLocalizedNumber(String(r.fat ?? '')) || undefined,
        position: idx
      }));

      await nutritionService.createRecipesBatch(recipes);

      onSuccess(newPlan);
    } catch (err: any) {
      console.error('Error importing JSON plan:', err);
      setError(err.message || 'Error al guardar el plan.');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'breakfast': return 'bg-amber-400';
      case 'lunch': return 'bg-orange-500';
      case 'dinner': return 'bg-indigo-600';
      case 'snack': return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'breakfast': return 'Desayuno';
      case 'lunch': return 'Comida';
      case 'dinner': return 'Cena';
      case 'snack': return 'Snack';
      default: return cat;
    }
  };

  const groupedRecipes = previewData?.recipes.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, ParsedRecipe[]>) || {};

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-500 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                <FileJson className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Importar Plan desde JSON</h2>
                <p className="text-green-100 font-medium text-sm">Pega el JSON generado por Gemini u otra herramienta</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {step === 'input' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  JSON del plan nutricional
                </label>
                <textarea
                  value={jsonText}
                  onChange={e => setJsonText(e.target.value)}
                  placeholder={`{\n  "plan": {\n    "name": "Plan 1500kcal - Flexible",\n    "description": "...",\n    "target_calories": 1500,\n    "tags": ["1500kcal"],\n    "instructions": "..."\n  },\n  "recipes": [\n    {\n      "category": "breakfast",\n      "name": "Tostada integral con aguacate",\n      "preparation": "...",\n      "ingredients": [{"name": "Pan integral", "quantity": 60, "unit": "g"}],\n      "calories": 350,\n      "protein": 12,\n      "carbs": 40,\n      "fat": 15\n    }\n  ]\n}`}
                  className="w-full h-80 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm resize-none leading-relaxed"
                />
              </div>

              <button
                onClick={handleParse}
                disabled={!jsonText.trim()}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
                Validar y Previsualizar
              </button>
            </div>
          )}

          {step === 'preview' && previewData && (
            <div className="space-y-6">
              {/* Editable Plan Info */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Edit3 className="w-4 h-4" />
                  Datos del plan (editables)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Calorías</label>
                    <input
                      type="number"
                      value={editCalories}
                      onChange={e => setEditCalories(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Dieta</label>
                    <select
                      value={editDietType}
                      onChange={e => setEditDietType(e.target.value as DietType)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    >
                      <option value="">Sin especificar</option>
                      <option value="Flexible">Flexible</option>
                      <option value="Control Glucémico">Control Glucémico</option>
                      <option value="Sin Gluten + Sin Lactosa">Sin Gluten + Sin Lactosa</option>
                      <option value="Digestivo Sensible">Digestivo Sensible</option>
                      <option value="Vegetariano">Vegetariano</option>
                      <option value="Sin Carne Roja">Sin Carne Roja</option>
                      <option value="Pescetariano">Pescetariano</option>
                      <option value="Fácil / Baja Adherencia">Fácil / Baja Adherencia</option>
                      <option value="Especial Clínico">Especial Clínico</option>
                    </select>
                  </div>
                </div>
                {previewData.plan.description && (
                  <p className="text-sm text-slate-500 italic">{previewData.plan.description}</p>
                )}
              </div>

              {/* Recipes by Category */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">
                  {previewData.recipes.length} recetas encontradas
                </h3>
                <div className="flex gap-2">
                  {Object.entries(groupedRecipes).map(([cat, recs]) => (
                    <span key={cat} className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getCategoryColor(cat)}`}>
                      {getCategoryLabel(cat)}: {recs.length}
                    </span>
                  ))}
                </div>
              </div>

              {Object.entries(groupedRecipes).map(([category, categoryRecipes]) => (
                <div key={category} className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${getCategoryColor(category)}`} />
                    {getCategoryLabel(category)}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryRecipes.map((recipe, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 hover:border-green-200 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-bold text-slate-800 text-sm flex-1">{recipe.name}</h5>
                        </div>
                        <div className="flex gap-2 text-xs font-semibold">
                          {recipe.calories > 0 && (
                            <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Flame className="w-3 h-3" /> {recipe.calories} kcal
                            </span>
                          )}
                          {recipe.protein > 0 && (
                            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">P: {recipe.protein}g</span>
                          )}
                          {recipe.carbs > 0 && (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">C: {recipe.carbs}g</span>
                          )}
                          {recipe.fat > 0 && (
                            <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">G: {recipe.fat}g</span>
                          )}
                        </div>
                        {recipe.ingredients.length > 0 && (
                          <p className="text-xs text-slate-400 mt-2">{recipe.ingredients.length} ingredientes</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-white">
          {step === 'preview' && (
            <button
              onClick={() => { setStep('input'); setError(null); }}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium"
            >
              Volver al JSON
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium"
          >
            Cancelar
          </button>
          {step === 'preview' && (
            <button
              onClick={handleConfirmImport}
              disabled={loading}
              className="px-8 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {loading ? 'Guardando...' : 'Confirmar y Guardar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
