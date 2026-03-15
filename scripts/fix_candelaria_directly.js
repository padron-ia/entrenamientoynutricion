
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(supabaseUrl, supabaseKey);

const JSON_PATH = 'c:\\Users\\jmart\\Downloads\\clientes_completos.json';

async function fixCandelaria() {
    let raw = fs.readFileSync(JSON_PATH, 'utf8');
    raw = raw.replace(/:\s*NaN/g, ': null');
    const clientsJson = JSON.parse(raw);
    const c = clientsJson.find(c => c.Apellidos && c.Apellidos.includes('Acevedo Martín'));

    if (c) {
        console.log('JSON says Renueva F4:', c['Renueva F4']);
        const { data: dbClient } = await supabase
            .from('clientes_pt_notion')
            .select('id, property_nombre, property_apellidos')
            .ilike('property_apellidos', '%Acevedo%')
            .maybeSingle();

        if (dbClient) {
            console.log('Found in DB:', dbClient.property_nombre, dbClient.property_apellidos);
            const res = await supabase.from('clientes_pt_notion').update({
                property_renueva_f4: c['Renueva F4'] === 'Yes'
            }).eq('id', dbClient.id);
            console.log('Update Result:', res.error || 'Success');
        }
    }
}

fixCandelaria();
