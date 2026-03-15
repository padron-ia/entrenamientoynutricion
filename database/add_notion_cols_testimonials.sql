ALTER TABLE public.testimonials 
ADD COLUMN IF NOT EXISTS notion_page_id TEXT,
ADD COLUMN IF NOT EXISTS notion_status TEXT DEFAULT 'Pending';
