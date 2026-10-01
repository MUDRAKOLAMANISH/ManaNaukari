import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, GraduationCap, Zap, CheckCircle2, ArrowRight, Sparkles, Building2, Users } from 'lucide-react';

interface WhyChooseUsSectionProps {
  onNavigate: (path: string) => void;
}

export const WhyChooseUsSection: React.FC<WhyChooseUsSectionProps> = ({ onNavigate }) => {
  const pillars = [
    {
      title: '100% Verified Corporate Links',
      badge: 'Zero Scam Policy',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
      description:
        'Every single opening on Mana Naukari is manually verified to link directly to official employer career portals (Workday, Greenhouse, Lever, Taleo). No third-party agents or fees.',
      points: [
        'Direct corporate careers URLs',
        'Official HR recruiter emails only',
        'Transparent salary & batch criteria',
      ],
      actionLabel: 'Browse Verified Openings',
      actionPath: '/jobs',
    },
    {
      title: 'Built for Freshers & Early Careers',
      badge: '2024 - 2026 Batches',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      icon: <GraduationCap className="w-6 h-6 text-indigo-600" />,
      description:
        'Tailored specifically for campus graduates, internship seekers, and engineers with 0 to 3 years experience. Avoid sorting through senior 10+ year requirements on traditional portals.',
      points: [
        'Dedicated off-campus drive updates',
        'Remote and hybrid entry-level positions',
        'Skill-tagged for Java, React, SQL & AI',
      ],
      actionLabel: 'Explore Internships',
      actionPath: '/jobs?type=Internship',
    },
    {
      title: 'Career Acceleration Services',
      badge: '24-48h SLA Delivery',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200/80',
      icon: <Zap className="w-6 h-6 text-purple-600" />,
      description:
        'Elevate your hiring odds with professional human-crafted ATS resume evaluations and bespoke modern developer portfolio websites deployed to custom domains.',
      points: [
        'Line-by-line ATS resume diagnostics',
        'Live GitHub project showcase websites',
        'Instant mobile job alerts via WhatsApp',
      ],
      actionLabel: 'View Career Services',
      actionPath: '/resume-review',
    },
  ];

  return (
    <section className="space-y-10 py-6">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold font-display border border-blue-100">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Why Job Seekers Choose Mana Naukari</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
          A Fresh Approach to Starting Your Tech Career
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
          Designed from the ground up for Indian students and early-career tech professionals seeking authentic corporate opportunities.
        </p>
      </div>

      {/* 3-Column Modern Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pillars.map((pillar, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -4, scale: 1.015 }}
            transition={{ duration: 0.25 }}
            className="card-modern p-6 sm:p-7 flex flex-col justify-between border border-slate-200/90 hover:border-indigo-300 relative group overflow-hidden"
          >
            {/* Subtle Top Gradient Accent on Hover */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shadow-2xs group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                  {pillar.icon}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${pillar.badgeColor}`}>
                  {pillar.badge}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold font-display text-slate-900 group-hover:text-blue-600 transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {pillar.description}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                {pillar.points.map((pt, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onNavigate(pillar.actionPath)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 hover:bg-blue-600 hover:text-white border border-slate-200 transition-all cursor-pointer group/btn"
              >
                <span>{pillar.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
