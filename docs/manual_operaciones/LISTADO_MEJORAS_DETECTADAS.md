# 🛠️ Listado de Mejoras Detectadas (Roadmap)

Este documento recopila las **carencias operativas** o **fallos de implementación** detectados durante la revisión de los procesos. Sirve como backlog de desarrollo prioritario.

---

## 🟢 Sobre Proceso de Ventas (1_PROCESO_VENTAS_Y_ALTA)

*   **Estado:** ✅ COMPLETADO (Enero 2026).
*   **Solución:** Implementada opción "Personalizada" en NewSaleForm que permite indicar el número exacto de meses del contrato.

### 2. Gestión de Pagos Fraccionados (Transferencias)
*   **Estado Actual:** Si el pago es fraccionado y manual (transferencia), el sistema actual solo registra "la venta", pero no gestiona el calendario de pagos futuros.
*   **Requerimiento (Mejora):**
    *   Si se marca "Pago Fraccionado por Transferencia", el sistema debe pedir la **Periodicidad** (Mensual, Trimestral).
    *   Debe generar **Alertas/Recordatorios** automáticos para reclamar los siguientes pagos en las fechas correspondientes. (Módulo "Cuentas por Cobrar").

### 3. Registro de Datos Bancarios para Transferencia
*   **Requerimiento (Mejora):** Cuando el método es transferencia, el sistema debe mostrar claramente al Closer/Cliente los datos bancarios de la Academia (IBAN) o confirmar que se han facilitado, para evitar errores en el pago.

---

## 🔵 Sobre Proceso de Onboarding (2_PROCESO_ONBOARDING_Y_CONTRATO)

### 1. Consentimiento Explícito de Datos de Salud (RGPD/GDPR)
*   **Estado Actual:** El contrato general menciona responsabilidad médica, pero falta una capa específica de protección de datos.
*   **Requerimiento (NO NEGOCIABLE):**
    *   Casilla de verificación **independiente y obligatoria** para el "Tratamiento de Datos de Categoría Especial (Salud)".
    *   El texto legal debe explicar explícitamente qué datos se recogen (peso, glucosa, patologías), quién los verá (Coach, Admin) y con qué fin.
    *   Este consentimiento debe guardarse con fecha y hora (`consent_timestamp`) en la base de datos.
- [x] **Consentimiento RGPD (Datos de Salud)**: Implementado checkbox obligatorio en Onboarding con registro de `consent_timestamp`.

### 2. Cláusula de Exención de Responsabilidad Médica
*   **Requerimiento:** Asegurar que el contrato especifica claramente que el servicio es de *acompañamiento educativo/nutricional* y **NO sustituye al médico endocrino**. El cliente debe firmar que entiende esto para evitar demandas si ignora sus pautas médicas.

---

### 3. Formularios de Valoración Inicial (Fase 2 Onboarding)
*   **Estado Actual:** Faltan los formularios profundos post-contrato.
*   **Requerimiento (NUEVO MÓDULO):**
    *   **Formulario de Nutrición:** Cuestionario detallado (gustos, horarios, intolerancias) que se guarda en el perfil del cliente.
    *   **Evaluación de Movimiento/Entrenamiento:**
        *   Integración de **Videos de YouTube** (propiedad de la Academia).
        *   Campos para reporte de resultados y sensaciones.
    *   **Lógica de Bloqueo (Blocking Flow):** El cliente entra en un "modo limbo" donde solo ve estos formularios. No se libera el Dashboard principal hasta que todo esté completado.
    *   **Notificación de "Listo":** Al finalizar el último formulario, se dispara un aviso automático al Coach ("Cliente X ha completado su evaluación inicial").


---

## 🟠 Sobre Gestión Diaria (3_GESTION_COACH_Y_SEGUIMIENTO)

### 2. Integración Nativa con Loom (SDK)
*   **Estado Actual:** Proceso manual (Grabar en app externa -> Copiar Link -> Pegar en CRM).
*   **Requerimiento:** Implementar **Loom Record SDK** directamente en el formulario de Revisión Semanal.

---

## ⚫ Sobre Administración y Staff (5_ADMINISTRACION...)

### 1. Panel de Invitación de Staff (Invite System)
*   **Estado:** ✅ COMPLETADO (Enero 2026).
*   **Implementación:** Panel visual en Organización > Gestión de Staff para invitar vía link.

---

## 🔴 CRÍTICO: Integridad y Seguridad (Nuevos Hallazgos)

### 1. Lógica de Pausa Defectuosa (El tiempo corre)
*   **Estado:** ✅ COMPLETADO (Enero 2026).
*   **Solución:** Implementada tabla `contract_pauses` y extensión automática de contrato en `ClientDetail`.

*   **Estado:** ✅ COMPLETADO (Enero 2026).
*   **Solución:** Flujo de recuperación de contraseña implementado y rediseñado con estilo Dark Premium.

### 3. Reasignación de Coach (Head Coach)
*   **Estado:** ✅ COMPLETADO (Enero 2026).
*   **Solución:** Selector de transferencia masiva implementado en el Panel Admin.

---
*Documento vivo. Añadir aquí cualquier "Debe haber" que falte en el sistema actual.*
