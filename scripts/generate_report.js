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

async function generateReport() {
    const { data: clients, error } = await supabase
        .from('clientes_pt_notion')
        .select('*');

    if (error) {
        console.error('Error fetching clients:', error);
        return;
    }

    const coaches = [
        { key: 'Victoria', match: 'Victoria' },
        { key: 'Alvaro', match: 'Álvaro' },
        { key: 'Espe', match: 'Esperanza' },
        { key: 'Helena', match: 'Helena' },
        { key: 'Juan', match: 'Juan' }
    ];
    const month = 2; // Marzo (0-indexed)
    const year = 2026;

    const normalize = (str) =>
        str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

    const report = coaches.map(coachInfo => {
        const coachClients = clients.filter(c => {
            const cCoach = normalize(c.property_coach || '');
            const search = normalize(coachInfo.match);
            const searchKey = normalize(coachInfo.key);
            return cCoach.includes(search) || cCoach.includes(searchKey) ||
                (cCoach.length > 0 && (search.includes(cCoach) || searchKey.includes(cCoach)));
        });

        const active = coachClients.filter(c =>
            c.status === 'active' || c.property_estado_cliente === 'Activo'
        ).length;

        const bajasThisMonth = coachClients.filter(c => {
            const inactiveDate = c.property_fecha_de_baja ? new Date(c.property_fecha_de_baja) : null;
            const abandonDate = c.property_fecha_abandono ? new Date(c.property_fecha_abandono) : null;

            const isBaja = (inactiveDate && inactiveDate.getMonth() === month && inactiveDate.getFullYear() === year);
            const isAbandon = (abandonDate && abandonDate.getMonth() === month && abandonDate.getFullYear() === year);

            return isBaja || isAbandon;
        }).length;

        const onPause = coachClients.filter(c =>
            c.status === 'paused' || c.property_estado_cliente === 'Pausa'
        ).length;

        let toRenewInMarch = 0;
        let renewedInMarch = 0;

        coachClients.forEach(c => {
            const phases = [
                { endDate: c.property_fin_fase_1, contracted: c.property_renueva_f2 },
                { endDate: c.property_fin_contrato_f2, contracted: c.property_renueva_f3 },
                { endDate: c.property_fin_contrato_f3, contracted: c.property_renueva_f4 },
                { endDate: c.property_fin_contrato_f4, contracted: c.property_renueva_f5 },
            ];

            phases.forEach(p => {
                if (p.endDate) {
                    const dateStr = typeof p.endDate === 'object' ? p.endDate.start : p.endDate;
                    if (dateStr) {
                        const d = new Date(dateStr);
                        if (d.getMonth() === month && d.getFullYear() === year) {
                            toRenewInMarch++;
                            if (p.contracted === true || p.contracted === 'true' || p.contracted === 'V') {
                                renewedInMarch++;
                            }
                        }
                    }
                }
            });
        });

        return {
            coach: coachInfo.key,
            active,
            bajas: bajasThisMonth,
            paused: onPause,
            toRenew: toRenewInMarch,
            renewed: renewedInMarch
        };
    });

    console.log('--- DATA START ---');
    console.log(JSON.stringify(report, null, 2));
    console.log('--- DATA END ---');
}

generateReport();
