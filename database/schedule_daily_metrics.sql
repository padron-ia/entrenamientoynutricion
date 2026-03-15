-- ============================================================
-- AUTOMATIZACIÓN DE MÉTRICAS DIARIAS (Auto-Save)
-- ============================================================

-- 1. Habilitar la extensión de cron (programador de tareas)
-- Esto permite que Supabase ejecute tareas automáticamente.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Programar la tarea
-- Nombre: 'snapshot-daily-metrics'
-- Hora: 55 23 * * *  (Significa: A las 23:55, todos los días)
-- Acción: Ejecutar nuestra función snapshot_daily_metrics()

SELECT cron.schedule(
  'snapshot-daily-metrics',           -- Nombre único de la tarea
  '55 23 * * *',                      -- Cron expression (Minuto 55, Hora 23)
  $$SELECT snapshot_daily_metrics();$$ -- Comando SQL a ejecutar
);


-- ============================================================
-- ÚTILES PARA VERIFICAR
-- ============================================================

-- Ver tareas programadas:
-- SELECT * FROM cron.job;

-- Ver historial de ejecuciones (para ver si funcionó ayer):
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC;

-- Si alguna vez quieres detenerlo:
-- SELECT cron.unschedule('snapshot-daily-metrics');
