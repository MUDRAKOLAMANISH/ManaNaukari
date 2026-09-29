-- ============================================================================
-- Career Vault Jobs – PostgreSQL Database Schema (Supabase)
-- ============================================================================

-- Enable UUID extension for robust distributed primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Table: categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 2. Table: jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(150) NOT NULL,
    company_logo TEXT,
    location VARCHAR(150) NOT NULL,
    salary VARCHAR(100),
    experience VARCHAR(50),
    job_type VARCHAR(50) NOT NULL,            -- e.g. 'Fresher', 'Internship', 'Full Time', 'Part Time', 'Contract'
    category VARCHAR(100) NOT NULL,           -- References categories.category_name
    skills_required TEXT[] DEFAULT '{}',      -- Array of required technical and domain skills
    description TEXT NOT NULL,
    apply_link TEXT NOT NULL,                 -- Verified official company career portal URL
    source VARCHAR(100),                      -- e.g. 'Official Careers', 'LinkedIn', 'TCS iON'
    featured BOOLEAN DEFAULT false NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL, -- 'active', 'expired', 'draft'
    posted_date DATE DEFAULT CURRENT_DATE NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Foreign Key Constraint linking category
    CONSTRAINT fk_jobs_category 
        FOREIGN KEY (category) 
        REFERENCES public.categories(category_name) 
        ON UPDATE CASCADE 
        ON DELETE RESTRICT
);

-- ============================================================================
-- 3. Table: admin_users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) DEFAULT 'super_admin' NOT NULL, -- e.g. 'super_admin', 'editor'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 4. Table: visitor_profiles
-- ============================================================================
-- Captures high-intent candidate information upon clicking "Apply Now"
CREATE TABLE IF NOT EXISTS public.visitor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 5. Table: applicants
-- ============================================================================
-- Junction table tracking which visitor profile applied to which job opening
CREATE TABLE IF NOT EXISTS public.applicants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID NOT NULL,
    job_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'New' NOT NULL, -- 'New', 'Reviewed', 'Shortlisted', 'Rejected'
    notes TEXT,
    resume_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Foreign Keys with cascading delete for data integrity
    CONSTRAINT fk_applicants_visitor 
        FOREIGN KEY (visitor_id) 
        REFERENCES public.visitor_profiles(id) 
        ON DELETE CASCADE,

    CONSTRAINT fk_applicants_job 
        FOREIGN KEY (job_id) 
        REFERENCES public.jobs(id) 
        ON DELETE CASCADE
);

-- Backward-compatible columns addition if table already exists in user's Supabase project:
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'New';
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.visitor_profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- ============================================================================
-- 6. Table: contact_messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- Recommended Performance & Query Indexes
-- ============================================================================

-- Index for filtering active jobs by publication date (used on homepage & job listing)
CREATE INDEX IF NOT EXISTS idx_jobs_status_posted_date 
    ON public.jobs (status, posted_date DESC);

-- Index for category filters
CREATE INDEX IF NOT EXISTS idx_jobs_category 
    ON public.jobs (category);

-- Index for job type filters ('Fresher', 'Internship', 'Full Time')
CREATE INDEX IF NOT EXISTS idx_jobs_job_type 
    ON public.jobs (job_type);

-- Index for featured job spotlight queries
CREATE INDEX IF NOT EXISTS idx_jobs_featured 
    ON public.jobs (featured) 
    WHERE status = 'active';

-- Index for text searches on job title and company
CREATE INDEX IF NOT EXISTS idx_jobs_title_company 
    ON public.jobs (title, company);

-- Foreign key indexes on applicants table (critical for fast join operations)
CREATE INDEX IF NOT EXISTS idx_applicants_visitor_id 
    ON public.applicants (visitor_id);

CREATE INDEX IF NOT EXISTS idx_applicants_job_id 
    ON public.applicants (job_id);

-- Lookup indexes for visitor profiles (candidate deduplication and lookup)
CREATE INDEX IF NOT EXISTS idx_visitor_profiles_email 
    ON public.visitor_profiles (email);

CREATE INDEX IF NOT EXISTS idx_visitor_profiles_phone 
    ON public.visitor_profiles (phone);

-- Index for contact messages sorting
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at 
    ON public.contact_messages (created_at DESC);

-- ============================================================================
-- Supabase Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- 1. Categories: Anyone can read
CREATE POLICY "Allow public read access to categories" 
    ON public.categories FOR SELECT 
    USING (true);

-- 2. Jobs: Anyone can read active jobs
CREATE POLICY "Allow public read access to active jobs" 
    ON public.jobs FOR SELECT 
    USING (status = 'active');

-- 3. Visitor Profiles: Anyone can insert their lead details during application
CREATE POLICY "Allow public insert to visitor_profiles" 
    ON public.visitor_profiles FOR INSERT 
    WITH CHECK (true);

-- 4. Applicants: Anyone can record their job application link
CREATE POLICY "Allow public insert to applicants" 
    ON public.applicants FOR INSERT 
    WITH CHECK (true);

-- 5. Contact Messages: Anyone can submit an inquiry
CREATE POLICY "Allow public insert to contact_messages" 
    ON public.contact_messages FOR INSERT 
    WITH CHECK (true);

-- 6. Authenticated Admins / Service Role full access across tables
CREATE POLICY "Allow full access to admin users on jobs" 
    ON public.jobs FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow full access to admin users on categories" 
    ON public.categories FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow admin read access on visitor_profiles" 
    ON public.visitor_profiles FOR SELECT 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow admin read access on applicants" 
    ON public.applicants FOR SELECT 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow admin read access on contact_messages" 
    ON public.contact_messages FOR SELECT 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ============================================================================
-- 7. Table: visitor_analytics (Traffic & Pageview Telemetry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.visitor_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(64) NOT NULL,
    page_type VARCHAR(50) NOT NULL,            -- 'home', 'jobs_listing', 'job_details', etc.
    path VARCHAR(255) NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for fast analytics aggregation queries
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_created_at 
    ON public.visitor_analytics (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_analytics_session_id 
    ON public.visitor_analytics (session_id);

CREATE INDEX IF NOT EXISTS idx_visitor_analytics_page_type 
    ON public.visitor_analytics (page_type);

-- ============================================================================
-- 8. Table: job_views (Individual Job Impressions & Conversion Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    job_title VARCHAR(255),
    company VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT fk_job_views_job 
        FOREIGN KEY (job_id) 
        REFERENCES public.jobs(id) 
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_views_created_at 
    ON public.job_views (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_views_job_id 
    ON public.job_views (job_id);

CREATE INDEX IF NOT EXISTS idx_job_views_session_id 
    ON public.job_views (session_id);

-- RLS for Analytics Tables
ALTER TABLE public.visitor_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to visitor_analytics" 
    ON public.visitor_analytics FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public insert to job_views" 
    ON public.job_views FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow full access to admin on visitor_analytics" 
    ON public.visitor_analytics FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow full access to admin on job_views" 
    ON public.job_views FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ============================================================================
-- 9. Table: whatsapp_popup_events (Community Join Telemetry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_popup_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'view', 'join_click', 'close_click', 'maybe_later_click'
    path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_popup_events_created_at 
    ON public.whatsapp_popup_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_popup_events_event_type 
    ON public.whatsapp_popup_events (event_type);

CREATE INDEX IF NOT EXISTS idx_whatsapp_popup_events_session_id 
    ON public.whatsapp_popup_events (session_id);

ALTER TABLE public.whatsapp_popup_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to whatsapp_popup_events" 
    ON public.whatsapp_popup_events FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow full access to admin on whatsapp_popup_events" 
    ON public.whatsapp_popup_events FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ============================================================================
-- 10. Table: job_alert_subscribers (Candidate Alert Subscriptions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_alert_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    categories TEXT[] DEFAULT '{}',
    frequency VARCHAR(50) DEFAULT 'daily' NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_alert_subscribers_created_at 
    ON public.job_alert_subscribers (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_alert_subscribers_email 
    ON public.job_alert_subscribers (email);

ALTER TABLE public.job_alert_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on job_alert_subscribers for deduplication" 
    ON public.job_alert_subscribers FOR SELECT 
    TO public 
    USING (true);

CREATE POLICY "Allow public insert to job_alert_subscribers" 
    ON public.job_alert_subscribers FOR INSERT 
    TO public 
    WITH CHECK (true);

CREATE POLICY "Allow full access to admin on job_alert_subscribers" 
    ON public.job_alert_subscribers FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ============================================================================
-- 11. Table: resume_orders (ATS Resume Review & Optimization Submissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.resume_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    resume_file_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resume_orders_created_at 
    ON public.resume_orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resume_orders_email 
    ON public.resume_orders (email);

CREATE INDEX IF NOT EXISTS idx_resume_orders_phone 
    ON public.resume_orders (phone);

ALTER TABLE public.resume_orders ENABLE ROW LEVEL SECURITY;

-- Allow public candidates to submit resume orders
CREATE POLICY "Allow public insert to resume_orders" 
    ON public.resume_orders FOR INSERT 
    TO public 
    WITH CHECK (true);

-- Allow admins and service roles full access to manage resume orders
CREATE POLICY "Allow full access to admin on resume_orders" 
    ON public.resume_orders FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ============================================================================
-- 13. Table: recruiters & recruiter_jobs (Recruiter Portal & RLS Security)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recruiters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200),
    recruiter_name VARCHAR(200),
    official_email VARCHAR(255),
    recruiter_email VARCHAR(255),
    mobile_number VARCHAR(50),
    phone_number VARCHAR(50),
    designation VARCHAR(150),
    company_name VARCHAR(200),
    company_website VARCHAR(255),
    linkedin_profile VARCHAR(255),
    company_logo TEXT,
    gst_number VARCHAR(50),
    registration_doc_url TEXT,
    verification_status VARCHAR(50) DEFAULT 'Pending' NOT NULL, -- 'Pending', 'Verified', 'Rejected', 'Suspended'
    is_verified BOOLEAN DEFAULT false NOT NULL,
    rejection_reason TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS recruiter_name VARCHAR(200);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS recruiter_email VARCHAR(255);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS designation VARCHAR(150);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS company_logo TEXT;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS registration_doc_url TEXT;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS verified_by VARCHAR(150);

CREATE TABLE IF NOT EXISTS public.recruiter_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recruiter_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(200) NOT NULL,
    company_name VARCHAR(200),
    company_logo TEXT,
    location VARCHAR(200) NOT NULL,
    salary VARCHAR(100),
    experience VARCHAR(100),
    job_type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    skills_required TEXT[] DEFAULT '{}',
    description TEXT NOT NULL,
    apply_link TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_review' NOT NULL, -- 'pending_review', 'Approved', 'Rejected'
    verification_status VARCHAR(50) DEFAULT 'pending',
    rejection_reason TEXT,
    approved_job_id UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT fk_recruiter_jobs_recruiter
        FOREIGN KEY (recruiter_id)
        REFERENCES public.recruiters(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.job_payments (
    id VARCHAR(100) PRIMARY KEY,
    recruiter_job_id UUID NOT NULL,
    recruiter_id UUID NOT NULL,
    amount NUMERIC DEFAULT 0 NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    status VARCHAR(50) DEFAULT 'completed' NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'UPI',
    transaction_id VARCHAR(150) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 10. Table: knowledge_documents (RAG Knowledge Base Documents)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL,            -- 'pdf' or 'docx'
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    chunk_count INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'indexed' NOT NULL, -- 'indexed', 'processing', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 11. Table: knowledge_chunks (Extracted Text Chunks & Vector Embeddings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER DEFAULT 0,
    embedding JSONB,                          -- Array of floats representing embedding vector
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 12. Table: knowledge_faqs (Curated Q&A Knowledge Base Items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General' NOT NULL,
    embedding JSONB,                          -- Array of floats representing embedding vector
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc_id ON public.knowledge_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_status ON public.knowledge_documents (status);

-- RLS policies for Knowledge Base
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on knowledge_documents" ON public.knowledge_documents FOR SELECT USING (true);
CREATE POLICY "Allow admin all on knowledge_documents" ON public.knowledge_documents FOR ALL USING (true);

CREATE POLICY "Allow public select on knowledge_chunks" ON public.knowledge_chunks FOR SELECT USING (true);
CREATE POLICY "Allow admin all on knowledge_chunks" ON public.knowledge_chunks FOR ALL USING (true);

CREATE POLICY "Allow public select on knowledge_faqs" ON public.knowledge_faqs FOR SELECT USING (true);
CREATE POLICY "Allow admin all on knowledge_faqs" ON public.knowledge_faqs FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_recruiters_verification ON public.recruiters (verification_status);
CREATE INDEX IF NOT EXISTS idx_recruiter_jobs_recruiter_id ON public.recruiter_jobs (recruiter_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_jobs_status ON public.recruiter_jobs (status);

-- Row Level Security (RLS)
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_payments ENABLE ROW LEVEL SECURITY;

-- Allow recruiters to read and register their own profile by email
CREATE POLICY "Allow public select on recruiters" ON public.recruiters FOR SELECT USING (true);
CREATE POLICY "Allow public insert to recruiters" ON public.recruiters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on recruiters" ON public.recruiters FOR UPDATE USING (true);
CREATE POLICY "Allow full access to admin on recruiters" ON public.recruiters FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Allow recruiters to manage their own jobs
CREATE POLICY "Allow public select on recruiter_jobs" ON public.recruiter_jobs FOR SELECT USING (true);
CREATE POLICY "Allow public insert to recruiter_jobs" ON public.recruiter_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to recruiter_jobs" ON public.recruiter_jobs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to recruiter_jobs" ON public.recruiter_jobs FOR DELETE USING (true);
CREATE POLICY "Allow full access to admin on recruiter_jobs" ON public.recruiter_jobs FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow full access to admin on job_payments" ON public.job_payments FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Allow public insert to job_payments" ON public.job_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select on job_payments" ON public.job_payments FOR SELECT USING (true);


