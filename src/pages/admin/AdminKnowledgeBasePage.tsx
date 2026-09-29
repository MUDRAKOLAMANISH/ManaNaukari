import React, { useState, useEffect, useMemo } from 'react';
import { AdminHeader } from '../../components/admin/AdminHeader';
import {
  FileText, Upload, Plus, Trash2, RefreshCw, Sparkles,
  HelpCircle, Database, CheckCircle2, AlertCircle, FileCheck,
  Search, ExternalLink, Bot, ArrowRight, X, Clock, Edit3,
  Eye, Layers, BookOpen, Globe, AlignLeft, Info
} from 'lucide-react';

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

interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  source_type: 'pdf' | 'docx' | 'txt' | 'text_entry' | 'url';
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

interface KnowledgeFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface KnowledgeStats {
  totalDocuments: number;
  totalTextEntries: number;
  totalChunks: number;
  lastUpdated: string;
  faqCount?: number;
}

interface ExtractionPreviewData {
  fileName: string;
  pages: number;
  charactersExtracted: number;
  previewText: string;
  chunkCount?: number;
}

interface AdminKnowledgeBasePageProps {
  onNavigate: (path: string) => void;
}

export const AdminKnowledgeBasePage: React.FC<AdminKnowledgeBasePageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'faqs' | 'test'>('documents');
  const [stats, setStats] = useState<KnowledgeStats>({
    totalDocuments: 0,
    totalTextEntries: 0,
    totalChunks: 0,
    lastUpdated: '',
  });

  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [faqs, setFaqs] = useState<KnowledgeFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('all');

  // Upload Document modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<KnowledgeCategory>('General');
  const [uploadCustomTitle, setUploadCustomTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Add Text Knowledge modal state
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textCategory, setTextCategory] = useState<KnowledgeCategory>('Company Information');
  const [textContent, setTextContent] = useState('');
  const [isSavingText, setIsSavingText] = useState(false);

  // Edit Text Knowledge modal state
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<string>('General');
  const [editContent, setEditContent] = useState('');
  const [isUpdatingText, setIsUpdatingText] = useState(false);

  // Extraction Preview modal state (shows after upload / manual entry or on inspect)
  const [previewData, setPreviewData] = useState<ExtractionPreviewData | null>(null);

  // Inspect full document modal state
  const [inspectDoc, setInspectDoc] = useState<KnowledgeDocument | null>(null);
  const [inspectChunks, setInspectChunks] = useState<any[]>([]);
  const [isLoadingInspect, setIsLoadingInspect] = useState(false);

  // FAQ modal state
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState<KnowledgeCategory>('General');
  const [isSavingFaq, setIsSavingFaq] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'doc' | 'faq' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Test Sandbox state
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<{ answer: string; citations: any[]; matched: boolean } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, docsRes, faqsRes] = await Promise.all([
        fetch('/api/knowledge/stats').then((r) => r.json()),
        fetch('/api/knowledge/documents').then((r) => r.json()),
        fetch('/api/knowledge/faqs').then((r) => r.json()),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (docsRes.success) setDocuments(docsRes.documents);
      if (faqsRes.success) setFaqs(faqsRes.faqs);
    } catch (err) {
      console.error('[AdminKnowledgeBase] Error loading data:', err);
      showToast('Error loading knowledge base data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        doc.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesSource =
        selectedSourceType === 'all' ||
        doc.source_type === selectedSourceType;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        (doc.file_name && doc.file_name.toLowerCase().includes(q)) ||
        doc.category.toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q);

      return matchesCategory && matchesSource && matchesSearch;
    });
  }, [documents, selectedCategory, selectedSourceType, searchQuery]);

  // 1. Upload File Handler (PDF, DOCX, TXT)
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'txt') {
      showToast('Supported formats: PDF (.pdf), Word (.docx), and Plain Text (.txt)', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', uploadCategory);
      if (uploadCustomTitle.trim()) {
        formData.append('title', uploadCustomTitle.trim());
      }

      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(
          data.error ||
          'Unable to extract text from this document. Please upload a readable PDF or add content manually.'
        );
      }

      // Show Extraction Preview Modal right after upload
      if (data.extraction) {
        setPreviewData({
          fileName: data.extraction.fileName || selectedFile.name,
          pages: data.extraction.pages || 1,
          charactersExtracted: data.extraction.charactersExtracted || 0,
          previewText: data.extraction.previewText || '',
          chunkCount: data.document?.chunk_count,
        });
      }

      showToast(`Document "${selectedFile.name}" indexed successfully!`);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setUploadCustomTitle('');
      await loadAllData();
    } catch (err: any) {
      console.error('[AdminKnowledgeBase] Upload error:', err);
      showToast(
        err.message ||
        'Unable to extract text from this document. Please upload a readable PDF or add content manually.',
        'error'
      );
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Add Text Knowledge Handler (Manual Text Entry)
  const handleAddTextKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textTitle.trim() || !textContent.trim()) {
      showToast('Please provide both title and content.', 'error');
      return;
    }

    setIsSavingText(true);
    try {
      const res = await fetch('/api/knowledge/text-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: textTitle.trim(),
          category: textCategory,
          content: textContent.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save text knowledge entry.');
      }

      // Show Extraction Preview Modal
      if (data.extraction) {
        setPreviewData({
          fileName: textTitle.trim(),
          pages: data.extraction.pages || 1,
          charactersExtracted: data.extraction.charactersExtracted || textContent.length,
          previewText: data.extraction.previewText || textContent.slice(0, 1000),
          chunkCount: data.document?.chunk_count,
        });
      }

      showToast(`Text knowledge "${textTitle}" saved and vectorized!`);
      setIsTextModalOpen(false);
      setTextTitle('');
      setTextContent('');
      await loadAllData();
    } catch (err: any) {
      console.error('[AdminKnowledgeBase] Text entry error:', err);
      showToast(err.message || 'Error saving text knowledge.', 'error');
    } finally {
      setIsSavingText(false);
    }
  };

  // 3. Edit Text Knowledge Handler
  const handleOpenEditModal = (doc: KnowledgeDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditCategory(doc.category);
    setEditContent(doc.content);
  };

  const handleUpdateTextKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editTitle.trim() || !editContent.trim()) return;

    setIsUpdatingText(true);
    try {
      const res = await fetch(`/api/knowledge/text-entry/${editingDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          category: editCategory,
          content: editContent.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update entry.');
      }

      showToast(`Knowledge entry "${editTitle}" updated and re-vectorized!`);
      setEditingDoc(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Error updating entry', 'error');
    } finally {
      setIsUpdatingText(false);
    }
  };

  // 4. Open Inspect / Preview Modal for any document
  const handleOpenInspect = async (doc: KnowledgeDocument) => {
    setInspectDoc(doc);
    setIsLoadingInspect(true);
    try {
      const res = await fetch(`/api/knowledge/preview/${doc.id}`).then((r) => r.json());
      if (res.success && res.chunks) {
        setInspectChunks(res.chunks);
      }
    } catch {
      setInspectChunks([]);
    } finally {
      setIsLoadingInspect(false);
    }
  };

  // 5. Add FAQ Handler
  const handleSaveFaqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      showToast('Please provide both question and answer', 'error');
      return;
    }

    setIsSavingFaq(true);
    try {
      const res = await fetch('/api/knowledge/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: faqQuestion.trim(),
          answer: faqAnswer.trim(),
          category: faqCategory,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to add FAQ');
      }

      showToast('New FAQ added and indexed into vector store!');
      setIsFaqModalOpen(false);
      setFaqQuestion('');
      setFaqAnswer('');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Error saving FAQ', 'error');
    } finally {
      setIsSavingFaq(false);
    }
  };

  // 6. Confirm Delete Handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const endpoint = deleteTarget.type === 'doc'
        ? `/api/knowledge/documents/${deleteTarget.id}`
        : `/api/knowledge/faqs/${deleteTarget.id}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();

      if (!data.success) {
        throw new Error('Failed to delete item');
      }

      showToast(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Error during deletion', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // 7. Rebuild Embeddings Handler
  const handleRebuildIndex = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/knowledge/rebuild-index', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to rebuild index');

      showToast(
        `Embeddings rebuilt! ${data.result.totalChunks} chunks vectorized across ${data.result.documentsReindexed} files and ${data.result.textEntriesReindexed} text entries.`
      );
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Error rebuilding embeddings', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Test Sandbox Handler
  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim() || isTesting) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/knowledge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testQuery.trim() }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      showToast('Error testing RAG query', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const getSourceBadge = (source: KnowledgeDocument['source_type']) => {
    switch (source) {
      case 'pdf':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">PDF</span>;
      case 'docx':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">DOCX</span>;
      case 'txt':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">TXT</span>;
      case 'text_entry':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Manual Text</span>;
      case 'url':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">URL</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{source}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Knowledge Base & AI RAG Engine"
        subtitle="Extract PDF text, store vectorized chunks in Supabase, add manual text knowledge, and power verified chatbot answers with zero hallucinations."
        onNavigate={onNavigate}
        showAddButton={false}
        showImportButton={false}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn border ${
          toastMessage.type === 'error'
            ? 'bg-rose-900 text-white border-rose-700'
            : 'bg-slate-900 text-white border-slate-700'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 4. Top Knowledge Base Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Documents */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Documents
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 font-display">
              {stats.totalDocuments}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Uploaded PDF, DOCX, TXT</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Text Entries */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Text Entries
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 font-display">
              {stats.totalTextEntries}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Pasted custom knowledge</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <AlignLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total Chunks */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Chunks
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 font-display">
              {stats.totalChunks}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">500-1000 word vectors</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Last Updated & Rebuild Embeddings */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Last Updated
            </span>
            <div className="text-xs font-bold text-slate-800 mt-1">
              {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }) : 'Just now'}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold inline-flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Vector Index Ready
            </span>
          </div>
          <button
            type="button"
            onClick={handleRebuildIndex}
            disabled={actionLoading}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
            title="Rebuild all vector embeddings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Rebuild</span>
          </button>
        </div>
      </div>

      {/* 3. Supported Knowledge Sources Banner */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 p-4 rounded-2xl border border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-bold text-slate-800">Supported Knowledge Sources:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-800 font-semibold text-[11px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            PDF (.pdf)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-800 font-semibold text-[11px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            DOCX (.docx)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800 font-semibold text-[11px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            TXT (.txt)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-800 font-semibold text-[11px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Manual Text Input
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 font-medium text-[11px] flex items-center gap-1">
            <Globe className="w-3 h-3 text-slate-400" />
            Website URL Content (Future)
          </span>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Navigation Tabs & Actions Toolbar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'documents'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>All Knowledge ({documents.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('faqs')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'faqs'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Verified FAQs ({faqs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('test')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'test'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>RAG Test Simulator</span>
            </button>
          </div>

          {/* Action Buttons: Upload PDF + Add Text Knowledge */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTextModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer"
            >
              <AlignLeft className="w-4 h-4 text-purple-600" />
              <span>Add Text Knowledge</span>
            </button>

            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* TAB 1: ALL KNOWLEDGE DOCUMENTS & TEXT ENTRIES */}
        {activeTab === 'documents' && (
          <div className="p-4 sm:p-6 space-y-4">
            
            {/* Search Knowledge & Category Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Knowledge Base by title, filename, category, or content keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Source Type Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedSourceType}
                  onChange={(e) => setSelectedSourceType(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                >
                  <option value="all">All Sources</option>
                  <option value="pdf">PDF Documents</option>
                  <option value="docx">Word (.docx)</option>
                  <option value="txt">Text (.txt)</option>
                  <option value="text_entry">Manual Text</option>
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                >
                  <option value="all">All Categories</option>
                  {KNOWLEDGE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading Knowledge Base items...</span>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="py-16 text-center space-y-4 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">No Knowledge Items Found</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Upload official PDF, DOCX, or TXT files, or click &quot;Add Text Knowledge&quot; to paste text directly without uploading a file.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTextModalOpen(true)}
                    className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <AlignLeft className="w-4 h-4" />
                    <span>Add Text Knowledge</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Document</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Title / Item</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Pages / Chars</th>
                      <th className="py-3 px-4">Vector Chunks</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            {doc.source_type === 'text_entry' ? (
                              <AlignLeft className="w-4 h-4 text-purple-600 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            )}
                            <div>
                              <span className="font-bold text-slate-900 block truncate max-w-xs sm:max-w-sm">
                                {doc.title}
                              </span>
                              {doc.file_name && (
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {doc.file_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {doc.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {getSourceBadge(doc.source_type)}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-mono">
                          {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'} • {doc.char_count} chars
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            {doc.chunk_count} chunks
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Indexed</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {/* Preview Extracted Text */}
                            <button
                              type="button"
                              onClick={() => handleOpenInspect(doc)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Preview Extracted Text & Vector Chunks"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit Text Entry (only available for manual text entries) */}
                            {doc.source_type === 'text_entry' && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(doc)}
                                className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Text Entry"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete Knowledge */}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ id: doc.id, name: doc.title, type: 'doc' })}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Knowledge Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VERIFIED FAQS LIST */}
        {activeTab === 'faqs' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Curated question-and-answer pairs indexed alongside document chunks for direct semantic grounding.
              </p>
              <button
                type="button"
                onClick={() => setIsFaqModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add FAQ</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4.5 space-y-2.5 hover:shadow-2xs transition-shadow relative group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                      {faq.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: faq.id, name: faq.question, type: 'faq' })}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Delete FAQ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h5 className="font-bold text-xs text-slate-900 leading-snug">
                    {faq.question}
                  </h5>

                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200/70">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: RAG TEST SIMULATOR */}
        {activeTab === 'test' && (
          <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Strict Anti-Hallucination Simulator</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">
                Test Questions Against Your Knowledge Base
              </h3>
              <p className="text-xs text-slate-500">
                Queries are matched against vector embeddings. If no verified knowledge is found, the system strictly replies: &quot;I could not find this information in the Mana Naukari Knowledge Base.&quot;
              </p>
            </div>

            <form onSubmit={handleRunTest} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="e.g. What is the fee for ATS resume review or how to post a recruiter job?"
                  className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={isTesting || !testQuery.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {isTesting ? 'Searching...' : 'Run Query'}
                </button>
              </div>
            </form>

            {/* Test Results Output */}
            {testResult && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 animate-fadeIn text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-700 font-display">Chatbot Response:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      testResult.matched
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {testResult.matched ? 'Verified Knowledge Match' : 'Unrelated Fallback Triggered'}
                  </span>
                </div>

                <p className="text-slate-800 leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border border-slate-200 font-medium">
                  {testResult.answer}
                </p>

                {testResult.citations && testResult.citations.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">
                      Retrieved Knowledge Chunks:
                    </span>
                    <div className="space-y-1.5">
                      {testResult.citations.map((c: any, i: number) => (
                        <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-1">
                          <span className="font-semibold text-blue-700 block">{c.source}</span>
                          <span className="text-slate-500 italic block">&quot;{c.snippet}&quot;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 9. MODAL 1: EXTRACTION PREVIEW MODAL (Shown immediately after upload/entry or upon request) */}
      {previewData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 font-display">
                  Text Extraction &amp; Embedding Successful!
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Extraction Metadata Cards */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">File / Title</span>
                <span className="font-bold text-xs text-slate-800 truncate block mt-0.5" title={previewData.fileName}>
                  {previewData.fileName}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Pages</span>
                <span className="font-bold text-base text-blue-700 block mt-0.5">
                  {previewData.pages}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Characters</span>
                <span className="font-bold text-base text-emerald-700 block mt-0.5">
                  {previewData.charactersExtracted.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Preview of Extracted Text */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-slate-700 block">Preview of Extracted Text:</span>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-700 whitespace-pre-wrap max-h-56 overflow-y-auto font-mono leading-relaxed">
                {previewData.previewText}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD DOCUMENT MODAL (PDF, DOCX, TXT) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900 font-display">
                  Upload Knowledge Document
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Knowledge Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as KnowledgeCategory)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {KNOWLEDGE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Custom Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Document Title <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ATS Resume Guidelines 2026"
                  value={uploadCustomTitle}
                  onChange={(e) => setUploadCustomTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* File Drop Area */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <label className="cursor-pointer block">
                  <span className="text-xs font-bold text-blue-600 hover:underline">
                    Choose PDF, DOCX, or TXT file
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: PDF (.pdf), Word (.docx), Text (.txt) • Max 25 MB
                </p>

                {selectedFile && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-xl text-xs font-semibold">
                    <FileCheck className="w-4 h-4 text-blue-600" />
                    <span>{selectedFile.name}</span>
                    <span className="text-[10px] text-slate-500">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 block">RAG Text Processing:</span>
                <p>• Automatically extracts all text from PDF using modern parser.</p>
                <p>• Splits document into 500-1000 word chunks.</p>
                <p>• Generates vector embeddings with Gemini API.</p>
                <p>• Persists chunks to vector store for retrieval.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting &amp; Indexing...</span>
                    </>
                  ) : (
                    <span>Extract &amp; Index</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL 3: ADD TEXT KNOWLEDGE MODAL (Direct Paste) */}
      {isTextModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlignLeft className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-slate-900 font-display">
                  Add Text Knowledge
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTextModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTextKnowledge} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mana Naukari Platform Overview & Services"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={textCategory}
                  onChange={(e) => setTextCategory(e.target.value as KnowledgeCategory)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                >
                  {KNOWLEDGE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="Paste raw knowledge text, service guides, recruiter policies, or company details..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none leading-relaxed font-mono"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                  <span>{textContent.split(/\s+/).filter(Boolean).length} words • {textContent.length} characters</span>
                  <span>Automatically split into 500-1000 word vector chunks</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTextModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingText || !textTitle.trim() || !textContent.trim()}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {isSavingText ? 'Vectorizing & Saving...' : 'Save & Vectorize Text'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT TEXT KNOWLEDGE MODAL */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-slate-900 font-display">
                  Edit Text Knowledge Entry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTextKnowledge} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                >
                  {KNOWLEDGE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={8}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none leading-relaxed font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingText || !editTitle.trim() || !editContent.trim()}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {isUpdatingText ? 'Re-vectorizing...' : 'Update & Re-vectorize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: INSPECT / PREVIEW DOCUMENT MODAL */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 font-display">
                    {inspectDoc.title}
                  </h3>
                  {getSourceBadge(inspectDoc.source_type)}
                </div>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Category: {inspectDoc.category} • {inspectDoc.page_count} pages • {inspectDoc.char_count} chars
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectDoc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Extracted Text Content */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-800 block">Extracted Document Text:</span>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-700 whitespace-pre-wrap max-h-56 overflow-y-auto font-mono leading-relaxed">
                {inspectDoc.content}
              </div>
            </div>

            {/* Chunks breakdown */}
            <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-800 block">
                Vector Chunks ({inspectChunks.length || inspectDoc.chunk_count}):
              </span>
              {isLoadingInspect ? (
                <div className="py-6 text-center text-slate-400">Loading chunks...</div>
              ) : inspectChunks.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {inspectChunks.map((chunk: any, i: number) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-400 font-bold text-[10px]">
                        <span>Chunk #{chunk.chunk_index + 1}</span>
                        <span>{chunk.word_count || chunk.token_count} words</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-mono">
                        {chunk.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">No individual chunks found.</p>
              )}
            </div>

            <div className="flex items-center justify-end pt-3">
              <button
                type="button"
                onClick={() => setInspectDoc(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: ADD FAQ MODAL */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900 font-display">
                  Add FAQ to Knowledge Base
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFaqModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFaqSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value as KnowledgeCategory)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {KNOWLEDGE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Question <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. What is the turnaround time for ATS Resume Review?"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Answer <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide the verified, factual answer that the chatbot should deliver..."
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFaqModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFaq}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {isSavingFaq ? 'Saving & Generating Embedding...' : 'Save & Index FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Delete {deleteTarget.type === 'doc' ? 'Knowledge Item' : 'FAQ'}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove &quot;{deleteTarget.name}&quot;? All associated chunks and vector embeddings will be permanently removed.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
