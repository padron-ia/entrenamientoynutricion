
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

let supabaseUrl = '';
let supabaseKey = '';

try {
    const envContent = fs.readFileSync('.env', 'utf8');
    supabaseUrl = envContent.match(/(?:VITE_)?SUPABASE_URL=(.*)/)?.[1]?.trim() || '';
    supabaseKey = envContent.match(/(?:VITE_)?SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim() || '';
} catch (e) {
    console.log('Could not read .env file');
}

if (!supabaseUrl || !supabaseKey) {
    console.log('Supabase URL or Key missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('Listing all tables in public schema...');
    // We can't directly list tables via RPC if not configured, but we can try to query information_schema if allowed
    // Or just try common names
    const commonTables = [
        'coach_goals', 'client_goals', 'objectives', 'weekly_objectives',
        'checkin_goals', 'goals', 'clientes_pt_notion'
    ];

    for (const table of commonTables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error) {
            console.log(`Table '${table}' exists. Count: ${count}`);
        } else {
            // console.log(`Table '${table}' does not exist or error: ${error.message}`);
        }
    }
}

listTables();
