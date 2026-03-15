
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('🔍 Contando registros con PAGO válido...');

    // We can't easily check "is not null" with Supabase JS .not('pago', 'is', null) syntax sometimes tricky with nulls
    // But .neq('pago', null) might work or .not('pago', 'is', null)

    // Actually, let's just fetch some that are NOT null using .neq
    // But 'neq' with null is tricky in SQL.
    // Try .not('pago', 'is', null)

    const { count, error } = await supabase
        .from('notion_leads_metrics')
        .select('*', { count: 'exact', head: true })
        .not('pago', 'is', null);

    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log(`✅ Registros con pago NO nulo: ${count}`);
    }
}

main();
