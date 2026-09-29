import React, { useState, useEffect } from 'react';
import { 
  Building2, User, Mail, Phone, Globe, Linkedin, Briefcase, 
  MapPin, DollarSign, Layers, Tag, Link2, CheckCircle2, ShieldCheck, 
  ArrowRight, CreditCard, Lock, Sparkles, Loader2, AlertCircle, FileText
} from 'lucide-react';
import { recruiterService, RecruiterSubmissionPayload } from '../services/recruiterService';
import { adminJobsService } from '../services/adminJobsService';
import { Category, RecruiterJob, Recruiter } from '../types/database.types';

interface RecruiterPostJobPageProps {
  onNavigate: (path: string) => void;
}

export const RecruiterPostJobPage: React.FC<RecruiterPostJobPageProps> = ({ onNavigate }) => {
  // Step state: 'details' -> 'success'
  const [currentStep, setCurrentStep] = useState<'details' | 'success'>('details');

  // Recruiter fields
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('HR Manager / Talent Acquisition');
  const [officialEmail, setOfficialEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [linkedinProfile, setLinkedinProfile] = useState('');

  // Job fields
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('Bengaluru');
  const [salary, setSalary] = useState('₹4.0 - 6.0 LPA');
  const [experience, setExperience] = useState('Fresher (2024 / 2025)');
  const [jobType, setJobType] = useState('Fresher');
  const [category, setCategory] = useState('Software Engineering');
  const [skillsRequired, setSkillsRequired] = useState('Java, Python, SQL, Problem Solving');
  const [description, setDescription] = useState(
`### Role Overview
We are looking for motivated and driven fresh graduates to join our high-growth engineering team. 

### Key Responsibilities
- Collaborate with senior engineers to design and implement robust software services.
- Write clean, well-tested, and maintainable code.
- Participate in code reviews, technical discussions, and sprint planning.

### Eligibility Criteria
- B.E / B.Tech / M.Tech / MCA in Computer Science, IT, or related fields.
- 60% or 6.5+ CGPA throughout academics.
- Passing batches: 2024 / 2025 / 2026.`
  );
  const [applyLink, setApplyLink] = useState('');

  // Categories & UI state
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Completed submission data
  const [submittedRecruiter, setSubmittedRecruiter] = useState<Recruiter | null>(null);
  const [submittedJob, setSubmittedJob] = useState<RecruiterJob | null>(null);

  useEffect(() => {
    const fetchCats = async () => {
      const data = await adminJobsService.getCategories();
      if (data && data.length > 0) {
        setCategories(data);
      }
    };
    fetchCats();
  }, []);

  // Step 1: Submit Details directly to Supabase
  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!name.trim() || !officialEmail.trim() || !mobileNumber.trim() || !companyName.trim()) {
      setErrorMessage('Please fill in all mandatory recruiter and company details.');
      return;
    }
    if (!companyWebsite.trim() || !companyWebsite.startsWith('http')) {
      setErrorMessage('Please provide a valid company website starting with http:// or https://');
      return;
    }
    if (!linkedinProfile.trim() || !linkedinProfile.includes('linkedin.com')) {
      setErrorMessage('Please provide a valid LinkedIn profile link for recruiter identity verification.');
      return;
    }
    if (!title.trim() || !applyLink.trim() || !description.trim()) {
      setErrorMessage('Please provide job title, job description, and official application URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      const skills = skillsRequired
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: RecruiterSubmissionPayload = {
        name,
        designation,
        official_email: officialEmail,
        mobile_number: mobileNumber,
        company_name: companyName,
        company_website: companyWebsite,
        linkedin_profile: linkedinProfile,
        title,
        location,
        salary,
        experience,
        job_type: jobType,
        category,
        skills_required: skills,
        description,
        apply_link: applyLink,
      };

      const res = await recruiterService.submitRecruiterJob(payload);
      if (!res.success || !res.recruiterJob || !res.recruiter) {
        throw res.error || new Error('Failed to record recruiter job submission in Supabase.');
      }

      setSubmittedRecruiter(res.recruiter);
      setSubmittedJob(res.recruiterJob);
      setCurrentStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('[Recruiter Submission Error]:', err);
      setErrorMessage(err.message || 'Error saving job details to Supabase. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Top Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Verified Recruiter & Employer Network</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                Post a Job Opening on Mana Naukari
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-xl leading-relaxed">
                Connect with thousands of active freshers, engineering graduates, and entry-level professionals. Every listing undergoes mandatory verification and admin review.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-4 sm:p-5 text-center shrink-0 shadow-md">
              <span className="text-xs uppercase tracking-wider text-blue-100 font-semibold block">
                Verification Status
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold font-display mt-0.5">
                Admin Review
              </div>
              <span className="text-[11px] text-blue-100 block mt-1">
                Zero spam • Official Audit
              </span>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-2 sm:gap-4 text-xs font-semibold text-center">
            <div className={`p-2.5 rounded-xl border transition-all ${
              currentStep === 'details' 
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                : 'bg-blue-50 text-blue-700 border-blue-100'
            }`}>
              1. Company & Job Details
            </div>

            <div className={`p-2.5 rounded-xl border transition-all ${
              currentStep === 'success' 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}>
              2. Review & Admin Approval
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* STEP 1: FORM DETAILS */}
        {currentStep === 'details' && (
          <form onSubmit={handleSubmitDetails} className="space-y-8 animate-fadeIn">
            
            {/* Section A: Recruiter Profile */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>1. Recruiter & Company Identification</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  We verify all recruiter credentials to protect candidates from recruitment fraud and unverified agencies.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Recruiter Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priya Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Designation / Title
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. HR Manager / Talent Acquisition"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Work Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. priya.sharma@company.com"
                      value={officialEmail}
                      onChange={(e) => setOfficialEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. CloudTech Solutions Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Company Website <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      required
                      placeholder="https://company.com"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Recruiter LinkedIn Profile <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Linkedin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      required
                      placeholder="https://linkedin.com/in/username"
                      value={linkedinProfile}
                      onChange={(e) => setLinkedinProfile(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section B: Job Details */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  <span>2. Job Requisition Information</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provide detailed job criteria. Once approved by Mana Naukari administrators, this will be published to the public portal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Job Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Associate Software Engineer / Trainee QA"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Location <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bengaluru, Hyderabad, or Pan India"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Salary / Compensation
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. ₹4.5 - 6.0 LPA or Best in Industry"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Experience Level
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fresher / 0-1 Years"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Job Type
                  </label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                  >
                    <option value="Fresher">Fresher</option>
                    <option value="Internship">Internship</option>
                    <option value="Full Time">Full Time</option>
                    <option value="Part Time">Part Time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Domain / Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
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
                        <option value="Operations & Support">Operations & Support</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Skills Required (Comma separated)
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. React, Node.js, TypeScript, SQL"
                      value={skillsRequired}
                      onChange={(e) => setSkillsRequired(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Application Link <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      required
                      placeholder="https://company.com/careers/apply-link or Google Form link"
                      value={applyLink}
                      onChange={(e) => setApplyLink(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Job Description & Eligibility <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={8}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Submission is saved to Supabase and reviewed by admin before going live</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Job for Review</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2: SUCCESS & PENDING REVIEW */}
        {currentStep === 'success' && submittedJob && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center shadow-xs space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
            </div>

            <div className="max-w-md mx-auto">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Status: pending_review • Verification: pending</span>
              </div>
              <h2 className="text-2xl font-bold font-display text-slate-900">
                Job submitted successfully. Awaiting admin approval.
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                Thank you, <span className="font-semibold text-slate-800">{submittedRecruiter?.name}</span>. Your job requisition for <span className="font-semibold text-slate-800">{submittedJob.company || submittedRecruiter?.company_name}</span> has been securely stored in our database. It will undergo official admin review before going live.
              </p>
            </div>

            {/* Requisition Card */}
            <div className="max-w-lg mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-500 pb-2 border-b border-slate-200">
                <span>Job Requisition ID</span>
                <span className="font-mono font-bold text-slate-800">{submittedJob.id}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Recruiter ID</span>
                <span className="font-mono font-semibold text-slate-700">{submittedRecruiter?.id}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Role & Company</span>
                <span className="font-semibold text-slate-800">{submittedJob.title} • {submittedJob.company || submittedRecruiter?.company_name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Target Location</span>
                <span className="font-semibold text-slate-800">{submittedJob.location}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 pt-2 border-t border-slate-200">
                <span>Publication Policy</span>
                <span className="font-bold text-amber-700 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  Quarantined (Admin approval required)
                </span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setCurrentStep('details');
                  setTitle('');
                  setApplyLink('');
                }}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Post Another Job
              </button>

              <button
                onClick={() => onNavigate('/jobs')}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
              >
                Return to Job Directory
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
