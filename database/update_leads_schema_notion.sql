-- Añadir campos necesarios para igualar el CRM con Notion
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS meeting_date DATE,
ADD COLUMN IF NOT EXISTS call_date DATE,
ADD COLUMN IF NOT EXISTS meeting_time TIME,
ADD COLUMN IF NOT EXISTS procedencia TEXT,
ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;

-- Actualizar política de RLS si es necesario (asumimos que ya está permissive para pruebas)
-- Si el ENUM de status necesita ser actualizado, lo hacemos aquí también.
-- Sin embargo, Supabase permite texto para status si no hay constraint.
