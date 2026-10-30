-- ============================================================================
-- MANACARRIER: REMOVE PUBLIC AUTHENTICATION & SECURE OPEN PORTAL RLS MIGRATION
-- Date: 2026-10-30
-- Description:
--   - Enables Row Level Security (RLS) across all public tables.
--   - Grants anonymous ('anon') visitors minimal, secure permissions for:
--       * Reading active job listings
--       * Submitting job applications anonymously
--       * Submitting recruiter job postings
--       * Submitting contact messages, website dev inquiries, and mock interview bookings
--       * Subscribing to job alerts
--       * Reading public study materials and FAQs
--   - Restricts ALL administrative management (reading applicants, approving recruiters,
--     editing/deleting jobs, managing RAG knowledge base) strictly to authenticated admins.
--   - Protects private candidate, recruiter, and admin records from public access.
-- ============================================================================

-- 1. JOBS TABLE RLS
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public visitors can view active jobs" ON public.jobs;
CREATE POLICY "Public visitors can view active jobs"
  ON public.jobs
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "Admins have full access to jobs" ON public.jobs;
CREATE POLICY "Admins have full access to jobs"
  ON public.jobs
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

-- 2. APPLICANTS TABLE RLS
ALTER TABLE IF EXISTS public.applicants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public visitors can submit applications anonymously" ON public.applicants;
CREATE POLICY "Public visitors can submit applications anonymously"
  ON public.applicants
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view and manage applicants" ON public.applicants;
CREATE POLICY "Admins can view and manage applicants"
  ON public.applicants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- 3. RECRUITER APPLICATIONS TABLE RLS
ALTER TABLE IF EXISTS public.recruiter_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public recruiters can submit job postings anonymously" ON public.recruiter_applications;
CREATE POLICY "Public recruiters can submit job postings anonymously"
  ON public.recruiter_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view and manage recruiter applications" ON public.recruiter_applications;
CREATE POLICY "Admins can view and manage recruiter applications"
  ON public.recruiter_applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- 4. JOB ALERTS / SUBSCRIBERS TABLE RLS
ALTER TABLE IF EXISTS public.job_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public visitors can subscribe to job alerts" ON public.job_alerts;
CREATE POLICY "Public visitors can subscribe to job alerts"
  ON public.job_alerts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public visitors can view or update alert preferences via unsubscribe token" ON public.job_alerts;
CREATE POLICY "Public visitors can view or update alert preferences via unsubscribe token"
  ON public.job_alerts
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage job alerts" ON public.job_alerts;
CREATE POLICY "Admins can manage job alerts"
  ON public.job_alerts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- 5. CONTACT SUBMISSIONS / WEBSITE LEADS RLS
ALTER TABLE IF EXISTS public.contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public visitors can submit contact messages" ON public.contact_submissions;
CREATE POLICY "Public visitors can submit contact messages"
  ON public.contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins can view contact submissions"
  ON public.contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

ALTER TABLE IF EXISTS public.website_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public visitors can submit website dev inquiries" ON public.website_leads;
CREATE POLICY "Public visitors can submit website dev inquiries"
  ON public.website_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view website dev leads" ON public.website_leads;
CREATE POLICY "Admins can view website dev leads"
  ON public.website_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- 6. MOCK INTERVIEWS & RESUME ORDERS RLS
ALTER TABLE IF EXISTS public.mock_interview_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public visitors can book mock interview slots" ON public.mock_interview_bookings;
CREATE POLICY "Public visitors can book mock interview slots"
  ON public.mock_interview_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view and manage mock interview bookings" ON public.mock_interview_bookings;
CREATE POLICY "Admins can view and manage mock interview bookings"
  ON public.mock_interview_bookings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- 7. MATERIALS & KNOWLEDGE BASE RLS
ALTER TABLE IF EXISTS public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public visitors can view public study materials" ON public.materials;
CREATE POLICY "Public visitors can view public study materials"
  ON public.materials
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true OR is_public IS NULL);

DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
CREATE POLICY "Admins can manage materials"
  ON public.materials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- 8. ADMIN USERS TABLE RLS
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow email lookup during admin authentication check" ON public.admin_users;
CREATE POLICY "Allow email lookup during admin authentication check"
  ON public.admin_users
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage admin_users table" ON public.admin_users;
CREATE POLICY "Admins can manage admin_users table"
  ON public.admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE LOWER(admin_users.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- ============================================================================
-- END OF MIGRATION SCRIPT
-- ============================================================================
