import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, X } from 'lucide-react';
import { Job } from '../../types/database.types';

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  applicantName: string;
  setApplicantName: (val: string) => void;
  applicantEmail: string;
  setApplicantEmail: (val: string) => void;
  applicantPhone: string;
  setApplicantPhone: (val: string) => void;
  isSubmittingLead: boolean;
  leadError: string | null;
  leadSuccess: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const ApplyModal: React.FC<ApplyModalProps> = ({
  isOpen,
  onClose,
  job,
  applicantName,
  setApplicantName,
  applicantEmail,
  setApplicantEmail,
  applicantPhone,
  setApplicantPhone,
  isSubmittingLead,
  leadError,
  leadSuccess,
  onSubmit,
}) => {
  // Prevent page scrolling while modal is open; restore when closed
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 select-none-modal"
      style={{ zIndex: 9999 }}
      aria-labelledby="apply-now-modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop overlay */}
      <div
        className="apply-modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card Centered Vertically & Horizontally */}
      <div
        className="apply-modal-container bg-white border border-slate-200/90 p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <h3
              id="apply-now-modal-title"
              className="text-lg sm:text-xl font-bold font-display text-slate-900 leading-snug"
            >
              Apply for {job.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Confirm your contact details to continue to <span className="font-semibold text-slate-700">{job.company}</span>&apos;s official careers portal.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1.5 -mt-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message Box */}
        {leadError && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs space-y-1 animate-fadeIn">
            <div className="font-bold flex items-center gap-1.5 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Submission Error</span>
            </div>
            <p className="leading-relaxed">{leadError}</p>
          </div>
        )}

        {/* Success or Application Form */}
        {leadSuccess ? (
          <div className="py-8 text-center space-y-3 animate-fadeIn">
            <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-slate-900 text-lg">Application Verified!</h4>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              Redirecting you to the official {job.company} careers portal in a new window...
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 pt-5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-shadow"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="rahul@example.com"
                value={applicantEmail}
                onChange={(e) => setApplicantEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-shadow"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="9876543210"
                value={applicantPhone}
                onChange={(e) => setApplicantPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-shadow"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Enter a valid 10-digit mobile number for off-campus drive notifications
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmittingLead}
                className="w-full py-3.5 px-5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmittingLead ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying & Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Official Apply Page</span>
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
