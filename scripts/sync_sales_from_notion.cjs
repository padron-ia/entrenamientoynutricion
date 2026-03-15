
const { createClient } = require('@supabase/supabase-js');

// Hardcoded for debugging
const SUPABASE_URL = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function parseCurrency(val) {
    if (!val) return 0;
    let clean = val.replace(/€/g, '').trim();
    if (clean.includes(',') && clean.includes('.')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
    }
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

// Helper to map project
function determineProject(lead) {
    return 'ADO';
}

async function main() {
    console.log('🚀 Starting Sales Sync from Notion Leads Metrics...');

    console.log('🔐 Authenticating as Admin...');
    let { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@demo.com',
        password: 'admin123'
    });

    if (authError || !session) {
        console.warn('❌ Login failed. Creating temp admin...');
        const tempEmail = `temp_sync_admin_${Date.now()}@test.com`;
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

    // Get a default coach (use the admin/director user if no 'coach' found)
    let defaultCoachId = null;
    const { data: defaultCoach } = await supabase.from('users').select('id').in('role', ['admin', 'superuser', 'direccion']).limit(1).maybeSingle();
    if (defaultCoach) defaultCoachId = defaultCoach.id;
    console.log(`Default Assigned Coach ID: ${defaultCoachId}`);


    const { data: closers } = await supabase.from('users').select('id, name').in('role', ['closer', 'admin', 'superuser', 'direccion']);
    const closerMap = {};
    closers.forEach(c => {
        closerMap[c.name.toLowerCase().trim()] = c.id;
        const firstName = c.name.split(' ')[0].toLowerCase().trim();
        if (!closerMap[firstName]) closerMap[firstName] = c.id;
    });

    const { data: leads } = await supabase.from('notion_leads_metrics').select('*').eq('cierre', true);
    console.log(`Found ${leads.length} closed leads.`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    const CONTRACT_TEMPLATE_ID = '2361c528-f828-41d8-936a-28cacf7abbb1';

    for (const lead of leads) {
        const closerName = (lead.closer || '').toLowerCase().trim();
        let closerId = closerMap[closerName] || Object.keys(closerMap).find(k => closerName.includes(k));

        if (!closerId) {
            if (closerName.includes('yassine')) closerId = closerMap['yassine'];
            if (closerName.includes('sergi')) closerId = closerMap['sergi'];
        }

        if (!closerId) {
            skipped++;
            continue;
        }
        const realCloserId = typeof closerId === 'string' ? closerId : closerMap[closerId];
        const amount = parseCurrency(lead.pago);
        const saleDate = lead.dia_agenda || new Date().toISOString();
        const parts = (lead.nombre_lead || 'Unknown').split(' ');
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');

        const { data: existing } = await supabase
            .from('sales')
            .select('id, sale_amount')
            .eq('closer_id', realCloserId)
            .ilike('client_first_name', firstName)
            .maybeSingle();

        if (existing) {
            // Check if we need to update amount (if existing was 0 and new is > 0)
            if (existing.sale_amount === 0 && amount > 0) {
                const { error: updateError } = await supabase
                    .from('sales')
                    .update({ sale_amount: amount, payment_method: 'Notion Import (Fixed)' })
                    .eq('id', existing.id);

                if (!updateError) {
                    console.log(`🔄 Updated amount for ${firstName}: 0 -> ${amount}€`);
                    errors++; // Using errors counter to track updates just for log summary simplicity or add new counter
                } else {
                    console.error(`Error updating ${firstName}:`, updateError);
                }
            } else {
                skipped++;
            }
            continue;
        }

        const newSale = {
            closer_id: realCloserId,
            assigned_coach_id: defaultCoachId, // Fix not null
            client_first_name: firstName,
            client_last_name: lastName || '-',
            client_email: `${firstName.toLowerCase()}.${(lastName || '').toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/g, '')}${Date.now()}@placeholder.com`,
            client_phone: lead.telefono || '000000000',
            sale_amount: amount,
            status: 'completed',
            sale_date: saleDate,
            payment_method: 'Notion Import',
            contract_duration: 6,
            contract_template_id: CONTRACT_TEMPLATE_ID,
            hotmart_payment_link: 'manual-import',
            payment_receipt_url: 'manual-import',
            created_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase.from('sales').insert([newSale]);

        if (insertError) {
            console.error(`Error inserting ${firstName}:`, insertError.message);
            errors++;
        } else {
            console.log(`✅ Inserted: ${firstName} ${lastName}`);
            inserted++;
        }
    }
    console.log(`Sync Complete. Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`);
}

main();
