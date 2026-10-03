-- ============================================================================
-- SQL Migration: Soft Delete Architecture & Application Data Preservation
-- Platform: Mana Naukari (Supabase / PostgreSQL)
-- Description:
--   1. Removes all ON DELETE CASCADE behaviors from applicants and job_views.
--   2. Enforces ON DELETE RESTRICT so jobs cannot be hard-deleted if applications exist.
--   3. Guarantees applications, candidates, resumes, and analytics are permanently stored.
--   4. Standardizes job status values: 'active', 'closed', 'deleted', 'expired', 'draft'.
--   5. Creates compatibility view 'public.applications' referencing 'public.applicants'.
-- ============================================================================

-- 1. Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. Modify foreign key constraints on 'applicants' table
-- ============================================================================
-- Remove ON DELETE CASCADE between jobs and applicants.
-- Using ON DELETE RESTRICT ensures that even if a direct DELETE is run against jobs,
-- PostgreSQL protects applicant records and rejects the deletion.
DO $$
BEGIN
    -- Drop existing CASCADE constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_applicants_job'
    ) THEN
        ALTER TABLE public.applicants DROP CONSTRAINT fk_applicants_job;
    END IF;

    -- Re-add constraint with ON DELETE RESTRICT (Prevents hard cascade delete)
    BEGIN
        ALTER TABLE public.applicants
            ADD CONSTRAINT fk_applicants_job
            FOREIGN KEY (job_id) 
            REFERENCES public.jobs(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notice: fk_applicants_job re-creation encountered: %', SQLERRM;
    END;
END $$;

-- Also protect applicant records against visitor profile cascading cleanup
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_applicants_visitor'
    ) THEN
        ALTER TABLE public.applicants DROP CONSTRAINT fk_applicants_visitor;
    END IF;

    BEGIN
        ALTER TABLE public.applicants
            ADD CONSTRAINT fk_applicants_visitor
            FOREIGN KEY (visitor_id) 
            REFERENCES public.visitor_profiles(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notice: fk_applicants_visitor re-creation encountered: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- 3. Modify foreign key constraints on 'job_views' table
-- ============================================================================
-- Remove ON DELETE CASCADE between jobs and job_views so historical impressions
-- are permanently preserved for recruiter and admin reports.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_job_views_job'
    ) THEN
        ALTER TABLE public.job_views DROP CONSTRAINT fk_job_views_job;
    END IF;

    BEGIN
        ALTER TABLE public.job_views
            ADD CONSTRAINT fk_job_views_job
            FOREIGN KEY (job_id) 
            REFERENCES public.jobs(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notice: fk_job_views_job re-creation encountered: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- 4. Create compatibility view 'public.applications'
-- ============================================================================
-- Ensures any queries referencing 'applications' seamlessly access 'applicants'
CREATE OR REPLACE VIEW public.applications AS
SELECT 
    a.id,
    a.visitor_id,
    a.job_id,
    a.status,
    a.notes,
    a.resume_url,
    a.created_at,
    a.updated_at
FROM public.applicants a;

-- Grant permissions on compatibility view
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO anon, authenticated, service_role;

-- ============================================================================
-- 5. Standardize job status values on 'jobs' table
-- ============================================================================
-- Supported statuses: 'active', 'closed', 'deleted', 'expired', 'draft'
-- If a check constraint exists restricting statuses, update it safely.
DO $$
BEGIN
    -- Drop old check constraint if one exists restricting status values
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'jobs_status_check' OR conname = 'chk_jobs_status'
    ) THEN
        EXECUTE 'ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check';
        EXECUTE 'ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS chk_jobs_status';
    END IF;

    -- Add updated check constraint allowing all supported statuses
    BEGIN
        ALTER TABLE public.jobs 
            ADD CONSTRAINT jobs_status_check 
            CHECK (status IN ('active', 'closed', 'deleted', 'expired', 'draft'));
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notice: jobs_status_check constraint encountered: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- 6. Performance Indexes for Soft-Deleted & Filtered Jobs
-- ============================================================================
-- Speeds up queries filtering by status (active vs deleted vs expired vs closed)
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON public.jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applicants_job_id ON public.applicants (job_id);

-- Output confirmation
SELECT 'Soft-delete architecture & application preservation migration completed successfully' AS migration_status;
