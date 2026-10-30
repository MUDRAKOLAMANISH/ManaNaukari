import React, { useState } from 'react';
import { X, ShieldCheck, ExternalLink, CheckCircle2, AlertTriangle, Trash2, Check, RefreshCw, Lock } from 'lucide-react';
import { BatchCheckSummary, FlaggedJobDetail } from '../../services/jobAvailabilityService';
import { adminJobsService } from '../../services/adminJobsService';

interface ScanResultsModalProps {
  summary: BatchCheckSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onRefreshJobs: () => void;
}

export const ScanResultsModal: React.FC<ScanResultsModalProps> = ({
  summary,
  isOpen,
  onClose,
  onRefreshJobs,
}) => {
  const [processing, setProcessing] = useState<string | null>(null);
  const [processedIds, setProcessedIds] = useState<Record<string, 'closed' | 'active'>>({});
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  if (!isOpen || !summary) return null;

  const flaggedJobs = summary.flaggedJobs || [];

  const handleSetJobStatus = async (jobId: string, newStatus: 'closed' | 'active' | 'deleted') => {
    setProcessing(jobId);
    try {
      if (newStatus === 'deleted' || newStatus === 'closed') {
        await adminJobsService.updateJob(jobId, { status: newStatus as any, review_reason: 'Confirmed by automated availability checker audit' });
      } else {
        await adminJobsService.updateJob(jobId, { status: 'active', review_reason: 'Manually verified as active by admin' });
      }
      setProcessedIds((prev) => ({ ...prev, [jobId]: newStatus === 'active' ? 'active' : 'closed' }));
      onRefreshJobs();
    } catch (err: any) {
      alert(`Could not update job status: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleConfirmAllClosed = async () => {
    if (flaggedJobs.length === 0) return;
    setIsBatchProcessing(true);

    try {
      const pendingJobs = flaggedJobs.filter((f) => !processedIds[f.id]);
      for (const job of pendingJobs) {
        await adminJobsService.updateJob(job.id, {
          status: 'closed',
          review_reason: job.reason || 'Closed / Removed requisition confirmed during batch audit',
        });
        setProcessedIds((prev) => ({ ...prev, [job.id]: 'closed' }));
      }
      onRefreshJobs();
    } catch (err: any) {
      alert(`Error closing jobs: ${err.message}`);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
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
                <span>Availability Audit Results</span>
                <span className="text-[10px] font-extrabold text-blue-200 bg-blue-900/80 px-2 py-0.5 rounded-full border border-blue-700/60 uppercase">
                  Scan Summary
                </span>
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Audited <strong className="text-white">{summary.totalChecked}</strong> live postings across employer career portals
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

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Summary Metric Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-center">
              <span className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Active / Open</span>
              <span className="text-2xl font-black text-emerald-900">{summary.openCount}</span>
            </div>

            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200/80 text-center">
              <span className="block text-[10px] font-bold text-rose-700 uppercase tracking-wider">Closed / Deleted</span>
              <span className="text-2xl font-black text-rose-900">{summary.closedCount}</span>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-center">
              <span className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider">Needs Review</span>
              <span className="text-2xl font-black text-amber-900">{summary.needsReviewCount}</span>
            </div>

            <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-center">
              <span className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Unverified</span>
              <span className="text-2xl font-black text-slate-800">{summary.unverifiedCount}</span>
            </div>
          </div>

          {/* Flagged Jobs Header & Batch Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Detected Closed / Removed Postings ({flaggedJobs.length})</span>
              </h4>
              <p className="text-xs text-slate-500">
                Jobs where official employer URLs returned 404, redirect to main portal, or show closed status.
              </p>
            </div>

            {flaggedJobs.length > 0 && (
              <button
                onClick={handleConfirmAllClosed}
                disabled={isBatchProcessing}
                className="px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
              >
                {isBatchProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Close All ({flaggedJobs.length})</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* List of Flagged Jobs */}
          {flaggedJobs.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50/60 rounded-3xl border border-emerald-200/80 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto font-black text-xl">
                ✓
              </div>
              <h5 className="text-sm font-bold text-emerald-950">100% Active Postings Verified</h5>
              <p className="text-xs text-emerald-800/90 max-w-md mx-auto">
                No deleted or closed requisitions were detected. All active employer links responded with live application controls.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {flaggedJobs.map((item) => {
                const statusState = processedIds[item.id];

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      statusState === 'closed'
                        ? 'bg-slate-100 border-slate-300 opacity-75'
                        : statusState === 'active'
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-amber-50/40 border-amber-200/80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${
                              item.status === 'closed'
                                ? 'bg-slate-200 text-slate-800 border-slate-300'
                                : item.status === 'expired'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {statusState ? statusState.toUpperCase() : item.status}
                          </span>
                          <h5 className="text-xs sm:text-sm font-extrabold text-slate-900 font-display">
                            {item.title}
                          </h5>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">
                          Company: <strong className="text-slate-800">{item.company}</strong>
                        </p>
                      </div>

                      <a
                        href={item.apply_link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 underline self-start sm:self-auto shrink-0"
                      >
                        <span>Test Requisition URL</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/80 text-[11px] space-y-1 font-mono">
                      <p className="text-slate-800 font-semibold">
                        <span className="text-amber-700 font-bold">Detection Reason:</span> {item.reason}
                      </p>
                      {item.evidenceSummary && (
                        <p className="text-slate-600 text-[10px]">
                          Evidence: {item.evidenceSummary}
                        </p>
                      )}
                    </div>

                    {/* Action buttons per job */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {statusState ? (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Status Updated: {statusState}</span>
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSetJobStatus(item.id, 'active')}
                            disabled={processing === item.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 transition-colors cursor-pointer"
                          >
                            🟢 Keep Active
                          </button>

                          <button
                            onClick={() => handleSetJobStatus(item.id, 'closed')}
                            disabled={processing === item.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Mark Closed</span>
                          </button>

                          <button
                            onClick={() => handleSetJobStatus(item.id, 'deleted')}
                            disabled={processing === item.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hide / Soft Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-all cursor-pointer shadow-2xs"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
};
