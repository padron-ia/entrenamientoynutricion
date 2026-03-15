
const fs = require('fs');
const path = 'c:\\Users\\jmart\\Downloads\\clientes_completos.json';

try {
    let raw = fs.readFileSync(path, 'utf8');
    raw = raw.replace(/:\s*NaN/g, ': null');
    const data = JSON.parse(raw);
    const client = data.find(c => c.Apellidos && c.Apellidos.includes('Acevedo Martín'));
    if (client) {
        console.log('Renueva F2:', client['Renueva F2']);
        console.log('Renueva F3:', client['Renueva F3']);
        console.log('Renueva F4:', client['Renueva F4']);
        console.log('Estado Cliente:', client['Estado Cliente']);
    }
} catch (e) {
    console.error(e);
}
