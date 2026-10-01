import React, { useState, useEffect } from 'react';
import { Job, Category } from '../types/database.types';
import { jobsService, categoriesService } from '../services/supabaseService';
import { JobCard } from '../components/jobs/JobCard';
import { JobCardSkeleton } from '../components/jobs/JobCardSkeleton';
import { toSlug } from '../utils/slugUtils';
import { generateJobUrlPath, getAbsoluteJobUrl } from '../utils/jobUrlUtils';
import { Toast } from '../components/common/Toast';
import { analyticsTracker } from '../services/analyticsTracker';
import { 
  ArrowLeft, Briefcase, Layers, Sparkles, Filter, 
  Search, AlertCircle, Building2, MapPin, ChevronRight, Tag
} from 'lucide-react';

interface CategoryDetailsPageProps {
  categorySlug: string;
  onNavigate: (path: string) => void;
}

export const CategoryDetailsPage: React.FC<CategoryDetailsPageProps> = ({
  categorySlug,
  onNavigate,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSort, setFilterSort] = useState<'recent' | 'company'>('recent');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCopyJobLink = (job: Job) => {
    const fullUrl = getAbsoluteJobUrl(generateJobUrlPath(job));
    const showSuccess = () => {
      setToastMessage('Job link copied successfully.');
      setTimeout(() => setToastMessage(null), 3000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl).then(showSuccess).catch(() => {
        const input = document.createElement('input');
        input.value = fullUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showSuccess();
      });
    } else {
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showSuccess();
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadCategoryData = async () => {
      setLoading(true);
      try {
        // 1. Fetch categories to find matching canonical name from the slug
        const { data: catList } = await categoriesService.getAll();
        if (!isMounted) return;

        let matchedCatName = '';
        if (catList && catList.length > 0) {
          setCategories(catList);
          const matched = catList.find((c) => toSlug(c.category_name) === categorySlug.toLowerCase());
          if (matched) {
            matchedCatName = matched.category_name;
          }
        }

        // Fallback name reconstruction if not found in categories table
        if (!matchedCatName) {
          matchedCatName = categorySlug
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        }
        setCategoryName(matchedCatName);

        // Telemetry tracking
        analyticsTracker.trackPageView({
          page_name: `Category: ${matchedCatName}`,
          page_url: window.location.href,
          page_type: 'category_details',
        });

        // 2. Set dynamic document title and meta description for SEO
        document.title = `${matchedCatName} Jobs | Verified Vacancies | Mana Naukari`;
        const metaDescEl = document.querySelector('meta[name="description"]');
        if (metaDescEl) {
          metaDescEl.setAttribute(
            'content',
            `Explore active ${matchedCatName} jobs, internships, and off-campus fresher drives across India. Apply directly on official employer portals.`
          );
        }

        // 3. Query jobs belonging to that category
        const { data: jobsData } = await jobsService.getAll({
          category: matchedCatName,
          status: 'active',
          limit: 60,
        });

        if (isMounted) {
          setJobs(jobsData || []);
        }
      } catch (err) {
        console.error('Error loading category details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (categorySlug) {
      loadCategoryData();
    }

    return () => {
      isMounted = false;
    };
  }, [categorySlug]);

  // Filter & Sort
  const filteredJobs = jobs.filter((j) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      j.title.toLowerCase().includes(query) ||
      j.company.toLowerCase().includes(query) ||
      (j.location && j.location.toLowerCase().includes(query))
    );
  }).sort((a, b) => {
    if (filterSort === 'company') {
      return a.company.localeCompare(b.company);
    }
    // Default: 'recent'
    return new Date(b.posted_date || b.created_at).getTime() - new Date(a.posted_date || a.created_at).getTime();
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-16">
      
      {/* Back Navigation & Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button
          onClick={() => onNavigate('/categories')}
          className="hover:text-blue-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Categories</span>
        </button>
        <span>/</span>
        <span className="text-slate-900 font-bold">{categoryName}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold font-display">
              <Tag className="w-3.5 h-3.5" />
              <span>Verified Category Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
              {categoryName} Jobs
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
              Browse genuine, active positions and internships in {categoryName} from top tech employers across India.
            </p>
          </div>

          <div className="bg-blue-50/80 border border-blue-100/90 rounded-2xl p-4 text-center shrink-0 min-w-[140px]">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-blue-700 tabular-nums">
              {loading ? (
                <span className="inline-block w-8 h-7 bg-blue-200/60 rounded animate-pulse" />
              ) : (
                jobs.length
              )}
            </div>
            <div className="text-xs font-bold text-slate-700 mt-0.5">
              Active Openings
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              100% Direct Links
            </div>
          </div>
        </div>

        {/* Quick Search & Sort Bar inside Category */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${categoryName} roles (e.g. React, Intern, Bangalore)...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterSort}
              onChange={(e) => setFilterSort(e.target.value as 'recent' | 'company')}
              className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="recent">Recently Added</option>
              <option value="company">Sort by Company</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs Listing */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <JobCardSkeleton />
            <JobCardSkeleton />
            <JobCardSkeleton />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base font-display">
                No Active Jobs Found in {categoryName}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery
                  ? `No jobs match "${searchQuery}" in this category. Try adjusting your query.`
                  : 'New verified job drives in this field will be published as soon as employers open requisitions.'}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('/jobs')}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
              >
                Browse All Jobs
              </button>
              <button
                onClick={() => onNavigate('/categories')}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Explore Other Categories
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onViewDetails={() => onNavigate(generateJobUrlPath(job))}
                onCopyLink={handleCopyJobLink}
              />
            ))}
          </div>
        )}
      </div>

      {/* Explore More Categories Footer Strip */}
      {categories.length > 0 && (
        <div className="pt-8 border-t border-slate-200/80 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display">
            Explore Other Tech Disciplines
          </h4>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter((c) => toSlug(c.category_name) !== categorySlug.toLowerCase())
              .slice(0, 8)
              .map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onNavigate(`/categories/${toSlug(cat.category_name)}`)}
                  className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-blue-50 border border-slate-200/90 text-slate-700 hover:text-blue-600 rounded-xl transition-colors cursor-pointer shadow-2xs"
                >
                  {cat.category_name}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Copy link toast feedback */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />

    </div>
  );
};
