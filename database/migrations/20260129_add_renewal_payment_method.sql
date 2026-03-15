-- Añadir campo para método de pago de renovación
-- Permite al coach especificar si el pago fue por Hotmart, Stripe o Transferencia
-- para calcular correctamente los fees de plataforma y comisiones

ALTER TABLE clientes_pt_notion
ADD COLUMN IF NOT EXISTS renewal_payment_method TEXT;

COMMENT ON COLUMN clientes_pt_notion.renewal_payment_method IS 'Método de pago de renovación: hotmart, stripe, transferencia';

-- Asegurar que los payment_methods tienen los fees correctos según lo especificado
-- Hotmart: 6.4%, Stripe: 4%, Transferencia: 0%

UPDATE payment_methods SET platform_fee_percentage = 6.40 WHERE LOWER(name) LIKE '%hotmart%';
UPDATE payment_methods SET platform_fee_percentage = 4.00 WHERE LOWER(name) LIKE '%stripe%';
UPDATE payment_methods SET platform_fee_percentage = 0.00 WHERE LOWER(name) LIKE '%transferencia%';

-- Insertar métodos si no existen
INSERT INTO payment_methods (name, platform_fee_percentage)
SELECT 'Hotmart', 6.40
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE LOWER(name) LIKE '%hotmart%');

INSERT INTO payment_methods (name, platform_fee_percentage)
SELECT 'Stripe', 4.00
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE LOWER(name) LIKE '%stripe%');

INSERT INTO payment_methods (name, platform_fee_percentage)
SELECT 'Transferencia Bancaria', 0.00
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE LOWER(name) LIKE '%transferencia%');
