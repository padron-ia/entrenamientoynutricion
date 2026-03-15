/**
 * Script para calcular y persistir fechas de fin de fase en Supabase
 * USANDO LA MISMA LÓGICA DE MOCKSUPABASE.TS para consistencia total.
 * INCLUYE EL PARSEO DE FECHAS EN ESPAÑOL.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPERS COPIADOS DE MOCKSUPABASE.TS ---

const getVal = (obj, keys, fallback = undefined) => {
    if (!obj) return fallback;
    for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    }
    return fallback;
};

const parseText = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
        if (Array.isArray(val)) {
            if (val.length === 0) return '';
            return val.map(item => parseText(item)).filter(s => s.length > 0).join(', ');
        }
        if (val.plain_text) return String(val.plain_text);
        if (val.content) return String(val.content);
        if (val.name) return String(val.name);
        if (val.start) return String(val.start);
        return '';
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try { return parseText(JSON.parse(trimmed)); } catch (e) { }
        }
        return trimmed.replace(/^"|"$/g, '');
    }
    return String(val);
};

const parseDuration = (val) => {
    const txt = parseText(val);
    const match = txt.match(/(\d+([.,]\d+)?)/);
    return match ? parseFloat(match[0].replace(',', '.')) : 0;
};

const toBool = (val) => {
    if (val === true || val === 'TRUE' || val === 'true' || val === 't' || val === 'T' || val === 1 || val === '1') return true;
    if (typeof val === 'string') {
        const v = val.toLowerCase().trim();
        if (v === 'sí' || v === 'si' || v === 'yes' || v === 'on' || v === 'checked') return true;
    }
    return false;
};

const toDateStr = (val, fallbackToNow = false) => {
    if (!val) return fallbackToNow ? new Date().toISOString().split('T')[0] : '';
    if (typeof val === 'object' && val !== null) {
        if (val.start) return toDateStr(val.start, fallbackToNow);
        if (val.date && val.date.start) return toDateStr(val.date.start, fallbackToNow);
        if (Array.isArray(val) && val.length > 0) return toDateStr(val[0], fallbackToNow);
    }
    let str = String(val).trim();
    if (str.startsWith('{')) {
        try { return toDateStr(JSON.parse(str), fallbackToNow); } catch (e) { }
    }

    // Try standard ISO first (YYYY-MM-DD)
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;

    // Try parsing Spanish full date: "24 de enero de 2026"
    const monthsEs = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
        'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
        'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    };

    const lowerStr = str.toLowerCase();
    const matchEs = lowerStr.match(/(\d{1,2})\s*(?:de)?\s*([a-z]+)\s*(?:de)?\s*(\d{4})/);

    if (matchEs) {
        const day = matchEs[1].padStart(2, '0');
        const monthText = matchEs[2];
        const year = matchEs[3];
        const monthNum = monthsEs[monthText];
        if (monthNum) {
            return `${year}-${monthNum}-${day}`;
        }
    }

    // Try Slash Format DD/MM/YYYY
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            const part0 = parts[0].padStart(2, '0');
            const part1 = parts[1].padStart(2, '0');
            const part2 = parts[2];
            if (part2.length === 4) { // YYYY at end
                return `${part2}-${part1}-${part0}`;
            }
        }
    }

    return str.split('T')[0];
};

const addMonths = (dateStr, months) => {
    const cleanDateStr = toDateStr(dateStr);
    if (!cleanDateStr || !months || months <= 0) return cleanDateStr || '';
    const d = new Date(cleanDateStr);
    if (isNaN(d.getTime())) return '';
    d.setMonth(d.getMonth() + Number(months));
    // IMPORTANTE: Ajuste de Notion (-1 día)
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

const calculateDuration = (start, end) => {
    const cleanStart = toDateStr(start);
    const cleanEnd = toDateStr(end);
    if (!cleanStart || !cleanEnd) return 0;
    const s = new Date(cleanStart);
    const e = new Date(cleanEnd);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    return months > 0 ? months : 0;
};

// --- LÓGICA DE SINCRONIZACIÓN ---

async function syncPhaseDates() {
    console.log('🔄 Iniciando sincronización de fechas de fase (v2 - Soporte Español)...\n');

    const { data: clients, error } = await supabase
        .from('clientes_pt_notion')
        .select('*')
        .eq('property_estado_cliente', 'Activo');

    if (error) {
        console.error('❌ Error al leer clientes:', error);
        return;
    }

    console.log(`📊 Encontrados ${clients.length} clientes activos\n`);

    let updated = 0;
    let skipped = 0;

    for (const row of clients) {
        const f1StartStr = toDateStr(row['property_inicio_programa'] || row['Inicio programa'] || row['property_inicio_de_programa'] || row['inicio_programa'], false);

        if (!f1StartStr) {
            console.warn(`⏭️  Omitido: ${row.property_nombre} (Sin fecha de inicio)`);
            skipped++;
            continue;
        }

        const f1DurationRaw = getVal(row, ['property_contratado_f1', 'property_meses_servicio_contratados', 'Contratado F1', 'program_duration_months']);
        const f1Duration = parseDuration(f1DurationRaw) || 6;

        const isRenF2 = toBool(getVal(row, ['property_renueva_f2', 'Renueva F2', 'property_renovacion_f2']));
        const isRenF3 = toBool(getVal(row, ['property_renueva_f3', 'Renueva F3', 'property_renovacion_f3']));
        const isRenF4 = toBool(getVal(row, ['property_renueva_f4', 'Renueva F4', 'property_renovacion_f4']));
        const isRenF5 = toBool(getVal(row, ['property_renueva_f5', 'Renueva F5', 'property_renovacion_f5']));

        const f2DurationCol = parseDuration(getVal(row, ['property_contratado_renovaci_n_f2', 'Contratado Renovación F2', 'property_contratado_f2', 'property_duraci_n_contrato_actual']));
        const f3DurationCol = parseDuration(getVal(row, ['property_contratado_renovaci_n_f3', 'Contratado Renovación F3', 'property_contratado_f3', 'property_duraci_n_contrato_f3']));
        const f4DurationCol = parseDuration(getVal(row, ['property_contratado_renovaci_n_f4', 'Contratado Renovación F4', 'property_contratado_f4', 'property_duraci_n_contrato_f4']));
        const f5DurationCol = parseDuration(getVal(row, ['property_contratado_renovaci_n_f5', 'Contratado Renovación F5', 'property_contratado_f5', 'property_duraci_n_contrato_f5']));

        // Cálculos Cascada
        let f1End = toDateStr(getVal(row, ['property_fin_fase_1'])) || addMonths(f1StartStr, f1Duration);

        let f2Start = toDateStr(getVal(row, ['property_renovaci_n_f2_nueva', 'property_fecha_agendada_renovaci_n_f2'])) || f1End;
        let f2End = toDateStr(getVal(row, ['property_fin_contrato_f2'])) || (isRenF2 ? addMonths(f2Start, f2DurationCol || f1Duration) : null);

        let f3Start = isRenF2 ? (toDateStr(getVal(row, ['property_renovaci_n_f3', 'property_fecha_agendada_renovaci_n_f3'])) || f2End) : null;
        let f3End = isRenF2 ? (toDateStr(getVal(row, ['property_fin_contrato_f3'])) || (isRenF3 ? addMonths(f3Start, f3DurationCol || f1Duration) : null)) : null;

        let f4Start = isRenF3 ? (toDateStr(getVal(row, ['property_renovaci_n_f4', 'property_fecha_agendada_renovaci_n_f4'])) || f3End) : null;
        let f4End = isRenF3 ? (toDateStr(getVal(row, ['property_fin_contrato_f4'])) || (isRenF4 ? addMonths(f4Start, f4DurationCol || f1Duration) : null)) : null;

        let f5Start = isRenF4 ? (toDateStr(getVal(row, ['property_renovaci_n_f5', 'property_fecha_agendada_renovaci_n_f5'])) || f4End) : null;
        let f5End = isRenF4 ? (toDateStr(getVal(row, ['property_fin_contrato_f5'])) || (isRenF5 ? addMonths(f5Start, f5DurationCol || f1Duration) : null)) : null;

        // Actualizar Supabase
        const updateData = {};
        if (f1End) updateData.property_fin_fase_1 = { start: f1End };
        if (f2End) updateData.property_fin_contrato_f2 = { start: f2End };
        if (f3End) updateData.property_fin_contrato_f3 = { start: f3End };
        if (f4End) updateData.property_fin_contrato_f4 = { start: f4End };
        if (f5End) updateData.property_fin_contrato_f5 = { start: f5End };

        if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
                .from('clientes_pt_notion')
                .update(updateData)
                .eq('id', row.id);

            if (updateError) {
                console.error(`❌ Error actualizando ${row.property_nombre}:`, updateError);
            } else {
                updated++;
                if (updated % 20 === 0) console.log(`✅ ${updated} clientes procesados...`);
            }
        }
    }

    console.log(`\n📊 Fin: ${updated} actualizados, ${skipped} omitidos.`);
}

syncPhaseDates();
