import { supabase } from '../services/supabaseClient';

async function checkPlans() {
    const { data, error } = await supabase
        .from('nutrition_plans')
        .select('diet_type')
        .distinct(); // Note: supabase doesn't support distinct() directly like this, but we can do it after fetching

    if (error) {
        console.error('Error:', error);
        return;
    }

    const types = [...new Set(data.map(p => p.diet_type))];
    console.log('Unique diet types in nutrition_plans:', types);

    // Also check few samples
    const { data: samples } = await supabase
        .from('nutrition_plans')
        .select('id, name, diet_type, target_calories, target_month, target_fortnight, status')
        .limit(10);

    console.log('Sample plans:', samples);
}

checkPlans();
