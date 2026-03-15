
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

async function listRPCs() {
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

    const { data, error } = await supabase.rpc('get_functions');

    if (error) {
        console.log('RPC get_functions failed:', error.message);
        // Try another way to list functions if possible, or just check information_schema
        const { data: infoData, error: infoError } = await supabase
            .from('information_schema.routines')
            .select('routine_name')
            .eq('routine_schema', 'public');

        if (infoError) {
            console.log('information_schema query failed:', infoError.message);
        } else {
            console.log('Public functions:', infoData.map(r => r.routine_name).join(', '));
        }
    } else {
        console.log('Functions:', data);
    }
}

listRPCs();
