
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function loadEnv() {
    try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const envPath = path.resolve(__dirname, './.env');

        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const lines = envContent.split(/\r?\n/);
            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#')) return;
                const equalsIndex = trimmedLine.indexOf('=');
                if (equalsIndex > -1) {
                    const key = trimmedLine.substring(0, equalsIndex).trim();
                    let value = trimmedLine.substring(equalsIndex + 1).trim();
                    value = value.replace(/^["'](.*)["']$/, '$1');
                    process.env[key] = value;
                }
            });
        }
    } catch (e) {
        console.error('Error cargando .env:', e);
    }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zugtswtpoohnpycnjwrp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_KEY) {
    console.error('Missing Supabase Key');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const esperanzaId = '27af6319-071e-446b-85d3-e55294ecd05c';
    const esperanzaName = 'Esperanza';

    // Find clients where property_coach contains Esperanza but coach_id is NOT her ID
    const { data: mismatchClients, error: mismatchError } = await supabase
        .from('clientes_pt_notion')
        .select('id, property_nombre, property_apellidos, coach_id, property_coach')
        .ilike('property_coach', `%${esperanzaName}%`)
        .neq('coach_id', esperanzaId);

    if (mismatchError) {
        console.error('Error fetching mismatched clients:', mismatchError);
        return;
    }

    console.log(`Found ${mismatchClients.length} clients with "Esperanza" in property_coach but different coach_id.`);
    if (mismatchClients.length > 0) {
        const uniqueCoachIds = [...new Set(mismatchClients.map(c => c.coach_id))];
        console.log('Target coach IDs currently holding these clients:', uniqueCoachIds);
    }

    // Also look for clients assigned to a specific user that might have "taken" them.
    // Maybe they were moved to 'f730c14b-6101-447a-8f43-4dc9754f9d45' (Head Coach / Mario) or someone else.
}

main();
