
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
    const orphanId = 'e59de5e3-f962-48be-8392-04d9d59ba87d';

    console.log('--- REASIGNANDO CLIENTES A ESPERANZA ---');

    // 1. Reasignar por nombre en property_coach
    const { data: updatedByProp, error: errorByProp } = await supabase
        .from('clientes_pt_notion')
        .update({ coach_id: esperanzaId })
        .ilike('property_coach', '%Esperanza%')
        .select('id');

    if (errorByProp) {
        console.error('Error actualizando por property_coach:', errorByProp);
    } else {
        console.log(`✅ Se han reasignado ${updatedByProp ? updatedByProp.length : 0} clientes basados en property_coach = Esperanza.`);
    }

    // 2. Reasignar cualquier residuo que todavía esté con el orphanId
    const { data: updatedOrphan, error: errorOrphan } = await supabase
        .from('clientes_pt_notion')
        .update({ coach_id: esperanzaId, property_coach: 'Esperanza' })
        .eq('coach_id', orphanId)
        .select('id');

    if (errorOrphan) {
        console.error('Error actualizando huérfanos:', errorOrphan);
    } else {
        console.log(`✅ Se han reasignado ${updatedOrphan ? updatedOrphan.length : 0} clientes adicionales que estaban con el ID huérfano.`);
    }

    // 3. Verificación final
    const { count, error: countError } = await supabase
        .from('clientes_pt_notion')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', esperanzaId);

    if (countError) {
        console.error('Error verificando:', countError);
    } else {
        console.log(`🎯 Verificación final: Esperanza ahora tiene ${count} clientes asignados correctamente.`);
    }
}

main();
