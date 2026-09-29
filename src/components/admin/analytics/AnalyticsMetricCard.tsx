import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AnalyticsMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme: 'blue' | 'indigo' | 'emerald' | 'amber' | 'purple' | 'rose' | 'teal' | 'slate';
  badge?: string;
  trend?: string;
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50/70',
    border: 'border-blue-100',
    text: 'text-blue-600',
    iconBg: 'bg-blue-600 text-white',
    ring: 'focus-within:ring-blue-500',
  },
  indigo: {
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-100',
    text: 'text-indigo-600',
    iconBg: 'bg-indigo-600 text-white',
    ring: 'focus-within:ring-indigo-500',
  },
  emerald: {
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-100',
    text: 'text-emerald-600',
    iconBg: 'bg-emerald-600 text-white',
    ring: 'focus-within:ring-emerald-500',
  },
  amber: {
    bg: 'bg-amber-50/70',
    border: 'border-amber-100',
    text: 'text-amber-600',
    iconBg: 'bg-amber-600 text-white',
    ring: 'focus-within:ring-amber-500',
  },
  purple: {
    bg: 'bg-purple-50/70',
    border: 'border-purple-100',
    text: 'text-purple-600',
    iconBg: 'bg-purple-600 text-white',
    ring: 'focus-within:ring-purple-500',
  },
  rose: {
    bg: 'bg-rose-50/70',
    border: 'border-rose-100',
    text: 'text-rose-600',
    iconBg: 'bg-rose-600 text-white',
    ring: 'focus-within:ring-rose-500',
  },
  teal: {
    bg: 'bg-teal-50/70',
    border: 'border-teal-100',
    text: 'text-teal-600',
    iconBg: 'bg-teal-600 text-white',
    ring: 'focus-within:ring-teal-500',
  },
  slate: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    iconBg: 'bg-slate-700 text-white',
    ring: 'focus-within:ring-slate-500',
  },
};

export const AnalyticsMetricCard: React.FC<AnalyticsMetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme,
  badge,
  trend,
}) => {
  const theme = colorMap[colorScheme] || colorMap.blue;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
            {value}
          </div>
        </div>

        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105 ${theme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || badge || trend) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          {subtitle && (
            <span className="text-slate-500 font-medium truncate">
              {subtitle}
            </span>
          )}

          {badge && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${theme.bg} ${theme.text}`}>
              {badge}
            </span>
          )}

          {trend && (
            <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
