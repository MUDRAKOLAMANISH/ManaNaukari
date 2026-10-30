-- ============================================================================
-- MANACARRIER: PRODUCTION-READY HARDENED JOB ALERT & SUBSCRIBERS DATABASE SCHEMA
-- Date: 2026-10-30
-- Description:
--   - Removes all direct table permissions for anonymous visitors on job_alert_subscribers,
--     daily_job_reminder_runs, and daily_job_reminder_logs.
--   - Provides SECURITY DEFINER functions with input validation & search_path safety.
--   - Strictly enforces token matching for unsubscribes (rejects email-only unsubscribes).
--   - Prevents admin_users policy recursion by comparing auth.jwt() directly.
-- ============================================================================

-- 1. JOB ALERT SUBSCRIBERS TABLE
CREATE TABLE IF NOT EXISTS public.job_alert_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  categories TEXT[] DEFAULT '{}',
  frequency TEXT DEFAULT 'daily',
  is_active BOOLEAN DEFAULT true,
  unsubscribe_token TEXT DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.job_alert_subscribers ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies
DROP POLICY IF EXISTS "Public visitors can subscribe to job alerts" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Public visitors can update subscriptions" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Allow reading subscribers for admin metrics and dispatch" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Admins can delete subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Anon can insert job_alert_subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Anon can insert new job_alert_subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Token or Admin can select job_alert_subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Token or Admin can update job_alert_subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Admin full access on job_alert_subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Admins full access on job_alert_subscribers" ON public.job_alert_subscribers;

-- Revoke all direct table access from anonymous visitors
REVOKE ALL ON TABLE public.job_alert_subscribers FROM anon, public;

-- Verified Admins have full access to view, update, and manage subscribers
CREATE POLICY "Admins full access on job_alert_subscribers"
  ON public.job_alert_subscribers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- 2. EXECUTION TABLES: RUNS & LOGS
CREATE TABLE IF NOT EXISTS public.daily_job_reminder_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending',
  total_subscribers INT DEFAULT 0,
  emails_sent INT DEFAULT 0,
  emails_delivered INT DEFAULT 0,
  emails_bounced INT DEFAULT 0,
  emails_failed INT DEFAULT 0,
  jobs_included_count INT DEFAULT 0,
  jobs_summary JSONB DEFAULT '[]'::jsonb,
  is_test BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.daily_job_reminder_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.daily_job_reminder_runs FROM anon, public;

DROP POLICY IF EXISTS "Allow select on daily job reminder runs" ON public.daily_job_reminder_runs;
DROP POLICY IF EXISTS "Allow insert on daily job reminder runs" ON public.daily_job_reminder_runs;
DROP POLICY IF EXISTS "Allow update on daily job reminder runs" ON public.daily_job_reminder_runs;
DROP POLICY IF EXISTS "Admins only access daily_job_reminder_runs" ON public.daily_job_reminder_runs;

CREATE POLICY "Admins only access daily_job_reminder_runs"
  ON public.daily_job_reminder_runs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

CREATE TABLE IF NOT EXISTS public.daily_job_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.daily_job_reminder_runs(id) ON DELETE SET NULL,
  run_date DATE DEFAULT CURRENT_DATE,
  recipient_email TEXT NOT NULL,
  status TEXT DEFAULT 'sent', -- 'accepted', 'sent', 'delivered', 'bounced', 'failed'
  resend_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.daily_job_reminder_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.daily_job_reminder_logs FROM anon, public;

DROP POLICY IF EXISTS "Allow select on daily job reminder logs" ON public.daily_job_reminder_logs;
DROP POLICY IF EXISTS "Allow insert on daily job reminder logs" ON public.daily_job_reminder_logs;
DROP POLICY IF EXISTS "Admins only access daily_job_reminder_logs" ON public.daily_job_reminder_logs;

CREATE POLICY "Admins only access daily_job_reminder_logs"
  ON public.daily_job_reminder_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- 3. ADMIN USERS NON-RECURSIVE POLICY
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select admin_users" ON public.admin_users;
CREATE POLICY "Admins can select admin_users"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));

-- 4. SECURITY DEFINER RPC FUNCTIONS WITH STRICT INPUT VALIDATION

-- RPC A: Public Subscription
CREATE OR REPLACE FUNCTION public.subscribe_job_alerts(
  p_email TEXT,
  p_categories TEXT[],
  p_frequency TEXT DEFAULT 'daily'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  clean_email TEXT;
  clean_freq TEXT;
  existing_id UUID;
  cat_item TEXT;
  validated_categories TEXT[] := '{}';
BEGIN
  -- 1. Sanitize & Validate Email
  clean_email := LOWER(TRIM(COALESCE(p_email, '')));
  IF clean_email = '' OR LENGTH(clean_email) > 255 OR clean_email NOT LIKE '%@%.%' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Please provide a valid email address.');
  END IF;

  -- 2. Validate Frequency
  clean_freq := LOWER(TRIM(COALESCE(p_frequency, 'daily')));
  IF clean_freq NOT IN ('daily', 'instant') THEN
    clean_freq := 'daily';
  END IF;

  -- 3. Validate Categories Array
  IF p_categories IS NULL OR ARRAY_LENGTH(p_categories, 1) IS NULL OR ARRAY_LENGTH(p_categories, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Please select at least one job alert category.');
  END IF;

  IF ARRAY_LENGTH(p_categories, 1) > 10 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Maximum 10 categories allowed per subscription.');
  END IF;

  FOREACH cat_item IN ARRAY p_categories LOOP
    cat_item := TRIM(cat_item);
    IF LENGTH(cat_item) > 0 AND LENGTH(cat_item) <= 100 THEN
      validated_categories := ARRAY_APPEND(validated_categories, cat_item);
    END IF;
  END LOOP;

  IF ARRAY_LENGTH(validated_categories, 1) IS NULL OR ARRAY_LENGTH(validated_categories, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid category selection.');
  END IF;

  -- 4. Check Existing Subscriber & Perform Atomic Upsert
  SELECT id INTO existing_id
  FROM public.job_alert_subscribers
  WHERE LOWER(email) = clean_email
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.job_alert_subscribers
    SET categories = validated_categories,
        frequency = clean_freq,
        is_active = true,
        updated_at = NOW()
    WHERE id = existing_id;

    RETURN jsonb_build_object('success', true, 'message', 'Your job alert preferences have been updated successfully!');
  ELSE
    INSERT INTO public.job_alert_subscribers (email, categories, frequency, is_active)
    VALUES (clean_email, validated_categories, clean_freq, true);

    RETURN jsonb_build_object('success', true, 'message', 'Successfully subscribed to daily job alerts!');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', 'Unable to complete subscription at this time.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.subscribe_job_alerts(TEXT, TEXT[], TEXT) TO anon, authenticated;

-- RPC B: Token-Based Unsubscribe ONLY
CREATE OR REPLACE FUNCTION public.unsubscribe_job_alerts(
  p_email TEXT,
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  clean_email TEXT;
  clean_token TEXT;
  sub_id UUID;
BEGIN
  clean_email := LOWER(TRIM(COALESCE(p_email, '')));
  clean_token := TRIM(COALESCE(p_token, ''));

  -- Reject email-only requests without a valid token
  IF clean_email = '' OR clean_email NOT LIKE '%@%' OR clean_token = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'A valid email address and unsubscribe token are required.'
    );
  END IF;

  -- Match both email AND unsubscribe token
  SELECT id INTO sub_id
  FROM public.job_alert_subscribers
  WHERE LOWER(email) = clean_email
    AND unsubscribe_token = clean_token
  LIMIT 1;

  IF sub_id IS NOT NULL THEN
    UPDATE public.job_alert_subscribers
    SET is_active = false,
        updated_at = NOW()
    WHERE id = sub_id;
  END IF;

  -- Return uniform response to prevent user enumeration
  RETURN jsonb_build_object(
    'success', true,
    'message', 'If the subscription exists and the provided token is valid, you have been unsubscribed.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Unable to process unsubscribe request at this time.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.unsubscribe_job_alerts(TEXT, TEXT) TO anon, authenticated;
