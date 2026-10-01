import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DailyMetricPoint } from '../../../types/database.types';
import { LucideIcon } from 'lucide-react';

interface AnalyticsDailyBarChartProps {
  title: string;
  subtitle: string;
  data: DailyMetricPoint[];
  barColor: 'blue' | 'emerald' | 'indigo' | 'purple';
  icon: LucideIcon;
  totalSumLabel?: string;
}

const colorMap = {
  blue: {
    bar: 'bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600',
    activeBar: 'bg-blue-700',
    light: 'bg-blue-50 text-blue-700 border border-blue-200/60',
    dot: 'bg-blue-500',
  },
  emerald: {
    bar: 'bg-gradient-to-t from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600',
    activeBar: 'bg-emerald-700',
    light: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    dot: 'bg-emerald-500',
  },
  indigo: {
    bar: 'bg-gradient-to-t from-indigo-600 to-purple-500 hover:from-indigo-700 hover:to-purple-600',
    activeBar: 'bg-indigo-700',
    light: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
    dot: 'bg-indigo-500',
  },
  purple: {
    bar: 'bg-gradient-to-t from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600',
    activeBar: 'bg-purple-700',
    light: 'bg-purple-50 text-purple-700 border border-purple-200/60',
    dot: 'bg-purple-500',
  },
};

export const AnalyticsDailyBarChart: React.FC<AnalyticsDailyBarChartProps> = ({
  title,
  subtitle,
  data,
  barColor,
  icon: Icon,
  totalSumLabel,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<DailyMetricPoint | null>(null);
  const theme = colorMap[barColor] || colorMap.blue;

  const totalSum = data.reduce((acc, curr) => acc + curr.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xs ${theme.light}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight font-display">
              {title}
            </h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
            {totalSumLabel || '7-Day Total'}
          </span>
          <span className="text-xl font-black font-display text-slate-900 tabular-nums">
            {totalSum.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Bar Visual Container */}
      <div className="pt-4 pb-2">
        <div className="h-44 w-full flex items-end justify-between gap-2 sm:gap-3 border-b border-slate-100 pb-2 relative">
          {data.map((point) => {
            const heightPercent = maxCount > 0 ? Math.max((point.count / maxCount) * 100, 6) : 6;
            const isHovered = hoveredPoint?.date === point.date;

            return (
              <div
                key={point.date}
                className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Floating tooltip */}
                {isHovered && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-xl shadow-lg pointer-events-none z-20 whitespace-nowrap animate-fadeIn">
                    <span className="font-mono font-bold text-indigo-300">{point.count.toLocaleString()}</span> on {point.label}
                  </div>
                )}

                {/* Animated Bar with Framer Motion */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className={`w-full max-w-[28px] rounded-t-xl transition-all duration-200 ${
                    isHovered ? 'ring-2 ring-indigo-300 scale-105' : ''
                  } ${theme.bar}`}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 pt-2 text-[10px] sm:text-xs text-slate-400 font-medium">
          {data.map((point) => (
            <div
              key={point.date}
              className={`flex-1 text-center truncate ${
                hoveredPoint?.date === point.date ? 'text-indigo-600 font-bold' : ''
              }`}
            >
              {point.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
