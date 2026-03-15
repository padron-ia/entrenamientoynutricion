
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('🔍 Revisando detalles de pagos NO nulos...');

    const { data: leads, error } = await supabase
        .from('notion_leads_metrics')
        .select('nombre_lead, pago, dia_agenda, closer')
        .not('pago', 'is', null)
        .order('dia_agenda', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Error:', error);
    } else {
        leads.forEach(l => {
            console.log(`📅 ${l.dia_agenda} | 💰 "${l.pago}" | 👤 ${l.closer} | ${l.nombre_lead}`);
        });
    }
}

main();
