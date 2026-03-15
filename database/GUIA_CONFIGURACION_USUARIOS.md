# 🔧 Guía: Configurar Tabla de Usuarios en Supabase

## 📋 Problema Resuelto

**Antes**: Los usuarios se creaban solo en memoria y se perdían al recargar la página.  
**Ahora**: Los usuarios se guardan en Supabase y persisten permanentemente.

---

## 🚀 Pasos para Configurar

### Opción 1: Script Simple (Recomendado para Testing)

1. **Abre Supabase Dashboard**
   - Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto

2. **Abre SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "+ New query"

3. **Ejecuta el Script**
   - Abre el archivo: `database/create_users_table_simple.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **"Run"** (o presiona `Ctrl+Enter`)

4. **Verifica**
   - Deberías ver un mensaje de éxito
   - Ve a "Table Editor" → "users"
   - Deberías ver 2 usuarios: Admin Demo y Coach Demo

---

### Opción 2: Script con Seguridad (Producción)

Si necesitas Row Level Security (RLS):

1. Usa el archivo `database/create_users_table.sql`
2. Sigue los mismos pasos que la Opción 1
3. Configura autenticación de Supabase según tu necesidad

---

## ✅ Verificación

### 1. Verifica que la tabla existe

```sql
SELECT * FROM public.users;
```

Deberías ver:
```
id          | name        | email            | role  | password
------------|-------------|------------------|-------|----------
admin-123   | Admin Demo  | admin@demo.com   | admin | 123456
coach-1     | Coach Demo  | coach@demo.com   | coach | 123456
```

### 2. Prueba crear un usuario desde la app

1. Inicia sesión como Admin (`admin@demo.com`)
2. Ve a "Configuración del Equipo"
3. Haz clic en "Nuevo Usuario"
4. Completa el formulario:
   - Nombre: "Test Coach"
   - Email: "test@coach.com"
   - Rol: Coach
   - Contraseña: "123456"
5. Haz clic en "Crear Usuario"

### 3. Verifica en Supabase

```sql
SELECT * FROM public.users ORDER BY created_at DESC;
```

Deberías ver el nuevo usuario en la lista.

### 4. Recarga la página

- Cierra sesión
- Recarga la página (F5)
- Inicia sesión de nuevo
- Ve a "Configuración del Equipo"
- **El nuevo usuario debería seguir ahí** ✅

---

## 🐛 Solución de Problemas

### Error: "relation 'users' does not exist"

**Causa**: La tabla no se ha creado aún.  
**Solución**: Ejecuta el script SQL en Supabase.

### Error: "duplicate key value violates unique constraint"

**Causa**: Ya existe un usuario con ese email.  
**Solución**: Usa otro email o elimina el usuario existente.

### Los usuarios no aparecen después de crearlos

**Causa 1**: RLS está bloqueando las consultas.  
**Solución**: Ejecuta en SQL Editor:
```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

**Causa 2**: Error de conexión a Supabase.  
**Solución**: Verifica en la consola del navegador (F12) si hay errores.

### Los usuarios se pierden al recargar

**Causa**: La tabla no existe o hay un error de conexión.  
**Solución**: 
1. Verifica que la tabla existe en Supabase
2. Verifica que `.env.local` tiene las credenciales correctas
3. Mira la consola del navegador para ver errores

---

## 📊 Estructura de la Tabla

```sql
CREATE TABLE public.users (
  id TEXT PRIMARY KEY,              -- ID único del usuario
  name TEXT NOT NULL,               -- Nombre completo
  email TEXT UNIQUE NOT NULL,       -- Email (único)
  role TEXT NOT NULL,               -- 'admin' | 'coach' | 'client'
  avatar_url TEXT,                  -- URL del avatar
  password TEXT DEFAULT '123456',   -- Contraseña (plain text para demo)
  created_at TIMESTAMP,             -- Fecha de creación
  updated_at TIMESTAMP              -- Fecha de última actualización
);
```

---

## 🔒 Seguridad

### Para Testing/Desarrollo
- Usa `create_users_table_simple.sql`
- RLS deshabilitado
- Contraseñas en texto plano (solo para demo)

### Para Producción
- Usa `create_users_table.sql`
- RLS habilitado
- Implementa hash de contraseñas (bcrypt)
- Configura Supabase Auth

---

## 📝 Notas Importantes

1. **Contraseñas**: Actualmente se guardan en texto plano. Para producción, usa hash (bcrypt).

2. **RLS**: Row Level Security está deshabilitado por defecto para simplificar. Habilítalo en producción.

3. **Backup**: Haz backup de la tabla antes de hacer cambios:
   ```sql
   CREATE TABLE users_backup AS SELECT * FROM users;
   ```

4. **Migración**: Si ya tienes usuarios en memoria, se perderán. Créalos de nuevo desde la app.

---

## 🎉 ¡Listo!

Ahora los usuarios se guardan permanentemente en Supabase y no se pierden al recargar la página.

**Próximos pasos**:
- ✅ Crear usuarios desde la app
- ✅ Editar usuarios existentes
- ✅ Eliminar usuarios
- ✅ Todo persiste en la base de datos

---

*Última actualización: 12 de Diciembre de 2025*
