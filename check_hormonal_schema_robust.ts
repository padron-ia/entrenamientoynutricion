
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

async function checkSchema() {
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

    const tables = ['menstrual_cycles', 'hormonal_symptoms', 'clientes_pt_notion'];

    const expectedColumns: Record<string, string[]> = {
        'menstrual_cycles': ['id', 'client_id', 'period_start_date', 'period_end_date', 'cycle_length', 'notes'],
        'hormonal_symptoms': ['id', 'client_id', 'date', 'bloating', 'cramps', 'cravings', 'hot_flashes', 'night_sweats', 'energy_level', 'mood', 'sleep_quality'],
        'clientes_pt_notion': ['id', 'hormonal_status', 'average_cycle_length', 'last_period_start_date', 'hrt_treatment']
    };

    for (const table of Object.keys(expectedColumns)) {
        console.log(`\nChecking table: ${table}...`);

        for (const col of expectedColumns[table]) {
            const { error: colError } = await supabase.from(table).select(col).limit(1);
            if (colError) {
                console.log(`   ❌ Column [${col}]: MISSING (${colError.message})`);
            } else {
                console.log(`   ✅ Column [${col}]: OK`);
            }
        }
    }
}

checkSchema();
