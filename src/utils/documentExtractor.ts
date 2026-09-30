import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';

// Set up worker for PDF.js in browser
try {
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  }
} catch {
  // worker fallback
}

export interface ExtractedDocument {
  text: string;
  pages: number;
  characters: number;
}

/**
 * Extract text from PDF file (Client-side / Browser compatible)
 */
export async function extractTextFromPdfFile(fileOrBuffer: File | ArrayBuffer | Uint8Array): Promise<ExtractedDocument> {
  console.log('[DocumentExtractor] Starting PDF extraction...');
  try {
    let data: Uint8Array;
    if (fileOrBuffer instanceof File) {
      const buf = await fileOrBuffer.arrayBuffer();
      data = new Uint8Array(buf);
    } else if (fileOrBuffer instanceof Uint8Array) {
      data = fileOrBuffer;
    } else {
      data = new Uint8Array(fileOrBuffer);
    }

    const loadingTask = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
    } as any);

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages || 1;
    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .filter((s: string) => s.trim().length > 0)
          .join(' ');

        if (pageText.trim()) {
          fullText += pageText + '\n\n';
        }
      } catch (pageErr) {
        console.warn(`[DocumentExtractor] Warning extracting page ${pageNum}:`, pageErr);
      }
    }

    const cleanedText = fullText.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '').trim();

    if (!cleanedText || cleanedText.length < 10) {
      throw new Error('Unable to extract text from this document. Please upload a readable PDF or add content manually.');
    }

    console.log(`[DocumentExtractor] Successfully extracted ${cleanedText.length} chars from ${numPages} page(s) in PDF.`);
    return {
      text: cleanedText,
      pages: numPages,
      characters: cleanedText.length,
    };
  } catch (err: any) {
    console.error('[DocumentExtractor] PDF extraction error:', err);
    throw new Error('Unable to extract text from this document. Please upload a readable PDF or add content manually.');
  }
}

/**
 * Extract text from DOCX file using mammoth
 */
export async function extractTextFromDocxFile(fileOrBuffer: File | ArrayBuffer): Promise<ExtractedDocument> {
  console.log('[DocumentExtractor] Starting DOCX extraction...');
  try {
    let arrayBuffer: ArrayBuffer;
    if (fileOrBuffer instanceof File) {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else {
      arrayBuffer = fileOrBuffer;
    }

    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result?.value ? result.value.trim() : '';

    if (!text || text.length < 10) {
      throw new Error('Unable to extract text from this document. Please upload a readable PDF or add content manually.');
    }

    const pages = Math.max(1, Math.ceil(text.length / 2500));
    console.log(`[DocumentExtractor] Successfully extracted ${text.length} chars from DOCX.`);
    return {
      text,
      pages,
      characters: text.length,
    };
  } catch (err: any) {
    console.error('[DocumentExtractor] DOCX extraction error:', err);
    throw new Error('Unable to extract text from this document. Please upload a readable PDF or add content manually.');
  }
}

/**
 * Extract text from TXT file
 */
export async function extractTextFromTxtFile(fileOrText: File | string): Promise<ExtractedDocument> {
  console.log('[DocumentExtractor] Starting TXT extraction...');
  try {
    let text = '';
    if (fileOrText instanceof File) {
      text = await fileOrText.text();
    } else {
      text = fileOrText;
    }

    text = text.trim();
    if (!text || text.length < 5) {
      throw new Error('Unable to extract text from this document. Please upload a readable PDF or add content manually.');
    }

    const pages = Math.max(1, Math.ceil(text.length / 2500));
    console.log(`[DocumentExtractor] Successfully extracted ${text.length} chars from TXT.`);
    return {
      text,
      pages,
      characters: text.length,
    };
  } catch (err: any) {
    console.error('[DocumentExtractor] TXT extraction error:', err);
    throw new Error('Unable to extract text from this document. Please upload a readable PDF or add content manually.');
  }
}
