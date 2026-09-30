import { supabase } from '../lib/supabase';
import {
  extractTextFromPdfFile,
  extractTextFromDocxFile,
  extractTextFromTxtFile,
} from '../utils/documentExtractor';

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

export interface KnowledgeDocumentRecord {
  id: string | number;
  title: string;
  file_name?: string | null;
  file_type: 'pdf' | 'docx' | 'txt' | 'text_entry' | 'url';
  source_type?: 'pdf' | 'docx' | 'txt' | 'text_entry' | 'url';
  file_size?: number;
  category: string;
  extracted_text: string;
  content?: string;
  created_at?: string;
  updated_at?: string;
  chunk_count?: number;
  page_count?: number;
  char_count?: number;
  status?: 'indexed' | 'processing' | 'failed';
}

export interface KnowledgeChunkRecord {
  id?: string | number;
  document_id: string | number;
  chunk_text: string;
  chunk_index: number;
  created_at?: string;
}

export interface KnowledgeStats {
  totalDocuments: number;
  totalTextEntries: number;
  totalChunks: number;
  lastUpdated: string;
}

export interface ExtractionPreviewData {
  fileName: string;
  pages: number;
  charactersExtracted: number;
  previewText: string;
  chunkCount: number;
}

export interface ChatCitation {
  source: string;
  category?: string;
  snippet: string;
}

export interface ChatQueryResult {
  answer: string;
  citations: ChatCitation[];
  matched: boolean;
}

/**
 * Splits text into chunks of 500 - 1000 characters.
 * Preserves sentence and word boundaries where possible.
 */
export function chunkTextIntoSegments(
  text: string,
  minChars = 500,
  maxChars = 1000,
  overlapChars = 80
): string[] {
  const cleaned = (text || '').replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];

  if (cleaned.length <= maxChars) {
    return [cleaned];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < cleaned.length) {
    let endIndex = Math.min(startIndex + maxChars, cleaned.length);

    if (endIndex < cleaned.length) {
      // Look for sentence break (. \n\n \n ? !) between minChars and maxChars
      const windowStr = cleaned.slice(startIndex + minChars, endIndex);
      const breakMatch = windowStr.match(/(\.\s+|\n\n|\n|\?\s+|\!\s+)/g);

      if (breakMatch && breakMatch.length > 0) {
        const lastBreak = breakMatch[breakMatch.length - 1];
        const lastBreakIdx = windowStr.lastIndexOf(lastBreak);
        endIndex = startIndex + minChars + lastBreakIdx + lastBreak.length;
      } else {
        const spaceIdx = windowStr.lastIndexOf(' ');
        if (spaceIdx !== -1) {
          endIndex = startIndex + minChars + spaceIdx + 1;
        }
      }
    }

    const chunk = cleaned.slice(startIndex, endIndex).trim();
    if (chunk.length >= 20) {
      chunks.push(chunk);
    }

    if (endIndex >= cleaned.length) break;
    startIndex = Math.max(startIndex + minChars, endIndex - overlapChars);
  }

  console.log(`[Chunking] Split text (${cleaned.length} chars) into ${chunks.length} chunks (500-1000 chars each).`);
  return chunks;
}

/**
 * 1. Upload Document (PDF, DOCX, TXT)
 * Extracts text, chunks into 500-1000 chars, saves in Supabase
 */
export async function uploadKnowledgeDocument(
  file: File,
  category: KnowledgeCategory | string = 'General',
  customTitle?: string
): Promise<{ document: KnowledgeDocumentRecord; extraction: ExtractionPreviewData }> {
  console.log('[KnowledgeService] Starting Document Upload:', {
    fileName: file.name,
    fileSize: file.size,
    category,
    customTitle,
  });

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext !== 'pdf' && ext !== 'docx' && ext !== 'txt') {
    throw new Error('Supported file formats: PDF (.pdf), Word (.docx), and Plain Text (.txt).');
  }

  const fileType = ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : 'txt';

  // Step 1: Text Extraction
  let extracted: { text: string; pages: number; characters: number };
  console.log(`[KnowledgeService] Extracting text for ${file.name} (${fileType})...`);

  try {
    if (fileType === 'pdf') {
      extracted = await extractTextFromPdfFile(file);
    } else if (fileType === 'docx') {
      extracted = await extractTextFromDocxFile(file);
    } else {
      extracted = await extractTextFromTxtFile(file);
    }
  } catch (err: any) {
    console.error('[KnowledgeService] Extraction error:', err);
    throw new Error('Unable to extract text from this document. Please upload a readable PDF or add content manually.');
  }

  if (!extracted.text || extracted.text.trim().length < 10) {
    throw new Error('Unable to extract text from this document. Please upload a readable PDF or add content manually.');
  }

  const fullText = extracted.text.trim();
  const title = (customTitle && customTitle.trim())
    ? customTitle.trim()
    : file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  // Step 2: Chunking (500-1000 characters)
  const chunkTexts = chunkTextIntoSegments(fullText, 500, 1000, 80);
  console.log(`[KnowledgeService] Generated ${chunkTexts.length} chunks for "${title}".`);

  // Step 3: Insert into knowledge_documents
  console.log('[Supabase Insert] Inserting record into knowledge_documents...', {
    title,
    file_name: file.name,
    file_type: fileType,
    file_size: file.size,
    category,
    char_count: fullText.length,
  });

  const { data: docData, error: docErr } = await supabase
    .from('knowledge_documents')
    .insert([
      {
        title,
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        category: category || 'General',
        extracted_text: fullText,
        content: fullText,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (docErr || !docData) {
    console.error('[Supabase Insert Error] Failed inserting document:', docErr);
    throw new Error(`Failed to save document in database: ${docErr?.message || 'Unknown database error'}`);
  }

  const documentId = docData.id;
  console.log('[Supabase Insert Success] Document saved with ID:', documentId);

  // Step 4: Insert chunks into knowledge_chunks
  if (chunkTexts.length > 0) {
    const chunkRows = chunkTexts.map((chunkText, idx) => ({
      document_id: documentId,
      chunk_text: chunkText,
      chunk_index: idx,
      created_at: new Date().toISOString(),
    }));

    console.log(`[Supabase Insert] Inserting ${chunkRows.length} chunks into knowledge_chunks for doc ID ${documentId}...`);
    const { error: chunkErr } = await supabase
      .from('knowledge_chunks')
      .insert(chunkRows);

    if (chunkErr) {
      console.error('[Supabase Insert Error] Failed inserting chunks:', chunkErr);
      // Non-fatal: document was saved, attempt single chunk fallback
      await supabase.from('knowledge_chunks').insert([
        {
          document_id: documentId,
          chunk_text: fullText.slice(0, 1000),
          chunk_index: 0,
        },
      ]);
    } else {
      console.log(`[Supabase Insert Success] Successfully inserted ${chunkRows.length} chunks into knowledge_chunks.`);
    }
  }

  const extractionPreview: ExtractionPreviewData = {
    fileName: file.name,
    pages: extracted.pages,
    charactersExtracted: fullText.length,
    previewText: fullText.slice(0, 1500) + (fullText.length > 1500 ? '...' : ''),
    chunkCount: chunkTexts.length,
  };

  const documentRecord: KnowledgeDocumentRecord = {
    id: docData.id,
    title: docData.title,
    file_name: docData.file_name,
    file_type: docData.file_type,
    file_size: docData.file_size,
    category: docData.category,
    extracted_text: docData.extracted_text,
    content: docData.content,
    created_at: docData.created_at,
    updated_at: docData.updated_at,
    chunk_count: chunkTexts.length,
    page_count: extracted.pages,
    char_count: fullText.length,
  };

  return { document: documentRecord, extraction: extractionPreview };
}

/**
 * 2. Add Text Knowledge Entry (Paste Text without file upload)
 */
export async function addTextKnowledgeEntry(
  title: string,
  category: KnowledgeCategory | string = 'General',
  content: string
): Promise<{ document: KnowledgeDocumentRecord; extraction: ExtractionPreviewData }> {
  const cleanTitle = title.trim();
  const cleanContent = content.trim();

  if (!cleanTitle || !cleanContent) {
    throw new Error('Title and content are required for manual text knowledge entry.');
  }

  console.log('[KnowledgeService] Adding Manual Text Knowledge:', {
    title: cleanTitle,
    category,
    contentLength: cleanContent.length,
  });

  // Step 1: Chunk content (500-1000 chars)
  const chunkTexts = chunkTextIntoSegments(cleanContent, 500, 1000, 80);

  // Step 2: Insert into knowledge_documents
  console.log('[Supabase Insert] Inserting manual text into knowledge_documents...');
  const { data: docData, error: docErr } = await supabase
    .from('knowledge_documents')
    .insert([
      {
        title: cleanTitle,
        file_name: `${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.txt`,
        file_type: 'text_entry',
        file_size: cleanContent.length,
        category: category || 'General',
        extracted_text: cleanContent,
        content: cleanContent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (docErr || !docData) {
    console.error('[Supabase Insert Error] Failed inserting text entry:', docErr);
    throw new Error(`Failed to save text entry in database: ${docErr?.message || 'Database error'}`);
  }

  const documentId = docData.id;
  console.log('[Supabase Insert Success] Manual text saved with ID:', documentId);

  // Step 3: Insert chunks into knowledge_chunks
  if (chunkTexts.length > 0) {
    const chunkRows = chunkTexts.map((chunkText, idx) => ({
      document_id: documentId,
      chunk_text: chunkText,
      chunk_index: idx,
      created_at: new Date().toISOString(),
    }));

    const { error: chunkErr } = await supabase
      .from('knowledge_chunks')
      .insert(chunkRows);

    if (chunkErr) {
      console.warn('[Supabase Insert Warning] Chunk insert warning:', chunkErr);
    } else {
      console.log(`[Supabase Insert Success] Successfully inserted ${chunkRows.length} chunks into knowledge_chunks.`);
    }
  }

  const pageCount = Math.max(1, Math.ceil(cleanContent.length / 2500));
  const extractionPreview: ExtractionPreviewData = {
    fileName: cleanTitle,
    pages: pageCount,
    charactersExtracted: cleanContent.length,
    previewText: cleanContent.slice(0, 1500) + (cleanContent.length > 1500 ? '...' : ''),
    chunkCount: chunkTexts.length,
  };

  const documentRecord: KnowledgeDocumentRecord = {
    id: docData.id,
    title: docData.title,
    file_name: docData.file_name,
    file_type: docData.file_type,
    file_size: docData.file_size,
    category: docData.category,
    extracted_text: docData.extracted_text,
    content: docData.content,
    created_at: docData.created_at,
    updated_at: docData.updated_at,
    chunk_count: chunkTexts.length,
    page_count: pageCount,
    char_count: cleanContent.length,
  };

  return { document: documentRecord, extraction: extractionPreview };
}

/**
 * 3. Edit Text Knowledge Entry
 */
export async function editTextKnowledgeEntry(
  id: string | number,
  title: string,
  category: string,
  content: string
): Promise<KnowledgeDocumentRecord> {
  const cleanTitle = title.trim();
  const cleanContent = content.trim();

  if (!cleanTitle || !cleanContent) {
    throw new Error('Title and content are required.');
  }

  console.log(`[KnowledgeService] Updating document ID ${id}...`);

  // Update document record
  const { data: updatedDoc, error: updateErr } = await supabase
    .from('knowledge_documents')
    .update({
      title: cleanTitle,
      category: category || 'General',
      extracted_text: cleanContent,
      content: cleanContent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateErr || !updatedDoc) {
    console.error('[KnowledgeService] Update error:', updateErr);
    throw new Error(`Failed to update knowledge entry: ${updateErr?.message || 'Database error'}`);
  }

  // Delete previous chunks
  await supabase.from('knowledge_chunks').delete().eq('document_id', id);

  // Generate new chunks
  const chunkTexts = chunkTextIntoSegments(cleanContent, 500, 1000, 80);
  if (chunkTexts.length > 0) {
    const chunkRows = chunkTexts.map((chunkText, idx) => ({
      document_id: id,
      chunk_text: chunkText,
      chunk_index: idx,
      created_at: new Date().toISOString(),
    }));
    await supabase.from('knowledge_chunks').insert(chunkRows);
  }

  return {
    ...updatedDoc,
    chunk_count: chunkTexts.length,
    char_count: cleanContent.length,
    page_count: Math.max(1, Math.ceil(cleanContent.length / 2500)),
  };
}

/**
 * 4. Delete Knowledge Document & associated Chunks
 */
export async function deleteKnowledgeDocument(id: string | number): Promise<boolean> {
  console.log(`[KnowledgeService] Deleting document ID ${id}...`);
  try {
    // 1. Delete associated chunks
    await supabase.from('knowledge_chunks').delete().eq('document_id', id);

    // 2. Delete document
    const { error } = await supabase.from('knowledge_documents').delete().eq('id', id);
    if (error) {
      console.error('[KnowledgeService] Delete error:', error);
      throw error;
    }
    console.log(`[KnowledgeService] Document ${id} deleted successfully.`);
    return true;
  } catch (err: any) {
    console.error('[KnowledgeService] Error deleting document:', err);
    throw new Error(`Failed to delete document: ${err.message || 'Database error'}`);
  }
}

/**
 * 5. Rebuild Chunks for a single document
 */
export async function rebuildDocumentChunks(id: string | number): Promise<number> {
  console.log(`[KnowledgeService] Rebuilding chunks for document ID ${id}...`);
  const { data: doc, error } = await supabase
    .from('knowledge_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !doc) {
    throw new Error(`Document not found: ${error?.message || ''}`);
  }

  const textToChunk = (doc.extracted_text || doc.content || '').trim();
  if (!textToChunk) {
    return 0;
  }

  const chunks = chunkTextIntoSegments(textToChunk, 500, 1000, 80);

  // Clear existing chunks
  await supabase.from('knowledge_chunks').delete().eq('document_id', id);

  if (chunks.length > 0) {
    const chunkRows = chunks.map((c, idx) => ({
      document_id: id,
      chunk_text: c,
      chunk_index: idx,
      created_at: new Date().toISOString(),
    }));
    await supabase.from('knowledge_chunks').insert(chunkRows);
  }

  console.log(`[KnowledgeService] Rebuilt ${chunks.length} chunks for document ${id}.`);
  return chunks.length;
}

/**
 * 6. Rebuild Chunks for all documents in Knowledge Base
 */
export async function rebuildAllKnowledgeChunks(): Promise<{
  documentsReindexed: number;
  totalChunks: number;
}> {
  console.log('[KnowledgeService] Rebuilding chunks for ALL documents in Supabase...');
  const { data: docs, error } = await supabase.from('knowledge_documents').select('*');

  if (error || !docs) {
    throw new Error(`Failed to load documents: ${error?.message || ''}`);
  }

  let totalChunks = 0;
  for (const doc of docs) {
    const textToChunk = (doc.extracted_text || doc.content || '').trim();
    if (!textToChunk) continue;

    const chunks = chunkTextIntoSegments(textToChunk, 500, 1000, 80);
    await supabase.from('knowledge_chunks').delete().eq('document_id', doc.id);

    if (chunks.length > 0) {
      const chunkRows = chunks.map((c, idx) => ({
        document_id: doc.id,
        chunk_text: c,
        chunk_index: idx,
        created_at: new Date().toISOString(),
      }));
      await supabase.from('knowledge_chunks').insert(chunkRows);
      totalChunks += chunks.length;
    }
  }

  console.log(`[KnowledgeService] Complete. Rebuilt ${totalChunks} chunks across ${docs.length} documents.`);
  return {
    documentsReindexed: docs.length,
    totalChunks,
  };
}

/**
 * 7. Get Knowledge Base Statistics
 */
export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  try {
    const [docsRes, textEntriesRes, chunksRes] = await Promise.all([
      supabase.from('knowledge_documents').select('id, created_at, updated_at', { count: 'exact' }),
      supabase.from('knowledge_documents').select('id', { count: 'exact', head: true }).eq('file_type', 'text_entry'),
      supabase.from('knowledge_chunks').select('id', { count: 'exact', head: true }),
    ]);

    const totalDocs = docsRes.count ?? docsRes.data?.length ?? 0;
    const totalTextEntries = textEntriesRes.count ?? 0;
    const totalChunks = chunksRes.count ?? 0;

    let lastUpdated = 'Never';
    if (docsRes.data && docsRes.data.length > 0) {
      const dates = docsRes.data
        .map((d) => d.updated_at || d.created_at)
        .filter(Boolean)
        .sort()
        .reverse();
      if (dates.length > 0) {
        lastUpdated = new Date(dates[0]).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    return {
      totalDocuments: totalDocs,
      totalTextEntries,
      totalChunks,
      lastUpdated,
    };
  } catch (err) {
    console.error('[KnowledgeService] Error getting stats:', err);
    return {
      totalDocuments: 0,
      totalTextEntries: 0,
      totalChunks: 0,
      lastUpdated: 'Unavailable',
    };
  }
}

/**
 * 8. List Knowledge Base Documents with optional filters
 */
export async function listKnowledgeDocuments(
  category?: string,
  search?: string,
  sourceType?: string
): Promise<KnowledgeDocumentRecord[]> {
  try {
    let query = supabase
      .from('knowledge_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.ilike('category', `%${category}%`);
    }

    if (sourceType && sourceType !== 'all') {
      query = query.eq('file_type', sourceType);
    }

    const { data: docs, error } = await query;
    if (error) throw error;
    if (!docs) return [];

    // Also get chunk counts for each document
    const { data: allChunks } = await supabase
      .from('knowledge_chunks')
      .select('document_id');

    const chunkCountMap: Record<string | number, number> = {};
    if (allChunks) {
      for (const ch of allChunks) {
        chunkCountMap[ch.document_id] = (chunkCountMap[ch.document_id] || 0) + 1;
      }
    }

    let results: KnowledgeDocumentRecord[] = docs.map((d) => {
      const content = d.extracted_text || d.content || '';
      const fType = d.file_type || (d.file_name?.endsWith('.pdf') ? 'pdf' : 'text_entry');
      return {
        id: d.id,
        title: d.title,
        file_name: d.file_name,
        file_type: fType,
        source_type: fType,
        file_size: d.file_size || content.length,
        category: d.category || 'General',
        extracted_text: content,
        content: content,
        created_at: d.created_at,
        updated_at: d.updated_at,
        chunk_count: chunkCountMap[d.id] || 0,
        page_count: Math.max(1, Math.ceil(content.length / 2500)),
        char_count: content.length,
        status: 'indexed',
      };
    });

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      results = results.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.file_name && d.file_name.toLowerCase().includes(q)) ||
          d.category.toLowerCase().includes(q) ||
          d.extracted_text.toLowerCase().includes(q)
      );
    }

    return results;
  } catch (err) {
    console.error('[KnowledgeService] Error listing documents:', err);
    return [];
  }
}

/**
 * 9. Get single document preview with its chunks
 */
export async function getDocumentWithChunks(id: string | number): Promise<{
  document: KnowledgeDocumentRecord;
  chunks: KnowledgeChunkRecord[];
} | null> {
  try {
    const { data: doc, error: docErr } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (docErr || !doc) return null;

    const { data: chunks, error: chunkErr } = await supabase
      .from('knowledge_chunks')
      .select('*')
      .eq('document_id', id)
      .order('chunk_index', { ascending: true });

    const content = doc.extracted_text || doc.content || '';
    const chunkList = (chunkErr || !chunks) ? [] : chunks;

    return {
      document: {
        id: doc.id,
        title: doc.title,
        file_name: doc.file_name,
        file_type: doc.file_type,
        file_size: doc.file_size,
        category: doc.category,
        extracted_text: content,
        content: content,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        chunk_count: chunkList.length,
        page_count: Math.max(1, Math.ceil(content.length / 2500)),
        char_count: content.length,
      },
      chunks: chunkList,
    };
  } catch (err) {
    console.error('[KnowledgeService] Error getting document preview:', err);
    return null;
  }
}

/**
 * 10. Search Knowledge Chunks for Chatbot & RAG
 * Finds relevant chunks using term frequency and keyword matching
 */
export async function searchKnowledgeChunks(query: string, limit = 5): Promise<{
  chunk: KnowledgeChunkRecord;
  documentTitle: string;
  category: string;
  score: number;
}[]> {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  console.log(`[Chatbot Retrieval] Searching knowledge_chunks for query: "${query}"...`);

  // Stop words to remove from keyword weighting
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'about', 'how', 'what', 'when', 'where', 'which',
    'who', 'why', 'can', 'you', 'i', 'my', 'me', 'we', 'our', 'do', 'does', 'please',
    'tell', 'give', 'any', 'some', 'there', 'this', 'that'
  ]);

  const queryTerms = cleanQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));

  console.log('[Chatbot Retrieval] Extracted search terms:', queryTerms);

  // Fetch all chunks with their document title & category
  const { data: chunks, error: chunksErr } = await supabase
    .from('knowledge_chunks')
    .select('id, document_id, chunk_text, chunk_index, created_at');

  if (chunksErr || !chunks || chunks.length === 0) {
    console.log('[Chatbot Retrieval] No chunks found in knowledge_chunks table.');
    return [];
  }

  // Fetch documents for metadata
  const { data: docs } = await supabase
    .from('knowledge_documents')
    .select('id, title, category');

  const docMap = new Map<string | number, { title: string; category: string }>();
  if (docs) {
    for (const d of docs) {
      docMap.set(d.id, { title: d.title, category: d.category });
    }
  }

  // Score each chunk
  const scoredResults: {
    chunk: KnowledgeChunkRecord;
    documentTitle: string;
    category: string;
    score: number;
  }[] = [];

  for (const ch of chunks) {
    const chunkTextLower = (ch.chunk_text || '').toLowerCase();
    const docMeta = docMap.get(ch.document_id) || { title: 'Mana Naukari Document', category: 'General' };
    const docTitleLower = docMeta.title.toLowerCase();

    let score = 0;

    // Exact phrase match gives heavy weight
    if (cleanQuery.length > 5 && chunkTextLower.includes(cleanQuery)) {
      score += 50;
    }

    // Exact phrase in document title gives heavy weight
    if (cleanQuery.length > 5 && docTitleLower.includes(cleanQuery)) {
      score += 40;
    }

    // Check individual keywords
    for (const term of queryTerms) {
      if (chunkTextLower.includes(term)) {
        // Frequency of term in chunk
        const count = (chunkTextLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
        score += count > 0 ? 10 + count * 3 : 5;
      }

      if (docTitleLower.includes(term)) {
        score += 15;
      }

      if (docMeta.category.toLowerCase().includes(term)) {
        score += 10;
      }
    }

    if (score > 0) {
      scoredResults.push({
        chunk: ch,
        documentTitle: docMeta.title,
        category: docMeta.category,
        score,
      });
    }
  }

  scoredResults.sort((a, b) => b.score - a.score);
  const topResults = scoredResults.slice(0, limit);

  console.log(`[Chatbot Retrieval] Found ${scoredResults.length} matching chunks. Returning top ${topResults.length}:`,
    topResults.map((r) => ({ doc: r.documentTitle, score: r.score, snippet: r.chunk.chunk_text.slice(0, 60) }))
  );

  return topResults;
}

/**
 * Check if the user query is completely unrelated to Mana Naukari domains
 */
function isUnrelatedTopic(query: string): boolean {
  const q = query.toLowerCase().trim();
  const domainKeywords = [
    'mana', 'naukari', 'job', 'jobs', 'intern', 'internship', 'resume', 'ats',
    'portfolio', 'recruiter', 'hire', 'hiring', 'interview', 'salary', 'fresher',
    'campus', 'career', 'service', 'apply', 'application', 'company', 'vacanc',
    'role', 'drive', 'off-campus', 'support', 'contact', 'post', 'developer', 'engineer',
    'tech', 'it', 'wfh', 'work from home', 'policy', 'refund', 'verification'
  ];

  const hasDomainKeyword = domainKeywords.some((k) => q.includes(k));
  if (hasDomainKeyword) return false;

  // Obvious non-career topics
  const unrelatedPatterns = [
    /\b(recipe|cook|bake|food|dish|pizza|burger)\b/,
    /\b(cricket|football|match|score|ipl|fifa)\b/,
    /\b(movie|cinema|actor|actress|song|lyrics|trailer)\b/,
    /\b(weather|temperature|forecast|rain)\b/,
    /\b(solve|math|equation|calculate|integral|derivative)\b/,
    /\b(joke|riddle|poem|story)\b/,
    /\b(capital of|president of|prime minister of)\b/,
  ];

  return unrelatedPatterns.some((pattern) => pattern.test(q));
}

/**
 * 11. AI Chatbot RAG Answer Generation
 * Strictly answers only from retrieved knowledge chunks
 */
export async function queryChatbotRag(
  userQuery: string,
  history?: { role: 'user' | 'model'; content: string }[]
): Promise<ChatQueryResult> {
  const query = userQuery.trim();
  console.log(`[Chatbot RAG] Query received: "${query}"`);

  // Step 1: Check for unrelated questions
  if (isUnrelatedTopic(query)) {
    const unrelatedResponse =
      'I can assist with Mana Naukari jobs, internships, resume services, portfolio services, recruiter services, and information available in the Knowledge Base.';

    // Save conversation to Supabase
    saveChatConversation(query, unrelatedResponse, 'Policy: Domain Restriction');
    return {
      answer: unrelatedResponse,
      citations: [],
      matched: false,
    };
  }

  // Step 2: Retrieve relevant chunks from Supabase
  const matchedChunks = await searchKnowledgeChunks(query, 5);

  if (!matchedChunks || matchedChunks.length === 0 || matchedChunks[0].score < 10) {
    console.log('[Chatbot RAG] No matching knowledge chunks found in database.');
    const notFoundResponse = 'I could not find this information in the Mana Naukari Knowledge Base.';

    // Save conversation to Supabase
    saveChatConversation(query, notFoundResponse, null);
    return {
      answer: notFoundResponse,
      citations: [],
      matched: false,
    };
  }

  // Prepare retrieved context
  const retrievedContext = matchedChunks
    .map((item, idx) => `[Source ${idx + 1}: "${item.documentTitle}" (${item.category})]\n${item.chunk.chunk_text}`)
    .join('\n\n---\n\n');

  const citations: ChatCitation[] = matchedChunks.slice(0, 3).map((item) => ({
    source: item.documentTitle,
    category: item.category,
    snippet: item.chunk.chunk_text.slice(0, 150) + (item.chunk.chunk_text.length > 150 ? '...' : ''),
  }));

  // Step 3: Call Server-side AI endpoint if available, or fall back to synthesis
  let answer = '';
  try {
    const res = await fetch('/api/knowledge/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        retrievedContext,
        history: history || [],
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.answer) {
        answer = data.answer;
      }
    }
  } catch (apiErr) {
    console.warn('[Chatbot RAG] Server endpoint unavailable, using client synthesis fallback:', apiErr);
  }

  // If server-side wasn't available (e.g. Netlify static SPA), synthesize answer directly from chunks
  if (!answer) {
    answer = synthesizeAnswerFromChunks(query, matchedChunks);
  }

  // Double check anti-hallucination guarantee: if answer is empty
  if (!answer || answer.trim().length === 0) {
    answer = 'I could not find this information in the Mana Naukari Knowledge Base.';
  }

  // Save conversation to Supabase
  saveChatConversation(query, answer, matchedChunks[0]?.documentTitle || 'Knowledge Base');

  return {
    answer,
    citations,
    matched: true,
  };
}

/**
 * Intelligent client-side synthesis directly from verified chunks when offline or on Netlify
 */
function synthesizeAnswerFromChunks(
  query: string,
  matched: { chunk: KnowledgeChunkRecord; documentTitle: string; category: string; score: number }[]
): string {
  if (matched.length === 0) {
    return 'I could not find this information in the Mana Naukari Knowledge Base.';
  }

  const primary = matched[0];
  const chunkText = primary.chunk.chunk_text.trim();

  // Find most relevant sentence or paragraph within the top chunk
  const sentences = chunkText.split(/(?<=[.?!])\s+/);
  const qTerms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  const scoredSentences = sentences.map((s) => {
    const sLower = s.toLowerCase();
    const count = qTerms.filter((t) => sLower.includes(t)).length;
    return { sentence: s, count };
  });

  scoredSentences.sort((a, b) => b.count - a.count);
  const bestSentences = scoredSentences.filter((s) => s.count > 0).slice(0, 3).map((s) => s.sentence);

  if (bestSentences.length > 0) {
    return `${bestSentences.join(' ')}\n\n(Information from: ${primary.documentTitle})`;
  }

  return `${chunkText.slice(0, 500)}${chunkText.length > 500 ? '...' : ''}\n\n(Information from: ${primary.documentTitle})`;
}

/**
 * Save chat query and answer into Supabase ai_conversations table
 */
export async function saveChatConversation(
  question: string,
  answer: string,
  sourceDocument?: string | null
): Promise<void> {
  try {
    await supabase.from('ai_conversations').insert([
      {
        question: question.trim(),
        answer: answer.trim(),
        source_document: sourceDocument || null,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.warn('[KnowledgeService] Conversation log warning:', err);
  }
}

/**
 * Seed initial default Knowledge Base documents if database is completely empty
 */
export async function seedInitialKnowledgeIfEmpty(): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('knowledge_documents')
      .select('id', { count: 'exact', head: true });

    if (error || (count && count > 0)) {
      return false; // Already populated
    }

    console.log('[KnowledgeService] Knowledge Base is empty. Seeding initial Mana Naukari knowledge documents...');

    const initialDocs = [
      {
        title: 'Mana Naukari Platform Overview & Candidate Guidelines',
        category: 'Company Information',
        content: `Mana Naukari is a dedicated Indian employment and career discovery platform connecting freshers, campus graduates, internship seekers, and early-career professionals directly with verified hiring companies and official career portal opportunities.
All job requisitions on Mana Naukari link directly to official corporate career portals (Workday, Greenhouse, Lever, Google Forms, or official HR sites).
Mana Naukari is 100% free for candidates and job seekers. We never charge any middleman fees, registration fees, or application fees.
We verify every listing manually to ensure there are no fraudulent schemes, multi-level marketing, or fee demands.
Candidates can reach support through the Contact page or email support@mananaukari.in.`,
      },
      {
        title: 'ATS Resume Review & Optimization Service',
        category: 'Resume Review',
        content: `The Mana Naukari ATS Resume Review service is a professional service where career coaches and recruitment experts evaluate candidate resumes against Applicant Tracking Systems (ATS).
Key features of the service include:
1. ATS Compatibility Check: Verifying that standard ATS scanners (Workday, Taleo, Greenhouse) can accurately parse headings, work experience, and educational background.
2. Keyword Optimization: Recommending industry-standard technical and domain keywords based on the candidate's target job role.
3. Formatting & Design: Removing complex graphics, text boxes, and tables that break ATS parsers, replacing them with clean, single-column or modern ATS-friendly layouts.
4. Actionable Report: Delivering a personalized, point-by-point feedback report and recommended edits within 24 to 48 hours.`,
      },
      {
        title: 'Recruiter Services & Job Posting Verification Policy',
        category: 'Recruiter Services',
        content: `Recruiters and corporate talent acquisition teams can register on the Mana Naukari Recruiter Portal to post job openings and discover verified entry-level talent.
Verification Policy:
1. Every recruiter must register using an official company email address (free public domains like @gmail.com or @yahoo.com require additional corporate documentation).
2. The administration team verifies the company website, corporate registration, and posting authenticity before approving job listings.
3. Once approved, the recruiter's listings go live on the public job board.
4. Recruiters can view applicant analytics, review candidate applications, and contact shortlisted candidates directly from the Recruiter Dashboard.
5. Postings demanding money or sensitive financial details from job seekers are strictly prohibited and result in immediate termination of the recruiter account.`,
      },
      {
        title: 'Internship & Fresher Job Categories',
        category: 'Jobs',
        content: `Mana Naukari features job and internship opportunities across key career categories:
1. Software Engineering & Development: Frontend (React, Angular), Backend (Java, Node.js, Python), Full Stack, Mobile App Development (Flutter, Android).
2. Data & Analytics: Data Analyst Intern, Machine Learning Trainee, Business Analyst, SQL and PowerBI roles.
3. QA & Software Testing: Manual Testing, Automation with Selenium and Cypress, Performance Testing.
4. Cloud & DevOps: AWS, Azure, Linux Administration, Docker, CI/CD pipeline internships.
5. Work From Home (WFH): Remote tech support, digital marketing, content writing, and remote software engineering for freshers.
All opportunities are indexed with experience levels (Fresher, 0-1 Years, 1-3 Years) and salary/stipend ranges.`,
      },
      {
        title: 'Technical Portfolio Review & Career Mentorship',
        category: 'Portfolio Service',
        content: `The Mana Naukari Portfolio Service helps software engineering and design candidates showcase their practical projects effectively to tech hiring managers.
Our mentors provide:
- GitHub Profile Optimization: structuring README files, pinning relevant repositories, demonstrating Git workflow discipline.
- Live Web Deployment Guidance: hosting demo apps on Vercel, Netlify, or Render to provide instant working links for recruiters.
- Design Portfolios: reviewing Figma and Behance case studies for UI/UX aspiring designers.
- Code Quality Checks: evaluating clean architecture, documentation, and unit tests in candidate projects.`,
      },
    ];

    for (const doc of initialDocs) {
      await addTextKnowledgeEntry(doc.title, doc.category, doc.content);
    }

    console.log('[KnowledgeService] Successfully seeded initial knowledge documents!');
    return true;
  } catch (seedErr) {
    console.warn('[KnowledgeService] Seed initial knowledge warning:', seedErr);
    return false;
  }
}
