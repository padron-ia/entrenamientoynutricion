
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

async function checkPlans() {
    console.log('Searching for plans with "Flexible"...');
    const { data: plans, error } = await supabase
        .from('nutrition_plans')
        .select('*')
        .ilike('name', '%Flexible%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Plans found: ${plans?.length}`);
    plans?.forEach(p => console.log(`- ${p.name} (ID: ${p.id})`));
}

checkPlans();
