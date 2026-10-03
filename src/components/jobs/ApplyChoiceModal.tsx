import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Zap, ArrowRight, X, ShieldCheck, CheckCircle2, 
  Target, FileText, BarChart3, Clock, ChevronRight
} from 'lucide-react';
import { Job } from '../../types/database.types';

interface ApplyChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  onSelectCheckMatch: () => void;
  onSelectDirectApply: () => void;
}

export const ApplyChoiceModal: React.FC<ApplyChoiceModalProps> = ({
  isOpen,
  onClose,
  job,
  onSelectCheckMatch,
  onSelectDirectApply,
}) => {
  // Retain window scroll position when modal closes
  const scrollYRef = React.useRef<number>(0);

  // Prevent page scroll when modal is open; restore when closed
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

  const modalContent = (
    <div
      id="apply-choice-portal-wrapper"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-choice-title"
    >
      {/* Full-screen backdrop */}
      <div
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

      {/* Modal Window: Fixed exactly at center */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          maxWidth: '700px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        className="border border-slate-200/90"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner - Fixed at top */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-7 text-white relative overflow-hidden shrink-0">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-start justify-between relative z-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold backdrop-blur-xs mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Official Verified Requisition</span>
              </div>
              <h2 id="apply-choice-title" className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
                Apply for {job.title}
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 mt-1 font-medium">
                {job.company} · {job.location}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Options - Internal Scroll if content exceeds height */}
        <div 
          style={{
            maxHeight: 'calc(90vh - 140px)',
            overflowY: 'auto',
          }}
          className="p-6 sm:p-7 space-y-4 bg-slate-50/50 overflow-y-auto"
        >
          <div className="text-center sm:text-left mb-1">
            <h3 className="text-sm font-bold text-slate-900 font-display">
              Choose How You&apos;d Like to Proceed:
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Optimize your application with ATS screening or apply directly.
            </p>
          </div>

          {/* Option A: Check Match & Apply (Highlighted) */}
          <div
            onClick={onSelectCheckMatch}
            className="group relative p-5 sm:p-6 rounded-2xl bg-white border-2 border-blue-500/80 hover:border-blue-600 hover:shadow-lg transition-all duration-200 cursor-pointer ring-4 ring-blue-50"
          >
            <div className="absolute -top-3 right-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>Recommended · 84% Higher Call Rate</span>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                <Target className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors font-display">
                    Option A: Check ATS Match &amp; Apply
                  </h4>
                  <span className="hidden sm:inline-flex items-center text-xs font-bold text-blue-600 gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Launch Scan</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                  Upload your resume to check match score against <span className="font-semibold text-slate-800">{job.company}</span>&apos;s criteria, discover missing skills, and get personalized ATS optimization tips before applying.
                </p>

                <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Match Percentage</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Skill Gap Analysis</span>
                  </span>
                  <span className="col-span-2 sm:col-span-1 flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Takes ~5 seconds</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Option B: Direct Apply */}
          <div
            onClick={onSelectDirectApply}
            className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
                <Zap className="w-5 h-5 text-slate-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-slate-900 transition-colors font-display">
                    Option B: Direct Apply
                  </h4>
                  <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 flex items-center gap-0.5">
                    <span>Skip Scan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Skip ATS resume screening and proceed directly to confirm your details and access the official careers portal application link.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note - Fixed at bottom */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Free ATS evaluation for all job seekers</span>
          </span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
