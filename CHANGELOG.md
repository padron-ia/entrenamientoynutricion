# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [3.6.0] - 2026-02-02

### 🎉 Añadido (IA & Automatización)
- **Arquitecto de Nutrición IA**: Generación directa de planes nutricionales de 7 días (28 recetas) usando Gemini 1.5 Pro.
- **Importador Inteligente**: Análisis de texto para convertir dietas externas en datos estructurados dentro del CRM.
- **Inserción Masiva (Batch)**: Optimizada la velocidad de guardado de planes grandes para evitar timeouts.
- **Vista Previa de IA**: Interfaz moderna para revisar y ajustar el plan generado antes de guardarlo.

### 🎨 Mejorado
- **Nutrición View**: Mejoras estéticas en la visualización de planes y notas del coach.
- **Exportación A4**: Refinado el CSS de impresión para planes nutricionales.

### 🔧 Corregido
- **Esquema de Base de Datos**: Añadidos campos para el control de check-ins fallidos (`missed_checkins_count`, `last_checkin_missed_reason`).

## [3.5.0] - 2026-01-20

### 🎉 Añadido (Roadmap 2026 - Fase 1 & Mejoras Críticas)
- **Módulo de Leads (Pre-Venta)**: Sistema Kanban para gestión de potenciales alumnos con conversión automática a cliente.
- **Gestión de Staff Visual**: Panel administrativo para invitar colaboradores vía link, eliminando la necesidad de SQL manual.
- **Lógica de Pausa Inteligente**: Registro histórico de pausas con extensión automática y precisa de la fecha de fin de contrato.
- **Login Único Unificado**: Nueva experiencia de acceso con landing premium y detección automática de roles (Staff/Alumno).

### 🎨 Mejorado
- **Interfaz de Navegación**: Sidebar reorganizado con secciones claras de "Operaciones" y "Organización".
- **Ficha de Cliente**: Integración del historial de pausas y motivos de inactividad.

### 🔧 Corregido
- **Cálculo de Finalización**: Corregido error donde las pausas no desplazaban la fecha legal de fin de servicio.

---

## [3.0.0] - 2025-12-18

### 🎉 Añadido (Business Intelligence & Analytics)
- **Métricas de Churn de Alta Precisión**: Motor de cálculo basado en fechas exactas para determinar cohortes de inicio de mes.
- **Vista Global de Negocio**: Soporte para filtrado anual con cálculo automático de promedios de Churn y LTV.
- **Análisis de Distribución de Fases**: Nuevo desglose visual de duraciones de contrato por fase actual (F1-F5).
- **Proyección de Ingresos (Forecast)**: Mejora en la precisión de la proyección a 9 meses basada en fechas de renovación programadas.
- **KPIs Estratégicos**: Sincronización de LTV (Lifetime Value) y AOV (Average Order Value) con filtros temporales.

### 🎨 Mejorado
- **Dashboard de Contabilidad**:
  - Nueva pestaña "Análisis" con cards de BI detalladas.
  - Gráficos de evolución de Churn e Ingresos comparativos.
  - UI interactiva para el desglose de bajas y pausas.

### 🔧 Refactorizado
- **AccountingDashboard.tsx**: Gran refactor de la lógica de negocio para centralizar cálculos en `useMemo`.
- **mockSupabase.ts**: Mapeo extendido para capturar duraciones de renovación y múltiples variantes de campos de fecha.

---

## [2.0.0] - 2025-12-12

### 🎉 Añadido
- **Sistema de Notificaciones Toast**: Implementado sistema completo de notificaciones con 4 tipos (success, error, warning, info)
- **Utilidades Centralizadas**: 
  - `utils/dateHelpers.ts` - 15+ funciones para manejo de fechas
  - `utils/statusHelpers.ts` - Configuración completa de estados
  - `utils/formatters.ts` - 15+ formateadores para datos
- **Componente SearchFilter**: Búsqueda y filtros avanzados con animaciones
- **Variables CSS**: Sistema de variables para gradientes, sombras y transiciones
- **Clases CSS Reutilizables**: btn-primary, btn-success, btn-danger, input-enhanced, etc.
- **Animaciones CSS**: shimmer, pulse-glow, float, slide-in, fade-in, scale-in
- **Scrollbar Premium**: Scrollbar personalizado con gradientes
- **Documentación**: README.md completo y MEJORAS_IMPLEMENTADAS.md

### 🎨 Mejorado
- **Dashboard**: 
  - KPI Cards con gradientes dinámicos
  - Iconos animados con efectos hover
  - Números con gradiente de texto
  - Indicadores de tendencia
  - Alertas visuales mejoradas
  - Header con gradientes y mejor jerarquía
- **App.tsx**: 
  - Refactorizado con ToastProvider
  - Feedback visual en todas las acciones
  - Mejor manejo de errores
- **index.css**: 
  - De 44 líneas a 300+ líneas
  - Sistema completo de diseño
  - Gradientes premium
  - Animaciones GPU-accelerated

### ⚡ Optimizado
- **Dashboard**: Reloj desacoplado de cálculos de métricas
- **Memoización**: Cálculos pesados optimizados con useMemo
- **Animaciones**: Uso de CSS transforms para mejor performance

### 🔧 Refactorizado
- Eliminado código duplicado de formateo de fechas
- Eliminado código duplicado de configuración de estados
- Centralización de helpers y utilidades
- Mejor organización de componentes

### 📝 Documentación
- README.md actualizado con instrucciones completas
- MEJORAS_IMPLEMENTADAS.md con detalles de todas las mejoras
- .env.local.example para fácil configuración
- Comentarios mejorados en código

---

## [1.0.0] - 2025-12-11

### 🎉 Añadido
- Sistema completo de gestión de clientes
- Dashboard con métricas en tiempo real
- Vista de Analytics con gráficos
- Vista de Renovaciones por fases
- Sistema de roles (Admin, Coach, Cliente)
- Gestión de estados (Activo, Pausado, Baja, Abandono)
- Seguimiento médico detallado
- Planes nutricionales
- Programas de entrenamiento
- Mock de Supabase para desarrollo
- Autenticación básica
- Responsive design

### 🎨 Diseño
- Tailwind CSS como framework principal
- Lucide React para iconos
- Recharts para gráficos
- Diseño limpio y profesional

### 🔧 Configuración
- Vite como build tool
- TypeScript para type safety
- ESLint para linting
- Configuración de Netlify

---

## [0.1.0] - 2025-12-05

### 🎉 Añadido
- Proyecto inicial creado con Vite + React + TypeScript
- Configuración básica de Tailwind CSS
- Estructura de carpetas inicial
- Tipos TypeScript básicos

---

## Tipos de Cambios

- `Añadido` para nuevas características
- `Mejorado` para cambios en funcionalidades existentes
- `Obsoleto` para características que serán removidas
- `Eliminado` para características removidas
- `Corregido` para corrección de bugs
- `Seguridad` para vulnerabilidades

---

## Enlaces

- [Unreleased]: Cambios en desarrollo
- [2.0.0]: https://github.com/tu-usuario/academia-diabetes-crm/releases/tag/v2.0.0
- [1.0.0]: https://github.com/tu-usuario/academia-diabetes-crm/releases/tag/v1.0.0
- [0.1.0]: https://github.com/tu-usuario/academia-diabetes-crm/releases/tag/v0.1.0
