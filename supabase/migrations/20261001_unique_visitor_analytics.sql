-- =========================================================================
-- Migration: Add unique constraint on (visitor_id, visit_date)
-- Enforces: Count one device as one visitor per day; no duplicates on refresh.
-- =========================================================================

-- 1. Ensure visit_date column exists
ALTER TABLE public.visitor_analytics 
ADD COLUMN IF NOT EXISTS visit_date DATE DEFAULT CURRENT_DATE;

-- 2. Backfill existing rows using visited_at::date
UPDATE public.visitor_analytics 
SET visit_date = (visited_at::date) 
WHERE visit_date IS NULL;

-- 3. Remove older duplicate rows for same visitor on same date before creating unique constraint
DELETE FROM public.visitor_analytics a
USING public.visitor_analytics b
WHERE a.id > b.id
  AND a.visitor_id = b.visitor_id
  AND (a.visit_date = b.visit_date OR a.visited_at::date = b.visited_at::date);

-- 4. Create unique constraint to prevent duplicate counts per day
ALTER TABLE public.visitor_analytics 
DROP CONSTRAINT IF EXISTS unique_visitor_per_day;

ALTER TABLE public.visitor_analytics 
ADD CONSTRAINT unique_visitor_per_day UNIQUE (visitor_id, visit_date);

-- 5. Indexes for fast aggregation
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_visit_date ON public.visitor_analytics (visit_date);
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_visitor_id ON public.visitor_analytics (visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_visited_at ON public.visitor_analytics (visited_at);
