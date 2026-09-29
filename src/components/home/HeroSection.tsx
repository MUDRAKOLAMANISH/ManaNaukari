import React, { useState } from 'react';
import {
  Search, MapPin, Briefcase, Sparkles, ShieldCheck,
  CheckCircle2, ArrowRight, Building2, Laptop, GraduationCap
} from 'lucide-react';

interface HeroSectionProps {
  onSearch: (keyword: string, location: string) => void;
  onSelectCategory?: (category: string) => void;
  onNavigate: (path: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearch,
  onSelectCategory,
  onNavigate,
}) => {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(keyword.trim(), location.trim());
  };

  const popularSearches = [
    { label: 'Frontend Developer', query: 'Frontend' },
    { label: 'Java Fresher', query: 'Java' },
    { label: 'WFH Intern', query: 'Intern', location: 'Remote' },
    { label: 'Data Analyst', query: 'Data' },
    { label: 'Bangalore Jobs', query: '', location: 'Bangalore' },
    { label: 'Hyderabad Jobs', query: '', location: 'Hyderabad' },
  ];

  const quickCategoryFilters = [
    { label: 'All Jobs', path: '/jobs', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { label: 'Internships', path: '/jobs?type=Internship', icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { label: 'Work From Home', path: '/jobs?location=Remote', icon: <Laptop className="w-3.5 h-3.5" /> },
    { label: 'Software Engineering', category: 'Software Engineering', icon: <Building2 className="w-3.5 h-3.5" /> },
    { label: 'Data & Analytics', category: 'Data & Analytics', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  return (
    <section className="relative pt-6 pb-12 sm:pt-12 sm:pb-16 text-center space-y-7 max-w-4xl mx-auto animate-fadeIn">
      {/* Top Trust Island Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-2xs">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
        <span>India&apos;s Verified Freshers &amp; Career Discovery Portal</span>
      </div>

      {/* Main Headline & Subheading */}
      <div className="space-y-3.5">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display text-slate-900 tracking-tight leading-[1.12] text-balance">
          Find Genuine Jobs, Internships &amp;{' '}
          <span className="text-blue-600">Career Opportunities</span>
        </h1>

        <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal text-balance">
          Discover freshers jobs, internships, work-from-home opportunities and career services all in one place.
        </p>
      </div>

      {/* Modern Search Bar */}
      <div className="pt-2 max-w-3xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-2 sm:p-2.5 shadow-md border border-slate-200/90 flex flex-col sm:flex-row items-center gap-2 transition-all hover:border-blue-300"
        >
          {/* Job Title / Keyword Input */}
          <div className="relative flex-1 w-full flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Job title, skills, or company (e.g. React, Java, TCS)"
              className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-transparent rounded-xl focus:outline-none text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="hidden sm:block w-px h-8 bg-slate-200" />

          {/* Location Input */}
          <div className="relative w-full sm:w-56 flex items-center">
            <MapPin className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location or Remote"
              className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-transparent rounded-xl focus:outline-none text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Search Button (Orange / Professional CTA) */}
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs sm:text-sm transition-all duration-150 shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <span>Search Jobs</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Quick Category Filters */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <span className="text-xs font-semibold text-slate-500 mr-1 hidden sm:inline">Filter by:</span>
        {quickCategoryFilters.map((filter, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (filter.category && onSelectCategory) {
                onSelectCategory(filter.category);
              } else if (filter.path) {
                onNavigate(filter.path);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/90 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <span className="text-blue-600">{filter.icon}</span>
            <span>{filter.label}</span>
          </button>
        ))}
      </div>

      {/* Popular Searches */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">Popular Searches:</span>
        {popularSearches.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSearch(item.query, item.location || '')}
            className="px-2.5 py-1 rounded-lg bg-slate-100/90 hover:bg-blue-50 text-slate-600 hover:text-blue-600 hover:border-blue-200 border border-transparent transition-colors cursor-pointer text-[11px] font-medium"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Requirement 12: Trust Elements Strip */}
      <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-left">
        {/* Badge 1: Verified Jobs Badge */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 font-display">
              Verified Jobs Badge
            </div>
            <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
              100% genuine career postings
            </div>
          </div>
        </div>

        {/* Badge 2: Verified Recruiter Badge */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 font-display">
              Verified Recruiter Badge
            </div>
            <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
              Official corporate HR emails only
            </div>
          </div>
        </div>

        {/* Badge 3: Official Career Link Badge */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 font-display">
              Official Career Link Badge
            </div>
            <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
              Direct company links • No fees
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
