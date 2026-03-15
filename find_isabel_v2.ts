
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

async function findIsabel() {
    console.log('Searching for Isabel Calvo (Full Record)...');
    const { data: clients, error } = await supabase
        .from('clientes_pt_notion')
        .select('*')
        .or('property_nombre.ilike.%Isabel%,property_apellidos.ilike.%Calvo%')
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(JSON.stringify(clients, null, 2));
}

findIsabel();
