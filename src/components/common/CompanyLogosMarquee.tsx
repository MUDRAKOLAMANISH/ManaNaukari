import React from 'react';
import { CompanyLogo } from './CompanyLogo';
import { Sparkles, ArrowRight } from 'lucide-react';

interface CompanyLogosMarqueeProps {
  onCompanyClick?: (companyName: string) => void;
  className?: string;
}

const FEATURED_BRANDS = [
  { name: 'Amazon', category: 'Product & Cloud' },
  { name: 'Apple', category: 'Consumer Tech' },
  { name: 'Accenture', category: 'Consulting' },
  { name: 'TCS', category: 'IT Services' },
  { name: 'Infosys', category: 'IT Services' },
  { name: 'Wipro', category: 'IT Services' },
  { name: 'HCLTech', category: 'Tech Services' },
  { name: 'Salesforce', category: 'Cloud CRM' },
  { name: 'IBM', category: 'Enterprise Tech' },
  { name: 'Flipkart', category: 'E-Commerce' },
  { name: 'Google', category: 'Product & AI' },
  { name: 'Microsoft', category: 'Cloud & AI' },
  { name: 'Capgemini', category: 'IT Consulting' },
  { name: 'Cognizant', category: 'IT Services' },
  { name: 'Deloitte', category: 'Consulting' },
  { name: 'Tech Mahindra', category: 'Telecom & IT' },
  { name: 'Swiggy', category: 'Tech Product' },
  { name: 'Zomato', category: 'Tech Product' },
  { name: 'Paytm', category: 'FinTech' },
  { name: 'PhonePe', category: 'FinTech' },
  { name: 'Jio', category: 'Telecom & Tech' },
  { name: 'Oracle', category: 'Cloud & Database' },
  { name: 'Cisco', category: 'Networking' },
  { name: 'Zoho', category: 'SaaS Product' },
];

export const CompanyLogosMarquee: React.FC<CompanyLogosMarqueeProps> = ({
  onCompanyClick,
  className = '',
}) => {
  const handleClick = (companyName: string) => {
    if (onCompanyClick) {
      onCompanyClick(companyName);
    } else {
      window.location.href = `/jobs?q=${encodeURIComponent(companyName)}`;
    }
  };

  const renderBrandItems = (prefix: string) => (
    <div key={prefix} className="flex items-center gap-3 sm:gap-4 shrink-0">
      {FEATURED_BRANDS.map((brand, idx) => (
        <button
          key={`${prefix}-${idx}`}
          type="button"
          onClick={() => handleClick(brand.name)}
          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white border border-slate-200/90 hover:border-blue-400/80 shadow-2xs hover:shadow-sm transition-all duration-200 cursor-pointer shrink-0"
          title={`View verified ${brand.name} job requisitions`}
        >
          <CompanyLogo companyName={brand.name} size="sm" />
          <div className="text-left flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors font-display tracking-tight">
              {brand.name}
            </span>
            <span className="hidden sm:inline text-[9px] font-semibold text-slate-400 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-700 px-1.5 py-0.5 rounded transition-colors">
              {brand.category}
            </span>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className={`relative w-full overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 py-2 sm:py-2.5 text-white border-y border-indigo-900/40 shadow-2xs ${className}`}>
      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-r from-slate-950 to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-l from-indigo-950 to-transparent z-10" />

      <div className="max-w-7xl mx-auto flex items-center">
        {/* Left Fixed Badge */}
        <div className="hidden lg:flex items-center gap-2 pl-4 pr-3 py-0.5 bg-slate-950/80 backdrop-blur-md border-r border-slate-800 shrink-0 z-20 shadow-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-300 flex items-center gap-1 font-display">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Active Hiring</span>
          </span>
        </div>

        {/* Marquee Track */}
        <div className="flex-1 overflow-hidden py-0.5">
          <div className="flex items-center gap-3 sm:gap-4 animate-ticker group hover:[animation-play-state:paused]">
            {renderBrandItems('set-1')}
            {renderBrandItems('set-2')}
          </div>
        </div>
      </div>
    </div>
  );
};
