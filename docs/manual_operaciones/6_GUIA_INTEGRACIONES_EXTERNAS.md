# 🔌 6. Guía de Integraciones Externas y Configuración

**Versión:** 1.0 (Enero 2026)  
**Audiencia:** Dueño del Negocio / CTO.  
**Objetivo:** Inventariar todos los "servicios satélite" que el sistema utiliza, para decidir su uso y saber dónde se "enchufan" las claves.

---

## 🏗️ Filosofía de Arquitectura "Modular"

El CRM está diseñado para ser el cerebro central, pero usa "brazos" externos para tareas específicas. Esto permite cambiar de proveedor (ej. cambiar N8N por Make) sin rehacer todo el CRM.

---

## 🤖 1. Automatización (N8N / Make)

El sistema dispara "avisos" cuando ocurren cosas importantes (Ventas, Onboarding completo).

*   **¿Es obligatorio?** 🟡 Opcional. Si se desactiva, el negocio funciona, pero perderás los emails automáticos de bienvenida y avisos a Telegram/Slack.
*   **¿Dónde se configura?**
    *   **Archivo:** `src/services/webhookService.ts` (o en variables de entorno `.env` como `VITE_WEBHOOK_URL`).
    *   **Dato Necesario:** La URL del Webhook (ej: `https://n8n.mi-propio-servidor.com/webhook/...`).
*   **Decisión de Negocio:**
    *   *Opción A (Recomendada):* Pagar un servidor N8N (~$20/mes) para automatizar todo.
    *   *Opción B (Low Cost):* Hacerlo manual (El coach envía email personal al alumno).

---

## 🎥 2. Video Feedback (Loom / Vimeo)

Para las revisiones semanales de los alumnos.

*   **¿Es obligatorio?** 🔴 Sí es crítico para la metodología, pero la integración tecnológica es flexible.
*   **Estado Actual:** Manual (El coach copia/pega el link).
*   **Integración Futura (SDK):**
    *   **¿Dónde se configuraría?** En un archivo nuevo `src/config/integrations.ts`.
    *   **Dato Necesario:** `LOOM_API_KEY`.
    *   **Coste:** Requiere cuenta Business/Enterprise de Loom.

---

## 💳 3. Pasarelas de Pago (Stripe / Hotmart)

El CRM no procesa tarjetas directamente (por seguridad PCI), sino que almacena los comprobantes o enlaces.

*   **¿Es obligatorio?** 🟢 Sí, para cobrar.
*   **¿Dónde se configura?**
    *   Las opciones que aparecen en el desplegable "Método de Pago" se gestionan en la Base de Datos (Tabla `app_settings` o `payment_methods`).
    *   No requiere tocar código para añadir un nuevo banco o método.

---

## ☁️ 4. Infraestructura Core (Supabase)

El "motor" del coche. Base de datos y Archivos.

*   **¿Es obligatorio?** 🔴 SÍ. Sin esto no hay CRM.
*   **Credenciales:**
    *   Se guardan en el archivo `.env` del servidor de despliegue (Netlify/Vercel).
    *   **Claves:** `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
*   **Propiedad:** Al vender el proyecto, se debe transferir la propiedad de la organización de Supabase al nuevo dueño.

---

## 📝 Resumen de Costes Operativos (SAAS Stack)

Para que el negocio funcione, el dueño debe mantener activas estas suscripciones:

| servicio | Uso | Coste Estimado | Criticidad |
| :--- | :--- | :--- | :--- |
| **Hosting Frontend** | Netlify / Vercel | Gratis / $20 mes | 🔴 Alta |
| **Supabase** | Base de Datos + Archivos | $25/mes (Plan Pro) | 🔴 Alta |
| **N8N / Make** | Automatizaciones | $20/mes | 🟡 Media |
| **Loom** | Grabación Vídeos | $10/user/mes | 🟢 Baja (Manual) / Alta (API) |

---
*Este documento debe entregarse siempre junto con las claves de acceso al nuevo propietario.*
