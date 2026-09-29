import React from 'react';
import { Check, ArrowRight, Globe, Github, Sparkles, Clock, ExternalLink } from 'lucide-react';

export interface PortfolioPlan {
  id: string;
  name: string;
  price: string;
  badge?: string;
  popular?: boolean;
  tagline: string;
  deliveryTime: string;
  features: string[];
  ctaText: string;
}

export const PORTFOLIO_PLANS: PortfolioPlan[] = [
  {
    id: 'starter_portfolio',
    name: 'Fresher Starter Portfolio',
    price: '₹999',
    tagline: 'Clean, modern 1-page personal portfolio to showcase your bio, projects, and contact.',
    deliveryTime: '24-48 Hours Delivery',
    ctaText: 'Build Starter Portfolio',
    features: [
      'Responsive, mobile-first design',
      'Hero section with professional introduction',
      'Up to 4 project showcase cards with live links',
      'Skills grid & education timeline',
      'Contact form connected to your email/WhatsApp',
      'Hosted for free on Vercel / GitHub Pages',
    ],
  },
  {
    id: 'pro_developer',
    name: 'Pro Tech Showcase',
    price: '₹1,999',
    badge: 'Best for Engineers',
    popular: true,
    tagline: 'High-impact personal branding website designed to stand out in technical interviews.',
    deliveryTime: '48-72 Hours Delivery',
    ctaText: 'Build Pro Portfolio',
    features: [
      'Everything in Starter Portfolio',
      'Interactive GitHub repository showcase',
      'Live project interactive modals / demos',
      'Built with Next.js / React & Tailwind CSS',
      'SEO optimized with OpenGraph social share cards',
      'Downloadable resume PDF button integrated',
      'Custom domain connection support (yourname.in)',
      '1 year free hosting assistance',
    ],
  },
  {
    id: 'elite_custom',
    name: 'Custom Domain & Elite Brand',
    price: '₹3,499',
    badge: 'Premium Experience',
    tagline: 'Comprehensive developer identity with blog/articles, custom animations, and custom branding.',
    deliveryTime: '3-4 Days Delivery',
    ctaText: 'Get Elite Portfolio',
    features: [
      'Everything in Pro Showcase',
      'Free 1-Year .in or .dev Domain included',
      'Tech blog / Markdown article writing system',
      'Dark mode / Light mode toggle',
      'Custom branding, avatar styling & icon set',
      'Priority 1-on-1 developer consultation via Google Meet',
      '30 days of post-launch maintenance & tweaks',
    ],
  },
];

interface PortfolioServiceCardProps {
  plan: PortfolioPlan;
  onSelect: (plan: PortfolioPlan) => void;
}

export const PortfolioServiceCard: React.FC<PortfolioServiceCardProps> = ({ plan, onSelect }) => {
  return (
    <div
      className={`relative bg-white rounded-3xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg p-6 sm:p-7 flex flex-col justify-between ${
        plan.popular
          ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
          : 'border-slate-200 shadow-xs hover:border-indigo-200'
      }`}
    >
      {/* Popular Badge */}
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
            {plan.badge}
          </span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-lg text-slate-900 font-display">
            {plan.name}
          </h3>
          <span className="text-xl font-extrabold text-indigo-600 font-display">
            {plan.price}
          </span>
        </div>

        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          {plan.tagline}
        </p>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>{plan.deliveryTime}</span>
        </div>

        {/* Feature List */}
        <div className="mt-5 space-y-2.5 text-xs text-slate-600">
          {plan.features.map((feat, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200">
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
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
              : 'bg-slate-100 hover:bg-indigo-50 text-slate-800 hover:text-indigo-700 border border-slate-200/80'
          }`}
        >
          <span>{plan.ctaText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
