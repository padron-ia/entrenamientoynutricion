# Estudio de Esquema: Cuidarte + CRM ADO -> Padron Trainer

## Alcance y criterio

- Se realizo un estudio tecnico con artefactos locales del repo (SQL de `database/`, migraciones y scripts).
- No se encontro dump externo completo de Cuidarte ni de CRM ADO en este workspace.
- Para avanzar sin bloqueo, se definio una estrategia **superset**: conservar el core actual de Padron Trainer y agregar compatibilidad para estructuras legacy.

## Evidencia usada para identificar los dos origenes

- **Padron Trainer actual (target)**
  - `database/SETUP_PADRON_TRAINER.sql`
  - `database/migrations/*.sql`
  - `CLAUDE.md`
- **CRM ADO (legacy comercial/operativo)**
  - `database/SETUP_COMPLETO.sql` (marca "CRM Coaching Pro", roles antiguos)
  - scripts con ref Supabase `zugtswtpoohnpycnjwrp` en `scripts/*.cjs|*.js`
  - migracion `database/migrations/20260129_fix_daily_metrics_for_clientes_ado.sql`
- **Cuidarte (legacy medico/checkins)**
  - `database/create_portal_completo.sql`
  - `database/create_tables_only.sql`
  - tablas historicas: `glucose_readings`, `hba1c_history`, `daily_checkins`, etc.

## Diferencias estructurales detectadas (alto impacto)

- **Tabla maestra de clientes**: convergencia en `public.clientes_pt_notion`.
- **Nombres legacy esperados por scripts**: aparecen referencias a `clients` y `clientes_ado` en SQL/scripts historicos.
- **Estados de cliente**: coexistencia de formatos (`Active/Pausado/Baja/...` y `active/paused/inactive/dropout`).
- **Modulos medicos legacy**: existen en historico, pero el target Padron Trainer elimina flujo endocrino como modulo de producto.
- **RLS**: hay politicas en multiples etapas; se recomienda no sobreescribir sin necesidad en una migracion de compatibilidad.

## Tablas core que deben existir en el superset

- `clientes_pt_notion` (maestra)
- `users`
- `sales`
- `weekly_checkins`
- `coaching_sessions`
- `weight_history`
- `glucose_readings`
- `hba1c_history`
- `body_measurements`
- `daily_checkins`
- `daily_metrics`

## Estrategia aplicada

- Crear migracion idempotente que:
  - complete columnas de compatibilidad en `clientes_pt_notion`;
  - garantice tablas legacy de seguimiento (si faltan);
  - cree vistas de compatibilidad `clients` y `clientes_ado` apuntando a `clientes_pt_notion`;
  - normalice estatus a formato canonico de Padron Trainer (`active|paused|inactive|dropout|pending|completed`).

## Entregable SQL

- `database/migrations/20260318_unify_cuidarte_crm_ado_core.sql`

## Validaciones recomendadas (post-migracion)

- Confirmar existencia de vistas y tablas:
  - `SELECT to_regclass('public.clients'), to_regclass('public.clientes_ado');`
  - `SELECT to_regclass('public.weight_history'), to_regclass('public.daily_metrics');`
- Validar estatus normalizados:
  - `SELECT status, COUNT(*) FROM public.clientes_pt_notion GROUP BY 1 ORDER BY 2 DESC;`
- Revisar compatibilidad de scripts antiguos que consultan `clients`/`clientes_ado`.

## Pendiente para cierre definitivo

- Cuando tengas dumps reales de Cuidarte y CRM ADO, comparar diff DDL contra esta baseline y generar una migracion incremental final (fase 2) solo con gaps reales.
