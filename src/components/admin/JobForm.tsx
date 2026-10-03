import React, { useState, useEffect } from 'react';
import { Job, JobInsert, JobStatus, Category } from '../../types/database.types';
import { adminJobsService } from '../../services/adminJobsService';
import { normalizeSkills } from '../../utils/skillUtils';
import { 
  Building2, MapPin, Briefcase, DollarSign, Layers, 
  Tag, Link2, Calendar, FileText, CheckCircle2, AlertCircle, 
  ArrowLeft, Loader2, Share2 
} from 'lucide-react';
import { 
  ShareableJob, 
  getAutoSharePreference, 
  setAutoSharePreference, 
  getTelegramConfig, 
  postToTelegramBotApi 
} from '../../utils/socialShare';
import { SocialShareModal } from './SocialShareModal';

interface JobFormProps {
  initialData?: Partial<Job> | null;
  mode: 'create' | 'edit';
  onNavigate: (path: string) => void;
  onSaved: (savedJob: Job) => void;
}

export const JobForm: React.FC<JobFormProps> = ({
  initialData,
  mode,
  onNavigate,
  onSaved,
}) => {
  // Form fields
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [location, setLocation] = useState('Pan India');
  const [salary, setSalary] = useState('');
  const [experience, setExperience] = useState('Fresher');
  const [jobType, setJobType] = useState('Fresher');
  const [category, setCategory] = useState('Software Engineering');
  const [skillsRequired, setSkillsRequired] = useState('');
  const [description, setDescription] = useState('');
  const [applyLink, setApplyLink] = useState('');
  const [source, setSource] = useState('Official Careers Portal');
  const [featured, setFeatured] = useState(false);
  const [postedDate, setPostedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState<JobStatus>('active');

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Social Sharing State
  const [autoShareEnabled, setAutoShareEnabled] = useState(getAutoSharePreference());
  const [shareModalJob, setShareModalJob] = useState<ShareableJob | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load categories and hydrate if initialData exists
  useEffect(() => {
    const fetchCats = async () => {
      console.log('[JobForm] Loading categories...');
      const dbCategories = await adminJobsService.getCategories();
      const defaultCategories = [
        'Software Engineering',
        'Data & Analytics',
        'QA & Testing',
        'Cloud & DevOps',
        'Operations & Support',
        'Internship',
        'Full Stack Development',
        'Product Management',
        'UI/UX Design',
        'Marketing & Sales',
        'General',
      ];
      
      const categoryNames = new Set(dbCategories.map((c) => c.category_name));
      defaultCategories.forEach((catName) => categoryNames.add(catName));
      if (initialData?.category) {
        categoryNames.add(initialData.category);
      }
      
      const mergedList: Category[] = Array.from(categoryNames).map((name, idx) => ({
        id: `cat-${idx}-${name}`,
        category_name: name,
        created_at: new Date().toISOString(),
      }));
      
      setCategories(mergedList);
      if (initialData?.category) {
        setCategory(initialData.category);
      } else if (mergedList.length > 0) {
        setCategory(mergedList[0].category_name);
      }
    };
    fetchCats();
  }, [initialData]);

  useEffect(() => {
    if (initialData) {
      console.log('[JobForm] Hydrated form with initialData for edit:', {
        id: initialData.id,
        title: initialData.title,
        company: initialData.company,
        status: initialData.status,
      });
      setTitle(initialData.title || '');
      setCompany(initialData.company || '');
      setCompanyLogo(initialData.company_logo || '');
      setLocation(initialData.location || 'Pan India');
      setSalary(initialData.salary || '');
      setExperience(initialData.experience || 'Fresher');
      setJobType(initialData.job_type || 'Fresher');
      setCategory(initialData.category || 'Software Engineering');
      setSkillsRequired(normalizeSkills(initialData.skills_required).join(', '));
      setDescription(initialData.description || '');
      setApplyLink(initialData.apply_link || '');
      setSource(initialData.source || 'Official Careers Portal');
      setFeatured(Boolean((initialData as any).is_featured ?? initialData.featured ?? false));
      setPostedDate(initialData.posted_date || new Date().toISOString().split('T')[0]);
      setExpiryDate(initialData.expiry_date || '');
      setStatus(initialData.status || 'active');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!title.trim()) {
      setErrorMessage('Please provide a Job Title.');
      return;
    }
    if (!company.trim()) {
      setErrorMessage('Please provide a Company Name.');
      return;
    }
    if (!applyLink.trim() || !applyLink.startsWith('http')) {
      setErrorMessage('Please enter a valid official apply link starting with http:// or https://');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Please provide a job description and eligibility details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const skillsArray = skillsRequired
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const jobPayload: JobInsert = {
        title: title.trim(),
        company: company.trim(),
        company_logo: companyLogo.trim() || null,
        location: location.trim(),
        salary: salary.trim() || null,
        experience: experience.trim() || 'Fresher',
        job_type: jobType,
        category: category,
        skills_required: skillsArray,
        description: description.trim(),
        apply_link: applyLink.trim(),
        source: source.trim() || 'Official Careers Portal',
        featured,
        is_featured: featured,
        status,
        posted_date: postedDate,
        expiry_date: expiryDate.trim() || null,
      };

      if (mode === 'create') {
        const { data, error } = await adminJobsService.createJob(jobPayload);
        if (error || !data) {
          throw error || new Error('Failed to create job in Supabase');
        }
        setSuccessMessage(
          status === 'active'
            ? 'Job successfully published & category alert notifications dispatched to subscribers!'
            : 'Job successfully published to Supabase database!'
        );

        // Telegram Auto-Post check if configured
        const tgConfig = getTelegramConfig();
        if (autoShareEnabled && tgConfig.autoPostOnPublish && tgConfig.botToken && tgConfig.channelId) {
          postToTelegramBotApi(data, undefined, tgConfig).then((res) => {
            if (res.success) {
              setToastNotification({
                message: 'Job automatically broadcasted to Telegram channel!',
                type: 'success',
              });
            }
          });
        }

        if (autoShareEnabled) {
          // Open the social share modal with the generated message
          setShareModalJob(data);
          setIsShareModalOpen(true);
        } else {
          onSaved(data);
        }
      } else if (mode === 'edit' && initialData && initialData.id) {
        console.log('[JobForm.handleSubmit] Updating job ID:', initialData.id, 'with payload:', jobPayload);
        const { data, error } = await adminJobsService.updateJob(initialData.id, jobPayload);
        if (error || !data) {
          console.error('[JobForm.handleSubmit] Error updating job in Supabase:', error);
          throw error || new Error('Failed to update job in Supabase');
        }
        console.log('[JobForm.handleSubmit] Job updated successfully in Supabase:', data);
        setSuccessMessage('Job changes saved to Supabase successfully! All applications, views, and analytics are preserved.');
        setToastNotification({
          message: `Job "${data.title}" updated successfully!`,
          type: 'success',
        });
        onSaved(data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'A database error occurred while saving the job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Top Banner Alert Messages */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Error saving job</div>
            <div className="mt-0.5 leading-relaxed">{errorMessage}</div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Success</div>
            <div className="mt-0.5 leading-relaxed">{successMessage}</div>
          </div>
        </div>
      )}

      {/* Section 1: Basic Position Information */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-blue-700">
          1. Position & Employer Overview
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Associate Software Engineer / Trainee"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tata Consultancy Services (TCS)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company Logo URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://company.com/logo.png"
              value={companyLogo}
              onChange={(e) => setCompanyLogo(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Bengaluru / Hyderabad / Work From Home"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Compensation & Requirements */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-blue-700">
          2. Compensation & Category Attributes
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Salary / CTC / Stipend
            </label>
            <input
              type="text"
              placeholder="e.g. ₹3.50 - ₹6.50 LPA or ₹25,000/mo"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Experience Level
            </label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
            >
              <option value="Fresher">Fresher (0 Years)</option>
              <option value="0-1 Years">0-1 Years</option>
              <option value="1-3 Years">1-3 Years</option>
              <option value="Any">Any Experience</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Type
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white font-medium"
            >
              <option value="Fresher">Fresher</option>
              <option value="Internship">Internship</option>
              <option value="Full Time">Full Time</option>
              <option value="Part Time">Part Time</option>
              <option value="Contract">Contract</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category / Industry Specialization <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white font-medium"
            >
              {categories.length > 0 ? (
                categories.map((c) => (
                  <option key={c.id} value={c.category_name}>
                    {c.category_name}
                  </option>
                ))
              ) : (
                <>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Data & Analytics">Data & Analytics</option>
                  <option value="QA & Testing">QA & Testing</option>
                  <option value="Cloud & DevOps">Cloud & DevOps</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Skills Required (Comma Separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Java, Python, SQL, React, Git"
              value={skillsRequired}
              onChange={(e) => setSkillsRequired(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Official Apply Link & Sourcing */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-blue-700">
          3. Sourcing & Official Application
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official Company Apply Link <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://company.com/careers/job-123"
              value={applyLink}
              onChange={(e) => setApplyLink(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-[11px]"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Direct official career portal URL (e.g. careers.google.com, tcs.com)
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Source / Sourcing Channel
            </label>
            <input
              type="text"
              placeholder="e.g. Official Careers, TCS iON, Off-Campus Drive"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Posted Date
            </label>
            <input
              type="date"
              required
              value={postedDate}
              onChange={(e) => setPostedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as JobStatus)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white font-bold capitalize"
            >
              <option value="active">Active (🟢 Live &amp; Accepting Applications)</option>
              <option value="paused">Paused (🟡 Temporarily Unavailable)</option>
              <option value="expired">Expired (🔴 Applications Closed)</option>
              <option value="closed">Closed</option>
              <option value="draft">Draft</option>
              <option value="deleted">Deleted (Soft-Deleted)</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group bg-slate-50 hover:bg-amber-50/60 p-3 rounded-xl border border-slate-200 hover:border-amber-300 transition-all">
            <input
              type="checkbox"
              id="mark_featured_job_input"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800 group-hover:text-amber-950 flex flex-wrap items-center gap-1.5">
              <span>⭐ Mark as Featured Job</span>
              <span className="text-[11px] font-normal text-slate-500 group-hover:text-amber-800">
                (Displays in Top Announcement Bar with 🔥 Featured Job badge)
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* Section 4: Job Description & Eligibility Criteria */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-blue-700">
          4. Detailed Job Description & Requirements
        </h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Job Description, Responsibilities & Eligibility <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={10}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`### About the Opportunity\nProvide an overview of the role and team.\n\n### Key Responsibilities\n* Deliver high quality software.\n* Collaborate in an agile squad.\n\n### Eligibility Criteria\n* B.E. / B.Tech / BCA / MCA / B.Sc\n* Graduating Batches: 2024, 2025, 2026\n* Minimum 60% or 6.0 CGPA`}
            className="w-full px-3.5 py-3 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-[12px] leading-relaxed"
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Supports structured markdown headings (###) and bullet lists (*).
          </span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={() => onNavigate('/admin/jobs')}
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Jobs List</span>
        </button>

        <div className="w-full sm:w-auto flex flex-wrap items-center gap-3">
          {/* Auto Share Toggle */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-colors text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={autoShareEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                setAutoShareEnabled(checked);
                setAutoSharePreference(checked);
              }}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              Auto Share After Publishing
            </span>
          </label>

          {/* Quick Share Listing button for existing jobs */}
          {initialData && (
            <button
              type="button"
              onClick={() => {
                setShareModalJob({
                  id: initialData.id,
                  title: title || initialData.title || '',
                  company: company || initialData.company || '',
                  location: location || initialData.location || 'Pan India',
                  experience: experience || initialData.experience || 'Fresher',
                  salary: salary || initialData.salary || '',
                  category: category || initialData.category || 'Software Engineering',
                  job_type: jobType || initialData.job_type || 'Full Time',
                  apply_link: applyLink || initialData.apply_link || '',
                  skills_required: skillsRequired || initialData.skills_required || '',
                });
                setIsShareModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
              title="Share job opening to WhatsApp, Telegram, LinkedIn, X, Facebook"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Listing</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === 'create' ? 'Publishing Job...' : 'Updating Job...'}</span>
              </>
            ) : (
              <span>{mode === 'create' ? 'Publish Job Listing' : 'Update Job'}</span>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div className={`p-4 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2.5 ${
            toastNotification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-rose-600 text-white border-rose-700'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastNotification.message}</span>
          </div>
        </div>
      )}

      {/* Social Share Modal */}
      <SocialShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          if (shareModalJob) {
            onSaved(shareModalJob as Job);
          }
        }}
        job={shareModalJob}
        onToast={(msg, type) => {
          setToastNotification({ message: msg, type: type || 'success' });
          setTimeout(() => setToastNotification(null), 4000);
        }}
      />

    </form>
  );
};
