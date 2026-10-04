import React from 'react';
import { ShieldCheck, Target, Award, Users, CheckCircle2, ArrowRight, FileText, Lock } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';

interface AboutPageProps {
  onNavigate: (path: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-14 animate-fadeIn pb-16">
      
      {/* Header */}
      <div className="text-center space-y-4 pt-4">
        <div className="flex justify-center">
          <BrandLogo size="lg" showTagline={true} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Our Ethical Recruiting Pledge</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-slate-900 tracking-tight">
          About Mana Naukari
        </h1>
        <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Mana Naukari is a trusted platform for Freshers Jobs, Internships, Work From Home Jobs, Off Campus Drives, and Entry-Level Opportunities across India.
        </p>
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold font-display text-slate-900">
            Our Mission
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            To eliminate fraudulent recruitment drives, fake placement agencies, and pay-to-apply scams by providing direct access to verified official enterprise hiring portals across India.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold font-display text-slate-900">
            Zero-Fee Guarantee
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Every candidate deserves fair, meritocratic access. Mana Naukari will always be 100% free for job seekers, graduates, and interns with zero hidden fees.
          </p>
        </div>
      </div>

      {/* Trust Standards List */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 space-y-6">
        <h2 className="text-xl font-bold font-display text-white">
          The Mana Naukari Standard
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-300">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Direct ATS link verification (Workday, Greenhouse, Lever, SmartRecruiters, Taleo).</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Transparent compensation ranges and explicit eligible batch years.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Rigorous manual audit of hiring domains and corporate registration details.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Real-time status updates: expired off-campus drives are promptly unlisted.</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-4">
          <span className="text-xs text-slate-400">Ready to begin your career journey?</span>
          <button
            onClick={() => onNavigate('/jobs')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <span>Explore Verified Jobs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terms & Conditions & Privacy Framework */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Terms */}
        <div id="terms" className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold font-display text-base">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Terms &amp; Conditions</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            By using <strong>Mana Naukari</strong>, candidates and recruiters agree to transparent, fair employment standards. Job seekers apply directly to employers at zero cost. We prohibit any fees or misleading advertisements.
          </p>
          <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-4">
            <li>100% free candidate job application portal.</li>
            <li>All postings are curated directly from authorized corporate sources.</li>
            <li>Recruiter listings are subjected to manual admin verification.</li>
            <li>For policy inquiries or disputes, contact our support team at <a href="mailto:mananaukari2026@gmail.com" className="text-blue-600 underline">mananaukari2026@gmail.com</a>.</li>
          </ul>
        </div>

        {/* Privacy Policy */}
        <div id="privacy" className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold font-display text-base">
            <Lock className="w-5 h-5 text-emerald-600" />
            <span>Privacy Policy</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>Mana Naukari</strong> respects your privacy. We never sell, rent, or trade your personal data. Subscription emails and job alert preferences are securely handled and can be unsubscribed with a single click. For data access or deletion requests, email us at <a href="mailto:mananaukari2026@gmail.com" className="text-blue-600 underline">mananaukari2026@gmail.com</a>.
          </p>
          <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-4">
            <li>Zero tracking of intrusive third-party advertising cookies.</li>
            <li>Direct WhatsApp channel protects your phone number privacy.</li>
            <li>Candidate alerts are delivered strictly according to your selected preferences.</li>
          </ul>
        </div>
      </div>

    </div>
  );
};
