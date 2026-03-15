
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

async function testJoinQuery() {
    console.log('Testing join query...');
    const { data, error } = await supabase
        .from('clientes_pt_notion')
        .select('*, client_nutrition_assignments(plan_id)')
        .limit(10);

    if (error) {
        console.error('JOIN QUERY ERROR:', JSON.stringify(error, null, 2));
        return;
    }

    console.log(`Success! Fetched ${data?.length} rows.`);
    if (data && data.length > 0) {
        console.log('First row sample join data:', data[0].client_nutrition_assignments);
    }
}

testJoinQuery();
