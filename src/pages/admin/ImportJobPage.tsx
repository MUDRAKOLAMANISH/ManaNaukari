import React, { useState } from 'react';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { JobForm } from '../../components/admin/JobForm';
import { Job } from '../../types/database.types';
import { 
  Sparkles, Globe, ArrowRight, Loader2, AlertCircle, 
  CheckCircle2, RefreshCw, FileText, Info, Edit3
} from 'lucide-react';

interface ImportJobPageProps {
  onNavigate: (path: string) => void;
}

export const ImportJobPage: React.FC<ImportJobPageProps> = ({ onNavigate }) => {
  const [url, setUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedJob, setExtractedJob] = useState<Partial<Job> | null>(null);
  const [step, setStep] = useState<'url_input' | 'review_edit'>('url_input');
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Helper to extract a friendly company name from URL domain as helper hint
  const extractDomainHint = (inputUrl: string): string => {
    try {
      const parsed = new URL(inputUrl);
      const hostname = parsed.hostname.replace(/^www\./, '');
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        const name = parts[0];
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
      return '';
    } catch {
      return '';
    }
  };

  const handleFetchJob = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      alert('Please enter an official job URL.');
      return;
    }

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      alert('URL must begin with http:// or https://');
      return;
    }

    setIsExtracting(true);
    setIsFallbackMode(false);

    try {
      const response = await fetch('/api/ai/extract-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const result = await response.json();

      // If AI fails (e.g. 503 high demand, 500, or any failure)
      if (!response.ok || !result.success || !result.data) {
        console.warn('AI extraction returned non-success response:', result);
        triggerFallback(trimmedUrl);
        return;
      }

      const raw = result.data;

      // Check if backend used fallback mode due to 503 or scrap blockage
      if (result.isFallback) {
        setIsFallbackMode(true);
      } else {
        setIsFallbackMode(false);
      }

      // Map AI extracted attributes to Job model
      const mappedJob: Partial<Job> = {
        title: raw.title || '',
        company: raw.company || '',
        company_logo: null,
        location: raw.location || 'Pan India',
        salary: raw.salary || '',
        experience: raw.experience || 'Fresher',
        job_type: raw.job_type || 'Fresher',
        category: raw.category || 'Software Engineering',
        skills_required: Array.isArray(raw.skills_required) ? raw.skills_required : [],
        description: raw.description || '',
        apply_link: raw.apply_link || trimmedUrl,
        source: raw.source || 'Official Careers Portal',
        featured: false,
        status: 'active',
        posted_date: new Date().toISOString().split('T')[0],
      };

      setExtractedJob(mappedJob);
      setStep('review_edit');
    } catch (err: any) {
      console.warn('Network or AI exception encountered during extract-job:', err);
      // Fallback: Never halt or show error screen; open Add Job form with the URL populated
      triggerFallback(trimmedUrl);
    } finally {
      setIsExtracting(false);
    }
  };

  // Graceful Fallback Handler: Opens the Add Job form with the Apply Link pre-filled
  const triggerFallback = (pastedUrl: string) => {
    const domainHint = extractDomainHint(pastedUrl);
    const fallbackJob: Partial<Job> = {
      title: '',
      company: domainHint || '',
      company_logo: null,
      location: 'Pan India',
      salary: '',
      experience: 'Fresher',
      job_type: 'Fresher',
      category: 'Software Engineering',
      skills_required: [],
      description: '',
      apply_link: pastedUrl, // Apply Link populated with the pasted URL
      source: 'Official Careers Portal',
      featured: false,
      status: 'active',
      posted_date: new Date().toISOString().split('T')[0],
    };

    setExtractedJob(fallbackJob);
    setIsFallbackMode(true);
    setStep('review_edit');
  };

  const handleResetImport = () => {
    setExtractedJob(null);
    setStep('url_input');
    setIsFallbackMode(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-fadeIn">
      
      {/* Admin Navigation Header */}
      <AdminHeader
        title="AI Job Import Assistant"
        subtitle="Extract and parse job openings directly from official employer URLs into Supabase"
        onNavigate={onNavigate}
        showAddButton={false}
      />

      {/* Progress / Step Indicators */}
      <div className="grid grid-cols-2 gap-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/90 text-xs font-semibold">
        <button
          onClick={() => step === 'review_edit' && handleResetImport()}
          className={`py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            step === 'url_input'
              ? 'bg-white text-blue-600 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>1. Paste Job URL</span>
        </button>

        <div
          className={`py-2 px-4 rounded-xl flex items-center justify-center gap-2 ${
            step === 'review_edit'
              ? 'bg-white text-blue-600 shadow-xs font-bold'
              : 'text-slate-400'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>2. Complete & Publish</span>
        </div>
      </div>

      {step === 'url_input' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-slate-900">
                Automatic Job Extraction
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Paste any job requisition link from Workday, Greenhouse, Lever, TCS iON, or corporate career sites. The AI assistant extracts all parameters and auto-populates the publication form.
              </p>
            </div>
          </div>

          <form onSubmit={handleFetchJob} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Official Company Job URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  required
                  placeholder="https://careers.company.com/jobs/role-12345 or https://jobs.lever.co/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isExtracting}
                  className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Supported: Company ATS pages, enterprise portals, campus hiring forms, and off-campus drive posts.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="submit"
                disabled={isExtracting || !url.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Fetching Job Details...</span>
                  </>
                ) : (
                  <>
                    <span>Fetch Job Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/admin/jobs/new')}
                className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
              >
                Or enter details manually without URL
              </button>
            </div>
          </form>

          {/* Quick Examples */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-display">
              Example ATS & Career Link Formats:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                'https://tcs.com/careers/entry-level',
                'https://jobs.lever.co/company/software-engineer',
                'https://boards.greenhouse.io/corp/jobs/54321',
              ].map((exampleUrl) => (
                <button
                  key={exampleUrl}
                  type="button"
                  onClick={() => setUrl(exampleUrl)}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 font-mono text-[11px] transition-colors cursor-pointer"
                >
                  {exampleUrl}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {step === 'review_edit' && extractedJob && (
        <div className="space-y-6">
          
          {/* Status Notification Banner */}
          {isFallbackMode ? (
            <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-amber-950 font-display">
                    AI extraction unavailable. Please complete the job details manually.
                  </h3>
                  <p className="text-xs text-amber-800">
                    Your Apply Link has been automatically filled below. Please fill in the Title, Company, and Job Description to post the job.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetImport}
                className="px-3.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 rounded-xl border border-amber-300 transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Another URL</span>
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-emerald-950 font-display">
                    Job Information Extracted Successfully!
                  </h3>
                  <p className="text-xs text-emerald-800">
                    All fields have been auto-populated into the form below. Review or edit any parameters before publishing.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetImport}
                className="px-3.5 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 rounded-xl border border-emerald-300 transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Import Another URL</span>
              </button>
            </div>
          )}

          {/* Form Auto-Populated */}
          <JobForm
            mode="create"
            initialData={extractedJob}
            onNavigate={onNavigate}
            onSaved={(_savedJob) => {
              setTimeout(() => {
                onNavigate('/admin/jobs');
              }, 1200);
            }}
          />
        </div>
      )}

    </div>
  );
};
