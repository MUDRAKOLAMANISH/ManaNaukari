import React, { useState, useEffect, useMemo } from 'react';
import { Job, Category } from '../types/database.types';
import { jobsService, categoriesService } from '../services/supabaseService';
import { normalizeSkills } from '../utils/skillUtils';
import { jobMatchesSalaryFilter } from '../utils/salaryUtils';
import { JobCard } from '../components/jobs/JobCard';
import { JobCardSkeleton } from '../components/jobs/JobCardSkeleton';
import { JobFiltersSidebar } from '../components/jobs/JobFiltersSidebar';
import { JobSearchBar } from '../components/jobs/JobSearchBar';
import { generateJobUrlPath, getAbsoluteJobUrl } from '../utils/jobUrlUtils';
import { Toast } from '../components/common/Toast';
import { analyticsTracker } from '../services/analyticsTracker';
import { 
  Filter, Sparkles, SearchX, 
  ChevronLeft, ChevronRight, X, RotateCcw
} from 'lucide-react';

interface JobsPageProps {
  onNavigate: (path: string) => void;
}

export const JobsPage: React.FC<JobsPageProps> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [keyword, setKeyword] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Checkbox state arrays for multi-selection
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'featured'>('newest');

  // Salary range slider state (in Lakhs per annum)
  const [minSalary, setMinSalary] = useState<number>(0);
  const [maxSalary, setMaxSalary] = useState<number | null>(null);
  const [includeUndisclosedSalary, setIncludeUndisclosedSalary] = useState<boolean>(true);

  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const itemsPerPage = 8;

  // Handle Copy Link on JobCard
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

  // Read URL query params on mount (e.g. /jobs?category=Software+Engineering&type=Full+Time,Internship&location=Remote,Bengaluru)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    const typeParam = params.get('type');
    const locParam = params.get('location');
    const q = params.get('q');
    const locSearch = params.get('loc');

    const currentPath = window.location.pathname;
    if (currentPath === '/internships') {
      setSelectedJobTypes(['Internship']);
    } else if (currentPath === '/work-from-home' || currentPath === '/wfh') {
      setSelectedLocations(['Remote']);
    }

    if (cat) setSelectedCategory(cat);
    if (q) setKeyword(q);
    if (locSearch) setLocation(locSearch);

    if (typeParam) {
      const types = typeParam.split(',').map((t) => t.trim()).filter(Boolean);
      if (types.length > 0) {
        setSelectedJobTypes(types);
      }
    }

    if (locParam) {
      const locs = locParam.split(',').map((l) => l.trim()).filter(Boolean);
      if (locs.length > 0) {
        setSelectedLocations(locs);
      }
    }

    const minSalParam = params.get('minSalary') || params.get('salaryMin');
    const maxSalParam = params.get('maxSalary') || params.get('salaryMax');
    if (minSalParam && !isNaN(Number(minSalParam))) {
      setMinSalary(Number(minSalParam));
    }
    if (maxSalParam && !isNaN(Number(maxSalParam))) {
      setMaxSalary(Number(maxSalParam));
    }
  }, []);

  // Fetch data directly from Supabase
  useEffect(() => {
    let isMounted = true;

    // Record jobs listing / internships / WFH visitor telemetry
    const currentPath = window.location.pathname;
    let pageName = 'Jobs Page';
    if (currentPath === '/internships') {
      pageName = 'Internship Openings Page';
    } else if (currentPath === '/work-from-home' || currentPath === '/wfh') {
      pageName = 'Work From Home (Remote) Jobs Page';
    }

    analyticsTracker.trackPageView({
      page_name: pageName,
      page_url: window.location.href,
      page_type: 'jobs_listing',
    });

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [jobsRes, catsRes] = await Promise.all([
          jobsService.getAll({ status: 'active' }),
          categoriesService.getAll(),
        ]);

        if (isMounted) {
          if (jobsRes.error) {
            setError(jobsRes.error.message || 'Unable to retrieve jobs from database.');
          } else {
            setJobs(jobsRes.data || []);
          }

          if (catsRes.data) {
            setCategories(catsRes.data);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Connection failure to Supabase.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate real-time counts for all Job Types and Locations across active jobs
  const { jobCountsByType, jobCountsByLocation, extraLocations } = useMemo(() => {
    const typeCounts: Record<string, number> = {
      'Full Time': 0,
      'Internship': 0,
      'WFH': 0,
      'Fresher': 0,
      'Contract': 0,
    };

    const locCounts: Record<string, number> = {
      'Remote': 0,
      'Bengaluru': 0,
      'Hyderabad': 0,
      'Pune': 0,
      'Delhi NCR': 0,
      'Mumbai': 0,
      'Chennai': 0,
    };

    const extrasSet = new Set<string>();

    jobs.forEach((j) => {
      // 1. Job Types count
      if (j.job_type === 'Full Time') typeCounts['Full Time']++;
      if (j.job_type === 'Internship') typeCounts['Internship']++;

      const isRemoteOrWfh =
        j.location.toLowerCase().includes('remote') ||
        j.location.toLowerCase().includes('work from home') ||
        j.location.toLowerCase().includes('wfh') ||
        j.job_type?.toLowerCase().includes('wfh') ||
        j.job_type?.toLowerCase().includes('remote');

      if (isRemoteOrWfh) {
        typeCounts['WFH']++;
      }

      if (j.job_type === 'Fresher' || j.experience?.toLowerCase().includes('fresher')) {
        typeCounts['Fresher']++;
      }

      if (j.job_type === 'Contract' || j.job_type === 'Part Time') {
        typeCounts['Contract']++;
      }

      // 2. Locations count
      const locLower = (j.location || '').toLowerCase();
      if (locLower.includes('remote') || locLower.includes('work from home') || locLower.includes('wfh')) {
        locCounts['Remote']++;
      }
      if (locLower.includes('bengaluru') || locLower.includes('bangalore')) {
        locCounts['Bengaluru']++;
      }
      if (locLower.includes('hyderabad')) {
        locCounts['Hyderabad']++;
      }
      if (locLower.includes('pune')) {
        locCounts['Pune']++;
      }
      if (
        locLower.includes('delhi') ||
        locLower.includes('noida') ||
        locLower.includes('gurgaon') ||
        locLower.includes('gurugram')
      ) {
        locCounts['Delhi NCR']++;
      }
      if (locLower.includes('mumbai')) {
        locCounts['Mumbai']++;
      }
      if (locLower.includes('chennai')) {
        locCounts['Chennai']++;
      }

      // Collect primary city if not listed in presets
      const primaryCity = (j.location || '').split(',')[0]?.trim();
      if (
        primaryCity &&
        primaryCity.length > 2 &&
        !['remote', 'wfh', 'work from home', 'pan india', 'india'].includes(primaryCity.toLowerCase())
      ) {
        extrasSet.add(primaryCity);
      }
    });

    return {
      jobCountsByType: typeCounts,
      jobCountsByLocation: locCounts,
      extraLocations: Array.from(extrasSet),
    };
  }, [jobs]);

  // Filter & Search computation
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // 1. Keyword match in title, company, or skills
      if (keyword.trim()) {
        const term = keyword.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(term);
        const matchesCompany = job.company.toLowerCase().includes(term);
        const skillsList = normalizeSkills(job.skills_required);
        const matchesSkills = skillsList.some((s) => s.toLowerCase().includes(term));
        if (!matchesTitle && !matchesCompany && !matchesSkills) return false;
      }

      // 2. Location free text search from JobSearchBar
      if (location.trim()) {
        const locTerm = location.toLowerCase();
        if (!job.location.toLowerCase().includes(locTerm)) return false;
      }

      // 3. Category match
      if (selectedCategory !== 'All' && job.category !== selectedCategory) {
        return false;
      }

      // 4. Job Type Checkboxes match (OR logic between checked options)
      if (selectedJobTypes.length > 0) {
        const matchesAnyType = selectedJobTypes.some((typeKey) => {
          if (typeKey === 'Full Time') return job.job_type === 'Full Time';
          if (typeKey === 'Internship') return job.job_type === 'Internship';
          if (typeKey === 'WFH') {
            const locLower = (job.location || '').toLowerCase();
            const typeLower = (job.job_type || '').toLowerCase();
            return (
              locLower.includes('remote') ||
              locLower.includes('work from home') ||
              locLower.includes('wfh') ||
              typeLower.includes('remote') ||
              typeLower.includes('wfh')
            );
          }
          if (typeKey === 'Fresher') {
            return (
              job.job_type === 'Fresher' ||
              (job.experience || '').toLowerCase().includes('fresher')
            );
          }
          if (typeKey === 'Contract') {
            return job.job_type === 'Contract' || job.job_type === 'Part Time';
          }
          return job.job_type === typeKey;
        });

        if (!matchesAnyType) return false;
      }

      // 5. Location Checkboxes match (OR logic between checked options)
      if (selectedLocations.length > 0) {
        const locLower = (job.location || '').toLowerCase();
        const matchesAnyLocation = selectedLocations.some((locKey) => {
          if (locKey === 'Remote') {
            return (
              locLower.includes('remote') ||
              locLower.includes('work from home') ||
              locLower.includes('wfh')
            );
          }
          if (locKey === 'Bengaluru') {
            return locLower.includes('bengaluru') || locLower.includes('bangalore');
          }
          if (locKey === 'Hyderabad') {
            return locLower.includes('hyderabad');
          }
          if (locKey === 'Pune') {
            return locLower.includes('pune');
          }
          if (locKey === 'Delhi NCR') {
            return (
              locLower.includes('delhi') ||
              locLower.includes('noida') ||
              locLower.includes('gurgaon') ||
              locLower.includes('gurugram')
            );
          }
          if (locKey === 'Mumbai') {
            return locLower.includes('mumbai');
          }
          if (locKey === 'Chennai') {
            return locLower.includes('chennai');
          }
          return locLower.includes(locKey.toLowerCase());
        });

        if (!matchesAnyLocation) return false;
      }

      // 6. Experience match
      if (selectedExperience !== 'All') {
        if (selectedExperience === 'Fresher' && !job.experience?.toLowerCase().includes('fresher')) {
          return false;
        }
        if (selectedExperience !== 'Fresher' && job.experience !== selectedExperience) {
          return false;
        }
      }

      // 7. Annual Salary Range Slider match
      if (!jobMatchesSalaryFilter(job.salary, minSalary, maxSalary, includeUndisclosedSalary)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'featured') {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
      }
      return new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime();
    });
  }, [
    jobs,
    keyword,
    location,
    selectedCategory,
    selectedJobTypes,
    selectedLocations,
    selectedExperience,
    sortBy,
    minSalary,
    maxSalary,
    includeUndisclosedSalary,
  ]);

  // Real-time count of jobs matching only the salary criteria
  const salaryMatchCount = useMemo(() => {
    if (minSalary === 0 && (maxSalary === null || maxSalary >= 15)) {
      return undefined;
    }
    return jobs.filter((job) =>
      jobMatchesSalaryFilter(job.salary, minSalary, maxSalary, includeUndisclosedSalary)
    ).length;
  }, [jobs, minSalary, maxSalary, includeUndisclosedSalary]);

  // Checkbox toggle handlers
  const handleJobTypeToggle = (typeKey: string) => {
    setSelectedJobTypes((prev) =>
      prev.includes(typeKey) ? prev.filter((t) => t !== typeKey) : [...prev, typeKey]
    );
    setCurrentPage(1);
  };

  const handleLocationToggle = (locKey: string) => {
    setSelectedLocations((prev) =>
      prev.includes(locKey) ? prev.filter((l) => l !== locKey) : [...prev, locKey]
    );
    setCurrentPage(1);
  };

  const handleSalaryChange = (newMin: number, newMax: number | null) => {
    setMinSalary(newMin);
    setMaxSalary(newMax);
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage) || 1;
  const paginatedJobs = useMemo(() => {
    const from = (currentPage - 1) * itemsPerPage;
    return filteredJobs.slice(from, from + itemsPerPage);
  }, [filteredJobs, currentPage]);

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedJobTypes([]);
    setSelectedLocations([]);
    setSelectedExperience('All');
    setMinSalary(0);
    setMaxSalary(null);
    setKeyword('');
    setLocation('');
    setCurrentPage(1);
  };

  const handleSearch = (newKeyword: string, newLocation: string) => {
    setKeyword(newKeyword);
    setLocation(newLocation);
    setCurrentPage(1);
  };

  // Has active filters
  const isSalaryFilterActive = minSalary > 0 || (maxSalary !== null && maxSalary < 15);
  const hasActiveFilters =
    selectedCategory !== 'All' ||
    selectedJobTypes.length > 0 ||
    selectedLocations.length > 0 ||
    selectedExperience !== 'All' ||
    isSalaryFilterActive ||
    Boolean(keyword.trim()) ||
    Boolean(location.trim());

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* 1. Large SaaS Page Header & Search Bar */}
      <section className="bg-gradient-to-b from-blue-50/70 via-white to-transparent -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-8 pb-12 border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/80 text-blue-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct Official Company Vacancies</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 tracking-tight text-balance">
            Find Your Next Career Move in India
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Verified opportunities for freshers, campus graduates, and internship seekers. Zero middleman fees.
          </p>

          {/* Search Bar at Top */}
          <div className="pt-4 max-w-3xl mx-auto">
            <JobSearchBar
              initialKeyword={keyword}
              initialLocation={location}
              onSearch={handleSearch}
            />
          </div>
        </div>
      </section>

      {/* 2. Main Content Viewport: Sidebar + Job Stream */}
      <div className="flex flex-col lg:flex-row items-start gap-8">
        
        {/* Filter Sidebar (Desktop) + Mobile Drawer */}
        <JobFiltersSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          selectedJobTypes={selectedJobTypes}
          selectedLocations={selectedLocations}
          selectedExperience={selectedExperience}
          onCategoryChange={(cat) => {
            setSelectedCategory(cat);
            setCurrentPage(1);
          }}
          onJobTypeToggle={handleJobTypeToggle}
          onLocationToggle={handleLocationToggle}
          onClearJobTypes={() => {
            setSelectedJobTypes([]);
            setCurrentPage(1);
          }}
          onClearLocations={() => {
            setSelectedLocations([]);
            setCurrentPage(1);
          }}
          onExperienceChange={(exp) => {
            setSelectedExperience(exp);
            setCurrentPage(1);
          }}
          onResetFilters={handleResetFilters}
          isMobileDrawerOpen={isMobileDrawerOpen}
          onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
          totalFilteredCount={filteredJobs.length}
          jobCountsByType={jobCountsByType}
          jobCountsByLocation={jobCountsByLocation}
          extraLocations={extraLocations}
          minSalary={minSalary}
          maxSalary={maxSalary}
          includeUndisclosedSalary={includeUndisclosedSalary}
          onSalaryChange={handleSalaryChange}
          onIncludeUndisclosedChange={setIncludeUndisclosedSalary}
          onResetSalary={() => handleSalaryChange(0, null)}
          salaryMatchCount={salaryMatchCount}
        />

        {/* Main Job Stream */}
        <div className="flex-1 w-full space-y-4">
          
          {/* Top Results Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            
            {/* Left: Count & Mobile Filter Trigger */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileDrawerOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>Filters</span>
                {(selectedJobTypes.length > 0 || selectedLocations.length > 0 || selectedCategory !== 'All') && (
                  <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                    {selectedJobTypes.length + selectedLocations.length + (selectedCategory !== 'All' ? 1 : 0)}
                  </span>
                )}
              </button>

              <div className="text-xs text-slate-600 font-medium">
                {loading ? (
                  <span>Searching active openings...</span>
                ) : (
                  <span>
                    Showing <strong className="text-slate-900 font-bold">{filteredJobs.length}</strong> jobs available
                  </span>
                )}
              </div>
            </div>

            {/* Right: Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline">Sort by:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="newest">Most Recent</option>
                  <option value="featured">Featured First</option>
                </select>
              </div>
            </div>

          </div>

          {/* Active Filter Chips Bar */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-display mr-1">
                Active Filters:
              </span>

              {/* Selected Job Types Chips */}
              {selectedJobTypes.map((typeKey) => (
                <span
                  key={typeKey}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold"
                >
                  <span>Type: {typeKey === 'WFH' ? 'Work From Home' : typeKey}</span>
                  <button
                    onClick={() => handleJobTypeToggle(typeKey)}
                    className="p-0.5 hover:bg-blue-200/80 rounded-full transition-colors cursor-pointer text-blue-600"
                    aria-label={`Remove ${typeKey} filter`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Selected Locations Chips */}
              {selectedLocations.map((locKey) => (
                <span
                  key={locKey}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold"
                >
                  <span>Location: {locKey}</span>
                  <button
                    onClick={() => handleLocationToggle(locKey)}
                    className="p-0.5 hover:bg-emerald-200/80 rounded-full transition-colors cursor-pointer text-emerald-600"
                    aria-label={`Remove ${locKey} filter`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Selected Category Chip */}
              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold">
                  <span>Category: {selectedCategory}</span>
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className="p-0.5 hover:bg-indigo-200/80 rounded-full transition-colors cursor-pointer text-indigo-600"
                    aria-label="Remove category filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Selected Experience Chip */}
              {selectedExperience !== 'All' && (
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold">
                  <span>Exp: {selectedExperience}</span>
                  <button
                    onClick={() => setSelectedExperience('All')}
                    className="p-0.5 hover:bg-purple-200/80 rounded-full transition-colors cursor-pointer text-purple-600"
                    aria-label="Remove experience filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Salary Range Filter Chip */}
              {isSalaryFilterActive && (
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                  <span>
                    Salary:{' '}
                    {maxSalary !== null
                      ? `₹${minSalary}L - ₹${maxSalary}L`
                      : `₹${minSalary}L+`}
                  </span>
                  <button
                    onClick={() => handleSalaryChange(0, null)}
                    className="p-0.5 hover:bg-teal-200/80 rounded-full transition-colors cursor-pointer text-teal-600"
                    aria-label="Remove salary filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Keyword Chip */}
              {keyword.trim() && (
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                  <span>Keyword: "{keyword}"</span>
                  <button
                    onClick={() => setKeyword('')}
                    className="p-0.5 hover:bg-amber-200/80 rounded-full transition-colors cursor-pointer text-amber-700"
                    aria-label="Clear keyword search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Reset All Button */}
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer ml-auto"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs sm:text-sm">
              <div className="font-bold">Database connection issue</div>
              <p className="mt-0.5">{error}</p>
            </div>
          )}

          {/* Job List Cards or Skeletons */}
          {loading ? (
            <div className="space-y-4">
              <JobCardSkeleton />
              <JobCardSkeleton />
              <JobCardSkeleton />
              <JobCardSkeleton />
            </div>
          ) : paginatedJobs.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                <SearchX className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold font-display text-slate-900">
                  No matching jobs found
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Try adjusting your selected job types or locations, or clear filters to view all active openings.
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Reset All Filters</span>
              </button>
            </div>
          ) : (
            /* Populated Cards */
            <div className="space-y-3.5">
              {paginatedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onViewDetails={() => onNavigate(generateJobUrlPath(job))}
                  onCopyLink={handleCopyJobLink}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="pt-6 flex items-center justify-between border-t border-slate-200/70 text-xs text-slate-600">
              <div>
                Page <span className="font-bold text-slate-900">{currentPage}</span> of{' '}
                <span className="font-bold text-slate-900">{totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Copy link toast feedback */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />

    </div>
  );
};
