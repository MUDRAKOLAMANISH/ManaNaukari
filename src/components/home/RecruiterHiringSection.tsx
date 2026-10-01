import React from 'react';
import { 
  Briefcase, CheckCircle2, ShieldCheck, ArrowRight, 
  Sparkles, Users, Clock, Award, Check
} from 'lucide-react';

export interface RecruiterPlanTier {
  id: string;
  name: string;
  priceFormatted: string;
  isPopular?: boolean;
  features: string[];
}

export interface RecruiterHiringSectionProps {
  onNavigate: (path: string) => void;
  className?: string;
  config?: {
    isFreeLaunch?: boolean;
    enablePricingPlans?: boolean;
    badgeText?: string;
    tiers?: RecruiterPlanTier[];
  };
}

const DEFAULT_BENEFITS = [
  '100% Free Job Posting Launch',
  'Admin Verified Requisitions',
  'Direct Official HR Candidate Reach',
  'Exclusive Freshers & Interns Focus',
  'Zero Agency Commission or Fees',
];

export const RecruiterHiringSection: React.FC<RecruiterHiringSectionProps> = ({
  onNavigate,
  className = '',
  config = {
    isFreeLaunch: true,
    enablePricingPlans: false,
    badgeText: 'Recruiter & Employer Network',
  },
}) => {
  return (
    <section
      aria-labelledby="recruiter-hiring-heading"
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 lg:p-12 shadow-xl border border-blue-700/40 ${className}`}
    >
      {/* Background Ambient Glow & Design Accents */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        
        {/* Split Grid: Content on Left + Corporate Recruiter Imagery on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Side: Headlines, Value Props & CTAs (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold tracking-wide backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>{config.badgeText || 'Recruiter & Employer Network'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-extrabold uppercase text-[10px]">100% Free Launch</span>
            </div>

            <h2
              id="recruiter-hiring-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display tracking-tight text-white leading-tight"
            >
              Are You Hiring Freshers, Interns, or Entry-Level Engineers?
            </h2>

            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed font-normal">
              Connect directly with thousands of active tech job seekers, campus graduates, and internship seekers across India. Post your open requisition for <strong className="text-white font-semibold underline decoration-emerald-400 decoration-2 underline-offset-4">FREE</strong> on Mana Naukari.
            </p>

            {/* Core Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {DEFAULT_BENEFITS.map((benefit, idx) => (
                <div
                  key={idx}
                  className="bg-white/10 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5 backdrop-blur-xs text-xs font-semibold text-white"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[3]" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => onNavigate('/post-job')}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-white hover:bg-blue-50 active:bg-blue-100 text-blue-900 font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-950/40 hover:shadow-xl hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer group"
              >
                <Briefcase className="w-4 h-4 text-blue-700 transition-transform group-hover:scale-110" />
                <span>Post a Job Free</span>
                <ArrowRight className="w-4 h-4 text-blue-700 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => onNavigate('/recruiter/dashboard')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm rounded-2xl transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-blue-300" />
                <span>Recruiter Zone</span>
              </button>
            </div>
          </div>

          {/* Right Side: High-Resolution Corporate HR Imagery (5 Cols) */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl group aspect-[4/3] max-w-md mx-auto bg-slate-900">
              <img
                src="/assets/images/recruiter-hiring.jpg"
                alt="Corporate HR recruitment panel interviewing candidates"
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

              {/* Floating Badge on Image */}
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 p-3 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-left flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>Verified Recruiter Network</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Corporate HR emails &amp; official listings
                  </div>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
                  Instant
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
