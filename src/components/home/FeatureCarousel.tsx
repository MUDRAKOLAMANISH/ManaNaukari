import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Briefcase, Video, GraduationCap, Link2, FileCheck2,
  Bell, ChevronLeft, ChevronRight, Pause, Play,
  CheckCircle2, Sparkles, Building2, Clock, ShieldCheck,
  ArrowRight, Search, Laptop, Star, User, Award, Check
} from 'lucide-react';

interface FeatureCarouselProps {
  onNavigate: (path: string) => void;
}

interface SlideData {
  id: string;
  badge: string;
  badgeColor: string;
  isPlanned?: boolean;
  headline: string;
  description: string;
  ctaText: string;
  ctaPath?: string;
  ctaAction?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  renderVisual: () => React.ReactNode;
}

export const FeatureCarousel: React.FC<FeatureCarouselProps> = ({ onNavigate }) => {
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const slides: SlideData[] = [
    // Slide 1: Find Jobs
    {
      id: 'slide-find-jobs',
      badge: 'Live Feature',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      headline: 'Your Next Opportunity Starts Here',
      description: 'Explore fresher jobs, internships, entry-level roles, and work-from-home opportunities.',
      ctaText: 'Browse Active Jobs',
      ctaPath: '/jobs',
      icon: Briefcase,
      renderVisual: () => (
        <div className="w-full bg-slate-900/90 rounded-2xl p-4 border border-slate-700/80 text-left space-y-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-bold text-slate-200">Live Job Feed</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
              Freshers &amp; 0-2 Yrs
            </span>
          </div>

          {/* Mini Job Listing Cards */}
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-blue-500/50 transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white truncate">Associate Software Engineer</span>
                  <span className="text-[9px] font-extrabold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                    Full Time
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>TCS / Infosys</span>
                  <span>•</span>
                  <span className="text-emerald-400">₹3.6 - 4.5 LPA</span>
                  <span>•</span>
                  <span>Bengaluru / WFH</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-white bg-blue-600 px-2.5 py-1 rounded-lg shrink-0">
                Apply
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-blue-500/50 transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white truncate">Frontend React Trainee Intern</span>
                  <span className="text-[9px] font-extrabold text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                    Remote
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>Tech Startup</span>
                  <span>•</span>
                  <span className="text-teal-300">₹25,000 / mo</span>
                  <span>•</span>
                  <span>Pan-India</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-white bg-blue-600 px-2.5 py-1 rounded-lg shrink-0">
                Apply
              </span>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 2: AI Mock Interviews
    {
      id: 'slide-mock-interviews',
      badge: 'Live Feature',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      headline: 'Practice Interviews with Confidence',
      description: 'Prepare for interviews with structured practice questions, sample answers, and feedback.',
      ctaText: 'Start Interview Practice',
      ctaPath: '/mock-interview',
      icon: Video,
      renderVisual: () => (
        <div className="w-full bg-slate-900/90 rounded-2xl p-4 border border-slate-700/80 text-left space-y-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                <User className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-100">AI Mock Practice Room</div>
                <div className="text-[9px] text-slate-400">Software Engineer Requisition</div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
              ₹99 Mentor Option
            </span>
          </div>

          <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 space-y-2">
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
              Sample Question 1 of 3
            </div>
            <div className="text-xs font-semibold text-white leading-snug">
              &quot;Explain how React useEffect cleanup works when unmounting a component.&quot;
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                ✔ STAR Method Guide
              </span>
              <span className="text-[9px] text-slate-300 bg-slate-700 px-2 py-0.5 rounded">
                Timer: 120s
              </span>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 3: Mock Exams and Assessments
    {
      id: 'slide-mock-exams',
      badge: 'Coming Soon',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      isPlanned: true,
      headline: 'Get Ready for Your Next Test',
      description: 'Practice aptitude, reasoning, technical questions, and placement preparation assessments.',
      ctaText: 'Explore Free Study Notes',
      ctaPath: '/materials',
      icon: GraduationCap,
      renderVisual: () => (
        <div className="w-full bg-slate-900/90 rounded-2xl p-4 border border-slate-700/80 text-left space-y-3 shadow-inner relative overflow-hidden">
          {/* Planned Overlay Tag */}
          <div className="absolute top-3 right-3 bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-500/40">
            Planned Feature
          </div>

          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold text-slate-200">Online Assessment Suite</span>
          </div>

          {/* Test Card Preview */}
          <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Section 2: Quantitative Aptitude &amp; Logic</span>
              <span className="text-amber-400 font-mono font-bold">18:45 Left</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full w-2/3" />
            </div>
            <div className="text-xs text-slate-200 pt-1 font-medium">
              Q4: If a train runs at 60 km/h, how many seconds will it take to cross a 200m bridge?
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <span className="text-[10px] bg-slate-700/80 text-slate-300 p-1.5 rounded border border-slate-600/50">A) 12s</span>
              <span className="text-[10px] bg-blue-600/30 text-blue-200 p-1.5 rounded border border-blue-500/50 font-bold">B) 18s ✔</span>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 4: Direct Job Application Links
    {
      id: 'slide-direct-links',
      badge: 'Official Links',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      headline: 'Apply Directly to Opportunities',
      description: 'Discover job openings with official application links and useful eligibility details.',
      ctaText: 'Find Official Openings',
      ctaPath: '/jobs',
      icon: Link2,
      renderVisual: () => (
        <div className="w-full bg-slate-900/90 rounded-2xl p-4 border border-slate-700/80 text-left space-y-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold text-slate-200">100% Official Employer Links</span>
            </div>
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              Zero Fees
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-center space-y-1">
              <div className="text-xs font-black text-white font-display">Workday</div>
              <div className="text-[9px] text-slate-400">Official ATS Integration</div>
              <span className="text-[9px] font-bold text-blue-400 inline-block pt-0.5">Direct Portal ↗</span>
            </div>

            <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-center space-y-1">
              <div className="text-xs font-black text-white font-display">Greenhouse / Lever</div>
              <div className="text-[9px] text-slate-400">Verified Corporate Requisitions</div>
              <span className="text-[9px] font-bold text-blue-400 inline-block pt-0.5">Direct Portal ↗</span>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 5: Resume and Career Preparation
    {
      id: 'slide-resume-prep',
      badge: 'Live Feature',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      headline: 'Build a Stronger Career Profile',
      description: 'Get ready for opportunities with resume guidance, skills preparation, and career resources.',
      ctaText: 'Audit Your Resume',
      ctaPath: '/resume-review',
      icon: FileCheck2,
      renderVisual: () => (
        <div className="w-full bg-slate-900/90 rounded-2xl p-4 border border-slate-700/80 text-left space-y-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-[11px] font-bold text-slate-200">ATS Resume Optimization</span>
            </div>
            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              88% Match Score
            </span>
          </div>

          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Target Keyword Checklist</span>
              <span className="text-[10px] text-purple-300">12 of 14 Matched</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">✔ React.js</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">✔ TypeScript</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">✔ REST APIs</span>
              <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded">✖ Docker (Missing)</span>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 6: Job Alerts and Updates
    {
      id: 'slide-job-alerts',
      badge: 'Live Alerts',
      badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      headline: 'Stay Updated on New Opportunities',
      description: 'Receive relevant job updates and discover opportunities that match your interests.',
      ctaText: 'Subscribe to Alerts',
      ctaAction: () => {
        const el = document.getElementById('subscribe-job-alerts');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          onNavigate('/jobs');
        }
      },
      icon: Bell,
      renderVisual: () => (
        <div className="w-full bg-slate-900/90 rounded-2xl p-4 border border-slate-700/80 text-left space-y-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-teal-400 animate-bounce" />
              <span className="text-[11px] font-bold text-slate-200">Email Job Digest</span>
            </div>
            <span className="text-[9px] font-bold text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
              Daily Digest
            </span>
          </div>

          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-semibold text-slate-200">To: candidate@manacareer.in</span>
              <span>Just Now</span>
            </div>
            <div className="text-xs font-bold text-teal-300">
              ⚡ 5 New Fresher &amp; WFH Openings Added Today
            </div>
            <div className="text-[10px] text-slate-300 truncate">
              • Junior Developer (Remote) • Graduate Trainee (Bengaluru)
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Advance to next slide safely
  const nextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  // Previous slide
  const prevSlide = useCallback(() => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-slide effect every 4.5 seconds when not paused
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  };

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    setTouchStartX(null);
  };

  const current = slides[activeSlide];
  const SlideIcon = current.icon;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Mana Career Feature Carousel"
      role="region"
      className="relative w-full rounded-[32px] overflow-hidden shadow-2xl border-4 border-white/95 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white select-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
    >
      {/* Background Decorative Ambient Orbs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Slide Badge, Counter & Pause/Play Indicator */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${current.badgeColor}`}>
            {current.badge}
          </span>
          {current.isPlanned && (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
              Preview Only
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-300">
            {activeSlide + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume auto-play' : 'Pause auto-play'}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label={isPaused ? 'Resume auto-play' : 'Pause auto-play'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Slide Content Area with Smooth AnimatePresence */}
      <div className="p-5 sm:p-6 min-h-[360px] flex flex-col justify-between relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-4"
          >
            {/* Visual UI Showcase Mockup */}
            <div>{current.renderVisual()}</div>

            {/* Headline and Description */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <SlideIcon className="w-5 h-5 text-blue-400 shrink-0" />
                <h3 className="text-lg sm:text-xl font-extrabold font-display text-white tracking-tight">
                  {current.headline}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg font-normal">
                {current.description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Action Button & Navigation Controls */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              if (current.ctaAction) {
                current.ctaAction();
              } else if (current.ctaPath) {
                onNavigate(current.ctaPath);
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer btn-glow"
          >
            <span>{current.ctaText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Prev/Next Navigation Controls & Dots */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Pagination Dots */}
            <div className="flex items-center gap-1.5 px-1">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeSlide === idx
                      ? 'w-6 bg-blue-400'
                      : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
