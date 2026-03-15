-- Agregar campos de publicación a la tabla testimonials
-- Ejecutar en Supabase SQL Editor

-- Agregar columna is_published (boolean, default false)
ALTER TABLE testimonials
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Agregar columna published_at (timestamp, nullable)
ALTER TABLE testimonials
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NULL;

-- Actualizar testimonios existentes para tener valores por defecto
UPDATE testimonials
SET is_published = false
WHERE is_published IS NULL;

-- Mensaje de confirmación
SELECT 'Columnas is_published y published_at agregadas correctamente a testimonials' as resultado;
