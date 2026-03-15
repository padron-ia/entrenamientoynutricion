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
const lines = csvData.split('\n').filter(l => l.trim() !== '');

const salvador = lines.find(l => l.includes('Salvador') && l.includes('Requena'));
if (salvador) {
    const vals = parseCSVLine(salvador);
    console.log('Salvador columns:', vals.length);
    if (vals.length > 106) console.log('Salvador Start Date:', vals[106]);
}

const francisca = lines.find(l => l.includes('Francisca') && l.includes('Mouzo'));
if (francisca) {
    const vals = parseCSVLine(francisca);
    console.log('Francisca columns:', vals.length);
}
