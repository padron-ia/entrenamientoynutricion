# 📋 INSTRUCCIONES DE EJECUCIÓN - LIMPIEZA E IMPORTACIÓN

## ⚠️ IMPORTANTE: LEE TODO ANTES DE EJECUTAR

Este proceso eliminará TODOS los datos actuales de la tabla `clientes_pt_notion` y los reemplazará con los datos del CSV de Notion.

## 🔴 PASO 1: EJECUTAR SQL EN SUPABASE

### Opción A: Desde el Dashboard de Supabase (RECOMENDADO)

1. Abre tu proyecto en Supabase: https://supabase.com/dashboard
2. Ve a **SQL Editor** (icono de base de datos en el menú lateral)
3. Haz clic en **"New Query"**
4. Copia y pega TODO el contenido del archivo:
   ```
   database/reset_clientes_table.sql
   ```
5. Haz clic en **"Run"** (botón verde abajo a la derecha)
6. Espera a que termine (debería decir "Success" en verde)

### Opción B: Desde la terminal (si tienes Supabase CLI)

```bash
supabase db reset
# Luego ejecuta el archivo SQL
```

## ✅ VERIFICACIÓN DEL PASO 1

Deberías ver mensajes como:
- `TRUNCATE TABLE` - OK
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` - OK (muchas veces)
- `CREATE INDEX IF NOT EXISTS` - OK
- `CREATE TRIGGER` - OK

Si ves algún error, **DETENTE** y avísame.

## 🟢 PASO 2: EJECUTAR SCRIPT DE IMPORTACIÓN

Una vez que el SQL se haya ejecutado correctamente:

```bash
node scripts/import_notion_complete.js
```

## ⏱️ TIEMPO ESTIMADO

- **Paso 1 (SQL)**: 10-30 segundos
- **Paso 2 (Importación)**: 2-5 minutos (dependiendo de la cantidad de clientes)

## 📊 QUÉ ESPERAR

Durante la importación verás:
```
🚀 IMPORTACIÓN COMPLETA DE CLIENTES DESDE NOTION
============================================================
✅ Cabeceras procesadas: 222 columnas detectadas

📊 Progreso: 50 clientes importados...
📊 Progreso: 100 clientes importados...
📊 Progreso: 150 clientes importados...
...

============================================================
✨ IMPORTACIÓN COMPLETADA
============================================================
📝 Filas procesadas: XXX
✅ Importados correctamente: XXX
❌ Errores: X
⏭️  Filas vacías omitidas: XXX
============================================================
```

## 🚨 SI ALGO SALE MAL

1. **No entres en pánico** - los datos de Notion siguen intactos
2. Copia el mensaje de error completo
3. Avísame y lo arreglamos juntos

## ✅ VERIFICACIÓN FINAL

Después de la importación, verifica en tu CRM:
1. Abre el CRM en localhost
2. Ve a la lista de clientes
3. Deberías ver todos los clientes importados
4. Haz clic en algunos para verificar que los datos se ven correctamente

## 📞 ¿LISTO PARA EMPEZAR?

Cuando estés listo, ejecuta el **PASO 1** y avísame cómo va.
