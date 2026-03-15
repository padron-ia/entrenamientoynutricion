-- Enable the storage extension if not already enabled (usually enabled by default in Supabase)
-- CREATE EXTENSION IF NOT EXISTS "storage";

-- Create the 'documents' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public/anon users to upload files (Required if using Mock Auth with Real Storage)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;

CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'documents');

-- Policy to allow anyone to view files (since it's public)
DROP POLICY IF EXISTS "Allow public viewing" ON storage.objects;
CREATE POLICY "Allow public viewing"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Policy to allow users to update their own files (optional, but good practice)
DROP POLICY IF EXISTS "Allow individual updates" ON storage.objects;
CREATE POLICY "Allow individual updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');
