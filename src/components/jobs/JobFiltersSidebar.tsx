import React, { useState, useMemo } from 'react';
import { Category } from '../../types/database.types';
import { SalaryRangeSlider } from './SalaryRangeSlider';
import { 
  Filter, X, RotateCcw, Check, Briefcase, MapPin, 
  Layers, GraduationCap, Search, ChevronDown, ChevronUp 
} from 'lucide-react';

export interface FilterJobTypeOption {
  key: string;
  label: string;
  badge?: string;
}

export interface FilterLocationOption {
  key: string;
  label: string;
  isPopular?: boolean;
}

export const PRESET_JOB_TYPES: FilterJobTypeOption[] = [
  { key: 'Full Time', label: 'Full-time' },
  { key: 'Internship', label: 'Internship', badge: 'Popular' },
  { key: 'WFH', label: 'Work From Home (WFH)', badge: 'Remote' },
  { key: 'Fresher', label: 'Fresher / Entry-Level' },
  { key: 'Contract', label: 'Contract / Part-time' },
];

export const PRESET_LOCATIONS: FilterLocationOption[] = [
  { key: 'Remote', label: 'Work From Home / Remote', isPopular: true },
  { key: 'Bengaluru', label: 'Bengaluru / Bangalore', isPopular: true },
  { key: 'Hyderabad', label: 'Hyderabad', isPopular: true },
  { key: 'Pune', label: 'Pune', isPopular: true },
  { key: 'Delhi NCR', label: 'Delhi NCR (Gurgaon / Noida)', isPopular: true },
  { key: 'Mumbai', label: 'Mumbai', isPopular: true },
  { key: 'Chennai', label: 'Chennai', isPopular: true },
];

interface JobFiltersSidebarProps {
  categories: Category[];
  selectedCategory: string;
  selectedJobTypes: string[];
  selectedLocations: string[];
  selectedExperience: string;
  onCategoryChange: (cat: string) => void;
  onJobTypeToggle: (typeKey: string) => void;
  onLocationToggle: (locKey: string) => void;
  onExperienceChange: (exp: string) => void;
  onResetFilters: () => void;
  onClearJobTypes?: () => void;
  onClearLocations?: () => void;
  isMobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
  totalFilteredCount: number;
  jobCountsByType?: Record<string, number>;
  jobCountsByLocation?: Record<string, number>;
  extraLocations?: string[];
  // Salary Range Slider Props
  minSalary?: number;
  maxSalary?: number | null;
  includeUndisclosedSalary?: boolean;
  onSalaryChange?: (min: number, max: number | null) => void;
  onIncludeUndisclosedChange?: (include: boolean) => void;
  onResetSalary?: () => void;
  salaryMatchCount?: number;
}

export const JobFiltersSidebar: React.FC<JobFiltersSidebarProps> = ({
  categories,
  selectedCategory,
  selectedJobTypes,
  selectedLocations,
  selectedExperience,
  onCategoryChange,
  onJobTypeToggle,
  onLocationToggle,
  onExperienceChange,
  onResetFilters,
  onClearJobTypes,
  onClearLocations,
  isMobileDrawerOpen,
  onCloseMobileDrawer,
  totalFilteredCount,
  jobCountsByType = {},
  jobCountsByLocation = {},
  extraLocations = [],
  minSalary = 0,
  maxSalary = null,
  includeUndisclosedSalary = true,
  onSalaryChange,
  onIncludeUndisclosedChange,
  onResetSalary,
  salaryMatchCount,
}) => {
  const [locationSearch, setLocationSearch] = useState('');
  const [showAllLocations, setShowAllLocations] = useState(false);

  const experienceBands = ['All', 'Fresher', '0-1 Years', '1-3 Years', 'Any'];

  // Calculate active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'All') count++;
    count += selectedJobTypes.length;
    count += selectedLocations.length;
    if (selectedExperience !== 'All') count++;
    if (minSalary > 0 || (maxSalary !== null && maxSalary < 15)) count++;
    return count;
  }, [selectedCategory, selectedJobTypes, selectedLocations, selectedExperience, minSalary, maxSalary]);

  // Combined locations list (presets + any extra detected in current active jobs)
  const combinedLocations = useMemo(() => {
    const list: FilterLocationOption[] = [...PRESET_LOCATIONS];
    
    // Add any unique extra location from active jobs if not already included
    extraLocations.forEach((loc) => {
      const trimmed = loc.trim();
      if (!trimmed) return;
      const exists = list.some(
        (item) => item.key.toLowerCase() === trimmed.toLowerCase() || 
                  item.label.toLowerCase().includes(trimmed.toLowerCase())
      );
      if (!exists && !['remote', 'wfh'].includes(trimmed.toLowerCase())) {
        list.push({ key: trimmed, label: trimmed });
      }
    });

    return list;
  }, [extraLocations]);

  // Filtered locations based on search box
  const filteredLocations = useMemo(() => {
    if (!locationSearch.trim()) {
      return showAllLocations ? combinedLocations : combinedLocations.slice(0, 7);
    }
    const q = locationSearch.toLowerCase().trim();
    return combinedLocations.filter((loc) =>
      loc.label.toLowerCase().includes(q) || loc.key.toLowerCase().includes(q)
    );
  }, [combinedLocations, locationSearch, showAllLocations]);

  const filterContent = (
    <div className="space-y-6">
      
      {/* 1. Header with Active Count & Reset All */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-display text-slate-900 tracking-tight">
              Filters
            </h2>
          </div>
          {activeFiltersCount > 0 ? (
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
              {activeFiltersCount} active
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {totalFilteredCount} jobs
            </span>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            title="Reset all applied filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* 2. Job Type Section (Checkboxes for Full-time, Internship, WFH, etc.) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-display">
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            <span>Job Type</span>
          </label>
          {selectedJobTypes.length > 0 && onClearJobTypes && (
            <button
              onClick={onClearJobTypes}
              className="text-[11px] font-medium text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-1.5" role="group" aria-label="Job Type filter options">
          {PRESET_JOB_TYPES.map((type) => {
            const isChecked = selectedJobTypes.includes(type.key);
            const count = jobCountsByType[type.key] ?? 0;

            return (
              <label
                key={type.key}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                  isChecked
                    ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-semibold shadow-2xs'
                    : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200 text-slate-700 font-normal'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Custom Checkbox */}
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                      isChecked
                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                        : 'border-slate-300 bg-white group-hover:border-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isChecked}
                      onChange={() => onJobTypeToggle(type.key)}
                      aria-label={type.label}
                    />
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <span className="truncate">{type.label}</span>

                  {type.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                      {type.badge}
                    </span>
                  )}
                </div>

                {count > 0 && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-1.5 ${
                      isChecked
                        ? 'bg-blue-200/80 text-blue-800 font-bold'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/80'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* 3. Salary Range Slider Section */}
      {onSalaryChange && (
        <SalaryRangeSlider
          minSalary={minSalary}
          maxSalary={maxSalary}
          includeUndisclosed={includeUndisclosedSalary}
          onSalaryChange={onSalaryChange}
          onIncludeUndisclosedChange={onIncludeUndisclosedChange || (() => {})}
          onResetSalary={onResetSalary || (() => onSalaryChange(0, null))}
          salaryMatchCount={salaryMatchCount}
        />
      )}

      {/* 4. Location Section (Checkboxes for WFH, Bengaluru, Hyderabad, Pune, etc.) */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-display">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>Location</span>
          </label>
          {selectedLocations.length > 0 && onClearLocations && (
            <button
              onClick={onClearLocations}
              className="text-[11px] font-medium text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Location Quick Search Filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search city or state..."
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors text-slate-800 placeholder:text-slate-400"
          />
          {locationSearch && (
            <button
              onClick={() => setLocationSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear location search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Location Checkbox List */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1" role="group" aria-label="Location filter options">
          {filteredLocations.length === 0 ? (
            <div className="text-center py-3 text-xs text-slate-400">
              No matching locations found
            </div>
          ) : (
            filteredLocations.map((loc) => {
              const isChecked = selectedLocations.includes(loc.key);
              const count = jobCountsByLocation[loc.key] ?? 0;

              return (
                <label
                  key={loc.key}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                    isChecked
                      ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-semibold shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200 text-slate-700 font-normal'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Custom Checkbox */}
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        isChecked
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'border-slate-300 bg-white group-hover:border-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isChecked}
                        onChange={() => onLocationToggle(loc.key)}
                        aria-label={loc.label}
                      />
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <span className="truncate">{loc.label}</span>
                  </div>

                  {count > 0 && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-1.5 ${
                        isChecked
                          ? 'bg-blue-200/80 text-blue-800 font-bold'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/80'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>

        {/* Show More / Fewer Locations toggle if long list */}
        {!locationSearch && combinedLocations.length > 7 && (
          <button
            onClick={() => setShowAllLocations(!showAllLocations)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 pt-1 cursor-pointer transition-colors"
          >
            <span>{showAllLocations ? 'Show fewer cities' : `+${combinedLocations.length - 7} more locations`}</span>
            {showAllLocations ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* 4. Category Filter Section */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-display">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Category</span>
        </label>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          <button
            onClick={() => onCategoryChange('All')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
            }`}
          >
            <span>All Categories</span>
            {selectedCategory === 'All' && <Check className="w-3.5 h-3.5 text-blue-600" />}
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.category_name;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.category_name)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <span className="truncate">{cat.category_name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Experience Level Section */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-display">
          <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
          <span>Experience Level</span>
        </label>
        <div className="space-y-1">
          {experienceBands.map((exp) => {
            const isSelected = selectedExperience === exp;
            return (
              <button
                key={exp}
                onClick={() => onExperienceChange(exp)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <span>{exp === 'All' ? 'Any Experience' : exp}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
          {filterContent}
        </div>
      </aside>

      {/* Mobile Filter Drawer (Slide over) */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden overflow-hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobileDrawer}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-sm bg-white p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-base text-slate-900 font-display">Filter Jobs</span>
                  </div>
                  <button
                    onClick={onCloseMobileDrawer}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    aria-label="Close filters drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {filterContent}
              </div>

              {/* Sticky bottom Apply & View Jobs CTA */}
              <div className="pt-5 border-t border-slate-100 mt-6 sticky bottom-0 bg-white">
                <button
                  onClick={onCloseMobileDrawer}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Show {totalFilteredCount} Matching Jobs</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
