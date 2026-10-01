import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, MapPin, Briefcase, Sparkles, ShieldCheck,
  CheckCircle2, ArrowRight, Building2, Laptop, GraduationCap,
  TrendingUp, Users, Award, Star, Compass, Check
} from 'lucide-react';

interface HeroSectionProps {
  onSearch: (keyword: string, location: string) => void;
  onSelectCategory?: (category: string) => void;
  onNavigate: (path: string) => void;
  activeJobsCount?: number;
  companiesCount?: number;
  companies?: string[];
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearch,
  onSelectCategory,
  onNavigate,
  activeJobsCount = 0,
  companiesCount = 0,
  companies = [],
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
    { label: 'Bengaluru Jobs', query: '', location: 'Bengaluru' },
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
    <section className="relative overflow-hidden pt-4 pb-12 sm:pt-10 sm:pb-16">
      {/* Background Animated Gradient Mesh & Subtle Grid */}
      <div className="absolute inset-0 bg-mesh-glow pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none -z-10" />
      
      {/* Ambient glowing radial orbs */}
      <div className="absolute -top-24 left-1/4 w-[600px] h-[350px] bg-gradient-to-tr from-blue-500/15 via-indigo-500/15 to-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-glow" />
      <div className="absolute top-1/2 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-float" />

      {/* Main Split-Screen Hero Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Headline, Search & Filters (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Top Trust Island Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-2xs backdrop-blur-md text-xs font-semibold text-slate-800"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-blue-600 font-bold uppercase tracking-wider text-[11px]">2026 Edition</span>
              <span className="text-slate-300">·</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>India&apos;s Verified Freshers &amp; Career Discovery Portal</span>
            </motion.div>

            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-4"
            >
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-display text-slate-900 tracking-tight leading-[1.12]">
                Your Career Starts Here.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500">
                  Verified Tech Jobs &amp; Internships.
                </span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed font-normal max-w-xl">
                Discover genuine openings for freshers, college graduates, and remote engineers directly from verified employers. Zero spam, zero middleman fees.
              </p>
            </motion.div>

            {/* Glowing Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <form
                onSubmit={handleSubmit}
                className="bg-white/95 rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 search-glow border border-slate-200/90 flex flex-col sm:flex-row items-center gap-2"
              >
                {/* Job Title / Keyword Input */}
                <div className="relative flex-1 w-full flex items-center">
                  <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Job title, skills (e.g. React, Java, Trainee), or company..."
                    className="w-full pl-10 pr-3 py-3 text-xs sm:text-sm bg-transparent rounded-xl focus:outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                  />
                </div>

                <div className="hidden sm:block w-px h-8 bg-slate-200" />

                {/* Location Input */}
                <div className="relative w-full sm:w-48 flex items-center">
                  <MapPin className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Location or Remote"
                    className="w-full pl-10 pr-3 py-3 text-xs sm:text-sm bg-transparent rounded-xl focus:outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                  />
                </div>

                {/* Search Button with Glow */}
                <button
                  type="submit"
                  className="w-full sm:w-auto px-7 py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0 btn-glow"
                >
                  <span>Search Jobs</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>

            {/* Quick Explore Categories */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center gap-2 pt-1"
            >
              <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">Explore:</span>
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50/80 text-slate-700 hover:text-blue-600 border border-slate-200/90 text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer btn-interactive"
                >
                  <span className="text-blue-600">{filter.icon}</span>
                  <span>{filter.label}</span>
                </button>
              ))}
            </motion.div>

            {/* Popular Searches */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1"
            >
              <span className="font-semibold text-slate-700">Trending:</span>
              {popularSearches.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSearch(item.query, item.location || '')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 hover:border-blue-200 border border-transparent transition-all cursor-pointer text-[11px] font-medium"
                >
                  {item.label}
                </button>
              ))}
            </motion.div>

          </div>

          {/* Right Column: High-End Professional Image & Floating Badges (5 Cols) */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            
            {/* Ambient Backlight Behind Image */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-teal-500/20 rounded-3xl blur-2xl -z-10 pointer-events-none" />

            {/* Professional Image Container with 4 Floating Cards */}
            <div className="relative w-full max-w-lg mx-auto py-6 sm:py-8">
              
              {/* Main Image Frame (border-radius: 32px, subtle shadow, object-cover, object-position: center) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="relative w-full rounded-[32px] overflow-hidden shadow-xl border-4 border-white/95 bg-white ring-1 ring-slate-900/5 group"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-50 relative rounded-[28px]">
                  <img
                    src="/assets/images/hero-female-engineer.jpg"
                    alt="Young Indian female software engineer working on a laptop applying for jobs in a bright modern office"
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-103"
                    loading="eager"
                    referrerPolicy="no-referrer"
                  />

                  {/* Clean Bottom Glassmorphism Brand Bar */}
                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 p-3 sm:p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-white/80 shadow-md flex items-center justify-between text-left">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-600 font-display">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Find Jobs. Apply Online. Start Career.</span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-slate-900 font-display">
                        Connect Directly With Hiring Teams
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/80 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>100% Free</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Card 1: Verified Jobs (Top-Left) */}
              <motion.div
                initial={{ opacity: 0, y: -15, x: -15 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                whileHover={{ scale: 1.05, y: -3 }}
                className="absolute -top-3 -left-3 sm:-top-5 sm:-left-6 hidden sm:flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-lg animate-float z-20 text-left cursor-default transition-all"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs border border-blue-100 shadow-2xs shrink-0">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Verified Jobs</span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase border border-emerald-200/70">
                      100%
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Official HR Links · Zero Spam</div>
                </div>
              </motion.div>

              {/* Floating Card 2: Internship Opportunities (Top-Right) */}
              <motion.div
                initial={{ opacity: 0, y: -15, x: 15 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
                whileHover={{ scale: 1.05, y: -3 }}
                className="absolute -top-3 -right-3 sm:-top-5 sm:-right-6 hidden sm:flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-lg animate-float-reverse z-20 text-left cursor-default transition-all"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-600 font-bold flex items-center justify-center text-xs border border-purple-100 shadow-2xs shrink-0">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Internship Opportunities</span>
                    <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md uppercase border border-purple-200/70">
                      Stipend
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Students &amp; Freshers</div>
                </div>
              </motion.div>

              {/* Floating Card 3: Work From Home (Bottom-Left) */}
              <motion.div
                initial={{ opacity: 0, y: 15, x: -15 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.7, delay: 0.45 }}
                whileHover={{ scale: 1.05, y: -3 }}
                className="absolute -bottom-3 -left-3 sm:-bottom-5 sm:-left-6 hidden sm:flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-lg animate-float z-20 text-left cursor-default transition-all"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-50 text-teal-600 font-bold flex items-center justify-center text-xs border border-teal-100 shadow-2xs shrink-0">
                  <Laptop className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Work From Home</span>
                    <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md uppercase border border-teal-200/70">
                      Remote
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Pan-India Flexibility</div>
                </div>
              </motion.div>

              {/* Floating Card 4: Direct Company Hiring (Bottom-Right) */}
              <motion.div
                initial={{ opacity: 0, y: 15, x: 15 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.7, delay: 0.55 }}
                whileHover={{ scale: 1.05, y: -3 }}
                className="absolute -bottom-3 -right-3 sm:-bottom-5 sm:-right-6 hidden sm:flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-lg animate-float-reverse z-20 text-left cursor-default transition-all"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs border border-indigo-100 shadow-2xs shrink-0">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Direct Company Hiring</span>
                    <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase border border-indigo-200/70">
                      Zero Fees
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Verified HR &amp; Career Portals</div>
                </div>
              </motion.div>

            </div>

            {/* Mobile-Only Badges Grid (4 Cards neatly placed on small screens) */}
            <div className="grid grid-cols-2 gap-2 mt-4 sm:hidden w-full">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-left">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-900 truncate">Verified Jobs</div>
                  <div className="text-[9px] text-slate-500 truncate">Official HR Links</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-left">
                <GraduationCap className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-900 truncate">Internship Openings</div>
                  <div className="text-[9px] text-slate-500 truncate">Paid Opportunities</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-left">
                <Laptop className="w-4 h-4 text-teal-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-900 truncate">Work From Home</div>
                  <div className="text-[9px] text-slate-500 truncate">Remote Across India</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-left">
                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-900 truncate">Direct Company Hiring</div>
                  <div className="text-[9px] text-slate-500 truncate">Zero Agency Fees</div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Real Companies Section Marquee Strip or Authentic Trust Badge */}
        {companies && companies.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-14 pt-8 border-t border-slate-200/60 text-center"
          >
            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Companies Actively Hiring on Mana Naukari
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {companies.slice(0, 8).map((company, i) => {
                const initials = company
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'CO';

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onNavigate(`/jobs?q=${encodeURIComponent(company)}`)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-blue-300 hover:text-blue-600 transition-all cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                      {initials}
                    </div>
                    <span className="text-xs font-bold text-slate-800">{company}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-14 pt-6 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-500"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Verified Corporate Links</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Direct HR &amp; Official ATS Requisitions</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Tailored for Freshers &amp; Tech Professionals</span>
            </div>
          </motion.div>
        )}

      </div>
    </section>
  );
};
