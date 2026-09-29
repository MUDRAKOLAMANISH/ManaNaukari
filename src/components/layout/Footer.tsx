import React from 'react';
import { 
  ShieldCheck, Mail, MapPin, 
  ArrowUpRight, Globe, Linkedin, Twitter, MessageSquare,
  Sparkles, ExternalLink, User
} from 'lucide-react';
import { OFFICIAL_LINKS } from '../../constants/links';
import { BrandLogo } from '../common/BrandLogo';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 pt-16 pb-12 border-t border-slate-800 mt-20 relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Grid: 5 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-slate-800/80">
          
          {/* Col 1 (5 spans): Brand, Founder Contact & Purpose */}
          <div className="lg:col-span-5 space-y-5">
            <button
              onClick={() => onNavigate('/')}
              className="text-left focus:outline-none cursor-pointer group block"
            >
              <BrandLogo variant="dark" size="md" showTagline={true} />
            </button>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md font-normal">
              Mana Naukari is India’s dedicated job portal connecting freshers, campus graduates, internship seekers, and early-career professionals directly with verified hiring companies and official career portal opportunities.
            </p>

            {/* Founder Contact & Location Card (Requirement 9) */}
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2 max-w-md backdrop-blur-xs shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <User className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Founder: Manish Mudrakola</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-slate-300">Location: Hyderabad, India</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <a
                  href="mailto:manishmudrakola8@gmail.com"
                  className="text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline"
                >
                  Email: manishmudrakola8@gmail.com
                </a>
              </div>
            </div>

            {/* Social & WhatsApp Community Links */}
            <div className="pt-1 flex items-center gap-2.5">
              <a
                href={OFFICIAL_LINKS.WHATSAPP_COMMUNITY}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs"
                title="Join WhatsApp Community"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Community</span>
              </a>

              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>

              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-sky-500 text-slate-400 hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                title="Twitter / X"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2 (2 spans): Discover Jobs */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-display">
              Job Seekers
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button 
                  onClick={() => onNavigate('/jobs')} 
                  className="hover:text-white hover:translate-x-0.5 transition-all cursor-pointer text-left"
                >
                  All Verified Jobs
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('/jobs?type=Internship')} 
                  className="hover:text-white hover:translate-x-0.5 transition-all cursor-pointer text-left"
                >
                  Internships
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('/jobs?location=Remote')} 
                  className="hover:text-white hover:translate-x-0.5 transition-all cursor-pointer text-left"
                >
                  Work From Home (WFH)
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('/categories')} 
                  className="hover:text-white hover:translate-x-0.5 transition-all cursor-pointer text-left"
                >
                  Job Categories
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('/resume-review')} 
                  className="text-blue-400 hover:text-blue-300 font-medium hover:translate-x-0.5 transition-all cursor-pointer text-left"
                >
                  ATS Resume Review
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('/portfolio-service')} 
                  className="text-indigo-400 hover:text-indigo-300 font-medium hover:translate-x-0.5 transition-all cursor-pointer text-left"
                >
                  Portfolio Website Service
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3 (2 spans): Company & Portal */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-display">
              Company
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button 
                  onClick={() => onNavigate('/about')} 
                  className="hover:text-white hover:translate-x-0.5 transition-all cursor-pointer text-left"
                >
                  About Mana Naukari
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('/contact')} 
                  className="hover:text-white hover:translate-x-0.5 transition-all cursor-pointer text-left"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('/about')} 
                  className="hover:text-white hover:translate-x-0.5 transition-all cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('/about')} 
                  className="hover:text-white hover:translate-x-0.5 transition-all cursor-pointer text-left"
                >
                  Terms &amp; Conditions
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('/contact')} 
                  className="hover:text-white hover:translate-x-0.5 transition-all cursor-pointer text-left"
                >
                  Report Fraudulent Job
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4 (3 spans): Employers & Trust */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-display">
              Employers &amp; Trust
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>100% Genuine Requisitions</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                  We never charge candidates. All jobs link directly to official employer career portals (Workday, Greenhouse, Lever, Google Forms).
                </p>
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <button
                  onClick={() => onNavigate('/post-job')}
                  className="inline-flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <span>Post a Job (Recruiters)</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/login')}
                  className="inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  <span>Admin &amp; Recruiter Console</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Strip */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-2">
            <span className="font-semibold text-slate-400">Mana Naukari © 2026</span>
            <span className="hidden sm:inline text-slate-700">·</span>
            <span>Founded by Manish Mudrakola · Hyderabad, India</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 text-xs">
            <button onClick={() => onNavigate('/about')} className="hover:text-slate-300 transition-colors cursor-pointer">
              Terms &amp; Conditions
            </button>
            <button onClick={() => onNavigate('/about')} className="hover:text-slate-300 transition-colors cursor-pointer">
              Privacy Policy
            </button>
            <button onClick={() => onNavigate('/contact')} className="hover:text-slate-300 transition-colors cursor-pointer">
              Contact
            </button>
            <a
              href="mailto:manishmudrakola8@gmail.com"
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              manishmudrakola8@gmail.com
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};
