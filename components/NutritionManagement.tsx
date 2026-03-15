import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  ChefHat,
  Users,
  Clock,
  Edit2,
  Trash2,
  Tag,
  Flame,
  FileText,
  AlertCircle,
  Upload,
  Copy,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Layers3,
  ShieldPlus,
  Sparkles,
  Archive,
  FolderOpen
} from 'lucide-react';
import { NutritionPlan, User, DietType } from '../types';
import { nutritionService } from '../services/nutritionService';
import { NutritionPlanEditor } from './nutrition/NutritionPlanEditor';
import { PlanAssigner } from './nutrition/PlanAssigner';
import { JsonMealImporter } from './nutrition/JsonMealImporter';

interface NutritionManagementProps {
  currentUser: User;
}

export function NutritionManagement({ currentUser }: NutritionManagementProps) {
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<NutritionPlan | null>(null);
  const [assigningPlan, setAssigningPlan] = useState<NutritionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPlanTypeSelector, setShowPlanTypeSelector] = useState(false);
  const [showJsonImporter, setShowJsonImporter] = useState(false);

  // Active Period
  const [activePeriod, setActivePeriod] = useState<{ month: number; fortnight: number } | null>(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // Filters
  const [dietTypeFilter, setDietTypeFilter] = useState<DietType | 'all'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [fortnightFilter, setFortnightFilter] = useState<'all' | '1' | '2'>('all');
  const [librarySection, setLibrarySection] = useState<'all' | 'base' | 'clinico' | 'especial' | 'archived'>('all');
  const [familyFilter, setFamilyFilter] = useState<string>('all');

  // New plan form
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDescription, setNewPlanDescription] = useState('');
  const [newPlanCalories, setNewPlanCalories] = useState('');
  const [newPlanDietType, setNewPlanDietType] = useState<DietType | ''>('');
  const [newPlanMonth, setNewPlanMonth] = useState<string>('');
  const [newPlanFortnight, setNewPlanFortnight] = useState<string>('');
  const [newPlanTags, setNewPlanTags] = useState('');
  const [creating, setCreating] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await nutritionService.getPlans(
        statusFilter === 'all' ? undefined : { status: statusFilter }
      );
      setPlans(data);
    } catch (err: any) {
      console.error('Error loading plans:', err);
      setError(err.message || 'Error al cargar los planes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    nutritionService.getActivePeriod().then(setActivePeriod).catch(console.error);
  }, []);

  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) return;

    try {
      setCreating(true);
      const plan = await nutritionService.createPlan({
        name: newPlanName.trim() || `${newPlanDietType} ${newPlanCalories} kcal - ${newPlanMonth ? new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(2024, parseInt(newPlanMonth) - 1, 1)) : ''}${newPlanFortnight ? ` Q${newPlanFortnight}` : ''}`.trim(),
        description: newPlanDescription.trim() || undefined,
        target_calories: newPlanCalories ? parseInt(newPlanCalories) : undefined,
        diet_type: newPlanDietType as DietType || undefined,
        target_month: newPlanMonth ? parseInt(newPlanMonth) : undefined,
        target_fortnight: newPlanFortnight ? parseInt(newPlanFortnight) as 1 | 2 : undefined,
        tags: newPlanTags ? newPlanTags.split(',').map(t => t.trim()).filter(Boolean) : [],
        created_by: currentUser.id
      });

      setShowCreateModal(false);
      setNewPlanName('');
      setNewPlanDescription('');
      setNewPlanCalories('');
      setNewPlanDietType('');
      setNewPlanMonth('');
      setNewPlanFortnight('');
      setNewPlanTags('');

      // Open editor for the new plan
      setEditingPlan(plan);
    } catch (err: any) {
      console.error('Error creating plan:', err);
      setError(err.message || 'Error al crear el plan');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlan = async (plan: NutritionPlan) => {
    if (!confirm(`¿Eliminar el plan "${plan.name}"? Esta acción no se puede deshacer.`)) return;

    try {
      await nutritionService.deletePlan(plan.id);
      setPlans(prev => prev.filter(p => p.id !== plan.id));
    } catch (err: any) {
      console.error('Error deleting plan:', err);
      setError(err.message || 'Error al eliminar el plan');
    }
  };

  const handleClonePlan = async (plan: NutritionPlan) => {
    try {
      setLoading(true);
      const cloned = await nutritionService.clonePlan(plan.id, currentUser.id);
      setPlans(prev => [cloned, ...prev]);
      setEditingPlan(cloned); // Open the editor for the clone
    } catch (err: any) {
      console.error('Error cloning plan:', err);
      setError(err.message || 'Error al clonar el plan');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancePeriod = async () => {
    try {
      setAdvancing(true);
      const newPeriod = await nutritionService.advancePeriod(currentUser.id);
      setActivePeriod(newPeriod);
      setShowAdvanceModal(false);
    } catch (err: any) {
      console.error('Error advancing period:', err);
      setError(err.message || 'Error al avanzar la quincena');
    } finally {
      setAdvancing(false);
    }
  };

  const getMonthName = (month: number) =>
    new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2024, month - 1, 1));

  const getNextPeriod = () => {
    if (!activePeriod) return { month: 1, fortnight: 1 };
    if (activePeriod.fortnight === 1) return { month: activePeriod.month, fortnight: 2 };
    return { month: activePeriod.month === 12 ? 1 : activePeriod.month + 1, fortnight: 1 };
  };

  const getPlanSection = (plan: NutritionPlan): 'base' | 'clinico' | 'especial' | 'archived' => {
    const tags = (plan.tags || []).map(t => t.toLowerCase());
    const name = (plan.name || '').toLowerCase();
    if ((plan.status as any) === 'archived' || tags.includes('archived') || name.startsWith('archived ·')) return 'archived';
    if (tags.includes('especial') || name.includes('ramadán') || name.includes('ramadan')) return 'especial';
    if (tags.includes('clinico') || plan.diet_type === 'Especial Clínico' || plan.diet_type === 'Digestivo Sensible') return 'clinico';
    return 'base';
  };

  const getPlanFamily = (plan: NutritionPlan): string => {
    const name = plan.name || '';
    const dietType = plan.diet_type || '';
    if (/^Flexible/.test(name) || dietType === 'Flexible') return 'Flexible';
    if (name.includes('Sin Carne Roja') || dietType === 'Sin Carne Roja') return 'Sin Carne Roja';
    if (name.includes('Sin Gluten + Sin Lactosa') || name.includes('Sin Gluten') || dietType === 'Sin Gluten + Sin Lactosa') return 'Sin Gluten + Sin Lactosa';
    if (name.includes('Vegetariano') || dietType === 'Vegetariano') return 'Vegetariano';
    if (name.includes('Digestivo Sensible') || name.includes('FODMAP')) return 'Digestivo Sensible / FODMAPs';
    if (name.includes('Protección Biliar')) return 'Protección Biliar';
    if (name.includes('Purinas')) return 'Baja en Purinas';
    if (name.includes('Glucémico') || name.includes('Renal')) return 'Control Glucémico y Renal';
    if (name.includes('Hierro')) return 'Mejora de Hierro';
    if (name.includes('Ramad')) return 'Ramadán Terapéutico';
    return dietType || 'Otros';
  };

  const filteredPlans = plans.filter(plan => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      plan.name.toLowerCase().includes(query) ||
      plan.description?.toLowerCase().includes(query) ||
      plan.tags?.some(t => t.toLowerCase().includes(query));

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && plan.status !== statusFilter) return false;
    if (dietTypeFilter !== 'all' && plan.diet_type !== dietTypeFilter) return false;
    if (monthFilter !== 'all' && plan.target_month !== parseInt(monthFilter)) return false;
    if (fortnightFilter !== 'all' && plan.target_fortnight !== parseInt(fortnightFilter)) return false;
    if (librarySection !== 'all' && getPlanSection(plan) !== librarySection) return false;
    if (familyFilter !== 'all' && getPlanFamily(plan) !== familyFilter) return false;
    if (librarySection !== 'archived' && getPlanSection(plan) === 'archived') return false;
    return true;
  });

  const familyCards = [
    { key: 'Flexible', label: 'Flexible', description: 'Biblioteca base general', icon: Layers3, section: 'base' as const },
    { key: 'Sin Gluten + Sin Lactosa', label: 'Sin Gluten + Sin Lactosa', description: 'Base digestiva sin gluten', icon: ShieldPlus, section: 'base' as const },
    { key: 'Sin Carne Roja', label: 'Sin Carne Roja', description: 'Base mediterránea sin carne roja', icon: ChefHat, section: 'base' as const },
    { key: 'Vegetariano', label: 'Vegetariano', description: 'Biblioteca vegetariana', icon: Sparkles, section: 'base' as const },
    { key: 'Clínicos', label: 'Clínicos', description: 'Planes terapéuticos y específicos', icon: FolderOpen, section: 'clinico' as const },
    { key: 'Especiales', label: 'Especiales', description: 'Temporales o contextuales', icon: Archive, section: 'especial' as const },
  ];

  const familySummary = familyCards.map(card => {
    const matching = plans.filter(plan => {
      const section = getPlanSection(plan);
      const family = getPlanFamily(plan);
      if (card.key === 'Clínicos') return section === 'clinico';
      if (card.key === 'Especiales') return section === 'especial';
      return section === card.section && family === card.key;
    });
    return {
      ...card,
      total: matching.length,
      published: matching.filter(plan => plan.status === 'published').length,
      draft: matching.filter(plan => plan.status === 'draft').length,
    };
  });

  const groupedPlans = filteredPlans.reduce((acc, plan) => {
    const monthKey = plan.target_month
      ? `${plan.target_month}-${getMonthName(plan.target_month)}`
      : '0-Sin mes';
    const fortnightKey = plan.target_fortnight === 1
      ? 'Q1'
      : plan.target_fortnight === 2
        ? 'Q2'
        : 'Sin quincena';

    if (!acc[monthKey]) acc[monthKey] = {};
    if (!acc[monthKey][fortnightKey]) acc[monthKey][fortnightKey] = [];
    acc[monthKey][fortnightKey].push(plan);
    return acc;
  }, {} as Record<string, Record<string, NutritionPlan[]>>);

  const sortedMonthEntries = Object.entries(groupedPlans).sort((a, b) => {
    const monthA = Number(a[0].split('-')[0]);
    const monthB = Number(b[0].split('-')[0]);
    return monthA - monthB;
  });

  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedFortnightKey, setSelectedFortnightKey] = useState<string | null>(null);

  useEffect(() => {
    if (!sortedMonthEntries.length) {
      setSelectedMonthKey(null);
      setSelectedFortnightKey(null);
      return;
    }
    if (!selectedMonthKey || !groupedPlans[selectedMonthKey]) {
      const firstMonth = sortedMonthEntries[0][0];
      setSelectedMonthKey(firstMonth);
      const firstFortnight = Object.keys(groupedPlans[firstMonth] || {})[0] || null;
      setSelectedFortnightKey(firstFortnight);
      return;
    }
    const fortnights = Object.keys(groupedPlans[selectedMonthKey] || {});
    if (!selectedFortnightKey || !fortnights.includes(selectedFortnightKey)) {
      setSelectedFortnightKey(fortnights[0] || null);
    }
  }, [selectedMonthKey, selectedFortnightKey, sortedMonthEntries]);

  // If editing a plan, show the editor
  if (editingPlan) {
    return (
      <NutritionPlanEditor
        plan={editingPlan}
        currentUser={currentUser}
        onBack={() => {
          setEditingPlan(null);
          loadPlans();
        }}
        onPlanUpdated={(updated) => {
          setEditingPlan(updated);
          setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-green-600" />
            Planes Nutricionales
          </h1>
          <p className="text-slate-500 mt-1">
            Crea y gestiona planes de alimentación estructurados
          </p>
        </div>

        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => setShowPlanTypeSelector(!showPlanTypeSelector)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-600/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nuevo Plan
          </button>

          {/* Plan Type Selector Dropdown */}
          {showPlanTypeSelector && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de plan</p>
              </div>
              <button
                onClick={() => {
                  setShowPlanTypeSelector(false);
                  setShowCreateModal(true);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-green-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Menú Rápido</p>
                  <p className="text-xs text-slate-500">Crear plan y pegar texto por bloques</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowPlanTypeSelector(false);
                  setShowJsonImporter(true);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left border-t border-slate-100"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Menú Avanzado</p>
                  <p className="text-xs text-slate-500">Importar JSON con recetas estructuradas</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Period Banner */}
      {activePeriod && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl shadow-sm border border-indigo-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Quincena Activa</p>
              <p className="text-lg font-black text-indigo-800 capitalize">
                {getMonthName(activePeriod.month)} Q{activePeriod.fortnight}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAdvanceModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-sm active:scale-95 text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            Publicar Nueva Quincena
          </button>
        </div>
      )}

      {/* Advance Period Confirmation Modal */}
      {showAdvanceModal && activePeriod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Publicar Nueva Quincena</h3>
              <p className="text-sm text-slate-500 mt-2">
                Se avanzará el periodo activo de nutrición.
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="text-center">
                <p className="text-xs text-slate-400 font-medium">Actual</p>
                <p className="text-base font-bold text-slate-700 capitalize">
                  {getMonthName(activePeriod.month)} Q{activePeriod.fortnight}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-indigo-500" />
              <div className="text-center">
                <p className="text-xs text-indigo-500 font-medium">Siguiente</p>
                <p className="text-base font-bold text-indigo-700 capitalize">
                  {getMonthName(getNextPeriod().month)} Q{getNextPeriod().fortnight}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                Todos los clientes con asignación automática verán el plan de la nueva quincena.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                disabled={advancing}
              >
                Cancelar
              </button>
              <button
                onClick={handleAdvancePeriod}
                disabled={advancing}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {advancing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o etiquetas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm font-medium"
            >
              <option value="all">Todos los Estados</option>
              <option value="draft">Borradores</option>
              <option value="published">Publicados</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
            <Filter className="w-4 h-4" />
            Asignación Automática:
          </div>
          <select
            value={dietTypeFilter}
            onChange={e => setDietTypeFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-slate-50 text-sm"
          >
            <option value="all">Cualquier Dieta</option>
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

          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-slate-50 text-sm"
          >
            <option value="all">Mes (Todos)</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2024, i, 1))}
              </option>
            ))}
          </select>

          <select
            value={fortnightFilter}
            onChange={e => setFortnightFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-slate-50 text-sm"
          >
            <option value="all">Quincena (Cualquiera)</option>
            <option value="1">1ª Quincena</option>
            <option value="2">2ª Quincena</option>
          </select>

          <div className="ml-auto text-sm text-slate-500 font-medium">
            {filteredPlans.length} {filteredPlans.length === 1 ? 'plan encontrado' : 'planes encontrados'}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Landing by families */}
      {!loading && !searchQuery && librarySection === 'all' && familyFilter === 'all' && statusFilter === 'all' && monthFilter === 'all' && fortnightFilter === 'all' && dietTypeFilter === 'all' && (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Biblioteca organizada por familias</h3>
              <p className="text-sm text-slate-600 mt-1">Entra primero en la familia que quieras gestionar: base, clínica o especial. Así evitamos el ruido visual de todos los planes mezclados.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {familySummary.map(card => (
              <button
                key={card.key}
                onClick={() => {
                  if (card.key === 'Clínicos') {
                    setLibrarySection('clinico');
                    setFamilyFilter('all');
                  } else if (card.key === 'Especiales') {
                    setLibrarySection('especial');
                    setFamilyFilter('all');
                  } else {
                    setLibrarySection(card.section);
                    setFamilyFilter(card.key);
                  }
                }}
                className="text-left bg-white rounded-2xl p-6 border border-slate-200 hover:border-green-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                    <card.icon className="w-6 h-6 text-green-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">{card.label}</h3>
                <p className="text-sm text-slate-500 mt-1">{card.description}</p>
                <div className="mt-4 flex items-center gap-3 text-xs">
                  <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">{card.total} planes</span>
                  <span className="px-2 py-1 rounded-lg bg-green-50 text-green-700 font-semibold">{card.published} publicados</span>
                  <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold">{card.draft} drafts</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {(librarySection !== 'all' || familyFilter !== 'all') && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLibrarySection('all');
              setFamilyFilter('all');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a familias
          </button>
          <div className="text-sm text-slate-500">
            Viendo: <span className="font-semibold text-slate-700">{familyFilter !== 'all' ? familyFilter : librarySection === 'clinico' ? 'Clínicos' : librarySection === 'especial' ? 'Especiales' : librarySection}</span>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      {(!loading && !searchQuery && librarySection === 'all' && familyFilter === 'all' && statusFilter === 'all' && monthFilter === 'all' && fortnightFilter === 'all' && dietTypeFilter === 'all') ? null : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-6"></div>
              <div className="flex gap-2 mb-4">
                <div className="h-6 bg-slate-200 rounded w-20"></div>
                <div className="h-6 bg-slate-200 rounded w-16"></div>
              </div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <ChefHat className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            {searchQuery ? 'No se encontraron planes' : 'No hay planes nutricionales'}
          </h3>
          <p className="text-slate-500 mb-6">
            {searchQuery
              ? 'Intenta con otros términos de búsqueda'
              : 'Crea tu primer plan nutricional para empezar'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
            >
              Crear Plan
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {sortedMonthEntries.length > 0 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Meses</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {sortedMonthEntries.map(([monthKey, fortnights]) => {
                    const [, monthLabel] = monthKey.split('-');
                    const monthPlans = Object.values(fortnights).flat();
                    const active = selectedMonthKey === monthKey;
                    return (
                      <button
                        key={monthKey}
                        onClick={() => {
                          setSelectedMonthKey(monthKey);
                          setSelectedFortnightKey(Object.keys(fortnights)[0] || null);
                        }}
                        className={`text-left rounded-2xl border p-5 transition-all ${active ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <Calendar className={`w-5 h-5 ${active ? 'text-white' : 'text-blue-600'}`} />
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {monthPlans.length} planes
                          </span>
                        </div>
                        <h3 className={`text-lg font-black capitalize ${active ? 'text-white' : 'text-slate-800'}`}>{monthLabel}</h3>
                        <p className={`text-xs mt-1 ${active ? 'text-blue-100' : 'text-slate-500'}`}>
                          {Object.keys(fortnights).length} {Object.keys(fortnights).length === 1 ? 'quincena' : 'quincenas'} disponibles
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedMonthKey && groupedPlans[selectedMonthKey] && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Quincenas</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(groupedPlans[selectedMonthKey])
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([fortnightKey, plansInFortnight]) => {
                        const active = selectedFortnightKey === fortnightKey;
                        return (
                          <button
                            key={`${selectedMonthKey}-${fortnightKey}`}
                            onClick={() => setSelectedFortnightKey(fortnightKey)}
                            className={`text-left rounded-2xl border p-5 transition-all ${active ? 'bg-emerald-600 border-emerald-600 shadow-lg shadow-emerald-600/20' : 'bg-white border-slate-200 hover:border-emerald-300'}`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <Layers3 className={`w-5 h-5 ${active ? 'text-white' : 'text-emerald-600'}`} />
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {plansInFortnight.length} planes
                              </span>
                            </div>
                            <h3 className={`text-lg font-black ${active ? 'text-white' : 'text-slate-800'}`}>
                              {fortnightKey === 'Q1' ? 'Primera quincena' : fortnightKey === 'Q2' ? 'Segunda quincena' : fortnightKey}
                            </h3>
                            <p className={`text-xs mt-1 ${active ? 'text-emerald-100' : 'text-slate-500'}`}>
                              Visualiza los planes de esta quincena
                            </p>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedMonthKey && selectedFortnightKey && groupedPlans[selectedMonthKey]?.[selectedFortnightKey] && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedPlans[selectedMonthKey][selectedFortnightKey].map(plan => (
                          <div
                            key={plan.id}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                          >
                            {/* Status Badge & quick actions */}
                            <div className="flex items-start justify-between mb-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${plan.status === 'published'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                                  }`}
                              >
                                {plan.status === 'published' ? 'Publicado' : 'Borrador'}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleClonePlan(plan)}
                                  className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Clonar"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingPlan(plan)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePlan(plan)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Plan Info */}
                            <h3 className="text-lg font-bold text-slate-800 mb-2">{plan.name}</h3>
                            {plan.description && (
                              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{plan.description}</p>
                            )}

                            {/* Tags */}
                            {plan.tags && plan.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {plan.tags.slice(0, 3).map((tag, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1"
                                  >
                                    <Tag className="w-3 h-3" />
                                    {tag}
                                  </span>
                                ))}
                                {plan.tags.length > 3 && (
                                  <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs">
                                    +{plan.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Stats / Highlight Technical Info */}
                            <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Dieta / Kcal</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-sm font-bold text-green-700 truncate">
                                    {plan.diet_type || 'No def.'}
                                  </span>
                                  <span className="text-xs text-slate-400 font-medium">
                                    ({plan.target_calories || '?'} kcal)
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col border-l border-slate-200 pl-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Periodo</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                  <span className="text-sm font-bold text-blue-700">
                                    {plan.target_month ? new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(2024, plan.target_month - 1, 1)) : '??'}
                                    {plan.target_fortnight ? ` Q${plan.target_fortnight}` : ''}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4 px-1">
                              <span className="flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span className="font-medium text-slate-700">{plan.assigned_clients_count || 0}</span>
                                <span className="text-xs text-slate-400">asignados</span>
                              </span>
                              {plan.tags && plan.tags.length > 0 && (
                                <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                                  <Tag className="w-3 h-3" />
                                  {plan.tags.length}
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingPlan(plan)}
                                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors text-sm"
                              >
                                Ver detalles
                              </button>
                              <button
                                onClick={() => setAssigningPlan(plan)}
                                className="flex-1 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-xl transition-colors text-sm"
                              >
                                Asignar
                              </button>
                            </div>

                            {/* Last updated */}
                            <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Actualizado: {new Date(plan.updated_at).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        ))}
                      </div>
                  )}
        </div>
      )}

      {/* Create Plan Modal */}
      {
        showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">Nuevo Plan Nutricional</h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre del Plan *
                  </label>
                  <input
                    type="text"
                    value={newPlanName}
                    onChange={e => setNewPlanName(e.target.value)}
                    placeholder="Ej: Plan Diabetes T2 - 1500kcal"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={newPlanDescription}
                    onChange={e => setNewPlanDescription(e.target.value)}
                    placeholder="Describe el propósito y características del plan..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Calorías Objetivo
                    </label>
                    <input
                      type="number"
                      value={newPlanCalories}
                      onChange={e => setNewPlanCalories(e.target.value)}
                      placeholder="Ej: 1500"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Tipo de Dieta
                    </label>
                    <select
                      value={newPlanDietType}
                      onChange={e => setNewPlanDietType(e.target.value as DietType)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Seleccionar...</option>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Mes
                    </label>
                    <select
                      value={newPlanMonth}
                      onChange={e => setNewPlanMonth(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Cualquiera</option>
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2024, i, 1))}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Quincena
                    </label>
                    <select
                      value={newPlanFortnight}
                      onChange={e => setNewPlanFortnight(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Cualquiera</option>
                      <option value="1">1ª Quincena</option>
                      <option value="2">2ª Quincena</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Etiquetas
                  </label>
                  <input
                    type="text"
                    value={newPlanTags}
                    onChange={e => setNewPlanTags(e.target.value)}
                    placeholder="diabetes_t2, 1500kcal, sin_gluten (separar con comas)"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPlanName('');
                    setNewPlanDescription('');
                    setNewPlanCalories('');
                    setNewPlanDietType('');
                    setNewPlanMonth('');
                    setNewPlanFortnight('');
                    setNewPlanTags('');
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreatePlan}
                  disabled={!newPlanName.trim() || creating}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors"
                >
                  {creating ? 'Creando...' : 'Crear Plan'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Assign Modal */}
      {
        assigningPlan && (
          <PlanAssigner
            plan={assigningPlan}
            currentUser={currentUser}
            onClose={() => {
              setAssigningPlan(null);
              loadPlans();
            }}
          />
        )
      }

      {/* JSON Importer Modal */}
      {showJsonImporter && (
        <JsonMealImporter
          currentUser={currentUser}
          onSuccess={(plan) => {
            setShowJsonImporter(false);
            setEditingPlan(plan);
            loadPlans();
          }}
          onClose={() => setShowJsonImporter(false)}
        />
      )}

      {/* Click outside to close dropdown */}
      {showPlanTypeSelector && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowPlanTypeSelector(false)}
        />
      )}
    </div >
  );
}

export default NutritionManagement;
