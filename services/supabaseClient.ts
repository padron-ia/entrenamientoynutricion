
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ybmyxzkvjuhutqpgpjpt.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibXl4emt2anVodXRxcGdwanB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTg3NzEsImV4cCI6MjA4NDkzNDc3MX0.nesTESiw5MjvOIKHRArKawv74bQosfOjD7xEFr2rLyU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
