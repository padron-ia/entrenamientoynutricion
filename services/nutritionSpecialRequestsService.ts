import { supabase } from './supabaseClient';
import { NutritionSpecialRequest } from '../types';

const TABLE = 'nutrition_special_requests';

const mapRequest = (row: any): NutritionSpecialRequest => ({
  ...row,
  client_name: row.clientes_pt_notion
    ? `${row.clientes_pt_notion.property_nombre || ''} ${row.clientes_pt_notion.property_apellidos || ''}`.trim()
    : undefined,
  creator_name: row.creator?.name,
  assigned_name: row.assignee?.name,
});

export const nutritionSpecialRequestsService = {
  async getAll(): Promise<NutritionSpecialRequest[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        *,
        clientes_pt_notion(id, property_nombre, property_apellidos),
        creator:users!created_by(id, name),
        assignee:users!assigned_to(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRequest);
  },

  async getPendingCount(): Promise<number> {
    const { count, error } = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) throw error;
    return count || 0;
  },

  async create(request: Partial<NutritionSpecialRequest>): Promise<NutritionSpecialRequest> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(request)
      .select('*')
      .single();

    if (error) throw error;
    return data as NutritionSpecialRequest;
  },

  async update(id: string, updates: Partial<NutritionSpecialRequest>): Promise<NutritionSpecialRequest> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        clientes_pt_notion(id, property_nombre, property_apellidos),
        creator:users!created_by(id, name),
        assignee:users!assigned_to(id, name)
      `)
      .single();

    if (error) throw error;
    return mapRequest(data);
  },
};
