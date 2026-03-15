
const { createClient } = require('@supabase/supabase-js');

// Hardcoded for debugging (copied from import_notion_complete.js)
const SUPABASE_URL = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';
// Note: using anon key from other file might block access to users table if RLS prevents listing. 
// But the user mentioned admin access issues before. Let's try.
// ideally I should use service role key if I have it. 
// I'll check if I can find it in .env, but for now I'll use the one I found.

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('Checking notion_leads_metrics for Yassine...');
    const { data: notionLeads, error: notionError } = await supabase
        .from('notion_leads_metrics')
        .select('*')
        .ilike('closer', '%Yassine%')
        .limit(10);

    if (notionError) {
        console.error('Error fetching notion_leads_metrics:', notionError);
    } else {
        console.log(`Found ${notionLeads.length} leads for Yassine in notion_leads_metrics.`);
        notionLeads.forEach(l => {
            console.log(`- ${l.nombre_lead} (${l.dia_agenda}): Cierre=${l.cierre}, Pago=${l.pago}`);
        });
    }

    console.log('\nChecking users table for Yassine...');
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, name, role')
        .ilike('name', '%Yassine%');

    if (userError) {
        console.error('Error fetching users:', userError);
    } else {
        console.log(`Found ${users.length} users matching Yassine:`);
        users.forEach(u => console.log(`- ${u.name} (${u.role}) ID: ${u.id}`));

        if (users.length > 0) {
            const yassineId = users[0].id;
            console.log(`\nChecking sales table for user ${yassineId}...`);
            const { data: sales, error: salesError } = await supabase
                .from('sales')
                .select('*')
                .eq('closer_id', yassineId);

            if (salesError) {
                console.error('Error fetching sales:', salesError);
            } else {
                console.log(`Found ${sales.length} sales for Yassine in sales table.`);
            }
        }
    }
}

main();
