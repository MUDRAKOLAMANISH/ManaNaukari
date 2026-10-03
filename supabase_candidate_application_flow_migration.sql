-- ============================================================================
-- SQL Migration: Candidate Application Deduplication & Reapply System
-- Platform: Mana Naukari (Supabase / PostgreSQL)
-- Description:
--   1. Ensures candidate_profile_id column exists on public.applicants
--   2. Adds last_reapplied_at TIMESTAMP WITH TIME ZONE
--   3. Adds attempt_count INTEGER DEFAULT 1
--   4. Adds application_status VARCHAR(50) DEFAULT 'submitted'
--   5. Creates UNIQUE constraint on (candidate_profile_id, job_id)
-- ============================================================================

-- 1. Ensure candidate_profile_id exists
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS candidate_profile_id UUID;

-- 2. Add last_reapplied_at timestamp column
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS last_reapplied_at TIMESTAMP WITH TIME ZONE;

-- 3. Add attempt_count integer column
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 1;

-- 4. Add application_status column
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS application_status VARCHAR(50) DEFAULT 'submitted';

-- 5. Backfill candidate_profile_id from visitor_id where null
UPDATE public.applicants 
SET candidate_profile_id = visitor_id 
WHERE candidate_profile_id IS NULL AND visitor_id IS NOT NULL;

-- 6. Clean existing duplicates before applying unique constraint
DELETE FROM public.applicants a
WHERE a.id NOT IN (
    SELECT MIN(b.id)
    FROM public.applicants b
    GROUP BY COALESCE(b.candidate_profile_id, b.visitor_id), b.job_id
);

-- 7. Unique constraint guaranteeing one application record per (candidate_profile_id, job_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_applicants_candidate_job'
    ) THEN
        ALTER TABLE public.applicants 
        ADD CONSTRAINT uq_applicants_candidate_job 
        UNIQUE (candidate_profile_id, job_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If constraint with same definition or unique index exists, ignore
        NULL;
END $$;

-- 8. High-speed lookup index for candidate applications
CREATE INDEX IF NOT EXISTS idx_applicants_candidate_job_search
ON public.applicants (candidate_profile_id, job_id, created_at DESC);

-- 9. Add is_featured column to jobs table for Top Job Announcement Ticker
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_jobs_is_featured ON public.jobs (is_featured, created_at DESC);
