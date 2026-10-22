import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Video,
  FileCode2,
  FileCheck2,
  Clock,
  Flame,
  CheckCircle2,
  ArrowRight,
  Gift,
  Cpu,
  ChevronRight
} from 'lucide-react';

interface FloatingOfferWidgetProps {
  onNavigate: (path: string) => void;
}

export const FloatingOfferWidget: React.FC<FloatingOfferWidgetProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('mana_offer_widget_minimized');
      return stored === 'true' ? false : true;
    } catch {
      return true;
    }
  });

  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 5,
    minutes: 42,
    seconds: 19,
  });

  // Countdown timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleWidget = (state: boolean) => {
    setIsOpen(state);
    try {
      localStorage.setItem('mana_offer_widget_minimized', state ? 'false' : 'true');
    } catch (e) {
      console.warn('Unable to persist widget state', e);
    }
  };

  const handleServiceClick = (path: string) => {
    onNavigate(path);
    toggleWidget(false);
  };

  const formatTwoDigits = (num: number) => String(num).padStart(2, '0');

  return (
    <>
      {/* Minimized Floating Side Tab - Small, clean & non-disruptive on the right edge */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.2 }}
            className="fixed right-0 top-36 sm:top-44 z-40 select-none pointer-events-auto font-sans"
          >
            <motion.button
              whileHover={{ scale: 1.03, x: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => toggleWidget(true)}
              className="group flex items-center gap-2 bg-slate-900/90 hover:bg-slate-900 text-white pl-3 pr-2.5 py-2 rounded-l-xl border-l-2 border-amber-400 border-y border-slate-700/80 backdrop-blur-md shadow-lg transition-all cursor-pointer relative overflow-hidden text-xs"
              aria-label="Open Career Offers"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-bold shrink-0">
                <Gift className="w-3.5 h-3.5" />
              </div>

              <div className="text-left leading-none font-extrabold text-[11px] text-amber-300 uppercase tracking-wide flex items-center gap-1">
                <span>CAREER OFFERS</span>
                <span className="text-[9px] bg-amber-400/20 text-amber-200 px-1 py-0.5 rounded font-normal">₹49+</span>
              </div>

              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300 transition-colors" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Expanded Modal Pop-up - Opens in center without taking over screen */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="offer-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => toggleWidget(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs pointer-events-auto font-sans"
          >
            <motion.div
              key="expanded-card-modal"
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[360px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-white overflow-hidden relative flex flex-col"
            >
              {/* Header Section */}
              <div className="relative p-3.5 pb-2.5 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-400 text-slate-950">
                    <Sparkles className="w-3 h-3 fill-current" />
                    Special Offers
                  </span>
                  <span className="text-xs font-bold text-slate-200">Career Boost</span>
                </div>

                <button
                  onClick={() => toggleWidget(false)}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Close offers"
                  aria-label="Close offers"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Countdown Banner */}
              <div className="px-3.5 py-1.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-300 shrink-0">
                <div className="flex items-center gap-1 text-slate-400 font-medium">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Ends in:</span>
                </div>
                <div className="font-mono font-bold text-amber-300 text-[11px]">
                  {formatTwoDigits(timeLeft.hours)}h:{formatTwoDigits(timeLeft.minutes)}m:{formatTwoDigits(timeLeft.seconds)}s
                </div>
              </div>

              {/* Services List - Simple, clean cards */}
              <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar flex-1 text-xs">
                
                {/* Service 1: Mock Interview */}
                <div 
                  onClick={() => handleServiceClick('/mock-interview')}
                  className="group p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-400/50 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                        1-on-1 Mock Interview
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Live practice + feedback
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-amber-400 text-sm">₹99</div>
                    <div className="text-[9px] text-slate-500 line-through">₹499</div>
                  </div>
                </div>

                {/* Service 2: Developer Portfolio */}
                <div 
                  onClick={() => handleServiceClick('/portfolio-service')}
                  className="group p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-purple-400/50 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-400/20 text-purple-300 flex items-center justify-center font-bold shrink-0">
                      <FileCode2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                        Portfolio Website
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Showcase projects live
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-purple-300 text-sm">₹499</div>
                    <div className="text-[9px] text-slate-500 line-through">₹1499</div>
                  </div>
                </div>

                {/* Service 3: Resume Review */}
                <div 
                  onClick={() => handleServiceClick('/resume-review')}
                  className="group p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-400/50 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-400/20 text-blue-300 flex items-center justify-center font-bold shrink-0">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                        ATS Resume Review
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        ATS score & key match
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-blue-300 text-sm">₹49</div>
                    <div className="text-[9px] text-slate-500 line-through">₹299</div>
                  </div>
                </div>

                {/* Service 4: AI Website Development */}
                <div 
                  onClick={() => handleServiceClick('/website-development')}
                  className="group p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-400/50 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-cyan-400/20 text-cyan-300 flex items-center justify-center font-bold shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                        AI Website Dev
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Personalized AI web app
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-cyan-300 text-sm">₹499</div>
                    <div className="text-[9px] text-slate-500 line-through">₹1999</div>
                  </div>
                </div>

              </div>

              {/* Footer CTA */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center shrink-0">
                <p className="text-[10px] text-slate-400">
                  Click any service above to get started immediately.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
