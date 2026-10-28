import React from 'react';
import { 
  ShieldCheck, Lock, Eye, FileText, Database, Server, UserCheck, 
  Trash2, Mail, ExternalLink, AlertCircle, HelpCircle, CheckCircle2 
} from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';

interface PrivacyPolicyPageProps {
  onNavigate: (path: string) => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fadeIn pb-16 px-4 sm:px-6">
      
      {/* Page Header */}
      <div className="text-center space-y-4 pt-4 border-b border-slate-200 pb-8">
        <div className="flex justify-center">
          <BrandLogo size="lg" showTagline={true} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>User Data Protection &amp; Privacy Standard</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Last Updated: October 2026 · Mana Career (Mana Naukari)
        </p>
      </div>

      {/* Summary Box */}
      <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-white font-bold text-base font-display">
          <Lock className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Privacy Commitment at a Glance</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Mana Career (<a href="https://manacarrier.netlify.app/" className="text-blue-400 underline" target="_blank" rel="noreferrer">manacarrier.netlify.app</a>) is an Indian job portal dedicated to connecting freshers, students, and job seekers with verified employment opportunities, internships, off-campus hiring drives, and official company application links.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-300">
          <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>We never sell or rent your personal contact details.</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Job alerts are 100% opt-in with one-click unsubscribe.</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Zero intrusive 3rd-party advertising tracking.</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Direct access to delete or correct your personal data.</span>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-8 text-slate-700 text-sm leading-relaxed">

        {/* 1. Information Collection */}
        <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold font-display text-lg">
            <Database className="w-5 h-5 text-blue-600 shrink-0" />
            <h2>1. Information We Collect</h2>
          </div>
          <p>
            When you use Mana Career to browse job listings, subscribe to daily job notifications, submit applications, or request career assistance services, we may collect the following categories of information:
          </p>
          <ul className="space-y-2.5 list-disc pl-5 text-xs sm:text-sm text-slate-600">
            <li>
              <strong className="text-slate-800">Account &amp; Contact Details:</strong> Your name, email address, and mobile phone number provided when creating an account, subscribing to job alerts, or logging in.
            </li>
            <li>
              <strong className="text-slate-800">Resumes &amp; Professional Profile Data:</strong> Resume documents (PDF/Word), educational history, skills, experience level, and portfolio links uploaded or provided when utilizing ATS resume reviews, portfolio setup, or job applications.
            </li>
            <li>
              <strong className="text-slate-800">Job Preferences &amp; Saved Items:</strong> Desired job titles, preferred work locations (e.g. Hyderabad, Remote/WFH), saved job listings, and alert frequency preferences.
            </li>
            <li>
              <strong className="text-slate-800">Technical &amp; Usage Logs:</strong> Basic device type, browser type, IP address, and page view telemetry automatically logged to ensure website stability, prevent automated spam, and improve site speed.
            </li>
          </ul>
        </section>

        {/* 2. Purpose of Use */}
        <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold font-display text-lg">
            <Eye className="w-5 h-5 text-blue-600 shrink-0" />
            <h2>2. How We Use Your Information</h2>
          </div>
          <p>
            We process your personal information strictly for legitimate operational purposes, including:
          </p>
          <ul className="space-y-2.5 list-disc pl-5 text-xs sm:text-sm text-slate-600">
            <li>Delivering daily and weekly job alert emails or notifications based on your chosen career categories.</li>
            <li>Connecting candidates with verified recruiter requisitions or official hiring portals.</li>
            <li>Fulfilling requested career services such as ATS resume feedback, portfolio creation, or mock interview bookings.</li>
            <li>Authenticating user logins and securing user accounts against unauthorized access.</li>
            <li>Monitoring platform analytics to maintain uptime, optimize mobile responsiveness, and enhance search performance.</li>
          </ul>
        </section>

        {/* 3. Security & Safeguards */}
        <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold font-display text-lg">
            <Server className="w-5 h-5 text-blue-600 shrink-0" />
            <h2>3. How We Protect Your Data</h2>
          </div>
          <p>
            We implement industry-standard technical and organizational security controls to safeguard your personal data:
          </p>
          <ul className="space-y-2.5 list-disc pl-5 text-xs sm:text-sm text-slate-600">
            <li>
              <strong className="text-slate-800">Encrypted Communications:</strong> All web connections use modern SSL/TLS (HTTPS) encryption during data transit.
            </li>
            <li>
              <strong className="text-slate-800">Secure Cloud Storage:</strong> User authentication and database records are managed through secure cloud infrastructure (Supabase) enforced with row-level access control policies.
            </li>
            <li>
              <strong className="text-slate-800">Access Limits:</strong> Administrative access to user data is strictly restricted to authorized platform personnel on a need-to-know basis.
            </li>
          </ul>
          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Notice:</strong> While we employ technical safeguards to protect your personal details, no transmission over the internet or method of electronic storage can be guaranteed to be 100% secure. Users are encouraged to protect their account credentials and avoid sharing sensitive account details.
            </p>
          </div>
        </section>

        {/* 4. Information Sharing & Third Parties */}
        <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold font-display text-lg">
            <ExternalLink className="w-5 h-5 text-blue-600 shrink-0" />
            <h2>4. Third-Party Links &amp; Service Providers</h2>
          </div>
          <p>
            Mana Career acts as a job discovery engine that redirects job seekers to official external application portals (e.g., Workday, Greenhouse, Lever, SmartRecruiters, or official corporate websites).
          </p>
          <ul className="space-y-2.5 list-disc pl-5 text-xs sm:text-sm text-slate-600">
            <li>
              <strong className="text-slate-800">External Career Links:</strong> Once you leave Mana Career to apply on an official employer portal, your interaction is governed by that external company’s respective privacy policy.
            </li>
            <li>
              <strong className="text-slate-800">Trusted Infrastructure Providers:</strong> We rely on trusted third-party service providers (such as cloud hosting, authentication gateways, and transactional email services) to run our platform. These providers process data solely on our behalf and under strict confidentiality obligations.
            </li>
            <li>
              <strong className="text-slate-800">No Selling of Personal Data:</strong> We do not sell, trade, or commercialize job seekers' contact details or uploaded resumes to third-party advertisers or telemarketing databases.
            </li>
            <li>
              <strong className="text-slate-800">Legal Compliance:</strong> We may disclose user information if required by applicable Indian laws, legal regulations, court orders, or governmental requests.
            </li>
          </ul>
        </section>

        {/* 5. User Rights, Deletion & Unsubscribing */}
        <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold font-display text-lg">
            <UserCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <h2>5. Your Choices, Data Access &amp; Unsubscribing</h2>
          </div>
          <p>
            You maintain full control over your personal information and subscription status:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Job Alert Unsubscribe</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                You can deactivate daily job alerts at any time by clicking the unsubscribe link in alert emails or visiting our dedicated <button onClick={() => onNavigate('/unsubscribe')} className="text-blue-600 underline font-medium">Unsubscribe Page</button>.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Data Correction &amp; Deletion</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                To request a copy of your stored data, update incorrect information, or permanently delete your candidate account and resume records, email us at <a href="mailto:manishmudrakola8@gmail.com" className="text-blue-600 underline font-medium">manishmudrakola8@gmail.com</a>.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Contact & Data Controller */}
        <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold font-display text-lg">
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <h2>6. Contact Us &amp; Support</h2>
          </div>
          <p>
            If you have questions, concerns, or privacy requests regarding this policy or how your data is handled on Mana Career, please reach out to us:
          </p>
          <div className="p-5 bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Mail className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Contact Email: <a href="mailto:manishmudrakola8@gmail.com" className="text-blue-400 underline">manishmudrakola8@gmail.com</a></span>
            </div>
            <p className="text-xs text-slate-400">
              Platform: Mana Career (Mana Naukari) · Founded by Manish Mudrakola
            </p>
            <p className="text-xs text-slate-400">
              Location: Hyderabad, Telangana, India
            </p>
            <p className="text-[11px] text-slate-500 pt-1">
              Privacy and data deletion requests are reviewed and responded to within 2 to 3 business days.
            </p>
          </div>
        </section>

      </div>

      {/* Footer Navigation CTA */}
      <div className="pt-6 text-center">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          <span>Return to Job Portal Homepage</span>
        </button>
      </div>

    </div>
  );
};
