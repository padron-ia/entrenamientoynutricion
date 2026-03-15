
import fs from 'fs';
import readline from 'readline';
import { supabase } from './config.js';

const csvFilePath = 'temp_notion/Clientes 1127c005e40081b08517cd1ea5362340_all.csv';

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

// Solo columnas que sabemos que existen
const mapping = {
    'Nombre': 'property_nombre',
    'Apellidos': 'property_apellidos',
    'Correo electr': 'property_correo_electr_nico',
    'Telefono': 'property_tel_fono',
    'Direccion': 'property_direccion',
    'Coach': 'property_coach',
    'Estado Cliente': 'property_estado_cliente',
    'Fecha de alta': 'property_fecha_alta',
    'Fecha de nacimiento': 'property_fecha_de_nacimiento',
    'Altura': 'property_altura',
    'Peso Actual': 'property_peso_actual',
    'Peso Inicial': 'property_peso_inicial',
    'Peso Objetivo': 'property_peso_objetivo',
    'Perimetro abdomen': 'property_per_metro_abdomen',
    'Insulina': 'property_insulina',
    'Marca Insulina': 'property_marca_insulina',
    'Dosis': 'property_dosis',
    'Hora inyecc': 'property_hora_inyecci_n',
    'PATOLOG': 'property_enfermedades',
    'Medicaci': 'property_medicaci_n',
    'Informacion Extra Cliente': 'property_informaci_n_extra_cliente',
    'Fase': 'property_fase',
    'Sexo': 'property_sexo',
    'Edad': 'property_edad',
    'Inicio programa': 'property_inicio_programa',
    'Contratado F1': 'property_contratado_f1',
    'Preferencias Dietéticas Generales': 'property_preferencias_diet_ticas_generales',
    'Alergias/Intolerancias': 'property_alergias_intolerancias',
    'Otras alergias o Intolerancias': 'property_otras_alergias_o_intolerancias',
    'Notas Dietéticas Específicas': 'property_notas_diet_ticas_espec_ficas',
    'Alimentos Consumidos': 'property_alimentos_consumidos',
    'Alimentos a Evitar (Detalle)': 'property_alimentos_a_evitar_detalle',
    'Otras enfermedades o Condicionantes': 'property_otras_enfermedades_o_condicionantes',
    'Kcal Plan de Alimentación': 'property_kcal_plan_de_alimentaci_n'
};

function parseSpanishDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;

    // Si ya está en formato ISO o similar, devolverlo
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return dateStr.split(' ')[0];
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Parsear formato español: "23 de octubre de 2024 12:32"
    const monthMap = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };

    const match = dateStr.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
    if (match) {
        const day = match[1].padStart(2, '0');
        const month = monthMap[match[2].toLowerCase()];
        const year = match[3];
        if (month) {
            return `${year}-${month}-${day}`;
        }
    }

    return null;
}

function normalizeHeader(h) {
    if (!h) return '';
    return h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
}

async function run() {
    console.log('🚀 Iniciando importación desde Notion (v2 - Soporte Multilínea)...\n');

    // Leer todo el archivo
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');

    // Función de parsing robusta que maneja saltos de línea dentro de comillas
    function parseFullCSV(csv) {
        const rows = [];
        let curRow = [];
        let curCell = '';
        let inQuotes = false;

        for (let i = 0; i < csv.length; i++) {
            const char = csv[i];
            const nextChar = csv[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    curCell += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                curRow.push(curCell.trim());
                curCell = '';
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
                curRow.push(curCell.trim());
                if (curRow.length > 1 || curRow[0] !== '') {
                    rows.push(curRow);
                }
                curRow = [];
                curCell = '';
                if (char === '\r' && nextChar === '\n') i++;
            } else {
                curCell += char;
            }
        }
        if (curRow.length > 0 || curCell !== '') {
            curRow.push(curCell.trim());
            rows.push(curRow);
        }
        return rows;
    }

    const allRows = parseFullCSV(csvContent);
    if (allRows.length === 0) {
        console.error('❌ El archivo CSV está vacío.');
        return;
    }

    const headers = allRows[0];
    const headerMap = {};
    headers.forEach((h, i) => {
        headerMap[normalizeHeader(h)] = i;
    });
    console.log(`✅ Cabeceras procesadas: ${headers.length} columnas detectadas\n`);

    let count = 0;
    let success = 0;
    let errors = 0;

    // Procesar datos (empezando desde la fila 1)
    for (let i = 1; i < allRows.length; i++) {
        const values = allRows[i];

        const clientData = {};
        for (const [csvSearch, dbCol] of Object.entries(mapping)) {
            const searchNorm = normalizeHeader(csvSearch);
            const matchingHeaderKey = Object.keys(headerMap).find(k => k.includes(searchNorm));
            const headerIdx = matchingHeaderKey !== undefined ? headerMap[matchingHeaderKey] : undefined;

            if (headerIdx !== undefined && values[headerIdx] !== undefined) {
                let val = values[headerIdx];
                if (val === null || val === '') continue;

                // Conversiones... (el resto de la lógica sigue igual)
                if (dbCol.includes('fecha_alta') || dbCol.includes('fecha_de_nacimiento') || dbCol.includes('inicio_programa')) {
                    const parsedDate = parseSpanishDate(val);
                    if (parsedDate) clientData[dbCol] = parsedDate;
                    continue;
                }

                // Conversiones numéricas (manejar comas y evitar que se envíen strings a columnas numeric)
                const numericKeywords = ['peso', 'altura', 'edad', 'per_metro', 'kcal', 'dosis', 'comidas_al_d_a', 'días_de_entreno'];
                if (numericKeywords.some(key => dbCol.includes(key))) {
                    const cleanVal = val.replace(',', '.').replace(/[^\d.-]/g, '');
                    const num = parseFloat(cleanVal);
                    if (!isNaN(num)) {
                        clientData[dbCol] = num;
                        continue;
                    }
                    // Si no es un número válido pero la columna es numérica, mejor enviamos null que un string erróneo
                    clientData[dbCol] = null;
                    continue;
                }

                clientData[dbCol] = val;
            }
        }

        const email = clientData['property_correo_electr_nico'];
        if (!email || !email.includes('@')) {
            continue;
        }

        // Normalizar email
        clientData['property_correo_electr_nico'] = email.toLowerCase().trim();

        // Estado por defecto
        if (!clientData.property_estado_cliente) {
            clientData.property_estado_cliente = 'Activo';
        }

        count++;

        // Verificar si ya existe
        const { data: existing } = await supabase
            .from('clientes_pt_notion')
            .select('id')
            .eq('property_correo_electr_nico', clientData['property_correo_electr_nico'])
            .maybeSingle();

        let error = null;
        if (existing) {
            // Actualizar
            const result = await supabase
                .from('clientes_pt_notion')
                .update(clientData)
                .eq('id', existing.id);
            error = result.error;
        } else {
            // Insertar nuevo
            const result = await supabase
                .from('clientes_pt_notion')
                .insert([clientData]);
            error = result.error;
        }

        if (error) {
            console.error(`❌ Error con ${email}:`, error.message);
            errors++;
        } else {
            success++;
            if (success % 50 === 0) {
                console.log(`📊 Progreso: ${success} clientes importados...`);
            }
        }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✨ IMPORTACIÓN COMPLETADA`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📝 Total de filas válidas: ${count}`);
    console.log(`✅ Importados correctamente: ${success}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`${'='.repeat(50)}\n`);
}

run().catch(err => {
    console.error('💥 Error fatal:', err);
    process.exit(1);
});
