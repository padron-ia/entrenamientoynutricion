
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://zugtswtpoohnpycnjwrp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo'
);

// ... helper/logic ...
const getVal = (row, keys) => {
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
    if (typeof val === 'string' && val.includes('/')) {
        const [d, m, y] = val.split('/');
        return `${y}-${m}-${d}`;
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
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setMonth(d.getMonth() + Number(months));
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

async function checkAll() {
    console.log("SEARCHING ALL JAN 2026 END DATES...");
    const { data: rows } = await supabase.from('clientes_pt_notion').select('*');

    rows.forEach(row => {
        const name = parseText(getVal(row, ['property_nombre'])) + ' ' + parseText(getVal(row, ['property_apellidos']));
        const coach = parseText(getVal(row, ['coach_id', 'property_coach']));

        const f1StartStr = toDateStr(getVal(row, ['property_inicio_programa']));
        const f1Duration = parseDuration(getVal(row, ['property_contratado_f1', 'program_duration_months']));

        const f1EndDate = toDateStr(getVal(row, ['property_fin_fase_1'])) || addMonths(f1StartStr, f1Duration || 6);

        // F2
        const f2Duration = parseDuration(getVal(row, ['property_contratado_renovaci_n_f2']));
        const f2Start = toDateStr(getVal(row, ['property_renovaci_n_f2_nueva'])) || f1EndDate;
        const f2End = toDateStr(getVal(row, ['property_fin_contrato_f2'])) || addMonths(f2Start, f2Duration);

        // F3
        const f3Duration = parseDuration(getVal(row, ['property_contratado_renovaci_n_f3']));
        const f3Start = toDateStr(getVal(row, ['property_renovaci_n_f3'])) || f2End;
        const f3End = toDateStr(getVal(row, ['property_fin_contrato_f3'])) || addMonths(f3Start, f3Duration);

        const check = (d, label) => {
            if (!d) return;
            const date = new Date(d);
            if (date.getMonth() === 0 && date.getFullYear() === 2026) {
                console.log(`MATCH: ${name} (${coach}) -> ${label}: ${d}`);
            }
        };

        check(f1EndDate, 'F1 End');
        check(f2End, 'F2 End');
        check(f3End, 'F3 End');
    });
}
checkAll().catch(console.error);
