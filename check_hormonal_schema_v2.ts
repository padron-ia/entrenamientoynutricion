
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

    const checkTable = async (table: string, columns: string[]) => {
        console.log(`\n--- Table: ${table} ---`);
        for (const col of columns) {
            try {
                const { error } = await supabase.from(table).select(col).limit(0);
                if (error) {
                    console.log(`[ ] ${col}: MISSING (${error.message})`);
                } else {
                    console.log(`[x] ${col}: OK`);
                }
            } catch (err: any) {
                console.log(`[ ] ${col}: ERROR (${err.message})`);
            }
        }
    };

    console.log('Checking Hormonal Schema...');

    await checkTable('clientes_pt_notion', [
        'id', 'hormonal_status', 'average_cycle_length', 'last_period_start_date', 'hrt_treatment'
    ]);

    await checkTable('menstrual_cycles', [
        'id', 'client_id', 'period_start_date', 'period_end_date', 'cycle_length', 'notes'
    ]);

    await checkTable('hormonal_symptoms', [
        'id', 'client_id', 'date', 'bloating', 'cramps', 'cravings', 'cravings_detail',
        'hot_flashes', 'night_sweats', 'vaginal_dryness', 'energy_level', 'mood',
        'sleep_quality', 'headache', 'breast_tenderness', 'irritability', 'notes'
    ]);
}

checkSchema();
