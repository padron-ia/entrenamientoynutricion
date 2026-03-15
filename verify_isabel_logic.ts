import { supabase } from './services/supabaseClient';

async function verifyIsabelLogic() {
    console.log('Verifying Isabel Calvo logic...');

    // 1. Fetch Isabel's raw data
    const { data: client, error: clientError } = await supabase
        .from('clientes_pt_notion')
        .select('*')
        .ilike('property_nombre', '%Isabel%')
        .ilike('property_apellidos', '%Calvo%')
        .single();

    if (clientError || !client) {
        console.error('Error fetching Isabel:', clientError);
        return;
    }

    console.log('Found Isabel Calvo:', client.id);
    console.log('Approved:', client.nutrition_approved);
    console.log('Type:', client.assigned_nutrition_type);
    console.log('Cals:', client.assigned_calories);

    // 2. Fetch Active Period
    const { data: settings } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['nutrition_active_month', 'nutrition_active_fortnight']);

    let activeMonth = 0;
    let activeFortnight = 0;
    if (settings) {
        activeMonth = parseInt(settings.find(s => s.setting_key === 'nutrition_active_month')?.setting_value || '0');
        activeFortnight = parseInt(settings.find(s => s.setting_key === 'nutrition_active_fortnight')?.setting_value || '0');
    }

    console.log('Active Period:', { activeMonth, activeFortnight });

    // 3. Find Matching Plan
    if (activeMonth > 0) {
        const { data: plans } = await supabase
            .from('nutrition_plans')
            .select('id, name')
            .eq('status', 'published')
            .eq('diet_type', client.assigned_nutrition_type)
            .eq('target_calories', client.assigned_calories)
            .eq('target_month', activeMonth)
            .eq('target_fortnight', activeFortnight);

        if (plans && plans.length > 0) {
            console.log('SUCCESS: Matching plan found!');
            plans.forEach(p => console.log(`- ${p.name} (${p.id})`));
        } else {
            console.log('FAILURE: No matching plan found for the current period.');
        }
    } else {
        console.log('Active month not found in settings.');
    }
}

verifyIsabelLogic();
