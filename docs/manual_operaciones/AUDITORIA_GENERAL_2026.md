# 🕵️‍♂️ Auditoría General del Proyecto - Padron Trainer CRM (2026)

Este documento detalla el estado actual del proyecto, la arquitectura, los flujos de datos y la seguridad, basado en una revisión exhaustiva del código fuente y la base de datos a fecha de **Enero 2026**.

---

## 🏗️ 1. Arquitectura del Sistema

El proyecto es una aplicación web SPA (Single Page Application) construida con tecnologías modernas.

*   **Frontend:** React 18+ (Vite), TypeScript, Tailwind CSS.
*   **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime).
*   **Infraestructura:** Alojada actualmente en Netlify (frontend) y Supabase (backend).
*   **Integraciones:** N8N (Webhooks para notificaciones de ventas), Loom (Videos de feedback).

### Estructura de Carpetas Clave
*   `/components`: Lógica de UI y negocio (Ventas, Dashboards, Fichas de Cliente).
*   `/database`: Scripts SQL de migración y seguridad.
*   `/types.ts`: Definición maestra de los modelos de datos (Single Source of Truth para TypeScript).

---

## 👥 2. Roles y Permisos (Seguridad)

La seguridad se maneja en dos capas: **Base de Datos (RLS)** y **Frontend (UI Filtering)**.

### Roles Definidos
1.  **Admin / Owner** (Víctor, Jesús Admin): Acceso total.
2.  **Head Coach** (Jesús): Supervisión global de métricas y coaches.
3.  **Coach** (Álvaro, Espe, Elena, Juan, Victoria): Gestión de sus propios alumnos.
4.  **Closer / Ventas** (Yassine, Sergi): Registro de nuevas ventas.
5.  **Contabilidad**: Acceso a dashboards financieros (`AccountingDashboard`).
6.  **Setter** (Tais): Roles de prospección (actualmente con permisos limitados).
7.  **Salud** (Endocrino, Psicóloga): Acceso a datos médicos específicos.

### ⚠️ Hallazgo de Seguridad (RLS)
Actualmente, las políticas de seguridad en base de datos (`seguridad_total_rls.sql`) definen una política **"Staff see all clients"** para la tabla `clientes_pt_notion`.
*   **Estado Actual:** Todo usuario con rol de "staff" (incluyendo closers y coaches) tiene permiso técnico en BBDD para ver todos los clientes.
*   **Protección Actual:** La aplicación (`ClientList.tsx`, `Dashboard.tsx`) filtra activamente los datos para que cada coach solo vea lo suyo en la interfaz.
*   **Recomendación:** Para máxima seguridad, se debería refinar la política RLS para que sea: "Staff ve clientes donde `coach_id` = su ID OR rol es Admin".

---

## 🔄 3. Flujos de Procesos Críticos

### A. Proceso de Venta y Alta (De la A a la Z)
Este es el flujo que ocurre cuando se cierra una venta:

1.  **Registro de Venta (`NewSaleForm.tsx`)**:
    *   El **Closer** accede al formulario de "Nueva Alta".
    *   Introduce: Datos Cliente, Método Pago, Precio, **Coach Asignado**, Duración Contrato.
    *   **Acción del Sistema:**
        *   Crea registro en tabla `sales` (Estado: `pending_onboarding`).
        *   Crea/Actualiza registro en tabla `clientes_pt_notion` (Crea ficha inicial).
        *   Genera un **Token Único de Onboarding**.
        *   Dispara Webhook a **N8N** (para automatizaciones externas/email).
        *   Genera un enlace mágico: `https://.../#/bienvenida/{token}`.

2.  **Onboarding del Cliente**:
    *   El Closer envía el enlace mágico al Cliente.
    *   El Cliente accede, ve su contrato y rellena el formulario inicial (Anamnesis).
    *   Al completar, el estado cambia a `active` y se notifica al Coach.

### B. Gestión del Cliente (Día a Día)
*   **Visibilidad:** El Coach ve a su cliente en `Dashboard` y `ClientList`. La lista se filtra por `coach_id`.
*   **Datos:** Todos los datos (Pesos, Glucosa, Check-ins) se guardan en tablas satélite (`weight_history`, `glucose_readings`) vinculadas por `client_id`.

### C. Proceso de Renovación
El sistema gestiona las renovaciones mediante "Fases" (F1, F2, F3, F4, F5).
1.  **Detección:** `AccountingDashboard` calcula automáticamente cuándo toca renovar basándose en `start_date` + `duration`.
2.  **Alertas:** Aparecen en el Dashboard como "Pendientes de Renovación".
3.  **Ejecución:**
    *   Se confirma el pago (subida de comprobante o link).
    *   Se marca la fase como `contracted` (ej. `renewal_f2_contracted = true`).
    *   Esto actualiza las métricas financieras automáticamente.

### D. Facturación y Contabilidad
1.  **Subida de Facturas (`InvoicesManagement`):** Coaches suben sus facturas mensuales.
2.  **Revisión:** Admin/Contabilidad revisan y marcan como `approved` o `rejected`.
3.  **Métricas:** El Dashboard de Contabilidad cruza **Ventas (Ingresos)** vs **Facturas (Gastos)** para dar el Margen Neto.

---

## 💾 4. Almacenamiento de Datos

### Base de Datos (Tablas Clave)
*   `users`: Perfiles de staff y accesos.
*   `clientes_pt_notion`: Tabla maestra de clientes (Datos personales, estado, fechas contrato).
*   `sales`: Registro histórico de ventas (trackea quién vendió qué y cuándo).
*   `coach_invoices`: Facturas de proveedores (coaches).
*   `coach_tasks`, `support_tickets`: Gestión interna.
*   `weight_history`, `glucose_readings`, etc.: Datos de seguimiento.

### Archivos (Supabase Storage)
*   Bucket `documents`:
    *   `/payment_receipts`: Comprobantes de pago de ventas y renovaciones.
    *   `/invoices`: PDFs de facturas de coaches.
    *   `/contracts`: PDFs de contratos firmados.

---

## 🧭 5. Estado de la Implementación

| Módulo | Estado | Notas |
| :--- | :--- | :--- |
| **Ventas / Altas** | ✅ Implementado | Funciona con tokens y link de onboarding. |
| **Portal Cliente** | ✅ Implementado | Clientes pueden ver planes y subir datos. |
| **Dashboards Coach** | ✅ Implementado | Filtrado por coach activo. Alertas de renovaciones. |
| **Contabilidad** | ✅ Implementado | C Calculation de LTV, Churn y Márgenes. |
| **Roles/Permisos** | ⚠️ Parcial | UI segura, pero RLS en BBDD es permisiva para Staff. |
| **Renovaciones** | ✅ Implementado | Lógica compleja de fases (F1-F5) funcionando. |
| **Facturación** | ✅ Implementado | Subida y aprobación de facturas de coaches. |

---

## 🚀 6. Recomendaciones

1.  **Endurecer RLS:** Modificar `seguridad_total_rls.sql` para que los coaches *solo* puedan hacer SELECT de sus propios clientes a nivel de base de datos.
2.  **Validación de Teléfonos:** Mejorar la validación en el formulario de alta (actualmente es básica).
3.  **Backups:** Asegurar que hay copias de seguridad de la tabla `clientes_pt_notion` ya que contiene toda la lógica de negocio vital.
4.  **Documentación Continua:** Mantener este documento actualizado con cada cambio mayor.

---
*Auditoría generada por Antigravity AI - Enero 2026*
