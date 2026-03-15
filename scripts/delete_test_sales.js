
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteTestSales() {
    const names = [
        'Esther Sanz fernandez',
        'FERNANDO RAMIREZ CASARRUBIOS',
        'Antio Lopez',
        'Pedro Martinez',
        'Enrique Rodriguez Vega',
        'Cliente Prueba Dos',
        'Juan Luis Mayoral Manzano',
        'Cliente Prueba Uno'
    ];

    let output = 'Starting deletion of test sales...\n';

    for (const name of names) {
        const { data: candidates, error } = await supabase
            .from('sales')
            .select('*')
            .or(`client_first_name.ilike.%${name}%,client_last_name.ilike.%${name}%`);

        if (candidates && candidates.length > 0) {
            // Broad strict filter
            const toDeleteIds = candidates.filter(c => {
                const full = `${c.client_first_name} ${c.client_last_name}`.toLowerCase();
                const target = name.toLowerCase();
                // Match strictly enough
                return full.includes(target) || target.includes(full);
            }).map(c => c.id);

            if (toDeleteIds.length > 0) {
                output += `Found ${toDeleteIds.length} records for "${name}". Deleting...\n`;
                const { error: delError } = await supabase
                    .from('sales')
                    .delete()
                    .in('id', toDeleteIds);

                if (delError) output += `Error deleting ${name}: ${delError.message}\n`;
                else output += `✓ Deleted records for ${name}\n`;
            } else {
                output += `No matching candidates for "${name}" after strict filter.\n`;
            }
        } else {
            output += `No candidates found for "${name}" in DB.\n`;
        }
    }

    fs.writeFileSync('scripts/delete_log.txt', output);
    console.log('Log saved to scripts/delete_log.txt');
}

deleteTestSales();
