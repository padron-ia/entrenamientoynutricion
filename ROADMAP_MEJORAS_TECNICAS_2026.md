# 🚀 9. Informe Estratégico de Mejoras (Roadmap 2026)

**Objetivo:** Transformar el CRM de un "MVP Operativo" a un "Producto Real y Escalable".
**Estado Actual:** El sistema gestiona perfectamente la post-venta (Onboarding, Coaching, Renovaciones).
**El Gran Hueco:** Falta la **Pre-Venta** (Leads) y la **Comunicación Fluida** (Chat Interno).

---

## 🏗️ 1. Módulo de Leads (Pre-Venta)
*El dinero está en el seguimiento.*

Actualmente, el CRM empieza cuando alguien *ya ha pagado*. Necesitamos gestionar a los interesados **antes**.

### Propuesta: "CRM dentro del CRM"
*   **Estado:** ✅ COMPLETADO (Enero 2026).
*   **Implementación:** Tablero Kanban, base de datos de leads y conversión fluida a cliente.

---

## 💬 2. Capa Social y Comunicación (Connectivity)

Has mencionado revisar la "interactividad staff-staff".
**Auditoría Actual:**
*   ✅ **Tickets:** `SupportTicketsView.tsx` ya tiene **Realtime** funcional. Los mensajes llegan al instante.
*   **Capacidad Supabase:**
    *   **Texto:** Extremadamente ligero (1 millón de mensajes < 1GB). La capa gratuita de Supabase (500MB) aguanta miles de mensajes de texto puro.
    *   **Multimedia:** Audios/Fotos deben ir al Storage Bucket, no a la Base de Datos.
    *   **Política Limpieza:** Se programará un "Cron Job" para borrar mensajes > 12 meses automáticamente.

### FASE 2: CAPA SOCIAL Y COMUNICACIÓN (Feb - Mar 2026) 🚀
- [x] **PT CHAT**: Sistema de mensajería interna (Staff ↔ Staff y Staff ↔ Cliente).
    - Soporte para adjuntos multimedia (audios/fotos vía Bucket Storage).
    - Notificaciones en tiempo real y menciones (@Victor).
*   **Chat Directo:** 1 a 1 (Coach <-> Head Coach).
*   **Salas Grupales:** `Sala Coaches`, `Sala Médica`.
*   **Menciones:** `@Victor` en una nota de un cliente para avisarte de algo urgente.

---

## 🏗️ 3. Portal de Ventas (Sales Deck)

**Nueva Idea:** Una "Landing Page Privada" (`/descubre-ado`) para que los Closers la usen en llamadas.
*   **Objetivo:** Matar objeciones mostrando el producto "por dentro" sin dar acceso real.
*   **Contenido:**
    *   Grid de Profesionales (Fotos + Bios).
    *   Casos de Éxito (Testimonios del Módulo 8).
    *   Explicación Visual del Método (Seguimiento, App, Chat).
    *   **Botón de Login/Registro:** Unifica la entrada para Staff y Clientes.

---

## ⚙️ 4. Capa de Configuración (CMS)

**Requisito:** "Que el dueño pueda elegir qué información se muestra".
*   Evitar "hardcode".
*   Crear una tabla `site_settings` o `cms_content`.
*   Panel de Admin para editar textos de la Landing, fotos del equipo y testimonios destacados.

---

## 🛠️ 5. Mejoras de Producto (UX y "Calidad de Vida")



Para que el sistema se sienta "Real" y profesional:

1.  **Centro de Ayuda (Wiki):**
    *   Como vimos en el Manual 8, el staff no tiene dónde consultar dudas. Crear una sección `/wiki` con los PDF de protocolos.
2.  **Alta de Staff Visual:**
    *   ✅ COMPLETADO (Enero 2026). Panel `/staff-management` integrado.
3.  **Loom Nativo:**
    *   Pendiente de integración SDK.

---

## 📊 6. Analytics y Business Intelligence (Perfil del Cliente)

**Estado Actual:** ✅ Panel básico implementado (Enero 2026) con distribución por sexo, edad, provincia, insulina, duración de contrato y estado.

### Mejoras Pendientes (Alta Prioridad):

#### 6.1 Filtros Interactivos Cruzados
- [ ] Filtrar por rango de fechas (clientes de 2024, últimos 6 meses, etc.)
- [ ] Combinar filtros: "Mujeres + Madrid + Usa insulina + Contrato 6 meses"
- [ ] Guardar filtros favoritos para acceso rápido

#### 6.2 Análisis de Retención y Renovación
- [ ] **Tasa de renovación por segmento** (¿qué perfil renueva más?)
- [ ] **Churn rate** por provincia, edad, sexo
- [ ] **Lifetime Value (LTV)** promedio por segmento
- [ ] Predicción de renovación basada en características del cliente

#### 6.3 Correlaciones Útiles para Marketing
- [ ] ¿Los usuarios de insulina renuevan más o menos?
- [ ] ¿Hay relación entre provincia y duración del contrato elegido?
- [ ] ¿Qué segmentos generan más testimonios?
- [ ] Perfil típico del cliente que abandona vs. el que renueva

#### 6.4 Métricas de Adquisición
- [ ] Origen del cliente (webinar, redes sociales, referido)
- [ ] Coste de adquisición (CAC) por segmento
- [ ] Mejor canal por tipo de cliente
- [ ] ROI por campaña de marketing

#### 6.5 Exportación y Reportes
- [ ] Exportar a CSV/Excel para análisis externo
- [ ] Generar PDF para presentaciones
- [ ] Comparativas mes a mes (evolución temporal)
- [ ] Dashboard ejecutivo con KPIs clave

#### 6.6 Datos Médicos Completos
- [ ] Tipo de diabetes (1, 2, prediabetes, gestacional)
- [ ] Comorbilidades (hipertensión, tiroides, colesterol, etc.)
- [ ] Medicación actual
- [ ] Evolución de métricas de salud (HbA1c, peso, etc.)

**Prioridad Recomendada:** Empezar por **Filtros Interactivos** + **Análisis de Renovación** para impacto inmediato en decisiones de marketing y retención.

---

## 🗺️ Mapa de Ruta Recomendado (Ejecución)

Si quieres "Lanzar esto bien", este es el orden lógico de desarrollo:

1.  **Fase 1: Pre-Venta (Leads).** ✅ COMPLETADA.
2.  **Fase 2: Social.**  SIGUIENTE OBJETIVO (PT Chat).
3.  **Fase 3: Refinamiento.** ✅ Invite System OK.  Loom SDK Pendiente.

¿Validamos este Roadmap? Si me das luz verde, empiezo con la **Fase 1: Estructura de Leads**.
