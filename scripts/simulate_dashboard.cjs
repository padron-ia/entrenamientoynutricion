
const fs = require('fs');

// --- MOCK SUPABASE UTILS (SIMULATED) ---
const parseText = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'object') {
        if (val.plain_text) return val.plain_text;
        if (Array.isArray(val) && val.length > 0) return parseText(val[0]);
    }
    return String(val);
};

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

const toDateStr = (val) => {
    if (!val) return '';
    if (typeof val === 'string') {
        if (val.includes('/')) {
            const [d, m, y] = val.split('/');
            return `${y}-${m}-${d}`;
        }
        // Handle "24 de enero de 2026"
        const monthsEs = {
            'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
            'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        };
        const match = val.toLowerCase().match(/(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/);
        if (match) {
            return `${match[3]}-${monthsEs[match[2]]}-${match[1].padStart(2, '0')}`;
        }
        return val.split('T')[0];
    }
    return '';
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
    d.setDate(d.getDate() - 1); // Notion logic: 1 day less
    return d.toISOString().split('T')[0];
};

const toBool = (val) => {
    if (val === true || val === 'true' || val === 'TRUE') return true;
    if (typeof val === 'string' && val.toLowerCase().includes('si')) return true;
    return false;
};

// --- SIMULATION ---

const jsonRaw = fs.readFileSync('c:\\Users\\jmart\\Downloads\\clientes_activos.json', 'utf8');
const cleanJson = jsonRaw.replace(/:\s*NaN/g, ': null');
const data = JSON.parse(cleanJson);

console.log("\n=== SIMULANDO DASHBOARD PARA JESÚS - ENERO 2026 ===\n");

const TARGET_MONTH = 0; // Jan
const TARGET_YEAR = 2026;

let countTotal = 0;
let countDone = 0;

data.forEach(row => {
    // 1. Filter Coach & Status
    const coachRaw = parseText(getVal(row, ['coach_id', 'property_coach']));
    const status = parseText(getVal(row, ['property_estado_cliente', 'status']));

    if (!coachRaw.toLowerCase().includes('jes')) return;
    if (!status.toLowerCase().includes('activo') && !status.toLowerCase().includes('active')) return;

    // 2. Map Client Data (Simplified from mockSupabase.ts)
    const name = parseText(getVal(row, ['property_nombre', 'firstName'])) + ' ' + parseText(getVal(row, ['property_apellidos', 'surname']));

    // Dates
    const f1StartStr = toDateStr(getVal(row, ['property_inicio_programa', 'start_date']));
    const f1Duration = parseDuration(getVal(row, ['property_contratado_f1', 'program_duration_months']));

    // Phase 1 End
    const f1EndDate = toDateStr(getVal(row, ['property_fin_fase_1'])) || addMonths(f1StartStr, f1Duration || 6);

    // Phase 2
    const isRenF2 = toBool(getVal(row, ['property_renueva_f2']));
    const f2Duration = parseDuration(getVal(row, ['property_contratado_renovaci_n_f2']));
    const f2Start = toDateStr(getVal(row, ['property_renovaci_n_f2_nueva'])) || f1EndDate;
    const f2End = toDateStr(getVal(row, ['property_fin_contrato_f2'])) || addMonths(f2Start, f2Duration);

    // Phase 3
    const isRenF3 = toBool(getVal(row, ['property_renueva_f3']));
    const f3Duration = parseDuration(getVal(row, ['property_contratado_renovaci_n_f3']));
    const f3Start = toDateStr(getVal(row, ['property_renovaci_n_f3'])) || f2End;
    const f3End = toDateStr(getVal(row, ['property_fin_contrato_f3'])) || addMonths(f3Start, f3Duration);

    // Phase 4
    const isRenF4 = toBool(getVal(row, ['property_renueva_f4']));
    const f4Duration = parseDuration(getVal(row, ['property_contratado_renovaci_n_f4']));
    const f4Start = toDateStr(getVal(row, ['property_renovaci_n_f4'])) || f3End;
    const f4End = toDateStr(getVal(row, ['property_fin_contrato_f4'])) || addMonths(f4Start, f4Duration);

    // Phase 5
    const isRenF5 = toBool(getVal(row, ['property_renueva_f5']));
    const f5Duration = parseDuration(getVal(row, ['property_contratado_renovaci_n_f5']));
    const f5Start = toDateStr(getVal(row, ['property_renovaci_n_f5'])) || f4End;
    const f5End = toDateStr(getVal(row, ['property_fin_contrato_f5'])) || addMonths(f5Start, f5Duration);

    // -- DASHBOARD LOGIC CHECK --
    const checkPhase = (dateStr, isContracted, label) => {
        if (!dateStr) return;
        const d = new Date(dateStr);
        if (d.getMonth() === TARGET_MONTH && d.getFullYear() === TARGET_YEAR) {
            countTotal++;
            const statusStr = isContracted ? "VERDE (Completado)" : "NARANJA (Pendiente)";
            console.log(`🎯 [${name}]`);
            console.log(`   - Fase: ${label}`);
            console.log(`   - Fin: ${dateStr}`);
            console.log(`   - Estado: ${statusStr}`);
            if (isContracted) countDone++;
            console.log("-----------------------------------");
        }
    };

    checkPhase(f1EndDate, isRenF2, 'Fase 1 -> Renueva a F2');
    checkPhase(f2End, isRenF3, 'Fase 2 -> Renueva a F3');
    checkPhase(f3End, isRenF4, 'Fase 3 -> Renueva a F4');
    checkPhase(f4End, isRenF5, 'Fase 4 -> Renueva a F5');
});

console.log(`\nRESUMEN: Total ${countTotal} | Completados ${countDone} | Pendientes ${countTotal - countDone}`);
