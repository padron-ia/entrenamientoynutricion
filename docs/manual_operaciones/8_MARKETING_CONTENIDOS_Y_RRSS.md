# 📣 8. Marketing, Contenidos y RRSS

**Versión:** 1.0 (Enero 2026)  
**Actores:** Coach, Staff RRSS (Community Manager), Admin.  
**Objetivo:** Centralizar la recopilación de "Casos de Éxito" y nutrir al equipo de redes sociales con material de calidad.

---

## 📹 8.1. Gestión de Testimonios (Proceso Interno)

El CRM actúa como el **"Buzón de Recogida"** de material.

### Paso 1: Generación del Contenido (Coach)
*   **Contexto:** Al finalizar un programa o tras un gran logro.
*   **Acción:** El Coach pide al alumno un video/audio/texto.
*   **Grabación:** Se realiza por vías externas (WhatsApp, Zoom, Loom) y se guarda en la nube (Drive/Dropbox).

### Paso 2: Registro en CRM (Coach)
1.  Navega a la sección **"Testimonios"** (`TestimonialsManager`).
2.  Pulsa **"Nuevo Testimonio"**.
3.  Rellena la ficha técnica:
    *   **Cliente:** Nombre y Apellidos (para identificar).
    *   **Tipo:** Video, Audio, Texto, Foto.
    *   **Enlace:** URL a la carpeta donde está el archivo original (Drive/Dropbox). *Nota: No subimos videos pesados directamente al CRM para no saturar el storage.*
    *   **Notas:** Contexto clave (ej: "Bajó 10kg y dejó insulina rápida").

### Paso 3: Publicación (Equipo RRSS)
1.  El CM entra al CRM con su usuario (Rol `RRSS` o `ADMIN`).
2.  Ve la lista de **Testimonios Recientes**.
3.  Accede al enlace, descarga el material y lo edita/publica en Instagram/TikTok.
4.  *(Opcional)*: Puede editar la nota para marcar "PUBLICADO el [fecha]".

---

## 📱 8.2. Flujo de Trabajo RRSS

Actualmente, la planificación editorial es externa al CRM.

*   **Fuentes de Contenido:**
    1.  Testimonios (CRM).
    2.  Dudas frecuentes de Alumnos (Tickets de Soporte).
    3.  Novedades médicas (Dashboard Endocrino).
*   **Validación:**
    *   Antes de publicar contenido médico sensible, el CM debe consultar con el Head Coach vía chat interno (Slack/WhatsApp).

---

## 📚 8.3. Base de Conocimiento (Wiki Staff)

*   **Estado Actual:** No existe una "Wiki" integrada en el CRM.
*   **Solución Temporal:** Se utiliza una carpeta compartida en **Google Drive / Notion** llamada "Protocolos PT".
*   **Mejora Detectada:** Se ha propuesto crear una sección **"Academia Staff"** dentro del CRM donde subir PDFs de formación y tutoriales de uso.

---

## ⚙️ Especificaciones Técnicas

*   **Tabla:** `public.testimonials`.
*   **Permisos:**
    *   `COACH`: Insertar propios, Ver propios.
    *   `RRSS` / `ADMIN`: Ver todos, Editar todos.
*   **Campos Clave:** `media_url` (texto libre para link externo).

---

## ❓ FAQ

**P: ¿El cliente tiene que firmar algo para salir en redes?**
R: **SÍ**. En el contrato de Onboarding (Manual 2) hay una cláusula de cesión de derechos de imagen. Si el cliente NO la marcó, **prohibido publicar**.
*   *Acción CM:* Antes de publicar, revisar la ficha del cliente > Pestaña Info > "Consentimiento Imagen: SÍ/NO".
