import { supabase } from './supabaseClient';
import {
  NutritionPlan,
  NutritionRecipe,
  ClientNutritionAssignment,
  ClientNutritionOverride,
  NutritionPlanVersion,
  NutritionAssignmentHistory,
  ClientFavoriteRecipe,
  RecipeCategory,
  RecipeIngredient
} from '../types';

// ==========================================
// NUTRITION PLANS SERVICE
// ==========================================

export const nutritionService = {
  normalizeRecipeName(name: string): string {
    return (name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  getPreviousPeriod(month?: number, fortnight?: 1 | 2): { month: number; fortnight: 1 | 2 } | null {
    if (!month || !fortnight) return null;
    if (fortnight === 2) {
      return { month, fortnight: 1 };
    }
    return { month: month === 1 ? 12 : month - 1, fortnight: 2 };
  },

  async validatePlanRecipeUniqueness(input: {
    diet_type?: string;
    target_calories?: number;
    target_month?: number;
    target_fortnight?: 1 | 2;
    recipeNames: string[];
    maxOverlapPct?: number;
  }): Promise<{
    checked: boolean;
    isValid: boolean;
    overlapPct: number;
    overlapCount: number;
    previousPlanName?: string;
    previousPlanId?: string;
    reason?: string;
  }> {
    const period = this.getPreviousPeriod(input.target_month, input.target_fortnight);
    if (!period || !input.diet_type || !input.target_calories || !input.recipeNames?.length) {
      return {
        checked: false,
        isValid: true,
        overlapPct: 0,
        overlapCount: 0,
        reason: 'Insufficient metadata to compare with previous fortnight'
      };
    }

    const { data: previousPlan, error: previousError } = await supabase
      .from('nutrition_plans')
      .select('id, name')
      .eq('diet_type', input.diet_type)
      .eq('target_calories', input.target_calories)
      .eq('target_month', period.month)
      .eq('target_fortnight', period.fortnight)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousError) throw previousError;

    if (!previousPlan) {
      return {
        checked: true,
        isValid: true,
        overlapPct: 0,
        overlapCount: 0,
        reason: 'No previous plan found for same type/calories'
      };
    }

    const { data: previousRecipes, error: recipesError } = await supabase
      .from('nutrition_recipes')
      .select('name')
      .eq('plan_id', previousPlan.id);

    if (recipesError) throw recipesError;

    const previousNames = new Set(
      (previousRecipes || [])
        .map(r => this.normalizeRecipeName(r.name))
        .filter(Boolean)
    );

    const currentNames = Array.from(
      new Set(input.recipeNames.map(name => this.normalizeRecipeName(name)).filter(Boolean))
    );

    if (currentNames.length === 0) {
      return {
        checked: true,
        isValid: true,
        overlapPct: 0,
        overlapCount: 0,
        previousPlanName: previousPlan.name,
        previousPlanId: previousPlan.id
      };
    }

    const overlapCount = currentNames.filter(name => previousNames.has(name)).length;
    const overlapPct = Math.round((overlapCount / currentNames.length) * 100);
    const maxOverlap = input.maxOverlapPct ?? 20;

    return {
      checked: true,
      isValid: overlapPct <= maxOverlap,
      overlapPct,
      overlapCount,
      previousPlanName: previousPlan.name,
      previousPlanId: previousPlan.id
    };
  },

  // --- PLANS ---

  async getPlans(filters?: { status?: string; tags?: string[] }): Promise<NutritionPlan[]> {
    let query = supabase
      .from('nutrition_plans')
      .select(`
        *,
        nutrition_recipes(count),
        client_nutrition_assignments(count)
      `)
      .order('updated_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(plan => ({
      ...plan,
      recipes_count: plan.nutrition_recipes?.[0]?.count || 0,
      assigned_clients_count: plan.client_nutrition_assignments?.[0]?.count || 0
    }));
  },

  async getPlanById(planId: string): Promise<NutritionPlan | null> {
    const { data, error } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  },

  async createPlan(plan: Partial<NutritionPlan>): Promise<NutritionPlan> {
    const { data, error } = await supabase
      .from('nutrition_plans')
      .insert({
        name: plan.name,
        description: plan.description,
        tags: plan.tags || [],
        target_calories: plan.target_calories,
        diet_type: plan.diet_type,
        target_month: plan.target_month,
        target_fortnight: plan.target_fortnight,
        instructions: plan.instructions,
        // Block Content
        intro_content: plan.intro_content,
        breakfast_content: plan.breakfast_content,
        lunch_content: plan.lunch_content,
        dinner_content: plan.dinner_content,
        snack_content: plan.snack_content,

        status: 'draft',
        created_by: plan.created_by
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePlan(planId: string, updates: Partial<NutritionPlan>): Promise<NutritionPlan> {
    const { data, error } = await supabase
      .from('nutrition_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePlan(planId: string): Promise<void> {
    const { error } = await supabase
      .from('nutrition_plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;
  },

  validatePlanStructure(recipes: NutritionRecipe[]): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const categories: RecipeCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    const labels: Record<RecipeCategory, string> = {
      breakfast: 'desayunos',
      lunch: 'comidas',
      dinner: 'cenas',
      snack: 'snacks'
    };

    for (const category of categories) {
      const categoryRecipes = recipes.filter(r => r.category === category);
      const sosCount = categoryRecipes.filter(r => r.is_sos).length;
      const normalCount = categoryRecipes.length - sosCount;

      if (category === 'snack') {
        if (categoryRecipes.length < 6) {
          issues.push(`El plan debe tener al menos 6 snacks. Actualmente tiene ${categoryRecipes.length}.`);
        }
      } else {
        if (categoryRecipes.length < 8) {
          issues.push(`El plan debe tener 8 ${labels[category]} en total (6 normales + 2 SOS). Actualmente tiene ${categoryRecipes.length}.`);
        }
        if (normalCount < 6) {
          issues.push(`El plan debe tener al menos 6 ${labels[category]} normales. Actualmente tiene ${normalCount}.`);
        }
        if (sosCount < 2) {
          issues.push(`El plan debe tener al menos 2 ${labels[category]} SOS. Actualmente tiene ${sosCount}.`);
        }
      }

      categoryRecipes.forEach((recipe, index) => {
        const positionLabel = `${labels[category]} #${index + 1} (${recipe.name || 'sin nombre'})`;
        if (!recipe.name?.trim()) {
          issues.push(`Falta el nombre en ${positionLabel}.`);
        }
        if (!recipe.ingredients || recipe.ingredients.length === 0 || !recipe.ingredients.some(i => i.name?.trim())) {
          issues.push(`Faltan ingredientes válidos en ${positionLabel}.`);
        }
        if (!recipe.preparation?.trim()) {
          issues.push(`Falta la preparación en ${positionLabel}.`);
        }
        if (recipe.calories == null || recipe.calories <= 0) {
          issues.push(`Faltan las kcal en ${positionLabel}.`);
        }
        if (recipe.protein == null || recipe.protein <= 0) {
          issues.push(`Falta la proteína en ${positionLabel}.`);
        }
        if (recipe.carbs == null || recipe.carbs < 0) {
          issues.push(`Faltan los carbohidratos en ${positionLabel}.`);
        }
        if (recipe.fat == null || recipe.fat < 0) {
          issues.push(`Faltan las grasas en ${positionLabel}.`);
        }
      });
    }

    return { valid: issues.length === 0, issues };
  },

  async publishPlan(planId: string, userId: string): Promise<NutritionPlan> {
    // First, create a version snapshot
    const recipes = await this.getRecipesByPlan(planId);
    const plan = await this.getPlanById(planId);

    if (!plan) throw new Error('Plan not found');

    const validation = this.validatePlanStructure(recipes);
    if (!validation.valid) {
      throw new Error(`El plan no se puede publicar todavía:\n- ${validation.issues.join('\n- ')}`);
    }

    // Get next version number
    const { data: versions } = await supabase
      .from('nutrition_plan_versions')
      .select('version_number')
      .eq('plan_id', planId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (versions?.[0]?.version_number || 0) + 1;

    // Create version snapshot
    await supabase.from('nutrition_plan_versions').insert({
      plan_id: planId,
      version_number: nextVersion,
      snapshot: { plan, recipes }
    });

    // Update plan status
    const { data, error } = await supabase
      .from('nutrition_plans')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;

    // Mark all recipes as not draft
    await supabase
      .from('nutrition_recipes')
      .update({ is_draft: false })
      .eq('plan_id', planId);

    return data;
  },

  async unpublishPlan(planId: string): Promise<NutritionPlan> {
    const { data, error } = await supabase
      .from('nutrition_plans')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // --- RECIPES ---

  async getRecipesByPlan(planId: string): Promise<NutritionRecipe[]> {
    const { data, error } = await supabase
      .from('nutrition_recipes')
      .select('*')
      .eq('plan_id', planId)
      .order('category')
      .order('position');

    if (error) throw error;
    return data || [];
  },

  async getRecipesByCategory(planId: string, category: RecipeCategory): Promise<NutritionRecipe[]> {
    const { data, error } = await supabase
      .from('nutrition_recipes')
      .select('*')
      .eq('plan_id', planId)
      .eq('category', category)
      .order('position');

    if (error) throw error;
    return data || [];
  },

  async getRecipeById(recipeId: string): Promise<NutritionRecipe | null> {
    const { data, error } = await supabase
      .from('nutrition_recipes')
      .select('*')
      .eq('id', recipeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  },

  async createRecipe(recipe: Partial<NutritionRecipe>): Promise<NutritionRecipe> {
    const { data, error } = await supabase
      .from('nutrition_recipes')
      .insert({
        plan_id: recipe.plan_id,
        category: recipe.category,
        position: recipe.position || 0,
        name: recipe.name,
        ingredients: recipe.ingredients || [],
        preparation: recipe.preparation,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        fiber: recipe.fiber,
        image_url: recipe.image_url,
        is_sos: recipe.is_sos,
        prep_time_minutes: recipe.prep_time_minutes,
        leftover_tip: recipe.leftover_tip,
        notes: recipe.notes,
        is_draft: true
      })
      .select()
      .single();

    if (error) throw error;

    // Mark plan as having changes (draft)
    await supabase
      .from('nutrition_plans')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', recipe.plan_id);

    return data;
  },

  async createRecipesBatch(recipes: Partial<NutritionRecipe>[]): Promise<void> {
    if (recipes.length === 0) return;

    const { error } = await supabase
      .from('nutrition_recipes')
      .insert(recipes.map(r => ({
        plan_id: r.plan_id,
        category: r.category,
        position: r.position || 0,
        name: r.name,
        ingredients: r.ingredients || [],
        preparation: r.preparation,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        fiber: r.fiber,
        image_url: r.image_url,
        is_sos: r.is_sos,
        prep_time_minutes: r.prep_time_minutes,
        leftover_tip: r.leftover_tip,
        notes: r.notes,
        is_draft: true
      })));

    if (error) throw error;

    // Mark plan as having changes
    const planId = recipes[0].plan_id;
    if (planId) {
      await supabase
        .from('nutrition_plans')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', planId);
    }
  },

  async updateRecipe(recipeId: string, updates: Partial<NutritionRecipe>): Promise<NutritionRecipe> {
    const { data, error } = await supabase
      .from('nutrition_recipes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipeId)
      .select()
      .single();

    if (error) throw error;

    // Mark plan as having changes
    if (data.plan_id) {
      await supabase
        .from('nutrition_plans')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', data.plan_id);
    }

    return data;
  },

  async deleteRecipe(recipeId: string): Promise<void> {
    // Get recipe to find plan_id
    const recipe = await this.getRecipeById(recipeId);

    const { error } = await supabase
      .from('nutrition_recipes')
      .delete()
      .eq('id', recipeId);

    if (error) throw error;

    // Mark plan as having changes
    if (recipe?.plan_id) {
      await supabase
        .from('nutrition_plans')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', recipe.plan_id);
    }
  },

  // --- ASSIGNMENTS ---

  async getAssignmentsByPlan(planId: string): Promise<ClientNutritionAssignment[]> {
    const { data, error } = await supabase
      .from('client_nutrition_assignments')
      .select(`
        *,
        clientes_pt_notion!client_id(property_nombre)
      `)
      .eq('plan_id', planId);

    if (error) throw error;

    return (data || []).map(a => ({
      ...a,
      client_name: a.clientes_pt_notion?.property_nombre
    }));
  },

  async getAssignmentByClient(clientId: string): Promise<ClientNutritionAssignment | null> {
    const { data, error } = await supabase
      .from('client_nutrition_assignments')
      .select(`
        *,
        nutrition_plans!plan_id(name, status)
      `)
      .eq('client_id', clientId)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    return {
      ...data,
      plan_name: data.nutrition_plans?.name
    };
  },

  async assignPlanToClient(clientId: string, planId: string, assignedBy: string): Promise<ClientNutritionAssignment> {
    // Archive current assignment before reassigning
    const current = await this.getAssignmentByClient(clientId);
    if (current && current.plan_id !== planId) {
      await supabase.from('client_nutrition_assignment_history').insert({
        client_id: clientId,
        plan_id: current.plan_id,
        plan_name: current.plan_name || null,
        assigned_at: current.assigned_at,
        assigned_by: current.assigned_by || null,
        replaced_at: new Date().toISOString()
      });
    }

    // Upsert to handle reassignment
    const { data, error } = await supabase
      .from('client_nutrition_assignments')
      .upsert({
        client_id: clientId,
        plan_id: planId,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString()
      }, { onConflict: 'client_id' })
      .select()
      .single();

    if (error) throw error;

    // Sync with client profile table (clientes_pt_notion)
    try {
      const { data: plan } = await supabase
        .from('nutrition_plans')
        .select('diet_type, target_calories')
        .eq('id', planId)
        .single();

      if (plan) {
        await supabase
          .from('clientes_pt_notion')
          .update({
            assigned_nutrition_type: plan.diet_type,
            assigned_calories: plan.target_calories
          })
          .eq('id', clientId);
      }
    } catch (syncError) {
      console.error('Error syncing nutrition profile fields:', syncError);
    }

    return data;
  },

  async assignPlanToMultipleClients(clientIds: string[], planId: string, assignedBy: string): Promise<void> {
    // Archive current assignments for clients that already have a different plan
    if (clientIds.length > 0) {
      const { data: currentAssignments } = await supabase
        .from('client_nutrition_assignments')
        .select('*, nutrition_plans!plan_id(name)')
        .in('client_id', clientIds);

      if (currentAssignments && currentAssignments.length > 0) {
        const toArchive = currentAssignments
          .filter(a => a.plan_id !== planId)
          .map(a => ({
            client_id: a.client_id,
            plan_id: a.plan_id,
            plan_name: a.nutrition_plans?.name || null,
            assigned_at: a.assigned_at,
            assigned_by: a.assigned_by || null,
            replaced_at: new Date().toISOString()
          }));

        if (toArchive.length > 0) {
          await supabase.from('client_nutrition_assignment_history').insert(toArchive);
        }
      }
    }

    const assignments = clientIds.map(clientId => ({
      client_id: clientId,
      plan_id: planId,
      assigned_by: assignedBy,
      assigned_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('client_nutrition_assignments')
      .upsert(assignments, { onConflict: 'client_id' });

    if (error) throw error;

    // Sync with client profile table (clientes_pt_notion) for all clients
    try {
      const { data: plan } = await supabase
        .from('nutrition_plans')
        .select('diet_type, target_calories')
        .eq('id', planId)
        .single();

      if (plan && clientIds.length > 0) {
        await supabase
          .from('clientes_pt_notion')
          .update({
            assigned_nutrition_type: plan.diet_type,
            assigned_calories: plan.target_calories
          })
          .in('id', clientIds);
      }
    } catch (syncError) {
      console.error('Error syncing bulk nutrition profile fields:', syncError);
    }
  },

  async unassignClient(clientId: string): Promise<void> {
    const { error } = await supabase
      .from('client_nutrition_assignments')
      .delete()
      .eq('client_id', clientId);

    if (error) throw error;
  },

  // --- ASSIGNMENT HISTORY ---

  async getAssignmentHistory(clientId: string): Promise<NutritionAssignmentHistory[]> {
    const { data, error } = await supabase
      .from('client_nutrition_assignment_history')
      .select('*')
      .eq('client_id', clientId)
      .order('replaced_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get plans accessible to this client: explicit assignments first, fallback to auto-match
  async getAllAccessiblePlans(clientId: string): Promise<NutritionPlan[]> {
    // Get client profile + explicit assignments in parallel
    const [{ data: clientData }, { data: currentAssign }, { data: historyData }] = await Promise.all([
      supabase.from('clientes_pt_notion')
        .select('created_at, assigned_nutrition_type, assigned_calories')
        .eq('id', clientId).single(),
      supabase.from('client_nutrition_assignments').select('plan_id').eq('client_id', clientId).maybeSingle(),
      supabase.from('client_nutrition_assignment_history').select('plan_id').eq('client_id', clientId),
    ]);

    // Collect explicitly assigned plan IDs
    const assignedPlanIds = new Set<string>([
      ...(currentAssign ? [currentAssign.plan_id] : []),
      ...(historyData || []).map((h: any) => h.plan_id),
    ].filter(Boolean));

    // Auto-match: plans matching diet_type + calories since client registration
    // Only include plans for the current or past periods (not future fortnights)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentFortnight = now.getDate() <= 15 ? 1 : 2;

    let autoMatchPlans: NutritionPlan[] = [];
    if (clientData?.assigned_nutrition_type && clientData?.assigned_calories) {
      const sinceDate = clientData.created_at || '2026-01-01';
      const { data: matched } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('diet_type', clientData.assigned_nutrition_type)
        .eq('target_calories', clientData.assigned_calories)
        .in('status', ['published', 'active'])
        .gte('created_at', sinceDate)
        .order('target_month', { ascending: false })
        .order('target_fortnight', { ascending: false })
        .order('created_at', { ascending: false });

      // Filter out future periods
      autoMatchPlans = (matched || []).filter((p: any) => {
        if (!p.target_month) return true;
        if (p.target_month < currentMonth) return true;
        if (p.target_month === currentMonth) return (p.target_fortnight || 1) <= currentFortnight;
        return false; // future month
      });
    }

    // If no explicit assignments, just return auto-match
    if (assignedPlanIds.size === 0) return autoMatchPlans;

    // Fetch explicitly assigned plans
    const { data: assignedPlans } = await supabase
      .from('nutrition_plans')
      .select('*')
      .in('id', [...assignedPlanIds]);

    // Merge: assigned plans + auto-matched (deduplicated)
    const allPlansMap = new Map<string, NutritionPlan>();
    (assignedPlans || []).forEach((p: any) => allPlansMap.set(p.id, p));
    autoMatchPlans.forEach(p => { if (!allPlansMap.has(p.id)) allPlansMap.set(p.id, p); });

    // Sort by period descending
    return [...allPlansMap.values()].sort((a, b) => {
      if ((b.target_month || 0) !== (a.target_month || 0)) return (b.target_month || 0) - (a.target_month || 0);
      if ((b.target_fortnight || 0) !== (a.target_fortnight || 0)) return (b.target_fortnight || 0) - (a.target_fortnight || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  // --- CLIENT OVERRIDES ---

  async getOverridesByClient(clientId: string): Promise<ClientNutritionOverride[]> {
    const { data, error } = await supabase
      .from('client_nutrition_overrides')
      .select('*')
      .eq('client_id', clientId);

    if (error) throw error;
    return data || [];
  },

  async getOverrideForRecipe(clientId: string, recipeId: string): Promise<ClientNutritionOverride | null> {
    const { data, error } = await supabase
      .from('client_nutrition_overrides')
      .select('*')
      .eq('client_id', clientId)
      .eq('recipe_id', recipeId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createOrUpdateOverride(override: Partial<ClientNutritionOverride>): Promise<ClientNutritionOverride> {
    const { data, error } = await supabase
      .from('client_nutrition_overrides')
      .upsert({
        client_id: override.client_id,
        recipe_id: override.recipe_id,
        custom_name: override.custom_name,
        custom_ingredients: override.custom_ingredients,
        custom_preparation: override.custom_preparation,
        custom_calories: override.custom_calories,
        notes: override.notes,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,recipe_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteOverride(clientId: string, recipeId: string): Promise<void> {
    const { error } = await supabase
      .from('client_nutrition_overrides')
      .delete()
      .eq('client_id', clientId)
      .eq('recipe_id', recipeId);

    if (error) throw error;
  },

  // --- VERSIONS ---

  async getPlanVersions(planId: string): Promise<NutritionPlanVersion[]> {
    const { data, error } = await supabase
      .from('nutrition_plan_versions')
      .select('*')
      .eq('plan_id', planId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // --- CLIENT PORTAL HELPERS ---

  async getClientPlanWithRecipes(clientId: string, nutritionApproved?: boolean): Promise<{
    plan: NutritionPlan | null;
    recipes: NutritionRecipe[];
    overrides: Map<string, ClientNutritionOverride>;
    isAutomatic?: boolean;
    pendingApproval?: boolean;
  }> {
    // 1. Get explicit assignment
    const assignment = await this.getAssignmentByClient(clientId);
    let planId = assignment?.plan_id;
    let isAutomatic = false;

    // 2. If no assignment, look for automatic plan
    if (!planId) {
      // Fetch the actual current status from DB along with profile data
      const { data: clientData, error: clientError } = await supabase
        .from('clientes_pt_notion')
        .select('nutrition_approved, assigned_nutrition_type, assigned_calories')
        .eq('id', clientId)
        .single();

      if (clientError) {
        console.error('Error checking client nutrition data:', clientError);
      }

      // Check if client has a defined nutrition profile
      const hasNutritionProfile = !!(clientData?.assigned_nutrition_type && clientData?.assigned_calories);

      // A client is "approved" to see a plan if:
      // - They are explicitly checked (nutrition_approved = true)
      // - OR They have a profile (diet type + kcal) -> This is the core fix
      const isApproved = !!clientData?.nutrition_approved || hasNutritionProfile;

      if (!isApproved) {
        console.warn('client not approved for nutrition and no manual assignment found');
        return { plan: null, recipes: [], overrides: new Map(), pendingApproval: true };
      }

      // Instead of calling getAutoPlanForClient (which re-queries the client),
      // we do the fetch here using the data we already have.
      const { month, fortnight } = await this.getActivePeriod();

      if (clientData?.assigned_nutrition_type && clientData?.assigned_calories) {
        const { data: plans, error: planError } = await supabase
          .from('nutrition_plans')
          .select('*')
          .eq('status', 'published')
          .eq('diet_type', clientData.assigned_nutrition_type)
          .eq('target_calories', clientData.assigned_calories)
          .eq('target_month', month)
          .eq('target_fortnight', fortnight)
          .limit(1);

        if (!planError && plans && plans.length > 0) {
          planId = plans[0].id;
          isAutomatic = true;
        } else {
          console.warn('No matching automatic plan found for client profile and current period:', {
            type: clientData.assigned_nutrition_type,
            kcal: clientData.assigned_calories,
            period: `${month} Q${fortnight}`
          });
        }
      }
    }

    if (!planId) {
      return { plan: null, recipes: [], overrides: new Map() };
    }

    // 3. Get plan (only if published)
    const { data: plan } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('id', planId)
      .eq('status', 'published')
      .single();

    if (!plan) {
      return { plan: null, recipes: [], overrides: new Map() };
    }

    // 4. Get recipes
    const recipes = await this.getRecipesByPlan(planId);

    // 5. Get overrides
    const overridesArray = await this.getOverridesByClient(clientId);
    const overrides = new Map<string, ClientNutritionOverride>();
    overridesArray.forEach(o => overrides.set(o.recipe_id, o));

    return { plan, recipes, overrides, isAutomatic };
  },

  // Helper to apply overrides to a recipe
  applyOverride(recipe: NutritionRecipe, override?: ClientNutritionOverride): NutritionRecipe {
    if (!override) return recipe;

    return {
      ...recipe,
      name: override.custom_name || recipe.name,
      ingredients: override.custom_ingredients || recipe.ingredients,
      preparation: override.custom_preparation || recipe.preparation,
      calories: override.custom_calories || recipe.calories
    };
  },

  // --- SEARCH ---

  async searchClients(query: string, limit = 20): Promise<Array<{ id: string; name: string; email: string }>> {
    const { data, error } = await supabase
      .from('clientes_pt_notion')
      .select('id, property_nombre, property_correo_electr_nico')
      .or(`property_nombre.ilike.%${query}%,property_correo_electr_nico.ilike.%${query}%`)
      .eq('status', 'active')
      .limit(limit);

    if (error) throw error;

    return (data || []).map(c => ({
      id: c.id,
      name: c.property_nombre || 'Sin nombre',
      email: c.property_correo_electr_nico || ''
    }));
  },

  async clonePlan(planId: string, createdBy: string): Promise<NutritionPlan> {
    const originalPlan = await this.getPlanById(planId);
    if (!originalPlan) throw new Error('Plan original no encontrado');
    const originalRecipes = await this.getRecipesByPlan(planId);

    const { data: newPlan, error: planError } = await supabase
      .from('nutrition_plans')
      .insert({
        name: `${originalPlan.name} (Copia)`,
        description: originalPlan.description,
        tags: originalPlan.tags || [],
        target_calories: originalPlan.target_calories,
        diet_type: originalPlan.diet_type,
        target_month: originalPlan.target_month,
        target_fortnight: originalPlan.target_fortnight,
        instructions: originalPlan.instructions,
        intro_content: originalPlan.intro_content,
        breakfast_content: originalPlan.breakfast_content,
        lunch_content: originalPlan.lunch_content,
        dinner_content: originalPlan.dinner_content,
        snack_content: originalPlan.snack_content,
        status: 'draft',
        created_by: createdBy
      })
      .select()
      .single();

    if (planError) throw planError;

    if (originalRecipes.length > 0) {
      const { error: recipesError } = await supabase
        .from('nutrition_recipes')
        .insert(originalRecipes.map(r => ({
          plan_id: newPlan.id,
          category: r.category,
          position: r.position,
          name: r.name,
          ingredients: r.ingredients,
          preparation: r.preparation,
          calories: r.calories,
          protein: r.protein,
          carbs: r.carbs,
          fat: r.fat,
          fiber: r.fiber,
          image_url: r.image_url,
          is_sos: r.is_sos,
          prep_time_minutes: r.prep_time_minutes,
          leftover_tip: r.leftover_tip,
          notes: r.notes,
          is_draft: true
        })));
      if (recipesError) throw recipesError;
    }
    return newPlan;
  },

  getFortnightInfo(date: Date = new Date()) {
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();
    const fortnight = day <= 15 ? 1 : 2;
    return { month, fortnight };
  },

  async getActivePeriod(): Promise<{ month: number; fortnight: number }> {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['nutrition_active_month', 'nutrition_active_fortnight']);

      if (data && data.length === 2) {
        const monthSetting = data.find((s: any) => s.setting_key === 'nutrition_active_month');
        const fortnightSetting = data.find((s: any) => s.setting_key === 'nutrition_active_fortnight');
        const month = parseInt(monthSetting?.setting_value || '0');
        const fortnight = parseInt(fortnightSetting?.setting_value || '0');
        if (month >= 1 && month <= 12 && (fortnight === 1 || fortnight === 2)) {
          return { month, fortnight };
        }
      }
    } catch (err) {
      console.error('Error reading active period from app_settings, falling back to date:', err);
    }
    // Fallback to date-based
    return this.getFortnightInfo();
  },

  async advancePeriod(userId: string): Promise<{ month: number; fortnight: number }> {
    const current = await this.getActivePeriod();
    let nextMonth = current.month;
    let nextFortnight = current.fortnight === 1 ? 2 : 1;
    if (nextFortnight === 1) {
      // Moved from Q2 to Q1, so advance month
      nextMonth = current.month === 12 ? 1 : current.month + 1;
    }

    const updates = [
      { setting_key: 'nutrition_active_month', setting_value: String(nextMonth), description: 'Mes activo para asignación automática de nutrición (1-12)' },
      { setting_key: 'nutrition_active_fortnight', setting_value: String(nextFortnight), description: 'Quincena activa para asignación automática (1 o 2)' }
    ];

    const { error } = await supabase
      .from('app_settings')
      .upsert(updates, { onConflict: 'setting_key' });

    if (error) throw error;

    return { month: nextMonth, fortnight: nextFortnight };
  },

  async approveClientNutrition(clientId: string, approvedBy: string): Promise<void> {
    const { error } = await supabase
      .from('clientes_pt_notion')
      .update({
        nutrition_approved: true,
        nutrition_approved_at: new Date().toISOString(),
        nutrition_approved_by: approvedBy
      })
      .eq('id', clientId);

    if (error) throw error;
  },

  async getAutoPlanForClient(identifier: string, explicitCalories?: number): Promise<NutritionPlan | null> {
    let dietType: string | undefined;
    let calories: number | undefined;

    if (explicitCalories !== undefined) {
      // Identifier is dietType in this case
      dietType = identifier;
      calories = explicitCalories;
    } else {
      // Identifier is clientId
      const { data: client, error: clientError } = await supabase
        .from('clientes_pt_notion')
        .select('assigned_nutrition_type, assigned_calories')
        .eq('id', identifier)
        .single();

      if (clientError || !client) return null;
      dietType = client.assigned_nutrition_type;
      calories = client.assigned_calories;
    }

    if (!dietType || !calories) return null;

    const { month, fortnight } = await this.getActivePeriod();

    const { data: plans, error: planError } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('status', 'published')
      .eq('diet_type', dietType)
      .eq('target_calories', calories)
      .eq('target_month', month)
      .eq('target_fortnight', fortnight)
      .limit(1);

    if (planError || !plans || plans.length === 0) return null;

    return plans[0];
  },

  // --- FAVORITE RECIPES ---

  async getFavoriteRecipes(clientId: string): Promise<ClientFavoriteRecipe[]> {
    const { data, error } = await supabase
      .from('client_favorite_recipes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[favorites] getFavorites error:', error); return []; }
    return data || [];
  },

  async toggleFavoriteRecipe(
    clientId: string,
    recipe: { id: string; name: string; category: string; plan_id: string },
    plan: { name: string; target_calories?: number; diet_type?: string },
    currentlyFavorited: boolean
  ): Promise<boolean> {
    if (currentlyFavorited) {
      const { error } = await supabase
        .from('client_favorite_recipes')
        .delete()
        .eq('client_id', clientId)
        .eq('recipe_id', recipe.id);
      if (error) { console.error('[favorites] remove error:', error); return true; }
      return false;
    } else {
      const { error } = await supabase
        .from('client_favorite_recipes')
        .upsert({
          client_id: clientId,
          recipe_id: recipe.id,
          plan_id: recipe.plan_id,
          category: recipe.category,
          recipe_name: recipe.name,
          plan_name: plan.name,
          plan_calories: plan.target_calories || null,
          plan_diet_type: plan.diet_type || null,
        }, { onConflict: 'client_id,recipe_id' });
      if (error) { console.error('[favorites] add error:', error); return false; }
      return true;
    }
  },

  async getFavoriteRecipesFull(clientId: string): Promise<(NutritionRecipe & { plan_name?: string; plan_calories?: number; plan_diet_type?: string })[]> {
    const favorites = await this.getFavoriteRecipes(clientId);
    if (favorites.length === 0) return [];

    const recipeIds = favorites.map(f => f.recipe_id);
    const { data: recipes, error } = await supabase
      .from('nutrition_recipes')
      .select('*')
      .in('id', recipeIds);
    if (error) { console.error('[favorites] getFull error:', error); return []; }

    // Merge recipe data with favorite metadata
    const favMap = new Map(favorites.map((f: ClientFavoriteRecipe) => [f.recipe_id, f]));
    return (recipes || []).map((r: any) => ({
      ...r,
      plan_name: favMap.get(r.id)?.plan_name,
      plan_calories: favMap.get(r.id)?.plan_calories,
      plan_diet_type: favMap.get(r.id)?.plan_diet_type,
    }));
  }
};

export default nutritionService;
