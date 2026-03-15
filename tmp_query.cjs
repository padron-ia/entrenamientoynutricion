const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://zugtswtpoohnpycnjwrp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo'
);

async function main() {
  const { data: allClients } = await supabase
    .from('clientes_ado_notion')
    .select('*');

  if (!allClients) { console.log('No data'); return; }

  const coachNames = ['Victoria', 'Álvaro', 'Esperanza', 'Helena', 'Juan'];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Spanish month names to number
  const MESES = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  };

  // Parse any date format: ISO, Spanish text ("26 de marzo de 2026"), or object {start: "..."}
  function parseDate(val) {
    if (!val) return null;
    if (typeof val === 'object') val = Object.values(val)[0];
    if (!val) return null;
    val = String(val).trim();

    // Try ISO first
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;

    // Try Spanish text: "26 de marzo de 2026"
    const match = val.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
    if (match) {
      const day = parseInt(match[1]);
      const monthName = match[2].toLowerCase();
      const year = parseInt(match[3]);
      const month = MESES[monthName];
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
    return null;
  }

  function parseDurationMonths(val) {
    if (!val) return null;
    const str = String(val).trim().toLowerCase();
    const match = str.match(/(\d+)/);
    if (match) return parseInt(match[1]);
    return null;
  }

  function addMonths(dateStr, months) {
    if (!dateStr || !months) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function getF1EndDate(client) {
    const fromField = parseDate(client.property_fin_fase_1);
    if (fromField) return fromField;
    const fechaInicio = client.property_inicio_programa || client.property_fecha_alta;
    const duracion = parseDurationMonths(client.property_contratado_f1);
    if (fechaInicio && duracion) return addMonths(fechaInicio, duracion);
    return null;
  }

  function getRenewalCase(client) {
    const f1End = getF1EndDate(client);

    const phases = [
      { id: 'F2', endDate: f1End, contracted: 'property_contratado_renovaci_n_f2', prevContracted: true },
      { id: 'F3', endField: 'property_fin_contrato_f2', contracted: 'property_contratado_renovaci_n_f3', prevContracted: 'property_contratado_renovaci_n_f2' },
      { id: 'F4', endField: 'property_fin_contrato_f3', contracted: 'property_contratado_renovaci_n_f4', prevContracted: 'property_contratado_renovaci_n_f3' },
      { id: 'F5', endField: 'property_fin_contrato_f4', contracted: 'property_contratado_renovaci_n_f5', prevContracted: 'property_contratado_renovaci_n_f4' },
    ];

    const matches = [];

    for (const phase of phases) {
      let endDate = null;
      if (phase.id === 'F2') {
        endDate = phase.endDate;
      } else {
        endDate = parseDate(client[phase.endField]);
      }
      if (!endDate) continue;

      let prevOk = false;
      if (phase.prevContracted === true) {
        prevOk = true;
      } else {
        const prevVal = client[phase.prevContracted];
        prevOk = prevVal && prevVal !== '0' && prevVal !== 'No';
      }
      if (!prevOk) continue;

      const isThisMonth = endDate.getMonth() === currentMonth && endDate.getFullYear() === currentYear;
      if (!isThisMonth) continue;

      const contractedVal = client[phase.contracted];
      const isContracted = contractedVal && contractedVal !== '0' && contractedVal !== 'No';
      const hasRenewalPayment = client.renewal_phase === phase.id && client.renewal_payment_status;
      const isRenewed = isContracted || (hasRenewalPayment && client.renewal_payment_status === 'uploaded');

      matches.push({ phase: phase.id, endDate, isContracted, isRenewed });
    }

    if (matches.length === 0) return null;
    matches.sort((a, b) => b.phase.localeCompare(a.phase));
    return matches[0];
  }

  const results = {};
  for (const name of coachNames) {
    results[name] = { active: 0, renewalCases: [], renewed: 0, pending: 0, noRenovado: 0, abandono: 0, bajas: 0, pausas: 0 };
  }

  for (const cl of allClients) {
    const coachRaw = (cl.property_coach || '').trim();
    let coachName = null;
    for (const name of coachNames) {
      if (coachRaw.toLowerCase().includes(name.toLowerCase())) { coachName = name; break; }
    }
    if (!coachName) continue;

    const status = (cl.status || '').toLowerCase();
    const estado = (cl.property_estado_cliente || '').toLowerCase();
    const isActive = (status === 'active' && !estado.includes('abandon')) || estado === 'activo' || (estado.includes('activ') && !estado.includes('abandon'));
    const isPaused = status === 'paused' || estado.includes('pausa');
    const isAbandono = estado.includes('abandon');
    const isDropped = status === 'dropped' || estado.includes('baja') || status === 'inactive';

    // Count active/paused
    if (isActive) results[coachName].active++;
    else if (isPaused) results[coachName].pausas++;

    // Bajas: solo contar si fecha_de_baja es en marzo
    if (isAbandono || isDropped) {
      const fechaBaja = parseDate(cl.property_fecha_de_baja);
      if (fechaBaja && fechaBaja.getMonth() === currentMonth && fechaBaja.getFullYear() === currentYear) {
        results[coachName].bajas++;
      }
    }

    // Skip paused for renewals
    if (isPaused) continue;

    const renewal = getRenewalCase(cl);
    if (!renewal) continue;

    const clientName = ((cl.property_nombre || '') + ' ' + (cl.property_apellidos || '')).trim();
    const daysLeft = Math.floor((renewal.endDate - now) / 86400000);

    let statusLabel = '';
    if (renewal.isRenewed) {
      statusLabel = 'RENOVADO';
      results[coachName].renewed++;
    } else if (isAbandono) {
      statusLabel = 'ABANDONO';
      results[coachName].abandono++;
    } else if (isDropped) {
      statusLabel = 'NO RENOVADO';
      results[coachName].noRenovado++;
    } else if (daysLeft < 0) {
      statusLabel = 'VENCIDO (' + Math.abs(daysLeft) + 'd)';
      results[coachName].pending++;
    } else if (daysLeft <= 7) {
      statusLabel = 'URGENTE (' + daysLeft + 'd)';
      results[coachName].pending++;
    } else {
      statusLabel = 'PENDIENTE (' + daysLeft + 'd)';
      results[coachName].pending++;
    }

    results[coachName].renewalCases.push({
      name: clientName,
      phase: renewal.phase,
      endDate: renewal.endDate.toLocaleDateString('es-ES'),
      daysLeft,
      statusLabel,
    });
  }

  console.log('');
  console.log('=================================================================');
  console.log('  VIERNES 06 DE MARZO 2026 - DATOS ACTUALIZADOS DESDE SUPABASE');
  console.log('=================================================================');
  console.log('');
  console.log('COACH'.padEnd(15) + 'ACTIVOS'.padEnd(10) + 'CASOS'.padEnd(8) + 'RENOVADOS'.padEnd(12) + 'PENDIENTES'.padEnd(12) + 'NO RENOV'.padEnd(10) + 'ABANDONO'.padEnd(10) + 'BAJAS'.padEnd(8) + 'PAUSAS'.padEnd(8));
  console.log('-'.repeat(93));

  let totals = { active: 0, cases: 0, renewed: 0, pending: 0, noRenovado: 0, abandono: 0, bajas: 0, pausas: 0 };
  for (const name of coachNames) {
    const d = results[name];
    const totalCases = d.renewalCases.length;
    console.log(
      name.padEnd(15) +
      String(d.active).padEnd(10) +
      String(totalCases).padEnd(8) +
      String(d.renewed).padEnd(12) +
      String(d.pending).padEnd(12) +
      String(d.noRenovado).padEnd(10) +
      String(d.abandono).padEnd(10) +
      String(d.bajas).padEnd(8) +
      String(d.pausas).padEnd(8)
    );
    totals.active += d.active;
    totals.cases += totalCases;
    totals.renewed += d.renewed;
    totals.pending += d.pending;
    totals.noRenovado += d.noRenovado;
    totals.abandono += d.abandono;
    totals.bajas += d.bajas;
    totals.pausas += d.pausas;
  }
  console.log('-'.repeat(93));
  console.log(
    'TOTAL'.padEnd(15) +
    String(totals.active).padEnd(10) +
    String(totals.cases).padEnd(8) +
    String(totals.renewed).padEnd(12) +
    String(totals.pending).padEnd(12) +
    String(totals.noRenovado).padEnd(10) +
    String(totals.abandono).padEnd(10) +
    String(totals.bajas).padEnd(8) +
    String(totals.pausas).padEnd(8)
  );

  console.log('');
  console.log('=== DETALLE POR COACH ===');
  for (const name of coachNames) {
    const d = results[name];
    if (d.renewalCases.length === 0) continue;
    console.log('');
    console.log('> ' + name.toUpperCase() + ' (' + d.renewalCases.length + ' casos)');
    d.renewalCases.sort((a, b) => a.daysLeft - b.daysLeft);
    for (const r of d.renewalCases) {
      console.log('  ' + r.name.padEnd(40) + ' ' + r.phase.padEnd(5) + ' fin: ' + r.endDate.padEnd(12) + ' ' + r.statusLabel);
    }
  }
}
main().catch(console.error);
