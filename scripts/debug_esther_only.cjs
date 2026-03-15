const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://jqupcpuswlsnnghmlbpo.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxdXBjcHVzd2xzbm5naG1sYnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyMDIwMjgsImV4cCI6MjA1MDc3ODAyOH0.941T7L_xWJ9yFvjC73b-eJq3Lq9GZgq-qY3qgW8wH0g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: clients, error } = await supabase
        .from('clientes_ado_notion')
        .select('*');

    if (error) {
        console.error(error);
        return;
    }

    // Filter for Esther or surnames Botella
    const esther = clients.find(c => {
        const name = (c.property_nombre + ' ' + c.property_apellidos).toLowerCase();
        return name.includes('esther') && name.includes('botella');
    });

    if (esther) {
        console.log('--- ESTHER DATA ---');
        console.log('ID:', esther.id);
        console.log('Name:', esther.property_nombre, esther.property_apellidos);
        console.log('property_renueva_f2:', esther.property_renueva_f2, typeof esther.property_renueva_f2);
        console.log('property_renueva_f3:', esther.property_renueva_f3, typeof esther.property_renueva_f3);

        // Check other potential keys
        console.log('All Keys:', Object.keys(esther).filter(k => k.includes('renueva') || k.includes('renovacion')));
    } else {
        console.log('Esther not found');
    }
}

run();
