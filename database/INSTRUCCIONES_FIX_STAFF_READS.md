# Instrucciones para arreglar el problema de lectura de anuncios

## Problema identificado
Cada vez que abres la aplicación, te pide confirmar la lectura de mensajes aunque ya los hayas leído antes. Esto se debe a que la tabla `staff_reads` tiene un error de configuración:

- **Error**: La columna `user_id` está configurada como `uuid` y referencia `auth.users(id)`
- **Debería ser**: La columna `user_id` debe ser `text` y referenciar `public.users(id)`

## Solución

### Paso 1: Acceder a Supabase SQL Editor
1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Haz clic en "SQL Editor" en el menú lateral
3. Crea una nueva query

### Paso 2: Ejecutar el script de migración
1. Abre el archivo: `database/fix_staff_reads.sql`
2. Copia TODO el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en "Run" o presiona `Ctrl+Enter`

### Paso 3: Verificar que se ejecutó correctamente
Deberías ver un mensaje de éxito. El script:
- ✅ Hace backup de datos existentes
- ✅ Elimina la tabla antigua
- ✅ Crea la tabla con la estructura correcta
- ✅ Configura las políticas RLS correctamente
- ✅ Crea índices para mejor rendimiento
- ✅ Habilita realtime para sincronización

### Paso 4: Probar la aplicación
1. Recarga la aplicación en el navegador
2. Marca algunos anuncios como leídos
3. Cierra y vuelve a abrir la aplicación
4. Los anuncios marcados como leídos deberían permanecer leídos ✅

## ¿Qué hace este fix?

### Antes (❌ Incorrecto)
```sql
user_id uuid references auth.users(id)
```
- Intentaba usar el UUID de autenticación de Supabase
- Las políticas RLS usaban `auth.uid()` que no coincidía con `user.id` de la app

### Después (✅ Correcto)
```sql
user_id text NOT NULL
```
- Usa el `id` de la tabla `public.users` (que es tipo TEXT)
- Las políticas RLS comparan con el email del usuario autenticado
- Funciona correctamente con el sistema de usuarios de la aplicación

## Notas técnicas
- La tabla anterior se respalda en `staff_reads_backup` por seguridad
- Si había datos, se pueden recuperar manualmente si es necesario
- Las políticas RLS aseguran que cada usuario solo vea sus propias lecturas
- Los índices mejoran el rendimiento de las consultas
