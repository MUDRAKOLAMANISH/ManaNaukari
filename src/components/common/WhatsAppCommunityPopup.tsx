import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle2, Video, ArrowRight, Award, Zap, Users, MessageSquare, Star, Check } from 'lucide-react';
import { OFFICIAL_LINKS } from '../../constants/links';
import { analyticsTracker } from '../../services/analyticsTracker';

interface WhatsAppCommunityPopupProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const WA_JOINED_KEY = 'whatsappJoined';
const WA_MAYBE_LATER_KEY = 'wa_maybe_later_timestamp';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// WhatsApp Official SVG Icon
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// High-Fidelity Celebration Graphic Component
export const CelebrationTrophyGraphic: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Celebration sparkles backdrop */}
    <circle cx="50" cy="50" r="42" fill="url(#celebration-grad)" opacity="0.15" />
    <path d="M50 10 L53 20 L63 20 L55 26 L58 36 L50 30 L42 36 L45 26 L37 20 L47 20 Z" fill="#F59E0B" />
    
    {/* Trophy Cup */}
    <path d="M30 35 L70 35 L65 65 C60 75, 40 75, 35 65 Z" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
    <path d="M35 35 C20 35, 20 55, 33 55" stroke="#D97706" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M65 35 C80 35, 80 55, 67 55" stroke="#D97706" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M48 70 L52 70 L54 82 L46 82 Z" fill="#B45309" />
    <rect x="40" y="82" width="20" height="8" rx="2" fill="#78350F" />
    
    {/* Star Emblem on Cup */}
    <polygon points="50,42 52,47 57,47 53,50 55,55 50,52 45,55 47,50 43,47 48,47" fill="#FFFFFF" />

    <defs>
      <linearGradient id="celebration-grad" x1="0" y1="0" x2="100" y2="100">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="50%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
  </svg>
);

export const WhatsAppCommunityPopup: React.FC<WhatsAppCommunityPopupProps> = ({
  currentPath,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [confetti, setConfetti] = useState<
    Array<{ id: number; color: string; left: number; top: number; angle: number }>
  >([]);

  // Check if current route is an internal admin route where popups should not intrude
  const isAdminRoute = (path?: string) => {
    if (!path && typeof window !== 'undefined') {
      path = window.location.pathname;
    }
    return Boolean(path && (path.startsWith('/admin') || path.startsWith('/recruiter/dashboard')));
  };

  // Generate lightweight floating confetti particles on open
  useEffect(() => {
    if (isOpen) {
      const colors = ['#10B981', '#6366F1', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6'];
      const generatedConfetti = Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        color: colors[i % colors.length],
        left: 15 + Math.random() * 70,
        top: 10 + Math.random() * 40,
        angle: Math.random() * 360,
      }));
      setConfetti(generatedConfetti);
    }
  }, [isOpen]);

  // Evaluation logic on website load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isAdminRoute(currentPath)) {
      setIsOpen(false);
      return;
    }

    // 1. Check if user already clicked Join WhatsApp Group (whatsappJoined=true)
    try {
      const isJoined = localStorage.getItem(WA_JOINED_KEY);
      if (isJoined === 'true') {
        return;
      }

      // 2. Check if user dismissed/snoozed within the last 7 days
      const maybeLaterTimestamp = localStorage.getItem(WA_MAYBE_LATER_KEY);
      if (maybeLaterTimestamp) {
        const timeParsed = parseInt(maybeLaterTimestamp, 10);
        if (!isNaN(timeParsed) && Date.now() - timeParsed < SEVEN_DAYS_MS) {
          return;
        }
      }
    } catch (e) {
      console.debug('[WhatsAppPopup] LocalStorage read notice:', e);
    }

    // 3. Show popup automatically when website opens (smooth 2.5s delay)
    const timer = setTimeout(() => {
      if (!isAdminRoute(window.location.pathname)) {
        setIsOpen(true);
        analyticsTracker.trackWhatsAppPopup('popup_impression');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [currentPath]);

  // Handle ESC key dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleJoinWhatsApp = () => {
    try {
      localStorage.setItem(WA_JOINED_KEY, 'true');
    } catch (e) {
      console.debug('[WhatsAppPopup] LocalStorage write notice:', e);
    }

    analyticsTracker.trackWhatsAppPopup('popup_join_click');
    window.open(OFFICIAL_LINKS.WHATSAPP_CHANNEL, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleMockInterviewClick = () => {
    if (onNavigate) {
      onNavigate('/mock-interview');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/mock-interview';
    }
    setIsOpen(false);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(WA_MAYBE_LATER_KEY, Date.now().toString());
    } catch (e) {
      console.debug('[WhatsAppPopup] LocalStorage write notice:', e);
    }

    analyticsTracker.trackWhatsAppPopup('popup_dismiss');
    setIsOpen(false);
  };

  return (
    <>
      {/* ========================================================
          1. CENTER CELEBRATING MODAL POPUP
          ======================================================== */}
      <AnimatePresence>
        {isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="celebration-popup-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden"
          >
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={handleDismiss}
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-md"
              aria-hidden="true"
            />

            {/* Glassmorphism Celebrating Card Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-xl bg-white/95 backdrop-blur-3xl border border-slate-200/90 rounded-[32px] shadow-2xl p-6 sm:p-8 text-slate-900 z-10 overflow-hidden max-h-[92vh] overflow-y-auto select-none"
            >
              {/* Glowing Background Radial Highlights */}
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

              {/* Confetti Explosion Burst on Open */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                {confetti.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ x: '50%', y: '30%', opacity: 1, scale: 0.2 }}
                    animate={{
                      x: [`50%`, `${c.left}%`],
                      y: [`30%`, `${c.top + 50}%`],
                      opacity: [1, 0.9, 0],
                      scale: [0.4, 1, 0.3],
                      rotate: c.angle,
                    }}
                    transition={{
                      duration: 1.2 + Math.random() * 1.2,
                      ease: 'easeOut',
                    }}
                    className="absolute w-2 h-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>

              {/* Header: Trophy Icon & Close Button */}
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-amber-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-md shrink-0">
                      <CelebrationTrophyGraphic className="w-11 h-11" />
                    </div>
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>Career Celebration Special</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-[11px] font-bold">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Mana Career Growth Hub</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="p-2 -mr-1.5 -mt-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  aria-label="Close dialog"
                  title="Maybe Later"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Headline */}
              <div className="mt-4 space-y-1.5 relative z-10 text-left">
                <h2
                  id="celebration-popup-title"
                  className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 leading-snug flex items-center gap-2 flex-wrap"
                >
                  <span>🎉 Celebrate Your Career Growth!</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  Boost your job hunt with daily verified alerts on WhatsApp + 1-on-1 Mock Interview preparation to clear top tech rounds!
                </p>
              </div>

              {/* Dual Pillars Section */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-10">
                
                {/* Pillar 1: WhatsApp Group Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white border border-emerald-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <WhatsAppIcon className="w-4.5 h-4.5" />
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                        Daily Alerts
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-display">
                        Official WhatsApp Group
                      </h3>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                        Instant notifications for freshers &amp; experienced jobs.
                      </p>
                    </div>

                    <ul className="text-[11px] text-slate-700 space-y-1 pt-1 font-medium">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Freshers &amp; Off-Campus Drives</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Internships &amp; WFH Jobs</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Direct Official Links</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={handleJoinWhatsApp}
                    className="w-full mt-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>Join WhatsApp</span>
                  </button>
                </div>

                {/* Pillar 2: Mock Interview Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-white border border-indigo-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Video className="w-4.5 h-4.5" />
                      </span>
                      <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100/90 px-2 py-0.5 rounded-full border border-indigo-200">
                        1-on-1 Practice
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-display">
                        1-on-1 Mock Interview
                      </h3>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                        Live practice sessions with real-time feedback.
                      </p>
                    </div>

                    <ul className="text-[11px] text-slate-700 space-y-1 pt-1 font-medium">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Technical &amp; HR Questions</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Detailed Feedback &amp; ATS Score</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Confidence Boost for Top Tech</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={handleMockInterviewClick}
                    className="w-full mt-2 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>Practice Interview</span>
                  </button>
                </div>

              </div>

              {/* Bottom Footer note & Dismiss Button */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 relative z-10 text-xs">
                <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Free WhatsApp updates · No spam</span>
                </span>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer text-xs"
                >
                  Maybe Later
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          2. FLOATING QUICK ACTION BUTTONS (BOTTOM RIGHT)
          ======================================================== */}
      <aside
        aria-label="Community & Interview Quick Access"
        className="fixed bottom-18 right-4 sm:bottom-20 sm:right-5 z-40 flex items-center gap-2"
      >
        {/* Mock Interview Floating Action Button */}
        <button
          type="button"
          onClick={handleMockInterviewClick}
          className="relative px-3.5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white flex items-center gap-2 shadow-lg transition-all cursor-pointer text-xs font-bold group"
          title="Book 1-on-1 Mock Interview"
        >
          <Video className="w-4 h-4 text-white" />
          <span className="hidden sm:inline">Mock Interview</span>
        </button>

        {/* WhatsApp Group Floating Action Button */}
        <button
          type="button"
          onClick={handleJoinWhatsApp}
          className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
          aria-label="Join WhatsApp Group for Daily Job Alerts"
          title="Join WhatsApp Group for Daily Job Alerts"
        >
          <WhatsAppIcon className="w-5 h-5 text-white" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
        </button>
      </aside>
    </>
  );
};
