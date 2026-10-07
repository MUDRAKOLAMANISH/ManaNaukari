import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Flame, CheckCircle2, Star } from 'lucide-react';
import { OFFICIAL_LINKS } from '../../constants/links';
import { analyticsTracker } from '../../services/analyticsTracker';

interface WhatsAppCommunityPopupProps {
  currentPath?: string;
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

// High-Fidelity Bathukamma Concentric Ring Flower Stack SVG Component
export const BathukammaGraphic: React.FC<{ className?: string }> = ({ className = 'w-24 h-24' }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Concentric rings of Deccan seasonal flowers representing traditional Telangana Bathukamma */}
    {/* Ring 5 - Bottom Marigolds (Gunugu/Thangedu) */}
    <path d="M10 85 C 20 65, 80 65, 90 85 Z" fill="#F59E0B" opacity="0.95" />
    <circle cx="15" cy="81" r="5" fill="#EF4444" />
    <circle cx="27" cy="77" r="5" fill="#EF4444" />
    <circle cx="39" cy="74" r="5" fill="#10B981" />
    <circle cx="51" cy="73" r="5" fill="#F59E0B" />
    <circle cx="63" cy="74" r="5" fill="#10B981" />
    <circle cx="75" cy="77" r="5" fill="#EF4444" />
    <circle cx="87" cy="81" r="5" fill="#EF4444" />

    {/* Ring 4 - Banthi / Yellow Marigold */}
    <path d="M20 74 C 28 58, 72 58, 80 74 Z" fill="#FBBF24" />
    <circle cx="25" cy="69" r="4.5" fill="#D97706" />
    <circle cx="36" cy="64" r="4.5" fill="#3B82F6" />
    <circle cx="48" cy="61" r="4.5" fill="#FBBF24" />
    <circle cx="60" cy="61" r="4.5" fill="#3B82F6" />
    <circle cx="71" cy="65" r="4.5" fill="#D97706" />

    {/* Ring 3 - Lotus Petals / Red-Pink Chamanthi */}
    <path d="M30 62 C 36 49, 64 49, 70 62 Z" fill="#EC4899" />
    <circle cx="34" cy="57" r="4" fill="#F59E0B" />
    <circle cx="44" cy="52" r="4" fill="#EC4899" />
    <circle cx="55" cy="51" r="4" fill="#EC4899" />
    <circle cx="66" cy="54" r="4" fill="#F59E0B" />

    {/* Ring 2 - White-Yellow Jasmine / Gunugu */}
    <path d="M38 51 C 42 41, 58 41, 62 51 Z" fill="#10B981" />
    <circle cx="41" cy="45" r="3" fill="#FFFFFF" />
    <circle cx="49" cy="41" r="3" fill="#FBBF24" />
    <circle cx="57" cy="42" r="3" fill="#FFFFFF" />

    {/* Ring 1 - Top Single Golden Pumpkin Flower (Gummadi Puvvu) */}
    <path d="M45 40 C 45 28, 55 28, 55 40 Z" fill="#F59E0B" />
    <polygon points="50,22 53,30 47,30" fill="#EF4444" />
    <circle cx="50" cy="31" r="3.5" fill="#FBBF24" />

    {/* Elegant clay base plate */}
    <path d="M5 85 L95 85 C90 92, 10 92, 5 85 Z" fill="#D97706" />
    <path d="M8 85 C20 88, 80 85, 92 85" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Beautiful animated clay Diya (oil lamp)
export const FestiveDiya: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <div className={`relative ${className}`}>
    {/* Clay base */}
    <svg className="w-full h-full" viewBox="0 0 40 40" fill="none">
      <path d="M8 25 C12 32, 28 32, 32 25 C30 20, 10 20, 8 25 Z" fill="#D97706" />
      <path d="M12 25 C15 27, 25 27, 28 25" stroke="#FBBF24" strokeWidth="1" />
      {/* Wick holder */}
      <path d="M20 18 L21 21 L19 21 Z" fill="#78350F" />
    </svg>
    {/* Flickering Flame animation */}
    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-6 bg-gradient-to-t from-red-600 via-amber-400 to-yellow-200 rounded-full blur-[0.5px] animate-pulse origin-bottom" style={{ animationDuration: '0.8s' }}>
      <div className="w-1.5 h-3.5 bg-white rounded-full mx-auto mt-1 blur-[0.2px] opacity-80" />
    </div>
  </div>
);

// Marigold Flower Icon representing festive banthi/chamanthi garland elements
export const MarigoldFlower: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="5" fill="#F59E0B" />
    <path d="M12 2 C10 6, 14 6, 12 2 Z" fill="#F59E0B" />
    <path d="M12 18 C10 22, 14 22, 12 18 Z" fill="#F59E0B" />
    <path d="M2 12 C6 10, 6 14, 2 12 Z" fill="#F59E0B" />
    <path d="M18 12 C22 10, 22 14, 18 12 Z" fill="#F59E0B" />
    <path d="M5 5 C8 7, 7 9, 5 5 Z" fill="#EF4444" />
    <path d="M19 19 C16 17, 17 15, 19 19 Z" fill="#EF4444" />
    <path d="M19 5 C16 7, 17 9, 19 5 Z" fill="#EF4444" />
    <path d="M5 19 C8 17, 7 15, 5 19 Z" fill="#EF4444" />
  </svg>
);

export const WhatsAppCommunityPopup: React.FC<WhatsAppCommunityPopupProps> = ({ currentPath }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [petals, setPetals] = useState<Array<{ id: number; left: number; delay: number; duration: number; size: number }>>([]);
  const [confetti, setConfetti] = useState<Array<{ id: number; color: string; left: number; top: number; angle: number; speed: number }>>([]);

  // Check if current route is an internal admin route where popups should not intrude
  const isAdminRoute = (path?: string) => {
    if (!path && typeof window !== 'undefined') {
      path = window.location.pathname;
    }
    return Boolean(path && (path.startsWith('/admin') || path.startsWith('/recruiter/dashboard')));
  };

  // Generate lightweight floating petals and confetti once on open
  useEffect(() => {
    if (isOpen) {
      // 10 floating marigold/rose petals
      const generatedPetals = Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100, // percentage
        delay: Math.random() * 4,
        duration: 4 + Math.random() * 6,
        size: 8 + Math.random() * 12,
      }));
      setPetals(generatedPetals);

      // 30 confetti particles
      const colors = ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#FBBF24', '#EC4899'];
      const generatedConfetti = Array.from({ length: 35 }).map((_, i) => ({
        id: i,
        color: colors[i % colors.length],
        left: 20 + Math.random() * 60, // center-heavy
        top: 10 + Math.random() * 30,
        angle: Math.random() * 360,
        speed: 1 + Math.random() * 2,
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

    // 1. Never show if user already clicked "Join WhatsApp Group" (whatsappJoined=true)
    try {
      const isJoined = localStorage.getItem(WA_JOINED_KEY);
      if (isJoined === 'true') {
        setHasChecked(true);
        return;
      }

      // 2. Check if user dismissed/snoozed within the last 7 days
      const maybeLaterTimestamp = localStorage.getItem(WA_MAYBE_LATER_KEY);
      if (maybeLaterTimestamp) {
        const timeParsed = parseInt(maybeLaterTimestamp, 10);
        if (!isNaN(timeParsed) && Date.now() - timeParsed < SEVEN_DAYS_MS) {
          // Snoozed for 7 days
          setHasChecked(true);
          return;
        }
      }
    } catch (e) {
      console.debug('[WhatsAppPopup] LocalStorage read notice:', e);
    }

    // 3. Show popup automatically when website opens (smooth 3000ms delay)
    const timer = setTimeout(() => {
      if (!isAdminRoute(window.location.pathname)) {
        setIsOpen(true);
        setHasChecked(true);
        console.log('[WhatsAppPopup] ⏰ 3-second delay completed. Showing festive popup and tracking impression.');
        analyticsTracker.trackWhatsAppPopup('popup_impression');
      }
    }, 3000);

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

    analyticsTracker.trackWhatsAppPopup('popup_join_click');
    window.open(OFFICIAL_LINKS.WHATSAPP_CHANNEL, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  // Click "Maybe Later" (Snooze):
  // - Save timestamp
  // - Show again after 7 days
  const handleMaybeLater = () => {
    try {
      localStorage.setItem(WA_MAYBE_LATER_KEY, Date.now().toString());
    } catch (e) {
      console.debug('[WhatsAppPopup] LocalStorage write notice:', e);
    }

    analyticsTracker.trackWhatsAppPopup('popup_snooze');
    setIsOpen(false);
  };

  // Click X close button, click backdrop, or ESC key (Dismiss):
  // - Save timestamp
  // - Show again after 7 days
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
          1. CENTER MODAL POPUP (AUTOMATIC ON PAGE LOAD)
          ======================================================== */}
      <AnimatePresence>
        {isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wa-popup-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden"
          >
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              onClick={handleDismiss}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
              aria-hidden="true"
            />

            {/* Glassmorphism Festive Card Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg bg-white/95 backdrop-blur-3xl border border-orange-100 rounded-[36px] shadow-2xl p-6 sm:p-8 text-slate-900 z-10 overflow-hidden max-h-[95vh] overflow-y-auto ring-1 ring-orange-900/5 select-none"
            >
              {/* Premium Festive Garland Decor at Top */}
              <div className="absolute top-0 left-0 right-0 h-4 flex justify-around pointer-events-none opacity-90">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div key={idx} className="flex flex-col items-center -mt-1 animate-bounce" style={{ animationDelay: `${idx * 0.15}s`, animationDuration: '3s' }}>
                    <div className="w-1.5 h-3 bg-amber-500/20" />
                    <MarigoldFlower className="w-3.5 h-3.5" />
                  </div>
                ))}
              </div>

              {/* Glowing Background Radial Highlights with brand colors */}
              <div className="absolute -top-24 -right-24 w-52 h-52 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Floating Petals Animation Layer */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-70">
                {petals.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ y: -50, x: `${p.left}%`, opacity: 0, rotate: 0 }}
                    animate={{
                      y: '110%',
                      x: [`${p.left}%`, `${p.left + (p.id % 2 === 0 ? 8 : -8)}%`, `${p.left}%`],
                      opacity: [0, 0.9, 0.9, 0],
                      rotate: 360,
                    }}
                    transition={{
                      duration: p.duration,
                      delay: p.delay,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="absolute"
                    style={{ width: p.size, height: p.size }}
                  >
                    <MarigoldFlower className="w-full h-full text-orange-500" />
                  </motion.div>
                ))}
              </div>

              {/* Confetti Explosion Burst on Open */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                {confetti.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ x: '50%', y: '40%', opacity: 1, scale: 0.2 }}
                    animate={{
                      x: [`50%`, `${c.left}%`],
                      y: [`40%`, `${c.top + 60}%`],
                      opacity: [1, 1, 0],
                      scale: [0.5, 1, 0.4],
                      rotate: c.angle,
                    }}
                    transition={{
                      duration: 1.5 + Math.random() * 1.5,
                      ease: 'easeOut',
                    }}
                    className="absolute w-2 h-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>

              {/* Top Header: Bathukamma Graphic Stack & Close */}
              <div className="flex items-start justify-between gap-3 relative z-10 pt-3">
                <div className="flex items-center gap-3.5">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 via-amber-500 to-blue-500 rounded-3xl blur opacity-30 group-hover:opacity-40 transition duration-300" />
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 via-white to-orange-50 text-white flex items-center justify-center shadow-lg border border-orange-100 shrink-0">
                      <BathukammaGraphic className="w-13 h-13" />
                    </div>
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                      <span>Mana Naukari Festival Special</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-[11px] font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
                      <span>Career Blessings 2026</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="p-2 -mr-1.5 -mt-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  aria-label="Close"
                  title="Maybe Later"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title Section with Sparkles */}
              <div className="mt-5 space-y-2 relative z-10 text-center sm:text-left">
                <h2
                  id="wa-popup-title"
                  className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 leading-snug flex flex-wrap items-center justify-center sm:justify-start gap-1"
                >
                  <span>🌸 Happy Bathukamma &amp; Dussehra 2026!</span>
                  <span className="inline-block animate-bounce">🎉</span>
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-orange-400 to-blue-500 rounded-full mx-auto sm:mx-0" />
              </div>

              {/* Body Prose Message */}
              <div className="mt-4 text-slate-700 text-xs sm:text-sm leading-relaxed space-y-3 relative z-10">
                <p className="font-semibold text-slate-800 text-center sm:text-left">
                  Wishing you and your family a joyful Bathukamma and a prosperous Dussehra! ✨
                </p>
                <p className="text-slate-600 font-medium text-center sm:text-left">
                  May this festive season bring happiness, success, and exciting career opportunities.
                </p>
                
                {/* Feature Bullet List Card */}
                <div className="bg-gradient-to-br from-orange-50/60 via-white to-blue-50/50 rounded-2xl p-4 border border-orange-100/60 space-y-2 text-xs sm:text-sm shadow-2xs">
                  <div className="font-bold text-orange-950 text-[11px] uppercase tracking-wider mb-1">
                    🚀 Join the Mana Naukari WhatsApp Channel to receive:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800 font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 text-base leading-none">✅</span>
                      <span>Daily Freshers Jobs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 text-base leading-none">✅</span>
                      <span>Internship Updates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 text-base leading-none">✅</span>
                      <span>Work From Home Opportunities</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 text-base leading-none">✅</span>
                      <span>Off-Campus Drives</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 text-base leading-none">✅</span>
                      <span>Placement Alerts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 text-base leading-none">✅</span>
                      <span>Career Tips &amp; Resources</span>
                    </div>
                  </div>
                </div>

                <p className="text-slate-500 text-[11px] sm:text-xs text-center font-medium">
                  Stay ahead in your career journey with daily verified job updates.
                </p>
              </div>

              {/* Decorative Diyas Layer with glowing flame effects */}
              <div className="flex items-center justify-between px-2 pt-2 relative z-10 pointer-events-none">
                <FestiveDiya className="w-8 h-8 shrink-0 transform -rotate-12 animate-pulse" />
                <span className="flex items-center gap-1.5 text-[11px] text-blue-900 font-bold bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  <Star className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  <span>100% Free · No Fees</span>
                </span>
                <FestiveDiya className="w-8 h-8 shrink-0 transform rotate-12 animate-pulse" />
              </div>

              {/* Action Buttons */}
              <div className="mt-4 space-y-3 relative z-10">
                {/* Primary festive CTA Button */}
                <button
                  type="button"
                  onClick={handleJoinWhatsApp}
                  className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-orange-600/30 hover:shadow-xl hover:shadow-orange-600/40 transition-all flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <WhatsAppIcon className="w-5.5 h-5.5 text-white transition-transform group-hover:scale-110" />
                  <span>🎯 Join WhatsApp Channel</span>
                </button>

                {/* Secondary Button */}
                <button
                  type="button"
                  onClick={handleMaybeLater}
                  className="w-full py-2 px-4 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-center"
                >
                  Maybe Later
                </button>
              </div>

              {/* Growth Stat Footnote */}
              <div className="mt-3 text-center relative z-10">
                <p className="text-[10.5px] sm:text-xs font-bold text-orange-700 bg-orange-50/50 py-1.5 px-3 rounded-full border border-orange-100/50 inline-block">
                  🔥 Join 5000+ Job Seekers Growing Their Careers with Mana Naukari
                </p>
                <p className="text-[9.5px] text-slate-400 mt-2">
                  Direct WhatsApp Channel • Your phone number remains completely private
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          2. SMALL WHATSAPP FLOATING BUTTON (BOTTOM RIGHT)
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

        {/* Floating WhatsApp Action Button with subtle marigold pulse */}
        <button
          type="button"
          onClick={() => {
            analyticsTracker.trackWhatsAppPopup('popup_join_click');
            window.open(OFFICIAL_LINKS.WHATSAPP_CHANNEL, '_blank', 'noopener,noreferrer');
          }}
          className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-orange-600/35 hover:shadow-2xl hover:shadow-orange-600/50 ring-4 ring-orange-400/20 transition-all transform hover:scale-105 cursor-pointer"
          aria-label="Join WhatsApp Group for Daily Job Alerts"
          title="Join WhatsApp Group for Daily Job Alerts"
        >
          <WhatsAppIcon className="w-7 h-7 text-white" />

          {/* Glowing Animated Pulse Indicator */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500 border-2 border-white" />
          </span>
        </button>
      </aside>
    </>
  );
};
