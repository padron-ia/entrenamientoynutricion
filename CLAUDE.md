# Instrucciones Técnicas para Claude — Padron Trainer CRM

---

## Proyecto

**Nombre**: Padron Trainer CRM
**Admin principal**: padrontrainer@gmail.com
**Stack**: React 19 + TypeScript + Vite + Tailwind CSS + Supabase

---

## Base de Datos

### Supabase
- **URL**: `https://tfhmeoiryhuivdnpwpjs.supabase.co`
- **Tabla principal de clientes**: `clientes_pt_notion` (heredada, puede renombrarse en el futuro)

### Campos Importantes
| Campo BD | Campo App | Descripción |
|----------|-----------|-------------|
| `property_coach` | `coach_id` | Coach asignado (puede ser NOMBRE o UUID) |
| `property_nombre` | `firstName` | Nombre del cliente |
| `property_correo_electr_nico` | `email` | Email del cliente |
| `status` | `status` | Estado: active, paused, inactive, dropout |

---

## Roles Disponibles

| Rol | Vista por defecto | Permisos |
|-----|-------------------|----------|
| admin | ExecutiveDashboard | Todo |
| head_coach | ExecutiveDashboard | Todo |
| coach | Dashboard | Solo sus clientes |
| closer | CloserDashboard | Ventas |
| setter | Dashboard | Leads |
| contabilidad | AccountingDashboard | Facturación |
| rrss | RRSSDashboard | Redes sociales |
| direccion | AdminAnalytics | Dirección |
| client | ClientPortal | Solo su ficha |

> **IMPORTANTE**: Los roles `endocrino`, `psicologo`, `doctor` y `dietitian` han sido eliminados.
> Este CRM es para entrenamiento y composición corporal — NO gestión médica/endocrina.

---

## Filtrado de Coaches

El campo `property_coach` puede contener nombre o UUID del coach.

```typescript
.or(`property_coach.ilike.%${firstName}%,property_coach.ilike.%${emailPrefix}%,property_coach.eq.${coachName},property_coach.eq.${coachId}`)
```

---

## Revisiones Semanales (Check-ins)

- **Viernes a Domingo**: Alumnos envían check-in
- **Lunes a Martes**: Coaches revisan
- Estados: `sin enviar` | `pendientes de revisión` | `revisados`

---

## Persistencia de Sesión

- **Storage**: `localStorage` con clave `pt_crm_session`
- **Duración**: 30 días

---

## Estructura de Archivos Clave

```
App.tsx                        # Componente principal, routing, estado global
services/
  mockSupabase.ts              # Capa de abstracción de BD, mapeo de datos
  supabaseClient.ts            # Conexión Supabase (credenciales PT)
  pauseService.ts              # Lógica de pausas
components/
  Dashboard.tsx                # Dashboard coach
  ExecutiveDashboard.tsx       # Dashboard admin/head_coach
  ClientList.tsx               # Lista de alumnos
  ReviewsView.tsx              # Panel de revisiones semanales
  client-portal/               # Portal del alumno
```

---

## Módulos ELIMINADOS (no restaurar)

- `EndocrinoDashboard` — dashboard endocrinólogo
- `EndocrinoDashboardHome` — home endocrino
- `EndocrinoMedicalReports` — informes médicos
- `EndocrinoInvoices` — facturas endocrino
- `CreateMedicalReport` — generador informes clínicos
- `CycleTrackingView` — seguimiento ciclo menstrual
- `GlucoseCard` — registro glucosa
- Pasos anamnesis: `CardiovascularDiabeticStep`, `FullTreatmentStep`, `MenopausalHistoryStep`

---

## Módulos AÑADIDOS (Padron Trainer)

- `FitnessHistoryStep` en anamnesis (historial deportivo, lesiones crónicas, frecuencia)
- Tipos de dieta: Definición, Volumen, Mantenimiento, Recomposición Corporal

---

## Despliegue

Por ahora: desarrollo local con `npm run dev`.
Futura integración con GitHub + EasyPanel o Vercel.

---

*Última actualización: Marzo 2026 — Padron Trainer v1.0*
