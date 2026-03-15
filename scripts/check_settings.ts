import { supabase } from '../services/supabaseClient';

async function checkSettings() {
    const { data, error } = await supabase
        .from('app_settings')
        .select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('App Settings:', data);
}

checkSettings();
