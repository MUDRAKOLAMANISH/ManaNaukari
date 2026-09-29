import React from 'react';
import {
  FileCheck, ArrowRight, Sparkles, MessageSquare,
  Globe, Laptop, ShieldCheck, CheckCircle2, ExternalLink
} from 'lucide-react';
import { OFFICIAL_LINKS } from '../../constants/links';

interface CTASectionsProps {
  onNavigate: (path: string) => void;
}

export const CTASections: React.FC<CTASectionsProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-12">
      
      {/* 1. Resume Review Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-8 sm:p-10 text-white shadow-xl border border-blue-800/40">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>ATS Optimization &amp; Feedback</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-white tracking-tight leading-snug">
              Is Your Resume Ready for Top Tech Recruiters?
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Over 75% of fresher resumes get filtered out by automated bot parsers before a human ever reads them. Get an expert line-by-line review, technical keyword audit, and actionable feedback within 24 to 48 hours.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Format &amp; Parsing Optimization</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Industry Technical Keywords</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Direct WhatsApp Mentorship</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('/resume-review')}
              className="px-7 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs sm:text-sm transition-all duration-150 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>Get Your Resume Reviewed</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. Portfolio Website Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 p-8 sm:p-10 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Laptop className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personal Tech Branding</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-white tracking-tight leading-snug">
              Build a High-Impact Developer Portfolio Website
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Stand out to engineering managers. We design, build, and deploy personal portfolio websites with live GitHub project showcases, interactive demos, custom domain setup, and SEO optimization.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Responsive Modern UI</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>GitHub Repos &amp; Demos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Ready in 48-72 Hours</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('/portfolio-service')}
              className="px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm transition-all duration-150 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>Explore Portfolio Packages</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. WhatsApp Community Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-8 sm:p-10 text-white shadow-xl border border-emerald-700/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official WhatsApp Community</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-white tracking-tight leading-snug">
              Instant Job &amp; Internship Alerts On WhatsApp
            </h2>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
              Never miss an off-campus drive, walk-in interview, or urgent hiring notification. Get genuine, verified requisitions posted in real-time straight to your phone. Zero spam, only official links.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-emerald-100">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>100% Free for Candidates</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Direct Official Portal Links</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Daily Verified Updates</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <a
              href={OFFICIAL_LINKS.WHATSAPP_COMMUNITY}
              target="_blank"
              rel="noreferrer"
              className="px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs sm:text-sm transition-all duration-150 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <MessageSquare className="w-4 h-4 fill-slate-950" />
              <span>Join WhatsApp Community Free</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

    </div>
  );
};
