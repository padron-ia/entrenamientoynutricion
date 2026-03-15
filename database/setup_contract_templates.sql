-- Table for contract templates
CREATE TABLE IF NOT EXISTS contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT -- Admin/Closer name
);

-- Add contract_template_id to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS contract_template_id UUID REFERENCES contract_templates(id);

-- Insert initial template with current hardcoded text
INSERT INTO contract_templates (name, content, created_by)
VALUES ('Contrato Estándar PT', 'Logo_PT

CONTRATO PRESTACIÓN DE SERVICIOS MÉDICOS ONLINE

En ALMERÍA, a [DIA] de [MES] de [AÑO].

De una parte: Víctor Bravo Matilla, con número de Colegiado 04-0405305, persona física, con DNI: 77235910-R y domicilio social en Calle Universidad de Texas Nº17 Piso 2, Puerta 5 con CP 04005.

Y de otra: [NOMBRE_CLIENTE] con DNI [DNI_CLIENTE] y domicilio en [DOMICILIO_CLIENTE] (en adelante “el cliente”).

INTERVIENEN
Ambas partes, en su propio nombre y derecho, aseguran tener y se reconocen mutuamente plena capacidad legal para contratar y obligarse, en especial para este acto y de común acuerdo,

MANIFIESTAN
I. Que, Víctor Bravo Matilla, presta un servicio denominado “PADRON TRAINER” por el cual ofrece los siguientes servicios:
- Servicio Online de Endocrinología, Nutrición y Entrenamiento de [DURACION_DIAS] días de duración.
- Acceso a App privada (HARBIZ) durante la duración del servicio.
- Soporte de Lunes a Sábado en horario de 12:00-13:00 y de 18:00-19:00 por chat privado de Telegram.
- Acceso a rutina de entrenamiento, nutrición y clases online con control semanal de resultados.

II. Que quedan expresamente excluidos de dicho programa los siguiente servicios: Soporte fuera de plazo, acceso a HARBIZ tras finalizar el periodo o soporte por medios no acordados.

III. Que dicho servicio tiene un coste según lo acordado en la entrevista inicial para la duración de [DURACION_MESES] meses.

IV. Que el cliente manifiesta que conoce y acepta los servicios incluidos y excluidos, los acepta en todas sus condiciones, estando interesado en la realización del mismo.

V. Que las partes firman el presente contrato, comprometiéndose a su estricto cumplimiento sujeto a los siguientes:

TÉRMINOS Y CONDICIONES
PRIMERA - Del objeto del contrato... [Resto del contrato]', 'Admin');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_templates_is_active ON contract_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_contract_template ON sales(contract_template_id);
