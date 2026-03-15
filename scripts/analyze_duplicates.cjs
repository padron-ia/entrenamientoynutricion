const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://zugtswtpoohnpycnjwrp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo'
);

const VALID_CLOSERS = ['sergi', 'yassine', 'elena', 'raquel'];

async function analyze() {
  const { data } = await supabase
    .from('notion_leads_metrics')
    .select('notion_id, nombre_lead, estado_lead, closer, dia_agenda')
    .gte('dia_agenda', '2026-01-01')
    .lt('dia_agenda', '2026-02-01');

  const estadosCierre = ['cerrado', 'cierre', 'reserva de plaza'];

  // Filtrar solo cierres con closer válido
  const cierres = data.filter(l => {
    const closerValido = l.closer && VALID_CLOSERS.includes(l.closer.toLowerCase());
    const esCierre = l.estado_lead && estadosCierre.includes(l.estado_lead.toLowerCase());
    return closerValido && esCierre;
  });

  // Agrupar por nombre normalizado
  const porNombre = {};
  cierres.forEach(l => {
    const nombre = l.nombre_lead.toLowerCase().trim();
    if (!porNombre[nombre]) porNombre[nombre] = [];
    porNombre[nombre].push(l);
  });

  console.log('=== ANÁLISIS DE CIERRES ENERO 2026 ===\n');

  let duplicadosReales = 0;
  const duplicadosList = [];

  Object.entries(porNombre).forEach(([nombre, registros]) => {
    // Contar cuántos son 'Cerrado' o 'Cierre' (estados finales)
    const cerradosFinal = registros.filter(r =>
      r.estado_lead.toLowerCase() === 'cerrado' || r.estado_lead.toLowerCase() === 'cierre'
    );

    if (cerradosFinal.length > 1) {
      duplicadosReales++;
      duplicadosList.push({ nombre: registros[0].nombre_lead, registros });
    }
  });

  if (duplicadosList.length > 0) {
    console.log('⚠️  DUPLICADOS REALES (mismo nombre con >1 Cerrado/Cierre):\n');
    duplicadosList.forEach(d => {
      console.log('• ' + d.nombre);
      d.registros.forEach(r => {
        console.log('   - ' + r.estado_lead + ' | Closer: ' + r.closer + ' | Notion ID: ...' + r.notion_id.slice(-12));
      });
      console.log('');
    });
  } else {
    console.log('✅ No hay duplicados reales\n');
  }

  const totalPersonas = Object.keys(porNombre).length;

  console.log('=== RESUMEN ===');
  console.log('Total registros en BD:', cierres.length);
  console.log('Personas únicas (ventas reales):', totalPersonas);
  console.log('Registros duplicados a ignorar:', cierres.length - totalPersonas);
  console.log('');

  // Desglose por closer
  console.log('=== VENTAS POR CLOSER (personas únicas) ===');
  const ventasPorCloser = {};
  Object.values(porNombre).forEach(registros => {
    // Tomar el closer del registro más reciente o del Cerrado
    const cerrado = registros.find(r => r.estado_lead.toLowerCase() === 'cerrado');
    const closer = cerrado ? cerrado.closer : registros[0].closer;
    ventasPorCloser[closer] = (ventasPorCloser[closer] || 0) + 1;
  });

  Object.entries(ventasPorCloser).sort((a,b) => b[1] - a[1]).forEach(([closer, count]) => {
    console.log('  ' + closer + ': ' + count);
  });
}

analyze().catch(console.error);
