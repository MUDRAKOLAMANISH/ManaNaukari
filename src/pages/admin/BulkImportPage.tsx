import React, { useState } from 'react';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { 
  bulkImportService, 
  BulkImportResult, 
  BulkImportProgress,
  BulkImportSuccessItem 
} from '../../services/bulkImportService';
import { Toast } from '../../components/common/Toast';
import { 
  Sparkles, Layers, CheckCircle2, AlertCircle, 
  Loader2, Copy, Check, ExternalLink, RefreshCw, 
  FileText, ArrowRight, ShieldCheck, MessageSquare, Linkedin,
  SendHorizontal, Trash2, Eye, Edit3, CheckSquare, Square,
  UploadCloud, AlertTriangle, X
} from 'lucide-react';
import { adminJobsService } from '../../services/adminJobsService';

interface BulkImportPageProps {
  onNavigate: (path: string) => void;
}

type MessageFormat = 'whatsapp' | 'linkedin' | 'telegram';

export const BulkImportPage: React.FC<BulkImportPageProps> = ({ onNavigate }) => {
  const [rawUrlsInput, setRawUrlsInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BulkImportProgress | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [activeMessageFormat, setActiveMessageFormat] = useState<MessageFormat>('whatsapp');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review table states (Step 4, 5, 6)
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Preview modal state
  const [previewJob, setPreviewJob] = useState<BulkImportSuccessItem | null>(null);

  // Quick edit modal state
  const [editingJob, setEditingJob] = useState<BulkImportSuccessItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    company: '',
    location: '',
    experience: '',
    salary: '',
    skills: '',
  });

  // Parse input in real-time
  const { urls: parsedUrls, originalCount, truncated } = bulkImportService.parseUrls(rawUrlsInput);

  // Sample Requisitions for one-click testing
  const handleLoadSampleUrls = () => {
    const samples = [
      'https://careers.google.com/jobs/results/software-engineer-early-career-bengaluru',
      'https://amazon.jobs/en/jobs/2541890/software-development-engineer-hyderabad',
      'https://careers.microsoft.com/professionals/us/en/job/1689240/software-engineer-pune',
      'https://ibmglobal.avature.net/careers/JobDetail/Associate-System-Engineer/24108',
      'https://jobs.lever.co/postman/backend-engineer-intern-bengaluru',
    ].join('\n');

    setRawUrlsInput(samples);
  };

  const handleClear = () => {
    setRawUrlsInput('');
    setResult(null);
    setProgress(null);
    setSelectedJobIds(new Set());
    setPreviewJob(null);
    setEditingJob(null);
  };

  // Run Bulk Extraction (Jobs saved as status = 'draft')
  const handleStartBulkExtraction = async () => {
    if (parsedUrls.length === 0) {
      alert('Please enter at least one valid career requisition URL (up to 10 URLs).');
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setSelectedJobIds(new Set());

    try {
      const importResult = await bulkImportService.processBatch(parsedUrls, (prog) => {
        setProgress(prog);
      });

      setResult(importResult);

      if (importResult.importedCount > 0) {
        // Pre-select all extracted draft jobs for quick publishing
        const allIds = new Set(importResult.successfulJobs.map((j) => j.id));
        setSelectedJobIds(allIds);
        setToastMessage('Jobs extracted successfully. Review and publish when ready.');
      } else {
        setToastMessage(`⚠️ None of the ${importResult.totalProcessed} URLs could be extracted.`);
      }
    } catch (err: any) {
      console.error('[BulkImportPage] Batch extract error:', err);
      alert('An unexpected error occurred during job extraction. Please check console.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (!result) return;
    if (selectedJobIds.size === result.successfulJobs.length) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(result.successfulJobs.map((j) => j.id)));
    }
  };

  const handleToggleSelectJob = (id: string) => {
    const next = new Set(selectedJobIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedJobIds(next);
  };

  // Step 6: Publish Selected
  const handlePublishSelected = async () => {
    if (!result || selectedJobIds.size === 0) {
      alert('Please select at least one job to publish.');
      return;
    }

    const idsToPublish = Array.from(selectedJobIds);
    setIsActionLoading(true);
    try {
      const res = await bulkImportService.publishJobs(idsToPublish);
      if (res.success) {
        setResult((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            successfulJobs: prev.successfulJobs.map((job) =>
              selectedJobIds.has(job.id) ? { ...job, status: 'active' } : job
            ),
          };
        });
        setToastMessage(`✓ Successfully published ${res.count} job(s) to Mana Naukari! Status is now active.`);
      } else {
        alert(`Failed to publish jobs: ${res.error}`);
      }
    } catch (err: any) {
      console.error('Error publishing jobs:', err);
      alert('Error updating job status.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Step 6: Publish All
  const handlePublishAll = async () => {
    if (!result || result.successfulJobs.length === 0) return;

    const allIds = result.successfulJobs.map((j) => j.id);
    setIsActionLoading(true);
    try {
      const res = await bulkImportService.publishJobs(allIds);
      if (res.success) {
        setResult((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            successfulJobs: prev.successfulJobs.map((job) => ({ ...job, status: 'active' })),
          };
        });
        setSelectedJobIds(new Set(allIds));
        setToastMessage(`✓ All ${res.count} job(s) published successfully! Status is now active.`);
      } else {
        alert(`Failed to publish jobs: ${res.error}`);
      }
    } catch (err: any) {
      console.error('Error publishing all jobs:', err);
      alert('Error updating job status.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Step 6: Delete Selected
  const handleDeleteSelected = async () => {
    if (!result || selectedJobIds.size === 0) {
      alert('Please select at least one job to delete.');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedJobIds.size} selected job(s)?`)) {
      return;
    }

    const idsToDelete = Array.from(selectedJobIds);
    setIsActionLoading(true);
    try {
      const res = await bulkImportService.deleteJobs(idsToDelete);
      if (res.success) {
        setResult((prev) => {
          if (!prev) return null;
          const remaining = prev.successfulJobs.filter((job) => !selectedJobIds.has(job.id));
          return {
            ...prev,
            importedCount: remaining.length,
            successfulJobs: remaining,
          };
        });
        setSelectedJobIds(new Set());
        setToastMessage(`✓ Successfully deleted ${res.count} job(s).`);
      } else {
        alert(`Failed to delete jobs: ${res.error}`);
      }
    } catch (err: any) {
      console.error('Error deleting jobs:', err);
      alert('Error deleting jobs.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Single Delete
  const handleDeleteSingle = async (jobId: string, jobTitle: string) => {
    if (!confirm(`Delete "${jobTitle}"?`)) return;

    setIsActionLoading(true);
    try {
      const res = await bulkImportService.deleteJobs([jobId]);
      if (res.success) {
        setResult((prev) => {
          if (!prev) return null;
          const remaining = prev.successfulJobs.filter((j) => j.id !== jobId);
          return {
            ...prev,
            importedCount: remaining.length,
            successfulJobs: remaining,
          };
        });
        setSelectedJobIds((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
        setToastMessage(`✓ Job "${jobTitle}" deleted.`);
      } else {
        alert(`Failed to delete: ${res.error}`);
      }
    } catch (err: any) {
      console.error('Error deleting job:', err);
      alert('Error deleting job.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Quick Edit Handlers
  const handleOpenEditModal = (job: BulkImportSuccessItem) => {
    setEditingJob(job);
    setEditFormData({
      title: job.title,
      company: job.company,
      location: job.location,
      experience: job.experience,
      salary: job.salary || '',
      skills: job.skills.join(', '),
    });
  };

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    setIsActionLoading(true);
    try {
      const parsedSkills = editFormData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const updates: any = {
        title: editFormData.title.trim(),
        company: editFormData.company.trim(),
        location: editFormData.location.trim(),
        experience: editFormData.experience.trim(),
        salary: editFormData.salary.trim() || 'Best in Industry',
        skills_required: parsedSkills,
      };

      const { data, error } = await adminJobsService.updateJob(editingJob.id, updates);
      if (error || !data) {
        alert(`Could not save changes: ${error?.message || 'Database error'}`);
        return;
      }

      setResult((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          successfulJobs: prev.successfulJobs.map((j) =>
            j.id === editingJob.id
              ? {
                  ...j,
                  title: data.title,
                  company: data.company,
                  location: data.location,
                  experience: data.experience || j.experience,
                  salary: data.salary,
                  skills: Array.isArray(data.skills_required) ? data.skills_required : parsedSkills,
                }
              : j
          ),
        };
      });

      setEditingJob(null);
      setToastMessage(`✓ Job "${data.title}" updated successfully!`);
    } catch (err: any) {
      console.error('Error updating job:', err);
      alert('Error saving job changes.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Active jobs for broadcasting
  const publishedJobs = result?.successfulJobs.filter((j) => j.status === 'active') || [];

  // Message Generators
  const getGeneratedMessage = (format: MessageFormat): string => {
    if (publishedJobs.length === 0) return '';
    switch (format) {
      case 'whatsapp':
        return bulkImportService.generateWhatsAppMessage(publishedJobs);
      case 'linkedin':
        return bulkImportService.generateLinkedInPost(publishedJobs);
      case 'telegram':
        return bulkImportService.generateTelegramPost(publishedJobs);
      default:
        return '';
    }
  };

  const handleCopyMessage = (format: MessageFormat) => {
    const text = getGeneratedMessage(format);
    if (!text) return;

    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setToastMessage(`✓ ${format.toUpperCase()} message copied to clipboard!`);
    setTimeout(() => {
      setCopiedFormat(null);
    }, 2500);
  };

  const handleOpenWhatsApp = () => {
    const text = getGeneratedMessage('whatsapp');
    if (!text) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleOpenTelegram = () => {
    const text = getGeneratedMessage('telegram');
    if (!text) return;
    const url = `https://t.me/share/url?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleOpenLinkedIn = () => {
    const url = `https://www.linkedin.com/feed/`;
    window.open(url, '_blank');
    setToastMessage('LinkedIn opened. Paste your copied post into the create box!');
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Header */}
        <AdminHeader
          title="Bulk Job Import & Broadcast Center"
          subtitle="Paste up to 10 career requisition links. Extracted jobs are saved as draft for your review. Preview, edit, and publish when ready."
          onNavigate={onNavigate}
          showAddButton={true}
          showImportButton={true}
        />

        {/* Tab switch between Bulk & Single URL */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-3">
          <button
            onClick={() => {}}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200/80 rounded-xl shadow-2xs"
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Bulk Import (Up to 10 URLs)</span>
          </button>
          
          <button
            onClick={() => onNavigate('/admin/import-job')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Single URL Assistant</span>
          </button>
        </div>

        {/* Step 1: Input URLs Section */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>AI Batch Extractor</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-slate-900">
                1. Paste Career Requisition URLs (Max 10)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Enter up to 10 official career requisition links. Extracted jobs will be saved as <strong>draft</strong> for admin review.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleLoadSampleUrls}
                disabled={isProcessing}
                className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/90 border border-indigo-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                title="Populate 5 sample career requisition links"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Load Sample URLs</span>
              </button>

              {rawUrlsInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isProcessing}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* URLs Textarea */}
          <div className="relative">
            <textarea
              rows={6}
              value={rawUrlsInput}
              onChange={(e) => setRawUrlsInput(e.target.value)}
              disabled={isProcessing}
              placeholder={`Paste up to 10 career requisition URLs (one per line):
https://careers.google.com/jobs/results/12345
https://amazon.jobs/en/jobs/67890
https://careers.microsoft.com/professionals/job/11223
https://jobs.lever.co/company/example-role`}
              className="w-full font-mono text-xs sm:text-sm p-4 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none transition-shadow bg-slate-50/50 resize-y leading-relaxed"
            />

            {/* Live Count Badge */}
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs border ${
                parsedUrls.length === 0
                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                  : parsedUrls.length <= 10
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                {parsedUrls.length} / 10 URLs
              </span>
            </div>
          </div>

          {truncated && (
            <p className="text-xs text-amber-700 font-semibold bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>You entered {originalCount} URLs. Only the first 10 URLs will be imported per batch.</span>
            </p>
          )}

          {/* Action Trigger Button */}
          <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Jobs will be saved as <strong>draft</strong>. They will NOT appear publicly until you click Publish.</span>
            </div>

            <button
              type="button"
              onClick={handleStartBulkExtraction}
              disabled={isProcessing || parsedUrls.length === 0}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Batch ({progress?.currentIndex || 1}/{parsedUrls.length})...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Extract &amp; Save as Draft ({parsedUrls.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Processing Indicator */}
        {isProcessing && progress && (
          <div className="bg-white rounded-3xl border border-blue-200 p-6 sm:p-8 shadow-md mb-8 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base font-display">
                    Extracting &amp; Saving Jobs as Draft...
                  </h3>
                  <p className="text-xs text-slate-500">
                    Processing URL {progress.currentIndex} of {progress.totalCount}
                  </p>
                </div>
              </div>
              <span className="text-sm font-black text-blue-700">
                {Math.round((progress.currentIndex / progress.totalCount) * 100)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 mb-3">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full transition-all duration-300"
                style={{ width: `${(progress.currentIndex / progress.totalCount) * 100}%` }}
              />
            </div>

            <p className="text-xs font-mono text-slate-600 truncate bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              Current URL: <span className="font-semibold text-blue-700">{progress.currentUrl}</span>
            </p>
          </div>
        )}

        {/* Steps 4, 5, 6, 7: Review Table & Actions */}
        {result && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Step 9 Notification Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950 font-display">
                    Jobs extracted successfully. Review and publish when ready.
                  </h3>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Extracted {result.importedCount} job(s) saved with status <code className="font-mono bg-blue-100/80 px-1.5 py-0.5 rounded text-blue-900 font-bold">draft</code>. Public users cannot see them until you click Publish.
                  </p>
                </div>
              </div>

              {/* Status Counters */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <div className="px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 text-center">
                  <span className="text-xs font-black text-purple-700">
                    {result.successfulJobs.filter((j) => j.status === 'draft').length} Drafts
                  </span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-xs font-black text-emerald-700">
                    {result.successfulJobs.filter((j) => j.status === 'active').length} Active
                  </span>
                </div>
              </div>
            </div>

            {/* Step 4 & 5 & 6: Review Table with Selection & Action Buttons */}
            {result.successfulJobs.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                
                {/* Step 6 Control Bar */}
                <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs transition-colors cursor-pointer"
                    >
                      {selectedJobIds.size === result.successfulJobs.length ? (
                        <>
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                          <span>Deselect All</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4 text-slate-400" />
                          <span>Select All ({result.successfulJobs.length})</span>
                        </>
                      )}
                    </button>

                    <span className="text-xs text-slate-500 font-medium">
                      <strong>{selectedJobIds.size}</strong> of {result.successfulJobs.length} selected
                    </span>
                  </div>

                  {/* Step 6 Action Buttons: Publish Selected, Publish All, Delete Selected */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePublishSelected}
                      disabled={isActionLoading || selectedJobIds.size === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                      <span>Publish Selected ({selectedJobIds.size})</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePublishAll}
                      disabled={isActionLoading || result.successfulJobs.length === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Publish All ({result.successfulJobs.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      disabled={isActionLoading || selectedJobIds.size === 0}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete Selected</span>
                    </button>
                  </div>
                </div>

                {/* Step 4 Review Table: Job Title, Company, Location, Experience, Skills, Status */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3.5 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedJobIds.size === result.successfulJobs.length && result.successfulJobs.length > 0}
                            onChange={handleToggleSelectAll}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                        <th className="py-3.5 px-4">Job Title</th>
                        <th className="py-3.5 px-4">Company</th>
                        <th className="py-3.5 px-4">Location</th>
                        <th className="py-3.5 px-4">Experience</th>
                        <th className="py-3.5 px-4">Skills</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.successfulJobs.map((job) => {
                        const isSelected = selectedJobIds.has(job.id);
                        const isDraft = job.status === 'draft';

                        return (
                          <tr
                            key={job.id}
                            className={`transition-colors ${
                              isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'
                            }`}
                          >
                            {/* Select Checkbox */}
                            <td className="py-3.5 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectJob(job.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>

                            {/* Job Title */}
                            <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                              <div className="truncate font-display text-sm font-bold text-slate-900">
                                {job.title}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono truncate">
                                {job.category}
                              </div>
                            </td>

                            {/* Company */}
                            <td className="py-3.5 px-4 text-slate-800 font-medium whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                                {job.company}
                              </span>
                            </td>

                            {/* Location */}
                            <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                              📍 {job.location}
                            </td>

                            {/* Experience */}
                            <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                              ⏳ {job.experience}
                            </td>

                            {/* Skills */}
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="flex flex-wrap gap-1">
                                {job.skills && job.skills.length > 0 ? (
                                  job.skills.slice(0, 3).map((skill, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100"
                                    >
                                      {skill}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-[11px]">General</span>
                                )}
                                {job.skills && job.skills.length > 3 && (
                                  <span className="text-[10px] text-slate-400 px-1 py-0.5">
                                    +{job.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {isDraft ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-900 border border-purple-300">
                                  <span>📝</span>
                                  <span>Draft (Review)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                  <span>🟢</span>
                                  <span>Active (Live)</span>
                                </span>
                              )}
                            </td>

                            {/* Step 5: Admin Actions (Preview, Edit, Delete) */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                
                                {/* Preview */}
                                <button
                                  type="button"
                                  onClick={() => setPreviewJob(job)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                  title="Preview Job Requisition"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Preview</span>
                                </button>

                                {/* Edit */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(job)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Extracted Parameters"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>

                                {/* Publish individual if draft */}
                                {isDraft && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setIsActionLoading(true);
                                      const res = await bulkImportService.publishJobs([job.id]);
                                      if (res.success) {
                                        setResult((prev) => {
                                          if (!prev) return null;
                                          return {
                                            ...prev,
                                            successfulJobs: prev.successfulJobs.map((j) =>
                                              j.id === job.id ? { ...j, status: 'active' } : j
                                            ),
                                          };
                                        });
                                        setToastMessage(`✓ Job "${job.title}" is now active!`);
                                      }
                                      setIsActionLoading(false);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                                    title="Publish this job to live site"
                                  >
                                    <UploadCloud className="w-3.5 h-3.5" />
                                    <span>Publish</span>
                                  </button>
                                )}

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSingle(job.id, job.title)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Job"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer notes */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Draft jobs remain invisible to public users until published.</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/admin/jobs')}
                    className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1"
                  >
                    <span>View all jobs in Admin Table</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Distribution Broadcast Center (Only for Active / Published Jobs) */}
            {publishedJobs.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{publishedJobs.length} Active Job(s) Ready to Broadcast</span>
                    </div>
                    <h3 className="text-xl font-black font-display text-slate-900">
                      Social &amp; Community Broadcast Center
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Generate shareable announcements for WhatsApp, LinkedIn, and Telegram using strictly verified Mana Naukari URLs.
                    </p>
                  </div>
                </div>

                <div className="pt-6">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-slate-700 mr-2">Select Shareable Channel:</span>
                    
                    <button
                      type="button"
                      onClick={() => setActiveMessageFormat('whatsapp')}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        activeMessageFormat === 'whatsapp'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Broadcast</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveMessageFormat('linkedin')}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        activeMessageFormat === 'linkedin'
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      <span>LinkedIn Post</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveMessageFormat('telegram')}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        activeMessageFormat === 'telegram'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
                      }`}
                    >
                      <SendHorizontal className="w-3.5 h-3.5" />
                      <span>Telegram Post</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                      <span className="font-semibold">
                        Security Policy Enforced: Generated messages contain <u>ONLY Mana Naukari job page URLs</u>. External corporate links are strictly hidden.
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      100% Protected
                    </span>
                  </div>

                  {/* Shareable Message Preview Box */}
                  <div className="relative rounded-2xl border border-slate-300 bg-slate-900 text-slate-100 p-5 shadow-inner">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-bold text-slate-200 capitalize">
                          {activeMessageFormat} Output Preview ({publishedJobs.length} active jobs)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(activeMessageFormat)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                        >
                          {copiedFormat === activeMessageFormat ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>

                        {activeMessageFormat === 'whatsapp' && (
                          <button
                            type="button"
                            onClick={handleOpenWhatsApp}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Send to WhatsApp</span>
                          </button>
                        )}

                        {activeMessageFormat === 'linkedin' && (
                          <button
                            type="button"
                            onClick={handleOpenLinkedIn}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Share on LinkedIn</span>
                          </button>
                        )}

                        {activeMessageFormat === 'telegram' && (
                          <button
                            type="button"
                            onClick={handleOpenTelegram}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Post to Telegram</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <pre className="font-mono text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto text-slate-200 scrollbar-thin">
                      {getGeneratedMessage(activeMessageFormat)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* List of Failed URLs (if any) */}
            {result.failedJobs.length > 0 && (
              <div className="bg-white rounded-3xl border border-rose-200 p-6 sm:p-8 shadow-xs">
                <div className="flex items-center gap-2 text-rose-800 mb-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <h4 className="text-base font-bold font-display">
                    Failed URLs ({result.failedJobs.length})
                  </h4>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  The following URLs could not be completed. You can adjust the URL or import them manually via the single URL assistant.
                </p>

                <div className="space-y-2">
                  {result.failedJobs.map((fail, fIdx) => (
                    <div key={fIdx} className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200 shrink-0">
                            Extraction Failed
                          </span>
                          <span className="font-mono text-slate-800 font-semibold truncate block max-w-xl">
                            {fail.url}
                          </span>
                        </div>
                        <p className="text-rose-800 font-medium pl-1">
                          <strong>Error Details:</strong> {fail.reason}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setRawUrlsInput(fail.url);
                          setResult(null);
                        }}
                        className="px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-white hover:bg-rose-100 border border-rose-300 rounded-xl cursor-pointer shrink-0 transition-colors shadow-2xs"
                      >
                        Retry This URL
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reset / New Batch Button */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-2xl shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
                <span>Import Another Batch</span>
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Step 5: Preview Modal */}
      {previewJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                  previewJob.status === 'draft'
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  {previewJob.status === 'draft' ? '📝 Draft (Pending Publish)' : '🟢 Active (Live)'}
                </span>
                <h3 className="text-lg font-bold font-display text-slate-900 mt-1">
                  {previewJob.title}
                </h3>
                <p className="text-xs text-slate-500 font-semibold">{previewJob.company}</p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewJob(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Location</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{previewJob.location}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Experience</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{previewJob.experience}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Package</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{previewJob.salary || 'Best in Industry'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Job Type</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{previewJob.jobType}</p>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Required Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {previewJob.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {previewJob.description && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Job Description
                  </span>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-700 whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-48 overflow-y-auto">
                    {previewJob.description}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px] font-mono text-slate-500">
                <p><strong>Original Career URL:</strong> {previewJob.originalUrl}</p>
                <p><strong>Mana Naukari Slug:</strong> {previewJob.manaNaukariUrl}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Status: <strong className="capitalize">{previewJob.status}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewJob(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl cursor-pointer"
                >
                  Close
                </button>

                {previewJob.status === 'draft' ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsActionLoading(true);
                      const res = await bulkImportService.publishJobs([previewJob.id]);
                      if (res.success) {
                        setResult((prev) => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            successfulJobs: prev.successfulJobs.map((j) =>
                              j.id === previewJob.id ? { ...j, status: 'active' } : j
                            ),
                          };
                        });
                        setPreviewJob((prev) => (prev ? { ...prev, status: 'active' } : null));
                        setToastMessage(`✓ Job "${previewJob.title}" published!`);
                      }
                      setIsActionLoading(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Publish Now</span>
                  </button>
                ) : (
                  <a
                    href={previewJob.seoSlugPath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-xs"
                  >
                    <span>View Public Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Step 5: Quick Edit Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 animate-scaleUp overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display text-slate-900">
                  Quick Edit Job Parameters
                </h3>
                <p className="text-xs text-slate-500">Edit details before publishing to Mana Naukari</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingJob(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company</label>
                  <input
                    type="text"
                    required
                    value={editFormData.company}
                    onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Experience</label>
                  <input
                    type="text"
                    value={editFormData.experience}
                    onChange={(e) => setEditFormData({ ...editFormData, experience: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Salary Package</label>
                  <input
                    type="text"
                    value={editFormData.salary}
                    onChange={(e) => setEditFormData({ ...editFormData, salary: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={editFormData.skills}
                  onChange={(e) => setEditFormData({ ...editFormData, skills: e.target.value })}
                  placeholder="Java, Python, React, SQL"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onNavigate(`/admin/jobs/edit/${editingJob.id}`)}
                  className="text-blue-600 hover:underline font-bold"
                >
                  Open Full Form Editor →
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingJob(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
};
