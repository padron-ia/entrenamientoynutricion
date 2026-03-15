
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración manual de variables de entorno (Simplificada)
function loadEnv() {
    try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const envPath = path.resolve(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const lines = envContent.split(/\r?\n/);
            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#')) return;
                const equalsIndex = trimmedLine.indexOf('=');
                if (equalsIndex > -1) {
                    const key = trimmedLine.substring(0, equalsIndex).trim();
                    let value = trimmedLine.substring(equalsIndex + 1).trim();
                    value = value.replace(/^["'](.*)["']$/, '$1');
                    process.env[key] = value;
                }
            });
        }
    } catch (e) {
        console.error('Error cargando .env:', e);
    }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const NOTION_TOKEN = process.env.NOTION_TOKEN;

// ONLY YASSINE DB
const DATABASES = [
    { name: 'Yassine', id: '1657c005-e400-8067-b573-d2872574aede' }
];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchNotionLeads(dbId, cursor = null) {
    const isFullSync = true; // FORCE FULL SYNC
    const url = `https://api.notion.com/v1/databases/${dbId}/query`;
    const body = {
        page_size: 100
    };
    if (cursor) {
        body.start_cursor = cursor;
    }

    // Filter by date if possible, but Yassine might use 'Fecha' instead of 'Día de la agenda'
    // Let's deduce property name
    const dbMetadataUrl = `https://api.notion.com/v1/databases/${dbId}`;
    const metaResp = await fetch(dbMetadataUrl, {
        headers: { 'Authorization': `Bearer ${NOTION_TOKEN}`, 'Notion-Version': '2022-06-28' }
    });
    const meta = await metaResp.json();
    const possibleDateNames = ['Día de la agenda', 'Fecha', 'Fecha admisión', 'Día agenda', 'Dia de la agenda'];
    const actualDateProp = Object.keys(meta.properties || {}).find(k =>
        possibleDateNames.some(name => name.toLowerCase() === k.toLowerCase().trim())
    );

    if (actualDateProp) {
        body.filter = {
            "property": actualDateProp,
            "date": { "on_or_after": "2025-01-01" } // Reset to Jan 1st 2025? User said January data.
        };
        // body.sorts = [{ property: actualDateProp, direction: 'descending' }];
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

// NEW FUNCTION
function extractPago(prop) {
    if (!prop) return null;
    if (prop.type === 'multi_select') return extractMultiSelect(prop);
    if (prop.type === 'number') return prop.number !== null ? prop.number.toString() : null;
    if (prop.type === 'rich_text') return extractRichText(prop);
    return null;
}

function mapLeadToDB(page, dbId) {
    const p = page.properties;
    const findProp = (names) => {
        const nameList = Array.isArray(names) ? names : [names];
        for (const name of nameList) {
            if (p[name]) return p[name];
            const entry = Object.entries(p).find(([k, v]) => k.toLowerCase().trim() === name.toLowerCase().trim());
            if (entry) return entry[1];
        }
        return null;
    };

    const setterProp = findProp(['Setter', 'Asignado']);
    const closerProp = findProp(['Closer', 'Closer responsable']);
    const procProp = findProp(['Procedencia', 'Origen']);
    const inbProp = findProp(['INB/OUT', 'Tipo']);
    const agendaProp = findProp(['Día de la agenda', 'Fecha', 'Fecha admisión', 'Día agenda', 'Dia de la agenda']);
    const llamadaProp = findProp(['Día de la llamada', 'Fecha llamada', 'Dia de la llamada']);
    const estadoProp = findProp(['Estado del Lead', 'Estado', 'Status']);
    const presProp = findProp(['Presentado', '¿Presentado?', 'Asistió']);
    const cierreProp = findProp(['Cierre', '¿Cerrado?', 'Venta']);
    const pagoProp = findProp(['Pago', 'Método de pago']); // This is the key one
    const telProp = findProp(['Número teléfono', 'Teléfono', 'Telefono', 'Whatsapp']);
    const igProp = findProp(['Perfil IG', 'Instagram', 'Instagram/Facebook']);
    const nameProp = p.title || findProp(['Nombre', 'Nombre Lead', 'Nombre lead', 'Lead']);

    let setterName = extractSelect(setterProp);
    let closerName = extractSelect(closerProp);

    // No fallback for owner as setter

    return {
        notion_id: page.id,
        nombre_lead: extractTitle(nameProp) || 'Sin nombre',
        setter: setterName,
        closer: closerName,
        procedencia: extractStatus(procProp) || extractSelect(procProp),
        inb_out: extractSelect(inbProp),
        dia_agenda: extractDate(agendaProp) || extractDate(llamadaProp),
        dia_llamada: extractDate(llamadaProp),
        estado_lead: extractStatus(estadoProp) || extractSelect(estadoProp),
        presentado: extractCheckbox(presProp),
        cierre: extractCheckbox(cierreProp),
        pago: extractPago(pagoProp), // USE FIXED EXTRACTOR
        telefono: extractRichText(telProp),
        perfil_ig: extractRichText(igProp),
        last_updated_at: new Date().toISOString()
    };
}

async function main() {
    console.log('🚀 Syncing Yassine Leads with Pago Fix...');
    let totalProcessed = 0;

    for (const dbConfig of DATABASES) {
        const { id: dbId, name: dbOwner } = dbConfig;
        let hasMore = true;
        let cursor = null;

        while (hasMore) {
            const data = await fetchNotionLeads(dbId, cursor);
            const pages = data.results;
            if (pages.length === 0) break;

            const mappedLeads = pages.map(page => mapLeadToDB(page, dbId));

            const { error } = await supabase
                .from('notion_leads_metrics')
                .upsert(mappedLeads, { onConflict: 'notion_id' });

            if (error) console.error('Error upserting:', error);
            else {
                totalProcessed += pages.length;
                console.log(`Saved ${pages.length} leads.`);
            }

            hasMore = data.has_more;
            cursor = data.next_cursor;
        }
    }
    console.log(`Done. Processed ${totalProcessed} leads.`);
}

main();
