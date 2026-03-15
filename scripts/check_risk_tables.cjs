const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Try to load .env from the root
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('Checking tables for Risk Alerts and Comments...');

    // Check client_risk_alerts
    const { data: alerts, error: alertsError } = await supabase
        .from('client_risk_alerts')
        .select('id')
        .limit(1);

    if (alertsError) {
        console.error('❌ client_risk_alerts table error:', alertsError.message);
    } else {
        console.log('✅ client_risk_alerts table exists.');
    }

    // Check client_risk_alert_comments
    const { data: comments, error: commentsError } = await supabase
        .from('client_risk_alert_comments')
        .select('id')
        .limit(1);

    if (commentsError) {
        console.error('❌ client_risk_alert_comments table error:', commentsError.message);
    } else {
        console.log('✅ client_risk_alert_comments table exists.');
    }
}

checkTables();
