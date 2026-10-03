-- ============================================================================
-- SQL Migration: Candidate Profile System & Duplicate Application Prevention
-- Platform: Mana Naukari (Supabase / PostgreSQL)
-- Description:
--   1. Creates candidate_profiles table for persistent user recognition.
--   2. Adds candidate_profile_id and applied_at to applicants table.
--   3. Adds UNIQUE constraint (job_id, candidate_profile_id) to prevent duplicate applications.
-- ============================================================================

-- 1. Create table: candidate_profiles
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    resume_url TEXT,
    resume_file_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Unique index on lowercase email for case-insensitive lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_profiles_email_unique 
    ON public.candidate_profiles(LOWER(TRIM(email)));

-- Lookup index on mobile number for alternative profile detection
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_mobile 
    ON public.candidate_profiles(mobile);

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_created_at 
    ON public.candidate_profiles(created_at DESC);

-- 2. Enhance applicants table to reference candidate_profiles
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS candidate_profile_id UUID 
    REFERENCES public.candidate_profiles(id) 
    ON UPDATE CASCADE 
    ON DELETE RESTRICT;

ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE 
    DEFAULT timezone('utc'::text, now());

ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS resume_file_name VARCHAR(255);

-- 3. Application Deduplication Constraint:
-- Prevent the same candidate from applying twice to the same job.
CREATE UNIQUE INDEX IF NOT EXISTS idx_applicants_job_candidate_unique 
    ON public.applicants(job_id, candidate_profile_id);

-- Also add index for fast candidate history queries in admin panel
CREATE INDEX IF NOT EXISTS idx_applicants_candidate_profile_id 
    ON public.applicants(candidate_profile_id);

-- 4. Supabase Row Level Security (RLS) Policies
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

-- Candidates can search and read their profile
CREATE POLICY "Allow public select on candidate_profiles"
    ON public.candidate_profiles FOR SELECT
    USING (true);

-- Candidates can create their profile on first application
CREATE POLICY "Allow public insert on candidate_profiles"
    ON public.candidate_profiles FOR INSERT
    WITH CHECK (true);

-- Candidates can update their profile / resume
CREATE POLICY "Allow public update on candidate_profiles"
    ON public.candidate_profiles FOR UPDATE
    USING (true);

-- Admin / service role full access
CREATE POLICY "Allow admin full access on candidate_profiles"
    ON public.candidate_profiles FOR ALL
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
