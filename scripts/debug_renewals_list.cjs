
const fs = require('fs');
const path = require('path');

// --- HELPER FUNCTIONS ---

const getVal = (row, keys) => {
    if (!row) return undefined;
    const rowKeys = Object.keys(row);
    for (const searchKey of keys) {
        if (row[searchKey] !== undefined && row[searchKey] !== null) return row[searchKey];
        const found = rowKeys.find(k => k.toLowerCase().trim() === searchKey.toLowerCase().trim());
        if (found) return row[found];
    }
    return undefined;
};

const parseText = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'object') {
        if (val.plain_text) return val.plain_text;
        if (Array.isArray(val) && val.length > 0) return parseText(val[0]);
    }
    return String(val);
};

const toBool = (val) => {
    if (val === true || val === 'true' || val === 'TRUE') return true;
    if (typeof val === 'string' && val.toLowerCase().includes('si')) return true;
    return false;
};

const toDateStr = (val) => {
    if (!val) return '';
    if (typeof val === 'string') {
        if (val.includes('/')) {
            const [d, m, y] = val.split('/');
            return `${y}-${m}-${d}`;
        }
        return val.split('T')[0];
    }
    return '';
};

const addMonths = (dateStr, months) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setMonth(d.getMonth() + Number(months));
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

const parseDuration = (val) => {
    const txt = parseText(val);
    const match = txt.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[0]) : 0;
};


// --- MAIN ANALYSIS ---

const jsonRaw = fs.readFileSync('c:\\Users\\jmart\\Downloads\\clientes_activos.json', 'utf8');
const cleanJson = jsonRaw.replace(/:\s*NaN/g, ': null');
const data = JSON.parse(cleanJson);

const currentMonth = 0; // JANUARY
const currentYear = 2026;

console.log(`\n=== BUSCANDO CLIENTES DE JESUS CON FIN DE CONTRATO EN ENERO 2026 ===\n`);

data.forEach(row => {
    const name = parseText(getVal(row, ['property_nombre', 'firstName'])) + ' ' + parseText(getVal(row, ['property_apellidos', 'surname']));
    const coachRaw = parseText(getVal(row, ['coach_id', 'property_coach']));
    const status = parseText(getVal(row, ['property_estado_cliente', 'status']));

    // Filter relevant clients
    if (!status.toLowerCase().includes('activo') && !status.toLowerCase().includes('active')) return;
    if (!coachRaw.toLowerCase().includes('jesus') && !coachRaw.toLowerCase().includes('jesús')) return;

    const f1StartStr = toDateStr(getVal(row, ['property_inicio_programa', 'start_date']));
    const f1Duration = parseDuration(getVal(row, ['property_contratado_f1', 'program_duration_months']));

    // Calculate End Dates
    const f1EndDate = toDateStr(getVal(row, ['property_fin_fase_1'])) || addMonths(f1StartStr, f1Duration || 6);

    const isRenF2 = toBool(getVal(row, ['property_renueva_f2', 'renewal_f2_contracted']));
    const f2Duration = parseDuration(getVal(row, ['property_contratado_renovaci_n_f2']));

    const f2Start = toDateStr(getVal(row, ['property_renovaci_n_f2_nueva'])) || f1EndDate;
    const f2End = toDateStr(getVal(row, ['property_fin_contrato_f2'])) || addMonths(f2Start, f2Duration);

    const isRenF3 = toBool(getVal(row, ['property_renueva_f3']));
    const f3Duration = parseDuration(getVal(row, ['property_contratado_renovaci_n_f3']));

    const f3Start = toDateStr(getVal(row, ['property_renovaci_n_f3'])) || f2End;
    const f3End = toDateStr(getVal(row, ['property_fin_contrato_f3'])) || addMonths(f3Start, f3Duration);

    const isTargetMonth = (dStr) => {
        if (!dStr) return false;
        const d = new Date(dStr);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }

    if (isTargetMonth(f1EndDate)) {
        console.log(`🔎 [${name}] - Fin F1: ${f1EndDate} | Renovado F2: ${isRenF2 ? 'SÍ' : 'NO'}`);
    }
    if (isTargetMonth(f2End)) {
        console.log(`🔎 [${name}] - Fin F2: ${f2End} | Renovado F3: ${isRenF3 ? 'SÍ' : 'NO'}`);
    }
    if (isTargetMonth(f3End)) {
        console.log(`🔎 [${name}] - Fin F3: ${f3End}`);
    }

    // Check master end date as fallback
    const masterEnd = toDateStr(getVal(row, ['property_fecha_fin_contrato_actual']));
    if (masterEnd && isTargetMonth(masterEnd) && masterEnd !== f1EndDate && masterEnd !== f2End && masterEnd !== f3End) {
        console.log(`🔎 [${name}] - Fin Contrato Maestro: ${masterEnd}`);
    }
});
