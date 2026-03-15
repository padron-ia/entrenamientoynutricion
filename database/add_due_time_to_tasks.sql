-- Add due_time column to coach_tasks table
ALTER TABLE public.coach_tasks ADD COLUMN IF NOT EXISTS due_time TEXT;

-- Refresh PostgREST schema cache (optional, usually automatic but good for troubleshooting)
NOTIFY pgrst, 'reload schema';
