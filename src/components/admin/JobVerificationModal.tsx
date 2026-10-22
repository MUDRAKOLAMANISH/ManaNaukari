import React, { useState } from 'react';
import { X, RefreshCw, ShieldCheck, ExternalLink, AlertTriangle, CheckCircle2, Clock, Check, PowerOff, Pause, Play } from 'lucide-react';
import { Job } from '../../types/database.types';
import { jobAvailabilityService } from '../../services/jobAvailabilityService';
import { VerificationResult } from '../../services/jobVerificationEngine';

interface JobVerificationModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onJobUpdated: () => void;
  onUpdateStatus: (job: Job, newStatus: string) => void;
}

export const JobVerificationModal: React.FC<JobVerificationModalProps> = ({
  job,
  isOpen,
  onClose,
  onJobUpdated,
  onUpdateStatus,
}) => {
  const [verifying, setVerifying] = useState(false);
  const [latestResult, setLatestResult] = useState<VerificationResult | null>(null);
  const [overrideSuccessMessage, setOverrideSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !job) return null;

  const handleRunVerification = async () => {
    setVerifying(true);
    setOverrideSuccessMessage(null);
    try {
      const res = await jobAvailabilityService.checkAndUpdateJobById(job.id);
      if (res.success && res.result) {
        setLatestResult(res.result);
        onJobUpdated();
      } else {
        alert(`Verification failed: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error running verification: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleManualOverride = (newStatus: string) => {
    onUpdateStatus(job, newStatus);
    setOverrideSuccessMessage(`Job status manually updated to "${newStatus}".`);
    setTimeout(() => setOverrideSuccessMessage(null), 3000);
  };

  // Determine displayed fields
  const status = latestResult ? latestResult.status : (job.status === 'active' ? 'OPEN' : job.status === 'needs_review' ? 'NEEDS_REVIEW' : job.status.toUpperCase());
  const confidence = latestResult ? latestResult.confidence : (job.verification_confidence || 'MEDIUM');
  const reason = latestResult ? latestResult.reason : (job.review_reason || 'No previous issues flagged.');
  const evidenceSummary = latestResult ? latestResult.evidence.evidenceSummary : (job.verification_evidence || job.review_reason || 'Awaiting live verification check.');
  const finalUrl = latestResult ? latestResult.evidence.finalUrl : (job.final_url || job.apply_link);
  const lastChecked = latestResult ? latestResult.lastChecked : (job.review_date || job.updated_at);
  const method = latestResult ? latestResult.evidence.verificationMethod : 'deterministic_html';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center shrink-0 font-bold">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black font-display tracking-tight text-white flex items-center gap-2">
                <span>Availability Audit Engine</span>
                <span className="text-[10px] font-extrabold text-blue-200 bg-blue-900/80 px-2 py-0.5 rounded-full border border-blue-700/60 uppercase">
                  Evidence Based
                </span>
              </h3>
              <p className="text-xs text-slate-300 font-medium line-clamp-1">
                {job.title} — <span className="text-slate-200 font-bold">{job.company}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {overrideSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{overrideSuccessMessage}</span>
            </div>
          )}

          {/* Top Status & Confidence Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Verification Result
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border ${
                    status === 'OPEN' || job.status === 'active'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : status === 'CLOSED' || job.status === 'closed'
                      ? 'bg-slate-100 text-slate-800 border-slate-300'
                      : status === 'EXPIRED' || job.status === 'expired'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : status === 'NEEDS_REVIEW' || job.status === 'needs_review'
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <span>
                    {status === 'OPEN' || job.status === 'active'
                      ? '🟢'
                      : status === 'CLOSED' || job.status === 'closed'
                      ? '🔒'
                      : status === 'EXPIRED' || job.status === 'expired'
                      ? '🔴'
                      : '⚠️'}
                  </span>
                  <span>{status}</span>
                </span>
              </div>
            </div>

            {/* Confidence Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Confidence Level
              </span>
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold uppercase border ${
                    confidence === 'HIGH'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : confidence === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{confidence} Confidence</span>
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Audit Report */}
          <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 border border-slate-800 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-amber-400 font-bold text-[11px] uppercase tracking-wider">Audit Evidence Breakdown</span>
              <span className="text-[10px] text-slate-400">
                Method: <strong className="text-slate-200 uppercase">{method}</strong>
              </span>
            </div>

            <div className="space-y-2 text-[11px] leading-relaxed">
              <div>
                <span className="text-slate-400">Target Requisition:</span> <span className="text-white font-bold">{job.title}</span> ({job.company})
              </div>

              <div>
                <span className="text-slate-400">Official Apply Link:</span>{' '}
                <a
                  href={job.apply_link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-blue-400 underline break-all hover:text-blue-300"
                >
                  {job.apply_link}
                </a>
              </div>

              {finalUrl && finalUrl !== job.apply_link && (
                <div>
                  <span className="text-slate-400">Final Redirect Destination:</span>{' '}
                  <span className="text-amber-300 break-all">{finalUrl}</span>
                </div>
              )}

              <div>
                <span className="text-slate-400">Summary Reason:</span> <span className="text-white font-semibold">{reason}</span>
              </div>

              <div>
                <span className="text-slate-400">Collected Evidence:</span>{' '}
                <span className="text-emerald-300">{evidenceSummary}</span>
              </div>

              <div>
                <span className="text-slate-400">Last Verified Timestamp:</span>{' '}
                <span className="text-slate-300">{lastChecked ? new Date(lastChecked).toLocaleString() : 'Not yet checked'}</span>
              </div>
            </div>
          </div>

          {/* Live Action Bar */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Manual Override &amp; Live Verification
              </span>
              
              <button
                onClick={handleRunVerification}
                disabled={verifying}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                <span>{verifying ? 'Running Live Check...' : 'Re-Run Verification Now'}</span>
              </button>
            </div>

            {/* Manual Override Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <button
                onClick={() => handleManualOverride('active')}
                className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-colors cursor-pointer"
              >
                🟢 Force Keep Active
              </button>

              <button
                onClick={() => handleManualOverride('needs_review')}
                className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors cursor-pointer"
              >
                ⚠️ Flag Needs Review
              </button>

              <button
                onClick={() => handleManualOverride('closed')}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-200 hover:bg-slate-300 border border-slate-400 rounded-xl transition-colors cursor-pointer"
              >
                🔒 Mark Closed
              </button>

              <button
                onClick={() => handleManualOverride('expired')}
                className="px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-xl transition-colors cursor-pointer"
              >
                🔴 Mark Expired
              </button>

              <button
                onClick={() => handleManualOverride('paused')}
                className="px-3 py-1.5 text-xs font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-xl transition-colors cursor-pointer"
              >
                🟡 Pause Job
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
