import React, { useState } from 'react';
import { Target, CheckCircle2, ArrowRight, Sparkles, MessageSquare, Video, ShieldCheck, Zap } from 'lucide-react';
import { MockInterviewBookingModal } from './MockInterviewBookingModal';

interface MockInterviewBannerProps {
  onNavigate: (path: string) => void;
  onOpenModal?: () => void;
}

export const MockInterviewBanner: React.FC<MockInterviewBannerProps> = ({ onNavigate, onOpenModal }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleApplyClick = () => {
    if (onOpenModal) {
      onOpenModal();
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <section className="relative my-8 overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6 sm:p-8 lg:p-10 text-white shadow-xl border border-indigo-900/40">
        {/* Background Decorative Glow Accents */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: SaaS Copy & Benefits */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Promotional Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>ACE YOUR NEXT TECH INTERVIEW</span>
            </div>

            {/* Main Heading & Description */}
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display tracking-tight text-white leading-tight">
                Practice Smart. <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400">
                  Interview with Confidence.
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-xl">
                Prepare for technical interviews with personalized mock sessions tailored to your selected topic. Get practical questions, performance feedback, and actionable tips to improve your interview readiness.
              </p>
            </div>

            {/* Benefit Points List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-semibold text-slate-200">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Practice topic-specific interview questions</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Improve technical knowledge &amp; communication</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Receive personalized performance feedback</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Prepare for fresher &amp; entry-level tech roles</span>
              </div>
            </div>

            {/* Price Tag & Primary CTA */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Session Price</div>
                <div className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight flex items-baseline gap-1.5">
                  <span>₹99</span>
                  <span className="text-xs font-semibold text-slate-400">PER MOCK INTERVIEW</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleApplyClick}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-xs sm:text-sm font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-2xl transition-all shadow-lg hover:shadow-amber-500/25 active:scale-[0.98] cursor-pointer group shrink-0"
                >
                  <span>Apply for Mock Interview</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => onNavigate('/mock-interview')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-2xl transition-all cursor-pointer shrink-0"
                >
                  <span>View Details Page</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-medium italic">
              For students, freshers, and aspiring IT professionals.
            </p>
          </div>

          {/* Right Column: Visual Setup Graphic */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-2xl space-y-4">
              
              {/* Top Bar Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] font-mono text-slate-400 ml-2">Live Interview Practice Studio</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/60">
                  1-on-1 Session
                </span>
              </div>

              {/* Live Interview Card Preview */}
              <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Selected Topic Practice</div>
                      <div className="text-[10px] font-medium text-slate-400">Python · Java · SQL · React · DSA · HR</div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    ₹99
                  </span>
                </div>

                {/* Sample Feedback Card */}
                <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-[11px] space-y-2">
                  <div className="flex items-center justify-between text-slate-300 font-semibold">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Personalized Report</span>
                    </span>
                    <span className="text-amber-300 font-bold">Feedback Included</span>
                  </div>
                  <p className="text-slate-400 leading-snug">
                    "Clear technical explanation with actionable suggestions on problem-solving approach &amp; code optimization."
                  </p>
                </div>
              </div>

              {/* Popular Topics Pills */}
              <div className="pt-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Available Topics Include</div>
                <div className="flex flex-wrap gap-1.5">
                  {['Python', 'Java', 'SQL', 'Data Analytics', 'React.js', 'DSA', 'Gen AI', 'HR Interview'].map((topic) => (
                    <span key={topic} className="text-[10px] font-semibold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Booking Modal */}
      <MockInterviewBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNavigate={onNavigate}
      />
    </>
  );
};

