
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase env vars. Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

if (import.meta.env.DEV) {
  console.info('[Supabase] Using project URL:', SUPABASE_URL);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
