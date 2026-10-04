import React, { useState } from 'react';
import {
  Globe, Laptop, Code2, Sparkles, Check, ArrowRight,
  MessageSquare, ShieldCheck, Clock, ExternalLink, HelpCircle,
  FileCheck, Star, Users, PhoneCall, X, CheckCircle2
} from 'lucide-react';
import { PORTFOLIO_PLANS, PortfolioPlan, PortfolioServiceCard } from '../components/home/PortfolioServiceCard';
import { OFFICIAL_LINKS } from '../constants/links';

interface PortfolioServicePageProps {
  onNavigate: (path: string) => void;
}

export const PortfolioServicePage: React.FC<PortfolioServicePageProps> = ({ onNavigate }) => {
  const [selectedPlan, setSelectedPlan] = useState<PortfolioPlan | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateRole, setCandidateRole] = useState('Frontend Developer');
  const [candidateGithub, setCandidateGithub] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSelectPlan = (plan: PortfolioPlan) => {
    setSelectedPlan(plan);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !candidatePhone.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);

      // Open WhatsApp directly with prefilled message
      const text = encodeURIComponent(
        `Hi Manish / Mana Naukari Team!\nI would like to order the *${selectedPlan?.name || 'Developer Portfolio'}* package (${selectedPlan?.price || ''}).\n\nName: ${candidateName}\nRole: ${candidateRole}\nEmail: ${candidateEmail}\nGitHub: ${candidateGithub || 'None'}\n\nPlease share the next steps!`
      );
      window.open(`https://wa.me/91${candidatePhone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
    }, 700);
  };

  return (
    <div className="space-y-16 animate-fadeIn pb-16">
      
      {/* 1. Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-6 sm:pt-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Launch Your Tech Brand with Mana Naukari</span>
        </div>

        <div className="space-y-3.5">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display text-slate-900 tracking-tight leading-[1.14]">
            Custom Portfolio Websites for <span className="text-indigo-600">Freshers &amp; Engineers</span>
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Stand out in tech interviews. We design, code, and deploy fast, responsive personal portfolios showcasing your live GitHub projects, skills, and resume.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4 text-left">
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              <Laptop className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 font-display">100% Responsive</div>
            <div className="text-[11px] text-slate-500">Mobile &amp; desktop ready</div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 font-display">48-Hour Delivery</div>
            <div className="text-[11px] text-slate-500">Fast turnaround time</div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              <Globe className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 font-display">Free Hosting</div>
            <div className="text-[11px] text-slate-500">Vercel &amp; GitHub Pages</div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
              <Code2 className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 font-display">Source Code</div>
            <div className="text-[11px] text-slate-500">Full ownership on GitHub</div>
          </div>
        </div>
      </section>

      {/* 2. Package Pricing Cards Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
            Transparent, Affordable Packages
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Choose the portfolio tier that matches your career level. No hidden charges or recurring developer fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PORTFOLIO_PLANS.map((plan) => (
            <PortfolioServiceCard
              key={plan.id}
              plan={plan}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>
      </section>

      {/* 3. Why Every Tech Candidate Needs a Portfolio */}
      <section className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xs space-y-8">
        <div className="max-w-2xl">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block font-display">
            The Recruiter Advantage
          </span>
          <h3 className="text-2xl font-bold font-display text-slate-900 tracking-tight mt-1">
            Why Hiring Managers Prefer Candidates with Live Portfolios
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            In competitive fresher pools with hundreds of identical resumes, a live, clickable link is the single fastest proof of your technical abilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 leading-relaxed">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm font-display">
              01
            </div>
            <h4 className="font-bold text-sm text-slate-900">Immediate Proof of Work</h4>
            <p className="text-slate-500">
              Recruiters can test your web apps, inspect your UI craft, and verify your code repository directly without guessing what you know.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm font-display">
              02
            </div>
            <h4 className="font-bold text-sm text-slate-900">Custom Domain Authority</h4>
            <p className="text-slate-500">
              Having a personal URL like <code className="bg-slate-200 px-1 rounded text-slate-800">yourname.in</code> on your resume header leaves an unforgettable, professional first impression.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm font-display">
              03
            </div>
            <h4 className="font-bold text-sm text-slate-900">Zero Maintenance Headache</h4>
            <p className="text-slate-500">
              We deploy your site to modern global CDNs with automatic HTTPS certificates and zero monthly hosting costs.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Consultation & Ordering Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                  Book Portfolio Development
                </span>
                <h3 className="font-bold text-lg text-slate-900 font-display">
                  {selectedPlan.name} ({selectedPlan.price})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-lg text-slate-900">Request Sent Successfully!</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  We have opened your WhatsApp conversation with our developer lead. We will review your projects and provide the prototype within 48 hours.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false);
                    setSelectedPlan(null);
                  }}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Manish Sharma"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. candidate@gmail.com"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      WhatsApp Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={candidatePhone}
                      onChange={(e) => setCandidatePhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Your Discipline / Domain
                  </label>
                  <select
                    value={candidateRole}
                    onChange={(e) => setCandidateRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="Frontend Developer (React / Next.js)">Frontend Developer (React / Next.js)</option>
                    <option value="Backend / Full-Stack Engineer">Backend / Full-Stack Engineer</option>
                    <option value="Java / Python Software Engineer">Java / Python Software Engineer</option>
                    <option value="Data Scientist / AI Engineer">Data Scientist / AI Engineer</option>
                    <option value="UI/UX Designer">UI/UX Designer</option>
                    <option value="College Fresher / Student">College Fresher / Student</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    GitHub / LinkedIn Profile URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/yourusername"
                    value={candidateGithub}
                    onChange={(e) => setCandidateGithub(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>Connecting to WhatsApp...</span>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        <span>Confirm &amp; Chat on WhatsApp</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    🔒 No upfront commitment. We discuss requirements and show design previews first.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5. FAQ Section */}
      <section className="bg-slate-50 rounded-3xl border border-slate-200 p-8 sm:p-10 space-y-6">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-lg text-slate-900 font-display">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-600">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-1.5">
            <h5 className="font-bold text-slate-900">How long does delivery take?</h5>
            <p>Starter portfolios are delivered within 24 to 48 hours. Custom domains and advanced interactive full-stack showcases take 48 to 72 hours.</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-1.5">
            <h5 className="font-bold text-slate-900">Are there any monthly hosting charges?</h5>
            <p>No! We set up free global hosting on Vercel or GitHub Pages, with automated SSL certificates, meaning $0/month in hosting costs.</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-1.5">
            <h5 className="font-bold text-slate-900">Do I get the source code?</h5>
            <p>Yes, 100%! We push the clean React/Next.js/HTML codebase directly to your personal GitHub repository so you maintain complete control.</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-1.5">
            <h5 className="font-bold text-slate-900">Can I update my projects later?</h5>
            <p>Yes. The structure is built with simple configuration files where you can add new projects, certificates, or skills anytime with ease.</p>
          </div>
        </div>
      </section>

    </div>
  );
};
