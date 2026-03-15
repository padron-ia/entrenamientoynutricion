# public-lead-capture

Edge Function publica para capturar leads desde `/solicitar-informacion` con validacion CAPTCHA (Cloudflare Turnstile).

## Variables necesarias

- `SUPABASE_URL` (ya disponible en funciones de Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (ya disponible en funciones de Supabase)
- `TURNSTILE_SECRET_KEY` (configurar manualmente)

## Frontend

Configura en `.env.local`:

```bash
VITE_TURNSTILE_SITE_KEY=0x4AAAA...
```

## Deploy

```bash
supabase secrets set TURNSTILE_SECRET_KEY=tu_secret_key
supabase functions deploy public-lead-capture
```

## SQL opcional (fallback)

Si quieres habilitar insercion anonima directa en `leads` (sin Edge Function), aplica:

`database/migrations/20260315_public_leads_insert_policy.sql`

## Flujo

1. Usuario completa formulario publico.
2. Frontend obtiene token Turnstile.
3. Función valida token contra Cloudflare.
4. Si es valido, inserta lead en `public.leads` como `NEW`.
5. Kanban lo muestra en columna Entrantes.
