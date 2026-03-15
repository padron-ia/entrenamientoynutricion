const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zugtswtpoohnpycnjwrp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo'
);

async function checkNotionLeadsMetrics() {
  console.log('=== NOTION LEADS METRICS ===\n');

  // Obtener conteo y muestra de datos
  const { data, error, count } = await supabase
    .from('notion_leads_metrics')
    .select('*', { count: 'exact' })
    .limit(10);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log(`Total de registros: ${count}\n`);

  if (data && data.length > 0) {
    console.log('Columnas disponibles:');
    Object.keys(data[0]).forEach(col => {
      console.log(`  - ${col}: ${typeof data[0][col]} (ejemplo: ${JSON.stringify(data[0][col]).substring(0, 50)})`);
    });

    console.log('\n=== MUESTRA DE DATOS (primeros 5) ===\n');
    data.slice(0, 5).forEach((row, i) => {
      console.log(`[${i + 1}] ${row.nombre_lead || 'Sin nombre'}`);
      console.log(`    Estado: ${row.estado_lead || '-'}`);
      console.log(`    Setter: ${row.setter || '-'}`);
      console.log(`    Closer: ${row.closer || '-'}`);
      console.log(`    Procedencia: ${row.procedencia || '-'}`);
      console.log(`    Día agenda: ${row.dia_agenda || '-'}`);
      console.log(`    Cierre: ${row.cierre || '-'}`);
      console.log('');
    });
  }

  // Estadísticas de leads
  console.log('=== ESTADÍSTICAS DE LEADS ===\n');

  // Por estado
  const { data: byStatus } = await supabase
    .from('notion_leads_metrics')
    .select('estado_lead');

  if (byStatus) {
    const statusCounts = {};
    byStatus.forEach(row => {
      const status = row.estado_lead || 'Sin estado';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('Por estado:');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
  }

  // Por setter
  console.log('\nPor setter:');
  const { data: bySettter } = await supabase
    .from('notion_leads_metrics')
    .select('setter');

  if (bySettter) {
    const setterCounts = {};
    bySettter.forEach(row => {
      const setter = row.setter || 'Sin asignar';
      setterCounts[setter] = (setterCounts[setter] || 0) + 1;
    });
    Object.entries(setterCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([setter, count]) => {
        console.log(`  ${setter}: ${count}`);
      });
  }

  // Por closer
  console.log('\nPor closer:');
  const { data: byCloser } = await supabase
    .from('notion_leads_metrics')
    .select('closer');

  if (byCloser) {
    const closerCounts = {};
    byCloser.forEach(row => {
      const closer = row.closer || 'Sin asignar';
      closerCounts[closer] = (closerCounts[closer] || 0) + 1;
    });
    Object.entries(closerCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([closer, count]) => {
        console.log(`  ${closer}: ${count}`);
      });
  }
}

checkNotionLeadsMetrics().catch(console.error);
