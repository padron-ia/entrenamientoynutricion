
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function checkTables() {
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

    console.log('Checking hormonal_symptoms table...');
    const { data: symData, error: symError } = await supabase
        .from('hormonal_symptoms')
        .select('*')
        .limit(1);

    if (symError) {
        console.error('Error fetching hormonal_symptoms:', symError.message);
    } else {
        console.log('hormonal_symptoms success. Columns:', Object.keys(symData[0] || {}));
    }

    console.log('\nChecking menstrual_cycles table...');
    const { data: cycData, error: cycError } = await supabase
        .from('menstrual_cycles')
        .select('*')
        .limit(1);

    if (cycError) {
        console.error('Error fetching menstrual_cycles:', cycError.message);
    } else {
        console.log('menstrual_cycles success. Columns:', Object.keys(cycData[0] || {}));
    }
}

checkTables();
