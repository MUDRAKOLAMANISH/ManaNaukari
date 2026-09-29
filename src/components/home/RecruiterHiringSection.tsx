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
  /**
   * Future-ready configuration:
   * When pricing plans are introduced later, setting `enablePricingPlans: true`
   * and providing `customTiers` activates the pricing cards seamlessly
   * without needing to rewrite or restructure this section.
   */
  config?: {
    isFreeLaunch?: boolean;
    enablePricingPlans?: boolean;
    badgeText?: string;
    tiers?: RecruiterPlanTier[];
  };
}

const DEFAULT_BENEFITS = [
  'Free Job Posting',
  'Admin Reviewed',
  'Verified Recruiters',
  'Genuine Candidate Reach',
  'Freshers & Internship Focus',
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
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white p-6 sm:p-10 lg:p-12 shadow-xl border border-blue-700/40 ${className}`}
    >
      {/* Background Ambient Glow & Design Accents */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-5 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        
        {/* Top Header & Intro */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="space-y-3 max-w-3xl">
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
              Are You Hiring Freshers, Interns, or Entry-Level Talent?
            </h2>

            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed font-normal">
              Reach thousands of active job seekers, fresh graduates, interns, and early-career professionals across India. Post your job opening for <strong className="text-white font-semibold underline decoration-emerald-400 decoration-2 underline-offset-4">FREE</strong> and connect with quality candidates.
            </p>
          </div>

          {/* Primary Call-to-Action on Desktop */}
          <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
            <button
              onClick={() => onNavigate('/post-job')}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-white hover:bg-blue-50 active:bg-blue-100 text-blue-900 font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-blue-950/40 hover:shadow-xl hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer group"
            >
              <Briefcase className="w-5 h-5 text-blue-700 transition-transform group-hover:scale-110" />
              <span>Post a Job as Recruiter</span>
              <ArrowRight className="w-4 h-4 text-blue-700 transition-transform group-hover:translate-x-1" />
            </button>
            <div className="text-center text-[11px] text-blue-200 font-medium">
              Zero fees • Immediate submission
            </div>
          </div>
        </div>

        {/* Benefits Grid (5 Core Value Props) */}
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-wider font-extrabold text-blue-200/90 font-display flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-300" />
            <span>Key Employer Advantages</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {DEFAULT_BENEFITS.map((benefit, idx) => (
              <div
                key={idx}
                className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 backdrop-blur-xs transition-colors"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                  {benefit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Note & Trust Safeguard */}
        <div className="bg-blue-950/60 border border-blue-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Quality &amp; Authenticity Guarantee</span>
              </div>
              <p className="text-xs sm:text-sm text-blue-200/90 mt-0.5 leading-relaxed">
                Every submitted job is reviewed by the Mana Naukari admin team before publication to ensure quality and authenticity.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-4 text-xs text-blue-200">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-300" />
              <span>50,000+ Reached</span>
            </div>
            <span className="text-blue-400/60">·</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-300" />
              <span>Fast 24h Approval</span>
            </div>
          </div>
        </div>

        {/* Mobile Call to Action */}
        <div className="lg:hidden pt-2">
          <button
            onClick={() => onNavigate('/post-job')}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-blue-50 text-blue-900 font-extrabold text-sm rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <Briefcase className="w-4 h-4 text-blue-700" />
            <span>Post a Job as Recruiter</span>
            <ArrowRight className="w-4 h-4 text-blue-700" />
          </button>
        </div>

        {/* Future Ready Pricing Architecture Slot:
            When paid tiers (e.g. Featured Placement, Urgent Drive) are activated in the future,
            config.enablePricingPlans will render them here seamlessly without modifying page layouts.
        */}
        {config.enablePricingPlans && config.tiers && config.tiers.length > 0 && (
          <div className="pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {config.tiers.map((tier) => (
              <div
                key={tier.id}
                className={`p-5 rounded-2xl border ${
                  tier.isPopular ? 'bg-white text-slate-900 border-white' : 'bg-white/5 border-white/10 text-white'
                }`}
              >
                <div className="font-bold text-sm">{tier.name}</div>
                <div className="text-2xl font-extrabold mt-1">{tier.priceFormatted}</div>
                <ul className="mt-3 space-y-1.5 text-xs">
                  {tier.features.map((feat, fidx) => (
                    <li key={fidx} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
};
