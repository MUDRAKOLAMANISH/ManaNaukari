import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';
import { OFFICIAL_LINKS } from '../../constants/links';
import { analyticsTracker } from '../../services/analyticsTracker';

interface WhatsAppCommunityPopupProps {
  currentPath?: string;
}

const WA_JOINED_KEY = 'whatsappJoined';
const WA_MAYBE_LATER_KEY = 'wa_maybe_later_timestamp';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// WhatsApp Official SVG Icon
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export const WhatsAppCommunityPopup: React.FC<WhatsAppCommunityPopupProps> = ({ currentPath }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Check if current route is an internal admin route where popups should not intrude
  const isAdminRoute = (path?: string) => {
    if (!path && typeof window !== 'undefined') {
      path = window.location.pathname;
    }
    return Boolean(path && (path.startsWith('/admin') || path.startsWith('/recruiter/dashboard')));
  };

  // Evaluation logic on website load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isAdminRoute(currentPath)) {
      setIsOpen(false);
      return;
    }

    // 1. Never show if user already clicked "Join WhatsApp Group" (whatsappJoined=true)
    try {
      const isJoined = localStorage.getItem(WA_JOINED_KEY);
      if (isJoined === 'true') {
        setHasChecked(true);
        return;
      }

      // 2. Check if user clicked "Maybe Later" within the last 24 hours
      const maybeLaterTimestamp = localStorage.getItem(WA_MAYBE_LATER_KEY);
      if (maybeLaterTimestamp) {
        const timeParsed = parseInt(maybeLaterTimestamp, 10);
        if (!isNaN(timeParsed) && Date.now() - timeParsed < TWENTY_FOUR_HOURS_MS) {
          // Snoozed for 24h
          setHasChecked(true);
          return;
        }
      }
    } catch (e) {
      console.debug('[WhatsAppPopup] LocalStorage read notice:', e);
    }

    // 3. Show popup automatically when website opens (smooth 600ms mount delay)
    const timer = setTimeout(() => {
      if (!isAdminRoute(window.location.pathname)) {
        setIsOpen(true);
        setHasChecked(true);
        analyticsTracker.trackWhatsAppPopup('view');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [currentPath]);

  // Handle ESC key dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleMaybeLater();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click "Join WhatsApp Group":
  // - Save localStorage key: whatsappJoined=true
  // - Never show popup again
  // - Open WhatsApp channel
  const handleJoinWhatsApp = () => {
    try {
      localStorage.setItem(WA_JOINED_KEY, 'true');
    } catch (e) {
      console.debug('[WhatsAppPopup] LocalStorage write notice:', e);
    }

    analyticsTracker.trackWhatsAppPopup('join_click');
    window.open(OFFICIAL_LINKS.WHATSAPP_CHANNEL, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  // Click "Maybe Later":
  // - Save timestamp
  // - Show again after 24 hours
  const handleMaybeLater = () => {
    try {
      localStorage.setItem(WA_MAYBE_LATER_KEY, Date.now().toString());
    } catch (e) {
      console.debug('[WhatsAppPopup] LocalStorage write notice:', e);
    }

    analyticsTracker.trackWhatsAppPopup('maybe_later_click');
    setIsOpen(false);
  };

  return (
    <>
      {/* ========================================================
          1. CENTER MODAL POPUP (AUTOMATIC ON PAGE LOAD)
          ======================================================== */}
      <AnimatePresence>
        {isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wa-popup-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={handleMaybeLater}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Glassmorphism Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[32px] shadow-2xl p-6 sm:p-7 text-slate-900 z-10 overflow-hidden max-h-[90vh] overflow-y-auto ring-1 ring-slate-900/5"
            >
              {/* WhatsApp Green Top Accent Gradient */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#25D366] via-emerald-500 to-[#128C7E]" />
              <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-[#25D366]/15 rounded-full blur-3xl pointer-events-none" />

              {/* Header with WhatsApp Logo & Close Button */}
              <div className="flex items-start justify-between gap-3 relative z-10 pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 ring-4 ring-emerald-100">
                    <WhatsAppIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                      <span>Official Channel</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMaybeLater}
                  className="p-2 -mr-1.5 -mt-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  aria-label="Close"
                  title="Maybe Later"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title */}
              <div className="mt-4 space-y-1.5 relative z-10">
                <h2
                  id="wa-popup-title"
                  className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 leading-snug"
                >
                  🚀 Join Mana Naukari Job Alerts
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">
                  Get daily verified:
                </p>
              </div>

              {/* Description Bullet Items */}
              <div className="my-4 bg-gradient-to-br from-emerald-50/70 via-slate-50 to-teal-50/50 rounded-2xl p-4 border border-emerald-100/80 space-y-2.5 text-xs sm:text-sm relative z-10">
                <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
                  <span className="text-base leading-none">✅</span>
                  <span>Freshers Jobs</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
                  <span className="text-base leading-none">✅</span>
                  <span>Internships</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
                  <span className="text-base leading-none">✅</span>
                  <span>Work From Home Jobs</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
                  <span className="text-base leading-none">✅</span>
                  <span>Off-Campus Drives</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
                  <span className="text-base leading-none">✅</span>
                  <span>Direct Company Hiring Updates</span>
                </div>
              </div>

              {/* Trust Subtext */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1 pb-3 relative z-10">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  100% Free · No Spam
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  50,000+ Job Seekers
                </span>
              </div>

              {/* Buttons */}
              <div className="space-y-2.5 relative z-10 pt-1">
                {/* Primary Button: Join WhatsApp Group */}
                <button
                  type="button"
                  onClick={handleJoinWhatsApp}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-[#25D366] via-emerald-500 to-[#128C7E] hover:from-[#20bd5a] hover:to-[#0f7a6d] active:scale-[0.98] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
                >
                  <WhatsAppIcon className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
                  <span>Join WhatsApp Group</span>
                  <ExternalLink className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Secondary Button: Maybe Later */}
                <button
                  type="button"
                  onClick={handleMaybeLater}
                  className="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
                >
                  Maybe Later
                </button>
              </div>

              {/* Privacy Footnote */}
              <p className="mt-3 text-[10.5px] text-center text-slate-400">
                Direct WhatsApp Channel • Your contact details remain 100% private
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          2. SMALL WHATSAPP FLOATING BUTTON (BOTTOM RIGHT)
          - Visible on all pages
          - Opens same WhatsApp channel
          ======================================================== */}
      <aside
        aria-label="WhatsApp Community Alerts"
        className="fixed bottom-24 right-5 sm:bottom-24 sm:right-6 z-40 flex items-center group"
      >
          {/* Tooltip on Hover */}
          <span
            className="hidden sm:inline-block pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 mr-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold shadow-lg shadow-slate-900/20 whitespace-nowrap"
          >
            Join WhatsApp Channel
          </span>

          {/* Floating WhatsApp Action Button */}
          <button
            type="button"
            onClick={() => {
              analyticsTracker.trackWhatsAppPopup('join_click');
              window.open(OFFICIAL_LINKS.WHATSAPP_CHANNEL, '_blank', 'noopener,noreferrer');
            }}
            className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#25D366] to-[#128C7E] hover:from-[#20bd5a] hover:to-[#0f7a6d] active:scale-95 text-white flex items-center justify-center shadow-xl shadow-emerald-600/35 hover:shadow-2xl hover:shadow-emerald-600/50 ring-4 ring-emerald-400/20 transition-all transform hover:scale-105 cursor-pointer"
            aria-label="Join WhatsApp Group for Daily Job Alerts"
            title="Join WhatsApp Group for Daily Job Alerts"
          >
            <WhatsAppIcon className="w-7 h-7 text-white" />

            {/* Glowing Animated Pulse Indicator */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
            </span>
          </button>
        </aside>
    </>
  );
};
