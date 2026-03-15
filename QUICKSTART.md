# Instalacion Rapida (5 minutos)

Sigue estos 4 pasos para tener tu CRM funcionando.

---

## Paso 1: Crear proyecto en Supabase

```
1. Abre https://supabase.com
2. Click "Start your project" (o "Sign In" si ya tienes cuenta)
3. Click "New Project"
4. Rellena:
   - Name: mi-crm (o el nombre que quieras)
   - Database Password: (guarda esta contraseña!)
   - Region: EU West (o la mas cercana a ti)
5. Click "Create new project"
6. Espera 2 minutos a que se cree
```

---

## Paso 2: Configurar la base de datos

```
1. En tu proyecto de Supabase, click en "SQL Editor" (menu izquierdo)
2. Click "New query"
3. Abre el archivo: database/SETUP_COMPLETO.sql
4. Copia TODO el contenido
5. Pegalo en el editor SQL de Supabase
6. Click "Run" (boton verde abajo a la derecha)
7. Deberia mostrar: "Success. No rows returned"
```

---

## Paso 3: Obtener credenciales

```
1. En Supabase, ve a "Settings" (icono engranaje, menu izquierdo)
2. Click en "API"
3. Copia estos dos valores:

   Project URL:     https://xxxxx.supabase.co    <-- Copia esto
   anon public:     eyJhbGciOiJIUzI1NiIsInR5c... <-- Copia esto (es largo)
```

---

## Paso 4: Configurar y ejecutar

```bash
# En tu terminal:

# 1. Instalar dependencias
npm install

# 2. Crear archivo de configuracion
cp .env.example .env.local

# 3. Editar .env.local con tus credenciales
#    (usa tu editor favorito: code, nano, notepad, etc.)

# 4. Ejecutar
npm run dev
```

Tu archivo `.env.local` debe verse asi:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Paso 5: Crear tu usuario Admin

```
1. En Supabase, ve a "Authentication" (menu izquierdo)
2. Click en "Users"
3. Click "Add User" > "Create new user"
4. Rellena:
   - Email: tu@email.com
   - Password: tu-contraseña-segura
5. Click "Create user"
```

---

## Listo!

Abre http://localhost:5173 y entra con tu email y contraseña.

---

## Problemas?

- Ver [TROUBLESHOOTING.md](./docs/manual_operaciones/TROUBLESHOOTING.md)
- Ver [Guia completa de instalacion](./docs/manual_operaciones/0_GUIA_INSTALACION_PRODUCTO.md)
