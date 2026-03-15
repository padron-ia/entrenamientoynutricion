ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS coach_notification_seen BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sales_coach_notification ON public.sales(assigned_coach_id) WHERE coach_notification_seen = false;
