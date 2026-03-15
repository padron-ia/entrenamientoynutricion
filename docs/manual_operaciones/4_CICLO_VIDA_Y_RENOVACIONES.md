# 🟣 4. Ciclo de Vida y Renovaciones (LTV)

**Versión:** 1.0 (Enero 2026)  
**Actores:** Coach, Contabilidad, Sistema.  
**Objetivo:** Maximizar el tiempo de vida del cliente (LTV) gestionando sus renovaciones de forma proactiva.

---

## ⏳ 4.1. El Concepto de "Fases" (Logic Core)

A diferencia de un gimnasio normal (mes a mes), aquí trabajamos por **Ciclos de Compromiso**.
*   **Fase 1 (F1):** Es el contrato inicial (El "Onboarding"). Típicamente 3, 6 o 12 meses.
*   **Fases Siguientes (F2, F3, F4...):** Son las extensiones sucesivas.
    *   *Ejemplo:* Un cliente contrata 3 meses (F1). Al acabar, renueva por otros 6 meses (F2). Su "Vida Total" ahora es 9 meses.

---

## 🚨 4.2. Detección de Renovaciones (Semáforo)

El sistema vigila las fechas por ti. No tienes que calcularlo manual.

1.  **La Zona de Peligro (15 días antes):**
    *   Cuando faltan menos de 15 días para el fin de la Fase actual (ej. `F1_EndDate`), el cliente aparece en la lista **"Pendientes de Renovación"** del Dashboard.
2.  **La Alerta:**
    *   Visualmente se marca en rojo/naranja.
    *   Es el momento de que el Coach hable con el alumno: *"Tu plan vence el día 30, ¿vamos a por la siguiente fase?"*.

---

## ✍️ 4.3. Ejecución de la Renovación (Paso a Paso)

Cuando el cliente dice "SÍ":

### Paso 1: Pago
*   El cliente paga la nueva cuota (Transferencia o Link enviado por el Coach).
*   El Coach/Admin recibe el comprobante.

### Paso 2: Registro en CRM
1.  El Coach va a la **Ficha del Cliente**.
2.  Sección **"Programa / Renovación"**.
3.  Activa el interruptor: **"¿Renueva F2?"** (o la fase que toque).
4.  Introduce los detalles:
    *   **Duración Nueva:** (ej. 6 meses).
    *   **Fecha Inicio:** Automáticamente se sugiere el día siguiente al fin de la fase anterior (continuidad).
    *   **Importe:** Cuánto ha pagado.
    *   **Comprobante:** Sube el PDF/Foto del pago.

### Paso 3: Magia del Sistema 🪄
Al guardar:
*   La "Fecha Fin de Contrato" global se extiende.
*   El cliente desaparece de la lista de alertas.
*   Contabilidad registra el nuevo ingreso en el mes actual.

---

## 🚪 4.4. Gestión de Bajas (Churn)

Si el cliente dice "NO":

1.  El Coach debe marcar al cliente como **BAJA**, **ABANDONO** o **PAUSADO**.
    *   *Baja:* Terminó su tiempo y decide no seguir (Salida limpia).
    *   *Abandono:* Se va a mitad del contrato o deja de responder (Salida sucia).
    *   *Pausado:* El alumno necesita detener el servicio temporalmente.
2.  **Lógica de Pausa Automática:**
    - Al pulsar "Pausar", se indica el motivo.
    - El tiempo de pausa queda registrado en la base de datos.
    - Al pulsar **"Reactivar Cliente"**, el CRM calcula cuántos días estuvo fuera y **extiende automáticamente la fecha de fin de contrato**.
3.  **Consecuencia:** Mientras está pausado o de baja, el cliente pierde acceso a la App y deja de contar para las métricas activas.

---

## ⚙️ Especificaciones Técnicas

*   **Cálculo de Fechas:** El sistema usa `date-fns` para sumar meses. Si F1 acaba el 31 de Enero, F2 empieza el 1 de Febrero para no perder días de servicio.
*   **Cascada de Fases:** No se puede activar F3 sin haber cerrado F2. El sistema valida la secuencialidad.

---

## ❓ FAQ

**P: ¿Qué pasa si un cliente quiere parar 1 mes y volver (Pausa)?**
R: Usa el botón **"Pausar Cliente"**. El sistema guardará el registro y, cuando lo reactives, le sumará automáticamente ese mes (o los días exactos) a su fecha de finalización de contrato para que no pierda servicio pagado.
