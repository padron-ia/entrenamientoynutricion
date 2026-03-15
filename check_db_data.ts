
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

async function checkClients() {
    console.log('Checking clients...');
    const { data, count, error } = await supabase
        .from('clientes_pt_notion')
        .select('id, property_estado_cliente, property_estado', { count: 'exact' });

    if (error) {
        console.error('Error fetching clients:', error);
        return;
    }

    console.log(`Total clients in DB: ${count}`);
    const statusCounts: Record<string, number> = {};
    data?.forEach(row => {
        const status = row.property_estado_cliente || row.property_estado || 'EMPTY';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('Status distribution (raw):', JSON.stringify(statusCounts, null, 2));

    // Check how many would be "active" according to mapRowToClient logic
    let activeCount = 0;
    data?.forEach(row => {
        const rawNotionStatus = (row.property_estado_cliente || '').toLowerCase().trim();
        const rawFallbackStatus = (row.property_estado || '').toLowerCase().trim();
        const rowStatus = rawNotionStatus || rawFallbackStatus;

        if (rowStatus.includes('activo') || rowStatus.includes('active') || rowStatus.includes('alta') || rowStatus.includes('matriculado')) {
            activeCount++;
        }
    });

    console.log('Clients that would be mapped as ACTIVE:', activeCount);

    // Check joined table
    const { count: assignmentsCount, error: assignmentsError } = await supabase
        .from('client_nutrition_assignments')
        .select('*', { count: 'exact', head: true });

    if (assignmentsError) {
        console.error('Error fetching assignments count:', assignmentsError);
    } else {
        console.log(`Total assignments in DB: ${assignmentsCount}`);
    }
}

checkClients();
