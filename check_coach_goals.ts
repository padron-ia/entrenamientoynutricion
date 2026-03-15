
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkGoals() {
    console.log('--- Checking coach_goals table ---');
    const { data, error, count } = await supabase
        .from('coach_goals')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Error fetching coach_goals:', error);
        return;
    }

    console.log('Total goals:', count);
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
    } else {
        console.log('No goals found in coach_goals table.');
    }
}

checkGoals();
