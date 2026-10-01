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
import { WhyChooseUsSection } from '../components/home/WhyChooseUsSection';
import { SubscribeJobAlerts } from '../components/common/SubscribeJobAlerts';
import { generateJobUrlPath, getAbsoluteJobUrl } from '../utils/jobUrlUtils';
import { Toast } from '../components/common/Toast';
import { analyticsTracker } from '../services/analyticsTracker';
import { 
  Laptop, GraduationCap, Briefcase, ChevronRight, Flame, 
  ShieldCheck, CheckCircle2, Sparkles, Building2, Users, ArrowRight
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
    analyticsTracker.trackPageView({
      page_name: 'Homepage',
      page_url: window.location.href,
      page_type: 'home',
    });

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
        type.includes('wfh') ||
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
      
      {/* 1. Split-Screen Hero Section with Professional Indian Photo & Floating Badges */}
      <HeroSection
        onSearch={handleSearch}
        onSelectCategory={handleSelectCategory}
        onNavigate={onNavigate}
        activeJobsCount={totalActiveJobs}
        companiesCount={totalCompanies}
        companies={distinctCompaniesList}
      />

      {/* 2. Statistics Section (Real Data Only with Smooth Count-Up) */}
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

      {/* 4. Latest Verified Jobs Section with Workplace Imagery Banner */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 font-display">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Real-Time Requisitions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-0.5">
              Latest Verified Job Openings
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

        {/* Visual Storytelling Banner for Engineering Roles */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl overflow-hidden border border-blue-800/40 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 sm:p-8">
            <div className="md:col-span-8 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Direct Corporate Hiring · Zero Agency Fees
              </span>
              <h3 className="text-xl sm:text-2xl font-bold font-display text-white">
                Software Engineering &amp; Technology Openings
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Connect directly with hiring managers for full stack, backend, frontend, and trainee positions. Every requisition links to verified corporate career portals.
              </p>
            </div>
            <div className="md:col-span-4 flex justify-center md:justify-end">
              <div className="w-full max-w-[300px] aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg bg-slate-900">
                <img
                  src="/assets/images/young-engineer.jpg"
                  alt="Young software engineer coding on laptop at tech workspace"
                  className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
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

      {/* 5. Work From Home (Remote) Jobs Section with Home Office Imagery */}
      <section className="space-y-6 bg-slate-100/70 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-12 rounded-3xl border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-600 font-display">
              <Laptop className="w-4 h-4 text-teal-600" />
              <span>Pan India Flexibility</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-0.5">
              Work From Home (Remote) Jobs
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Positions with remote-friendly setups for engineers, analysts, and freshers.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/jobs?location=Remote')}
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors cursor-pointer"
          >
            <span>View All Remote Jobs</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Remote Workspace Storytelling Banner */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-64 aspect-[4/3] rounded-2xl overflow-hidden shrink-0 border border-slate-200 shadow-xs bg-slate-100">
            <img
              src="/assets/images/remote-wfh.jpg"
              alt="Remote engineer home office setup with laptop"
              className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-2 flex-1 text-left">
            <span className="text-[11px] font-bold uppercase text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/60 inline-flex items-center gap-1">
              <Laptop className="w-3 h-3 text-teal-600" />
              Work From Anywhere in India
            </span>
            <h4 className="text-base sm:text-lg font-bold font-display text-slate-900">
              Verified Remote Engineering &amp; Analyst Opportunities
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Skip the metro commute. Work with leading Indian tech startups and multinational teams offering full remote work setups, home office stipends, and flexible hours.
            </p>
          </div>
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

      {/* 6. Internship Jobs Section with Students Collaborating Imagery */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-600 font-display">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span>Campus &amp; Off-Campus Hiring</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-0.5">
              Internship Opportunities for College Students
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Paid corporate internships designed for pre-final, final year students, and recent 2024-2026 graduates.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/jobs?type=Internship')}
            className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-800 transition-colors cursor-pointer"
          >
            <span>View All Internships</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Student Collaboration Banner */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-64 aspect-[4/3] rounded-2xl overflow-hidden shrink-0 border border-slate-200 shadow-xs bg-slate-100">
            <img
              src="/assets/images/interns-students.jpg"
              alt="Indian university students collaborating on laptops in modern tech workspace"
              className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-2 flex-1 text-left">
            <span className="text-[11px] font-bold uppercase text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60 inline-flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-purple-600" />
              2024 · 2025 · 2026 Batches
            </span>
            <h4 className="text-base sm:text-lg font-bold font-display text-slate-900">
              Launch Your Career with Paid Industry Internships
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gain hands-on corporate engineering and analytics experience before graduation. Explore verified stipend internships with pre-placement offers (PPO).
            </p>
          </div>
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

      {/* 7. Why Choose Mana Naukari (3-Column Modern Feature Section) */}
      <WhyChooseUsSection onNavigate={onNavigate} />

      {/* 8. Featured Companies Section (Only real companies from DB) */}
      <FeaturedCompanies
        companies={distinctCompaniesList}
        onCompanyClick={(company) => onNavigate(`/jobs?q=${encodeURIComponent(company)}`)}
      />

      {/* 9. Recruiter Hiring Call to Action with Corporate Imagery */}
      <RecruiterHiringSection onNavigate={onNavigate} />

      {/* 10. Comprehensive CTA Sections (Resume Review with Photo, Developer Portfolio, WhatsApp Community) */}
      <CTASections onNavigate={onNavigate} />

      {/* 11. Subscribe to Job Alerts Form */}
      <SubscribeJobAlerts />

      {/* Copy link toast feedback */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />

    </div>
  );
};
