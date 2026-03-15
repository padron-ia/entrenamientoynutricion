-- Add social media metrics to testimonials table
ALTER TABLE testimonials 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;

-- Update existing records
UPDATE testimonials SET 
  likes_count = 0, 
  views_count = 0, 
  comments_count = 0, 
  shares_count = 0 
WHERE likes_count IS NULL;
