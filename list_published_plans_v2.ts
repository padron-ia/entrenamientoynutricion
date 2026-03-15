
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

async function listPlans() {
    const { data: plans, error } = await supabase
        .from('nutrition_plans')
        .select('id, name, diet_type, target_calories, target_month, target_fortnight, status')
        .eq('status', 'published');

    if (error) {
        console.error('Error:', error);
        return;
    }

    fs.writeFileSync('published_plans.json', JSON.stringify(plans, null, 2));
    console.log('Data written to published_plans.json');
}

listPlans();
