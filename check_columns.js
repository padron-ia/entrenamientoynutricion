
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getEnvVar(name) {
    if (process.env[name]) return process.env[name];
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
        return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
    }
    return null;
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const { data, error } = await supabase
        .from('clientes_pt_notion')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (data && data.length > 0) {
        const allCols = Object.keys(data[0]).sort();
        console.log('Columns in clientes_pt_notion:');
        allCols.forEach(col => console.log(col));

        // Check for "preferencias" columns specifically
        const prefColumns = allCols.filter(k => k.toLowerCase().includes('pref'));
        console.log('\nRelevant columns found:', prefColumns);

        // Check one client to see data content
        console.log('\nSample data for property_preferencias_diet_ticas_generales:');
        const { data: samples, error: sampleError } = await supabase
            .from('clientes_pt_notion')
            .select('property_nombre, property_apellidos, property_preferencias_diet_ticas_generales')
            .not('property_preferencias_diet_ticas_generales', 'is', null)
            .neq('property_preferencias_diet_ticas_generales', '')
            .limit(10);

        if (sampleError) {
            console.error('Error fetching samples:', sampleError);
        } else {
            console.log(JSON.stringify(samples || [], null, 2));
        }

    } else {
        console.log('No data found in clientes_pt_notion');
    }
}

checkColumns();
