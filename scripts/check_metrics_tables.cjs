const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zugtswtpoohnpycnjwrp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjc3NDcyMywiZXhwIjoyMDUyMzUwNzIzfQ.guxB8HXxRj1pHIJ7BBQE6DUMmr1Gn4lRFJnHO9HTssk'
);

async function checkTables() {
  console.log('=== BUSCANDO TABLAS DE MÉTRICAS ===\n');

  // Lista de tablas a verificar
  const tablesToCheck = [
    'notion_leads_metrics',
    'notions_leads_metrics',
    'leads_metrics',
    'daily_metrics',
    'business_snapshots',
    'weekly_metrics',
    'monthly_metrics'
  ];

  for (const table of tablesToCheck) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (error) {
      console.log(`❌ ${table}: No existe o no accesible`);
    } else {
      console.log(`✅ ${table}: ${count || data?.length || 0} registros`);
      if (data && data.length > 0) {
        console.log(`   Columnas: ${Object.keys(data[0]).join(', ')}`);
        console.log(`   Último registro:`, JSON.stringify(data[0], null, 2).substring(0, 500));
      }
    }
    console.log('');
  }

  // Buscar todas las tablas que contengan "metric" o "notion" o "lead"
  console.log('\n=== BUSCANDO POR PATRÓN ===\n');

  const { data: allTables, error: tablesError } = await supabase
    .rpc('get_all_table_names');

  if (tablesError) {
    console.log('No se pudo obtener lista de tablas via RPC');

    // Intentar otra forma
    const { data: schemaData } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (schemaData) {
      console.log('Tablas encontradas:', schemaData.map(t => t.table_name));
    }
  } else if (allTables) {
    const relevantTables = allTables.filter(t =>
      t.toLowerCase().includes('metric') ||
      t.toLowerCase().includes('notion') ||
      t.toLowerCase().includes('lead') ||
      t.toLowerCase().includes('snapshot')
    );
    console.log('Tablas relevantes:', relevantTables);
  }
}

checkTables().catch(console.error);
