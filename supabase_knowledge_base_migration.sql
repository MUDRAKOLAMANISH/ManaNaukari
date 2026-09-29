-- ============================================================================
-- MANA NAUKARI KNOWLEDGE BASE & VECTOR RAG MIGRATION
-- ============================================================================

-- 1. Main Knowledge Base Documents & Text Entries Table
CREATE TABLE IF NOT EXISTS public.knowledge_base_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General' NOT NULL,
    source_type VARCHAR(50) DEFAULT 'pdf' NOT NULL, -- 'pdf', 'docx', 'txt', 'text_entry', 'url'
    file_name TEXT,
    file_size BIGINT DEFAULT 0,
    page_count INT DEFAULT 1,
    char_count INT DEFAULT 0,
    chunk_count INT DEFAULT 0,
    content TEXT NOT NULL,
    chunks JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'indexed' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_docs_category ON public.knowledge_base_documents (category);
CREATE INDEX IF NOT EXISTS idx_kb_docs_source ON public.knowledge_base_documents (source_type);
CREATE INDEX IF NOT EXISTS idx_kb_docs_created ON public.knowledge_base_documents (created_at DESC);

-- RLS
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on knowledge_base_documents" ON public.knowledge_base_documents;
CREATE POLICY "Allow public select on knowledge_base_documents" ON public.knowledge_base_documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all on knowledge_base_documents" ON public.knowledge_base_documents;
CREATE POLICY "Allow all on knowledge_base_documents" ON public.knowledge_base_documents FOR ALL USING (true) WITH CHECK (true);

-- 2. Knowledge Chunks Table for Vector Embeddings
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES public.knowledge_base_documents(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General' NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    word_count INT DEFAULT 0,
    token_count INT DEFAULT 0,
    embedding JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_chunks_doc_id ON public.knowledge_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_category ON public.knowledge_chunks (category);

-- RLS
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on knowledge_chunks" ON public.knowledge_chunks;
CREATE POLICY "Allow public select on knowledge_chunks" ON public.knowledge_chunks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all on knowledge_chunks" ON public.knowledge_chunks;
CREATE POLICY "Allow all on knowledge_chunks" ON public.knowledge_chunks FOR ALL USING (true) WITH CHECK (true);
