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
  Sparkles, Layers, Link as LinkIcon, CheckCircle2, AlertCircle, 
  Loader2, Copy, Check, Share2, Send, ExternalLink, RefreshCw, 
  FileText, ArrowRight, ShieldCheck, Info, MessageSquare, Linkedin,
  SendHorizontal, CheckCheck, Trash2, Globe
} from 'lucide-react';

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
  };

  // Run Bulk Import
  const handleStartBulkImport = async () => {
    if (parsedUrls.length === 0) {
      alert('Please enter at least one valid career requisition URL (up to 10 URLs).');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const importResult = await bulkImportService.processBatch(parsedUrls, (prog) => {
        setProgress(prog);
      });

      setResult(importResult);
      if (importResult.importedCount > 0) {
        setToastMessage(`✓ Successfully imported ${importResult.importedCount} job(s) into database!`);
      } else {
        setToastMessage(`⚠️ None of the ${importResult.totalProcessed} URLs could be imported.`);
      }
    } catch (err: any) {
      console.error('[BulkImportPage] Batch import error:', err);
      alert('An unexpected error occurred during batch import. Please check console.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // Message Generators
  const getGeneratedMessage = (format: MessageFormat): string => {
    if (!result || result.successfulJobs.length === 0) return '';
    switch (format) {
      case 'whatsapp':
        return bulkImportService.generateWhatsAppMessage(result.successfulJobs);
      case 'linkedin':
        return bulkImportService.generateLinkedInPost(result.successfulJobs);
      case 'telegram':
        return bulkImportService.generateTelegramPost(result.successfulJobs);
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

  // Share link handlers
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
    // Open LinkedIn feed share
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
          subtitle="Paste up to 10 career requisition links at once. The AI system extracts job parameters, creates listings in the database, and prepares professional Mana Naukari shareable broadcasts."
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
                Enter up to 10 official career requisition links (Workday, Greenhouse, Lever, Amazon, Google, TCS, Infosys, etc.).
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
              <span>All created listings will automatically use safe, SEO-friendly Mana Naukari job slugs.</span>
            </div>

            <button
              type="button"
              onClick={handleStartBulkImport}
              disabled={isProcessing || parsedUrls.length === 0}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing Batch ({progress?.currentIndex || 1}/{parsedUrls.length})...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Import All Jobs ({parsedUrls.length})</span>
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
                    Extracting &amp; Creating Jobs in Database...
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

        {/* Step 2: Success Report & Shareable Message Center */}
        {result && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* 9. Success Report Summary Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Batch Execution Completed</span>
                  </div>
                  <h3 className="text-xl font-black font-display text-slate-900">
                    Import Report &amp; Distribution Center
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Jobs have been written directly to the database. Shareable announcements below use strictly Mana Naukari verified links.
                  </p>
                </div>

                {/* Score Pills */}
                <div className="flex items-center gap-3">
                  <div className="px-5 py-3 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-center shadow-2xs">
                    <div className="text-2xl font-black text-emerald-700 font-display">
                      {result.importedCount}
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Imported
                    </div>
                  </div>

                  <div className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-2xl font-black text-rose-600 font-display">
                      {result.failedCount}
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Failed
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirement 7: Generation Action Buttons */}
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
                    <span>Generate WhatsApp Message</span>
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
                    <span>Generate LinkedIn Post</span>
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
                    <span>Generate Telegram Post</span>
                  </button>
                </div>

                {/* 5. Requirement: STRICT MANA NAUKARI URLS ENFORCEMENT NOTICE */}
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
                {result.successfulJobs.length > 0 ? (
                  <div className="relative rounded-2xl border border-slate-300 bg-slate-900 text-slate-100 p-5 shadow-inner">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-bold text-slate-200 capitalize">
                          {activeMessageFormat} Output Preview
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
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No successful jobs available to generate message.</p>
                  </div>
                )}
              </div>
            </div>

            {/* List of Successfully Imported Jobs */}
            {result.successfulJobs.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Imported Database Records ({result.successfulJobs.length})</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    All jobs are active and live on Mana Naukari
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {result.successfulJobs.map((item, idx) => (
                    <div key={item.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 p-2 rounded-xl transition-colors">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <h5 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            {item.title}
                          </h5>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                            {item.company}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Saved to DB</span>
                          </span>
                        </div>

                        <div className="pl-8 text-[11px] text-slate-400 font-mono truncate max-w-xl">
                          Source: {item.originalUrl}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pl-8">
                          <span>📍 <strong>Location:</strong> {item.location}</span>
                          <span>⏳ <strong>Experience:</strong> {item.experience}</span>
                          {item.salary && <span>💰 <strong>Package:</strong> {item.salary}</span>}
                        </div>

                        {/* Skills */}
                        {item.skills && item.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pl-8 pt-0.5">
                            {item.skills.map((skill, sIdx) => (
                              <span key={sIdx} className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 6. Mana Naukari URL strictly shown */}
                        <div className="pl-8 pt-1 flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400">Mana Naukari Link:</span>
                          <a
                            href={item.seoSlugPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline truncate max-w-lg inline-flex items-center gap-1"
                          >
                            <span>{item.manaNaukariUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      </div>

                      {/* Item Quick Actions */}
                      <div className="flex items-center gap-2 pl-8 md:pl-0 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.manaNaukariUrl);
                            setToastMessage(`✓ Copied: ${item.manaNaukariUrl}`);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Link</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigate(`/admin/jobs/edit/${item.id}`)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                        >
                          Edit
                        </button>

                        <a
                          href={item.seoSlugPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>View Page</span>
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
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
                            Import Failed
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

      {/* Copy link feedback toast */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
};
