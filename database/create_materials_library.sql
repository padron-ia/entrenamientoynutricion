-- =====================================================
-- BIBLIOTECA DE MATERIALES GLOBALES
-- =====================================================
-- Materiales compartidos disponibles para todos los clientes
-- A diferencia de client_materials, estos no están vinculados a un cliente específico

CREATE TABLE IF NOT EXISTS materials_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('link', 'document', 'video', 'audio')),
    url TEXT NOT NULL,
    category TEXT DEFAULT 'general', -- nutricion, ejercicio, diabetes, motivacion, etc.
    tags TEXT[], -- Para búsqueda y filtrado
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda
CREATE INDEX IF NOT EXISTS idx_materials_library_category ON materials_library(category);
CREATE INDEX IF NOT EXISTS idx_materials_library_type ON materials_library(type);
CREATE INDEX IF NOT EXISTS idx_materials_library_active ON materials_library(is_active);

-- RLS Policies
ALTER TABLE materials_library ENABLE ROW LEVEL SECURITY;

-- Staff puede ver todos los materiales
CREATE POLICY "Staff puede ver materiales" ON materials_library
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'head_coach', 'coach', 'endocrino', 'direccion', 'dietitian')
        )
    );

-- Staff puede gestionar materiales
CREATE POLICY "Staff puede gestionar materiales" ON materials_library
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'head_coach', 'coach', 'direccion')
        )
    );

-- Clientes pueden ver materiales activos
CREATE POLICY "Clientes ven materiales activos" ON materials_library
    FOR SELECT
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'client'
        )
    );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_materials_library_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER materials_library_updated
    BEFORE UPDATE ON materials_library
    FOR EACH ROW
    EXECUTE FUNCTION update_materials_library_timestamp();

-- Insertar algunas categorías de ejemplo (opcional)
-- INSERT INTO materials_library (title, type, url, category, tags, created_by)
-- VALUES
--     ('Guía de Nutrición Básica', 'document', 'https://...', 'nutricion', ARRAY['nutricion', 'basico'], NULL),
--     ('Video: Cómo medir glucosa', 'video', 'https://...', 'diabetes', ARRAY['glucosa', 'tutorial'], NULL);
