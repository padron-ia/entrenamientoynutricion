-- Add extended personal fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Re-run previous additions just in case
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS specialty TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS calendar_url TEXT;

-- Create Storage Bucket for Team Photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('team-photos', 'team-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read of team photos
CREATE POLICY "Public Access Team Photos" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'team-photos' );

-- Policy to allow authenticated upload
CREATE POLICY "Authenticated Upload Team Photos" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'team-photos' AND auth.role() = 'authenticated' );
