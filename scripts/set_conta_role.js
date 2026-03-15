
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zugtswtpoohnpycnjwrp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3Rzd3Rwb29obnB5Y25qd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2MTYsImV4cCI6MjA4MDg2MjYxNn0.q25sUOcY1H8naidpwSNn8ZCLfc5qsyLkC4CAZiQ7uwo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setRole() {
    const { data, error } = await supabase
        .from('users')
        .update({ role: 'contabilidad' })
        .eq('email', 'conta_test@academia.com');

    if (error) {
        console.error('Error updating role:', error);
    } else {
        console.log('Role updated to contabilidad for conta_test@academia.com');
    }
}

setRole();
