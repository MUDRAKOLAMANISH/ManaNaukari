-- ============================================================================
-- SQL Migration: Add is_featured column to jobs table
-- Platform: Mana Naukari (Supabase / PostgreSQL)
-- Description:
--   1. Adds is_featured column with DEFAULT FALSE
--   2. Synchronizes data with existing featured column
--   3. Creates composite index for high-speed top ticker queries
-- ============================================================================

-- 1. Add is_featured column
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- 2. Synchronize existing records
UPDATE public.jobs 
SET is_featured = COALESCE(featured, FALSE) 
WHERE is_featured IS NULL;

-- 3. Composite Index for high-performance priority ticker queries
CREATE INDEX IF NOT EXISTS idx_jobs_is_featured_status 
ON public.jobs (is_featured DESC, status, created_at DESC);
