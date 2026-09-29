import React, { useState, useEffect, useMemo } from 'react';
import { Category } from '../types/database.types';
import { categoriesService } from '../services/supabaseService';
import { toSlug } from '../utils/slugUtils';
import { 
  Layers, Code2, Database, CheckSquare, Cloud, 
  Briefcase, ArrowRight, Sparkles, Search, SlidersHorizontal,
  BarChart3, Headphones, LineChart, ShieldCheck, Laptop, GraduationCap
} from 'lucide-react';

interface CategoriesPageProps {
  onNavigate: (path: string) => void;
}

interface CategoryWithCount extends Category {
  activeJobsCount: number;
  slug: string;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({ onNavigate }) => {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortFilter, setSortFilter] = useState<'most_jobs' | 'recently_added'>('most_jobs');

  useEffect(() => {
    // Set dynamic SEO tags
    document.title = 'Job Categories & Disciplines | Mana Naukari';
    const metaDescEl = document.querySelector('meta[name="description"]');
    if (metaDescEl) {
      metaDescEl.setAttribute(
        'content',
        'Browse engineering, analytics, fresher, and internship job openings categorized by technical discipline across India. Verified direct company links.'
      );
    }

    const fetchCategories = async () => {
      setLoading(true);
      const { data } = await categoriesService.getWithJobCounts();
      setCategories(data || []);
      setLoading(false);
    };

    fetchCategories();
  }, []);

  // Icon mapper
  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('software') || lower.includes('developer') || lower.includes('engineer') || lower.includes('frontend') || lower.includes('backend')) {
      return <Code2 className="w-5 h-5 text-blue-600" />;
    }
    if (lower.includes('data') || lower.includes('analytics') || lower.includes('ai') || lower.includes('machine learning')) {
      return <Database className="w-5 h-5 text-blue-600" />;
    }
    if (lower.includes('business') || lower.includes('product') || lower.includes('consulting')) {
      return <LineChart className="w-5 h-5 text-blue-600" />;
    }
    if (lower.includes('qa') || lower.includes('test') || lower.includes('quality')) {
      return <CheckSquare className="w-5 h-5 text-blue-600" />;
    }
    if (lower.includes('cloud') || lower.includes('devops') || lower.includes('infra')) {
      return <Cloud className="w-5 h-5 text-blue-600" />;
    }
    if (lower.includes('support') || lower.includes('customer') || lower.includes('bpo')) {
      return <Headphones className="w-5 h-5 text-blue-600" />;
    }
    if (lower.includes('intern') || lower.includes('fresher') || lower.includes('graduate')) {
      return <GraduationCap className="w-5 h-5 text-blue-600" />;
    }
    if (lower.includes('remote') || lower.includes('work from home') || lower.includes('wfh')) {
      return <Laptop className="w-5 h-5 text-blue-600" />;
    }
    return <Briefcase className="w-5 h-5 text-blue-600" />;
  };

  // Filter & Sort
  const processedCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        if (!searchQuery.trim()) return true;
        return cat.category_name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      })
      .sort((a, b) => {
        if (sortFilter === 'most_jobs') {
          return b.activeJobsCount - a.activeJobsCount;
        }
        // recently_added
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [categories, searchQuery, sortFilter]);

  return (
    <div className="space-y-10 animate-fadeIn pb-16 max-w-6xl mx-auto">
      
      {/* Header Banner */}
      <div className="text-center space-y-3 pt-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold font-display">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Technical Disciplines & Domain Specializations</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-slate-900 tracking-tight leading-tight">
          Browse Jobs by Category
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Discover verified engineering, data, testing, and fresher opportunities sorted by professional domain.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Category Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories (e.g. Software, Data)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
          />
        </div>

        {/* Filter Pills / Tabs */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline mr-1">Sort by:</span>
          <button
            onClick={() => setSortFilter('most_jobs')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              sortFilter === 'most_jobs'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Most Jobs
          </button>
          <button
            onClick={() => setSortFilter('recently_added')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              sortFilter === 'recently_added'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Recently Added
          </button>
        </div>

      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-white rounded-3xl border border-slate-200 animate-pulse p-6" />
          ))}
        </div>
      ) : processedCategories.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-base font-display">
              No Categories Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No categories match "${searchQuery}". Clear your search to view all categories.`
                : 'Categories will appear here once added in the database.'}
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {processedCategories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onNavigate(`/categories/${cat.slug || toSlug(cat.category_name)}`)}
              className="group bg-white rounded-3xl border border-slate-200/90 p-6 text-left shadow-xs hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                    {React.cloneElement(getCategoryIcon(cat.category_name), {
                      className: 'w-6 h-6 text-blue-600 group-hover:text-white transition-colors',
                    })}
                  </div>

                  <span className="text-xs font-bold text-slate-700 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-700 px-2.5 py-1 rounded-lg transition-colors tabular-nums">
                    {cat.activeJobsCount} {cat.activeJobsCount === 1 ? 'Job' : 'Jobs'}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-lg font-display tracking-tight">
                    {cat.category_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Verified positions with direct official company application forms.
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                <span>View Jobs</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Trust Guarantee */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bold text-slate-900 text-sm font-display">
              Looking for Off-Campus Fresher Drives?
            </h4>
            <p className="text-xs text-slate-500">
              All categories feature verified postings with zero candidate application charges.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/jobs')}
          className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          View All Active Jobs
        </button>
      </div>

    </div>
  );
};
