const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zugtswtpoohnpycnjwrp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3NzQ3MjMsImV4cCI6MjA1MjM1MDcyM30.aOOCnvNwjwuxyUZwONLPLHJGCrAwZcAqRjgnZ3I26Pg'
);

async function check() {
  console.log('=== VERIFICANDO DAILY_METRICS ===\n');

  // 1. Ver últimos registros de daily_metrics
  const { data: metrics, error: metricsError } = await supabase
    .from('daily_metrics')
    .select('*')
    .order('date', { ascending: false })
    .limit(10);

  if (metricsError) {
    console.log('Error en daily_metrics:', metricsError.message);
  } else if (!metrics || metrics.length === 0) {
    console.log('❌ NO HAY DATOS en daily_metrics\n');
  } else {
    console.log(`✅ Hay ${metrics.length} registros en daily_metrics:\n`);
    metrics.forEach(m => {
      console.log(`Fecha: ${m.date}`);
      console.log(`  - Activos: ${m.total_active_clients}`);
      console.log(`  - Pausados: ${m.total_paused_clients}`);
      console.log(`  - Altas: ${m.new_signups}`);
      console.log(`  - Bajas: ${m.cancellations}`);
      console.log(`  - Renovaciones: ${m.renewals}`);
      console.log(`  - Abandonos: ${m.dropouts}`);
      console.log('');
    });
  }

  // 2. Verificar datos reales en clientes_ado_notion
  console.log('\n=== VERIFICANDO DATOS REALES EN CLIENTES ===\n');

  const { data: activos } = await supabase
    .from('clientes_ado_notion')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  const { data: pausados } = await supabase
    .from('clientes_ado_notion')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'paused');

  const { data: inactivos } = await supabase
    .from('clientes_ado_notion')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'inactive');

  const { data: dropouts } = await supabase
    .from('clientes_ado_notion')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'dropout');

  const { count: activosCount } = await supabase
    .from('clientes_ado_notion')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: pausadosCount } = await supabase
    .from('clientes_ado_notion')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'paused');

  const { count: inactivosCount } = await supabase
    .from('clientes_ado_notion')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'inactive');

  const { count: dropoutsCount } = await supabase
    .from('clientes_ado_notion')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'dropout');

  console.log('Datos REALES en clientes_ado_notion:');
  console.log(`  - Activos: ${activosCount}`);
  console.log(`  - Pausados: ${pausadosCount}`);
  console.log(`  - Inactivos (bajas): ${inactivosCount}`);
  console.log(`  - Dropouts (abandonos): ${dropoutsCount}`);

  // 3. Verificar si existe la tabla clients (la función busca ahí)
  console.log('\n=== VERIFICANDO TABLA CLIENTS ===\n');

  const { data: clientsData, error: clientsError } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true });

  if (clientsError) {
    console.log('❌ La tabla "clients" NO EXISTE o no es accesible');
    console.log('   Error:', clientsError.message);
    console.log('\n⚠️  PROBLEMA: La función snapshot_daily_metrics() busca en "clients"');
    console.log('   pero los datos están en "clientes_ado_notion"');
  } else {
    console.log('✅ La tabla "clients" existe');
  }
}

check().catch(console.error);
