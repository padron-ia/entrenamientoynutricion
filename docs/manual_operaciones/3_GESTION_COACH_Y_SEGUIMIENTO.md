# 🟠 3. Gestión y Seguimiento Diario (Manual del Coach)

**Versión:** 1.0 (Enero 2026)  
**Actores:** Coach, Admin, Head Coach.  
**Objetivo:** Explicar cómo el Coach gestiona su cartera de alumnos, revisa métricas y asegura el éxito del cliente.

---

## 📅 3.1. Rutina Diaria del Coach

### 1. El Dashboard Personalizado
Al entrar al CRM, cada Coach ve única y exclusivamente a **sus alumnos asignados** (salvo Admin/Head Coach).
*   **Métricas Rápidas:**
    *   *Activos:* Total de clientes en curso.
    *   *Check-ins Pendientes:* Quién ha enviado su reporte semanal y espera respuesta.
    *   *Alertas Rojas:* Clientes que no han reportado peso/glucosa recientemente o cuya renovación vence pronto.

### 2. La Ficha del Alumno (Visión 360º)
Al hacer clic en un cliente, el Coach accede a:
*   **Datos Médicos:** Diabetes tipo, insulinas, últimas glicosiladas.
*   **Gráficas de Evolución:** Peso, Glucosa, Medidas corporales.
*   **Historial de Chats/Notas:** Bitácora interna para apuntar detalles (ej: "Se va de viaje la semana 3").

---

## 🔄 3.2. El Proceso de Revisión Semanal (Weekly Review)

Este es el servicio "Core" de la academia.

1.  **Recepción del Check-in:**
    *   El cliente rellena su formulario semanal (Viernes/Sábado/Domingo).
    *   Aparece una "Bandera Amarilla" en el Dashboard del Coach.

2.  **Análisis:**
    *   El Coach revisa los datos de la semana (adherencia, glucemias medias, pasos).
    *   Compara con la semana anterior.

3.  **Respuesta (Feedback):**
    *   **Formato:** Video corto (usando Loom o similar).
    *   **Entrega:** El Coach pega el enlace del video en el campo "Respuesta de Revisión".
    *   **Ajustes:** Si es necesario, el Coach cambia los Macros/Calorías en la pestaña "Nutrición" del cliente.

4.  **Cierre:**
    *   Al guardar, el sistema notifica al cliente (Email/App).
    *   La "Bandera Amarilla" desaparece.

---

## ⚙️ 3.3. Especificaciones Técnicas

### A. Seguridad de Datos (Visibilidad)
*   **Frontend Filter:** El componente `Dashboard.tsx` filtra `clients.filter(c => c.coach_id === currentUser.id)`.
*   **RLS (Base de Datos):** *[Mejora Pendiente]* Actualmente el staff puede ver todo técnicamente, pero la UI lo restringe. El objetivo es que la BBDD bloquee consultas de clientes ajenos.

### B. Canales de Comunicación
*   **Telegram/WhatsApp:** El link directo al chat del alumno suele guardarse en su ficha para acceso rápido desde el móvil.
*   **Loom Integration:** No hay integración nativa API con Loom aún; es un proceso manual de "Copiar/Pegar Link".

---

## ❓ 3.4. FAQ para Coaches Nuevos

**P: ¿Puedo ver los clientes de otro compañero para cubrirle una baja?**
R: No por defecto. Si necesitas cubrir a alguien, el Admin debe asignarte temporalmente esos clientes o darte permisos de "Head Coach".

**P: ¿Dónde registro si un alumno se da de baja?**
R: En la ficha del alumno, botón "Acciones" > "Dar de Baja". Debes indicar el Motivo (Económico, Salud, Fin de programa). Esto es vital para calcular el *Churn Rate* a final de mes.
