
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

async function findIsabel() {
    console.log('Searching for Isabel Calvo...');
    const { data: clients, error } = await supabase
        .from('clientes_pt_notion')
        .select('id, property_nombre, property_apellidos, property_plan_nutricional, assigned_nutrition_type, assigned_calories, nutrition_approved')
        .or('property_nombre.ilike.%Isabel%,property_apellidos.ilike.%Calvo%')
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    for (const client of clients) {
        console.log(`Client Found: ${client.property_nombre} ${client.property_apellidos} (ID: ${client.id})`);
        console.log(`- property_plan_nutricional: ${client.property_plan_nutricional}`);
        console.log(`- assigned_nutrition_type: ${client.assigned_nutrition_type}`);
        console.log(`- assigned_calories: ${client.assigned_calories}`);
        console.log(`- nutrition_approved: ${client.nutrition_approved}`);

        // Check assignments table
        const { data: assignments } = await supabase
            .from('client_nutrition_assignments')
            .select('*, nutrition_plans(name)')
            .eq('client_id', client.id);

        console.log(`- Manual Assignments:`, JSON.stringify(assignments, null, 2));
        console.log('-------------------');
    }
}

findIsabel();
