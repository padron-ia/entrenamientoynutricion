const fs = require('fs');

// Path from user metadata
const FILE_PATH = 'C:/Users/jmart/Downloads/clientes_activos.json';

const toDateStr = (val) => {
    if (!val) return '';
    if (typeof val === 'object' && val !== null) {
        if (val.start) return val.start;
        if (val.date && val.date.start) return val.date.start;
        if (Array.isArray(val) && val.length > 0) return toDateStr(val[0]);
    }
    let str = String(val).trim();
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;

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

const toBool = (val) => {
    if (val === true || val === 'TRUE' || val === 'true') return true;
    if (val === 't' || val === 'T') return true;
    if (val === 1 || val === '1') return true;
    if (typeof val === 'string') {
        const v = val.toLowerCase().trim();
        if (v === 'sí' || v === 'si' || v === 'yes' || v === 'on') return true;
    }
    return false;
};

const isJan2026 = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === 0 && d.getFullYear() === 2026;
};

try {
    console.log(`Reading ${FILE_PATH}...`);
    const raw = fs.readFileSync(FILE_PATH, 'utf8');
    // Handle BOM if present
    let jsonStr = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
    jsonStr = jsonStr.replace(/:\s*NaN\b/g, ': null');

    let clients = JSON.parse(jsonStr);

    // Check if wrapped in results
    if (clients.results) clients = clients.results;
    if (!Array.isArray(clients)) {
        console.log("JSON is not an array. Keys:", Object.keys(clients));
        clients = [];
    }

    console.log(`Loaded ${clients.length} clients.`);

    const jesusClients = clients.filter(c => {
        const coach = JSON.stringify(c.property_coach || c.coach_id || '').toLowerCase();
        return coach.includes('jesus') || coach.includes('jesús');
    });

    console.log(`Found ${jesusClients.length} clients for Jesús.`);

    console.log("\n--- SEARCHING FOR JANUARY 2026 RENEWALS ---");

    let count = 0;

    jesusClients.forEach(c => {
        const status = JSON.stringify(c.property_estado_cliente || c.status || '').toLowerCase();
        // Assuming user filters for Active, but let's print inactive matches as WARNINGS
        const isActive = status.includes('activo') || status.includes('active');

        const name = `${c.property_nombre || c.firstName || 'Unknown'} ${c.property_apellidos || c.surname || ''}`.trim();

        // Extract dates
        const f1 = toDateStr(c.property_fin_fase_1);
        const f2 = toDateStr(c.property_fin_contrato_f2);
        const f3 = toDateStr(c.property_fin_contrato_f3);
        const f4 = toDateStr(c.property_fin_contrato_f4);
        const f5 = toDateStr(c.property_fin_contrato_f5);

        // Check flags
        const renF2 = toBool(c.property_renueva_f2);
        const renF3 = toBool(c.property_renueva_f3);
        const renF4 = toBool(c.property_renueva_f4);
        const renF5 = toBool(c.property_renueva_f5);

        let matches = [];
        if (isJan2026(f1)) matches.push({ phase: 'F1->F2', date: f1, done: renF2 });
        if (isJan2026(f2)) matches.push({ phase: 'F2->F3', date: f2, done: renF3 });
        if (isJan2026(f3)) matches.push({ phase: 'F3->F4', date: f3, done: renF4 });
        if (isJan2026(f4)) matches.push({ phase: 'F4->F5', date: f4, done: renF5 });
        if (isJan2026(f5)) matches.push({ phase: 'F5->End', date: f5, done: false });

        if (matches.length > 0) {
            count++;
            const statusLabel = isActive ? "ACTIVE" : `INACTIVE (${status})`;
            console.log(`\n[${statusLabel}] ${name} (ID: ${c.id})`);
            matches.forEach(m => {
                console.log(`   > ${m.phase}: Ends ${m.date} | Renovado/Done? ${m.done ? 'YES' : 'NO'}`);
            });
        }
    });

    console.log(`\nTotal Matches Found: ${count}`);

} catch (err) {
    console.error("Error:", err.message);
}
