-- Drop table if exists to ensure clean slate
DROP TABLE IF EXISTS client_materials CASCADE;

-- Create client_materials table
-- Note: Assuming clientes_pt_notion.id is UUID. If it is TEXT, this might fail with type mismatch.
-- If that happens, change client_id to TEXT.
CREATE TABLE client_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clientes_pt_notion(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('link', 'document', 'video')),
    url TEXT NOT NULL,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE client_materials ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Staff can view all materials
CREATE POLICY "Staff can view all materials" ON client_materials
    FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT id::text FROM users 
            WHERE role IN ('admin', 'super_admin', 'coach', 'head_coach', 'dietitian', 'doctor')
        )
    );

-- 2. Staff can insert/update/delete materials
CREATE POLICY "Staff can manage materials" ON client_materials
    FOR ALL
    USING (
        auth.uid()::text IN (
            SELECT id::text FROM users 
            WHERE role IN ('admin', 'super_admin', 'coach', 'head_coach', 'dietitian', 'doctor')
        )
    );

-- 3. Clients can view their own PUBLIC materials
CREATE POLICY "Clients can view own public materials" ON client_materials
    FOR SELECT
    USING (
        auth.uid()::text = client_id::text
        AND is_public = true
    );

-- Storage bucket creation (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-materials', 'client-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- 1. Staff can do everything in client-materials
DROP POLICY IF EXISTS "Staff Full Access client-materials" ON storage.objects;
CREATE POLICY "Staff Full Access client-materials"
ON storage.objects FOR ALL
USING ( 
    bucket_id = 'client-materials' 
    AND auth.uid()::text IN (
        SELECT id::text FROM users 
        WHERE role IN ('admin', 'super_admin', 'coach', 'head_coach', 'dietitian', 'doctor')
    ) 
)
WITH CHECK ( 
    bucket_id = 'client-materials' 
    AND auth.uid()::text IN (
        SELECT id::text FROM users 
        WHERE role IN ('admin', 'super_admin', 'coach', 'head_coach', 'dietitian', 'doctor')
    ) 
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_client_materials_updated_at ON client_materials;
CREATE TRIGGER update_client_materials_updated_at
    BEFORE UPDATE ON client_materials
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
