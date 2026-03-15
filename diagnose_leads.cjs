const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostic() {
    console.log('--- Diagnostic: leads table ---');

    // Try a simple select to see columns
    const { data, error } = await supabase.from('leads').select('*').limit(1);
    if (error) {
        console.error('Error fetching leads:', error);
    } else {
        console.log('Columns in leads:', Object.keys(data[0] || {}));
    }

    // Try to query schema information if possible (might fail depending on permissions, but we are uses service role if available)
    const { data: foreignKeys, error: fkError } = await supabase.rpc('get_table_foreign_keys', { table_name: 'leads' });
    if (fkError) {
        console.log('RPC get_table_foreign_keys failed (as expected if not defined).');

        // Fallback: try different query combinations to narrow down what's missing
        const tests = [
            { name: 'Join setter:users', query: '*, setter:users(name)' },
            { name: 'Join setter:public_users', query: '*, setter:public_users(name)' }, // unlikely
            { name: 'assigned_to filter', query: '*', filter: (q) => q.eq('assigned_to', 'b0971b4d-d016-41d6-90b2-b0871a75c4bf') },
            { name: 'closer_id filter', query: '*', filter: (q) => q.eq('closer_id', 'b0971b4d-d016-41d6-90b2-b0871a75c4bf') },
        ];

        for (const test of tests) {
            let q = supabase.from('leads').select(test.query);
            if (test.filter) q = test.filter(q);
            const { error: testError } = await q.limit(1);
            console.log(`Test [${test.name}]: ${testError ? 'FAILED: ' + testError.message : 'SUCCESS'}`);
        }
    } else {
        console.log('Foreign Keys:', JSON.stringify(foreignKeys, null, 2));
    }
}

diagnostic();
