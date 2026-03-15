
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

if (!supabaseUrl || !supabaseKey) {
    console.log('Supabase URL or Key missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGoals() {
    console.log('--- Checking coach_goals table ---');
    const { data, error, count } = await supabase
        .from('coach_goals')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Error fetching coach_goals:', error);
        return;
    }

    console.log('Total goals in DB:', count);
    if (data && data.length > 0) {
        console.log('Sample goal structure:', JSON.stringify(data[0], null, 2));

        const types = data.reduce((acc: any, curr: any) => {
            acc[curr.goal_type] = (acc[curr.goal_type] || 0) + 1;
            return acc;
        }, {});
        console.log('Goal types distribution:', types);

        const statuses = data.reduce((acc: any, curr: any) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {});
        console.log('Status distribution:', statuses);

        // Check for "weekly" goals specifically
        const weeklyGoals = data.filter((g: any) => g.goal_type === 'weekly');
        console.log('Total "weekly" goals:', weeklyGoals.length);
        if (weeklyGoals.length > 0) {
            console.log('Sample weekly goal client_id:', weeklyGoals[0].client_id);
        }
    } else {
        console.log('No goals found in coach_goals table.');
    }
}

checkGoals();
