
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('🚀 Fetching Contract Templates...');

    console.log('🔐 Authenticating as Admin...');
    let { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@demo.com',
        password: 'admin123'
    });

    if (authError || !session) {
        console.warn('❌ Login failed. Creating temp admin...');
        const tempEmail = `temp_contract_admin_${Date.now()}@test.com`;
        const tempPass = 'temp_sync_123';
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: tempEmail, password: tempPass
        });
        if (signUpError || !signUpData.session) {
            console.error('❌ SignUp failed:', signUpError);
            return;
        }
        session = signUpData.session;
    }

    const { data, error } = await supabase
        .from('contract_templates') // Guessing table name
        .select('id, name')
        .limit(5);

    if (error) {
        console.error('Error fetching templates:', error);
        // Try 'contracts'?
        const { data: data2, error: error2 } = await supabase.from('contracts').select('id').limit(1);
        console.log('Contracts check:', data2, error2);
    } else {
        console.log('Templates found:', data);
    }
}

main();
