
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function loadEnv() {
    try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const envPath = path.resolve(__dirname, './.env');

        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const lines = envContent.split(/\r?\n/);
            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#')) return;
                const equalsIndex = trimmedLine.indexOf('=');
                if (equalsIndex > -1) {
                    const key = trimmedLine.substring(0, equalsIndex).trim();
                    let value = trimmedLine.substring(equalsIndex + 1).trim();
                    value = value.replace(/^["'](.*)["']$/, '$1');
                    process.env[key] = value;
                }
            });
        }
    } catch (e) {
        console.error('Error cargando .env:', e);
    }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zugtswtpoohnpycnjwrp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_KEY) {
    console.error('Missing Supabase Key');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data: user, error } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', 'e59de5e3-f962-48be-8392-04d9d59ba87d')
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('User holding the clients:', user);
    }
}

main();
