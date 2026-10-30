-- ==============================================================================
-- Career Vault Jobs - Production Row Level Security (RLS) Policies
-- Database: PostgreSQL / Supabase
-- Target Tables: jobs, categories, contact_messages, applicants, visitor_profiles, admin_users
-- ==============================================================================

-- 1. Enable RLS on all relevant tables
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visitor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. Helper Security Definer Function: is_admin()
-- Checks if the authenticated user's email exists in admin_users with role 'admin'
-- or 'super_admin'. Runs as SECURITY DEFINER to bypass RLS recursion on admin_users.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
      AND role IN ('admin', 'super_admin')
  );
$$;

-- Grant execution permission on helper function to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;


-- ==============================================================================
-- 3. POLICIES FOR: jobs
-- ==============================================================================
DROP POLICY IF EXISTS "Public can view active jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;

-- Anyone (public, unauthenticated visitors) can view active jobs
CREATE POLICY "Public can view active jobs"
ON public.jobs
FOR SELECT
TO public
USING (status = 'active');

-- Admins can view all jobs (including 'expired' and 'draft' statuses)
CREATE POLICY "Admins can view all jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Only admins can insert jobs
CREATE POLICY "Admins can insert jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Only admins can update jobs (including status changes to 'expired')
CREATE POLICY "Admins can update jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admins can delete jobs
CREATE POLICY "Admins can delete jobs"
ON public.jobs
FOR DELETE
TO authenticated
USING (public.is_admin());


-- ==============================================================================
-- 4. POLICIES FOR: categories
-- ==============================================================================
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

-- Anyone can view categories
CREATE POLICY "Public can view categories"
ON public.categories
FOR SELECT
TO public
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can insert categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete categories"
ON public.categories
FOR DELETE
TO authenticated
USING (public.is_admin());


-- ==============================================================================
-- 5. POLICIES FOR: contact_messages
-- ==============================================================================
DROP POLICY IF EXISTS "Public can submit contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can delete contact messages" ON public.contact_messages;

-- Anyone (candidates/employers) can submit a contact inquiry
CREATE POLICY "Public can submit contact messages"
ON public.contact_messages
FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can read contact inquiries
CREATE POLICY "Admins can view contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Only admins can delete contact inquiries
CREATE POLICY "Admins can delete contact messages"
ON public.contact_messages
FOR DELETE
TO authenticated
USING (public.is_admin());


-- ==============================================================================
-- 6. POLICIES FOR: visitor_profiles
-- ==============================================================================
DROP POLICY IF EXISTS "Public can insert visitor profiles" ON public.visitor_profiles;
DROP POLICY IF EXISTS "Public can update own visitor profile by email" ON public.visitor_profiles;
DROP POLICY IF EXISTS "Admins can view visitor profiles" ON public.visitor_profiles;
DROP POLICY IF EXISTS "Admins can delete visitor profiles" ON public.visitor_profiles;

-- Candidates can create visitor profiles during application lead capture
CREATE POLICY "Public can insert visitor profiles"
ON public.visitor_profiles
FOR INSERT
TO public
WITH CHECK (true);

-- Allow visitor profile upserts by email
CREATE POLICY "Public can update own visitor profile by email"
ON public.visitor_profiles
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Only admins can view candidate profiles / PII
CREATE POLICY "Admins can view visitor profiles"
ON public.visitor_profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Only admins can delete visitor profiles
CREATE POLICY "Admins can delete visitor profiles"
ON public.visitor_profiles
FOR DELETE
TO authenticated
USING (public.is_admin());


-- ==============================================================================
-- 7. POLICIES FOR: applicants (job applications)
-- ==============================================================================
DROP POLICY IF EXISTS "Public can record applications" ON public.applicants;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applicants;
DROP POLICY IF EXISTS "Admins can delete applications" ON public.applicants;

-- Candidates can submit job applications
CREATE POLICY "Public can record applications"
ON public.applicants
FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can view application metrics and records
CREATE POLICY "Admins can view all applications"
ON public.applicants
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Only admins can delete application records
CREATE POLICY "Admins can delete applications"
ON public.applicants
FOR DELETE
TO authenticated
USING (public.is_admin());


-- ==============================================================================
-- 8. POLICIES FOR: admin_users
-- ==============================================================================
DROP POLICY IF EXISTS "Admins can view own admin profile" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin_users" ON public.admin_users;

-- Users can view their own admin profile entry to verify role
CREATE POLICY "Admins can view own admin profile"
ON public.admin_users
FOR SELECT
TO authenticated
USING (LOWER(email) = LOWER(auth.jwt() ->> 'email') OR public.is_admin());

-- Super admins can manage admin users
CREATE POLICY "Super admins can manage admin_users"
ON public.admin_users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
      AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
      AND role = 'super_admin'
  )
);

-- ==============================================================================
-- 9. POLICIES FOR: visitor_analytics
-- ==============================================================================
ALTER TABLE IF EXISTS public.visitor_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can record visitor analytics" ON public.visitor_analytics;
DROP POLICY IF EXISTS "Admins can view visitor analytics" ON public.visitor_analytics;

-- Any visitor can record pageviews
CREATE POLICY "Public can record visitor analytics"
ON public.visitor_analytics
FOR INSERT
TO public
WITH CHECK (true);

-- Authenticated admins can view analytics
CREATE POLICY "Admins can view visitor analytics"
ON public.visitor_analytics
FOR SELECT
TO authenticated
USING (public.is_admin());

-- ==============================================================================
-- 10. POLICIES FOR: job_views
-- ==============================================================================
ALTER TABLE IF EXISTS public.job_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can record job views" ON public.job_views;
DROP POLICY IF EXISTS "Admins can view job views" ON public.job_views;

-- Any candidate can record job views
CREATE POLICY "Public can record job views"
ON public.job_views
FOR INSERT
TO public
WITH CHECK (true);

-- Authenticated admins can view job view metrics
CREATE POLICY "Admins can view job views"
ON public.job_views
FOR SELECT
TO authenticated
USING (public.is_admin());

-- ==============================================================================
-- 11. POLICIES FOR: job_alert_subscribers
-- ==============================================================================
ALTER TABLE IF EXISTS public.job_alert_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can check if email subscribed" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Public can subscribe to job alerts" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Admins can view all job alert subscribers" ON public.job_alert_subscribers;
DROP POLICY IF EXISTS "Admins can delete job alert subscribers" ON public.job_alert_subscribers;

-- Public can check if their email exists to prevent duplicates
CREATE POLICY "Public can check if email subscribed"
ON public.job_alert_subscribers
FOR SELECT
TO public
USING (true);

-- Candidates can subscribe
CREATE POLICY "Public can subscribe to job alerts"
ON public.job_alert_subscribers
FOR INSERT
TO public
WITH CHECK (true);

-- Authenticated admins can view all subscribers
CREATE POLICY "Admins can view all job alert subscribers"
ON public.job_alert_subscribers
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Authenticated admins can delete subscribers
CREATE POLICY "Admins can delete job alert subscribers"
ON public.job_alert_subscribers
FOR DELETE
TO authenticated
USING (public.is_admin());


-- ==============================================================================
-- 12. POLICIES FOR: RAG Knowledge Base (knowledge_documents, knowledge_chunks, knowledge_faqs, ai_conversations)
-- ==============================================================================
ALTER TABLE IF EXISTS public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.knowledge_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- 12.1 Policies for: knowledge_documents
DROP POLICY IF EXISTS "Public can view knowledge_documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Allow public select on knowledge_documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Allow all on knowledge_documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Allow admin all on knowledge_documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Admins can insert knowledge_documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Admins can update knowledge_documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Admins can delete knowledge_documents" ON public.knowledge_documents;

CREATE POLICY "Public can view knowledge_documents"
ON public.knowledge_documents
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert knowledge_documents"
ON public.knowledge_documents
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update knowledge_documents"
ON public.knowledge_documents
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete knowledge_documents"
ON public.knowledge_documents
FOR DELETE
TO authenticated
USING (public.is_admin());


-- 12.2 Policies for: knowledge_chunks
DROP POLICY IF EXISTS "Public can view knowledge_chunks" ON public.knowledge_chunks;
DROP POLICY IF EXISTS "Allow public select on knowledge_chunks" ON public.knowledge_chunks;
DROP POLICY IF EXISTS "Allow all on knowledge_chunks" ON public.knowledge_chunks;
DROP POLICY IF EXISTS "Allow admin all on knowledge_chunks" ON public.knowledge_chunks;
DROP POLICY IF EXISTS "Admins can insert knowledge_chunks" ON public.knowledge_chunks;
DROP POLICY IF EXISTS "Admins can update knowledge_chunks" ON public.knowledge_chunks;
DROP POLICY IF EXISTS "Admins can delete knowledge_chunks" ON public.knowledge_chunks;

CREATE POLICY "Public can view knowledge_chunks"
ON public.knowledge_chunks
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert knowledge_chunks"
ON public.knowledge_chunks
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update knowledge_chunks"
ON public.knowledge_chunks
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete knowledge_chunks"
ON public.knowledge_chunks
FOR DELETE
TO authenticated
USING (public.is_admin());


-- 12.3 Policies for: knowledge_faqs
DROP POLICY IF EXISTS "Public can view knowledge_faqs" ON public.knowledge_faqs;
DROP POLICY IF EXISTS "Allow public select on knowledge_faqs" ON public.knowledge_faqs;
DROP POLICY IF EXISTS "Allow all on knowledge_faqs" ON public.knowledge_faqs;
DROP POLICY IF EXISTS "Allow admin all on knowledge_faqs" ON public.knowledge_faqs;
DROP POLICY IF EXISTS "Admins can insert knowledge_faqs" ON public.knowledge_faqs;
DROP POLICY IF EXISTS "Admins can update knowledge_faqs" ON public.knowledge_faqs;
DROP POLICY IF EXISTS "Admins can delete knowledge_faqs" ON public.knowledge_faqs;

CREATE POLICY "Public can view knowledge_faqs"
ON public.knowledge_faqs
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert knowledge_faqs"
ON public.knowledge_faqs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update knowledge_faqs"
ON public.knowledge_faqs
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete knowledge_faqs"
ON public.knowledge_faqs
FOR DELETE
TO authenticated
USING (public.is_admin());


-- 12.4 Policies for: ai_conversations
DROP POLICY IF EXISTS "Public can view ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Public can insert ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Allow public select on ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Allow all on ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Admins can delete ai_conversations" ON public.ai_conversations;

CREATE POLICY "Public can view ai_conversations"
ON public.ai_conversations
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can insert ai_conversations"
ON public.ai_conversations
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can delete ai_conversations"
ON public.ai_conversations
FOR DELETE
TO authenticated
USING (public.is_admin());


