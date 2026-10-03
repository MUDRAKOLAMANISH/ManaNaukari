import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, ExternalLink, X, AlertCircle, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';

interface ReapplyConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReapply: () => void;
  jobTitle: string;
  company: string;
  appliedDate?: string | null;
  isReapplying?: boolean;
}

export const ReapplyConfirmModal: React.FC<ReapplyConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmReapply,
  jobTitle,
  company,
  appliedDate,
  isReapplying = false,
}) => {
  const scrollYRef = useRef<number>(0);

  // Prevent background scrolling while modal is open, restore when closed
  useEffect(() => {
    if (isOpen) {
      scrollYRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      if (typeof scrollYRef.current === 'number') {
        window.scrollTo({ top: scrollYRef.current, left: 0, behavior: 'instant' as ScrollBehavior });
      }
    }
    return () => {
      document.body.style.overflow = 'auto';
      if (typeof scrollYRef.current === 'number') {
        window.scrollTo({ top: scrollYRef.current, left: 0, behavior: 'instant' as ScrollBehavior });
      }
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const formattedDate = appliedDate
    ? new Date(appliedDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'a previous date';

  const modalContent = (
    <div
      id="reapply-confirm-modal-wrapper"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reapply-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
    >
      {/* 2. Full-screen backdrop: background: rgba(0,0,0,0.6) + backdrop blur */}
      <div
        id="reapply-modal-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 9998,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 3. Modal Position: fixed, top: 50%, left: 50%, transform: translate(-50%, -50%), zIndex: 9999 */}
      <div
        id="reapply-modal-container"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          maxWidth: '520px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        className="border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-100 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Existing Application</span>
              </div>
              <h3 id="reapply-modal-title" className="text-base sm:text-lg font-black font-display text-white">
                Reapply to {company}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body with internal scroll */}
        <div
          style={{
            maxHeight: 'calc(90vh - 130px)',
            overflowY: 'auto',
          }}
          className="p-6 space-y-4 text-slate-700"
        >
          {/* Status banner */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-emerald-900 block">✓ Application Active on Record</span>
              <span className="text-emerald-700 font-medium">
                Initial application recorded on {formattedDate}. Your profile remains safely preserved in recruiter records.
              </span>
            </div>
          </div>

          {/* Prompt 7 Required text */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800 leading-snug">
              You previously started an application for this job. Would you like to open the official application again?
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Clicking <strong>Reapply Now</strong> will reopen the official {company} careers portal in a new tab without creating duplicate applicant records or altering your existing profile.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span className="font-medium text-slate-500">Position:</span>
              <span className="font-bold text-slate-800 truncate max-w-[260px]">{jobTitle}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="font-medium text-slate-500">Employer:</span>
              <span className="font-bold text-slate-800">{company}</span>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isReapplying}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirmReapply}
            disabled={isReapplying}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 rounded-xl shadow-md transition-all cursor-pointer"
          >
            {isReapplying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Reopening Application...</span>
              </>
            ) : (
              <>
                <span>Reapply Now</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
