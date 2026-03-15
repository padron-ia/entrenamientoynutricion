# 🛡️ Manual de Desarrollo y Protocolo de Cambios Seguros

Este documento actúa como la **Ley del Proyecto**. Su objetivo es garantizar la estabilidad del sistema, asegurar que ningún cambio rompa funcionalidades existentes y mantener la documentación siempre al día.

---

## 🚦 1. Protocolo OBLIGATORIO Pre-Cambios (Safety Checklist)

**ANTES** de escribir una sola línea de código o realizar una query en base de datos, cualquier desarrollador (humano o IA) debe revisar estos 3 puntos críticos:

### 🔴 Punto de Control 1: Impacto en Datos
*   **Pregunta:** ¿Voy a modificar, borrar o alterar columnas en `clientes_pt_notion` o `sales`?
*   **Riesgo:** Estas tablas son el corazón del sistema. Un cambio aquí puede romper el Dashboard de Contabilidad o el acceso de los Coaches.
*   **Acción:** Consultar `MAPA_ALMACENAMIENTO_DATOS.md`. Si cambio una columna, ¿he verificado `mockSupabase.ts` y `types.ts`?

### 🔴 Punto de Control 2: Impacto en Seguridad (RLS)
*   **Pregunta:** ¿Voy a cambiar quién puede ver qué? (Ej: "Que el coach vea X").
*   **Riesgo:** Exponer datos de todos los clientes a un coach, o bloquear al Admin.
*   **Acción:** Revisar `AUDITORIA_GENERAL_2026.md` (Sección Seguridad). Recordar: **RLS en BBDD manda sobre el Frontend.**

### 🔴 Punto de Control 3: Impacto en Flujos Críticos
*   **Pregunta:** ¿Toco algo del proceso de Venta, Onboarding o Renovación?
*   **Riesgo:** Que un cliente pague y no reciba su acceso, o que no se registre el dinero.
*   **Acción:** Seguir el `DIAGRAMA_FLUJO_VENTAS.md`. Verificar que el cambio mantiene la cadena: `Venta -> Token -> Webhook -> Alta`.

---

## 📚 2. Índice de Documentación Viva

Estos documentos son la "Fuente de la Verdad". Si el código cambia, estos documentos **DEBEN** actualizarse en el mismo Pull Request / Commit.

1.  **🔭 Visión General y Estado**: [`AUDITORIA_GENERAL_2026.md`](./AUDITORIA_GENERAL_2026.md)
    *   *Qué es el proyecto, qué funciona y qué falta.*
2.  **💾 Mapa de Datos**: [`MAPA_ALMACENAMIENTO_DATOS.md`](./MAPA_ALMACENAMIENTO_DATOS.md)
    *   *Dónde vive cada dato (tablas y archivos) y cómo se llaman las columnas reales.*
3.  **🔄 Flujos Visuales**: [`DIAGRAMA_FLUJO_VENTAS.md`](./DIAGRAMA_FLUJO_VENTAS.md)
    *   *Diagramas de secuencia de los procesos más delicados.*

---

## ✍️ 3. Regla de "Documentación Continua"

Para cumplir con la directriz del proyecto: **"Todo lo que añadamos se añade a las instrucciones"**.

1.  **Nueva Funcionalidad = Nuevo Párrafo**: Si creamos un módulo de "Citas Médicas", se debe añadir su tabla al `MAPA_ALMACENAMIENTO` y su estado al `AUDITORIA_GENERAL`.
2.  **Cambio de Lógica = Actualización de Diagrama**: Si cambiamos cómo se hacen las renovaciones, el diagrama Mermaid debe actualizarse.

---

## 🚑 4. Qué hacer si algo se rompe (Troubleshooting)

1.  **Revisar Logs de Consola**: El frontend tiene logs detallados en `mockSupabase.ts` y `Dashboard.tsx`.
2.  **Validar contra Tipos**: Revisar `types.ts`. Es la definición estricta. Si dice `string` y llega `null`, habrá error.
3.  **Verificar Webhooks**: Si falla una venta, revisar N8N. El CRM solo dispara, no espera respuesta compleja.

---
*Este manual debe residir en la raíz de la documentación del proyecto y ser de lectura obligatoria para cualquier intervención.*
