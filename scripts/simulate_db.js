
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://zugtswtpoohnpycnjwrp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo'
);

// --- REPLICATING MOCKSUPABASE.TS LOGIC EXACTLY ---

const getVal = (row, keys) => {
    if (!row) return undefined;
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return undefined;
};

const parseText = (val) => String(val || '').trim();

const toBool = (val) => {
    if (val === true || val === 'TRUE' || val === 'true') return true;
    if (typeof val === 'string' && val.toLowerCase().trim() === 'sí') return true;
    return false;
};

const toDateStr = (val) => {
    if (!val) return '';
    if (typeof val === 'string') {
        if (val.includes('/')) {
            const [d, m, y] = val.split('/');
            return `${y}-${m}-${d}`;
        }
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
};

const parseDuration = (val) => {
    const txt = parseText(val);
    const match = txt.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[0]) : 0;
};

const addMonths = (dateStr, months) => {
    if (!dateStr) return '';
    if (months <= 0) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setMonth(d.getMonth() + Number(months));
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    return months > 0 ? months : 0;
};

// --- SIMULATION ---

async function run() {
    console.log("\n=== SIMULACIÓN EXACTA DASHBOARD (CON DB) PARA JESÚS - ENERO 2026 ===\n");

    // 1. Fetch
    const { data: rawRows, error } = await supabase.from('clientes_pt_notion').select('*');
    if (error) { console.error(error); return; }

    const TARGET_MONTH = 0; // Jan
    const TARGET_YEAR = 2026;
    let total = 0;
    let done = 0;

    rawRows.forEach(row => {
        // --- MAP ROW TO CLIENT (PARTIAL) ---

        // Coach Filter
        const coachRaw = parseText(getVal(row, ['coach_id', 'property_coach']));
        if (!coachRaw.toLowerCase().includes('jes')) return;

        // Status Filter
        const statusRaw = parseText(getVal(row, ['property_estado_cliente', 'status']));
        const isActive = statusRaw.toLowerCase().includes('activo') || statusRaw.toLowerCase().includes('active');
        if (!isActive) return;

        const name = parseText(getVal(row, ['property_nombre'])) + ' ' + parseText(getVal(row, ['property_apellidos']));

        // --- PHASE LOGIC ---
        const f1StartStr = toDateStr(getVal(row, ['property_inicio_programa']));
        const f1DurationRaw = getVal(row, ['property_contratado_f1', 'program_duration_months']);
        const f1Duration = parseDuration(f1DurationRaw);

        const isRenF2 = toBool(getVal(row, ['property_renueva_f2']));
        const isRenF3 = toBool(getVal(row, ['property_renueva_f3']));
        const isRenF4 = toBool(getVal(row, ['property_renueva_f4']));
        const isRenF5 = toBool(getVal(row, ['property_renueva_f5']));

        // Durations
        const f2DurationCol = parseDuration(getVal(row, ['property_contratado_renovaci_n_f2']));
        const f3DurationCol = parseDuration(getVal(row, ['property_contratado_renovaci_n_f3']));
        const f4DurationCol = parseDuration(getVal(row, ['property_contratado_renovaci_n_f4']));
        const f5DurationCol = parseDuration(getVal(row, ['property_contratado_renovaci_n_f5']));

        // Calc Dates
        let f1EndDate = toDateStr(getVal(row, ['property_fin_fase_1'])) || addMonths(f1StartStr, f1Duration || 6);

        let f2Start = toDateStr(getVal(row, ['property_renovaci_n_f2_nueva']));
        if (!f2Start) f2Start = f1EndDate;

        let f2End = toDateStr(getVal(row, ['property_fin_contrato_f2'])) || addMonths(f2Start, f2DurationCol);

        let f3Start = isRenF2 ? (toDateStr(getVal(row, ['property_renovaci_n_f3'])) || f2End) : '';
        let f3End = isRenF2 ? (toDateStr(getVal(row, ['property_fin_contrato_f3'])) || addMonths(f3Start, f3DurationCol)) : '';

        let f4Start = isRenF3 ? (toDateStr(getVal(row, ['property_renovaci_n_f4'])) || f3End) : '';
        let f4End = isRenF3 ? (toDateStr(getVal(row, ['property_fin_contrato_f4'])) || addMonths(f4Start, f4DurationCol)) : '';

        // --- DASHBOARD CHECK ---
        const check = (dStr, contracted, label) => {
            if (!dStr) return;
            const d = new Date(dStr);
            if (isNaN(d.getTime())) return;

            if (d.getMonth() === TARGET_MONTH && d.getFullYear() === TARGET_YEAR) {
                total++;
                if (contracted) done++;
                const st = contracted ? "✅ COMPLETADA" : "🟠 PENDIENTE";
                console.log(`👤 ${name}`);
                console.log(`   - ${label}: ${dStr} (${st})`);
            }
        };

        check(f1EndDate, isRenF2, 'F1 End');
        check(f2End, isRenF3, 'F2 End');
        check(f3End, isRenF4, 'F3 End');
        check(f4End, isRenF5, 'F4 End');
    });

    console.log(`\nTOTAL: ${total} | DONE: ${done}`);
}

run().catch(console.error);
