
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Mock loadEnv logic or just hardcode if I can find the token?
// I don't have the token visibly. I must load it from .env.

function loadEnv() {
    try {
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
        }
    } catch (e) {
        console.error('Error loading .env:', e);
    }
}

loadEnv();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const YASSINE_DB_ID = '1657c005-e400-8067-b573-d2872574aede';

async function main() {
    if (!NOTION_TOKEN) {
        console.error('❌ No valid NOTION_TOKEN found.');
        return;
    }

    console.log(`🔍 Inspeccionando BD Notion: ${YASSINE_DB_ID}`);

    try {
        const response = await fetch(`https://api.notion.com/v1/databases/${YASSINE_DB_ID}`, {
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': '2022-06-28'
            }
        });

        if (!response.ok) {
            console.error('❌ API Error:', await response.text());
            return;
        }

        const data = await response.json();
        console.log('✅ Metadata obtenida.');

        // List properties
        const props = data.properties;
        const keys = Object.keys(props).sort();

        console.log('--- Propiedades ---');
        keys.forEach(k => {
            const p = props[k];
            console.log(`🔹 [${p.type}] '${k}' (ID: ${p.id})`);
            if (p.type === 'select' || p.type === 'multi_select') {
                const options = p[p.type].options.map(o => o.name).join(', ');
                console.log(`   Opciones: ${options.substring(0, 100)}...`);
            }
        });

    } catch (err) {
        console.error('Exception:', err);
    }
}

main();
