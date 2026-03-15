import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Send,
  Settings,
  Coffee,
  Sun,
  Moon,
  Cookie,
  AlertCircle,
  CheckCircle2,
  Flame,
  FileText,
  ChefHat,
  Calendar,
  ShieldCheck,
  Zap,
  CircleAlert
} from 'lucide-react';
import { NutritionPlan, NutritionRecipe, RecipeCategory, User, DietType } from '../../types';
import { nutritionService } from '../../services/nutritionService';
import { RecipeGrid } from './RecipeGrid';
import { RecipeEditor } from './RecipeEditor';
import { parseIntegerFromInput } from '../../utils/numberParsing';

interface NutritionPlanEditorProps {
  plan: NutritionPlan;
  currentUser: User;
  onBack: () => void;
  onPlanUpdated: (plan: NutritionPlan) => void;
}

type TabType = 'info' | 'intro' | 'breakfast' | 'lunch' | 'dinner' | 'snack';

export function NutritionPlanEditor({
  plan,
  currentUser,
  onBack,
  onPlanUpdated
}: NutritionPlanEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Plan info editing
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description || '');
  const [targetCalories, setTargetCalories] = useState(plan.target_calories?.toString() || '');
  const [tags, setTags] = useState(plan.tags?.join(', ') || '');
  const [instructions, setInstructions] = useState(plan.instructions || '');
  const [dietType, setDietType] = useState<DietType | ''>(plan.diet_type || '');
  const [targetMonth, setTargetMonth] = useState(plan.target_month?.toString() || '');
  const [targetFortnight, setTargetFortnight] = useState(plan.target_fortnight?.toString() || '');

  // Block Content State
  const [introContent, setIntroContent] = useState(plan.intro_content || '');
  const [breakfastContent, setBreakfastContent] = useState(plan.breakfast_content || '');
  const [lunchContent, setLunchContent] = useState(plan.lunch_content || '');
  const [dinnerContent, setDinnerContent] = useState(plan.dinner_content || '');
  const [snackContent, setSnackContent] = useState(plan.snack_content || '');

  // Recipe editing state
  const [recipes, setRecipes] = useState<NutritionRecipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [editingRecipe, setEditingRecipe] = useState<NutritionRecipe | null>(null);
  const [creatingCategory, setCreatingCategory] = useState<RecipeCategory | null>(null);

  // Fetch recipes on mount
  useEffect(() => {
    const loadRecipes = async () => {
      setRecipesLoading(true);
      try {
        const data = await nutritionService.getRecipesByPlan(plan.id);
        setRecipes(data);
      } catch (err) {
        console.error('Error loading recipes:', err);
      } finally {
        setRecipesLoading(false);
      }
    };
    loadRecipes();
  }, [plan.id]);

  const getRecipesByCategory = (category: RecipeCategory) =>
    recipes.filter(r => r.category === category).sort((a, b) => a.position - b.position);

  const planValidation = nutritionService.validatePlanStructure(recipes);

  const getCategorySummary = (category: RecipeCategory) => {
    const categoryRecipes = getRecipesByCategory(category);
    const sos = categoryRecipes.filter(r => r.is_sos).length;
    const standard = categoryRecipes.length - sos;
    return { total: categoryRecipes.length, sos, standard };
  };

  const tabs: { id: TabType; label: string; icon: React.FC<any> }[] = [
    { id: 'info', label: 'Configuración', icon: Settings },
    { id: 'intro', label: 'Introducción', icon: FileText },
    { id: 'breakfast', label: 'Desayunos', icon: Coffee },
    { id: 'lunch', label: 'Comidas', icon: Sun },
    { id: 'dinner', label: 'Cenas', icon: Moon },
    { id: 'snack', label: 'Snacks', icon: Cookie }
  ];

  const handleSavePlanInfo = async () => {
    try {
      setSaving(true);
      setError(null);
      const parsedFortnight = parseIntegerFromInput(targetFortnight);
      const updated = await nutritionService.updatePlan(plan.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        target_calories: targetCalories ? (parseIntegerFromInput(targetCalories) ?? undefined) : undefined,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        instructions: instructions.trim() || undefined,
        diet_type: dietType || undefined,
        target_month: targetMonth ? (parseIntegerFromInput(targetMonth) ?? undefined) : undefined,
        target_fortnight: parsedFortnight === 1 || parsedFortnight === 2 ? parsedFortnight : undefined,
        intro_content: introContent.trim() || null,
        breakfast_content: breakfastContent.trim() || null,
        lunch_content: lunchContent.trim() || null,
        dinner_content: dinnerContent.trim() || null,
        snack_content: snackContent.trim() || null
      });
      onPlanUpdated(updated);
      setSuccess('Plan guardado correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving plan:', err);
      setError(err.message || 'Error al guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('¿Publicar este plan? Los clientes asignados podrán ver los cambios inmediatamente.')) return;

    try {
      setPublishing(true);
      setError(null);
      const updated = await nutritionService.publishPlan(plan.id, currentUser.id);
      onPlanUpdated(updated);
      setSuccess('Plan publicado correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error publishing plan:', err);
      setError(err.message || 'Error al publicar el plan');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!confirm('¿Despublicar este plan? Los clientes dejarán de ver las actualizaciones hasta que lo vuelvas a publicar.')) return;

    try {
      setSaving(true);
      setError(null);
      const updated = await nutritionService.unpublishPlan(plan.id);
      onPlanUpdated(updated);
      setSuccess('Plan despublicado');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error unpublishing plan:', err);
      setError(err.message || 'Error al despublicar el plan');
    } finally {
      setSaving(false);
    }
  };

  // --- Recipe CRUD handlers ---
  const handleSaveRecipe = async (data: Partial<NutritionRecipe>) => {
    const isPublished = plan.status === 'published';
    if (editingRecipe) {
      const updated = await nutritionService.updateRecipe(editingRecipe.id, {
        ...data,
        is_draft: isPublished ? false : undefined
      });
      setRecipes(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSuccess('Receta actualizada');
    } else if (creatingCategory) {
      const maxPos = getRecipesByCategory(creatingCategory).reduce((max, r) => Math.max(max, r.position), -1);
      const created = await nutritionService.createRecipe({
        ...data,
        plan_id: plan.id,
        category: creatingCategory,
        position: maxPos + 1,
        is_draft: isPublished ? false : true
      });
      setRecipes(prev => [...prev, created]);
      setSuccess('Receta creada');
    }
    setTimeout(() => setSuccess(null), 3000);
    setEditingRecipe(null);
    setCreatingCategory(null);
  };

  const handleDeleteRecipe = async (recipe: NutritionRecipe) => {
    if (!confirm(`¿Eliminar "${recipe.name}"?`)) return;
    try {
      await nutritionService.deleteRecipe(recipe.id);
      setRecipes(prev => prev.filter(r => r.id !== recipe.id));
      setSuccess('Receta eliminada');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  const renderBlockEditor = (
    value: string,
    setValue: (val: string) => void,
    placeholder: string
  ) => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full h-[60vh] p-6 text-base text-slate-700 focus:outline-none resize-none font-mono"
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSavePlanInfo}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar Bloque'}
        </button>
      </div>
    </div>
  );

  const renderMealTab = (category: RecipeCategory, blockContent: string, setBlockContent: (v: string) => void, placeholder: string) => {
    const categoryRecipes = getRecipesByCategory(category);
    const hasRecipes = categoryRecipes.length > 0 || !recipesLoading;

    return (
      <div className="space-y-6">
        {/* Recipe Grid — siempre visible para poder añadir/editar recetas */}
        <RecipeGrid
          category={category}
          recipes={categoryRecipes}
          loading={recipesLoading}
          onCreateRecipe={() => setCreatingCategory(category)}
          onEditRecipe={(recipe) => setEditingRecipe(recipe)}
          onDeleteRecipe={handleDeleteRecipe}
        />

        {/* Bloque de texto adicional (colapsable) */}
        {blockContent?.trim() && (
          <details className="group">
            <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700 font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notas adicionales en texto libre
            </summary>
            <div className="mt-3">
              {renderBlockEditor(blockContent, setBlockContent, placeholder)}
            </div>
          </details>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800">{plan.name}</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${plan.status === 'published'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
                  }`}
              >
                {plan.status === 'published' ? 'Publicado' : 'Borrador'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              {plan.target_calories && (
                <p className="text-slate-500 flex items-center gap-1 text-sm">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  {plan.target_calories} kcal
                </p>
              )}
              {plan.diet_type && (
                <p className="text-slate-500 flex items-center gap-1 text-sm">
                  <ChefHat className="w-3.5 h-3.5 text-green-600" />
                  {plan.diet_type}
                </p>
              )}
              {(plan.target_month || plan.target_fortnight) && (
                <p className="text-blue-600 flex items-center gap-1 text-sm font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  ID Técnico: {plan.diet_type || '?'}_{plan.target_calories || '?'}_M{plan.target_month || '?'}_Q{plan.target_fortnight || '?'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {plan.status === 'published' ? (
            <button
              onClick={handleUnpublish}
              disabled={saving}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-xl transition-colors"
            >
              Despublicar
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={publishing || !planValidation.valid}
              title={!planValidation.valid ? 'El plan aún no cumple la estructura mínima para publicarse' : undefined}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
              {publishing ? 'Publicando...' : 'Publicar'}
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 whitespace-pre-wrap">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Validation summary */}
      <div className={`rounded-2xl border p-5 shadow-sm ${planValidation.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {planValidation.valid ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ) : (
                <CircleAlert className="w-5 h-5 text-amber-600" />
              )}
              <h3 className={`text-lg font-bold ${planValidation.valid ? 'text-emerald-800' : 'text-amber-900'}`}>
                Estado de validación del plan
              </h3>
            </div>
            <p className={`text-sm ${planValidation.valid ? 'text-emerald-700' : 'text-amber-800'}`}>
              {planValidation.valid
                ? 'Este plan cumple la estructura mínima para poder publicarse.'
                : 'Este plan todavía no cumple la estructura mínima para publicarse.'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full lg:w-auto">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as RecipeCategory[]).map(category => {
              const summary = getCategorySummary(category);
              const labelMap: Record<RecipeCategory, string> = {
                breakfast: 'Desayunos',
                lunch: 'Comidas',
                dinner: 'Cenas',
                snack: 'Snacks'
              };
              return (
                <div key={category} className="bg-white/80 rounded-xl border border-white px-4 py-3 min-w-[120px]">
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-bold">{labelMap[category]}</p>
                  <p className="text-xl font-black text-slate-800 mt-1">{summary.total}</p>
                  {category === 'snack' ? (
                    <p className="text-xs text-slate-500">mínimo 6</p>
                  ) : (
                    <p className="text-xs text-slate-500">{summary.standard} normales · {summary.sos} SOS</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {!planValidation.valid && (
          <div className="mt-4 bg-white/70 rounded-xl border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-3 text-amber-900 font-semibold text-sm">
              <Zap className="w-4 h-4 text-amber-600" />
              Cosas que faltan antes de publicar
            </div>
            <ul className="space-y-2 text-sm text-amber-900">
              {planValidation.issues.slice(0, 12).map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  <span>{issue}</span>
                </li>
              ))}
              {planValidation.issues.length > 12 && (
                <li className="text-xs text-amber-700 font-medium">
                  ...y {planValidation.issues.length - 12} incidencias más.
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-green-600 text-green-600 bg-green-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500">Preparando contenido del plan...</p>
            </div>
          ) : (
            <>
              {/* Info Tab */}
              {activeTab === 'info' && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nombre del Plan *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Instrucciones del Coach
                    </label>
                    <textarea
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                      placeholder="Ej: Beber abundante agua, evitar fritos, masticar bien..."
                      rows={4}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Calorías Objetivo
                      </label>
                      <input
                        type="number"
                        value={targetCalories}
                        onChange={e => setTargetCalories(e.target.value)}
                        placeholder="Ej: 1500"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Tipo de Alimentación (Auto-asignación)
                      </label>
                      <select
                        value={dietType}
                        onChange={e => setDietType(e.target.value as DietType)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">No definido</option>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Mes (Auto-asignación)
                      </label>
                      <select
                        value={targetMonth}
                        onChange={e => setTargetMonth(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">No definido</option>
                        {[...Array(12)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2024, i, 1))}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Quincena (Auto-asignación)
                      </label>
                      <select
                        value={targetFortnight}
                        onChange={e => setTargetFortnight(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">No definida</option>
                        <option value="1">1ª Quincena (Días 1-15)</option>
                        <option value="2">2ª Quincena (Días 16-31)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Etiquetas Libres
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={e => setTags(e.target.value)}
                      placeholder="diabetes, experto..."
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSavePlanInfo}
                      disabled={saving || !name.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/20"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Guardando...' : 'Guardar Info General'}
                    </button>
                  </div>
                </div>
              )}

              {/* Intro Tab */}
              {activeTab === 'intro' && (
                renderBlockEditor(introContent, setIntroContent, 'Escribe la introducción del plan aquí...')
              )}

              {/* Meal Tabs — RecipeGrid + Editor */}
              {activeTab === 'breakfast' && renderMealTab('breakfast', breakfastContent, setBreakfastContent, 'Notas adicionales de desayuno...')}
              {activeTab === 'lunch' && renderMealTab('lunch', lunchContent, setLunchContent, 'Notas adicionales de comida...')}
              {activeTab === 'dinner' && renderMealTab('dinner', dinnerContent, setDinnerContent, 'Notas adicionales de cena...')}
              {activeTab === 'snack' && renderMealTab('snack', snackContent, setSnackContent, 'Notas adicionales de snack...')}
            </>
          )}
        </div>
      </div>

      {/* Recipe Editor Modal */}
      {(editingRecipe || creatingCategory) && (
        <RecipeEditor
          recipe={editingRecipe}
          category={editingRecipe?.category as RecipeCategory || creatingCategory!}
          onSave={handleSaveRecipe}
          onClose={() => { setEditingRecipe(null); setCreatingCategory(null); }}
        />
      )}
    </div>
  );
}
