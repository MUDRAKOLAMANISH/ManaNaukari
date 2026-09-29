import React from 'react';
import { Briefcase, Building2, FileCheck, Globe } from 'lucide-react';

interface StatsSectionProps {
  activeJobsCount: number;
  companiesCount: number;
  resumeReviewsCompleted: number;
  portfolioWebsitesDelivered: number;
  loading: boolean;
}

export const StatsSection: React.FC<StatsSectionProps> = ({
  activeJobsCount,
  companiesCount,
  resumeReviewsCompleted,
  portfolioWebsitesDelivered,
  loading,
}) => {
  // Requirement 8: Real data only.
  // Show:
  // - Active Jobs
  // - Companies Hiring
  // - Resume Reviews Completed
  // - Portfolio Websites Delivered
  // "If no real data exists, hide the section. Never show fake numbers."

  const totalRealDataCount =
    activeJobsCount +
    companiesCount +
    resumeReviewsCompleted +
    portfolioWebsitesDelivered;

  if (!loading && totalRealDataCount === 0) {
    return null; // Completely hide the section if no real data exists
  }

  const statItems = [
    {
      label: 'Active Jobs',
      value: activeJobsCount,
      icon: <Briefcase className="w-5 h-5 text-blue-600" />,
      subtext: 'Current live openings',
      show: loading || activeJobsCount > 0,
    },
    {
      label: 'Companies Hiring',
      value: companiesCount,
      icon: <Building2 className="w-5 h-5 text-indigo-600" />,
      subtext: 'Verified employers',
      show: loading || companiesCount > 0,
    },
    {
      label: 'Resume Reviews Completed',
      value: resumeReviewsCompleted,
      icon: <FileCheck className="w-5 h-5 text-emerald-600" />,
      subtext: 'ATS evaluations delivered',
      show: loading || resumeReviewsCompleted > 0,
    },
    {
      label: 'Portfolio Websites Delivered',
      value: portfolioWebsitesDelivered,
      icon: <Globe className="w-5 h-5 text-purple-600" />,
      subtext: 'Custom developer portfolios',
      show: loading || portfolioWebsitesDelivered > 0,
    },
  ].filter((s) => s.show);

  if (statItems.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative z-10 animate-fadeIn">
      <div className={`grid grid-cols-2 lg:grid-cols-${Math.min(statItems.length, 4)} gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-slate-100`}>
        {statItems.map((stat, idx) => (
          <div
            key={stat.label}
            className={`${idx > 0 ? 'pt-4 sm:pt-0 sm:pl-6' : ''} flex items-start gap-4`}
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-2xs">
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight tabular-nums">
                {loading ? (
                  <span className="inline-block w-12 h-7 bg-slate-200 rounded animate-pulse" />
                ) : (
                  <span>{stat.value.toLocaleString('en-IN')}</span>
                )}
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                {stat.label}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {stat.subtext}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
