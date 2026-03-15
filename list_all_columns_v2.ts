
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

async function listAllColumns() {
    let supabaseUrl = '';
    let supabaseKey = '';

    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        supabaseUrl = envContent.match(/SUPABASE_URL=(.*)/)?.[1]?.trim() || '';
        supabaseKey = envContent.match(/SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim() || '';
    } catch (e) {
        console.error("Error reading .env:", e);
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('clientes_pt_notion')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log("--- All Columns in clientes_pt_notion ---");
        const filtered = columns.filter(c =>
            c.includes('period') ||
            c.includes('cycle') ||
            c.includes('hormon') ||
            c.includes('menstru') ||
            c.includes('date')
        );
        console.log("Related columns found:", filtered);

        console.log("\nFull list of columns (alphabetical):");
        console.log(columns.sort().join(', '));
    } else {
        console.log("No data found in clientes_pt_notion to inspect columns.");
    }
}

listAllColumns();
