# ⚫ 5. Administración y Staff (Gestión del Equipo)

**Versión:** 1.0 (Enero 2026)  
**Actores:** Admin (Víctor/Jesús), Contabilidad.  
**Objetivo:** Gestionar el capital humano, permisos y pagos internos de colaboraciones.

---

## 👥 5.1. Alta de Nuevo Staff

Cuando entra un nuevo colaborador (Closer o Coach):

1.  **Enlace de Invitación (Recomendado):**
    *   Administración accede a **Organización > Gestión de Staff**.
    *   Genera un **Link de Acceso** indicando el nombre, email y rol del colaborador.
    *   Envía el link al colaborador (vía WhatsApp/Email).
    *   El colaborador completa su propio registro (elige contraseña y sube su foto).
2.  **Asignación de Rol:**
    *   El rol se define en la invitación, pero puede ser editado posteriormente en el panel.
    *   **Peligro:** Un error aquí puede dar acceso total (Admin) o nulo (Cliente) a un empleado.

---

## 💳 5.2. Facturación Interna (Pagos a Coaches)

Este es el proceso inverso: La Academia paga a sus trabajadores.

### Paso 1: Subida de Factura (Por el Coach)
*   **Cuándo:** A final de mes (días 25-30).
*   **Dónde:** Dashboard > Sección "Mis Facturas".
*   **Qué sube:** PDF de su factura oficial + Monto total.

### Paso 2: Validación (Por Administración)
*   Contabilidad recibe una alerta de "Nueva Factura Pendiente".
*   Revisa que el monto coincida con las comisiones generadas en el Dashboard.
*   **Acción:**
    *   ✅ **Aprobar:** La factura pasa a "Lista para Pago".
    *   ❌ **Rechazar:** Debe incluir una nota explicando el error (ej: "Falta IRPF").

### Paso 3: Pago Real
*   Administración realiza la transferencia bancaria real.
*   En el CRM, marca la factura como **"PAGADA"**.
*   El Coach recibe la notificación.

---

## 🔗 5.3. Invitación de Clientes Existentes (Activación de Cuenta)

Para clientes que **ya existen en el CRM** (importados de Notion, migrados, etc.) pero que **no tienen cuenta de acceso** al portal, existe un sistema de invitación.

### Cuándo Usar
- Clientes importados desde otra plataforma
- Clientes antiguos que nunca crearon contraseña
- Cualquier ficha de cliente sin `user_id` vinculado

### Paso a Paso

1.  **Acceder a la Ficha del Cliente**
    - Navegar a **Clientes > [Nombre del Cliente]**
    - Verificar que el cliente NO tiene cuenta (no aparece icono de "vinculado")

2.  **Generar Enlace de Invitación**
    - Clicar el botón **"Invitar a registrarse"** (icono de usuario con +)
    - El sistema genera un **token único** y lo guarda en la base de datos
    - Aparece un modal con el enlace de activación

3.  **Enviar al Cliente**
    - Copiar el enlace usando el botón "Copiar"
    - Enviarlo al cliente por WhatsApp o Email
    - El enlace tiene formato: `https://app.tudominio.com/#/activar-cuenta/{token}`

4.  **El Cliente Activa su Cuenta**
    - El cliente abre el enlace
    - Ve su nombre (confirmación de identidad)
    - Crea su contraseña
    - El sistema:
      - Crea el usuario en `auth.users`
      - Vincula el `user_id` a `clientes_pt_notion`
      - Limpia el token usado
      - Auto-login y redirige al portal

### Especificaciones Técnicas
| Campo | Tabla | Descripción |
| :--- | :--- | :--- |
| `activation_token` | `clientes_pt_notion` | Token UUID único |
| `activation_token_created_at` | `clientes_pt_notion` | Timestamp de generación |
| `user_id` | `clientes_pt_notion` | Se actualiza tras activación |

### Seguridad
- El token es de **un solo uso**: se borra tras activar
- Solo visible para Admins (botón no aparece para otros roles)
- Si el cliente ya tiene cuenta, el botón no aparece

---

## 🔐 5.4. Auditoría de Seguridad (Logs)

El sistema traza las acciones críticas.

*   **¿Quién borró a este cliente?**
    *   El sistema guarda un registro (`audit_logs`) de acciones destructivas.
*   **¿Quién vio estos datos médicos?**
    *   Como se indicó en el Manual 2, el acceso a datos médicos está restringido por RLS.

---

## ⚙️ 5.5. Especificaciones Técnicas

*   **Tabla de Invoices:** `public.coach_invoices`.
*   **Bucket de Invoices:** `documents/invoices/{coach_id}/{year}/`.
*   **Permisos Staff:** Definidos en `types.ts` (Enum `UserRole`) y aplicados en BBDD por `seguridad_total_rls.sql`.

---

## ❓ FAQ Interno

**P: ¿Un Coach puede ver cuánto ganan otros Coaches?**
R: **NO**. Rotundamente no. El sistema financiera está aislado. Cada Coach solo ve sus propias métricas y facturas. Solo el rol `ADMIN` o `CONTABILIDAD` ve el global.

---

## 🛠️ Apéndice Técnico: Procedimiento de Alta Manual (SQL)

*SOLO PARA ADMINISTRADORES TÉCNICOS*  
Actualmente, no existe interfaz visual para invitar staff. Se debe ejecutar este script en la consola SQL de Supabase:

```sql
-- 1. Crear usuario en Auth (Panel Supabase -> Authentication -> Add User)
-- 2. Copiar el UUID generado.
-- 3. Ejecutar este script reemplazando los datos:

INSERT INTO public.users (id, email, name, role, commission_percentage)
VALUES 
  ('UUID_COPIADO_DE_AUTH', 'nuevo_coach@email.com', 'Nombre Coach', 'coach', 15)
ON CONFLICT (id) DO UPDATE 
SET role = 'coach', commission_percentage = 15;
```

*Este procedimiento manual es secundario; se recomienda usar siempre el panel de Gestión de Staff para evitar errores de sincronización.*
