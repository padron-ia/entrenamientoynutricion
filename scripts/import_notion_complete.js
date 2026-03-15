import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import readline from 'readline';

const SUPABASE_URL = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const csvFilePath = 'temp_notion/Clientes 1127c005e40081b08517cd1ea5362340_all.csv';

// =====================================================
// UTILIDADES
// =====================================================

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

function parseSpanishDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;

    // Si ya está en formato ISO
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return dateStr.split(' ')[0];

    // Formato DD/MM/YYYY o D/M/YYYY
    const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
        const day = slashMatch[1].padStart(2, '0');
        const month = slashMatch[2].padStart(2, '0');
        const year = slashMatch[3];
        return `${year}-${month}-${day}`;
    }

    // Formato español: "23 de octubre de 2024"
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

function parseNumber(val) {
    if (!val || val === '') return null;
    // Convertir coma a punto y eliminar caracteres no numéricos excepto punto y signo
    const cleaned = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

function parseBoolean(val) {
    if (!val) return null;
    const str = String(val).toLowerCase().trim();
    if (str === 'si' || str === 'sí' || str === 'yes' || str === 'true') return true;
    if (str === 'no' || str === 'false') return false;
    return null;
}

function normalizeHeader(h) {
    if (!h) return '';
    return h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
}

// =====================================================
// MAPEO COMPLETO DE COLUMNAS
// =====================================================

const columnMapping = {
    // Datos personales
    'Nombre': 'property_nombre',
    'Apellidos': 'property_apellidos',
    'Correo electr': 'property_correo_electr_nico',
    'Telefono': 'property_tel_fono',
    'Direccion': 'property_direccion',
    'Poblaci': 'property_poblaci_n',
    'Provincia': 'property_provincia',

    // Demográficos
    'Edad': 'property_edad',
    'Fecha de nacimiento': 'property_fecha_de_nacimiento',
    'Sexo': 'property_sexo',

    // Físicos
    'Altura': 'property_altura',
    'Peso Actual': 'property_peso_actual',
    'Peso Inicial': 'property_peso_inicial',
    'Peso Objetivo': 'property_peso_objetivo',
    'Perimetro abdomen': 'property_per_metro_abdomen',

    // Estado y programa
    'Estado Cliente': 'property_estado_cliente',
    'Fecha de alta': 'property_fecha_alta',
    'Inicio programa': 'property_inicio_programa',
    'Contratado F1': 'property_contratado_f1',
    'Fase': 'property_fase',
    'Coach': 'property_coach',

    // Médicos
    'Insulina': 'property_insulina',
    'Marca Insulina': 'property_marca_insulina',
    'Dosis': 'property_dosis',
    'Hora inyecc': 'property_hora_inyecci_n',
    'Usa sensor Free Style': 'property_usa_sensor_free_style',
    'Ultima Glicosilada': 'property_ultima_glicosilada_hb_a1c',
    'Glucosa en Ayunas': 'property_glucosa_en_ayunas_actual',
    'PATOLOG': 'property_enfermedades',
    'Medicaci': 'property_medicaci_n',
    'ID Telegram': 'telegram_group_id',
    // 'id_telegram': 'property_id_telegram', // Desactivado para evitar duplicidad si Notion solo tiene IDs de grupo

    // Nutrición
    'Cocina': 'property_cocina_l_mismo',
    'Dispuesto a Pesar': 'property_dispuesto_a_pesar_comida',
    'Comidas Fuera': 'property_comidas_fuera_de_casa_semanales',
    'Numero Comidas': 'property_n_mero_comidas_al_d_a',
    'Come con Pan': 'property_come_con_pan',
    'Cantidad Pan': 'property_cantidad_pan',
    'Consumo de Alcohol': 'property_consumo_de_alcohol',
    'Bebida en la comida': 'property_bebida_en_la_comida',
    'Alergias': 'property_alergias_intolerancias',
    'Alimentos a Evitar': 'property_alimentos_a_evitar_detalle',
    'Alimentos Consumidos': 'property_alimentos_consumidos',
    'Tiene Antojos': 'property_tiene_antojos',
    'Especificar Antojos': 'property_especificar_antojos',
    'Pica entre Horas': 'property_pica_entre_horas',

    // Horarios
    'Horario Desayuno': 'property_horario_desayuno',
    'Horario Almuerzo': 'property_horario_almuerzo',
    'Horario Cena': 'property_horario_cena',
    'Horario Merienda': 'property_horario_merienda',

    // Entrenamiento
    'Actividad F': 'property_actividad_f_sica_general_cliente',
    'Pasos Diarios': 'property_pasos_diarios_promedio',
    'Ejercicio fuerza': 'property_ejercicio_fuerza',
    'Lugar entreno': 'property_lugar_entreno',

    // Objetivos
    'Motivo Contrataci': 'property_motivo_contrataci_n',
    '3 meses': 'property_3_meses',
    '6 meses': 'property_6_meses',
    '1 a': 'property_1_a_o',

    // Renovaciones
    'Renueva F2': 'property_renueva_f2',
    'Contratado Renovacion F2': 'property_contratado_renovaci_n_f2',
    'Fin Contrato F2': 'property_fin_contrato_f2',
    'Fecha Sugerida Llamada Renovacion a F2': 'property_fecha_sugerida_llamada_renovacion_a_f2',
    'Estado llamada para Renovacion a F2': 'property_estado_llamada_para_renovaci_n_a_f2',

    'Renueva F3': 'property_renueva_f3',
    'Contratado Renovacion F3': 'property_contratado_renovaci_n_f3',
    'Fin Contrato F3': 'property_fin_contrato_f3',
    'Fecha Sugerida Llamada Renovacion a F3': 'property_fecha_sugerida_llamada_renovaci_n_a_f3',
    'Estado llamada para Renovacion a F3': 'property_estado_llamada_para_renovaci_n_a_f3',

    'Renueva F4': 'property_renueva_f4',
    'Contratado Renovacion F4': 'property_contratado_renovaci_n_f4',
    'Fin Contrato F4': 'property_fin_contrato_f4',
    'Fecha Sugerida Llamada Renovacion a F4': 'property_fecha_sugerida_llamada_renovaci_n_a_f4',
    'Estado llamada para Renovacion a F4': 'property_estado_llamada_para_renovaci_n_a_f4',

    'Renueva F5': 'property_renueva_f5',
    'Contratado Renovacion F5': 'property_contratado_renovaci_n_f5',
    'Fin Contrato F5': 'property_fin_contrato_f5',
    'Fecha Sugerida LLmada Renovacion a F5': 'property_fecha_sugerida_l_lmada_renovaci_n_a_f5',
    'Estado llamada para Renovacion a F5': 'property_estado_llamada_para_renovaci_n_a_f5',

    // Información adicional
    'Informacion Extra Cliente': 'property_informaci_n_extra_cliente',
    'Situaciones especiales': 'property_situaciones_especiales',
    'Sintomas': 'property_sintomas',

    // Bajas
    'Fecha Abandono': 'property_fecha_abandono',
    'Motivo Abandono': 'property_motivo_abandono',
    'Fecha de baja': 'property_fecha_de_baja',
    'Motivo Baja': 'property_motivo_baja',
    'Fecha Pausa': 'property_fecha_pausa',
    'Motivo Pausa': 'property_motivo_pausa'
};

// =====================================================
// CACHÉ DE COACHES
// =====================================================

let coachMap = {};

async function loadCoachMap() {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name')
        .in('role', ['coach', 'nutritionist', 'psychologist']);

    if (error) {
        console.error('⚠️ Error cargando mapa de coaches:', error.message);
        return;
    }

    users.forEach(u => {
        coachMap[u.name.toLowerCase().trim()] = u.id;
    });
    console.log(`✅ Mapa de coaches cargado: ${users.length} coaches detectados\n`);
}

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================

async function importClients() {
    await loadCoachMap();
    const fileStream = fs.createReadStream(csvFilePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let headers = null;
    let headerMap = {};
    let count = 0;
    let success = 0;
    let errors = 0;
    let skipped = 0;

    console.log('🚀 IMPORTACIÓN COMPLETA DE CLIENTES DESDE NOTION\n');
    console.log('='.repeat(60));

    let currentRecord = '';
    let inQuotes = false;

    for await (const line of rl) {
        // Manejo de registros multilínea (campos con saltos de línea dentro de comillas)
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
                if (i > 0 && line[i - 1] === '\\') {
                    // Escapado, no cambia estado (raro en CSV estándar pero por si acaso)
                } else {
                    inQuotes = !inQuotes;
                }
            }
        }

        currentRecord += (currentRecord ? '\n' : '') + line;

        // Si seguimos dentro de comillas, esperamos a la siguiente línea
        if (inQuotes) continue;

        // Si llegamos aquí, tenemos un registro completo
        const lineToProcess = currentRecord;
        currentRecord = ''; // Reset para el siguiente

        if (!headers) {
            headers = parseCSVLine(lineToProcess);
            headers.forEach((h, i) => {
                headerMap[normalizeHeader(h)] = i;
            });
            console.log(`✅ Cabeceras procesadas: ${headers.length} columnas detectadas\n`);
            continue;
        }

        const values = parseCSVLine(lineToProcess);

        // Saltar filas vacías
        const nonEmptyValues = values.filter(v => v && v.trim() !== '').length;
        if (nonEmptyValues < 3) {
            skipped++;
            continue;
        }

        const clientData = {};

        // Mapear todas las columnas
        for (const [searchPattern, dbColumn] of Object.entries(columnMapping)) {
            const searchNorm = normalizeHeader(searchPattern);
            const matchingKey = Object.keys(headerMap).find(k => k.includes(searchNorm));

            if (matchingKey !== undefined) {
                const headerIdx = headerMap[matchingKey];
                let val = values[headerIdx];

                if (!val || val.trim() === '') continue;

                // Conversiones según tipo de columna
                if (dbColumn.includes('fecha') || dbColumn.includes('inicio_programa')) {
                    const parsed = parseSpanishDate(val);
                    if (parsed) clientData[dbColumn] = parsed;
                } else if (dbColumn.includes('peso') || dbColumn.includes('altura') || dbColumn.includes('per_metro') || dbColumn.includes('perimetro') || dbColumn.includes('edad') || dbColumn.includes('pasos') || dbColumn.includes('comidas')) {
                    const num = parseNumber(val);
                    if (num !== null) clientData[dbColumn] = num;
                } else if (dbColumn.includes('cocina') || dbColumn.includes('dispuesto') || dbColumn.includes('come_con') || dbColumn.includes('pica') || dbColumn.includes('ejercicio') || dbColumn.includes('renueva') || dbColumn.includes('sensor')) {
                    const bool = parseBoolean(val);
                    if (bool !== null) clientData[dbColumn] = bool;
                } else {
                    clientData[dbColumn] = val;
                }
            }
        }

        // Validar email
        const email = clientData['property_correo_electr_nico'];
        if (!email || !email.includes('@')) {
            skipped++;
            continue;
        }

        // Mapear status del CRM basado en el estado de Notion
        const notionStatus = clientData.property_estado_cliente || '';
        let crmStatus = 'active'; // Default

        if (notionStatus.includes('Activo') || notionStatus.includes('Alta Reciente')) {
            crmStatus = 'active';
        } else if (notionStatus.includes('Baja') || notionStatus.includes('Reserva')) {
            crmStatus = 'inactive';
        } else if (notionStatus.includes('Abandono') || notionStatus.includes('Dropout')) {
            crmStatus = 'dropout';
        } else if (notionStatus.includes('Pausa') || notionStatus.includes('Pausado')) {
            crmStatus = 'paused';
        } else if (notionStatus.includes('Completado')) {
            crmStatus = 'completed';
        }

        clientData.status = crmStatus;

        // Estado por defecto para property_estado_cliente si no existe
        if (!clientData.property_estado_cliente) {
            clientData.property_estado_cliente = 'Activo';
        }

        // Mapear coach_id al UUID correspondiente si es posible
        if (clientData.property_coach) {
            const coachName = clientData.property_coach.toLowerCase().trim();
            // Buscar coincidencia exacta o parcial
            const matchedId = coachMap[coachName] ||
                Object.keys(coachMap).find(name => coachName.includes(name) || name.includes(coachName));

            if (matchedId) {
                clientData.coach_id = coachMap[matchedId] || matchedId;
            } else {
                clientData.coach_id = clientData.property_coach; // Fallback al nombre
            }
        }

        count++;

        // Usar UPSERT basado en el email único
        // Esto evita duplicados y funciona aunque RLS bloquee el SELECT inicial
        const { error: upsertError } = await supabase
            .from('clientes_pt_notion')
            .upsert(clientData, {
                onConflict: 'property_correo_electr_nico',
                ignoreDuplicates: false
            });

        if (upsertError) {
            console.error(`❌ ${email}: ${upsertError.message}`);
            errors++;
        } else {
            success++;
            if (success % 50 === 0) {
                console.log(`📊 Progreso: ${success} clientes procesados...`);
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ IMPORTACIÓN COMPLETADA');
    console.log('='.repeat(60));
    console.log(`📝 Filas procesadas: ${count}`);
    console.log(`✅ Importados correctamente: ${success}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`⏭️  Filas vacías omitidas: ${skipped}`);
    console.log('='.repeat(60) + '\n');
}

importClients().catch(err => {
    console.error('💥 Error fatal:', err);
    process.exit(1);
});
