# Solucion de Problemas Comunes

Guia rapida para resolver los errores mas frecuentes durante la instalacion y uso del CRM.

---

## Errores de Instalacion

### "relation does not exist" al ejecutar SQL

**Sintoma:** Error al ejecutar el script SQL diciendo que una tabla no existe.

**Causa:** Las tablas se estan creando en orden incorrecto o el script se ejecuto parcialmente.

**Solucion:**
1. Ve a Supabase > SQL Editor
2. Ejecuta este comando para ver que tablas existen:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```
3. Si faltan tablas, ejecuta `SETUP_COMPLETO.sql` de nuevo completo

---

### "permission denied for schema public"

**Sintoma:** No puedes crear tablas en Supabase.

**Causa:** Tu usuario de Supabase no tiene permisos suficientes.

**Solucion:**
1. Asegurate de ejecutar el SQL desde el **SQL Editor** de Supabase (no desde una conexion externa)
2. Si usas conexion externa, necesitas la clave `service_role`, no la `anon`

---

### Error al crear buckets de Storage

**Sintoma:** Las lineas de `INSERT INTO storage.buckets` fallan.

**Causa:** Los buckets de storage requieren creacion manual en algunos casos.

**Solucion:**
1. Ve a Supabase > Storage
2. Click en "New bucket"
3. Crea estos buckets manualmente:
   - `documents` (privado)
   - `receipts` (privado)
   - `contracts` (privado)
   - `invoices` (privado)
   - `avatars` (publico)

---

## Errores de Login

### "Invalid login credentials"

**Sintoma:** No puedes iniciar sesion con admin@demo.com

**Causa:** El usuario de Auth no existe (solo existe en la tabla `users`).

**Solucion:**
1. Ve a Supabase > Authentication > Users
2. Click en "Add User"
3. Email: `admin@demo.com`
4. Password: `123456` (o tu contraseña)
5. Click "Create User"
6. El trigger sincronizara automaticamente con la tabla `users`

---

### Login funciona pero no veo datos

**Sintoma:** Puedo entrar pero el dashboard esta vacio.

**Causas posibles:**
1. RLS esta bloqueando los datos
2. No hay datos de prueba

**Solucion:**
1. Verifica que tu usuario tenga rol correcto:
   ```sql
   SELECT * FROM users WHERE email = 'tu@email.com';
   ```
2. Si el rol es `client` en lugar de `admin`, cambiale:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';
   ```

---

### "User not found" despues de registrar en Auth

**Sintoma:** Creas usuario en Auth pero no aparece en la tabla `users`.

**Causa:** El trigger de sincronizacion no se creo correctamente.

**Solucion:**
1. Verifica que el trigger existe:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
2. Si no existe, ejecuta la seccion de triggers del `SETUP_COMPLETO.sql`

---

## Errores de Funcionamiento

### No puedo crear ventas

**Sintoma:** El formulario de nueva venta da error.

**Causa:** Faltan coaches para asignar.

**Solucion:**
1. Crea al menos un usuario con rol `coach`:
   ```sql
   INSERT INTO users (id, email, name, role) VALUES
   ('coach-001', 'coach@tunegocio.com', 'Nombre Coach', 'coach');
   ```
2. Crea ese mismo usuario en Authentication

---

### Los archivos no se suben

**Sintoma:** Error al subir comprobantes o facturas.

**Causas:**
1. Bucket no existe
2. Politicas de storage no configuradas

**Solucion:**
1. Verifica que el bucket existe en Storage
2. Configura politicas permisivas temporalmente:
   ```sql
   CREATE POLICY "Allow all uploads" ON storage.objects
   FOR INSERT TO authenticated WITH CHECK (true);
   ```

---

### El enlace de onboarding no funciona

**Sintoma:** Cliente hace clic y ve pagina en blanco o error.

**Causas:**
1. Token invalido
2. Onboarding ya completado

**Solucion:**
1. Verifica el token en la base de datos:
   ```sql
   SELECT onboarding_token, onboarding_completed FROM sales WHERE client_email = 'email@cliente.com';
   ```
2. Si `onboarding_completed = true`, el cliente ya completo el proceso
3. Si necesitas regenerar el token:
   ```sql
   UPDATE sales SET onboarding_token = gen_random_uuid(), onboarding_completed = false
   WHERE client_email = 'email@cliente.com';
   ```

---

## Errores de Produccion (EasyPanel)

### "Page not found" en rutas

**Sintoma:** La app funciona en `/` pero da 404 en otras rutas.

**Causa:** Configuracion incompleta del despliegue en EasyPanel.

**Solucion recomendada:**
1. Usar `HashRouter` (la app ya viene configurada asi en `App.tsx`)
2. Verificar que EasyPanel usa `npm run build` y publica `build_prod`
3. Confirmar que la rama conectada en EasyPanel es `main`

---

### Variables de entorno no funcionan

**Sintoma:** La app no conecta con Supabase en produccion.

**Causa:** Variables de entorno no configuradas en EasyPanel.

**Solucion:**
1. En EasyPanel: App > Environment Variables
2. Añade:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Importante:** redespliega la app despues de guardar variables

---

## Comandos Utiles de Diagnostico

### Ver todos los usuarios
```sql
SELECT id, email, name, role FROM users;
```

### Ver ventas recientes
```sql
SELECT id, client_email, status, created_at FROM sales ORDER BY created_at DESC LIMIT 10;
```

### Ver clientes activos
```sql
SELECT property_nombre, property_correo_electr_nico, status FROM clientes_pt_notion WHERE status = 'Active';
```

### Verificar RLS activo
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

### Desactivar RLS temporalmente (solo desarrollo)
```sql
ALTER TABLE clientes_pt_notion DISABLE ROW LEVEL SECURITY;
-- Recuerda volver a activarlo:
-- ALTER TABLE clientes_pt_notion ENABLE ROW LEVEL SECURITY;
```

---

## Contacto y Soporte

Si el problema persiste:

1. Revisa los logs de la consola del navegador (F12 > Console)
2. Revisa los logs de Supabase > Logs
3. Documenta el error exacto y los pasos para reproducirlo

---

*Documento actualizado: Enero 2026*
