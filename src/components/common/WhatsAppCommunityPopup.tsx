import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, MessageSquare, ShieldCheck, Sparkles, BellRing, ExternalLink } from 'lucide-react';
import { OFFICIAL_LINKS } from '../../constants/links';
import { analyticsTracker } from '../../services/analyticsTracker';

interface WhatsAppCommunityPopupProps {
  currentPath?: string;
}

const STORAGE_KEY = 'cv_wa_popup_dismissed_until';
const DISMISS_DAYS = 7;
const JOINED_DAYS = 30;

export const WhatsAppCommunityPopup: React.FC<WhatsAppCommunityPopupProps> = ({ currentPath }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if current route is an admin route
  const isAdminRoute = (path?: string) => {
    if (!path && typeof window !== 'undefined') {
      path = window.location.pathname;
    }
    return Boolean(path && (path.startsWith('/admin') || path.startsWith('/recruiter/dashboard')));
  };

  useEffect(() => {
    // Never show inside admin pages
    if (isAdminRoute(currentPath)) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsOpen(false);
      return;
    }

    // Check localStorage snooze timestamp
    try {
      const dismissedUntil = localStorage.getItem(STORAGE_KEY);
      if (dismissedUntil) {
        const snoozeExpiry = parseInt(dismissedUntil, 10);
        if (!isNaN(snoozeExpiry) && Date.now() < snoozeExpiry) {
          // Still in cooldown period
          return;
        }
      }
    } catch (e) {
      console.debug('[WhatsAppPopup] LocalStorage read notice:', e);
    }

    // Show popup after 3 seconds
    timerRef.current = setTimeout(() => {
      // Re-verify we aren't on an admin page before rendering
      if (!isAdminRoute(window.location.pathname)) {
        setIsOpen(true);
        // Track popup impression
        analyticsTracker.trackWhatsAppPopup('view');
      }
    }, 3000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentPath]);

  // Handle ESC key dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss('close_click');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const setSnooze = (days: number) => {
    try {
      const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, expiry.toString());
    } catch (e) {
      console.debug('[WhatsAppPopup] LocalStorage write notice:', e);
    }
  };

  const handleDismiss = (reason: 'close_click' | 'maybe_later_click') => {
    // Snooze for 7 days
    setSnooze(DISMISS_DAYS);
    analyticsTracker.trackWhatsAppPopup(reason);
    
    // Trigger smooth fade-out
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  };

  const handleJoin = () => {
    // Snooze for 30 days
    setSnooze(JOINED_DAYS);
    analyticsTracker.trackWhatsAppPopup('join_click');

    // Open WhatsApp Channel in new tab
    window.open(OFFICIAL_LINKS.WHATSAPP_CHANNEL, '_blank', 'noopener,noreferrer');

    // Close modal
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-popup-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${
        isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      {/* Dimmed backdrop with subtle blur - clicking backdrop closes with 7-day snooze */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => handleDismiss('close_click')}
        aria-hidden="true"
      />

      {/* Modern Glassmorphism Card */}
      <div
        ref={popupRef}
        className="relative w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/80 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-900 z-10 overflow-hidden max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-100/60 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-teal-100/50 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header with Dismiss 'X' Button */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <MessageSquare className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                <BellRing className="w-3 h-3 text-emerald-600" />
                <span>Instant Alerts</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleDismiss('close_click')}
            className="p-1.5 -mr-1.5 -mt-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close popup"
            title="Maybe later (Close for 7 days)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <div className="mt-4 space-y-1.5 relative z-10">
          <h2
            id="wa-popup-title"
            className="text-xl sm:text-2xl font-extrabold font-display tracking-tight text-slate-900"
          >
            🚀 Get Daily Job Updates
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            Join the official <span className="font-semibold text-slate-900">Mana Naukari</span> WhatsApp community and receive:
          </p>
        </div>

        {/* Value Proposition List */}
        <div className="my-5 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-2xl p-4 border border-slate-200/80 space-y-2.5 text-xs sm:text-sm relative z-10">
          <div className="flex items-center gap-2.5 text-slate-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Freshers Jobs &amp; Entry-Level Openings</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tech &amp; Non-Tech Internships</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Work From Home Jobs (Remote)</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Off Campus Drives &amp; Walk-ins</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Resume &amp; Career Tips</span>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1 pb-4 relative z-10">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            100% Free · Spam Free
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            50,000+ Students Joined
          </span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 relative z-10">
          {/* Primary Action: Join WhatsApp */}
          <button
            onClick={handleJoin}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <MessageSquare className="w-4 h-4 fill-white transition-transform group-hover:scale-110" />
            <span>Join WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Secondary Action: Maybe Later */}
          <button
            onClick={() => handleDismiss('maybe_later_click')}
            className="w-full py-2.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
        </div>

        {/* Privacy footnote */}
        <p className="mt-3 text-[10px] text-center text-slate-400">
          Direct WhatsApp channel • Your phone number remains completely private
        </p>
      </div>
    </div>
  );
};
