-- ============================================================================
-- SQL Migration: Add Availability Monitoring columns to jobs table
-- Platform: Mana Naukari (Supabase / PostgreSQL)
-- Description:
--   Adds review_reason and review_date columns to support automated job health checks,
--   and safely updates the status check constraint to include 'needs_review'.
-- ============================================================================

-- 1. Add review_reason column
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS review_reason TEXT;

-- 2. Add review_date column
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS review_date TIMESTAMP WITH TIME ZONE;

-- 3. Safely update status check constraint to include 'needs_review'
DO $$
BEGIN
    -- Drop old check constraints if they exist
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'jobs_status_check' OR conname = 'chk_jobs_status'
    ) THEN
        ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
        ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS chk_jobs_status;
    END IF;

    -- Add updated check constraint allowing 'needs_review'
    ALTER TABLE public.jobs 
        ADD CONSTRAINT jobs_status_check 
        CHECK (status IN ('active', 'closed', 'deleted', 'expired', 'draft', 'needs_review'));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Notice: jobs_status_check constraint encountered: %', SQLERRM;
END $$;
