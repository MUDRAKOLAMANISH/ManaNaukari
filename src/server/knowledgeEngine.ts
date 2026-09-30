import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import mammoth from 'mammoth';
import { createClient } from '@supabase/supabase-js';

// Ensure data and upload directories exist
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads/knowledge-base');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const STORE_FILE = path.join(DATA_DIR, 'knowledge_base.json');

export type KnowledgeSourceType = 'pdf' | 'docx' | 'txt' | 'text_entry' | 'url';

export const KNOWLEDGE_CATEGORIES = [
  'Company Information',
  'Jobs',
  'Resume Review',
  'Portfolio Service',
  'Recruiter Services',
  'FAQs',
  'Policies',
  'General',
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: KnowledgeCategory | string;
  source_type: KnowledgeSourceType;
  file_name?: string;
  file_size?: number;
  page_count: number;
  char_count: number;
  chunk_count: number;
  content: string;
  preview_text?: string;
  status: 'indexed' | 'processing' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface KnowledgeChunk {
  id: string;
  document_id: string;
  document_name: string;
  category: string;
  chunk_index: number;
  content: string;
  word_count: number;
  token_count: number;
  embedding: number[];
  created_at: string;
}

export interface KnowledgeFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

export interface Citation {
  source: string;
  type: 'document' | 'faq' | 'text_entry';
  snippet: string;
}

export interface ExtractionResult {
  fileName: string;
  pages: number;
  charactersExtracted: number;
  previewText: string;
  fullText: string;
}

interface KnowledgeStore {
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
  faqs: KnowledgeFAQ[];
  lastIndexedAt: string;
}

// Initial seed FAQs for Mana Naukari to ensure immediate rich domain knowledge
const SEED_FAQS: Omit<KnowledgeFAQ, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    category: 'General',
    question: 'What is Mana Naukari?',
    answer: 'Mana Naukari is a dedicated Indian employment and career discovery platform connecting freshers, campus graduates, internship seekers, and early-career professionals directly with verified hiring companies and official career portal opportunities.',
  },
  {
    category: 'Jobs',
    question: 'Does Mana Naukari charge any fee for job applications?',
    answer: 'No. Mana Naukari is 100% free for job seekers. All job requisitions link directly to official company career portals (Workday, Greenhouse, Lever, Google Forms, or official HR sites). Mana Naukari never charges any middleman or application fees.',
  },
  {
    category: 'Resume Review',
    question: 'What is the Mana Naukari ATS Resume Review service?',
    answer: 'The ATS Resume Review service is a professional service where career coaches and recruitment experts evaluate your resume against Applicant Tracking Systems (ATS), verify industry keywords, optimize formatting, and deliver an actionable feedback report within 24 to 48 hours.',
  },
  {
    category: 'Portfolio Service',
    question: 'Does Mana Naukari provide portfolio review and career guidance?',
    answer: 'Yes! Mana Naukari offers guidance on technical and design portfolios (GitHub projects, Figma showcases, live web demos) and provides resume optimization to help entry-level candidates stand out to top tech employers.',
  },
  {
    category: 'Recruiter Services',
    question: 'How can recruiters and companies post jobs on Mana Naukari?',
    answer: 'Recruiters can visit the Recruiter Portal (/post-job or /recruiter/dashboard) to register with their official corporate email and company website. Once verified by the Mana Naukari administration team, recruiters can post job openings and manage incoming candidates directly from their dashboard.',
  },
  {
    category: 'Jobs',
    question: 'What types of job openings are available on Mana Naukari?',
    answer: 'Mana Naukari specializes in Entry-Level, Fresher, Internship, and Work From Home (WFH) positions across domains including Software Engineering, Data Science & AI, QA & Automation, DevOps & Cloud, Product & UI/UX Design, and Sales/Operations.',
  },
  {
    category: 'Company Information',
    question: 'How do I contact Mana Naukari support?',
    answer: 'You can reach out via the Contact page (/contact) or email support directly at support@mananaukari.in. We also provide an official WhatsApp community for real-time job alerts.',
  },
  {
    category: 'Policies',
    question: 'What are Mana Naukari verification and safety policies?',
    answer: 'Mana Naukari strictly forbids fraudulent job postings, fee demands, or multi-level marketing schemes. Every recruiter account is manually verified through corporate email verification and company domain validation.',
  },
];

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Initialize Supabase Client (if configured)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Knowledge Store in memory + persisted to disk
let store: KnowledgeStore = {
  documents: [],
  chunks: [],
  faqs: [],
  lastIndexedAt: new Date().toISOString(),
};

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      store = JSON.parse(raw);
    } else {
      // Seed FAQs
      const now = new Date().toISOString();
      store.faqs = SEED_FAQS.map((f, i) => ({
        ...f,
        id: `faq-${Date.now()}-${i}`,
        created_at: now,
        updated_at: now,
      }));
      saveStore();
    }
  } catch (err) {
    console.error('[KnowledgeEngine] Error loading store:', err);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[KnowledgeEngine] Error saving store:', err);
  }
}

loadStore();

export const FALLBACK_MESSAGE = 'I could not find this information in the Mana Naukari Knowledge Base.';

/**
 * Generate embedding vector using Gemini API 'gemini-embedding-2-preview'
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const cleaned = text.trim();
    if (!cleaned) return [];

    const result = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: cleaned,
    });

    const values = result.embeddings?.[0]?.values;
    if (values && Array.isArray(values)) {
      return values;
    }
    return [];
  } catch (err) {
    console.error('[KnowledgeEngine] Embedding generation error:', err);
    return [];
  }
}

/**
 * Compute cosine similarity between two float vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 1. Extract text from PDF buffer
 * Uses pdfjs-dist legacy build with fallback to Gemini multimodal.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pages: number }> {
  // Method 1: pdfjs-dist legacy build
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data,
      useSystemFonts: true,
    } as any);

    const doc = await loadingTask.promise;
    const numPages = doc.numPages || 1;
    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .filter((s: string) => s.trim().length > 0)
          .join(' ');

        if (pageText.trim()) {
          fullText += pageText + '\n\n';
        }
      } catch (pageErr) {
        console.warn(`[KnowledgeEngine] Warning extracting page ${pageNum}:`, pageErr);
      }
    }

    const cleaned = fullText.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '').trim();
    if (cleaned.length >= 10) {
      console.log(`[KnowledgeEngine] Local PDF parser successfully extracted ${cleaned.length} chars from ${numPages} page(s).`);
      return { text: cleaned, pages: numPages };
    }
  } catch (parseErr) {
    console.warn('[KnowledgeEngine] pdfjs-dist attempt warning:', parseErr);
  }

  // Method 2: Gemini 3.8 Flash multimodal extraction fallback
  try {
    console.log('[KnowledgeEngine] Using Gemini multimodal parser for PDF extraction...');
    const base64Pdf = buffer.toString('base64');
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Pdf,
          },
        },
        {
          text: 'Transcribe and extract all textual content from this PDF accurately. Preserve headings, sections, paragraphs, and list items. Output only the extracted plain text with zero commentary or preamble.',
        },
      ],
    });

    const aiText = response.text ? response.text.trim() : '';
    if (aiText.length >= 20) {
      const estimatedPages = Math.max(1, Math.ceil(aiText.length / 2500));
      console.log(`[KnowledgeEngine] Gemini multimodal parser extracted ${aiText.length} chars.`);
      return { text: aiText, pages: estimatedPages };
    }
  } catch (aiErr) {
    console.error('[KnowledgeEngine] Gemini multimodal PDF extraction error:', aiErr);
  }

  // If extraction failed or yielded empty text
  throw new Error('Unable to extract text from this document. Please upload a readable PDF or add content manually.');
}

/**
 * 2. Extract text from DOCX buffer using mammoth
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<{ text: string; pages: number }> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value ? result.value.trim() : '';
    if (text.length >= 10) {
      const pages = Math.max(1, Math.ceil(text.length / 2500));
      return { text, pages };
    }
  } catch (err) {
    console.error('[KnowledgeEngine] Mammoth DOCX extraction error:', err);
  }

  throw new Error('Unable to extract text from this document. Please upload a readable PDF or add content manually.');
}

/**
 * 3. Extract text from plain TXT buffer
 */
export function extractTextFromTxt(buffer: Buffer): { text: string; pages: number } {
  const text = buffer.toString('utf-8').trim();
  if (text.length >= 10) {
    const pages = Math.max(1, Math.ceil(text.length / 2500));
    return { text, pages };
  }
  throw new Error('Unable to extract text from this document. Please upload a readable PDF or add content manually.');
}

/**
 * Split text into chunks of 500-1000 words with 100 word overlap
 */
export function chunkTextByWords(
  text: string,
  minWords = 500,
  maxWords = 1000,
  overlapWords = 100
): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return [cleaned];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + maxWords, words.length);
    const chunkWords = words.slice(startIndex, endIndex);
    chunks.push(chunkWords.join(' '));

    if (endIndex >= words.length) break;
    startIndex += maxWords - overlapWords;
  }

  return chunks.filter((c) => c.trim().length > 20);
}

/**
 * Service API: Ingest and index an uploaded document (PDF, DOCX, TXT)
 */
export async function ingestDocument(
  fileName: string,
  fileBuffer: Buffer,
  fileType: 'pdf' | 'docx' | 'txt',
  category: string = 'General',
  customTitle?: string
): Promise<{ document: KnowledgeDocument; extraction: ExtractionResult }> {
  const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const diskPath = path.join(UPLOADS_DIR, `${docId}_${fileName}`);
  fs.writeFileSync(diskPath, fileBuffer);

  // Extract raw text and page count
  let extractionResult: { text: string; pages: number };
  if (fileType === 'pdf') {
    extractionResult = await extractTextFromPdf(fileBuffer);
  } else if (fileType === 'docx') {
    extractionResult = await extractTextFromDocx(fileBuffer);
  } else if (fileType === 'txt') {
    extractionResult = extractTextFromTxt(fileBuffer);
  } else {
    throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.');
  }

  const { text: rawText, pages: pageCount } = extractionResult;
  if (!rawText || rawText.length < 10) {
    throw new Error('Unable to extract text from this document. Please upload a readable PDF or add content manually.');
  }

  // Chunk text (500-1000 words per chunk)
  const rawChunks = chunkTextByWords(rawText, 500, 1000, 100);
  if (rawChunks.length === 0) {
    throw new Error('Unable to extract text from this document. Please upload a readable PDF or add content manually.');
  }

  console.log(`[KnowledgeEngine] Chunked "${fileName}" into ${rawChunks.length} vector chunks.`);

  // Generate embeddings for each chunk
  const chunks: KnowledgeChunk[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    const chunkText = rawChunks[i];
    const wordCount = chunkText.split(/\s+/).filter(Boolean).length;
    const embedding = await generateEmbedding(chunkText);
    chunks.push({
      id: `chunk-${docId}-${i}`,
      document_id: docId,
      document_name: customTitle || fileName,
      category: category || 'General',
      chunk_index: i,
      content: chunkText,
      word_count: wordCount,
      token_count: Math.round(chunkText.length / 4),
      embedding,
      created_at: new Date().toISOString(),
    });
  }

  const now = new Date().toISOString();
  const previewText = rawText.slice(0, 1500) + (rawText.length > 1500 ? '...' : '');

  const documentRecord: KnowledgeDocument = {
    id: docId,
    title: customTitle || fileName.replace(/\.[^/.]+$/, ''),
    category: category || 'General',
    source_type: fileType,
    file_name: fileName,
    file_size: fileBuffer.length,
    page_count: pageCount,
    char_count: rawText.length,
    chunk_count: chunks.length,
    content: rawText,
    preview_text: previewText,
    status: 'indexed',
    created_at: now,
    updated_at: now,
  };

  // Save to local store
  store.documents.unshift(documentRecord);
  store.chunks.push(...chunks);
  store.lastIndexedAt = now;
  saveStore();

  // Sync to Supabase tables if configured
  if (supabase) {
    try {
      const { data: dbDoc, error: docErr } = await supabase.from('knowledge_documents').insert([
        {
          title: documentRecord.title,
          file_name: documentRecord.file_name,
          file_type: documentRecord.source_type,
          file_size: documentRecord.file_size,
          category: documentRecord.category,
          extracted_text: documentRecord.content,
          content: documentRecord.content,
          created_at: now,
          updated_at: now,
        },
      ]).select().single();

      if (dbDoc && !docErr) {
        documentRecord.id = String(dbDoc.id);
        const chunkRows = chunks.map((c, idx) => ({
          document_id: dbDoc.id,
          chunk_text: c.content,
          chunk_index: idx,
          created_at: now,
        }));
        await supabase.from('knowledge_chunks').insert(chunkRows);
        console.log(`[KnowledgeEngine] Successfully persisted document ${dbDoc.id} and ${chunkRows.length} chunks to Supabase.`);
      }
    } catch (syncErr) {
      console.warn('[KnowledgeEngine] Supabase table sync notice:', syncErr);
    }
  }

  const extraction: ExtractionResult = {
    fileName,
    pages: pageCount,
    charactersExtracted: rawText.length,
    previewText,
    fullText: rawText,
  };

  return { document: documentRecord, extraction };
}

/**
 * Service API: Add a manual Text Knowledge Entry (without uploading a file)
 */
export async function addTextKnowledgeEntry(
  title: string,
  category: string,
  content: string
): Promise<{ document: KnowledgeDocument; extraction: ExtractionResult }> {
  const cleanContent = content.trim();
  const cleanTitle = title.trim();
  if (!cleanTitle || !cleanContent) {
    throw new Error('Title and content are required for manual text knowledge entry.');
  }

  const docId = `text-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Chunk pasted text
  const rawChunks = chunkTextByWords(cleanContent, 500, 1000, 100);
  const chunks: KnowledgeChunk[] = [];

  for (let i = 0; i < rawChunks.length; i++) {
    const chunkContent = rawChunks[i];
    const wordCount = chunkContent.split(/\s+/).filter(Boolean).length;
    const embedding = await generateEmbedding(chunkContent);
    chunks.push({
      id: `chunk-${docId}-${i}`,
      document_id: docId,
      document_name: cleanTitle,
      category: category || 'General',
      chunk_index: i,
      content: chunkContent,
      word_count: wordCount,
      token_count: Math.round(chunkContent.length / 4),
      embedding,
      created_at: now,
    });
  }

  const pageCount = Math.max(1, Math.ceil(cleanContent.length / 2500));
  const previewText = cleanContent.slice(0, 1500) + (cleanContent.length > 1500 ? '...' : '');

  const documentRecord: KnowledgeDocument = {
    id: docId,
    title: cleanTitle,
    category: category || 'General',
    source_type: 'text_entry',
    page_count: pageCount,
    char_count: cleanContent.length,
    chunk_count: chunks.length,
    content: cleanContent,
    preview_text: previewText,
    status: 'indexed',
    created_at: now,
    updated_at: now,
  };

  store.documents.unshift(documentRecord);
  store.chunks.push(...chunks);
  store.lastIndexedAt = now;
  saveStore();

  if (supabase) {
    try {
      const { data: dbDoc } = await supabase.from('knowledge_documents').insert([
        {
          title: documentRecord.title,
          file_name: `${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.txt`,
          file_type: 'text_entry',
          file_size: cleanContent.length,
          category: documentRecord.category,
          extracted_text: cleanContent,
          content: cleanContent,
          created_at: now,
          updated_at: now,
        },
      ]).select().single();

      if (dbDoc?.id) {
        documentRecord.id = String(dbDoc.id);
        const chunkRows = chunks.map((c, idx) => ({
          document_id: dbDoc.id,
          chunk_text: c.content,
          chunk_index: idx,
          created_at: now,
        }));
        await supabase.from('knowledge_chunks').insert(chunkRows);
      }
    } catch (syncErr) {
      console.warn('[KnowledgeEngine] Supabase table sync notice:', syncErr);
    }
  }

  const extraction: ExtractionResult = {
    fileName: cleanTitle,
    pages: pageCount,
    charactersExtracted: cleanContent.length,
    previewText,
    fullText: cleanContent,
  };

  return { document: documentRecord, extraction };
}

/**
 * Service API: Edit an existing Text Knowledge Entry
 */
export async function editTextKnowledgeEntry(
  id: string,
  title: string,
  category: string,
  content: string
): Promise<KnowledgeDocument> {
  const existing = store.documents.find((d) => d.id === id);
  if (!existing) {
    throw new Error('Knowledge entry not found.');
  }

  const cleanTitle = title.trim();
  const cleanContent = content.trim();
  const now = new Date().toISOString();

  // Remove previous chunks for this document
  store.chunks = store.chunks.filter((c) => c.document_id !== id);

  // Generate new chunks
  const rawChunks = chunkTextByWords(cleanContent, 500, 1000, 100);
  const chunks: KnowledgeChunk[] = [];

  for (let i = 0; i < rawChunks.length; i++) {
    const chunkContent = rawChunks[i];
    const wordCount = chunkContent.split(/\s+/).filter(Boolean).length;
    const embedding = await generateEmbedding(chunkContent);
    chunks.push({
      id: `chunk-${id}-${i}`,
      document_id: id,
      document_name: cleanTitle,
      category: category || 'General',
      chunk_index: i,
      content: chunkContent,
      word_count: wordCount,
      token_count: Math.round(chunkContent.length / 4),
      embedding,
      created_at: now,
    });
  }

  existing.title = cleanTitle;
  existing.category = category || 'General';
  existing.content = cleanContent;
  existing.char_count = cleanContent.length;
  existing.page_count = Math.max(1, Math.ceil(cleanContent.length / 2500));
  existing.chunk_count = chunks.length;
  existing.preview_text = cleanContent.slice(0, 1500) + (cleanContent.length > 1500 ? '...' : '');
  existing.updated_at = now;

  store.chunks.push(...chunks);
  store.lastIndexedAt = now;
  saveStore();

  if (supabase) {
    try {
      await supabase.from('knowledge_chunks').delete().eq('document_id', id);
      await supabase.from('knowledge_documents').update({
        title: cleanTitle,
        category: category || 'General',
        extracted_text: cleanContent,
        content: cleanContent,
        updated_at: now,
      }).eq('id', id);

      const chunkRows = chunks.map((c, idx) => ({
        document_id: id,
        chunk_text: c.content,
        chunk_index: idx,
        created_at: now,
      }));
      await supabase.from('knowledge_chunks').insert(chunkRows);
    } catch (syncErr) {
      console.warn('[KnowledgeEngine] Supabase edit sync notice:', syncErr);
    }
  }

  return existing;
}

/**
 * Service API: Delete a document or text entry and its chunks
 */
export async function deleteDocument(docId: string): Promise<boolean> {
  const doc = store.documents.find((d) => d.id === docId);
  if (!doc) return false;

  store.documents = store.documents.filter((d) => d.id !== docId);
  store.chunks = store.chunks.filter((c) => c.document_id !== docId);
  saveStore();

  if (supabase) {
    try {
      await supabase.from('knowledge_chunks').delete().eq('document_id', docId);
      await supabase.from('knowledge_base_documents').delete().eq('id', docId);
      await supabase.from('knowledge_documents').delete().eq('id', docId);
    } catch (err) {
      console.warn('[KnowledgeEngine] Supabase delete warning:', err);
    }
  }

  return true;
}

/**
 * Service API: Add a manual FAQ
 */
export async function addFaq(question: string, answer: string, category: string = 'General'): Promise<KnowledgeFAQ> {
  const now = new Date().toISOString();
  const faqText = `Question: ${question}\nAnswer: ${answer}`;
  const embedding = await generateEmbedding(faqText);

  const faqRecord: KnowledgeFAQ = {
    id: `faq-${Date.now()}`,
    question: question.trim(),
    answer: answer.trim(),
    category: category.trim(),
    embedding,
    created_at: now,
    updated_at: now,
  };

  store.faqs.unshift(faqRecord);
  saveStore();

  if (supabase) {
    try {
      await supabase.from('knowledge_faqs').insert([faqRecord]);
    } catch (err) {
      console.warn('[KnowledgeEngine] Supabase FAQ sync warning:', err);
    }
  }

  return faqRecord;
}

/**
 * Service API: Delete a FAQ
 */
export async function deleteFaq(faqId: string): Promise<boolean> {
  const existing = store.faqs.find((f) => f.id === faqId);
  if (!existing) return false;

  store.faqs = store.faqs.filter((f) => f.id !== faqId);
  saveStore();

  if (supabase) {
    try {
      await supabase.from('knowledge_faqs').delete().eq('id', faqId);
    } catch (err) {
      console.warn('[KnowledgeEngine] Supabase FAQ delete warning:', err);
    }
  }

  return true;
}

/**
 * Service API: Rebuild entire knowledge embeddings index
 */
export async function rebuildKnowledgeIndex(): Promise<{
  documentsReindexed: number;
  textEntriesReindexed: number;
  faqsReindexed: number;
  totalChunks: number;
}> {
  console.log('[KnowledgeEngine] Rebuilding all vector embeddings...');

  // 1. Re-embed FAQs
  for (const faq of store.faqs) {
    const faqText = `Question: ${faq.question}\nAnswer: ${faq.answer}`;
    faq.embedding = await generateEmbedding(faqText);
  }

  // 2. Re-embed Chunks
  for (const chunk of store.chunks) {
    chunk.embedding = await generateEmbedding(chunk.content);
  }

  store.lastIndexedAt = new Date().toISOString();
  saveStore();

  const totalTextEntries = store.documents.filter((d) => d.source_type === 'text_entry').length;
  const totalFiles = store.documents.filter((d) => d.source_type !== 'text_entry').length;

  return {
    documentsReindexed: totalFiles,
    textEntriesReindexed: totalTextEntries,
    faqsReindexed: store.faqs.length,
    totalChunks: store.chunks.length,
  };
}

/**
 * Service API: Get Knowledge Base Stats
 */
export function getKnowledgeStats() {
  const totalDocuments = store.documents.filter((d) => d.source_type !== 'text_entry').length;
  const totalTextEntries = store.documents.filter((d) => d.source_type === 'text_entry').length;
  const totalChunks = store.chunks.length;

  return {
    totalDocuments,
    totalTextEntries,
    totalChunks,
    documentCount: totalDocuments + totalTextEntries,
    faqCount: store.faqs.length,
    lastUpdated: store.lastIndexedAt,
    lastIndexedAt: store.lastIndexedAt,
  };
}

export function listDocuments(filterCategory?: string, search?: string): KnowledgeDocument[] {
  let list = store.documents;
  if (filterCategory && filterCategory !== 'all') {
    list = list.filter((d) => d.category.toLowerCase() === filterCategory.toLowerCase());
  }
  if (search && search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.file_name && d.file_name.toLowerCase().includes(q)) ||
        d.category.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q)
    );
  }
  return list;
}

export function getDocumentPreview(id: string): { document: KnowledgeDocument; chunks: KnowledgeChunk[] } | null {
  const doc = store.documents.find((d) => d.id === id);
  if (!doc) return null;
  const chunks = store.chunks.filter((c) => c.document_id === id);
  return { document: doc, chunks };
}

export function listFaqs(): KnowledgeFAQ[] {
  return store.faqs;
}

/**
 * Main RAG Chatbot Query Execution
 * Strict anti-hallucination: ONLY answers from retrieved knowledge base content.
 * If no relevant content found, returns EXACT message:
 * "I could not find this information in the Mana Naukari Knowledge Base."
 */
export async function queryRag(
  userQuestion: string,
  history: Array<{ role: 'user' | 'model'; content: string }> = [],
  externalContext?: string
): Promise<{
  answer: string;
  citations: Citation[];
  matched: boolean;
}> {
  const query = userQuestion.trim();
  if (!query) {
    return {
      answer: FALLBACK_MESSAGE,
      citations: [],
      matched: false,
    };
  }

  // If external retrieved context was provided from Supabase client
  if (externalContext && externalContext.trim()) {
    const systemInstruction = `You are the official Mana Naukari AI Career & Knowledge Assistant.
Mana Naukari is India's trusted job and internship portal for freshers and early-career talent.

STRICT INSTRUCTIONS TO PREVENT HALLUCINATIONS:
1. Answer strictly and EXCLUSIVELY from the Mana Naukari Knowledge Base context provided below.
2. DO NOT use general AI knowledge, assumptions, or information from the internet outside the provided context.
3. If the provided context does not contain enough specific information to answer the question, or if the question is unrelated to the provided documents, you MUST reply EXACTLY with this sentence:
"${FALLBACK_MESSAGE}"
4. Be concise, professional, and clear. Format key details with bullet points where appropriate.
5. Never invent contact details, fees, requirements, or policies not explicitly written in the context.`;

    const prompt = `KNOWLEDGE BASE CONTEXT:
${externalContext}

USER QUESTION:
${query}

Please provide a concise answer strictly based on the Knowledge Base context:`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.1,
          },
        });

        const generatedText = response.text?.trim();
        if (generatedText) {
          const isRefusal = generatedText.includes(FALLBACK_MESSAGE) || generatedText.includes('could not find this information');
          return {
            answer: isRefusal ? FALLBACK_MESSAGE : generatedText,
            citations: isRefusal ? [] : [{ source: 'Knowledge Base', type: 'document', snippet: externalContext.slice(0, 100) }],
            matched: !isRefusal,
          };
        }
      } catch (err: any) {
        console.warn(`[KnowledgeEngine] Model ${model} failed:`, err?.message);
      }
    }
  }

  // Step 1: Generate Embedding for user query
  const queryEmbedding = await generateEmbedding(query);

  // Step 2: Vector search against FAQs
  let storeNeedsSave = false;
  const scoredFaqs: Array<{ faq: KnowledgeFAQ; score: number }> = [];
  for (const faq of store.faqs) {
    let emb = faq.embedding;
    if (!emb || emb.length === 0) {
      emb = await generateEmbedding(`Question: ${faq.question}\nAnswer: ${faq.answer}`);
      faq.embedding = emb;
      storeNeedsSave = true;
    }
    const score = cosineSimilarity(queryEmbedding, emb);
    scoredFaqs.push({ faq, score });
  }

  // Step 3: Vector search against Document and Text Knowledge Chunks
  const scoredChunks: Array<{ chunk: KnowledgeChunk; score: number }> = [];
  for (const chunk of store.chunks) {
    let emb = chunk.embedding;
    if (!emb || emb.length === 0) {
      emb = await generateEmbedding(chunk.content);
      chunk.embedding = emb;
      storeNeedsSave = true;
    }
    const score = cosineSimilarity(queryEmbedding, emb);
    scoredChunks.push({ chunk, score });
  }

  if (storeNeedsSave) {
    saveStore();
  }

  // Sort by highest similarity
  scoredFaqs.sort((a, b) => b.score - a.score);
  scoredChunks.sort((a, b) => b.score - a.score);

  const topFaq = scoredFaqs[0];
  const topChunk = scoredChunks[0];
  const maxScore = Math.max(topFaq?.score || 0, topChunk?.score || 0);

  console.log(
    `[KnowledgeEngine] RAG Query: "${query}" | Max Similarity Score: ${maxScore.toFixed(3)} (Top FAQ: ${
      topFaq?.score?.toFixed(3) || 0
    }, Top Chunk: ${topChunk?.score?.toFixed(3) || 0})`
  );

  // Step 4: Strict similarity threshold check
  const STRICT_THRESHOLD = 0.38;
  if (maxScore < STRICT_THRESHOLD) {
    console.log('[KnowledgeEngine] Query below similarity threshold. Returning strict fallback.');
    return {
      answer: FALLBACK_MESSAGE,
      citations: [],
      matched: false,
    };
  }

  // Retrieve top relevant chunks (threshold 0.38)
  const relevantFaqs = scoredFaqs.filter((f) => f.score >= STRICT_THRESHOLD).slice(0, 3).map((f) => f.faq);
  const relevantChunks = scoredChunks.filter((c) => c.score >= STRICT_THRESHOLD).slice(0, 4).map((c) => c.chunk);

  if (relevantFaqs.length === 0 && relevantChunks.length === 0) {
    return {
      answer: FALLBACK_MESSAGE,
      citations: [],
      matched: false,
    };
  }

  const citations: Citation[] = [];
  const contextSegments: string[] = [];

  if (relevantFaqs.length > 0) {
    contextSegments.push('--- RELEVANT FAQS FROM MANA NAUKARI KNOWLEDGE BASE ---');
    for (const faq of relevantFaqs) {
      contextSegments.push(`[Category: ${faq.category}]\nQ: ${faq.question}\nA: ${faq.answer}`);
      citations.push({
        source: `FAQ: ${faq.question}`,
        type: 'faq',
        snippet: faq.answer.slice(0, 120) + (faq.answer.length > 120 ? '...' : ''),
      });
    }
  }

  if (relevantChunks.length > 0) {
    contextSegments.push('--- RELEVANT EXCERPTS FROM KNOWLEDGE BASE DOCUMENTS & TEXT ENTRIES ---');
    for (const chunk of relevantChunks) {
      contextSegments.push(`[Source: ${chunk.document_name} | Category: ${chunk.category}]:\n${chunk.content}`);
      citations.push({
        source: chunk.document_name,
        type: 'document',
        snippet: chunk.content.slice(0, 120) + (chunk.content.length > 120 ? '...' : ''),
      });
    }
  }

  const knowledgeContext = contextSegments.join('\n\n');

  // Step 5: Synthesize concise response with Gemini 3.8 Flash using strict anti-hallucination prompt
  const systemInstruction = `You are the official Mana Naukari AI Career & Knowledge Assistant.
Mana Naukari is India's trusted job and internship portal for freshers and early-career talent.

STRICT INSTRUCTIONS TO PREVENT HALLUCINATIONS:
1. Answer strictly and EXCLUSIVELY from the Mana Naukari Knowledge Base context provided below.
2. DO NOT use general AI knowledge, assumptions, or information from the internet outside the provided context.
3. If the provided context does not contain enough specific information to answer the question, or if the question is unrelated to the provided documents, you MUST reply EXACTLY with this sentence:
"${FALLBACK_MESSAGE}"
4. Be concise, professional, and clear. Format key details with bullet points where appropriate.
5. Never invent contact details, fees, requirements, or policies not explicitly written in the context.`;

  try {
    const prompt = `KNOWLEDGE BASE CONTEXT:
${knowledgeContext}

USER QUESTION:
${query}

Please provide a concise answer strictly based on the Knowledge Base context:`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.1, // Near-zero temperature for maximum factual fidelity
          },
        });

        const generatedText = response.text?.trim();
        if (generatedText) {
          const isRefusal = generatedText.includes(FALLBACK_MESSAGE) || generatedText.includes('could not find this information');
          return {
            answer: isRefusal ? FALLBACK_MESSAGE : generatedText,
            citations: isRefusal ? [] : citations,
            matched: !isRefusal,
          };
        }
      } catch (modelErr: any) {
        console.warn(`[KnowledgeEngine] Model ${model} generation failed (${modelErr?.status || modelErr?.message}), trying next model...`);
      }
    }

    // Direct synthesized fallback from retrieved FAQ or Document snippet if AI generation fails
    if (relevantFaqs.length > 0) {
      return {
        answer: relevantFaqs[0].answer,
        citations,
        matched: true,
      };
    } else if (relevantChunks.length > 0) {
      return {
        answer: relevantChunks[0].content,
        citations,
        matched: true,
      };
    }

    return {
      answer: FALLBACK_MESSAGE,
      citations: [],
      matched: false,
    };
  } catch (err: any) {
    console.error('[KnowledgeEngine] Gemini generation error:', err);
    if (relevantFaqs.length > 0) {
      return {
        answer: relevantFaqs[0].answer,
        citations,
        matched: true,
      };
    }
    return {
      answer: FALLBACK_MESSAGE,
      citations: [],
      matched: false,
    };
  }
}
