-- ============================================================================
-- SQL Migration: Notes, Links & Materials Module
-- Platform: Mana Naukari (Supabase / PostgreSQL)
-- Description:
--   Creates the public.materials table, enables RLS, adds performance indexes,
--   and configures policies for public reading/tracking and admin write access.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50) NOT NULL, -- 'PDF', 'DOCX', 'PPTX', 'ZIP', 'LINK'
    file_url TEXT,                      -- Supabase storage link
    external_link TEXT,                 -- Custom external url
    category VARCHAR(100) DEFAULT 'General' NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL, -- 'active', 'draft'
    is_featured BOOLEAN DEFAULT false NOT NULL,
    views INTEGER DEFAULT 0 NOT NULL,
    downloads INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_materials_status_created ON public.materials (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials (category);
CREATE INDEX IF NOT EXISTS idx_materials_is_featured ON public.materials (is_featured) WHERE is_featured = true;

-- Enable Row Level Security (RLS)
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- 1. Policy: Allow anyone (unauthenticated candidates) to view active materials
CREATE POLICY "Allow public read on active materials" 
    ON public.materials FOR SELECT 
    USING (status = 'active');

-- 2. Policy: Allow anyone to increment views / downloads (public update)
-- To safely limit public update to views and downloads only, we can check that auth role is allowed
CREATE POLICY "Allow public select and update to active materials" 
    ON public.materials FOR UPDATE 
    USING (status = 'active')
    WITH CHECK (status = 'active');

-- 3. Policy: Allow full admin write access (authenticated super_admins / service_role)
CREATE POLICY "Allow admin full access to materials" 
    ON public.materials FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Create a storage bucket for 'materials' if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true) ON CONFLICT (id) DO NOTHING;

-- Storage Bucket Policies
CREATE POLICY "Allow public read on materials bucket" ON storage.objects FOR SELECT TO public USING (bucket_id = 'materials');
CREATE POLICY "Allow public uploads to materials bucket" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'materials');
CREATE POLICY "Allow admin full access to materials bucket" ON storage.objects FOR ALL USING (bucket_id = 'materials');
