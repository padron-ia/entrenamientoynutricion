
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('Fetching IDs for closers...');
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['closer', 'admin', 'superuser', 'direccion']) // Check potential roles
        .ilike('name', '%Sergi%')
        .or('name.ilike.%Yassine%');

    // Note: The OR syntax above might be tricky in JS client without builder properly. 
    // Let's just fetch all closers and filter in JS to be safe and quick.

    const { data: allClosers, error: allError } = await supabase
        .from('users')
        .select('id, name, role, email');

    if (allError) {
        console.error('Error:', allError);
        return;
    }

    const targetNames = ['yassine', 'sergi', 'elena', 'thais', 'david'];

    console.log('--- Matches ---');
    allClosers.forEach(u => {
        const lowerName = u.name.toLowerCase();
        if (targetNames.some(t => lowerName.includes(t))) {
            console.log(`FOUND: ${u.name} (Role: ${u.role}) -> ID: ${u.id}`);
        }
    });
}

main();
