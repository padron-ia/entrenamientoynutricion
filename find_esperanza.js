
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
    // 1. Find Esperanza
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .ilike('name', '%Esperanza%');

    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }

    console.log('Users found:', users);

    if (users && users.length > 0) {
        const esperanzaId = users[0].id;
        const esperanzaName = users[0].name;

        // 2. Find clients that might belong to her
        // Let's check for clients where coach_id is her ID OR property_coach is her name
        const { data: clients, error: clientError } = await supabase
            .from('clientes_pt_notion')
            .select('id, property_nombre, property_apellidos, coach_id, property_coach')
            .or(`coach_id.eq.${esperanzaId},property_coach.ilike.%${esperanzaName}%`);

        if (clientError) {
            console.error('Error fetching clients:', clientError);
            return;
        }

        console.log(`Total clients currently assigned to Esperanza: ${clients ? clients.length : 0}`);

        // 3. Find clients that were RECENTLY moved or assigned to another coach but SHOULD be hers?
        // This is tricky. Maybe they were assigned to "Head Coach" or similar?
        // Or maybe they are UNASSIGNED but have her name in some property?

        const { data: allClients, error: allClientError } = await supabase
            .from('clientes_pt_notion')
            .select('id, property_nombre, property_apellidos, coach_id, property_coach')
            .limit(100);

        // console.log('Sample clients:', allClients);
    }
}

main();
