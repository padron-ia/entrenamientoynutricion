const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://jqupcpuswlsnnghmlbpo.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxdXBjcHVzd2xzbm5naG1sYnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyMDIwMjgsImV4cCI6MjA1MDc3ODAyOH0.941T7L_xWJ9yFvjC73b-eJq3Lq9GZgq-qY3qgW8wH0g';
const supabase = createClient(supabaseUrl, supabaseKey);

// EXACT DATE PARSING LOGIC FROM APP
const toDateStr = (val) => {
    if (!val) return '';
    if (typeof val === 'object' && val !== null) {
        if (val.start) return val.start;
        if (val.date && val.date.start) return val.date.start;
        if (Array.isArray(val) && val.length > 0) return toDateStr(val[0]);
    }
    let str = String(val).trim();
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;

    // SPANISH DATES
    const monthsEs = { 'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12', 'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12' };
    const lowerStr = str.toLowerCase();
    const matchEs = lowerStr.match(/(\d{1,2})\s*(?:de)?\s*([a-z]+)\s*(?:de)?\s*(\d{4})/);
    if (matchEs) {
        const day = matchEs[1].padStart(2, '0');
        const monthNum = monthsEs[matchEs[2]];
        const year = matchEs[3];
        if (monthNum) return `${year}-${monthNum}-${day}`;
    }

    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            return parts[0].length <= 2
                ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
                : str;
        }
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return '';
};

const isJan2026 = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === 0 && d.getFullYear() === 2026;
};

async function run() {
    console.log("Fetching clients...");
    const { data: clients, error } = await supabase.from('clientes_ado_notion').select('*');
    if (error) { console.error(error); return; }

    console.log(`Checking ${clients.length} clients for January 2026 renewals (Coach Jesús)...`);

    const phantomClients = clients.filter(c => {
        // Filter for Jesus
        const coach = (c.property_coach || '').toLowerCase();
        if (!coach.includes('jesus') && !coach.includes('jesús')) return false;

        // Active Status
        const status = (c.property_estado_cliente || '').toLowerCase();
        // Assume Dashboard filters for Active.
        if (status !== 'activo' && status !== 'active' && status !== 'activado') return false;

        const f1 = toDateStr(c.property_fin_fase_1);
        const f2 = toDateStr(c.property_fin_contrato_f2);
        const f3 = toDateStr(c.property_fin_contrato_f3);
        const f4 = toDateStr(c.property_fin_contrato_f4);
        const f5 = toDateStr(c.property_fin_contrato_f5);

        if (isJan2026(f1)) { console.log(`[FOUND] ${c.property_nombre} ${c.property_apellidos} - F1 Ends: ${f1}`); return true; }
        if (isJan2026(f2)) { console.log(`[FOUND] ${c.property_nombre} ${c.property_apellidos} - F2 Ends: ${f2}`); return true; }
        if (isJan2026(f3)) { console.log(`[FOUND] ${c.property_nombre} ${c.property_apellidos} - F3 Ends: ${f3}`); return true; }
        if (isJan2026(f4)) { console.log(`[FOUND] ${c.property_nombre} ${c.property_apellidos} - F4 Ends: ${f4}`); return true; }
        if (isJan2026(f5)) { console.log(`[FOUND] ${c.property_nombre} ${c.property_apellidos} - F5 Ends: ${f5}`); return true; }

        return false;
    });

    if (phantomClients.length === 0) {
        console.log("No Jan 2026 clients found with this script. The issue might be in how Dashboard.tsx calculates dates on the fly differently than this script.");
    }
}

run();
