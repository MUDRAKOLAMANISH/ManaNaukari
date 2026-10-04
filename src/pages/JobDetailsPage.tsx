import React, { useState, useEffect } from 'react';
import { Job, CandidateProfile } from '../types/database.types';
import { jobsService, visitorProfilesService, applicantsService } from '../services/supabaseService';
import { candidateProfileService } from '../services/candidateProfileService';
import { normalizeSkills } from '../utils/skillUtils';
import { generateJobUrlPath, getAbsoluteJobUrl } from '../utils/jobUrlUtils';
import { validateIndianMobile, validateCandidateEmail } from '../utils/candidateValidation';
import { ShareModal } from '../components/common/ShareModal';
import { Toast } from '../components/common/Toast';
import { ApplyModal } from '../components/jobs/ApplyModal';
import { ApplyChoiceModal } from '../components/jobs/ApplyChoiceModal';
import { AtsResumeMatchModal } from '../components/jobs/AtsResumeMatchModal';
import { analyticsTracker } from '../services/analyticsTracker';
import { 
  Building2, MapPin, Briefcase, IndianRupee, Calendar, 
  ExternalLink, ArrowLeft, ShieldCheck, CheckCircle2, 
  Share2, Users, Loader2, AlertCircle, Sparkles, Copy, 
  Clock, Check, Tag, ChevronRight, Layers, Bookmark, RotateCcw
} from 'lucide-react';
import { ReapplyConfirmModal } from '../components/jobs/ReapplyConfirmModal';

interface JobDetailsPageProps {
  jobId: string;
  onNavigate: (path: string) => void;
}

export const JobDetailsPage: React.FC<JobDetailsPageProps> = ({ jobId, onNavigate }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [relatedJobs, setRelatedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Application lead capture modal & Candidate Recognition
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantResumeFileName, setApplicantResumeFileName] = useState('');
  const [hasAlreadyApplied, setHasAlreadyApplied] = useState(false);
  const [alreadyAppliedDate, setAlreadyAppliedDate] = useState<string | null>(null);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  // Reapply confirmation modal state
  const [isReapplyModalOpen, setIsReapplyModalOpen] = useState(false);
  const [isReapplying, setIsReapplying] = useState(false);

  // Auto pre-fill from stored Candidate Profile and check if candidate already applied to this job
  useEffect(() => {
    const detectStoredCandidate = async () => {
      const localProfile = candidateProfileService.getLocalProfile();
      if (localProfile) {
        console.log('[JobDetailsPage] Recognized stored candidate profile:', localProfile.name);
        if (!applicantName) setApplicantName(localProfile.name);
        if (!applicantEmail) setApplicantEmail(localProfile.email);
        if (!applicantPhone) setApplicantPhone(localProfile.mobile);
        if (localProfile.resume_file_name) setApplicantResumeFileName(localProfile.resume_file_name);

        if (jobId) {
          const dedup = await candidateProfileService.checkJobApplication(
            jobId,
            localProfile.id,
            localProfile.email,
            localProfile.mobile
          );
          if (dedup.hasApplied) {
            console.log('[JobDetailsPage] Candidate has already applied for this job on:', dedup.appliedAt);
            setHasAlreadyApplied(true);
            setAlreadyAppliedDate(dedup.appliedAt || new Date().toISOString());
          }
        }
      }
    };
    detectStoredCandidate();
  }, [jobId]);

  // Fetch job details and related jobs
  useEffect(() => {
    let isMounted = true;
    const fetchJob = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await jobsService.getById(jobId);
        if (!isMounted) return;

        if (fetchErr || !data || data.status === 'deleted' || data.status === 'draft') {
          setError('This job opening is no longer available or is pending review.');
          setJob(null);
          setLoading(false);
          return;
        }

        setJob(data);

        // Record job detail view telemetry
        analyticsTracker.trackJobView({
          id: data.id,
          title: data.title,
          company: data.company,
        });

        // Dynamic SEO updates: Title, Description, and OpenGraph tags
        const pageTitle = `${data.title} at ${data.company} – Apply Online | Mana Naukari`;
        const pageDesc = `Apply for ${data.title} at ${data.company} in ${data.location}. Experience: ${data.experience || 'Fresher'}. Package: ${data.salary || 'Best in Industry'}. Direct official application link on Mana Naukari.`;

        document.title = pageTitle;

        // Meta Description update
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute('content', pageDesc);
        } else {
          metaDesc = document.createElement('meta');
          metaDesc.setAttribute('name', 'description');
          metaDesc.setAttribute('content', pageDesc);
          document.head.appendChild(metaDesc);
        }

        // OpenGraph Title & Description update
        let ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', pageTitle);

        let ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', pageDesc);

        let ogUrl = document.querySelector('meta[property="og:url"]');
        const canonicalUrl = getAbsoluteJobUrl(generateJobUrlPath(data));
        if (ogUrl) {
          ogUrl.setAttribute('content', canonicalUrl);
        } else {
          ogUrl = document.createElement('meta');
          ogUrl.setAttribute('property', 'og:url');
          ogUrl.setAttribute('content', canonicalUrl);
          document.head.appendChild(ogUrl);
        }

        // Fetch related jobs in the same category or company
        const { data: relatedData } = await jobsService.getAll({
          category: data.category,
          limit: 5,
        });

        if (isMounted && relatedData) {
          // Exclude the current job
          setRelatedJobs(relatedData.filter((j) => j.id !== data.id).slice(0, 4));
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error loading job details');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (jobId) {
      fetchJob();
    }

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  // Copy job link
  const handleCopyLink = () => {
    if (!job) return;
    const fullUrl = getAbsoluteJobUrl(generateJobUrlPath(job));

    const showSuccess = () => {
      setCopiedLink(true);
      setToastMessage('Job link copied successfully.');
      setTimeout(() => {
        setCopiedLink(false);
        setToastMessage(null);
      }, 3000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl).then(showSuccess).catch(() => {
        // Fallback for older mobile webviews
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

  // Share job button using Web Share API when supported, or modal fallback
  const handleShareJob = async () => {
    if (!job) return;
    const fullUrl = getAbsoluteJobUrl(generateJobUrlPath(job));
    const title = `${job.title} at ${job.company}`;
    const text = `Hiring Alert: ${job.title} at ${job.company} (${job.location}) on Mana Naukari. Apply online:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: fullUrl,
        });
      } catch (err: any) {
        // User cancelled or share failed, open fallback modal if not abort
        if (err.name !== 'AbortError') {
          setIsShareModalOpen(true);
        }
      }
    } else {
      setIsShareModalOpen(true);
    }
  };

  // 1. Open apply modal directly at the center of the screen
  const handleApplyClick = () => {
    if (!job || job.status !== 'active') return;
    if (hasAlreadyApplied) {
      setToastMessage('✓ You have already applied for this job.');
      return;
    }
    setLeadError(null);
    setIsApplyModalOpen(true);
  };

  const handleSelectCheckMatch = () => {
    setIsChoiceModalOpen(false);
    setIsAtsModalOpen(true);
  };

  const handleSelectDirectApply = () => {
    setIsChoiceModalOpen(false);
    setIsApplyModalOpen(true);
  };

  const handleContinueFromAts = (candidateInfo: {
    name: string;
    email: string;
    phone: string;
    resumeFileName?: string;
  }) => {
    if (candidateInfo.name) setApplicantName(candidateInfo.name);
    if (candidateInfo.email) setApplicantEmail(candidateInfo.email);
    if (candidateInfo.phone) setApplicantPhone(candidateInfo.phone);
    if (candidateInfo.resumeFileName) setApplicantResumeFileName(candidateInfo.resumeFileName);
    setIsAtsModalOpen(false);
    setIsApplyModalOpen(true);
  };

  // Reapply action handler: increments attempt_count and updates last_reapplied_at without duplicate records
  const handleConfirmReapply = async () => {
    if (!job) return;
    setIsReapplying(true);
    try {
      const localProfile = candidateProfileService.getLocalProfile();
      const candidateId = localProfile?.visitor_id || localProfile?.id || applicantEmail || 'candidate';
      await candidateProfileService.recordReapply({
        jobId: job.id,
        candidateProfileId: candidateId,
        candidateEmail: localProfile?.email || applicantEmail,
        candidatePhone: localProfile?.mobile || applicantPhone,
      });

      setToastMessage(`✓ Reopening official application for ${job.company}...`);
      setTimeout(() => {
        window.open(job.apply_link, '_blank', 'noopener,noreferrer');
        setIsReapplyModalOpen(false);
        setIsReapplying(false);
      }, 400);
    } catch (err) {
      console.warn('[JobDetailsPage] Reapply exception:', err);
      window.open(job.apply_link, '_blank', 'noopener,noreferrer');
      setIsReapplyModalOpen(false);
      setIsReapplying(false);
    }
  };

  // Candidate submission and sequential Supabase insert flow with Verification & Deduplication
  const handleSubmitLead = async (
    e: React.FormEvent,
    verificationOptions?: { isVerified?: boolean; verifiedAt?: string }
  ) => {
    e.preventDefault();
    console.log('[JobDetailsPage.handleSubmitLead] Candidate submission initiated.', verificationOptions);

    if (!job) {
      setLeadError('Job requisition not found.');
      return;
    }

    if (hasAlreadyApplied) {
      setLeadError('✓ You have already applied for this job.');
      return;
    }

    const trimmedName = applicantName.trim();
    const trimmedEmail = applicantEmail.trim().toLowerCase();
    const trimmedPhone = applicantPhone.trim();

    // Strict Validations (Requirements 3 & 4)
    if (!trimmedName) {
      setLeadError('Please provide your full name.');
      return;
    }

    const emailCheck = validateCandidateEmail(trimmedEmail);
    if (!emailCheck.isValid) {
      setLeadError(emailCheck.error || 'Please provide a valid email address.');
      return;
    }

    const mobileCheck = validateIndianMobile(trimmedPhone);
    if (!mobileCheck.isValid) {
      setLeadError(mobileCheck.error || 'Please provide a valid 10-digit mobile number.');
      return;
    }

    setLeadError(null);
    setIsSubmittingLead(true);

    try {
      // Step 1: Save or Update Candidate Profile with Verification fields (Persistent Recognition across applications)
      const localProfile = candidateProfileService.getLocalProfile();
      const isAlreadyVerified = Boolean(verificationOptions?.isVerified || localProfile?.email_verified);
      const verifiedTimestamp = verificationOptions?.verifiedAt || localProfile?.verified_at || (isAlreadyVerified ? new Date().toISOString() : null);

      console.log('[JobDetailsPage.handleSubmitLead] Step 1: Saving candidate profile in candidate_profiles...', {
        name: trimmedName,
        email: emailCheck.cleanEmail,
        mobile: mobileCheck.cleanNumber,
        resume_file_name: applicantResumeFileName,
        email_verified: isAlreadyVerified,
        verified_at: verifiedTimestamp,
      });

      const { data: profileData, error: profileErr } = await candidateProfileService.saveOrUpdateProfile({
        name: trimmedName,
        email: emailCheck.cleanEmail,
        mobile: mobileCheck.cleanNumber,
        resume_file_name: applicantResumeFileName || null,
        email_verified: isAlreadyVerified,
        verified_at: verifiedTimestamp,
        last_verified_at: isAlreadyVerified ? new Date().toISOString() : null,
      });

      if (profileErr || !profileData?.id) {
        const errorMsg = profileErr?.message || 'Failed to save candidate profile.';
        console.error('[JobDetailsPage.handleSubmitLead] ❌ Step 1 failed:', profileErr);
        setLeadError(`Submission error on candidate profile: ${errorMsg}`);
        setIsSubmittingLead(false);
        return;
      }

      console.log(`[JobDetailsPage.handleSubmitLead] ✅ Step 1 complete. Candidate Profile ID: ${profileData.id}`);

      // Step 2: Record Application with Unique Deduplication (job_id, candidate_profile_id)
      console.log('[JobDetailsPage.handleSubmitLead] Step 2: Logging application with deduplication check...', {
        candidate_id: profileData.id,
        job_id: job.id,
      });

      const { data: appData, hasAppliedBefore, appliedAt, error: appErr } = await candidateProfileService.recordApplication({
        jobId: job.id,
        candidateProfile: profileData,
        notes: `Applied from Mana Naukari direct portal (${new Date().toLocaleDateString()})`,
      });

      if (hasAppliedBefore) {
        console.warn('[JobDetailsPage.handleSubmitLead] ⚠️ Deduplication detected: Already applied on:', appliedAt);
        setHasAlreadyApplied(true);
        setAlreadyAppliedDate(appliedAt || new Date().toISOString());
        setLeadError('✓ You have already applied for this job.');
        setIsSubmittingLead(false);
        return;
      }

      if (appErr) {
        const errorMsg = appErr?.message || 'Failed to record application entry.';
        console.error('[JobDetailsPage.handleSubmitLead] ❌ Step 2 failed:', appErr);
        setLeadError(`Submission error on applicants table: ${errorMsg}`);
        setIsSubmittingLead(false);
        return;
      }

      console.log('[JobDetailsPage.handleSubmitLead] ✅ Step 2 complete. Application saved:', appData);

      // Step 3: Update local state & Show Success State
      setHasAlreadyApplied(true);
      setAlreadyAppliedDate(appliedAt || new Date().toISOString());
      setLeadSuccess(true);

      // Step 4: Open official company apply_link in a new tab
      setTimeout(() => {
        console.log('[JobDetailsPage.handleSubmitLead] Step 4: Opening official link:', job.apply_link);
        window.open(job.apply_link, '_blank', 'noopener,noreferrer');
        setIsApplyModalOpen(false);
        setLeadSuccess(false);
        setIsSubmittingLead(false);
      }, 1000);

    } catch (err: any) {
      console.error('[JobDetailsPage.handleSubmitLead] ❌ Unexpected error:', err);
      setLeadError(`Database error: ${err.message || 'An unexpected error occurred.'}`);
      setIsSubmittingLead(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-700 font-display">
          Loading verified job requisition from Supabase...
        </p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-xs">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold font-display text-slate-900">Job Not Found</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          {error || 'This vacancy may have concluded, expired, or been unlisted by the recruiter.'}
        </p>
        <button
          onClick={() => onNavigate('/jobs')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse Available Jobs</span>
        </button>
      </div>
    );
  }

  const skillsList = normalizeSkills(job.skills_required);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-16">
      
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('/jobs')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all jobs</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
            title="Copy job link to clipboard"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleShareJob}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700 transition-colors cursor-pointer shadow-2xs"
            title="Share job opening on WhatsApp, LinkedIn, Telegram, etc."
          >
            <Share2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Share Job</span>
          </button>
        </div>
      </div>

      {/* Main Job Hero Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          
          <div className="flex items-start gap-5">
            {/* 3. Company Logo / Initials */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-50 border border-blue-100/90 text-blue-700 font-display font-extrabold text-xl sm:text-2xl flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
              {job.company_logo ? (
                <img
                  src={job.company_logo}
                  alt={job.company}
                  className="w-full h-full object-contain p-2"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{job.company.substring(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* 1. Job Title */}
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                  {job.title}
                </h1>
                
                {/* Status Badges: Active, Paused, Expired */}
                {(!job.status || job.status === 'active') ? (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <span>🟢</span>
                    <span>Active</span>
                  </span>
                ) : job.status === 'paused' ? (
                  <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <span>🟡</span>
                    <span>Paused</span>
                  </span>
                ) : job.status === 'expired' ? (
                  <span className="text-xs font-bold text-rose-900 bg-rose-50 border border-rose-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <span>🔴</span>
                    <span>Expired</span>
                  </span>
                ) : null}

                {job.featured && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                    Featured
                  </span>
                )}
              </div>

              {/* Status Alert Banners: Paused & Expired Messages */}
              {hasAlreadyApplied && (
                <div className="mt-2.5 p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-start gap-3 text-emerald-950 shadow-2xs animate-fadeIn">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-xs sm:text-sm text-emerald-950">
                      ✓ You have already applied for this job.
                    </div>
                    <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed font-medium">
                      Application recorded on {alreadyAppliedDate ? new Date(alreadyAppliedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'recently'}. Your credentials and resume are under active consideration by {job.company}.
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex text-[11px] font-black bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full border border-emerald-300 shrink-0">
                    Applied ✓
                  </span>
                </div>
              )}

              {job.status === 'paused' && (
                <div className="mt-2.5 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-amber-900 shadow-2xs">
                  <span className="text-lg shrink-0">🟡</span>
                  <div>
                    <div className="font-bold text-xs sm:text-sm">Job Temporarily Unavailable</div>
                    <p className="text-xs text-amber-800 mt-0.5 leading-relaxed font-medium">
                      This job is temporarily unavailable.
                    </p>
                  </div>
                </div>
              )}

              {job.status === 'expired' && (
                <div className="mt-2.5 p-3.5 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-2.5 text-rose-900 shadow-2xs">
                  <span className="text-lg shrink-0">🔴</span>
                  <div>
                    <div className="font-bold text-xs sm:text-sm">Job Listing Expired</div>
                    <p className="text-xs text-rose-800 mt-0.5 leading-relaxed font-medium">
                      This job has expired. Applications are no longer being accepted.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Company Name */}
              <div className="flex items-center gap-2 text-sm sm:text-base text-slate-800 font-bold">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{job.company}</span>
                <CheckCircle2 className="w-4 h-4 text-blue-600 inline shrink-0" />
                {job.source && (
                  <>
                    <span className="text-slate-300 font-normal">·</span>
                    <span className="text-xs text-slate-500 font-normal">{job.source}</span>
                  </>
                )}
              </div>

              {/* Key metadata chips */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-600 pt-1">
                {/* 4. Location */}
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{job.location}</span>
                </div>

                {/* 6. Experience Required */}
                <div className="flex items-center gap-1.5 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{job.experience || 'Fresher'}</span>
                </div>

                {/* 5. Salary */}
                {job.salary && (
                  <div className="flex items-center gap-1 text-emerald-700 font-bold">
                    <IndianRupee className="w-3.5 h-3.5" />
                    <span>{job.salary.replace('₹', '')}</span>
                  </div>
                )}

                {/* 7. Job Type */}
                <div className="flex items-center gap-1.5 font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                  <span>{job.job_type}</span>
                </div>

                {/* 8. Category */}
                <div className="flex items-center gap-1.5 font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100/60">
                  <Tag className="w-3 h-3 text-blue-600" />
                  <span>{job.category}</span>
                </div>
              </div>

              {/* Dates */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                {/* 10. Posted Date */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Posted {job.posted_date}</span>
                </div>

                {/* 11. Expiry Date */}
                {job.expiry_date && (
                  <div className="flex items-center gap-1.5 text-rose-600 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Application Deadline: {job.expiry_date}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-3 shrink-0 pt-2 lg:pt-0">
            {hasAlreadyApplied ? (
              <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-2.5">
                <div className="text-right sm:text-left lg:text-right">
                  <div className="inline-flex items-center gap-1.5 py-2.5 px-5 text-sm font-bold text-emerald-900 bg-emerald-100 border-2 border-emerald-300 rounded-2xl shadow-none">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>✓ Already Applied</span>
                  </div>
                  {alreadyAppliedDate && (
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Application recorded on {new Date(alreadyAppliedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsReapplyModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl transition-colors cursor-pointer"
                  title="Open official employer application again"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Reapply</span>
                </button>
              </div>
            ) : (!job.status || job.status === 'active') ? (
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5">
                <button
                  onClick={handleApplyClick}
                  className="inline-flex items-center justify-center gap-2 py-3 px-7 text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 rounded-2xl shadow-md transition-all cursor-pointer btn-glow"
                >
                  <span>Apply Now</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsAtsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100/90 border border-indigo-200/80 rounded-2xl transition-all cursor-pointer shadow-2xs"
                  title="Check how your resume matches this job before applying"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Check ATS Match</span>
                </button>
              </div>
            ) : job.status === 'paused' ? (
              <button
                disabled
                className="inline-flex items-center justify-center gap-2 py-3 px-6 text-sm font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded-2xl cursor-not-allowed opacity-90 shadow-none"
                title="This job is temporarily unavailable."
              >
                <span>Applications Paused</span>
              </button>
            ) : (
              <button
                disabled
                className="inline-flex items-center justify-center gap-2 py-3 px-6 text-sm font-bold text-rose-800 bg-rose-100 border border-rose-300 rounded-2xl cursor-not-allowed opacity-90 shadow-none"
                title="This job has expired. Applications are no longer being accepted."
              >
                <span>Applications Closed</span>
              </button>
            )}

            <p className="text-[11px] text-slate-400 text-center lg:text-right font-medium">
              {(!job.status || job.status === 'active') 
                ? 'Verified official company portal' 
                : job.status === 'paused' 
                ? 'This job is temporarily unavailable.' 
                : 'Applications are no longer being accepted.'}
            </p>
          </div>

        </div>

        {/* 9. Skills Required */}
        {skillsList.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 mr-1">Skills Required:</span>
            {skillsList.map((skill, index) => (
              <span
                key={index}
                className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg transition-colors"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols): 12. Complete Job Description */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold font-display text-slate-900">
                Complete Job Description & Requirements
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed eligibility criteria, responsibilities, and qualifications
              </p>
            </div>

            {/* Formatted Description Body */}
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-sans space-y-4">
              {job.description}
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              {hasAlreadyApplied ? (
                <button
                  disabled
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 text-xs sm:text-sm font-bold text-emerald-900 bg-emerald-100 border-2 border-emerald-300 rounded-xl cursor-not-allowed opacity-95 shadow-none"
                  title="You have already applied for this job."
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>✓ You have already applied for this job</span>
                </button>
              ) : (!job.status || job.status === 'active') ? (
                <button
                  onClick={handleApplyClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer"
                >
                  <span>Apply on Official Website</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              ) : job.status === 'paused' ? (
                <button
                  disabled
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 text-xs sm:text-sm font-bold text-amber-900 bg-amber-100 border border-amber-300 rounded-xl cursor-not-allowed opacity-90 shadow-none"
                  title="This job is temporarily unavailable."
                >
                  <span>Applications Paused</span>
                </button>
              ) : (
                <button
                  disabled
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 text-xs sm:text-sm font-bold text-rose-900 bg-rose-100 border border-rose-300 rounded-xl cursor-not-allowed opacity-90 shadow-none"
                  title="This job has expired. Applications are no longer being accepted."
                >
                  <span>Applications Closed</span>
                </button>
              )}

              <button
                onClick={handleCopyLink}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Share Requisition</span>
              </button>
            </div>
          </div>

          {/* Related / Similar Category Jobs */}
          {relatedJobs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-display text-slate-900">
                    Similar Openings in {job.category}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Explore more active opportunities in this domain
                  </p>
                </div>
                <button
                  onClick={() => onNavigate(`/jobs?category=${encodeURIComponent(job.category)}`)}
                  className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedJobs.map((rJob) => (
                  <div
                    key={rJob.id}
                    onClick={() => onNavigate(`/jobs/${rJob.id}`)}
                    className="bg-white rounded-2xl border border-slate-200/90 p-5 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {rJob.job_type}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {rJob.posted_date}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors line-clamp-1">
                        {rJob.title}
                      </h4>

                      <div className="text-xs text-slate-600 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{rJob.company}</span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="line-clamp-1">{rJob.location}</span>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-700">
                        {rJob.salary || 'Competitive'}
                      </span>
                      <span className="text-blue-600 font-bold inline-flex items-center gap-1">
                        Details <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column (1 Col): Sidebar */}
        <div className="space-y-6">
          
          {/* Apply Card in Sidebar */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm font-display text-slate-900">
                {(!job.status || job.status === 'active') ? 'Ready to Apply?' : job.status === 'paused' ? 'Applications Paused' : 'Applications Expired'}
              </h3>
              {job.status === 'paused' ? (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Paused
                </span>
              ) : job.status === 'expired' ? (
                <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Expired
                </span>
              ) : null}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {(!job.status || job.status === 'active')
                ? `Verify your applicant details and redirect directly to ${job.company}'s official careers form.`
                : job.status === 'paused'
                ? 'This job is temporarily unavailable. Check back soon for updates.'
                : 'This job has expired. Applications are no longer being accepted.'}
            </p>

            {hasAlreadyApplied ? (
              <div className="space-y-2.5">
                <div className="w-full py-2.5 px-3 bg-emerald-100 border-2 border-emerald-300 rounded-xl text-center">
                  <div className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>✓ Already Applied</span>
                  </div>
                  {alreadyAppliedDate && (
                    <p className="text-[10px] text-emerald-800 font-medium mt-0.5">
                      Recorded on {new Date(alreadyAppliedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsReapplyModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                  title="Open official employer application again"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Reapply</span>
                </button>
              </div>
            ) : (!job.status || job.status === 'active') ? (
              <div className="space-y-2">
                <button
                  onClick={handleApplyClick}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <span>Apply Now</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsAtsModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Check ATS Match</span>
                </button>
              </div>
            ) : job.status === 'paused' ? (
              <button
                disabled
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-amber-800 bg-amber-100/90 border border-amber-200 rounded-xl cursor-not-allowed opacity-85"
                title="This job is temporarily unavailable."
              >
                <span>Apply Disabled (Paused)</span>
              </button>
            ) : (
              <button
                disabled
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-rose-800 bg-rose-100/90 border border-rose-200 rounded-xl cursor-not-allowed opacity-85"
                title="This job has expired. Applications are no longer being accepted."
              >
                <span>Apply Disabled (Expired)</span>
              </button>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Copy job link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                onClick={handleShareJob}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-colors cursor-pointer"
                title="Share this job"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Share Job</span>
              </button>
            </div>
          </div>

          {/* Job Overview Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4 text-xs">
            <h3 className="font-bold text-sm font-display text-slate-900 pb-2 border-b border-slate-100">
              Job Overview
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Employment Type</span>
                <span className="font-semibold text-slate-800">{job.job_type}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Discipline</span>
                <span className="font-semibold text-slate-800">{job.category}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Experience</span>
                <span className="font-semibold text-slate-800">{job.experience || 'Fresher'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Location</span>
                <span className="font-semibold text-slate-800 text-right max-w-[140px] truncate">
                  {job.location}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Offered Compensation</span>
                <span className="font-semibold text-emerald-700">{job.salary || 'Best in Industry'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Posted Date</span>
                <span className="font-semibold text-slate-800">{job.posted_date}</span>
              </div>

              {job.expiry_date && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Deadline</span>
                  <span className="font-semibold text-rose-600">{job.expiry_date}</span>
                </div>
              )}
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-3">
            <h3 className="font-bold text-sm font-display text-slate-900 pb-2 border-b border-slate-100">
              Company Information
            </h3>

            <div className="flex items-center gap-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                {job.company.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">
                  {job.company}
                </h4>
                <span className="text-[11px] text-slate-400">
                  {job.source || 'Enterprise Employer'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed pt-2">
              Apply directly through official hiring portals without intermediaries or agents.
            </p>
          </div>

          {/* Trust Elements Badges */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 font-display pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Mana Naukari Trust Guarantee</span>
            </h4>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Verified Jobs Badge:</span>
                <span className="text-slate-500">100% Genuine Requisition</span>
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Verified Recruiter Badge:</span>
                <span className="text-slate-500">Corporate HR Profile</span>
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-semibold">Official Career Link:</span>
                <span className="text-slate-500">Zero Middleman / No Fees</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 1. Apply Choice Modal (Option A: ATS Match vs Option B: Direct Apply) */}
      {job && (
        <ApplyChoiceModal
          isOpen={isChoiceModalOpen}
          onClose={() => setIsChoiceModalOpen(false)}
          job={job}
          onSelectCheckMatch={handleSelectCheckMatch}
          onSelectDirectApply={handleSelectDirectApply}
        />
      )}

      {/* 2. ATS Resume Matcher Modal (LinkedIn Premium style) */}
      {job && (
        <AtsResumeMatchModal
          isOpen={isAtsModalOpen}
          onClose={() => setIsAtsModalOpen(false)}
          job={job}
          initialApplicantName={applicantName}
          initialApplicantEmail={applicantEmail}
          initialApplicantPhone={applicantPhone}
          onContinueToApply={handleContinueFromAts}
        />
      )}

      {/* Candidate Apply Modal */}
      {job && (
        <ApplyModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          job={job}
          applicantName={applicantName}
          setApplicantName={setApplicantName}
          applicantEmail={applicantEmail}
          setApplicantEmail={setApplicantEmail}
          applicantPhone={applicantPhone}
          setApplicantPhone={setApplicantPhone}
          isSubmittingLead={isSubmittingLead}
          leadError={leadError}
          leadSuccess={leadSuccess}
          onSubmit={handleSubmitLead}
          initialResumeFileName={applicantResumeFileName}
          onProfileUpdated={(updatedProf) => {
            if (updatedProf.resume_file_name) setApplicantResumeFileName(updatedProf.resume_file_name);
          }}
          onReapply={() => {
            setIsApplyModalOpen(false);
            setIsReapplyModalOpen(true);
          }}
        />
      )}

      {/* Reapply Confirmation Modal */}
      {job && (
        <ReapplyConfirmModal
          isOpen={isReapplyModalOpen}
          onClose={() => setIsReapplyModalOpen(false)}
          onConfirmReapply={handleConfirmReapply}
          jobTitle={job.title}
          company={job.company}
          appliedDate={alreadyAppliedDate}
          isReapplying={isReapplying}
        />
      )}

      {/* Share Modal for WhatsApp, Telegram, LinkedIn, Email */}
      {job && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          jobTitle={job.title}
          company={job.company}
          jobUrlPath={generateJobUrlPath(job)}
          onCopiedToast={(msg) => setToastMessage(msg)}
        />
      )}

      {/* Copy link toast feedback */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />

    </div>
  );
};
