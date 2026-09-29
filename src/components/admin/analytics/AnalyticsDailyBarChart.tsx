import React, { useState } from 'react';
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
    bar: 'bg-blue-600 hover:bg-blue-700',
    activeBar: 'bg-blue-700',
    light: 'bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
  emerald: {
    bar: 'bg-emerald-600 hover:bg-emerald-700',
    activeBar: 'bg-emerald-700',
    light: 'bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  indigo: {
    bar: 'bg-indigo-600 hover:bg-indigo-700',
    activeBar: 'bg-indigo-700',
    light: 'bg-indigo-50 text-indigo-700',
    dot: 'bg-indigo-500',
  },
  purple: {
    bar: 'bg-purple-600 hover:bg-purple-700',
    activeBar: 'bg-purple-700',
    light: 'bg-purple-50 text-purple-700',
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
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme.light}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 block font-medium">
            {totalSumLabel || '7-Day Total'}
          </span>
          <span className="text-lg font-extrabold font-display text-slate-900">
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
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-lg pointer-events-none z-20 whitespace-nowrap animate-fadeIn">
                    <span className="font-mono">{point.count.toLocaleString()}</span> on {point.label}
                  </div>
                )}

                {/* Value on top of bar if count > 0 */}
                {point.count > 0 && (
                  <span className="text-[10px] font-bold text-slate-600 mb-1 group-hover:text-slate-900 transition-colors">
                    {point.count}
                  </span>
                )}

                {/* Animated Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full max-w-[40px] rounded-t-lg transition-all duration-300 ${
                    isHovered ? theme.activeBar : theme.bar
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 mt-2">
          {data.map((point) => (
            <div
              key={point.date}
              className="flex-1 text-center text-[10px] sm:text-[11px] font-medium text-slate-500 truncate"
            >
              {point.label}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
          Aggregated in 24-hour UTC intervals
        </span>
        <span className="font-semibold text-slate-700">Real-time telemetry</span>
      </div>
    </div>
  );
};
