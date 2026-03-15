
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración manual de variables de entorno si dotenv no está disponible
function loadEnv() {
    try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const envPath = path.resolve(__dirname, '../.env');

        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');

            const lines = envContent.split(/\r?\n/);

            lines.forEach(line => {
                const trimmedLine = line.trim();
                // Ignorar comentarios y líneas vacías
                if (!trimmedLine || trimmedLine.startsWith('#')) return;

                const equalsIndex = trimmedLine.indexOf('=');
                if (equalsIndex > -1) {
                    const key = trimmedLine.substring(0, equalsIndex).trim();
                    let value = trimmedLine.substring(equalsIndex + 1).trim();
                    // Quitar comillas si las hay
                    value = value.replace(/^["'](.*)["']$/, '$1');

                    // Asignar a process.env
                    process.env[key] = value;
                }
            });
            console.log(`✅ Variables de entorno cargadas desde ${envPath}`);
            const tokenStart = process.env.NOTION_TOKEN ? process.env.NOTION_TOKEN.substring(0, 5) : 'null';
            console.log(`🔑 Token cargado empieza por: ${tokenStart}`);
        } else {
            console.warn(`⚠️ No se encontró archivo .env en: ${envPath}`);
        }
    } catch (e) {
        console.error('Error cargando .env:', e);
    }
}

loadEnv();

// SEGURIDAD: Las claves se cargan SOLO desde variables de entorno
// Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu archivo .env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Faltan variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_ANON_KEY)');
    console.error('Configura estas variables en tu archivo .env');
    process.exit(1);
}

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASES = [
    { name: 'Diana', id: '1a87c005-e400-812a-9695-d15e2dfdcaa4' }, // Es la base General
    { name: 'David', id: '1657c005-e400-8015-8561-cb6df41fc625' },
    { name: 'Yassine', id: '1657c005-e400-8067-b573-d2872574aede' },
    { name: 'Thaïs', id: '1657c005-e400-800c-b9fe-c64c8578fb29' },
    { name: 'Jesús', id: '1b97c005-e400-818d-936a-c19d7bdbcf5a' },
    { name: 'Sergi', id: '2627c005-e400-8116-845c-ee677e778621' },
    { name: 'Raquel', id: '2df7c005-e400-816b-a35e-f3a9096ddfe1' },
    { name: 'Elena', id: '2e87c005-e400-815a-94b6-ee8768f68f3f' },
    { name: 'Elena (Old/Extra)', id: '2df7c005-e400-8101-ad8b-ee36f888169f' }
];

if (!NOTION_TOKEN) {
    console.error('❌ ERROR: Falta la variable NOTION_TOKEN en el archivo .env');
    console.error('Por favor añade NOTION_TOKEN=secret_... en tu archivo .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Map IDs de Notion (basado en investigación previa)
// Agregamos detección por nombre además de ID para mayor robustez entre bases
const PROPS = {
    setter: '%3AG%5C%5B',    // Select
    procedencia: 'ATxl',     // Status/Select
    inb_out: 'B%3CZW',       // Select
    dia_agenda: 'GO%3A%5C',  // Date
    dia_llamada: 'k%3D%3E%3E', // Date
    closer: 'xG%3D%3F',      // Select
    estado_lead: '~R%5E%40', // Status
    presentado: 'el%5EY',    // Checkbox
    cierre: '%7ComS',        // Checkbox 
    pago: '%7B%3Azq',        // Multi-select
    telefono: '%7C_%3D%3F',  // Rich text
    perfil_ig: 'HiRB',       // Rich text
    nombre: 'title'          // Title
};

async function fetchNotionLeads(dbId, cursor = null) {
    // Primero, verificamos si la propiedad "Día de la agenda" existe en esta base
    const dbMetadataUrl = `https://api.notion.com/v1/databases/${dbId}`;
    const metaResp = await fetch(dbMetadataUrl, {
        headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28'
        }
    });

    const meta = await metaResp.json();
    // Buscamos cuál es el nombre real de la propiedad de fecha en esta base
    const possibleDateNames = ['Día de la agenda', 'Fecha', 'Fecha admisión', 'Día agenda', 'Dia de la agenda'];
    const actualDateProp = Object.keys(meta.properties || {}).find(k =>
        possibleDateNames.some(name => name.toLowerCase() === k.toLowerCase().trim())
    );

    const isFullSync = process.argv.includes('--full');
    const url = `https://api.notion.com/v1/databases/${dbId}/query`;
    const body = {
        page_size: 100
    };
    if (cursor) {
        body.start_cursor = cursor;
    }

    // Lógica de filtrado inteligente
    if (isFullSync) {
        // Modo carga histórica: desde Diciembre 2024
        if (actualDateProp) {
            body.filter = {
                "property": actualDateProp,
                "date": {
                    "on_or_after": "2024-12-01"
                }
            };
            body.sorts = [{ property: actualDateProp, direction: 'descending' }];
        }
    } else {
        // Modo incremental (Por defecto): Solo cambios en las últimas 72 horas
        // Esto captura tanto leads nuevos como ediciones en leads antiguos
        const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
        body.filter = {
            "timestamp": "last_edited_time",
            "last_edited_time": {
                "on_or_after": threeDaysAgo
            }
        };
        console.log(`[${dbId}] ⚡ Modo incremental: buscando cambios desde ${threeDaysAgo}`);
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ Notion API Error [${dbId}]: ${response.status} - ${errText}`);
        return { results: [], has_more: false };
    }

    return await response.json();
}

function extractRichText(prop) {
    if (!prop || !prop.rich_text || prop.rich_text.length === 0) return null;
    return prop.rich_text.map(t => t.plain_text).join('');
}

function extractTitle(prop) {
    if (!prop || !prop.title || prop.title.length === 0) return null;
    return prop.title.map(t => t.plain_text).join('');
}

function extractSelect(prop) {
    if (!prop || !prop.select) return null;
    return prop.select.name;
}

function extractStatus(prop) {
    if (!prop || !prop.status) return null;
    return prop.status.name;
}

function extractDate(prop) {
    if (!prop) return null;
    if (prop.date) return prop.date.start;
    if (prop.formula && prop.formula.date) return prop.formula.date.start;
    return null;
}

function extractCheckbox(prop) {
    if (!prop) return false;
    return prop.checkbox || false;
}

function extractMultiSelect(prop) {
    if (!prop || !prop.multi_select) return null;
    return prop.multi_select.map(s => s.name).join(', ');
}

function mapLeadToDB(page, dbId) {
    const p = page.properties;

    // Helper para buscar propiedad por nombre (insensible a mayúsculas/acentos y con múltiples fallbacks)
    const findProp = (names) => {
        const nameList = Array.isArray(names) ? names : [names];
        for (const name of nameList) {
            // Intento exacto
            if (p[name]) return p[name];
            // Búsqueda insensible
            const entry = Object.entries(p).find(([k, v]) =>
                k.toLowerCase().trim() === name.toLowerCase().trim()
            );
            if (entry) return entry[1];
        }
        return null;
    };

    const hasPago = !!Object.keys(p).find(k => k.toLowerCase().trim() === 'pago');
    // Debug deshabilitado - hasPago check solo para referencia

    const setterProp = findProp(['Setter', 'Asignado']);
    const closerProp = findProp(['Closer', 'Closer responsable']);
    const procProp = findProp(['Procedencia', 'Origen']);
    const inbProp = findProp(['INB/OUT', 'Tipo']);
    const agendaProp = findProp(['Día de la agenda', 'Fecha', 'Fecha admisión', 'Día agenda', 'Dia de la agenda']);
    if (dbId.includes('1657c') && agendaProp) {
        console.log(`[DEBUG] David/Thais Date Prop (${dbId}):`, JSON.stringify(agendaProp));
    }
    const llamadaProp = findProp(['Día de la llamada', 'Fecha llamada', 'Dia de la llamada']);
    const estadoProp = findProp(['Estado del Lead', 'Estado', 'Status']);
    const presProp = findProp(['Presentado', '¿Presentado?', 'Asistió']);
    const cierreProp = findProp(['Cierre', '¿Cerrado?', 'Venta']);
    const pagoProp = findProp(['Pago', 'Método de pago']);
    const telProp = findProp(['Número teléfono', 'Teléfono', 'Telefono', 'Whatsapp']);
    const igProp = findProp(['Perfil IG', 'Instagram', 'Instagram/Facebook']);
    const nameProp = p.title || findProp(['Nombre', 'Nombre Lead', 'Nombre lead', 'Lead']);

    let setterName = extractSelect(setterProp);
    let closerName = extractSelect(closerProp);

    // Ya no usamos el dueño de la base como fallback para el Setter
    // Si no hay setter indicado en Notion, se queda como null/vacío para no ensuciar las métricas

    const mapped = {
        notion_id: page.id,
        nombre_lead: extractTitle(nameProp) || 'Sin nombre',
        setter: setterName,
        closer: closerName,
        procedencia: extractStatus(procProp) || extractSelect(procProp),
        inb_out: extractSelect(inbProp),
        dia_agenda: extractDate(agendaProp) || extractDate(llamadaProp), // Fallback a fecha llamada si no hay agenda
        dia_llamada: extractDate(llamadaProp),
        estado_lead: extractStatus(estadoProp) || extractSelect(estadoProp),
        presentado: extractCheckbox(presProp),
        cierre: extractCheckbox(cierreProp),
        pago: extractMultiSelect(pagoProp),
        telefono: extractRichText(telProp),
        perfil_ig: extractRichText(igProp),
        last_updated_at: new Date().toISOString()
    };

    const refundKeywords = ['devolución', 'devolucion', 'reembolso', 'pide devolución', 'pide devolucion'];
    const isRefund = (mapped.estado_lead && refundKeywords.some(k => mapped.estado_lead.toLowerCase().includes(k))) ||
        (mapped.pago && refundKeywords.some(k => mapped.pago.toLowerCase().includes(k)));

    if (isRefund) {
        console.log(`[REFUND DETECTED] Lead: ${mapped.nombre_lead} | Pago: ${mapped.pago} | Fecha: ${mapped.dia_agenda}`);
    }

    return mapped;
}

async function main() {
    console.log('🚀 Iniciando sincronización de métricas desde Notion...');
    console.log(`Bases de datos a procesar: ${DATABASES.length}`);

    let totalProcessed = 0;
    let totalErrors = 0;

    for (const dbConfig of DATABASES) {
        const { id: dbId, name: dbOwner } = dbConfig;
        console.log(`\n📂 Procesando base de datos de: ${dbOwner} (${dbId})`);
        let hasMore = true;
        let cursor = null;

        while (hasMore) {
            try {
                const data = await fetchNotionLeads(dbId, cursor);
                const pages = data.results;

                console.log(`📥 [${dbId.substring(0, 5)}...] Procesando página de ${pages.length} leads...`);

                const mappedLeads = pages.map(page => mapLeadToDB(page, dbId));

                // Upsert a Supabase
                const { error } = await supabase
                    .from('notion_leads_metrics')
                    .upsert(mappedLeads, { onConflict: 'notion_id' });

                if (error) {
                    console.error('❌ Error guardando en Supabase:', error);
                    totalErrors += pages.length;
                } else {
                    totalProcessed += pages.length;
                    console.log(`✅ [${dbId.substring(0, 5)}...] Guardados ${pages.length} leads (Total acumulado: ${totalProcessed})`);
                }

                hasMore = data.has_more;
                cursor = data.next_cursor;

            } catch (err) {
                console.error(`💥 Error procesando base ${dbId}:`, err);
                break;
            }
        }
    }

    console.log('\n🏁 Sincronización finalizada.');
    console.log(`📊 Total procesados: ${totalProcessed}`);
    console.log(`❌ Errores: ${totalErrors}`);
}

main();
