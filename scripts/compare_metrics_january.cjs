
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('--- JANUARY 2026 METRICS ANALYSIS ---');

    // January 2026 range
    // We'll use dia_agenda as the primary date for metrics
    const start = '2026-01-01T00:00:00Z';
    const end = '2026-01-31T23:59:59Z';

    const { data: leads, error } = await supabase
        .from('notion_leads_metrics')
        .select('*')
        .gte('dia_agenda', start)
        .lte('dia_agenda', end);

    if (error) {
        console.error('Error fetching leads:', error);
        return;
    }

    console.log(`Total records found for January: ${leads.length}\n`);

    const stats = {
        'Thaïs': { ADO: createStatsObj(), ME: createStatsObj() },
        'Diana': { ADO: createStatsObj(), ME: createStatsObj() },
        'Others': { ADO: createStatsObj(), ME: createStatsObj() }
    };

    const closers = {};

    leads.forEach(lead => {
        let setter = 'Others';
        if (lead.setter) {
            if (lead.setter.includes('Thaïs') || lead.setter.includes('Thais')) setter = 'Thaïs';
            else if (lead.setter.includes('Diana')) setter = 'Diana';
        }

        const project = (lead.project === 'ME' || (lead.nombre_lead && lead.nombre_lead.toLowerCase().includes('medico'))) ? 'ME' : 'ADO';

        const s = stats[setter][project];

        // Count total conversations (all records in DB for this period)
        if (lead.inb_out === 'Inbound') s.inbound_conv++;
        else if (lead.inb_out === 'Outbound') s.outbound_conv++;

        // Agendas (every record in this query has a dia_agenda in January)
        s.agendas_total++;
        if (lead.inb_out === 'Inbound') s.agendas_inbound++;
        else if (lead.inb_out === 'Outbound') s.agendas_outbound++;

        // Status
        if (lead.estado_lead === 'Cancelado' || lead.estado_lead === 'Cancela') s.cancelations++;
        if (lead.estado_lead === 'No show' || lead.presentado === false) s.no_show++;
        if (lead.presentado === true) s.presentadas++;
        if (lead.cierre === true || lead.estado_lead === 'Cierre' || lead.estado_lead === 'Cerrado') s.cierres++;

        // Closer stats
        if (lead.closer) {
            const closerName = lead.closer.split(' ')[0]; // Use first name
            if (!closers[closerName]) closers[closerName] = { total: 0, closures: 0 };
            closers[closerName].total++;
            if (lead.cierre === true || lead.estado_lead === 'Cierre' || lead.estado_lead === 'Cerrado') {
                closers[closerName].closures++;
            }
        }
    });

    printStats('Thaïs', stats['Thaïs']);
    printStats('Diana', stats['Diana']);

    console.log('--- CLOSER PERFORMANCE ---');
    Object.keys(closers).forEach(name => {
        const c = closers[name];
        const rate = c.total > 0 ? (c.closures / c.total * 100).toFixed(2) : 0;
        console.log(`${name}: ${c.closures} closures from ${c.total} calls (${rate}%)`);
    });
}

function createStatsObj() {
    return {
        inbound_conv: 0,
        outbound_conv: 0,
        agendas_total: 0,
        agendas_inbound: 0,
        agendas_outbound: 0,
        cancelations: 0,
        no_show: 0,
        presentadas: 0,
        cierres: 0
    };
}

function printStats(name, stat) {
    console.log(`\n--- ${name} ---`);
    ['ADO', 'ME'].forEach(proj => {
        const s = stat[proj];
        console.log(`[${proj}]`);
        console.log(`  Inbound Conv: ${s.inbound_conv}`);
        console.log(`  Outbound Conv: ${s.outbound_conv}`);
        console.log(`  Total Agendas: ${s.agendas_total}`);
        console.log(`  Inbound Agendas: ${s.agendas_inbound}`);
        console.log(`  Outbound Agendas: ${s.agendas_outbound}`);
        console.log(`  Cancelations: ${s.cancelations}`);
        console.log(`  No show: ${s.no_show}`);
        console.log(`  Presentadas: ${s.presentadas}`);
        console.log(`  Cierres: ${s.cierres}`);
    });
}

run();
