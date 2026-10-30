-- ============================================================================
-- MANACARRIER KNOWLEDGE BASE, CHUNKS & AI CONVERSATIONS SECURE MIGRATION
-- ============================================================================

-- 1. Helper function for admin verification (Security Definer to prevent RLS recursion)
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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 2. Main Knowledge Documents & Text Entries Table
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    file_name TEXT,
    file_type VARCHAR(50) DEFAULT 'pdf' NOT NULL, -- 'pdf', 'docx', 'txt', 'text_entry', 'url'
    file_size BIGINT DEFAULT 0,
    category VARCHAR(100) DEFAULT 'General' NOT NULL,
    extracted_text TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_category ON public.knowledge_documents (category);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_type ON public.knowledge_documents (file_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created ON public.knowledge_documents (created_at DESC);

-- Enable RLS and secure admin-only policies for knowledge_documents
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view knowledge_documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Allow public select on knowledge_documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Allow all on knowledge_documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Allow admin all on knowledge_documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Admins can insert knowledge_documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Admins can update knowledge_documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Admins can delete knowledge_documents" ON public.knowledge_documents;

-- Public can view knowledge documents (required for chatbot RAG)
CREATE POLICY "Public can view knowledge_documents"
ON public.knowledge_documents
FOR SELECT
TO public
USING (true);

-- Only authenticated admins can insert knowledge documents
CREATE POLICY "Admins can insert knowledge_documents"
ON public.knowledge_documents
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Only authenticated admins can update knowledge documents
CREATE POLICY "Admins can update knowledge_documents"
ON public.knowledge_documents
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only authenticated admins can delete knowledge documents
CREATE POLICY "Admins can delete knowledge_documents"
ON public.knowledge_documents
FOR DELETE
TO authenticated
USING (public.is_admin());

-- 3. Knowledge Chunks Table (500 - 1000 characters per chunk)
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc_id ON public.knowledge_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_created ON public.knowledge_chunks (created_at DESC);

-- Enable RLS and secure admin-only policies for knowledge_chunks
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

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

-- 4. Knowledge FAQs Table
CREATE TABLE IF NOT EXISTS public.knowledge_faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE IF EXISTS public.knowledge_faqs ENABLE ROW LEVEL SECURITY;

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

-- 5. AI Conversations Table for Chatbot Audit & History
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source_document TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

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
