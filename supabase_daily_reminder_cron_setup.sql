-- ====================================================================
-- MANA CAREER - SECURE DAILY JOB REMINDER AUTOMATION & MIGRATION SCRIPT
-- Project Reference: wasiyzakmkrmbxohzfwg
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wasiyzakmkrmbxohzfwg/sql
-- ====================================================================

-- 1. Ensure `job_alert_subscribers` table exists with `is_active` and `unsubscribe_token`
CREATE TABLE IF NOT EXISTS public.job_alert_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    categories TEXT[] DEFAULT '{}',
    frequency VARCHAR(50) DEFAULT 'daily',
    is_active BOOLEAN DEFAULT true,
    unsubscribe_token VARCHAR(100) DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Upgrade schema safely without dropping existing tables or subscriber data
ALTER TABLE public.job_alert_subscribers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.job_alert_subscribers ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR(100) DEFAULT encode(gen_random_bytes(16), 'hex');

-- Backfill tokens for any existing rows that have NULL unsubscribe_token
UPDATE public.job_alert_subscribers 
SET unsubscribe_token = encode(gen_random_bytes(16), 'hex') 
WHERE unsubscribe_token IS NULL;

-- Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_job_alert_subscribers_active ON public.job_alert_subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_job_alert_subscribers_email ON public.job_alert_subscribers(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_alert_subscribers_token ON public.job_alert_subscribers(unsubscribe_token);

-- 2. Create `daily_job_reminder_runs` table for idempotency & run tracking
CREATE TABLE IF NOT EXISTS public.daily_job_reminder_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'running' NOT NULL, -- 'running', 'completed', 'failed'
    total_subscribers INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    emails_failed INTEGER DEFAULT 0,
    jobs_included_count INTEGER DEFAULT 0,
    jobs_summary JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_daily_reminder_runs_date ON public.daily_job_reminder_runs(run_date);

-- 3. Create `daily_job_reminder_logs` table for individual delivery audit logs
CREATE TABLE IF NOT EXISTS public.daily_job_reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_date DATE NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'sent', 'failed', 'skipped'
    resend_id VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_reminder_logs_date ON public.daily_job_reminder_logs(run_date);
CREATE INDEX IF NOT EXISTS idx_daily_reminder_logs_email ON public.daily_job_reminder_logs(recipient_email);

-- ====================================================================
-- 4. VERIFIED ADMIN ACCESS HELPER FUNCTION & ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- Function to check if current user is a verified administrator in public.admin_users or service_role
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE lower(email) = lower(auth.jwt() ->> 'email')
  ) OR (auth.role() = 'service_role');
$$;

-- Enable RLS on all job alert tables
ALTER TABLE public.job_alert_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_job_reminder_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_job_reminder_logs ENABLE ROW LEVEL SECURITY;

-- Clean up legacy over-permissive policies on job_alert_subscribers
DROP POLICY IF EXISTS "Allow public read to job_alert_subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Allow public select to job_alert_subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Allow public update to job_alert_subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Allow public insert to job_alert_subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Allow public insert for subscription" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Allow admin full access to job_alert_subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Allow verified admin access to job_alert_subscribers" ON public.job_alert_subscribers;

-- Public Policy: Anonymous candidates can ONLY insert new subscriptions (Job Alerts Subscribe Form)
CREATE POLICY "Allow public insert for subscription" ON public.job_alert_subscribers
    FOR INSERT WITH CHECK (true);

-- Admin Policy: Verified Administrators and Service Role ONLY can view, edit, or delete subscriber records
CREATE POLICY "Allow verified admin access to job_alert_subscribers" ON public.job_alert_subscribers
    FOR ALL 
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- Clean up & set policies on daily_job_reminder_runs
DROP POLICY IF EXISTS "Allow full admin access to daily_job_reminder_runs" ON public.daily_job_reminder_runs;
DROP POLICY IF EXISTS "Allow admin and service role access to daily_job_reminder_runs" ON public.daily_job_reminder_runs;
DROP POLICY IF EXISTS "Allow verified admin access to daily_job_reminder_runs" ON public.daily_job_reminder_runs;

CREATE POLICY "Allow verified admin access to daily_job_reminder_runs" ON public.daily_job_reminder_runs
    FOR ALL 
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- Clean up & set policies on daily_job_reminder_logs
DROP POLICY IF EXISTS "Allow full admin access to daily_job_reminder_logs" ON public.daily_job_reminder_logs;
DROP POLICY IF EXISTS "Allow admin and service role access to daily_job_reminder_logs" ON public.daily_job_reminder_logs;
DROP POLICY IF EXISTS "Allow verified admin access to daily_job_reminder_logs" ON public.daily_job_reminder_logs;

CREATE POLICY "Allow verified admin access to daily_job_reminder_logs" ON public.daily_job_reminder_logs
    FOR ALL 
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- ====================================================================
-- 5. SECURE TOKEN-BASED UNSUBSCRIBE RPC & REVOKE UNNECESSARY PRIVILEGES
-- ====================================================================

-- Drop email-only unsubscribe RPC function completely to prevent unauthorized unsubscribes
DROP FUNCTION IF EXISTS public.unsubscribe_job_alert(TEXT);

-- Token-based RPC Function: Unsubscribes a candidate strictly using their secret token
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
        RETURN jsonb_build_object(
            'success', true,
            'count', updated_rows,
            'message', 'You have been successfully unsubscribed from Mana Career job alerts.'
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'count', 0,
            'message', 'Invalid or expired unsubscribe link.'
        );
    END IF;
END;
$$;

-- Grant execution permissions ONLY for token-based RPC to anon, authenticated, service_role
GRANT EXECUTE ON FUNCTION public.unsubscribe_job_alert_by_token(TEXT) TO anon, authenticated, service_role;

-- Revoke execution privileges on internal helper functions from PUBLIC and anon
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.invoke_daily_job_reminder_cron() FROM PUBLIC, anon;

-- ====================================================================
-- 6. AUTOMATED DAILY SCHEDULE AT 9:00 AM ASIA/KOLKATA (03:30 UTC DAILY)
-- ====================================================================
-- Required Extensions: pg_cron and pg_net (enable under Supabase Dashboard > Database > Extensions)

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper function to trigger Edge Function safely using secret stored in Supabase Vault
CREATE OR REPLACE FUNCTION public.invoke_daily_job_reminder_cron()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cron_sec TEXT;
    request_id bigint;
BEGIN
    -- 1. Read dedicated `cron_secret` securely from Supabase Vault
    BEGIN
        SELECT decrypted_secret INTO cron_sec 
        FROM vault.decrypted_secrets 
        WHERE name = 'cron_secret' LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        cron_sec := NULL;
    END;

    -- 2. Fallback to `service_role_key` in Vault if `cron_secret` is not set separately
    IF cron_sec IS NULL OR cron_sec = '' THEN
        BEGIN
            SELECT decrypted_secret INTO cron_sec 
            FROM vault.decrypted_secrets 
            WHERE name = 'service_role_key' LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            cron_sec := NULL;
        END;
    END IF;

    -- 3. Fail visibly and log error if secret is missing in Vault
    IF cron_sec IS NULL OR cron_sec = '' THEN
        RAISE EXCEPTION 'Vault secret "cron_secret" is missing or empty. Please add a secret named "cron_secret" in your Supabase Dashboard under Project Settings > Vault (or Secrets).';
    END IF;

    -- 4. Trigger HTTP POST via pg_net and return async HTTP request ID
    SELECT net.http_post(
        url := 'https://wasiyzakmkrmbxohzfwg.supabase.co/functions/v1/daily-job-reminder',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || cron_sec
        ),
        body := jsonb_build_object('source', 'pg_cron')
    ) INTO request_id;

    RETURN request_id;
END;
$$;

-- Safely unschedule previous schedule if exists to prevent duplicates
SELECT cron.unschedule('daily-job-reminder-9am-ist')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-job-reminder-9am-ist');

-- Active cron schedule statement: Runs daily at 03:30 UTC = 9:00 AM Asia/Kolkata
SELECT cron.schedule(
    'daily-job-reminder-9am-ist',
    '30 3 * * *',
    $$ SELECT public.invoke_daily_job_reminder_cron(); $$
);
