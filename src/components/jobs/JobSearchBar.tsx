import React, { useState } from 'react';
import { Search, MapPin, X, ArrowRight } from 'lucide-react';

interface JobSearchBarProps {
  initialKeyword?: string;
  initialLocation?: string;
  onSearch: (keyword: string, location: string) => void;
}

export const JobSearchBar: React.FC<JobSearchBarProps> = ({
  initialKeyword = '',
  initialLocation = '',
  onSearch,
}) => {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [location, setLocation] = useState(initialLocation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(keyword.trim(), location.trim());
  };

  const handleClear = () => {
    setKeyword('');
    setLocation('');
    onSearch('', '');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/95 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl border border-slate-200/90 search-glow flex flex-col md:flex-row items-stretch md:items-center gap-2"
    >
      {/* 1. Keyword search */}
      <div className="relative flex-1 flex items-center">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Job title, skills (e.g. React, Java, Trainee), or company..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none font-medium"
        />
        {keyword && (
          <button
            type="button"
            onClick={() => setKeyword('')}
            className="p-1 text-slate-300 hover:text-slate-600 mr-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="hidden md:block w-px h-8 bg-slate-200" />

      {/* 2. Location search */}
      <div className="relative flex-1 flex items-center">
        <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          placeholder="City, state, or 'Work From Home'..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none font-medium"
        />
        {location && (
          <button
            type="button"
            onClick={() => setLocation('')}
            className="p-1 text-slate-300 hover:text-slate-600 mr-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3. Search action button */}
      <div className="flex items-center gap-2 pt-1 md:pt-0">
        <button
          type="submit"
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 rounded-xl sm:rounded-2xl transition-all shadow-xs hover:shadow-md cursor-pointer whitespace-nowrap btn-glow"
        >
          <span>Find Jobs</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
