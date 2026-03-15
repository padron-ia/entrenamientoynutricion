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

const headers = parseCSVLine(records[0]);
const idx = headers.indexOf('Inicio programa');

console.log('Searching for clients with Inicio programa date...');
const withDate = records.filter((r, i) => {
    if (i === 0) return false;
    const vals = parseCSVLine(r);
    return vals[idx] && vals[idx].trim() !== '';
}).slice(0, 5);

withDate.forEach(r => {
    const vals = parseCSVLine(r);
    console.log(`- ${vals[headers.indexOf('Nombre')]} ${vals[headers.indexOf('Apellidos')]}: ${vals[idx]} (Email: ${vals[headers.indexOf('Correo electrónico')]})`);
});
