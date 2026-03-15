
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanup() {
    console.log('🧹 Starting cleanup of notion_leads_metrics...');

    // 1. Correct false setters (Yassine and Sergi)
    console.log('Fixing false setter assignments for Yassine and Sergi...');
    const { error: updateError } = await supabase
        .from('notion_leads_metrics')
        .update({ setter: null })
        .in('setter', ['Yassine', 'Sergi']);

    if (updateError) {
        console.error('Error updating setters:', updateError);
    } else {
        console.log('✅ False setter assignments cleared.');
    }

    // 2. Fetch all leads for January (where the problem is most apparent)
    console.log('Fetching January leads for deduplication...');
    const { data: leads, error: fetchError } = await supabase
        .from('notion_leads_metrics')
        .select('*')
        .gte('dia_agenda', '2026-01-01')
        .lte('dia_agenda', '2026-01-31');

    if (fetchError) {
        console.error('Error fetching leads:', fetchError);
        return;
    }

    console.log(`Processing ${leads.length} leads...`);

    const groups = {};
    leads.forEach(l => {
        const key = `${l.nombre_lead.toLowerCase().trim()}_${l.dia_agenda}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(l);
    });

    const idsToDelete = [];
    const idsToKeep = [];

    Object.entries(groups).forEach(([key, matches]) => {
        if (matches.length > 1) {
            // Find the best record to keep: one with a setter, or most recently updated
            matches.sort((a, b) => {
                const aHasSetter = a.setter ? 1 : 0;
                const bHasSetter = b.setter ? 1 : 0;
                if (aHasSetter !== bHasSetter) return bHasSetter - aHasSetter;
                return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
            });

            const keep = matches[0];
            idsToKeep.push(keep.notion_id);
            matches.slice(1).forEach(m => idsToDelete.push(m.notion_id));
        }
    });

    console.log(`Found ${idsToDelete.length} duplicates to delete.`);

    if (idsToDelete.length > 0) {
        // Delete in chunks to avoid URL length issues or RLS limits
        const chunkSize = 50;
        for (let i = 0; i < idsToDelete.length; i += chunkSize) {
            const chunk = idsToDelete.slice(i, i + chunkSize);
            const { error: deleteError } = await supabase
                .from('notion_leads_metrics')
                .delete()
                .in('notion_id', chunk);

            if (deleteError) {
                console.error(`Error deleting chunk ${i}:`, deleteError);
            } else {
                console.log(`Deleted chunk ${i} (${chunk.length} records).`);
            }
        }
    }

    console.log('🏁 Cleanup finished.');
}

cleanup();
