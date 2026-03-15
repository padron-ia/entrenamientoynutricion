import { supabase } from './supabaseClient';

export interface ContractHistoryRecord {
  id: string;
  client_id: string;
  contract_date: string;
  duration_months: number;
  duration_days: number;
  amount: number;
  financing_installments: number;
  financing_amount: number;
  client_name: string;
  client_dni: string;
  client_address: string;
  contract_html: string;
  signature_image: string;
  signed_at: string;
  created_at: string;
  created_by?: string;
}

export async function getContractHistory(clientId: string): Promise<ContractHistoryRecord[]> {
  const { data, error } = await supabase
    .from('contract_history')
    .select('*')
    .eq('client_id', clientId)
    .order('signed_at', { ascending: false });

  if (error) {
    console.error('Error fetching contract history:', error);
    return [];
  }
  return data || [];
}

export async function saveContractToHistory(record: Omit<ContractHistoryRecord, 'id' | 'created_at'>): Promise<ContractHistoryRecord | null> {
  const { data, error } = await supabase
    .from('contract_history')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Error saving contract to history:', error);
    throw error;
  }
  return data;
}

export async function deleteContractFromHistory(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('contract_history')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting contract from history:', error);
    throw error;
  }
  return true;
}
