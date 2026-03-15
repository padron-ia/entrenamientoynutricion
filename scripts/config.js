/**
 * CONFIGURACION CENTRALIZADA PARA SCRIPTS
 *
 * Todos los scripts deben importar las credenciales desde aqui.
 * Las claves se cargan desde variables de entorno (.env)
 *
 * USO:
 *   import { supabase, NOTION_TOKEN } from './config.js';
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Cargar variables de entorno desde .env
function loadEnv() {
    try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const envPath = path.resolve(__dirname, '../.env');

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
            console.log('Variables de entorno cargadas desde .env');
        } else {
            console.warn('No se encontro archivo .env - usando variables del sistema');
        }
    } catch (e) {
        console.error('Error cargando .env:', e);
    }
}

loadEnv();

// Validar variables requeridas
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const NOTION_TOKEN = process.env.NOTION_TOKEN;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Faltan variables SUPABASE_URL y SUPABASE_ANON_KEY en .env');
    console.error('Copia .env.example a .env y configura tus credenciales');
    process.exit(1);
}

// Crear cliente de Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Exportar variables
export { SUPABASE_URL, SUPABASE_KEY, NOTION_TOKEN };

// Helper para verificar que Notion esta configurado
export function requireNotion() {
    if (!NOTION_TOKEN) {
        console.error('ERROR: Falta variable NOTION_TOKEN en .env');
        process.exit(1);
    }
    return NOTION_TOKEN;
}
