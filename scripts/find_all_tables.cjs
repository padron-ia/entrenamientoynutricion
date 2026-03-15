const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zugtswtpoohnpycnjwrp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjc3NDcyMywiZXhwIjoyMDUyMzUwNzIzfQ.guxB8HXxRj1pHIJ7BBQE6DUMmr1Gn4lRFJnHO9HTssk'
);

async function findTables() {
  // Probar tablas comunes que podrían tener datos de leads o métricas
  const tablesToTest = [
    'notion_leads',
    'leads',
    'notion_data',
    'notion_sync',
    'leads_data',
    'crm_leads',
    'notion_contacts',
    'contacts',
    'leads_tracking',
    'metrics',
    'stats',
    'analytics',
    'notion_metrics',
    'notion_leads_data',
    'notion_crm',
    'notion_database',
    'notion_table',
    'notion_records',
    'sales_metrics',
    'coach_metrics',
    'user_metrics',
    'client_metrics'
  ];

  console.log('=== BUSCANDO TABLAS EN SUPABASE ===\n');

  const foundTables = [];

  for (const table of tablesToTest) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (!error) {
      foundTables.push({ name: table, count: count || 0 });
      console.log(`✅ ${table}: ${count || 0} registros`);
    }
  }

  // Tablas conocidas
  console.log('\n=== TABLAS CONOCIDAS ===\n');

  const knownTables = [
    'clientes_ado_notion',
    'users',
    'coach_invoices',
    'payment_methods',
    'contract_pauses',
    'daily_metrics',
    'business_snapshots'
  ];

  for (const table of knownTables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (!error) {
      console.log(`✅ ${table}: ${count || 0} registros`);
    } else {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }

  // Verificar si existe una tabla con patrón "notion" en el nombre
  console.log('\n=== DATOS DE CLIENTES_ADO_NOTION (muestra) ===\n');

  const { data: sampleClients } = await supabase
    .from('clientes_ado_notion')
    .select('*')
    .limit(1);

  if (sampleClients && sampleClients.length > 0) {
    console.log('Columnas disponibles:', Object.keys(sampleClients[0]).join(', '));
  }
}

findTables().catch(console.error);
