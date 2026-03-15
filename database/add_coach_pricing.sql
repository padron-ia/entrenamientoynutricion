
-- AÑADIR TARIFA POR CLIENTE AL PERFIL DEL USUARIO
-- Permite al Admin fijar cuánto cobra el coach por cada cliente (ej: cuota fija)

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS price_per_client DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN public.users.price_per_client IS 'Tarifa fija que cobra el coach por cada cliente activo (si aplica)';
