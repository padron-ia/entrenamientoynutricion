-- =====================================================
-- FIX: Permitir que coaches vean todos los testimonios
-- =====================================================

-- Verificar si la tabla tiene RLS habilitado
-- Si da error, la tabla no existe o no tiene RLS

-- Eliminar política restrictiva si existe
DROP POLICY IF EXISTS "Coaches solo ven sus testimonios" ON testimonials;
DROP POLICY IF EXISTS "coaches_own_testimonials" ON testimonials;

-- Crear política que permite a todo el staff ver todos los testimonios
CREATE POLICY "Staff puede ver todos los testimonios" ON testimonials
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'head_coach', 'coach', 'rrss', 'direccion')
        )
    );

-- Política para insertar (solo staff)
DROP POLICY IF EXISTS "Staff puede crear testimonios" ON testimonials;
CREATE POLICY "Staff puede crear testimonios" ON testimonials
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'head_coach', 'coach', 'rrss', 'direccion')
        )
    );

-- Política para actualizar (solo staff)
DROP POLICY IF EXISTS "Staff puede actualizar testimonios" ON testimonials;
CREATE POLICY "Staff puede actualizar testimonios" ON testimonials
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'head_coach', 'coach', 'rrss', 'direccion')
        )
    );

-- Política para eliminar (solo admin y rrss)
DROP POLICY IF EXISTS "Admin y RRSS pueden eliminar testimonios" ON testimonials;
CREATE POLICY "Admin y RRSS pueden eliminar testimonios" ON testimonials
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'rrss')
        )
    );
