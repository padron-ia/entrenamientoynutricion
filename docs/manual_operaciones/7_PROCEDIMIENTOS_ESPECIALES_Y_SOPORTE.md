# 🏥 7. Procedimientos Especiales y Soporte

**Versión:** 1.0 (Enero 2026)  
**Actores:** Endocrino, Psicólogo, Staff de Soporte, Alumnos.  
**Objetivo:** Gestionar las necesidades médicas avanzadas y resolver incidencias técnicas o administrativas.

---

## 🩺 7.1. Intervención Especialista (Endocrino y Psicólogo)

Además del Coach diario, el alumno puede requerir validación médica periódica.

### Flujo de Trabajo (Endocrino Dashboard)
1.  **Solicitud:** El alumno envía sus métricas (sensores, gráficas) a través de la App.
2.  **Dashboard Médico:**
    *   El Endocrino entra a su panel exclusivo (`/endocrino`).
    *   Filtra por **"Pendientes"** (Bandera Amarilla).
3.  **Revisión Clínica:**
    *   Analiza: Tipos de Insulina, Medicación actual, Comentarios psicosomáticos.
    *   **Acción:** Escribe "Notas Clínicas" y graba un video explicativo (Loom).
4.  **Cierre:**
    *   Al guardar, el estado pasa a **"Revisado"**.
    *   El alumno recibe la notificación y el PDF/Video con las pautas médicas.

*   **Nota de Seguridad:** Solo los roles `ENDOCRINO`, `ADMIN` y `HEAD_COACH` tienen permiso de escritura aquí. Un Coach normal tiene acceso de solo lectura (si es su alumno).

---

## 🎫 7.2. Centro de Soporte (Tickets)

Cuando algo falla o hay dudas no rutinarias.

### Tipos de Incidencias (Categorías)
*   🛠️ **Técnico App:** "No puedo subir mi foto", "Me da error el login".
*   🍎 **Nutrición/Entreno:** Dudas profundas que el Coach escala.
*   💶 **Facturación:** "No me ha llegado el recibo", "Quiero cambiar mi tarjeta".

### El Ciclo de Vida del Ticket
1.  **Apertura:**
    *   El Alumno (o un Staff en su nombre) crea el ticket.
    *   Define: Asunto, Categoría y Prioridad (Baja/Media/Alta).
2.  **Triaje y Asignación:**
    *   El sistema notifica al **Head Coach** o Admin.
    *   Se asigna un **Responsable** (ej: si es Facturación -> Contabilidad).
3.  **Resolución (Chat):**
    *   Staff y Alumno chatean dentro del ticket (estilo WhatsApp).
    *   Todo queda registrado en el historial.
4.  **Cierre:**
    *   El Staff marca el ticket como **"Resuelto"** o **"Cerrado"**.

---

## ⚙️ Especificaciones Técnicas

### A. Dashboard Médico
*   **Componente:** `EndocrinoDashboard.tsx`.
*   **Datos:** Tabla `medical_reviews`.
*   **Privacidad:** Uso estricto de RLS. Un endocrino ve todos los pacientes que solicitan revisión, o solo los asignados si se implementa esa lógica futura.

### B. Tickets de Soporte
*   **Componente:** `SupportTicketsView.tsx`.
*   **Realtime:** Usa Supabase Channels para que el chat sea instantáneo sin recargar la página.
*   **Notificaciones:** Al crear ticket o comentar, se dispara una alerta a la tabla `notifications`.

---

## ❓ FAQ Especialista

**P: ¿El Endocrino puede cambiar la dieta del alumno?**
R: **Sí**, pero se recomienda hacerlo en coordinación con el Coach. Lo ideal es dejar la pauta en "Notas Clínicas" para que el Coach la implemente en el plan nutricional.

**P: ¿Qué pasa si un ticket urgente no se responde?**
R: Actualmente depende de la revisión manual del dashboard. *[Mejora Detectada]*: Falta un sistema de "Alerta por Email a Staff" si un ticket Alta Prioridad lleva >24h abierto.
