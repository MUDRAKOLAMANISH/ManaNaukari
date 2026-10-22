import React from 'react';
import { Check, ArrowRight, Sparkles, Clock, ShieldCheck, FileCheck } from 'lucide-react';

export interface ResumePlan {
  id: string;
  name: string;
  price: string;
  badge?: string;
  popular?: boolean;
  description: string;
  features: string[];
  turnaround: string;
  ctaText: string;
}

export const RESUME_PLANS: ResumePlan[] = [
  {
    id: 'free_scan',
    name: 'Free ATS Quick Scan',
    price: 'Free',
    description: 'Quick automated check of your resume format and basic keyword matching.',
    turnaround: 'Instant Online Report',
    ctaText: 'Run Free Scan',
    features: [
      'Basic ATS parser compatibility test',
      'Format and font structure check',
      'Word count and length recommendation',
      'Instant online score summary',
    ],
  },
  {
    id: 'comprehensive_audit',
    name: 'Comprehensive ATS Audit',
    price: '₹49',
    badge: 'Most Popular',
    popular: true,
    description: 'Detailed resume review with personalized feedback to improve your chances of passing ATS screening.',
    turnaround: '24–48 Hours Delivery',
    ctaText: 'Get Audit Report',
    features: [
      'Everything in Free Scan',
      'Manual line-by-line resume review',
      'Domain-specific technical keyword mapping',
      'Action verb and impact optimization',
      'Detailed PDF report with before-and-after fixes',
      'Direct WhatsApp consultation support',
    ],
  },
  {
    id: 'placement_rewrite',
    name: 'Placement-Ready Re-Write',
    price: '₹99',
    badge: 'Complete Makeover',
    description: 'Professional resume makeover designed to present your skills and projects effectively to recruiters.',
    turnaround: '48 Hours Delivery',
    ctaText: 'Get Placement-Ready Resume',
    features: [
      'Everything in Comprehensive ATS Audit',
      'ATS-compliant resume template reformatting',
      'Customized professional summary and project descriptions',
      'LinkedIn profile headline and summary suggestions',
      'Tailoring for TCS, Infosys, Wipro, and other technology companies',
      'Two rounds of free revisions',
    ],
  },
];

interface ResumeServiceCardProps {
  plan: ResumePlan;
  isSelected?: boolean;
  onSelect: (plan: ResumePlan) => void;
}

export const ResumeServiceCard: React.FC<ResumeServiceCardProps> = ({ plan, isSelected, onSelect }) => {
  return (
    <div
      className={`relative bg-white rounded-3xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg p-6 sm:p-7 flex flex-col justify-between ${
        isSelected
          ? 'border-blue-600 shadow-xl ring-2 ring-blue-500/30 bg-gradient-to-b from-blue-50/30 to-white'
          : plan.popular
          ? 'border-blue-500 shadow-md ring-2 ring-blue-500/10'
          : 'border-slate-200 shadow-xs hover:border-blue-200'
      }`}
    >
      {/* Top Badge */}
      {(plan.badge || isSelected) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {isSelected && (
            <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-600 text-white shadow-xs">
              Selected
            </span>
          )}
          {plan.badge && !isSelected && (
            <span className="px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-500 text-white shadow-xs">
              {plan.badge}
            </span>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-lg text-slate-900 font-display">
            {plan.name}
          </h3>
          <span className="text-xl font-extrabold text-blue-600 font-display">
            {plan.price}
          </span>
        </div>

        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          {plan.description}
        </p>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{plan.turnaround}</span>
        </div>

        {/* Feature List */}
        <div className="mt-5 space-y-2.5 text-xs text-slate-600">
          {plan.features.map((feat, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span className="leading-snug">{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-7 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onSelect(plan)}
          className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
            plan.popular
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
              : 'bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-200/80'
          }`}
        >
          <span>{plan.ctaText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
