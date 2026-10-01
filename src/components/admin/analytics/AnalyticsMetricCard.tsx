import React from 'react';
import { motion } from 'framer-motion';
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
    bg: 'bg-blue-50/80',
    border: 'border-blue-200/60',
    text: 'text-blue-600',
    iconBg: 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/20',
  },
  indigo: {
    bg: 'bg-indigo-50/80',
    border: 'border-indigo-200/60',
    text: 'text-indigo-600',
    iconBg: 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-indigo-500/20',
  },
  emerald: {
    bg: 'bg-emerald-50/80',
    border: 'border-emerald-200/60',
    text: 'text-emerald-600',
    iconBg: 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-50/80',
    border: 'border-amber-200/60',
    text: 'text-amber-600',
    iconBg: 'bg-gradient-to-tr from-amber-600 to-orange-600 text-white shadow-amber-500/20',
  },
  purple: {
    bg: 'bg-purple-50/80',
    border: 'border-purple-200/60',
    text: 'text-purple-600',
    iconBg: 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-purple-500/20',
  },
  rose: {
    bg: 'bg-rose-50/80',
    border: 'border-rose-200/60',
    text: 'text-rose-600',
    iconBg: 'bg-gradient-to-tr from-rose-600 to-red-600 text-white shadow-rose-500/20',
  },
  teal: {
    bg: 'bg-teal-50/80',
    border: 'border-teal-200/60',
    text: 'text-teal-600',
    iconBg: 'bg-gradient-to-tr from-teal-600 to-emerald-600 text-white shadow-teal-500/20',
  },
  slate: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    iconBg: 'bg-gradient-to-tr from-slate-700 to-slate-900 text-white shadow-slate-500/20',
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
    <motion.div 
      whileHover={{ y: -3, scale: 1.015 }}
      transition={{ duration: 0.2 }}
      className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight tabular-nums">
            {value}
          </div>
        </div>

        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 ${theme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || badge || trend) && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          {subtitle && (
            <span className="text-slate-500 font-medium truncate text-[11px]">
              {subtitle}
            </span>
          )}

          {badge && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${theme.bg} ${theme.text} ${theme.border}`}>
              {badge}
            </span>
          )}

          {trend && (
            <span className="text-emerald-700 font-semibold text-[10px] bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
              {trend}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
