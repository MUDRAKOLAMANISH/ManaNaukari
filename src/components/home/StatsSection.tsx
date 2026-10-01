import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Building2, FileCheck, Globe, TrendingUp } from 'lucide-react';

interface StatsSectionProps {
  activeJobsCount: number;
  companiesCount: number;
  resumeReviewsCompleted: number;
  portfolioWebsitesDelivered: number;
  loading: boolean;
}

const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value <= 0) {
      setDisplayValue(0);
      return;
    }
    let start = 0;
    const duration = 1200; // 1.2s
    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentCount = Math.floor(easeProgress * value);
      setDisplayValue(currentCount);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(updateCounter);
  }, [value]);

  return <span>{displayValue.toLocaleString('en-IN')}</span>;
};

export const StatsSection: React.FC<StatsSectionProps> = ({
  activeJobsCount,
  companiesCount,
  resumeReviewsCompleted,
  portfolioWebsitesDelivered,
  loading,
}) => {
  const totalRealDataCount =
    activeJobsCount +
    companiesCount +
    resumeReviewsCompleted +
    portfolioWebsitesDelivered;

  if (!loading && totalRealDataCount === 0) {
    return null;
  }

  const statItems = [
    {
      label: 'Active Jobs',
      value: activeJobsCount,
      icon: <Briefcase className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50/90 border-blue-200/80',
      badge: 'Live',
      subtext: 'Current live openings',
      show: loading || activeJobsCount > 0,
    },
    {
      label: 'Companies Hiring',
      value: companiesCount,
      icon: <Building2 className="w-5 h-5 text-indigo-600" />,
      bg: 'bg-indigo-50/90 border-indigo-200/80',
      badge: 'Verified',
      subtext: 'Verified employers',
      show: loading || companiesCount > 0,
    },
    {
      label: 'Resume Reviews',
      value: resumeReviewsCompleted,
      icon: <FileCheck className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50/90 border-emerald-200/80',
      badge: 'Delivered',
      subtext: 'ATS evaluations delivered',
      show: loading || resumeReviewsCompleted > 0,
    },
    {
      label: 'Portfolios Delivered',
      value: portfolioWebsitesDelivered,
      icon: <Globe className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-50/90 border-purple-200/80',
      badge: '48h SLA',
      subtext: 'Custom developer sites',
      show: loading || portfolioWebsitesDelivered > 0,
    },
  ].filter((s) => s.show);

  if (statItems.length === 0) {
    return null;
  }

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative z-10 card-modern"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {statItems.map((stat, idx) => (
          <div
            key={stat.label}
            className={`${idx > 0 ? 'pt-4 sm:pt-0 sm:pl-6' : ''} flex items-start gap-3.5 sm:gap-4 group`}
          >
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} border flex items-center justify-center shrink-0 shadow-2xs transition-all duration-300 group-hover:scale-110 group-hover:shadow-xs`}>
              {stat.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight tabular-nums">
                  {loading ? (
                    <span className="inline-block w-14 h-8 bg-slate-100 rounded-lg animate-pulse" />
                  ) : (
                    <AnimatedCounter value={stat.value} />
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60 uppercase">
                  {stat.badge}
                </span>
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
    </motion.section>
  );
};
