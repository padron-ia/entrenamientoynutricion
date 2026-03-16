-- Optional fallback policy: allow public lead inserts from anon role.
-- Recommended architecture remains Edge Function + service role.

BEGIN;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leads: anon insert public form" ON public.leads;

CREATE POLICY "Leads: anon insert public form"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (
  status = 'NEW'
  AND in_out = 'Inbound'
  AND (
    procedencia = 'Formulario'
    OR procedencia IS NULL
  )
  AND "firstName" IS NOT NULL
  AND "surname" IS NOT NULL
  AND phone IS NOT NULL
  AND char_length(trim("firstName")) > 0
  AND char_length(trim("surname")) > 0
  AND char_length(trim(phone)) > 0
);

COMMIT;
