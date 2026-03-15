
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ybmyxzkvjuhutqpgpjpt.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_xMrxNaZp8iHB-ErgJs9qew_-C7LVD6P';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
