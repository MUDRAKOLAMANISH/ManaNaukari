-- ============================================================================
-- Complete SQL Migration Script: Audit & Upgrade 'recruiters' & 'recruiter_jobs' Tables
-- Platform: Mana Naukari (Supabase / PostgreSQL)
-- Description:
--   Creates or upgrades the public.recruiters and public.recruiter_jobs tables
--   with all required columns, aliases (recruiter_name, recruiter_email, phone_number),
--   designation, verification fields, timestamps, indexes, RLS policies, and
--   bidirectional synchronization triggers so that all TypeScript interfaces,
--   forms, and queries run without column-missing errors.
-- ============================================================================

-- 1. Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. Table: public.recruiters
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recruiters (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(200),
    recruiter_name VARCHAR(200),
    official_email VARCHAR(255),
    recruiter_email VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile_number VARCHAR(50),
    phone_number VARCHAR(50),
    designation VARCHAR(150),
    company_name VARCHAR(200),
    company_website VARCHAR(255),
    linkedin_profile VARCHAR(255),
    linkedin_url VARCHAR(255),
    company_logo TEXT,
    gst_number VARCHAR(50),
    registration_doc_url TEXT,
    verification_status VARCHAR(50) DEFAULT 'Pending',
    is_verified BOOLEAN DEFAULT false,
    rejection_reason TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Complete ALTER TABLE ADD COLUMN IF NOT EXISTS for public.recruiters
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS name VARCHAR(200);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS recruiter_name VARCHAR(200);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS official_email VARCHAR(255);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS recruiter_email VARCHAR(255);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(50);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS designation VARCHAR(150);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS company_name VARCHAR(200);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS company_website VARCHAR(255);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS linkedin_profile VARCHAR(255);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS company_logo TEXT;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS registration_doc_url TEXT;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS verified_by VARCHAR(150);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Ensure not-null constraints don't block inserts if column was created without default
ALTER TABLE public.recruiters ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.recruiters ALTER COLUMN recruiter_name DROP NOT NULL;
ALTER TABLE public.recruiters ALTER COLUMN company_name DROP NOT NULL;

-- Backfill and Synchronize Existing Records in recruiters
UPDATE public.recruiters SET recruiter_name = name WHERE recruiter_name IS NULL AND name IS NOT NULL;
UPDATE public.recruiters SET name = recruiter_name WHERE name IS NULL AND recruiter_name IS NOT NULL;

UPDATE public.recruiters SET recruiter_email = official_email WHERE recruiter_email IS NULL AND official_email IS NOT NULL;
UPDATE public.recruiters SET official_email = recruiter_email WHERE official_email IS NULL AND recruiter_email IS NOT NULL;
UPDATE public.recruiters SET email = official_email WHERE email IS NULL AND official_email IS NOT NULL;
UPDATE public.recruiters SET official_email = email WHERE official_email IS NULL AND email IS NOT NULL;
UPDATE public.recruiters SET recruiter_email = email WHERE recruiter_email IS NULL AND email IS NOT NULL;

UPDATE public.recruiters SET phone_number = mobile_number WHERE phone_number IS NULL AND mobile_number IS NOT NULL;
UPDATE public.recruiters SET mobile_number = phone_number WHERE mobile_number IS NULL AND phone_number IS NOT NULL;
UPDATE public.recruiters SET phone = mobile_number WHERE phone IS NULL AND mobile_number IS NOT NULL;

UPDATE public.recruiters SET linkedin_url = linkedin_profile WHERE linkedin_url IS NULL AND linkedin_profile IS NOT NULL;
UPDATE public.recruiters SET linkedin_profile = linkedin_url WHERE linkedin_profile IS NULL AND linkedin_url IS NOT NULL;

-- Trigger Function for recruiters aliases
CREATE OR REPLACE FUNCTION public.fn_sync_recruiter_aliases()
RETURNS TRIGGER AS $$
BEGIN
    -- Synchronize name / recruiter_name
    IF NEW.name IS NOT NULL AND NEW.recruiter_name IS NULL THEN
        NEW.recruiter_name := NEW.name;
    ELSIF NEW.recruiter_name IS NOT NULL AND NEW.name IS NULL THEN
        NEW.name := NEW.recruiter_name;
    END IF;

    -- Synchronize official_email / recruiter_email / email
    IF NEW.official_email IS NOT NULL AND NEW.email IS NULL THEN
        NEW.email := NEW.official_email;
    ELSIF NEW.email IS NOT NULL AND NEW.official_email IS NULL THEN
        NEW.official_email := NEW.email;
    END IF;

    IF NEW.official_email IS NOT NULL AND NEW.recruiter_email IS NULL THEN
        NEW.recruiter_email := NEW.official_email;
    ELSIF NEW.recruiter_email IS NOT NULL AND NEW.official_email IS NULL THEN
        NEW.official_email := NEW.recruiter_email;
    END IF;

    -- Synchronize mobile_number / phone_number / phone
    IF NEW.mobile_number IS NOT NULL AND NEW.phone_number IS NULL THEN
        NEW.phone_number := NEW.mobile_number;
    ELSIF NEW.phone_number IS NOT NULL AND NEW.mobile_number IS NULL THEN
        NEW.mobile_number := NEW.phone_number;
    END IF;
    IF NEW.mobile_number IS NOT NULL AND NEW.phone IS NULL THEN
        NEW.phone := NEW.mobile_number;
    ELSIF NEW.phone IS NOT NULL AND NEW.mobile_number IS NULL THEN
        NEW.mobile_number := NEW.phone;
    END IF;

    -- Synchronize linkedin_profile / linkedin_url
    IF NEW.linkedin_profile IS NOT NULL AND NEW.linkedin_url IS NULL THEN
        NEW.linkedin_url := NEW.linkedin_profile;
    ELSIF NEW.linkedin_url IS NOT NULL AND NEW.linkedin_profile IS NULL THEN
        NEW.linkedin_profile := NEW.linkedin_url;
    END IF;

    -- Auto-bump updated_at
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_recruiter_aliases ON public.recruiters;
CREATE TRIGGER trg_sync_recruiter_aliases
BEFORE INSERT OR UPDATE ON public.recruiters
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_recruiter_aliases();

-- Indexes for recruiters
CREATE INDEX IF NOT EXISTS idx_recruiters_email ON public.recruiters (email);
CREATE INDEX IF NOT EXISTS idx_recruiters_official_email ON public.recruiters (official_email);
CREATE INDEX IF NOT EXISTS idx_recruiters_recruiter_email ON public.recruiters (recruiter_email);
CREATE INDEX IF NOT EXISTS idx_recruiters_company_name ON public.recruiters (company_name);
CREATE INDEX IF NOT EXISTS idx_recruiters_verification ON public.recruiters (verification_status);
CREATE INDEX IF NOT EXISTS idx_recruiters_created_at ON public.recruiters (created_at DESC);

-- RLS Policies on recruiters
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on recruiters" ON public.recruiters;
CREATE POLICY "Allow public select on recruiters" ON public.recruiters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to recruiters" ON public.recruiters;
CREATE POLICY "Allow public insert to recruiters" ON public.recruiters FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on recruiters" ON public.recruiters;
CREATE POLICY "Allow update on recruiters" ON public.recruiters FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow full access to admin on recruiters" ON public.recruiters;
CREATE POLICY "Allow full access to admin on recruiters" ON public.recruiters FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');


-- ============================================================================
-- 3. Table: public.recruiter_jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recruiter_jobs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recruiter_id BIGINT,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(200),
    company_name VARCHAR(200),
    company_logo TEXT,
    location VARCHAR(200),
    salary VARCHAR(100),
    experience VARCHAR(100),
    job_type VARCHAR(100),
    category VARCHAR(100),
    skills_required TEXT[] DEFAULT '{}',
    description TEXT,
    apply_link TEXT,
    status VARCHAR(50) DEFAULT 'pending_review',
    verification_status VARCHAR(50) DEFAULT 'pending',
    rejection_reason TEXT,
    approved_job_id UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Complete ALTER TABLE ADD COLUMN IF NOT EXISTS for public.recruiter_jobs
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS company VARCHAR(200);
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS company_name VARCHAR(200);
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS company_logo TEXT;
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS location VARCHAR(200);
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS salary VARCHAR(100);
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS experience VARCHAR(100);
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(100);
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS skills_required TEXT[] DEFAULT '{}';
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_review';
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS approved_job_id UUID;
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(150);
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.recruiter_jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Synchronize company and company_name in recruiter_jobs
UPDATE public.recruiter_jobs SET company_name = company WHERE company_name IS NULL AND company IS NOT NULL;
UPDATE public.recruiter_jobs SET company = company_name WHERE company IS NULL AND company_name IS NOT NULL;

-- Foreign key between recruiter_jobs and recruiters
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_recruiter_jobs_recruiter'
    ) THEN
        BEGIN
            ALTER TABLE public.recruiter_jobs
            ADD CONSTRAINT fk_recruiter_jobs_recruiter
            FOREIGN KEY (recruiter_id) REFERENCES public.recruiters(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Skip if data types differ (e.g. UUID vs BIGINT)
        END;
    END IF;
END $$;

-- Indexes for recruiter_jobs
CREATE INDEX IF NOT EXISTS idx_recruiter_jobs_recruiter_id ON public.recruiter_jobs (recruiter_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_jobs_status ON public.recruiter_jobs (status);
CREATE INDEX IF NOT EXISTS idx_recruiter_jobs_created_at ON public.recruiter_jobs (created_at DESC);

-- RLS Policies on recruiter_jobs
ALTER TABLE public.recruiter_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on recruiter_jobs" ON public.recruiter_jobs;
CREATE POLICY "Allow public select on recruiter_jobs" ON public.recruiter_jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to recruiter_jobs" ON public.recruiter_jobs;
CREATE POLICY "Allow public insert to recruiter_jobs" ON public.recruiter_jobs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to recruiter_jobs" ON public.recruiter_jobs;
CREATE POLICY "Allow public update to recruiter_jobs" ON public.recruiter_jobs FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow full access to admin on recruiter_jobs" ON public.recruiter_jobs;
CREATE POLICY "Allow full access to admin on recruiter_jobs" ON public.recruiter_jobs FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
