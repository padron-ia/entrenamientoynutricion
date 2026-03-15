
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('🔍 Verificando ventas sincronizadas para Yassine...');

    // 1. Get Yassine's ID
    const { data: users } = await supabase.from('users').select('id, name').ilike('name', '%Yassine%');

    if (!users || users.length === 0) {
        console.log('❌ No se encontró el usuario Yassine.');
        return;
    }

    const yassine = users[0];
    console.log(`👤 Usuario encontrado: ${yassine.name} (${yassine.id})`);

    // 2. Count sales
    const { data: sales, error } = await supabase
        .from('sales')
        .select('id, sale_amount, sale_date, client_first_name')
        .eq('closer_id', yassine.id)
        .order('sale_date', { ascending: false });

    if (error) {
        console.error('❌ Error consultando ventas:', error);
    } else {
        console.log(`✅ Total Ventas encontradas: ${sales.length}`);
        console.log('--- Últimas 5 ventas ---');
        sales.slice(0, 5).forEach(s => {
            console.log(`📅 ${s.sale_date.split('T')[0]} | 💰 ${s.sale_amount}€ | 👤 ${s.client_first_name}`);
        });
    }
}

main();
