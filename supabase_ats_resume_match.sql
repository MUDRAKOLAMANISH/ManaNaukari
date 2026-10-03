-- ============================================================================
-- SQL Migration: ATS Resume Match Results Persistence
-- Platform: Mana Naukari (Supabase / PostgreSQL)
-- Description:
--   Creates the resume_match_results table to permanently store ATS analysis,
--   match scores, skills breakdown, and recommendations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resume_match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(100) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    candidate_name VARCHAR(150),
    candidate_email VARCHAR(255),
    candidate_phone VARCHAR(50),
    resume_file_name VARCHAR(255),
    match_percentage NUMERIC(5,2) NOT NULL,
    skills_score NUMERIC(5,2) DEFAULT 0,
    experience_score NUMERIC(5,2) DEFAULT 0,
    education_score NUMERIC(5,2) DEFAULT 0,
    keyword_score NUMERIC(5,2) DEFAULT 0,
    matched_skills TEXT[] DEFAULT '{}',
    missing_skills TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_resume_match_job_id ON public.resume_match_results(job_id);
CREATE INDEX IF NOT EXISTS idx_resume_match_created_at ON public.resume_match_results(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.resume_match_results ENABLE ROW LEVEL SECURITY;

-- Anonymous candidates can save their match results
CREATE POLICY "Allow public insert on resume_match_results"
    ON public.resume_match_results FOR INSERT
    WITH CHECK (true);

-- Anyone can read their match results
CREATE POLICY "Allow public select on resume_match_results"
    ON public.resume_match_results FOR SELECT
    USING (true);
