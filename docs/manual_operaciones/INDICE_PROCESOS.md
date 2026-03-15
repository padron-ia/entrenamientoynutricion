# 📚 Índice Maestro de Procesos Operativos - CRM Coaching

Este documento sirve como **Hoja de Ruta** para la validación y documentación de cada flujo del negocio. El objetivo es definir el "Standard Operating Procedure" (SOP) para que el sistema sea replicable y adaptable a cualquier negocio de coaching o servicios de acompañamiento.

---

## 🚀 0. Instalación y Configuración Inicial (Nuevos Propietarios)
*Documentación para desplegar el CRM desde cero en un nuevo negocio.*

*   **0A. Guía de Instalación del Producto**: Requisitos, credenciales, scripts SQL y despliegue.
    *   *Documento*: `0_GUIA_INSTALACION_PRODUCTO.md`
*   **0B. Configuración del Negocio**: Personalización de datos legales, pagos, branding y plantillas.
    *   *Documento*: `0B_CONFIGURACION_NEGOCIO.md`
*   **0C. Checklist de Instalación**: Lista imprimible para verificar cada paso.
    *   *Documento*: `CHECKLIST_INSTALACION.md`
*   **0D. Solución de Problemas**: Errores comunes y sus soluciones.
    *   *Documento*: `TROUBLESHOOTING.md`

---

## 🟢 1. Adquisición y Venta (Sales Flow)
*Definición de cómo entran los clientes y el dinero.*

*   **1.1. Registro de Nueva Venta**: Pasos exactos que sigue el Closer en el CRM.
    *   *Datos capturados*: Precio, Duración, Coach Asignado.
    *   *Automatización*: Disparo de webhooks (N8N), Email de bienvenida.
*   **1.2. Gestión de Pagos Iniciales**:
    *   Subida de comprobantes vs. Links de pago.
    *   Validación por parte de administración.

## 🔵 2. Onboarding y Alta (Client Journey)
*El momento crítico donde el "Lead" se convierte en "Alumno".*

*   **2.1. El Enlace Mágico**: Cómo funciona el link de bienvenida única vez.
*   **2.2. Firma de Contrato**: Proceso legal, almacenamiento del PDF firmado.
*   **2.3. Anamnesis (Formulario Inicial)**:
    *   Recogida de datos médicos (Diabetes Tipo 1/2, Medicación).
    *   Recogida de datos nutricionales y deportivos.
    *   **Punto Crítico**: ¿Dónde se guardan estos datos médicos sensibles?

## 🟠 3. Gestión Diaria y Seguimiento (The Service)
*Lo que ocurre día a día en la academia.*

*   **3.1. Visión del Coach**:
    *   ¿Qué ve exactamente el coach? (Filtros de seguridad).
    *   ¿Qué puede editar? (Feedback semanal, ajustes de macros).
*   **3.2. Visión del Cliente (App)**:
    *   Registro de peso, glucosa y sensaciones.
    *   Visualización de gráficas de progreso.
*   **3.3. Intervención Especialista**:
    *   **Endocrino**: Cuándo interviene, qué permisos tiene para ver analíticas.
    *   **Psicólogo**: Acceso a notas de "Estado de ánimo" o "Ansiedad".

## 🟣 4. Ciclo de Vida y Renovaciones (Retention)
*Cómo maximizar el LTV (Lifetime Value).*

*   **4.1. Sistema de Fases (F1 -> F5)**: Lógica de negocio de las etapas del alumno.
*   **4.2. Detección de Renovación**: Alertas automáticas 15 días antes.
*   **4.3. Cierre de Renovación**: Pago, confirmación y extensión automática de fechas.
*   **4.4. Proceso de Baja/Pausa**: Protocolo para "congelar" clientes o dar de baja.

## ⚫ 5. Administración y Staff (Management)
*Gestión del negocio y permisos.*

*   **5.1. Alta de Nuevo Staff**:
    *   Cómo crear un usuario Coach/Closer.
    *   Asignación de comisiones y tarifas.
*   **5.2. Facturación Interna**:
    *   Cómo suben los coaches sus facturas a final de mes.
    *   Proceso de aprobación y pago de comisiones.
*   **5.3. Auditoría y Logs**: Quién hizo qué y cuándo.

---

## 📝 Estado de la Documentación

| Proceso | Estado Actual | Documento Detallado |
| :--- | :--- | :--- |
| **0A. Instalación** | 🟢 Completado | `0_GUIA_INSTALACION_PRODUCTO.md` |
| **0B. Configuración** | 🟢 Completado | `0B_CONFIGURACION_NEGOCIO.md` |
| **0C. Checklist** | 🟢 Completado | `CHECKLIST_INSTALACION.md` |
| **0D. Troubleshooting** | 🟢 Completado | `TROUBLESHOOTING.md` |
| **1. Ventas** | 🟢 Completado | `1_PROCESO_VENTAS_Y_ALTA.md` |
| **2. Onboarding** | 🟢 Completado | `2_PROCESO_ONBOARDING_Y_CONTRATO.md` |
| **3. Gestión Coach** | 🟢 Completado | `3_GESTION_COACH_Y_SEGUIMIENTO.md` |
| **4. Renovaciones** | 🟢 Completado | `4_CICLO_VIDA_Y_RENOVACIONES.md` |
| **5. Staff/Admin** | 🟢 Completado | `5_ADMINISTRACION_Y_STAFF.md` |
| **6. Integraciones** | 🟢 Completado | `6_GUIA_INTEGRACIONES_EXTERNAS.md` |
| **7. Especialistas y Soporte** | 🟢 Completado | `7_PROCEDIMIENTOS_ESPECIALES_Y_SOPORTE.md` |
| **8. Marketing y RRSS** | 🟢 Completado | `8_MARKETING_CONTENIDOS_Y_RRSS.md` |

---

✅ **Documentación Completa:** Todos los procesos críticos han sido documentados a fecha de Enero 2026.
*(Leyenda: 🔴 Pendiente de escribir, 🟡 Borrador inicial, 🟢 Completado)*

---

## 📦 Documentos Técnicos Adicionales

| Documento | Propósito |
| :--- | :--- |
| `AUDITORIA_GENERAL_2026.md` | Visión técnica completa del proyecto |
| `MAPA_ALMACENAMIENTO_DATOS.md` | Dónde se guarda cada dato (tablas y storage) |
| `DIAGRAMA_FLUJO_VENTAS.md` | Diagrama visual del proceso de venta |
| `MANUAL_DE_DESARROLLO_Y_PROTOCOLOS.md` | Reglas para modificar el código |
| `LISTADO_MEJORAS_DETECTADAS.md` | Roadmap de mejoras pendientes |
