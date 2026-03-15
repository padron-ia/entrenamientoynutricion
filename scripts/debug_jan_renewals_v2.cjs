const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://jqupcpuswlsnnghmlbpo.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxdXBjcHVzd2xzbm5naG1sYnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyMDIwMjgsImV4cCI6MjA1MDc3ODAyOH0.941T7L_xWJ9yFvjC73b-eJq3Lq9GZgq-qY3qgW8wH0g';
const supabase = createClient(supabaseUrl, supabaseKey);

const todayStr = new Date().toISOString().split('T')[0];

const toDateStr = (val, fallbackToNow = false) => {
    if (!val) {
        return fallbackToNow ? new Date().toISOString().split('T')[0] : '';
    }

    // CASO NOTION JSON COMPLEX STUFF
    if (typeof val === 'object' && val !== null) {
        if (val.start) return val.start;
        if (val.date && val.date.start) return val.date.start;
        if (Array.isArray(val) && val.length > 0) return toDateStr(val[0], fallbackToNow);
    }

    // Clean string
    let str = String(val).trim();

    // Try standard ISO first (YYYY-MM-DD)
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;

    // Try parsing Spanish full date: "24 de enero de 2026" or "10 de noviembre de 2025"
    const monthsEs = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
        'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
        'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    };

    const lowerStr = str.toLowerCase();
    // Regex for "DD de Month de YYYY" or "DD Month YYYY"
    const matchEs = lowerStr.match(/(\d{1,2})\s*(?:de)?\s*([a-z]+)\s*(?:de)?\s*(\d{4})/);

    if (matchEs) {
        const day = matchEs[1].padStart(2, '0');
        const monthText = matchEs[2];
        const year = matchEs[3];
        const monthNum = monthsEs[monthText];
        if (monthNum) {
            return `${year}-${monthNum}-${day}`;
        }
    }

    // Try Slash Format DD/MM/YYYY
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            const d = parts[0].length <= 2
                ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` // DD/MM/YYYY -> YYYY-MM-DD
                : str; // Assume YYYY/MM/DD ?? unlikely but safe fallback

            // Verify it's a valid date
            const date = new Date(d);
            if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        }
    }

    // Fallback to JS Date parser (works for "2025-01-01" etc)
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }

    return fallbackToNow ? new Date().toISOString().split('T')[0] : '';
};

// Helper for 'property_estado_cliente'
const getStatus = (row) => {
    // Check 'status' column first (from SQL)
    if (row.status && row.status !== 'active') return row.status; // Return inactive statuses

    // Check Notion property
    const val = row.property_estado_cliente;
    if (!val) return 'inactive'; // Default
    const txt = JSON.stringify(val).toLowerCase();
    if (txt.includes('pausa')) return 'paused';
    if (txt.includes('abandono') || txt.includes('dropout')) return 'dropout';
    if (txt.includes('baja') || txt.includes('inactivo') || txt.includes('cancelado')) return 'inactive';
    if (txt.includes('completado')) return 'completed';
    return 'active';
};

const getBool = (row, key) => {
    const val = row[key];
    if (val === true || val === 't' || val === 'true') return true; // SQL boolean or string
    // Notion checks not needed as much for 'renewal_fX_contracted' if we trust DB columns, 
    // but better check property_renueva_fX too if needed. 
    // For now assume column is synced.
    return false;
};

async function run() {
    const { data: clients, error } = await supabase
        .from('clientes_ado_notion')
        .select('*');

    if (error) {
        console.error("Error:", error);
        return;
    }

    const jesusClients = clients.filter(c => {
        const coach = JSON.stringify(c.property_coach || '').toLowerCase();
        return coach.includes('jesus') || coach.includes('jesús');
    });

    console.log(`Found ${jesusClients.length} clients for Jesús.`);

    let januaryRenewals = [];
    let overdueRenewals = [];

    jesusClients.forEach(c => {
        const status = getStatus(c);
        if (status !== 'active') return;

        // Extract dates
        const f1_end = toDateStr(c.property_fin_fase_1);
        const f2_end = toDateStr(c.property_fin_contrato_f2);
        const f3_end = toDateStr(c.property_fin_contrato_f3);
        const f4_end = toDateStr(c.property_fin_contrato_f4);

        // Check Renewal Contracted Flags (using DB columns or Notion conventions)
        // Note: In DB commonly 'renewal_f2_contracted' etc.
        const ren_f2 = c.renewal_f2_contracted; // Assuming column exists
        const ren_f3 = c.renewal_f3_contracted;
        const ren_f4 = c.renewal_f4_contracted;
        const ren_f5 = c.renewal_f5_contracted;

        const checkPhase = (phaseName, dateStr, isContracted) => {
            if (!dateStr) return;
            const d = new Date(dateStr);
            const isJan2026 = d.getFullYear() === 2026 && d.getMonth() === 0; // Month is 0-indexed
            const isOverdue = dateStr < todayStr && !isContracted;

            if (isJan2026) {
                januaryRenewals.push({
                    name: c.property_nombre + ' ' + c.property_apellidos,
                    phase: phaseName,
                    endDate: dateStr,
                    isContracted: isContracted,
                    sourceStr: c.property_fin_fase_1 // just for debug
                });
            } else if (isOverdue) {
                overdueRenewals.push({
                    name: c.property_nombre + ' ' + c.property_apellidos,
                    phase: phaseName,
                    endDate: dateStr,
                    contracted: isContracted
                });
            }
        };

        checkPhase('F1->F2', f1_end, ren_f2);
        checkPhase('F2->F3', f2_end, ren_f3);
        checkPhase('F3->F4', f3_end, ren_f4);
        checkPhase('F4->F5', f4_end, ren_f5);
    });

    console.log('\n--- JANUARY 2026 RENEWALS (Strict) ---');
    januaryRenewals.forEach(r => console.log(`${r.name} | ${r.phase} | End: ${r.endDate} | Contracted? ${r.isContracted}`));

    console.log('\n--- OVERDUE RENEWALS (Active & Expired & Not Contracted) ---');
    // Filter out duplicates if same client appears multiple times
    const uniqueOverdue = overdueRenewals.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);
    uniqueOverdue.forEach(r => console.log(`${r.name} | ${r.phase} | End: ${r.endDate}`));
}

run();
