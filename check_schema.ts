
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking schema metadata...');

    // Check if it's a table or view
    const { data: tableData, error: tableError } = await supabase
        .rpc('get_table_info', { t_name: 'clientes_pt_notion' });

    // Since I don't know if get_table_info exists, I'll try a raw query via rpc if possible or just check table list
    // Actually, I can use a simple select for metadata if I have permissions, but usually anon doesn't.

    // I'll try to find relationships by querying the assignments table specifically
    const { data, error } = await supabase
        .from('client_nutrition_assignments')
        .select('*, clientes_pt_notion(*)')
        .limit(1);

    if (error) {
        console.log('Reverse join error:', error.message);
    } else {
        console.log('Reverse join success!');
    }
}

checkSchema();
