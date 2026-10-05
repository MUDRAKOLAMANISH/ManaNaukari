-- ============================================================================
-- SQL Migration: Add Availability Monitoring columns to jobs table
-- Platform: Mana Naukari (Supabase / PostgreSQL)
-- Description:
--   Adds review_reason and review_date columns to support automated job health checks.
-- ============================================================================

-- 1. Add review_reason column
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS review_reason TEXT;

-- 2. Add review_date column
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS review_date TIMESTAMP WITH TIME ZONE;
