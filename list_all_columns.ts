
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

async function listColumns() {
    let supabaseUrl = '';
    let supabaseKey = '';

    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        supabaseUrl = envContent.match(/(?:VITE_)?SUPABASE_URL=(.*)/)?.[1]?.trim() || '';
        supabaseKey = envContent.match(/(?:VITE_)?SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim() || '';
    } catch (e) {
        console.log('Could not read .env file');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.from('clientes_pt_notion').select('*').limit(1);

    if (error) {
        console.error('Error:', error.message);
    } else if (data && data.length > 0) {
        const cols = Object.keys(data[0]);
        console.log('Total columns:', cols.length);
        const targetCols = ['hormonal_status', 'average_cycle_length', 'hrt_treatment', 'last_period_start_date'];
        targetCols.forEach(tc => {
            console.log(`${tc}: ${cols.includes(tc) ? 'EXISTS' : 'MISSING'}`);
        });

        console.log('\nAll columns (subset starting with h or l):');
        cols.filter(c => c.startsWith('h') || c.startsWith('l')).forEach(c => console.log(c));
    }
}

listColumns();
