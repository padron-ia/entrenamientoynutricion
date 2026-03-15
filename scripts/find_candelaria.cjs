
const fs = require('fs');
const path = 'c:\\Users\\jmart\\Downloads\\clientes_completos.json';

try {
    let raw = fs.readFileSync(path, 'utf8');
    // Replace NaN with null to make it valid JSON
    raw = raw.replace(/:\s*NaN/g, ': null');
    const data = JSON.parse(raw);
    const client = data.find(c => c.Apellidos && c.Apellidos.includes('Acevedo Martín'));
    if (client) {
        // Only log relevant fields to avoid huge output
        const filtered = {};
        const keys = [
            'Nombre', 'Apellidos', 'Estado Cliente', 'Coach',
            'Inicio programa', 'Contratado F1', 'Contratado Renovación F2',
            'Contratado Renovación F3', 'Contratado Renovación F4',
            'Renueva F2', 'Renueva F3', 'Renueva F4',
            'Fecha Fin Contrato Actual', 'Fin Contrato F2', 'Fin Contrato F3', 'Fin Fase 1'
        ];
        keys.forEach(k => filtered[k] = client[k]);
        console.log(JSON.stringify(filtered, null, 2));
    } else {
        console.log('Client not found');
    }
} catch (e) {
    console.error(e);
}
