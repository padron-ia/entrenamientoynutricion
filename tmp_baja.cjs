const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zugtswtpoohnpycnjwrp.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo');

const MESES = {
  'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,
  'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11
};

function parseDate(val) {
  if (!val) return null;
  if (typeof val === 'object') val = Object.values(val)[0];
  if (!val) return null;
  val = String(val).trim();
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;
  const match = val.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (match) {
    const month = MESES[match[2].toLowerCase()];
    if (month !== undefined) return new Date(parseInt(match[3]), month, parseInt(match[1]));
  }
  return null;
}

async function main() {
  const { data } = await supabase.from('clientes_ado_notion')
    .select('property_nombre,property_apellidos,property_coach,property_estado_cliente,property_fecha_de_baja,status');
  if (!data) return;

  const coachNames = ['Victoria', 'Álvaro', 'Esperanza', 'Helena', 'Juan'];
  for (const c of data) {
    const coach = (c.property_coach || '').trim();
    let coachName = null;
    for (const name of coachNames) {
      if (coach.toLowerCase().includes(name.toLowerCase())) { coachName = name; break; }
    }
    if (!coachName) continue;

    const fb = parseDate(c.property_fecha_de_baja);
    if (fb && fb.getMonth() === 2 && fb.getFullYear() === 2026) {
      console.log(coachName + ' | ' + c.property_nombre + ' ' + c.property_apellidos + ' | Estado: ' + c.property_estado_cliente + ' | Fecha baja: ' + c.property_fecha_de_baja);
    }
  }
}
main();
