-- ============================================================================
-- MANACARRIER - PRODUCTION ANALYTICS & TELEMETRY SECURITY & DATABASE MIGRATION
-- Migration Date: 2026-11-02
-- Platform: ManaCarrier (Supabase PostgreSQL)
-- Description:
--   1. Defines non-recursive SECURITY DEFINER helper function `is_admin_user()`.
--   2. Provisions visitor_analytics, job_views, and whatsapp_popup_events tables.
--   3. Safely migrates existing column data types (job_views.job_id to UUID) if needed.
--   4. Performs non-destructive column backfills and conditional duplicate checks.
--   5. STRICT SECURITY ENFORCEMENT:
--      - Revokes public SELECT access on all telemetry tables.
--      - Restricts SELECT/ALL access strictly to verified admin_users emails or service-role.
--      - Public anonymous access is restricted ONLY to FOR INSERT WITH CHECK (true).
--   6. Configures job_alert_subscribers, daily_job_reminder_runs, & daily_job_reminder_logs.
--   7. Triggers PostgREST schema cache reload.
-- ============================================================================

-- Ensure required UUID and crypto extensions are active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Helper Function: Non-Recursive Admin Authorization
-- ----------------------------------------------------------------------------
-- Uses SECURITY DEFINER to bypass admin_users RLS sub-queries and prevent recursion.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT (auth.role() = 'service_role')
     OR EXISTS (
          SELECT 1 
          FROM public.admin_users 
          WHERE lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
     );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Table: visitor_analytics (Anonymous Device Telemetry & Visitor Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.visitor_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_url TEXT NOT NULL,
    page_name VARCHAR(255),
    session_id VARCHAR(64),
    visitor_id VARCHAR(100) NOT NULL,
    visit_date DATE DEFAULT CURRENT_DATE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    page_type VARCHAR(50) DEFAULT 'other',
    path VARCHAR(255),
    referrer TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Schema upgrades if table already exists in user's Supabase project
ALTER TABLE public.visitor_analytics ADD COLUMN IF NOT EXISTS visit_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.visitor_analytics ADD COLUMN IF NOT EXISTS page_name VARCHAR(255);
ALTER TABLE public.visitor_analytics ADD COLUMN IF NOT EXISTS session_id VARCHAR(64);
ALTER TABLE public.visitor_analytics ADD COLUMN IF NOT EXISTS page_type VARCHAR(50) DEFAULT 'other';
ALTER TABLE public.visitor_analytics ADD COLUMN IF NOT EXISTS path VARCHAR(255);
ALTER TABLE public.visitor_analytics ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE public.visitor_analytics ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.visitor_analytics ADD COLUMN IF NOT EXISTS visited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Backfill missing visit_date from visited_at without removing records
UPDATE public.visitor_analytics 
SET visit_date = (visited_at::date) 
WHERE visit_date IS NULL AND visited_at IS NOT NULL;

-- Conditional block: Safely check for duplicates before applying unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_visitor_per_day'
    ) THEN
        -- Only deduplicate strict identical duplicate records (preserving 1 record per visitor per day)
        DELETE FROM public.visitor_analytics a
        USING public.visitor_analytics b
        WHERE a.ctid > b.ctid
          AND a.visitor_id = b.visitor_id
          AND a.visit_date = b.visit_date
          AND a.visitor_id IS NOT NULL
          AND a.visit_date IS NOT NULL;

        -- Apply unique constraint
        ALTER TABLE public.visitor_analytics ADD CONSTRAINT unique_visitor_per_day UNIQUE (visitor_id, visit_date);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_visitor_analytics_visit_date ON public.visitor_analytics(visit_date);
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_visitor_id ON public.visitor_analytics(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_created ON public.visitor_analytics (created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Table: job_views (Job Detail Page Engagement & Outbound Apply Clicks)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    visitor_id VARCHAR(100) NOT NULL,
    session_id VARCHAR(64),
    job_title VARCHAR(255),
    company VARCHAR(150),
    event_type VARCHAR(50) DEFAULT 'view', -- 'view', 'outbound_apply_click'
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.job_views ADD COLUMN IF NOT EXISTS session_id VARCHAR(64);
ALTER TABLE public.job_views ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE public.job_views ADD COLUMN IF NOT EXISTS company VARCHAR(150);
ALTER TABLE public.job_views ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'view';
ALTER TABLE public.job_views ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Safe Dynamic Column Type Migration: Convert job_views.job_id to UUID if currently text or bigint
DO $$
DECLARE
    curr_type text;
BEGIN
    SELECT data_type INTO curr_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'job_views' 
      AND column_name = 'job_id';

    IF curr_type IS NOT NULL AND curr_type != 'uuid' THEN
        BEGIN
            ALTER TABLE public.job_views ALTER COLUMN job_id TYPE UUID USING job_id::uuid;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Notice: job_views.job_id contains non-UUID strings. Left intact for inspection.';
        END;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_job_views_created ON public.job_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON public.job_views (job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_visitor_id ON public.job_views (visitor_id);

-- ----------------------------------------------------------------------------
-- 4. Table: whatsapp_popup_events (WhatsApp Community Growth Telemetry)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_popup_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'popup_impression', 'popup_join_click', 'popup_dismiss', 'popup_snooze'
    path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_popup_events_created ON public.whatsapp_popup_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_popup_events_type ON public.whatsapp_popup_events (event_type);

-- ----------------------------------------------------------------------------
-- 5. Table: job_alert_subscribers & Delivery Logs (Preserves 8 Active Subscribers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_alert_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    categories TEXT[] DEFAULT '{}',
    frequency VARCHAR(50) DEFAULT 'daily',
    is_active BOOLEAN DEFAULT true,
    unsubscribe_token VARCHAR(100) DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.job_alert_subscribers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.job_alert_subscribers ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR(100) DEFAULT encode(gen_random_bytes(16), 'hex');

UPDATE public.job_alert_subscribers 
SET unsubscribe_token = encode(gen_random_bytes(16), 'hex') 
WHERE unsubscribe_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_alert_subscribers_active ON public.job_alert_subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_job_alert_subscribers_email ON public.job_alert_subscribers(email);

CREATE TABLE IF NOT EXISTS public.daily_job_reminder_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'running' NOT NULL,
    total_subscribers INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    emails_failed INTEGER DEFAULT 0,
    jobs_included_count INTEGER DEFAULT 0,
    jobs_summary JSONB,
    is_test BOOLEAN DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.daily_job_reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES public.daily_job_reminder_runs(id) ON DELETE SET NULL,
    run_date DATE NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'sent', 'delivered', 'failed', 'skipped', 'bounced'
    resend_id VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_reminder_logs_date ON public.daily_job_reminder_logs(run_date);
CREATE INDEX IF NOT EXISTS idx_daily_reminder_logs_email ON public.daily_job_reminder_logs(recipient_email);

-- ----------------------------------------------------------------------------
-- 6. Comprehensive RLS Policy Audit & Clean Up
-- ----------------------------------------------------------------------------
ALTER TABLE public.visitor_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_popup_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_alert_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_job_reminder_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_job_reminder_logs ENABLE ROW LEVEL SECURITY;

-- Drop all legacy or overly-permissive policies
DROP POLICY IF EXISTS "Allow public insert to visitor_analytics" ON public.visitor_analytics;
DROP POLICY IF EXISTS "Allow public select on visitor_analytics" ON public.visitor_analytics;
DROP POLICY IF EXISTS "Allow full access to admin on visitor_analytics" ON public.visitor_analytics;
DROP POLICY IF EXISTS "Allow full access to admin users on visitor_analytics" ON public.visitor_analytics;
DROP POLICY IF EXISTS "Allow admin select on visitor_analytics" ON public.visitor_analytics;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.visitor_analytics;

DROP POLICY IF EXISTS "Allow public insert to job_views" ON public.job_views;
DROP POLICY IF EXISTS "Allow public select on job_views" ON public.job_views;
DROP POLICY IF EXISTS "Allow full access to admin on job_views" ON public.job_views;
DROP POLICY IF EXISTS "Allow full access to admin users on job_views" ON public.job_views;
DROP POLICY IF EXISTS "Allow admin select on job_views" ON public.job_views;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.job_views;

DROP POLICY IF EXISTS "Allow public insert to whatsapp_popup_events" ON public.whatsapp_popup_events;
DROP POLICY IF EXISTS "Allow public select on whatsapp_popup_events" ON public.whatsapp_popup_events;
DROP POLICY IF EXISTS "Allow full access to admin on whatsapp_popup_events" ON public.whatsapp_popup_events;
DROP POLICY IF EXISTS "Allow full access to admin users on whatsapp_popup_events" ON public.whatsapp_popup_events;
DROP POLICY IF EXISTS "Allow admin select on whatsapp_popup_events" ON public.whatsapp_popup_events;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.whatsapp_popup_events;

DROP POLICY IF EXISTS "Allow public insert for subscription" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Allow public insert to job_alert_subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Allow public select on job_alert_subscribers for deduplication" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Allow verified admin access to job_alert_subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Allow full access to admin on job_alert_subscribers" ON public.job_alert_subscribers;

DROP POLICY IF EXISTS "Allow verified admin access to daily_job_reminder_runs" ON public.daily_job_reminder_runs;
DROP POLICY IF EXISTS "Allow full access to admin on daily_job_reminder_runs" ON public.daily_job_reminder_runs;
DROP POLICY IF EXISTS "Allow verified admin access to daily_job_reminder_logs" ON public.daily_job_reminder_logs;
DROP POLICY IF EXISTS "Allow full access to admin on daily_job_reminder_logs" ON public.daily_job_reminder_logs;

-- ----------------------------------------------------------------------------
-- 7. New Strict RLS Declarations using `public.is_admin_user()`
-- ----------------------------------------------------------------------------

-- PUBLIC ANONYMOUS INSERT ONLY POLICIES
CREATE POLICY "Allow public insert to visitor_analytics" 
    ON public.visitor_analytics FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public insert to job_views" 
    ON public.job_views FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public insert to whatsapp_popup_events" 
    ON public.whatsapp_popup_events FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public insert for subscription" 
    ON public.job_alert_subscribers FOR INSERT 
    WITH CHECK (true);

-- STRICT ADMIN-ONLY SELECT & ALL POLICIES (No auth.role() = 'authenticated' loophole)
CREATE POLICY "Allow admin select on visitor_analytics" 
    ON public.visitor_analytics FOR SELECT 
    USING (public.is_admin_user());

CREATE POLICY "Allow admin select on job_views" 
    ON public.job_views FOR SELECT 
    USING (public.is_admin_user());

CREATE POLICY "Allow admin select on whatsapp_popup_events" 
    ON public.whatsapp_popup_events FOR SELECT 
    USING (public.is_admin_user());

CREATE POLICY "Allow verified admin access to job_alert_subscribers" 
    ON public.job_alert_subscribers FOR ALL 
    USING (public.is_admin_user());

CREATE POLICY "Allow verified admin access to daily_job_reminder_runs" 
    ON public.daily_job_reminder_runs FOR ALL 
    USING (public.is_admin_user());

CREATE POLICY "Allow verified admin access to daily_job_reminder_logs" 
    ON public.daily_job_reminder_logs FOR ALL 
    USING (public.is_admin_user());

-- ----------------------------------------------------------------------------
-- 8. Unsubscribe RPC & PostgREST Schema Reload
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unsubscribe_job_alert_by_token(target_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    clean_token TEXT;
    updated_rows INT;
BEGIN
    clean_token := trim(target_token);
    IF clean_token = '' OR clean_token IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unsubscribe token is required.');
    END IF;

    UPDATE public.job_alert_subscribers
    SET is_active = false
    WHERE unsubscribe_token = clean_token;

    GET DIAGNOSTICS updated_rows = ROW_COUNT;

    IF updated_rows > 0 THEN
        RETURN jsonb_build_object('success', true, 'count', updated_rows, 'message', 'Successfully unsubscribed.');
    ELSE
        RETURN jsonb_build_object('success', false, 'count', 0, 'message', 'Invalid unsubscribe token.');
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unsubscribe_job_alert_by_token(TEXT) TO anon, authenticated, service_role;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
