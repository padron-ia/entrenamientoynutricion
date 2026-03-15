-- Estructura del bloque de entrenamiento para diferenciar lineal/superserie/circuito

ALTER TABLE IF EXISTS public.training_workout_blocks
ADD COLUMN IF NOT EXISTS structure_type TEXT NOT NULL DEFAULT 'lineal'
CHECK (structure_type IN ('lineal', 'superserie', 'circuito'));

-- Backfill simple: si el bloque ya tiene ejercicios con superset_id, marcar como superserie
UPDATE public.training_workout_blocks b
SET structure_type = 'superserie'
WHERE EXISTS (
  SELECT 1
  FROM public.training_workout_exercises e
  WHERE e.block_id = b.id
    AND e.superset_id IS NOT NULL
)
AND b.structure_type = 'lineal';
