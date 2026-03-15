
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

async function checkSettings() {
    const { data: settings, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['nutrition_active_month', 'nutrition_active_fortnight']);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(JSON.stringify(settings, null, 2));
}

checkSettings();
