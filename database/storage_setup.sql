
-- ==========================================
-- CONFIGURACIÓN DE STORAGE Y POLÍTICAS RLS
-- ==========================================

-- 1. Crear los buckets necesarios (Si no existen)
-- Nota: Esto puede requerir permisos de superusuario. Si falla, créalos manualmente en el panel de Supabase.
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('receipts', 'receipts', true),
  ('contracts', 'contracts', true),
  ('invoices', 'invoices', true),
  ('medical-reports', 'medical-reports', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2. Habilitar RLS en storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS PARA 'receipts' (Comprobantes de Pago)
-- Lectura: Staff puede ver todos. Clientes pueden ver los suyos.
CREATE POLICY "Staff can view all receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (unit_get_auth_role() IN ('admin', 'coach', 'closer', 'contabilidad')));

CREATE POLICY "Clients can view own receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Inserción: Staff y Clientes pueden subir.
CREATE POLICY "Anyone authenticated can upload receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts');

-- 4. POLÍTICAS PARA 'contracts' (Contratos Firmados)
-- Solo Admin y el propio Cliente pueden ver contratos.
CREATE POLICY "Admin can view all contracts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contracts' AND (unit_get_auth_role() = 'admin'));

CREATE POLICY "Clients can view own contracts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contracts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. POLÍTICAS PARA 'invoices' (Facturas de Colaboradores)
-- Staff puede subir la suya. Admin y Contabilidad pueden ver todas.
CREATE POLICY "Admin/Accounting can view all invoices" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'invoices' AND (unit_get_auth_role() IN ('admin', 'contabilidad')));

CREATE POLICY "Staff can view/upload own invoices" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'invoices' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 6. POLÍTICAS PARA 'medical-reports' (Informes Médicos)
-- Solo Admin, Endocrino y el propio Cliente.
CREATE POLICY "Medical staff and owners can view reports" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'medical-reports' AND (
    unit_get_auth_role() IN ('admin', 'endocrino') OR 
    (storage.foldername(name))[1] = auth.uid()::text
  ));

CREATE POLICY "Clients can upload medical reports" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'medical-reports');

-- 7. FUNCIÓN AUXILIAR (Si no existe en el scope de storage)
-- Aseguramos que unit_get_auth_role() sea accesible o usamos una alternativa
CREATE OR REPLACE FUNCTION storage.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER;
