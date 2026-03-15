
const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\jmart\\Downloads\\clientes_activos.json';
const jsonRaw = fs.readFileSync(filePath, 'utf8');
// Clean NaN
const cleanJson = jsonRaw.replace(/:\s*NaN/g, ': null');
const data = JSON.parse(cleanJson);

const client = data.find(c => JSON.stringify(c).toLowerCase().includes('candelaria'));

if (client) {
    console.log(JSON.stringify(client, null, 2));
} else {
    console.log('Client not found');
}
