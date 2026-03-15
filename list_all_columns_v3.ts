
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
        fs.writeFileSync('all_columns.txt', "Error fetching data: " + JSON.stringify(error), 'utf8');
        return;
    }

    if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        let output = "--- All Columns in clientes_pt_notion ---\n";
        const filtered = columns.filter(c =>
            c.includes('period') ||
            c.includes('cycle') ||
            c.includes('hormon') ||
            c.includes('menstru') ||
            c.includes('date')
        );
        output += "Related columns found: " + JSON.stringify(filtered) + "\n\n";
        output += "Full list of columns (alphabetical):\n";
        output += columns.sort().join(', ');
        fs.writeFileSync('all_columns.txt', output, 'utf8');
    } else {
        fs.writeFileSync('all_columns.txt', "No data found in clientes_pt_notion to inspect columns.", 'utf8');
    }
}

listAllColumns();
