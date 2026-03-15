
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://zugtswtpoohnpycnjwrp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo'
);

const monthsEs = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
};

const parseSpanishDate = (str) => {
    if (!str) return null;
    const lower = str.toLowerCase();

    // "24 de enero de 2026"
    const match = lower.match(/(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/);
    if (match) {
        const day = parseInt(match[1]);
        const month = monthsEs[match[2]];
        const year = parseInt(match[3]);
        if (month !== undefined) {
            return new Date(year, month, day);
        }
    }
    return null;
};

const checkDate = (raw, label, name) => {
    let d = null;
    // Try standard
    if (raw && raw.match(/^\d{4}-\d{2}-\d{2}$/)) {
        d = new Date(raw);
    } else {
        d = parseSpanishDate(raw);
    }

    if (d && d.getMonth() === 0 && d.getFullYear() === 2026) { // JAN 2026
        console.log(`✅ MATCH: ${name} -> ${label} (${raw})`);
    }
};

async function audit() {
    console.log(`\n🔍 FINAL CHEQUEO ENERO 2026 (Coach: Jesús)...\n`);
    const { data: clients } = await supabase
        .from('clientes_pt_notion')
        .select('*');

    clients.forEach(c => {
        const coach = (c.property_coach || c.coach_id || '').toLowerCase();
        const status = (c.property_estado_cliente || c.status || '').toLowerCase();

        if (!coach.includes('jes')) return;
        if (!status.includes('activo') && !status.includes('active')) return;

        const name = `${c.property_nombre} ${c.property_apellidos}`;

        // Check all text date fields
        checkDate(c.property_fin_fase_1, "F1 Fin", name);
        checkDate(c.property_fin_contrato_f2, "F2 Fin (Text)", name);
        checkDate(c.property_fin_contrato_f3, "F3 Fin (Text)", name);
        checkDate(c.property_fin_contrato_f4, "F4 Fin (Text)", name);

        // Helper calc for F1
        if (c.property_inicio_programa && c.property_contratado_f1) {
            // Simple calc check
            const start = new Date(c.property_inicio_programa);
            const dur = parseFloat(c.property_contratado_f1) || 0;
            if (dur > 0 && !isNaN(start.getTime())) {
                start.setMonth(start.getMonth() + dur);
                if (start.getMonth() === 0 && start.getFullYear() === 2026) {
                    console.log(`✅ MATCH CALCULADO: ${name} -> F1 Calc (${dur} meses desde ${c.property_inicio_programa})`);
                }
            }
        }
    });
}
audit().catch(console.error);
