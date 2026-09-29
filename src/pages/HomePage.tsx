import React, { useState, useEffect, useMemo } from 'react';
import { Job, Category } from '../types/database.types';
import { jobsService, categoriesService, applicantsService } from '../services/supabaseService';
import { resumeReviewService } from '../services/resumeReviewService';
import { JobCard } from '../components/jobs/JobCard';
import { JobCardSkeleton } from '../components/jobs/JobCardSkeleton';
import { HeroSection } from '../components/home/HeroSection';
import { StatsSection } from '../components/home/StatsSection';
import { FeaturedCategories } from '../components/home/FeaturedCategories';
import { FeaturedCompanies } from '../components/home/FeaturedCompanies';
import { RecruiterHiringSection } from '../components/home/RecruiterHiringSection';
import { CTASections } from '../components/home/CTASections';
import { SubscribeJobAlerts } from '../components/common/SubscribeJobAlerts';
import { generateJobUrlPath, getAbsoluteJobUrl } from '../utils/jobUrlUtils';
import { Toast } from '../components/common/Toast';
import { analyticsTracker } from '../services/analyticsTracker';
import { 
  Laptop, GraduationCap, Briefcase, ChevronRight, Flame
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalActiveJobs, setTotalActiveJobs] = useState<number>(0);
  const [totalCompanies, setTotalCompanies] = useState<number>(0);
  const [resumeReviewsCompleted, setResumeReviewsCompleted] = useState<number>(0);
  const [portfolioWebsitesDelivered, setPortfolioWebsitesDelivered] = useState<number>(0);
  const [distinctCompaniesList, setDistinctCompaniesList] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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

  // Load real data directly from Supabase (Zero dummy/fake numbers)
  useEffect(() => {
    let isMounted = true;
    analyticsTracker.trackPageView('home');

    const loadHomeData = async () => {
      setLoading(true);
      try {
        const [
          jobsRes,
          catsRes,
          activeJobsCountRes,
          companiesRes,
          resumeReviewsCountRes,
        ] = await Promise.allSettled([
          jobsService.getAll({ status: 'active', limit: 50 }),
          categoriesService.getAll(),
          jobsService.getActiveCount(),
          jobsService.getDistinctActiveCompaniesCount(),
          resumeReviewService.getCompletedCount(),
        ]);

        if (isMounted) {
          // 1. Live Jobs
          if (jobsRes.status === 'fulfilled' && jobsRes.value.data) {
            setJobs(jobsRes.value.data);
          }

          // 2. Categories
          if (catsRes.status === 'fulfilled' && catsRes.value.data) {
            setCategories(catsRes.value.data);
          }

          // 3. Exact Active Jobs Count from DB
          if (activeJobsCountRes.status === 'fulfilled') {
            setTotalActiveJobs(activeJobsCountRes.value.count);
          }

          // 4. Exact Distinct Companies Count from DB
          if (companiesRes.status === 'fulfilled') {
            setTotalCompanies(companiesRes.value.count);
            setDistinctCompaniesList(companiesRes.value.companies);
          }

          // 5. Real Resume Reviews Completed from DB
          if (resumeReviewsCountRes.status === 'fulfilled') {
            setResumeReviewsCompleted(resumeReviewsCountRes.value);
          }
        }
      } catch (err) {
        console.error('Error fetching dynamic homepage statistics from Supabase:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter partitions
  const latestJobs = useMemo(() => jobs.slice(0, 6), [jobs]);

  const wfhJobs = useMemo(() => {
    return jobs.filter((j) => {
      const loc = (j.location || '').toLowerCase();
      const type = (j.job_type || '').toLowerCase();
      const desc = (j.description || '').toLowerCase();
      return (
        loc.includes('remote') || 
        loc.includes('work from home') || 
        loc.includes('wfh') ||
        type.includes('remote') ||
        desc.includes('work from home')
      );
    }).slice(0, 4);
  }, [jobs]);

  const internshipJobs = useMemo(() => {
    return jobs.filter((j) => {
      const type = (j.job_type || '').toLowerCase();
      const title = (j.title || '').toLowerCase();
      return type.includes('intern') || title.includes('intern');
    }).slice(0, 4);
  }, [jobs]);

  // Search handler
  const handleSearch = (keyword: string, location: string) => {
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (location) params.set('location', location);
    onNavigate(`/jobs?${params.toString()}`);
  };

  const handleSelectCategory = (categoryName: string, jobType?: string) => {
    const params = new URLSearchParams();
    if (categoryName && categoryName !== 'All') {
      params.set('category', categoryName);
    }
    if (jobType && jobType !== 'All') {
      if (jobType === 'Remote') {
        params.set('location', 'Remote');
      } else {
        params.set('type', jobType);
      }
    }
    onNavigate(`/jobs?${params.toString()}`);
  };

  return (
    <div className="space-y-16 animate-fadeIn pb-16">
      
      {/* 1. Redesigned Hero Section with Search, Category Filters, Popular Searches, Trust Badges */}
      <HeroSection
        onSearch={handleSearch}
        onSelectCategory={handleSelectCategory}
        onNavigate={onNavigate}
      />

      {/* 2. Statistics Section (Real Data Only: Active Jobs, Companies Hiring, Resume Reviews Completed, Portfolio Websites; auto-hides if empty) */}
      <StatsSection
        activeJobsCount={totalActiveJobs}
        companiesCount={totalCompanies}
        resumeReviewsCompleted={resumeReviewsCompleted}
        portfolioWebsitesDelivered={portfolioWebsitesDelivered}
        loading={loading}
      />

      {/* 3. Featured Categories */}
      <FeaturedCategories
        onSelectCategory={handleSelectCategory}
        categoryCounts={{}}
      />

      {/* 4. Latest Verified Jobs Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 font-display">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Real-Time Requisitions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-0.5">
              Latest Verified Jobs
            </h2>
          </div>

          <button
            onClick={() => onNavigate('/jobs')}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            <span>View All ({totalActiveJobs}) Jobs</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <JobCardSkeleton />
            <JobCardSkeleton />
            <JobCardSkeleton />
          </div>
        ) : latestJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No Openings Available</h3>
            <p className="text-xs text-slate-500">
              New job postings will be published shortly.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {latestJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onViewDetails={() => onNavigate(generateJobUrlPath(job))}
                onCopyLink={handleCopyJobLink}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. Work From Home (Remote) Jobs Section */}
      <section className="space-y-6 bg-slate-100/60 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-12 rounded-3xl border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 font-display">
              <Laptop className="w-4 h-4 text-blue-600" />
              <span>Pan India Flexibility</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-0.5">
              Work From Home Jobs
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Positions with remote-friendly setups for engineers, analysts, and freshers.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/jobs?location=Remote')}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            <span>View All Remote Jobs</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <JobCardSkeleton />
            <JobCardSkeleton />
          </div>
        ) : wfhJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
            <Laptop className="w-7 h-7 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">
              No specific remote postings currently. Click below to view all locations.
            </p>
            <button
              onClick={() => onNavigate('/jobs')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Browse all jobs
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {wfhJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onViewDetails={() => onNavigate(generateJobUrlPath(job))}
                onCopyLink={handleCopyJobLink}
              />
            ))}
          </div>
        )}
      </section>

      {/* 6. Internship Jobs Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 font-display">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Early Career &amp; Freshers</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-0.5">
              Internship Opportunities
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Paid corporate internships designed for pre-final, final year students, and recent grads.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/jobs?type=Internship')}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            <span>View All Internships</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <JobCardSkeleton />
            <JobCardSkeleton />
          </div>
        ) : internshipJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
            <GraduationCap className="w-7 h-7 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">
              New internship drives opening soon. Check all jobs for entry-level positions.
            </p>
            <button
              onClick={() => onNavigate('/jobs')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Browse all jobs
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {internshipJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onViewDetails={() => onNavigate(generateJobUrlPath(job))}
                onCopyLink={handleCopyJobLink}
              />
            ))}
          </div>
        )}
      </section>

      {/* 7. Featured Companies Section (Only real companies from DB) */}
      <FeaturedCompanies
        companies={distinctCompaniesList}
        onCompanyClick={(company) => onNavigate(`/jobs?q=${encodeURIComponent(company)}`)}
      />

      {/* 8. Recruiter Hiring Call to Action */}
      <RecruiterHiringSection onNavigate={onNavigate} />

      {/* 9. Comprehensive CTA Sections (Resume Review, Portfolio Website, WhatsApp Community) */}
      <CTASections onNavigate={onNavigate} />

      {/* 10. Subscribe to Job Alerts Form */}
      <SubscribeJobAlerts />

      {/* Copy link toast feedback */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />

    </div>
  );
};
