
const fs = require('fs');
// ... (Previous imports)

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

// ... (Other helpers same as before)
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


const jsonRaw = fs.readFileSync('c:\\Users\\jmart\\Downloads\\clientes_activos.json', 'utf8');
const cleanJson = jsonRaw.replace(/:\s*NaN/g, ': null');
const data = JSON.parse(cleanJson);

console.log(`\n=== DUMP DE FECHAS PARA CLIENTES DE JESUS ===\n`);

data.forEach(row => {
    const name = parseText(getVal(row, ['property_nombre', 'firstName'])) + ' ' + parseText(getVal(row, ['property_apellidos', 'surname']));
    const coachRaw = parseText(getVal(row, ['coach_id', 'property_coach']));
    const status = parseText(getVal(row, ['property_estado_cliente', 'status']));
    const masterEnd = toDateStr(getVal(row, ['property_fecha_fin_contrato_actual']));

    // Loose coach match
    if (coachRaw.toLowerCase().includes('jes')) {
        console.log(`User: ${name} | Status: ${status} | Coach: ${coachRaw}`);
        console.log(`   - Master End Date: ${masterEnd}`);

        const f1Start = toDateStr(getVal(row, ['property_inicio_programa']));
        const f1End = toDateStr(getVal(row, ['property_fin_fase_1']));
        const f2End = toDateStr(getVal(row, ['property_fin_contrato_f2']));
        const f3End = toDateStr(getVal(row, ['property_fin_contrato_f3']));

        console.log(`   - F1 End: ${f1End}`);
        console.log(`   - F2 End: ${f2End}`);
        console.log(`   - F3 End: ${f3End}`);
        console.log('---');
    }
});
