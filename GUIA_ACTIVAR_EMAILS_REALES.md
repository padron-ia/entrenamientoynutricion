# 📧 Guía: Activar Invitaciones por Email (Supabase Auth)

Actualmente, tu sistema usa un **Gestor de Usuarios Simplificado** que guarda los datos directamente en una tabla (`public.users`) y usa contraseñas simples. Esto permite que funcione inmediatamente sin configurar servidores complejos.

Sin embargo, **Supabase NO envía correos** automáticamente con este método porque no estamos usando su sistema nativo de Invitaciones (`GoTrue / Supabase Auth`).

Para habilitar el envío real de correos de invitación ("Magic Links" o "Set Password Links"), necesitas implementar una **Supabase Edge Function**.

---

## 🛠️ Solución Profesional: Supabase Edge Functions

Como tu aplicación es **Client-Side Only** (React ejecutándose en el navegador), NO TIENE PERMISO para invitar usuarios directamente. Necesitamos un pequeño "ayudante" en el servidor.

### Paso 1: Configura tu proyecto local
Necesitas tener instalado el CLI de Supabase y Docker.
```bash
supabase init
```

### Paso 2: Crear la Función
Crea un archivo en `supabase/functions/invite-user/index.ts`:

```typescript
// supabase/functions/invite-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // 1. Verificar que el usuario que llama es ADMIN
  // (Omitido por brevedad, pero deberías verificar el JWT)

  const { email, redirectTo } = await req.json()
  
  // 2. Crear cliente con SERVICE_ROLE (Permiso de Dios)
  // Esta clave SOLO existe en el servidor, nunca en el navegador
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 3. Invitar al usuario
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectTo || 'http://localhost:5173/update-password'
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }

  return new Response(JSON.stringify(data), { status: 200 })
})
```

### Paso 3: Llamar a la Función desde React

En tu archivo `services/mockSupabase.ts` (o donde gestiones los usuarios), cambia la lógica de creación para llamar a esta función:

```typescript
const inviteUser = async (email: string) => {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { 
      email: email,
      redirectTo: window.location.origin 
    }
  })
}
```

---

## 🚀 Solución Inmediata (Sin Código Extra)

Si no quieres desplegar funciones ahora mismo, usa el **Panel de Supabase**:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Entra en tu proyecto -> **Authentication** -> **Users**.
3. Haz clic en **Invite User**.
4. Escribe el email del coach.
5. El coach recibirá el correo oficial de Supabase.

Cuando el coach haga clic en el correo y configure su contraseña, **se creará automáticamente en `auth.users`**.

Para que luego aparezca en tu CRM, asegúrate de tener activado el Trigger de Sincronización (que ya tienes en `database/automation_auth_sync.sql`).

### Resumen
- **Modo Actual (Manual):** Tú creas el usuario en el CRM con una contraseña temporal y se la das.
- **Modo Automático:** Debes usar el panel de Supabase o implementar Edge Functions.
