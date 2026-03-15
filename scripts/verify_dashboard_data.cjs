/**
 * Script para verificar datos de coach_capacity_view y clientes
 * Ejecutar con: node scripts/verify_dashboard_data.cjs
 */

const { createClient } = require('@supabase/supabase-js');

// Credenciales de Supabase (mismas que en supabaseClient.ts)
const SUPABASE_URL = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    console.log('\n📊 VERIFICACIÓN DE DATOS DEL DASHBOARD\n');
    console.log('='.repeat(60));

    // 1. Verificar coach_capacity_view
    console.log('\n🏋️ VISTA: coach_capacity_view\n');
    const { data: capacityData, error: capacityError } = await supabase
        .from('coach_capacity_view')
        .select('*')
        .order('name');

    if (capacityError) {
        console.error('❌ Error al consultar coach_capacity_view:', capacityError.message);
    } else if (capacityData) {
        console.log('| Coach          | Activos | Pausados | Máx | % Uso |');
        console.log('|----------------|---------|----------|-----|-------|');
        capacityData.forEach(c => {
            const pct = c.max_clients > 0 ? Math.round(((c.actual_active_clients || 0) / c.max_clients) * 100) : 0;
            console.log(`| ${(c.name || 'N/A').padEnd(14)} | ${String(c.actual_active_clients || 0).padStart(7)} | ${String(c.actual_paused_clients || 0).padStart(8)} | ${String(c.max_clients || 0).padStart(3)} | ${String(pct).padStart(4)}% |`);
        });

        const totalActive = capacityData.reduce((acc, c) => acc + (c.actual_active_clients || 0), 0);
        const totalPaused = capacityData.reduce((acc, c) => acc + (c.actual_paused_clients || 0), 0);
        console.log('|----------------|---------|----------|-----|-------|');
        console.log(`| TOTAL          | ${String(totalActive).padStart(7)} | ${String(totalPaused).padStart(8)} |     |       |`);
    }

    // 2. Conteo directo de clientes por estado
    console.log('\n\n📋 CONTEO DIRECTO: clientes_ado_notion por status\n');
    const { data: clientsData, error: clientsError } = await supabase
        .from('clientes_ado_notion')
        .select('status, property_coach');

    if (clientsError) {
        console.error('❌ Error al consultar clientes:', clientsError.message);
    } else if (clientsData) {
        const statusCounts = {};
        clientsData.forEach(c => {
            const st = c.status || 'NULL';
            statusCounts[st] = (statusCounts[st] || 0) + 1;
        });

        console.log('| Estado         | Cantidad |');
        console.log('|----------------|----------|');
        Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
            console.log(`| ${status.padEnd(14)} | ${String(count).padStart(8)} |`);
        });
        console.log('|----------------|----------|');
        console.log(`| TOTAL          | ${String(clientsData.length).padStart(8)} |`);

        // 3. Conteo por coach (usando property_coach)
        console.log('\n\n👥 CONTEO POR COACH: property_coach (solo Activo + Pausa)\n');
        const activeClients = clientsData.filter(c =>
            c.status === 'active' || c.status === 'Active' || c.status === 'Activo' ||
            c.status === 'paused' || c.status === 'Paused' || c.status === 'Pausa'
        );

        const coachCounts = {};
        activeClients.forEach(c => {
            const coach = c.property_coach || 'Sin Asignar';
            coachCounts[coach] = (coachCounts[coach] || 0) + 1;
        });

        console.log('| Coach                          | Activos+Pausados |');
        console.log('|--------------------------------|------------------|');
        Object.entries(coachCounts).sort((a, b) => b[1] - a[1]).forEach(([coach, count]) => {
            console.log(`| ${coach.padEnd(30)} | ${String(count).padStart(16)} |`);
        });
        console.log('|--------------------------------|------------------|');
        console.log(`| TOTAL                          | ${String(activeClients.length).padStart(16)} |`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verificación completada\n');
}

main().catch(console.error);
