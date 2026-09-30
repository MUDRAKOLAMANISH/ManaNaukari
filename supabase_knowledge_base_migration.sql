-- ============================================================================
-- MANA NAUKARI KNOWLEDGE BASE, CHUNKS & AI CONVERSATIONS MIGRATION
-- ============================================================================

-- 1. Main Knowledge Documents & Text Entries Table
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

-- Enable RLS and public policies
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on knowledge_documents" ON public.knowledge_documents;
CREATE POLICY "Allow public select on knowledge_documents" ON public.knowledge_documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all on knowledge_documents" ON public.knowledge_documents;
CREATE POLICY "Allow all on knowledge_documents" ON public.knowledge_documents FOR ALL USING (true) WITH CHECK (true);

-- 2. Knowledge Chunks Table (500 - 1000 characters per chunk)
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

-- Enable RLS and public policies
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on knowledge_chunks" ON public.knowledge_chunks;
CREATE POLICY "Allow public select on knowledge_chunks" ON public.knowledge_chunks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all on knowledge_chunks" ON public.knowledge_chunks;
CREATE POLICY "Allow all on knowledge_chunks" ON public.knowledge_chunks FOR ALL USING (true) WITH CHECK (true);

-- 3. AI Conversations Table for Chatbot Audit & History
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source_document TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and public policies
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on ai_conversations" ON public.ai_conversations;
CREATE POLICY "Allow public select on ai_conversations" ON public.ai_conversations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all on ai_conversations" ON public.ai_conversations;
CREATE POLICY "Allow all on ai_conversations" ON public.ai_conversations FOR ALL USING (true) WITH CHECK (true);
