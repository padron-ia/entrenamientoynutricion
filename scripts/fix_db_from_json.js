
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(supabaseUrl, supabaseKey);

const JSON_PATH = 'c:\\Users\\jmart\\Downloads\\clientes_completos.json';

async function fixDb() {
    console.log('📖 Leyendo JSON de Notion...');
    let raw = fs.readFileSync(JSON_PATH, 'utf8');
    raw = raw.replace(/:\s*NaN/g, ': null');
    const clientsJson = JSON.parse(raw);

    // Filtramos solo activos para ir rápido
    const activeJson = clientsJson.filter(c => c['Estado Cliente'] === 'Activo');
    console.log(`📊 Procesando ${activeJson.length} clientes activos...\n`);

    // Traemos todos los clientes de la DB para comparar en memoria y evitar 2000 peticiones
    const { data: dbClients } = await supabase.from('clientes_pt_notion').select('id, property_nombre, property_apellidos');

    const normalize = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

    let updated = 0;

    const dbMap = new Map();
    dbClients.forEach(c => {
        const key = `${normalize(c.property_nombre)}|${normalize(c.property_apellidos)}`;
        dbMap.set(key, c.id);
    });

    for (const c of activeJson) {
        const key = `${normalize(c['Nombre'])}|${normalize(c['Apellidos'])}`;
        const dbId = dbMap.get(key);

        if (dbId) {
            const updateData = {
                property_renueva_f2: c['Renueva F2'] === 'Yes' || c['Renueva F2'] === true,
                property_renueva_f3: c['Renueva F3'] === 'Yes' || c['Renueva F3'] === true,
                property_renueva_f4: c['Renueva F4'] === 'Yes' || c['Renueva F4'] === true,
                property_renueva_f5: c['Renueva F5'] === 'Yes' || c['Renueva F5'] === true,
                property_contratado_f1: c['Contratado F1'],
                property_contratado_renovaci_n_f2: c['Contratado Renovación F2'],
                property_contratado_renovaci_n_f3: c['Contratado Renovación F3'],
                property_contratado_renovaci_n_f4: c['Contratado Renovación F4'],
                property_contratado_renovaci_n_f5: c['Contratado Renovación F5']
            };

            const { error: updateError } = await supabase
                .from('clientes_pt_notion')
                .update(updateData)
                .eq('id', dbId);

            if (!updateError) {
                updated++;
                if (updated % 20 === 0) console.log(`✅ ${updated} actualizados...`);
            }
        }
    }

    console.log(`\n🎉 FIN: ${updated} actualizados.`);
}

fixDb();
