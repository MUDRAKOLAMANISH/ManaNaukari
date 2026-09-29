import React from 'react';
import { IndianRupee, RotateCcw, Sparkles } from 'lucide-react';
import { SALARY_PRESET_RANGES, SalaryRangeFilter } from '../../utils/salaryUtils';

interface SalaryRangeSliderProps {
  minSalary: number; // in Lakhs (0 to 15)
  maxSalary: number | null; // in Lakhs, or null for unbounded
  includeUndisclosed: boolean;
  onSalaryChange: (min: number, max: number | null) => void;
  onIncludeUndisclosedChange: (include: boolean) => void;
  onResetSalary: () => void;
  salaryMatchCount?: number;
}

export const SalaryRangeSlider: React.FC<SalaryRangeSliderProps> = ({
  minSalary,
  maxSalary,
  includeUndisclosed,
  onSalaryChange,
  onIncludeUndisclosedChange,
  onResetSalary,
  salaryMatchCount,
}) => {
  const isFilterActive = minSalary > 0 || (maxSalary !== null && maxSalary < 15);

  // Check if current selection matches a preset range
  const activePreset = SALARY_PRESET_RANGES.find(
    (p) => p.min === minSalary && p.max === maxSalary
  );

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    // When using slider directly, we set minSalary to val and max to null (or unbounded if >=15)
    if (val === 0) {
      onSalaryChange(0, null);
    } else if (val >= 15) {
      onSalaryChange(15, null);
    } else {
      onSalaryChange(val, null);
    }
  };

  const handlePresetClick = (preset: SalaryRangeFilter) => {
    onSalaryChange(preset.min, preset.max);
  };

  // Format header display label
  const getDisplayLabel = () => {
    if (minSalary === 0 && (maxSalary === null || maxSalary >= 15)) {
      return 'All Salaries (Any)';
    }
    if (maxSalary !== null) {
      return `₹${minSalary}L - ₹${maxSalary}L per annum`;
    }
    return `Min ₹${minSalary} Lakhs+ / year`;
  };

  // Calculate percentage for gradient track: 0 to 15 Lakhs
  const sliderValue = minSalary > 15 ? 15 : minSalary;
  const progressPercent = (sliderValue / 15) * 100;

  return (
    <div className="space-y-3.5 pt-2 border-t border-slate-100">
      {/* Title & Clear Action */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-display">
          <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
          <span>Annual Salary (LPA)</span>
        </label>

        {isFilterActive && (
          <button
            type="button"
            onClick={onResetSalary}
            className="text-[11px] font-medium text-slate-400 hover:text-blue-600 transition-colors cursor-pointer inline-flex items-center gap-1"
            title="Reset salary filter"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Active Range Indicator Pill */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 animate-pulse" />
          <span className="text-xs font-bold text-slate-800 truncate font-mono">
            {getDisplayLabel()}
          </span>
        </div>

        {typeof salaryMatchCount === 'number' && (
          <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full shrink-0 ml-2">
            {salaryMatchCount} jobs
          </span>
        )}
      </div>

      {/* Slider Control */}
      <div className="space-y-1.5 px-1 pt-1">
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max="15"
            step="1"
            value={sliderValue}
            onChange={handleSliderChange}
            aria-label="Filter jobs by minimum annual salary in Lakhs"
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            style={{
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${progressPercent}%, #e2e8f0 ${progressPercent}%, #e2e8f0 100%)`,
            }}
          />
        </div>

        {/* Ticks on slider */}
        <div className="flex justify-between items-center text-[10px] text-slate-600 font-semibold px-0.5">
          <button
            type="button"
            onClick={() => onSalaryChange(0, null)}
            className={`hover:text-blue-600 transition-colors ${minSalary === 0 ? 'text-blue-600 font-bold' : ''}`}
          >
            0L
          </button>
          <button
            type="button"
            onClick={() => onSalaryChange(3, null)}
            className={`hover:text-blue-600 transition-colors ${minSalary === 3 ? 'text-blue-600 font-bold' : ''}`}
          >
            3L
          </button>
          <button
            type="button"
            onClick={() => onSalaryChange(6, null)}
            className={`hover:text-blue-600 transition-colors ${minSalary === 6 ? 'text-blue-600 font-bold' : ''}`}
          >
            6L
          </button>
          <button
            type="button"
            onClick={() => onSalaryChange(10, null)}
            className={`hover:text-blue-600 transition-colors ${minSalary === 10 ? 'text-blue-600 font-bold' : ''}`}
          >
            10L
          </button>
          <button
            type="button"
            onClick={() => onSalaryChange(15, null)}
            className={`hover:text-blue-600 transition-colors ${minSalary >= 15 ? 'text-blue-600 font-bold' : ''}`}
          >
            15L+
          </button>
        </div>
      </div>

      {/* Preset Range Pills (0-3L, 3-6L, 6-10L, 10L+) */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block">
          Quick Range Brackets:
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {SALARY_PRESET_RANGES.map((preset) => {
            const isSelected =
              activePreset?.label === preset.label ||
              (preset.min === minSalary && preset.max === maxSalary);

            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={`px-2.5 py-1.5 text-[11px] rounded-xl font-medium border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold shadow-2xs ring-1 ring-blue-500/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Undisclosed Salaries Checkbox */}
      <div className="pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 hover:text-slate-900 group">
          <input
            type="checkbox"
            checked={includeUndisclosed}
            onChange={(e) => onIncludeUndisclosedChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600"
          />
          <span className="text-[11px] text-slate-600 group-hover:text-slate-800">
            Include &quot;Best in Industry&quot; listings
          </span>
        </label>
      </div>
    </div>
  );
};
