import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { recruiterService } from '../services/recruiterService';
import { 
  Recruiter, RecruiterJob, Applicant, 
  RecruiterVerificationStatus 
} from '../types/database.types';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, Briefcase, Users, FileText, CheckCircle2, 
  Clock, XCircle, AlertCircle, Upload, Plus, Edit3, Trash2, 
  Download, ExternalLink, Globe, Linkedin, Mail, Phone, 
  ShieldCheck, ShieldAlert, Sparkles, RefreshCw, X, Save, 
  Eye, Check, Search, TrendingUp, Calendar, ChevronRight,
  Bell, Lock
} from 'lucide-react';

interface RecruiterDashboardPageProps {
  onNavigate: (path: string) => void;
}

type TabType = 'overview' | 'jobs' | 'applicants' | 'profile' | 'notifications';

export const RecruiterDashboardPage: React.FC<RecruiterDashboardPageProps> = ({ onNavigate }) => {
  const { user, isAdmin } = useAuth();
  
  // Navigation / Tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Recruiter Session / Identity State
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null);
  const [recruiterEmailInput, setRecruiterEmailInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Recruiter Data
  const [myJobs, setMyJobs] = useState<(RecruiterJob & { applicantCount?: number })[]>([]);
  const [myApplicants, setMyApplicants] = useState<any[]>([]);

  // Verification & Profile Form State
  const [profileCompanyName, setProfileCompanyName] = useState('');
  const [profileRecruiterName, setProfileRecruiterName] = useState('');
  const [profileDesignation, setProfileDesignation] = useState('');
  const [profileMobile, setProfileMobile] = useState('');
  const [profileWebsite, setProfileWebsite] = useState('');
  const [profileGst, setProfileGst] = useState('');
  const [profileLogoUrl, setProfileLogoUrl] = useState('');
  const [profileDocUrl, setProfileDocUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Job Creation / Editing Modal State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<RecruiterJob | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobLocation, setJobLocation] = useState('Hyderabad');
  const [jobSalary, setJobSalary] = useState('₹3.5 - 5.5 LPA');
  const [jobExperience, setJobExperience] = useState('Fresher');
  const [jobType, setJobType] = useState('Full Time');
  const [jobCategory, setJobCategory] = useState('Software Engineering');
  const [jobDescription, setJobDescription] = useState('');
  const [jobApplyLink, setJobApplyLink] = useState('');
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [jobTouched, setJobTouched] = useState<Record<string, boolean>>({});

  // Safety watchdog: prevent isSavingJob from permanently disabling the Publish button
  useEffect(() => {
    if (isSavingJob) {
      const timer = setTimeout(() => {
        console.warn('[Create Job Opening] Safety watchdog reset isSavingJob state after timeout.');
        setIsSavingJob(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isSavingJob]);

  // Production-grade validation for all 8 required fields
  const jobValidation = useMemo(() => {
    const errors: Record<string, string> = {};
    const missingFields: string[] = [];

    // 1. Job Title
    const trimmedTitle = jobTitle.trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      errors.jobTitle = 'Job Title is required (min 3 characters)';
      missingFields.push('Job Title');
    }

    // 2. Location
    const trimmedLocation = jobLocation.trim();
    if (!trimmedLocation || trimmedLocation.length < 2) {
      errors.jobLocation = 'Location is required (min 2 characters)';
      missingFields.push('Location');
    }

    // 3. Salary
    const trimmedSalary = jobSalary.trim();
    if (!trimmedSalary || trimmedSalary.length < 2) {
      errors.jobSalary = 'Salary is required (e.g. ₹3.5 - 5.5 LPA or Best in Industry)';
      missingFields.push('Salary');
    }

    // 4. Job Type
    const trimmedType = jobType.trim();
    if (!trimmedType) {
      errors.jobType = 'Job Type selection is required';
      missingFields.push('Job Type');
    }

    // 5. Experience
    const trimmedExp = jobExperience.trim();
    if (!trimmedExp) {
      errors.jobExperience = 'Experience requirement is required (e.g. Fresher)';
      missingFields.push('Experience');
    }

    // 6. Category
    const trimmedCat = jobCategory.trim();
    if (!trimmedCat) {
      errors.jobCategory = 'Category is required';
      missingFields.push('Category');
    }

    // 7. Official Application Link
    const trimmedLink = jobApplyLink.trim();
    if (!trimmedLink) {
      errors.jobApplyLink = 'Official Application Link is required';
      missingFields.push('Official Application Link');
    } else {
      const isValidProtocol = /^https?:\/\/.+/i.test(trimmedLink);
      if (!isValidProtocol) {
        errors.jobApplyLink = 'Link must start with http:// or https://';
        missingFields.push('Official Application Link (URL format)');
      }
    }

    // 8. Job Description
    const trimmedDesc = jobDescription.trim();
    if (!trimmedDesc || trimmedDesc.length < 15) {
      errors.jobDescription = 'Job Description is required (min 15 characters)';
      missingFields.push('Job Description');
    }

    const isValid = Object.keys(errors).length === 0;

    const currentFormData = {
      title: jobTitle,
      location: jobLocation,
      salary: jobSalary,
      jobType,
      experience: jobExperience,
      category: jobCategory,
      applyLink: jobApplyLink,
      description: jobDescription,
    };

    // Requirement 1 & 7: Log formData, validation result, and disabled reason to browser console
    console.log('[Create Job Opening] formData:', currentFormData);
    console.log('[Create Job Opening] validation result:', {
      isValid,
      missingFields,
      errors,
    });

    if (!isValid || isSavingJob) {
      const disabledReason = isSavingJob
        ? 'Submission currently in progress (isSavingJob: true)'
        : `Validation incomplete. Missing or invalid field(s): ${missingFields.join(', ')}`;
      console.warn('[Create Job Opening] submit button disabled reason:', disabledReason, errors);
    } else {
      console.log('[Create Job Opening] submit button is ENABLED. All 8 required fields are valid.');
    }

    return { isValid, errors, missingFields };
  }, [
    jobTitle,
    jobLocation,
    jobSalary,
    jobType,
    jobExperience,
    jobCategory,
    jobApplyLink,
    jobDescription,
    isSavingJob,
  ]);

  const setFieldTouched = (fieldName: string) => {
    setJobTouched((prev) => ({ ...prev, [fieldName]: true }));
  };

  // Admin Verification Control Action State
  const [adminSelectedRecruiterId, setAdminSelectedRecruiterId] = useState<string | null>(null);
  const [adminActionStatus, setAdminActionStatus] = useState<string | null>(null);
  const [isProcessingAdminAction, setIsProcessingAdminAction] = useState(false);

  // Applicants Search & Filters
  const [applicantSearch, setApplicantSearch] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Load: Fetch or identify current recruiter
  const loadRecruiterData = async (targetEmail?: string) => {
    setLoading(true);
    try {
      const emailToUse = targetEmail || user?.email || localStorage.getItem('mana_recruiter_email') || '';

      if (emailToUse) {
        setRecruiterEmailInput(emailToUse);
        const { data: foundRecruiter, error } = await recruiterService.getRecruiterByEmail(emailToUse);
        
        if (foundRecruiter) {
          setRecruiter(foundRecruiter);
          localStorage.setItem('mana_recruiter_email', foundRecruiter.official_email || foundRecruiter.email || '');

          // Populate profile edit form
          setProfileCompanyName(foundRecruiter.company_name || '');
          setProfileRecruiterName(foundRecruiter.name || foundRecruiter.recruiter_name || '');
          setProfileDesignation(foundRecruiter.designation || '');
          setProfileMobile(foundRecruiter.mobile_number || foundRecruiter.phone_number || '');
          setProfileWebsite(foundRecruiter.company_website || '');
          setProfileGst(foundRecruiter.gst_number || '');
          setProfileLogoUrl(foundRecruiter.company_logo || '');
          setProfileDocUrl(foundRecruiter.registration_doc_url || '');

          // Fetch recruiter's jobs
          const { data: jobs } = await recruiterService.getJobsByRecruiter(foundRecruiter.id);
          setMyJobs(jobs || []);

          // Fetch recruiter's applicants
          const { data: applicants } = await recruiterService.getApplicantsForRecruiter(foundRecruiter.id);
          setMyApplicants(applicants || []);
        } else {
          setRecruiter(null);
        }
      }
    } catch (err) {
      console.error('[RecruiterDashboard] Error loading recruiter data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecruiterData();
  }, [user]);

  // Handle Switch / Login as Recruiter
  const handleRecruiterLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recruiterEmailInput.trim()) return;
    loadRecruiterData(recruiterEmailInput.trim());
  };

  // Profile Save / Document Upload
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recruiter) return;

    setIsSavingProfile(true);
    try {
      const updates: Partial<Recruiter> = {
        name: profileRecruiterName.trim(),
        recruiter_name: profileRecruiterName.trim(),
        designation: profileDesignation.trim() || null,
        company_name: profileCompanyName.trim(),
        mobile_number: profileMobile.trim(),
        phone_number: profileMobile.trim(),
        company_website: profileWebsite.trim(),
        gst_number: profileGst.trim() || null,
        company_logo: profileLogoUrl || null,
        registration_doc_url: profileDocUrl || null,
        // If documents are attached and status is not verified, set to pending for review
        verification_status: recruiter.is_verified ? recruiter.verification_status : 'Pending',
      };

      const { data, error } = await recruiterService.updateRecruiterProfile(recruiter.id, updates);
      if (error || !data) {
        showToast(error?.message || 'Failed to update profile');
      } else {
        setRecruiter(data);
        showToast('Company profile & verification documents saved!');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error saving profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Upload Logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const { url, error } = await recruiterService.uploadVerificationDocument(file, 'company_logos');
      if (error || !url) {
        showToast(`Logo upload failed: ${error || 'Storage error'}`);
      } else {
        setProfileLogoUrl(url);
        showToast('Company logo uploaded successfully');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error uploading logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Upload Registration Certificate / Doc
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      const { url, error } = await recruiterService.uploadVerificationDocument(file, 'company_certificates');
      if (error || !url) {
        showToast(`Document upload failed: ${error || 'Storage error'}`);
      } else {
        setProfileDocUrl(url);
        showToast('Company registration certificate uploaded');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error uploading document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Job Edit / Save Modal Handler
  const handleOpenEditJob = (job?: RecruiterJob) => {
    // Reset saving and touched state immediately to prevent sticky loading or validation states
    setIsSavingJob(false);
    setJobTouched({});

    if (job) {
      setEditingJob(job);
      setJobTitle(job.title || '');
      setJobLocation(job.location || 'Hyderabad');
      setJobSalary(job.salary || '₹3.5 - 5.5 LPA');
      setJobExperience(job.experience || 'Fresher');
      setJobType(job.job_type || 'Full Time');
      setJobCategory(job.category || 'Software Engineering');
      setJobDescription(job.description || '');
      setJobApplyLink(job.apply_link || '');
    } else {
      setEditingJob(null);
      setJobTitle('');
      setJobLocation('Hyderabad');
      setJobSalary('₹3.5 - 5.5 LPA');
      setJobExperience('Fresher');
      setJobType('Full Time');
      setJobCategory('Software Engineering');
      setJobDescription('We are hiring for this role. Candidates will collaborate with engineering teams on core projects and build scalable solutions.');
      setJobApplyLink('');
    }
    setIsJobModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Production-ready validation audit check
    if (!jobValidation.isValid) {
      console.warn('[Create Job Opening] Submission blocked. Active validation errors:', jobValidation.errors);
      showToast(`Cannot publish requisition: Please fill required field(s) - ${jobValidation.missingFields.join(', ')}`);
      
      // Mark all fields as touched to display inline errors
      setJobTouched({
        jobTitle: true,
        jobLocation: true,
        jobSalary: true,
        jobType: true,
        jobExperience: true,
        jobCategory: true,
        jobApplyLink: true,
        jobDescription: true,
      });
      return;
    }

    // 2. Resolve or fallback active recruiter identity so submission is never silently discarded
    let activeRecruiter: Recruiter | null = recruiter;
    if (!activeRecruiter) {
      const emailToLookup = recruiterEmailInput.trim() || user?.email || localStorage.getItem('mana_recruiter_email') || '';
      if (emailToLookup) {
        const { data: lookedUp } = await recruiterService.getRecruiterByEmail(emailToLookup);
        if (lookedUp) {
          activeRecruiter = lookedUp;
          setRecruiter(lookedUp);
        }
      }
    }

    setIsSavingJob(true);
    try {
      if (editingJob) {
        // Update existing job
        const updates: Partial<RecruiterJob> = {
          title: jobTitle.trim(),
          location: jobLocation.trim(),
          salary: jobSalary.trim() || 'Best in Industry',
          experience: jobExperience.trim() || 'Fresher',
          job_type: jobType,
          category: jobCategory,
          description: jobDescription.trim(),
          apply_link: jobApplyLink.trim(),
        };

        const { success, error } = await recruiterService.updateRecruiterJob(editingJob.id, updates);
        if (!success || error) {
          showToast(error?.message || 'Failed to update job');
        } else {
          showToast('Job updated successfully');
          setIsJobModalOpen(false);
          if (activeRecruiter?.official_email) {
            loadRecruiterData(activeRecruiter.official_email);
          }
        }
      } else {
        // Create new job requisition
        if (activeRecruiter?.id) {
          // Direct create job for existing recruiter
          const newJobData: Partial<RecruiterJob> = {
            title: jobTitle.trim(),
            company: activeRecruiter.company_name,
            company_name: activeRecruiter.company_name,
            company_logo: activeRecruiter.company_logo || null,
            location: jobLocation.trim(),
            salary: jobSalary.trim() || 'Best in Industry',
            experience: jobExperience.trim() || 'Fresher',
            job_type: jobType,
            category: jobCategory,
            description: jobDescription.trim(),
            apply_link: jobApplyLink.trim(),
            status: 'pending_review',
            verification_status: 'pending',
          };

          const { success, error } = await recruiterService.createRecruiterJob(activeRecruiter.id, newJobData);
          if (!success || error) {
            showToast(error?.message || 'Failed to submit job');
          } else {
            showToast('Job requisition published and submitted for review!');
            setIsJobModalOpen(false);
            loadRecruiterData(activeRecruiter.official_email);
          }
        } else {
          // Fallback: auto-register recruiter and job together
          const fallbackEmail = user?.email || localStorage.getItem('mana_recruiter_email') || 'recruiter@company.com';
          const fallbackCompany = profileCompanyName.trim() || 'Verified Employer';
          const payload = {
            name: profileRecruiterName.trim() || user?.user_metadata?.name || 'Talent Acquisition Team',
            official_email: fallbackEmail,
            mobile_number: profileMobile.trim() || '+91 9876543210',
            company_name: fallbackCompany,
            company_website: profileWebsite.trim() || 'https://company.com',
            linkedin_profile: 'https://linkedin.com/company/careers',
            title: jobTitle.trim(),
            location: jobLocation.trim(),
            salary: jobSalary.trim() || 'Best in Industry',
            experience: jobExperience.trim() || 'Fresher',
            job_type: jobType,
            category: jobCategory,
            description: jobDescription.trim(),
            apply_link: jobApplyLink.trim(),
          };

          const { success, error, recruiter: registeredRecruiter } = await recruiterService.submitRecruiterJob(payload);
          if (!success || error) {
            showToast(error?.message || 'Failed to submit job');
          } else {
            showToast('Job requisition published and submitted for review!');
            setIsJobModalOpen(false);
            if (registeredRecruiter) {
              setRecruiter(registeredRecruiter);
              loadRecruiterData(registeredRecruiter.official_email);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[Recruiter Dashboard] Error saving job requisition:', err);
      showToast(err?.message || 'Error processing job submission');
    } finally {
      setIsSavingJob(false);
    }
  };

  // Delete Job Handler
  const handleDeleteJob = async (jobId: string | number, title: string) => {
    if (!confirm(`Are you sure you want to delete the job posting "${title}"?`)) return;
    try {
      const { success, error } = await recruiterService.deleteRecruiterJob(jobId);
      if (success) {
        setMyJobs((prev) => prev.filter((j) => String(j.id) !== String(jobId)));
        showToast(`Job "${title}" deleted`);
      } else {
        showToast(error?.message || 'Failed to delete job');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error deleting job');
    }
  };

  // Admin Verification Controls Handler
  const handleAdminVerifyStatus = async (status: 'Verified' | 'Rejected' | 'Suspended') => {
    if (!recruiter) return;
    setIsProcessingAdminAction(true);
    try {
      const { success, error } = await recruiterService.setRecruiterVerificationStatus(
        recruiter.id,
        status,
        status === 'Rejected' ? 'Company documents do not meet verification criteria.' : undefined
      );

      if (success) {
        setRecruiter((prev: Recruiter | null) => prev ? { ...prev, verification_status: status, is_verified: status === 'Verified' } : null);
        showToast(`Recruiter account marked as ${status}`);
      } else {
        showToast(error?.message || 'Admin action failed');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating status');
    } finally {
      setIsProcessingAdminAction(false);
    }
  };

  // 5. Dashboard Analytics Cards Computations
  const stats = useMemo(() => {
    const activeJobs = myJobs.filter((j) => j.status === 'Approved' || j.status === 'approved').length;
    const totalApplications = myApplicants.length;
    
    // Jobs posted this month
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const jobsThisMonth = myJobs.filter((j) => {
      const t = new Date(j.created_at || Date.now()).getTime();
      return t >= thirtyDaysAgo;
    }).length;

    // Simulated profile views (based on total active requisitions & applicant interactions)
    const profileViews = (activeJobs * 24) + (totalApplications * 4) + 12;

    return {
      activeJobs,
      totalApplications,
      jobsThisMonth,
      profileViews,
    };
  }, [myJobs, myApplicants]);

  // Notifications List Computations
  const notifications = useMemo(() => {
    const list: { id: string; type: 'approved' | 'rejected' | 'application' | 'info'; title: string; time: string; text: string }[] = [];

    // Recruiter Verification Status Notification
    if (recruiter?.verification_status === 'Verified') {
      list.push({
        id: 'notif_rec_verified',
        type: 'approved',
        title: 'Company Account Verified',
        time: recruiter.verified_at ? new Date(recruiter.verified_at).toLocaleDateString() : 'Active',
        text: 'Your company verification has been approved. You can post and publish jobs publicly.',
      });
    } else if (recruiter?.verification_status === 'Rejected') {
      list.push({
        id: 'notif_rec_rejected',
        type: 'rejected',
        title: 'Company Verification Incomplete',
        time: 'Action Required',
        text: recruiter.rejection_reason || 'Please re-upload your company registration certificate or GST.',
      });
    }

    // Job approvals / rejections
    myJobs.forEach((job) => {
      if (job.status === 'Approved' || job.status === 'approved') {
        list.push({
          id: `job_appr_${job.id}`,
          type: 'approved',
          title: `Job Approved: ${job.title}`,
          time: job.reviewed_at ? new Date(job.reviewed_at).toLocaleDateString() : 'Live',
          text: `Your requisition "${job.title}" has been reviewed by admins and is now live on Mana Naukari.`,
        });
      } else if (job.status === 'Rejected' || job.status === 'rejected') {
        list.push({
          id: `job_rej_${job.id}`,
          type: 'rejected',
          title: `Job Rejected: ${job.title}`,
          time: 'Reviewed',
          text: job.rejection_reason || 'Requisition was declined due to missing verification requirements.',
        });
      }
    });

    // Recent applications notifications
    myApplicants.slice(0, 5).forEach((app) => {
      list.push({
        id: `app_rec_${app.id}`,
        type: 'application',
        title: `New Candidate Application Received`,
        time: app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Recent',
        text: `${app.visitor?.name || 'A candidate'} submitted an application for ${app.job?.title || 'your job opening'}.`,
      });
    });

    return list;
  }, [recruiter, myJobs, myApplicants]);

  // Normalized Verification Status Badge
  const getVerificationBadge = (status?: string, isVerified?: boolean) => {
    const s = (status || '').toLowerCase();
    if (isVerified || s === 'verified') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified Recruiter</span>
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Verification Rejected</span>
        </span>
      );
    }
    if (s === 'suspended') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
          <span>Account Suspended</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        <span>Verification Pending</span>
      </span>
    );
  };

  // Filtered applicants for the search box
  const filteredApplicants = useMemo(() => {
    if (!applicantSearch.trim()) return myApplicants;
    const q = applicantSearch.toLowerCase().trim();
    return myApplicants.filter((app) => {
      const name = (app.visitor?.name || '').toLowerCase();
      const email = (app.visitor?.email || '').toLowerCase();
      const phone = (app.visitor?.phone || '').toLowerCase();
      const job = (app.job?.title || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || job.includes(q);
    });
  }, [myApplicants, applicantSearch]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header / Portal Banner */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {recruiter?.company_logo ? (
              <img
                src={recruiter.company_logo}
                alt={recruiter.company_name}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200 bg-white p-1 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-2xl font-display shrink-0 shadow-xs">
                {recruiter?.company_name?.charAt(0).toUpperCase() || 'M'}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900">
                  {recruiter?.company_name || 'Recruiter Portal'}
                </h1>
                {recruiter && getVerificationBadge(recruiter.verification_status, recruiter.is_verified)}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>{recruiter?.name || 'Talent Acquisition'}</span>
                <span>•</span>
                <span>{recruiter?.official_email || 'Sign in with your official company email'}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenEditJob()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Requisition</span>
            </button>

            <button
              onClick={() => loadRecruiterData(recruiter?.official_email)}
              disabled={refreshing || loading}
              className="p-2.5 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh recruiter dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs sm:text-sm font-semibold py-3 px-5 rounded-2xl shadow-xl border border-slate-700 animate-slideUp flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Recruiter Email Switch / Quick Lookup Bar */}
        {!recruiter && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-6 sm:p-8 shadow-sm text-center max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Access Your Recruiter Account</h3>
              <p className="text-xs text-blue-100 mt-1">
                Enter your official company email to view your posted jobs, candidate applications, and company verification status.
              </p>
            </div>
            <form onSubmit={handleRecruiterLogin} className="flex gap-2 max-w-md mx-auto">
              <input
                type="email"
                required
                placeholder="recruiter@company.com"
                value={recruiterEmailInput}
                onChange={(e) => setRecruiterEmailInput(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs text-slate-900 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl cursor-pointer"
              >
                Access
              </button>
            </form>
            <div className="pt-2 text-[11px] text-blue-200">
              New hiring partner?{' '}
              <button
                onClick={() => onNavigate('/post-job')}
                className="text-white underline font-semibold cursor-pointer"
              >
                Register & post your first job
              </button>
            </div>
          </div>
        )}

        {/* Recruiter Logged In Content */}
        {recruiter && (
          <>
            {/* 7. Admin Controls Banner (Visible to platform administrators) */}
            {isAdmin && (
              <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                      Mana Naukari Admin Control
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      Manage Verification Status for {recruiter.company_name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Current Status: <span className="font-semibold text-slate-200">{recruiter.verification_status || 'Pending'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    disabled={isProcessingAdminAction}
                    onClick={() => handleAdminVerifyStatus('Verified')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Verify Recruiter
                  </button>
                  <button
                    disabled={isProcessingAdminAction}
                    onClick={() => handleAdminVerifyStatus('Rejected')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Reject Verification
                  </button>
                  <button
                    disabled={isProcessingAdminAction}
                    onClick={() => handleAdminVerifyStatus('Suspended')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Suspend Account
                  </button>
                </div>
              </div>
            )}

            {/* 5. Dashboard Analytics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Active Jobs */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <span>Active Jobs</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black font-display text-slate-900 mt-2">
                  {stats.activeJobs}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Published live on portal
                </div>
              </div>

              {/* Card 2: Total Applications */}
              <div className="bg-white border border-indigo-200/80 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-indigo-600 font-bold uppercase tracking-wider">
                  <span>Total Applicants</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black font-display text-indigo-700 mt-2">
                  {stats.totalApplications}
                </div>
                <div className="text-[11px] text-indigo-600/80 mt-1">
                  Received across your openings
                </div>
              </div>

              {/* Card 3: Jobs Posted This Month */}
              <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-emerald-700 font-bold uppercase tracking-wider">
                  <span>Posted This Month</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black font-display text-emerald-700 mt-2">
                  {stats.jobsThisMonth}
                </div>
                <div className="text-[11px] text-emerald-600/80 mt-1">
                  Past 30 calendar days
                </div>
              </div>

              {/* Card 4: Profile & Job Views */}
              <div className="bg-white border border-purple-200/80 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-purple-700 font-bold uppercase tracking-wider">
                  <span>Profile Impressions</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black font-display text-purple-700 mt-2">
                  {stats.profileViews}
                </div>
                <div className="text-[11px] text-purple-600/80 mt-1">
                  Candidate job impressions
                </div>
              </div>

            </div>

            {/* Navigation Tab Bar */}
            <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold overflow-x-auto pb-px">
              {[
                { key: 'overview', label: 'Dashboard Overview', icon: Briefcase },
                { key: 'jobs', label: `My Jobs (${myJobs.length})`, icon: FileText },
                { key: 'applicants', label: `My Applicants (${myApplicants.length})`, icon: Users },
                { key: 'profile', label: 'Company Profile & Verification', icon: ShieldCheck },
                { key: 'notifications', label: `Notifications (${notifications.length})`, icon: Bell },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as TabType)}
                    className={`inline-flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition-colors cursor-pointer shrink-0 ${
                      isActive
                        ? 'border-blue-600 text-blue-600 bg-white/60 rounded-t-xl'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: OVERVIEW / RECENT JOBS & APPLICANTS PREVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Verification Notice Banner if Pending */}
                {!recruiter.is_verified && (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-3xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-amber-900">
                        Company Verification In Progress
                      </h4>
                      <p className="text-xs text-amber-800/80 mt-1">
                        Only verified recruiters can publish jobs publicly to candidates on Mana Naukari. Upload your Company Registration Certificate or GST number in the Company Profile tab to expedite review.
                      </p>
                      <button
                        onClick={() => setActiveTab('profile')}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-900 hover:underline cursor-pointer"
                      >
                        <span>Complete Company Verification</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* My Active Jobs Section */}
                <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold font-display text-slate-900">Recent Postings</h3>
                      <p className="text-xs text-slate-500">Manage requisitions submitted from your company account</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <span>View All Jobs</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {myJobs.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500">No jobs posted yet.</p>
                      <button
                        onClick={() => handleOpenEditJob()}
                        className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl cursor-pointer"
                      >
                        Post Your First Requisition
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {myJobs.slice(0, 4).map((job) => (
                        <div key={job.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-900">{job.title}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                job.status === 'Approved' || job.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : job.status === 'Rejected' || job.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}>
                                {job.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-3">
                              <span>{job.location}</span>
                              <span>•</span>
                              <span>{job.category}</span>
                              <span>•</span>
                              <span>{job.applicantCount || 0} Applicants</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditJob(job)}
                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                              title="Edit Requisition"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteJob(job.id, job.title)}
                              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Delete Requisition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Applicants Section */}
                <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold font-display text-slate-900">Recent Applications</h3>
                      <p className="text-xs text-slate-500">Candidates who applied directly to your jobs</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('applicants')}
                      className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <span>View All Applicants</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {myApplicants.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No applications received yet for your active requisitions.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {myApplicants.slice(0, 5).map((app) => (
                        <div key={app.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                          <div>
                            <div className="font-bold text-sm text-slate-900">{app.visitor?.name || 'Anonymous Candidate'}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{app.visitor?.email}</span>
                              <span>•</span>
                              <span>{app.visitor?.phone}</span>
                              <span>•</span>
                              <span className="text-blue-600 font-semibold">{app.job?.title}</span>
                            </div>
                          </div>

                          {(app.resume_url || app.visitor?.resume_url) && (
                            <a
                              href={app.resume_url || app.visitor?.resume_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Resume</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: MY JOBS */}
            {activeTab === 'jobs' && (
              <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold font-display text-slate-900">Job Requisitions</h3>
                    <p className="text-xs text-slate-500">All requisitions created by {recruiter.company_name}</p>
                  </div>
                  <button
                    onClick={() => handleOpenEditJob()}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Job</span>
                  </button>
                </div>

                {myJobs.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    No jobs posted yet. Click "Create Job" to submit your opening.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="py-3.5 px-4 sm:px-6">Job Title</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4">Applications</th>
                          <th className="py-3.5 px-4">Posted Date</th>
                          <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {myJobs.map((job) => (
                          <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-4 px-4 sm:px-6">
                              <div className="font-bold text-slate-900 text-sm">{job.title}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{job.location} • {job.job_type}</div>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                job.status === 'Approved' || job.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : job.status === 'Rejected' || job.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {job.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-semibold text-slate-800">
                              {job.applicantCount || 0} candidates
                            </td>
                            <td className="py-4 px-4 text-slate-500">
                              {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Recent'}
                            </td>
                            <td className="py-4 px-4 sm:px-6 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditJob(job)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteJob(job.id, job.title)}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: APPLICANT MANAGEMENT */}
            {activeTab === 'applicants' && (
              <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden space-y-4">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold font-display text-slate-900">Applicant Pipeline</h3>
                    <p className="text-xs text-slate-500">
                      Applications received exclusively for {recruiter.company_name} requisitions
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search applicants..."
                      value={applicantSearch}
                      onChange={(e) => setApplicantSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {filteredApplicants.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    No candidate applications match your query.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="py-3.5 px-4 sm:px-6">Candidate Name</th>
                          <th className="py-3.5 px-4">Contact (Email &amp; Phone)</th>
                          <th className="py-3.5 px-4">Applied Job Title</th>
                          <th className="py-3.5 px-4">Resume File</th>
                          <th className="py-3.5 px-4 sm:px-6 text-right">Applied Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredApplicants.map((app) => (
                          <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-4 px-4 sm:px-6 font-bold text-slate-900">
                              {app.visitor?.name || 'Anonymous Candidate'}
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-slate-800 font-medium">{app.visitor?.email}</div>
                              <div className="text-[11px] text-slate-400">{app.visitor?.phone}</div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-semibold text-slate-800">{app.job?.title}</span>
                            </td>
                            <td className="py-4 px-4">
                              {(app.resume_url || app.visitor?.resume_url) ? (
                                <a
                                  href={app.resume_url || app.visitor?.resume_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download</span>
                                </a>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">No file</span>
                              )}
                            </td>
                            <td className="py-4 px-4 sm:px-6 text-right text-slate-500">
                              {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Recent'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: RECRUITER PROFILE & COMPANY VERIFICATION */}
            {activeTab === 'profile' && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs max-w-3xl space-y-6">
                <div>
                  <h3 className="text-lg font-bold font-display text-slate-900">
                    Company Profile &amp; Verification Documents
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload official company documents to verify your business and unlock public job broadcasting.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Company Name</label>
                      <input
                        type="text"
                        required
                        value={profileCompanyName}
                        onChange={(e) => setProfileCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Recruiter Name</label>
                      <input
                        type="text"
                        required
                        value={profileRecruiterName}
                        onChange={(e) => setProfileRecruiterName(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Designation / Role</label>
                      <input
                        type="text"
                        placeholder="e.g. HR Manager / Talent Acquisition"
                        value={profileDesignation}
                        onChange={(e) => setProfileDesignation(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                      <input
                        type="email"
                        disabled
                        value={recruiter.official_email}
                        className="w-full px-3.5 py-2 text-xs border border-slate-200 bg-slate-100 rounded-xl text-slate-500 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        required
                        value={profileMobile}
                        onChange={(e) => setProfileMobile(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Company Website</label>
                      <input
                        type="url"
                        value={profileWebsite}
                        onChange={(e) => setProfileWebsite(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Company GST Number (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 29ABCDE1234F1Z5"
                        value={profileGst}
                        onChange={(e) => setProfileGst(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 2. Documents Upload (GST / Registration Certificate / Logo) */}
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Company Verification Documents
                    </h4>

                    {/* Company Logo Upload */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {profileLogoUrl ? (
                          <img src={profileLogoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-white border p-1" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                            <Building2 className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">Company Logo</span>
                          <span className="text-[11px] text-slate-500">PNG, JPG or WebP up to 5MB</span>
                        </div>
                      </div>

                      <label className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer shadow-2xs">
                        <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    </div>

                    {/* Company Registration Certificate */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">
                            Company Registration Certificate / MCA / CIN
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {profileDocUrl ? 'Certificate uploaded & linked' : 'PDF, DOC, or image showing registered entity'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {profileDocUrl && (
                          <a
                            href={profileDocUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 rounded-xl text-xs font-bold text-blue-600 hover:underline"
                          >
                            View Document
                          </a>
                        )}
                        <label className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer shadow-2xs">
                          <span>{isUploadingDoc ? 'Uploading...' : 'Upload Certificate'}</span>
                          <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={handleDocUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingProfile ? 'Saving Profile...' : 'Save & Submit for Verification'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 5: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs max-w-3xl space-y-4">
                <div>
                  <h3 className="text-base font-bold font-display text-slate-900">Activity Notifications</h3>
                  <p className="text-xs text-slate-500">Real-time alerts regarding approvals, reviews, and applications</p>
                </div>

                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No new notifications right now.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                          n.type === 'approved'
                            ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950'
                            : n.type === 'rejected'
                            ? 'bg-rose-50/50 border-rose-200/80 text-rose-950'
                            : 'bg-blue-50/50 border-blue-200/80 text-blue-950'
                        }`}
                      >
                        <div className="mt-0.5">
                          {n.type === 'approved' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : n.type === 'rejected' ? (
                            <XCircle className="w-5 h-5 text-rose-600" />
                          ) : (
                            <Bell className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs">{n.title}</h4>
                            <span className="text-[10px] text-slate-500">{n.time}</span>
                          </div>
                          <p className="text-xs mt-0.5 text-slate-600">{n.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>

      {/* Post / Edit Job Modal */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold font-display text-slate-900">
                  {editingJob ? 'Edit Requisition' : 'Create Job Opening'}
                </h3>
                <p className="text-xs text-slate-500">
                  {recruiter?.company_name} • Candidate applications will flow directly to your dashboard
                </p>
              </div>
              <button
                onClick={() => setIsJobModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="space-y-4">
              {/* 1. Job Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Job Title <span className="text-rose-500">*</span>
                  </label>
                  {jobTouched.jobTitle && jobValidation.errors.jobTitle && (
                    <span className="text-[11px] text-rose-600 font-semibold">{jobValidation.errors.jobTitle}</span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Associate Software Engineer (2025 Batch)"
                  value={jobTitle}
                  onBlur={() => setFieldTouched('jobTitle')}
                  onChange={(e) => {
                    setJobTitle(e.target.value);
                    setFieldTouched('jobTitle');
                  }}
                  className={`w-full px-3.5 py-2 text-xs border rounded-xl focus:outline-none transition-colors ${
                    jobTouched.jobTitle && jobValidation.errors.jobTitle
                      ? 'border-rose-300 bg-rose-50/30 focus:ring-2 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-600'
                  }`}
                />
              </div>

              {/* 2 & 3. Location and Salary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Location <span className="text-rose-500">*</span>
                    </label>
                    {jobTouched.jobLocation && jobValidation.errors.jobLocation && (
                      <span className="text-[11px] text-rose-600 font-semibold">{jobValidation.errors.jobLocation}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hyderabad / Remote / Bengaluru"
                    value={jobLocation}
                    onBlur={() => setFieldTouched('jobLocation')}
                    onChange={(e) => {
                      setJobLocation(e.target.value);
                      setFieldTouched('jobLocation');
                    }}
                    className={`w-full px-3.5 py-2 text-xs border rounded-xl focus:outline-none transition-colors ${
                      jobTouched.jobLocation && jobValidation.errors.jobLocation
                        ? 'border-rose-300 bg-rose-50/30 focus:ring-2 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-600'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Salary <span className="text-rose-500">*</span>
                    </label>
                    {jobTouched.jobSalary && jobValidation.errors.jobSalary && (
                      <span className="text-[11px] text-rose-600 font-semibold">{jobValidation.errors.jobSalary}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ₹3.5 - 5.5 LPA or Best in Industry"
                    value={jobSalary}
                    onBlur={() => setFieldTouched('jobSalary')}
                    onChange={(e) => {
                      setJobSalary(e.target.value);
                      setFieldTouched('jobSalary');
                    }}
                    className={`w-full px-3.5 py-2 text-xs border rounded-xl focus:outline-none transition-colors ${
                      jobTouched.jobSalary && jobValidation.errors.jobSalary
                        ? 'border-rose-300 bg-rose-50/30 focus:ring-2 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* 4, 5 & 6. Job Type, Experience, and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Job Type <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <select
                    value={jobType}
                    onBlur={() => setFieldTouched('jobType')}
                    onChange={(e) => {
                      setJobType(e.target.value);
                      setFieldTouched('jobType');
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Fresher">Fresher</option>
                    <option value="Internship">Internship</option>
                    <option value="Full Time">Full Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Part Time">Part Time</option>
                  </select>
                  {jobTouched.jobType && jobValidation.errors.jobType && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-0.5">{jobValidation.errors.jobType}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Experience <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fresher / 0-1 yr"
                    value={jobExperience}
                    onBlur={() => setFieldTouched('jobExperience')}
                    onChange={(e) => {
                      setJobExperience(e.target.value);
                      setFieldTouched('jobExperience');
                    }}
                    className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none ${
                      jobTouched.jobExperience && jobValidation.errors.jobExperience
                        ? 'border-rose-300 bg-rose-50/30'
                        : 'border-slate-300'
                    }`}
                  />
                  {jobTouched.jobExperience && jobValidation.errors.jobExperience && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-0.5">{jobValidation.errors.jobExperience}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Category <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <select
                    value={jobCategory}
                    onBlur={() => setFieldTouched('jobCategory')}
                    onChange={(e) => {
                      setJobCategory(e.target.value);
                      setFieldTouched('jobCategory');
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Data Science & AI">Data Science & AI</option>
                    <option value="QA & Automation">QA & Automation</option>
                    <option value="Product & Design">Product & Design</option>
                    <option value="DevOps & Cloud">DevOps & Cloud</option>
                    <option value="Sales & Marketing">Sales & Marketing</option>
                    <option value="Operations & HR">Operations & HR</option>
                  </select>
                  {jobTouched.jobCategory && jobValidation.errors.jobCategory && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-0.5">{jobValidation.errors.jobCategory}</p>
                  )}
                </div>
              </div>

              {/* 7. Official Application Link */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Official Application Link <span className="text-rose-500">*</span>
                  </label>
                  {jobTouched.jobApplyLink && jobValidation.errors.jobApplyLink && (
                    <span className="text-[11px] text-rose-600 font-semibold">{jobValidation.errors.jobApplyLink}</span>
                  )}
                </div>
                <input
                  type="url"
                  required
                  placeholder="https://company.com/careers/job-opening or Google Form"
                  value={jobApplyLink}
                  onBlur={() => setFieldTouched('jobApplyLink')}
                  onChange={(e) => {
                    setJobApplyLink(e.target.value);
                    setFieldTouched('jobApplyLink');
                  }}
                  className={`w-full px-3.5 py-2 text-xs border rounded-xl focus:outline-none transition-colors ${
                    jobTouched.jobApplyLink && jobValidation.errors.jobApplyLink
                      ? 'border-rose-300 bg-rose-50/30 focus:ring-2 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-600'
                  }`}
                />
              </div>

              {/* 8. Job Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Job Description &amp; Requirements <span className="text-rose-500">*</span>
                  </label>
                  {jobTouched.jobDescription && jobValidation.errors.jobDescription && (
                    <span className="text-[11px] text-rose-600 font-semibold">{jobValidation.errors.jobDescription}</span>
                  )}
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter role responsibilities, eligibility criteria, and required technical skills..."
                  value={jobDescription}
                  onBlur={() => setFieldTouched('jobDescription')}
                  onChange={(e) => {
                    setJobDescription(e.target.value);
                    setFieldTouched('jobDescription');
                  }}
                  className={`w-full px-3.5 py-2 text-xs border rounded-xl focus:outline-none transition-colors ${
                    jobTouched.jobDescription && jobValidation.errors.jobDescription
                      ? 'border-rose-300 bg-rose-50/30 focus:ring-2 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-600'
                  }`}
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                  <span>Minimum 15 characters required</span>
                  <span>{jobDescription.trim().length} chars</span>
                </div>
              </div>

              {/* Validation Status Notice (Requirements 2 & 3) */}
              {!jobValidation.isValid ? (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Required field(s) preventing submission: </span>
                    <span className="text-amber-800">{jobValidation.missingFields.join(', ')}</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">All 8 required fields verified. Form is ready to publish.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingJob || !jobValidation.isValid}
                  className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 ${
                    isSavingJob || !jobValidation.isValid
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white cursor-pointer shadow-sm'
                  }`}
                  title={!jobValidation.isValid ? `Missing required fields: ${jobValidation.missingFields.join(', ')}` : undefined}
                >
                  {isSavingJob ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <span>{editingJob ? 'Update Job' : 'Publish Requisition'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
