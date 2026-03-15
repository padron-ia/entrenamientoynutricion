-- =====================================================
-- Agregar permiso MANAGE_MEDICAL al rol COACH y HEAD_COACH
-- =====================================================
-- Este script agrega el permiso para que los coaches puedan
-- editar datos médicos de sus clientes (tipo diabetes, insulina, etc.)

-- Agregar para COACH
INSERT INTO role_permissions_registry (role, permission, enabled)
VALUES ('coach', 'manage:medical', true)
ON CONFLICT (role, permission)
DO UPDATE SET enabled = true;

-- Agregar para HEAD_COACH
INSERT INTO role_permissions_registry (role, permission, enabled)
VALUES ('head_coach', 'manage:medical', true)
ON CONFLICT (role, permission)
DO UPDATE SET enabled = true;

-- Verificar que se agregaron correctamente
SELECT role, permission, enabled
FROM role_permissions_registry
WHERE permission = 'manage:medical'
ORDER BY role;
