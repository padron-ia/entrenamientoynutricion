const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zugtswtpoohnpycnjwrp.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo');

async function main() {
  // Find a baja client and check what date fields exist
  const { data } = await supabase.from('clientes_ado_notion').select('*')
    .eq('property_estado_cliente', 'Baja').limit(1);
  if (!data || !data[0]) { console.log('none'); return; }
  const c = data[0];
  console.log('=== ' + c.property_nombre + ' ' + c.property_apellidos + ' ===');
  for (const [k, v] of Object.entries(c)) {
    if (v && v !== '' && v !== '0' && (k.includes('baja') || k.includes('drop') || k.includes('cancel') || k.includes('fin') || k.includes('fecha') || k.includes('updated') || k.includes('modified'))) {
      console.log(k, '=', v);
    }
  }
}
main();
