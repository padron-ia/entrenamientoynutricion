import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { resolve } from 'path';

// Manual .env reading
const envPath = resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
        env[key.trim()] = value.join('=').trim();
    }
});

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en el .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SPANISH_MONTHS = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
};

function parseSpanishDate(dateStr) {
    if (!dateStr) return null;
    if (typeof dateStr === 'object' && dateStr.start) return new Date(dateStr.start);
    const s = dateStr.toString().toLowerCase().trim();

    // Try ISO format first
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) return isoDate;

    // Try Spanish format: "26 de marzo de 2026"
    const match = s.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d+)/);
    if (match) {
        const [_, day, monthStr, year] = match;
        const month = SPANISH_MONTHS[monthStr];
        if (month !== undefined) {
            return new Date(parseInt(year), month, parseInt(day));
        }
    }
    return null;
}

async function generateDetailedReport() {
    const { data: clients, error } = await supabase
        .from('clientes_pt_notion')
        .select('*');

    if (error) {
        console.error('Error fetching clients:', error);
        return;
    }

    const coachMap = {
        'Victoria': ['victoria'],
        'Alvaro': ['alvaro', 'álvaro'],
        'Espe': ['espe', 'esperanza'],
        'Helena': ['helena'],
        'Juan': ['juan']
    };

    const month = 2; // Marzo (0-indexed)
    const year = 2026;

    const normalize = (str) =>
        str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

    const report = Object.keys(coachMap).map(coachKey => {
        const searchTerms = coachMap[coachKey];

        // Filter by coach AND exclude PAUSA
        const coachClients = clients.filter(c => {
            const cCoach = normalize(c.property_coach || '');
            const isCorrectCoach = searchTerms.some(term => cCoach === term || cCoach.includes(term));
            const notPaused = c.status !== 'paused' && c.property_estado_cliente !== 'Pausa';
            return isCorrectCoach && notPaused;
        });

        const renewals = [];

        coachClients.forEach(c => {
            const phases = [
                { phase: 'F1 -> F2', endDate: c.property_fin_fase_1, contracted: c.property_renueva_f2 },
                { phase: 'F2 -> F3', endDate: c.property_fin_contrato_f2, contracted: c.property_renueva_f3 },
                { phase: 'F3 -> F4', endDate: c.property_fin_contrato_f3, contracted: c.property_renueva_f4 },
                { phase: 'F4 -> F5', endDate: c.property_fin_contrato_f4, contracted: c.property_renueva_f5 },
            ];

            phases.forEach(p => {
                if (p.endDate) {
                    const d = parseSpanishDate(p.endDate);
                    if (d && !isNaN(d.getTime())) {
                        if (d.getMonth() === month && d.getFullYear() === year) {
                            const isRenewed = (p.contracted === true || p.contracted === 'true' || p.contracted === 'V');
                            const statusDisplay = isRenewed ? 'RENOVADO' : (c.status === 'inactive' || c.property_estado_cliente === 'Baja' ? 'NO RENOVADO' : 'PENDIENTE');

                            renewals.push({
                                name: `${c.property_nombre || ''} ${c.property_apellidos || ''}`.trim().replace(/\s+/g, ' '),
                                phase: p.phase,
                                date: (typeof p.endDate === 'object' ? p.endDate.start : p.endDate),
                                status: statusDisplay
                            });
                        }
                    }
                }
            });
        });

        return {
            coach: coachKey,
            count: renewals.length,
            renewals
        };
    });

    console.log('--- DATA START ---');
    report.forEach(r => {
        console.log(`\nCOACH: ${r.coach} (${r.count} casos)`);
        r.renewals.forEach(ren => {
            console.log(` - [${ren.status}] ${ren.name} (${ren.phase}) - ${ren.date}`);
        });
    });
    console.log('--- DATA END ---');
}

generateDetailedReport();
