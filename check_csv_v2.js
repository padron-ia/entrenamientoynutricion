import fs from 'fs';
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

const csvData = fs.readFileSync('temp_notion/Clientes 1127c005e40081b08517cd1ea5362340_all.csv', 'utf8');
const lines = csvData.split('\n');

let headers = null;
let currentRecord = '';
let inQuotes = false;
let records = [];

for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuotes = !inQuotes;
    }
    currentRecord += (currentRecord ? '\n' : '') + line;
    if (!inQuotes) {
        records.push(currentRecord);
        currentRecord = '';
    }
}

headers = parseCSVLine(records[0]);
const idx = headers.indexOf('Inicio programa');
console.log('Inicio programa Index:', idx);

const francisca = records.find(r => r.includes('paquimouzo@hotmail.es'));
if (francisca) {
    const vals = parseCSVLine(francisca);
    console.log('Francisca columns:', vals.length);
    console.log('Francisca Inicio programa:', vals[idx]);
    console.log('Francisca Full Name:', vals[headers.indexOf('Nombre')], vals[headers.indexOf('Apellidos')]);
} else {
    console.log('Francisca NOT found by email');
}
