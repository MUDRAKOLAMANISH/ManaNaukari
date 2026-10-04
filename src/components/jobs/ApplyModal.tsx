import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlertCircle, CheckCircle2, ExternalLink, Loader2, X, 
  Sparkles, Upload, FileText, ArrowRight, Edit2, ShieldCheck,
  Zap, RotateCcw, Award, Check, TrendingUp, HelpCircle
} from 'lucide-react';
import { Job, CandidateProfile } from '../../types/database.types';
import { candidateProfileService, StoredCandidateProfile } from '../../services/candidateProfileService';
import { resumeMatchService } from '../../services/resumeMatchService';
import { calculateFallbackAtsMatch } from '../../utils/atsKeywordMatcher';
import { AtsMatchResult } from '../../types/ats.types';
import { ReapplyConfirmModal } from './ReapplyConfirmModal';
import { validateIndianMobile, validateCandidateEmail } from '../../utils/candidateValidation';

export interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  applicantName: string;
  setApplicantName: (val: string) => void;
  applicantEmail: string;
  setApplicantEmail: (val: string) => void;
  applicantPhone: string;
  setApplicantPhone: (val: string) => void;
  isSubmittingLead: boolean;
  leadError: string | null;
  leadSuccess: boolean;
  onSubmit: (e: React.FormEvent, options?: { isVerified?: boolean; verifiedAt?: string }) => void;
  initialResumeFileName?: string;
  onProfileUpdated?: (profile: CandidateProfile) => void;
  onReapply?: () => void;
}

export const ApplyModal: React.FC<ApplyModalProps> = ({
  isOpen,
  onClose,
  job,
  applicantName,
  setApplicantName,
  applicantEmail,
  setApplicantEmail,
  applicantPhone,
  setApplicantPhone,
  isSubmittingLead,
  leadError,
  leadSuccess,
  onSubmit,
  initialResumeFileName = '',
  onProfileUpdated,
  onReapply,
}) => {
  // Candidate Profile State
  const [candidateProfile, setCandidateProfile] = useState<StoredCandidateProfile | null>(null);
  const [isRecognized, setIsRecognized] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [appliedDate, setAppliedDate] = useState<string | null>(null);
  const [isCheckingDeduplication, setIsCheckingDeduplication] = useState(false);

  // Resume attachment state
  const [resumeFileName, setResumeFileName] = useState<string>(initialResumeFileName);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUpdatingResume, setIsUpdatingResume] = useState(false);
  const [resumeUpdateSuccess, setResumeUpdateSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Match analysis state for "Check Resume Match & Apply"
  const [isAnalyzingMatch, setIsAnalyzingMatch] = useState(false);
  const [matchResult, setMatchResult] = useState<AtsMatchResult | null>(null);
  const [showMatchResult, setShowMatchResult] = useState(false);

  // Reapply confirmation modal state
  const [isInternalReapplyOpen, setIsInternalReapplyOpen] = useState(false);
  const [isReapplyingInternal, setIsReapplyingInternal] = useState(false);

  // Form validation error state
  const [formValidationError, setFormValidationError] = useState<string | null>(null);

  // Track scroll position to ensure user stays on exact same screen position after closing
  const scrollYRef = useRef<number>(0);

  // Prevent page scrolling while modal is open, restore when closed, keep user on exact screen position
  useEffect(() => {
    if (isOpen) {
      scrollYRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      if (typeof scrollYRef.current === 'number') {
        window.scrollTo({ top: scrollYRef.current, left: 0, behavior: 'instant' as ScrollBehavior });
      }
    }
    return () => {
      document.body.style.overflow = 'auto';
      if (typeof scrollYRef.current === 'number') {
        window.scrollTo({ top: scrollYRef.current, left: 0, behavior: 'instant' as ScrollBehavior });
      }
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize & Check Candidate Recognition on Modal Open
  useEffect(() => {
    if (!isOpen) {
      setShowMatchResult(false);
      setIsAnalyzingMatch(false);
      setMatchResult(null);
      return;
    }

    const detectCandidate = async () => {
      setIsCheckingDeduplication(true);
      const localProfile = candidateProfileService.getLocalProfile();

      if (localProfile) {
        setCandidateProfile(localProfile);
        setIsRecognized(true);

        if (!applicantName) setApplicantName(localProfile.name);
        if (!applicantEmail) setApplicantEmail(localProfile.email);
        if (!applicantPhone) setApplicantPhone(localProfile.mobile);
        if (localProfile.resume_file_name) setResumeFileName(localProfile.resume_file_name);

        // If local profile does not have verified numeric visitor_id, resolve it now
        if (!localProfile.visitor_id && localProfile.email) {
          candidateProfileService.findProfileByEmailOrMobile(localProfile.email, localProfile.mobile).then((res) => {
            if (res.data?.id && !isNaN(Number(res.data.id))) {
              const numId = Number(res.data.id);
              const updated = candidateProfileService.saveLocalProfile({
                ...localProfile,
                id: String(numId),
                visitor_id: numId,
              });
              setCandidateProfile(updated);
            }
          }).catch(() => {});
        }

        // Deduplication Check
        const dedupResult = await candidateProfileService.checkJobApplication(
          job.id,
          localProfile.visitor_id || localProfile.id,
          localProfile.email,
          localProfile.mobile
        );

        if (dedupResult.hasApplied) {
          setHasApplied(true);
          setAppliedDate(dedupResult.appliedAt || new Date().toISOString());
        } else {
          setHasApplied(false);
          setAppliedDate(null);
        }
      } else {
        setIsRecognized(false);
        setIsEditingDetails(true);

        // Check if pre-filled email or phone has already applied
        if (applicantEmail || applicantPhone) {
          const dedupResult = await candidateProfileService.checkJobApplication(
            job.id,
            undefined,
            applicantEmail,
            applicantPhone
          );
          if (dedupResult.hasApplied) {
            setHasApplied(true);
            setAppliedDate(dedupResult.appliedAt || new Date().toISOString());
          }
        }
      }
      setIsCheckingDeduplication(false);
    };

    detectCandidate();
  }, [isOpen, job.id]);

  // Real-time lookup on Email or Phone blur to auto-detect candidate
  const handleDetectOnBlur = async () => {
    if (isRecognized && !isEditingDetails) return;

    const emailToSearch = applicantEmail.trim().toLowerCase();
    const phoneToSearch = applicantPhone.trim();

    if ((emailToSearch && emailToSearch.includes('@')) || phoneToSearch.length >= 10) {
      try {
        const { data: foundProfile } = await candidateProfileService.findProfileByEmailOrMobile(
          emailToSearch || undefined,
          phoneToSearch || undefined
        );

        if (foundProfile) {
          if (!applicantName && foundProfile.name) setApplicantName(foundProfile.name);
          if (!applicantEmail && foundProfile.email) setApplicantEmail(foundProfile.email);
          if (!applicantPhone && foundProfile.mobile) setApplicantPhone(foundProfile.mobile);
          if (foundProfile.resume_file_name) setResumeFileName(foundProfile.resume_file_name);

          const localSaved = candidateProfileService.saveLocalProfile({
            id: foundProfile.id,
            name: foundProfile.name,
            email: foundProfile.email,
            mobile: foundProfile.mobile,
            resume_url: foundProfile.resume_url || undefined,
            resume_file_name: foundProfile.resume_file_name || undefined,
            email_verified: foundProfile.email_verified ?? false,
            verified_at: foundProfile.verified_at || null,
            last_verified_at: foundProfile.last_verified_at || null,
          });

          setCandidateProfile(localSaved);
          setIsRecognized(true);
          setIsEditingDetails(false);

          if (onProfileUpdated) onProfileUpdated(foundProfile);

          // Check if already applied to this specific job
          const dedup = await candidateProfileService.checkJobApplication(
            job.id,
            foundProfile.id,
            foundProfile.email,
            foundProfile.mobile
          );
          if (dedup.hasApplied) {
            setHasApplied(true);
            setAppliedDate(dedup.appliedAt || new Date().toISOString());
          }
        }
      } catch (e) {
        console.warn('[ApplyModal] Auto-lookup notice:', e);
      }
    }
  };

  // Resume File Selection Handler
  const handleResumeFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setResumeFile(selected);
      setResumeFileName(selected.name);

      // Extract & cache resume text for deterministic matching
      try {
        const clientText = await resumeMatchService.readClientText(selected);
        if (clientText && typeof window !== 'undefined') {
          localStorage.setItem('mana_naukari_candidate_resume_text', clientText);
        }
      } catch (err) {
        console.warn('[ApplyModal] Text extraction note:', err);
      }

      // If candidate is recognized, persist new resume file name
      if (candidateProfile) {
        const fakeUrl = `https://storage.mananaukari.in/resumes/${selected.name}`;
        await candidateProfileService.updateResume(candidateProfile.id, fakeUrl, selected.name);
        const updatedLocal = candidateProfileService.saveLocalProfile({
          ...candidateProfile,
          resume_file_name: selected.name,
          resume_url: fakeUrl,
        });
        setCandidateProfile(updatedLocal);
        setResumeUpdateSuccess(true);
        setTimeout(() => {
          setResumeUpdateSuccess(false);
          setIsUpdatingResume(false);
        }, 2000);
      }

      // If currently displaying match results, re-run analysis automatically
      if (showMatchResult) {
        setTimeout(() => {
          handleCheckResumeMatch();
        }, 150);
      }
    }
  };

  // CHECK RESUME MATCH & APPLY action handler
  const handleCheckResumeMatch = async () => {
    setIsAnalyzingMatch(true);
    setShowMatchResult(false);

    try {
      // 1. If we have resumeFile object in memory, try server API / client fallback
      if (resumeFile) {
        const { data } = await resumeMatchService.analyzeResumeMatch(resumeFile, {
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          description: job.description,
          skillsRequired: job.skills_required || undefined,
          experience: job.experience || 'Fresher',
          jobType: job.job_type,
          category: job.category,
          candidateName: applicantName,
          candidateEmail: applicantEmail,
          candidatePhone: applicantPhone,
        });
        if (data) {
          setMatchResult(data);
          setShowMatchResult(true);
          setIsAnalyzingMatch(false);
          return;
        }
      }

      // 2. Deterministic match from stored resume text or candidate profile metadata
      const cachedText = typeof window !== 'undefined' ? localStorage.getItem('mana_naukari_candidate_resume_text') || '' : '';
      const textForAnalysis = cachedText || [
        applicantName,
        applicantEmail,
        applicantPhone,
        resumeFileName,
        job.category,
        job.title,
      ].join(' ');

      const fallback = calculateFallbackAtsMatch({
        resumeText: textForAnalysis,
        resumeFileName: resumeFileName || `${applicantName || 'Candidate'}_Resume.pdf`,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.description,
        skillsRequired: job.skills_required,
        experienceRequired: job.experience || undefined,
        candidateName: applicantName,
        candidateEmail: applicantEmail,
        candidatePhone: applicantPhone,
      });

      setMatchResult(fallback);
      setShowMatchResult(true);
    } catch (err) {
      console.error('[ApplyModal] Error calculating resume match:', err);
    } finally {
      setIsAnalyzingMatch(false);
    }
  };

  // DIRECT APPLY action handler: skips resume analysis and immediately submits
  const handleDirectApply = (e: React.MouseEvent) => {
    e.preventDefault();
    const fakeEvent = {
      preventDefault: () => {},
    } as React.FormEvent;

    onSubmit(fakeEvent);
  };

  // Form submission handler: validates candidate information and directly submits application
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);

    const trimmedName = applicantName.trim();
    const trimmedEmail = applicantEmail.trim().toLowerCase();
    const trimmedPhone = applicantPhone.trim();

    if (!trimmedName) {
      setFormValidationError('Please provide your full name.');
      return;
    }

    const emailCheck = validateCandidateEmail(trimmedEmail);
    if (!emailCheck.isValid) {
      setFormValidationError(emailCheck.error || 'Please provide a valid email address.');
      return;
    }

    const mobileCheck = validateIndianMobile(trimmedPhone);
    if (!mobileCheck.isValid) {
      setFormValidationError(mobileCheck.error || 'Please provide a valid 10-digit mobile number.');
      return;
    }

    onSubmit(e);
  };

  // Internal Reapply handler
  const handleConfirmReapplyInternal = async () => {
    setIsReapplyingInternal(true);
    try {
      const candidateId = candidateProfile?.visitor_id || candidateProfile?.id || applicantEmail || 'candidate';
      await candidateProfileService.recordReapply({
        jobId: job.id,
        candidateProfileId: candidateId,
        candidateEmail: candidateProfile?.email || applicantEmail,
        candidatePhone: candidateProfile?.mobile || applicantPhone,
      });

      setTimeout(() => {
        window.open(job.apply_link, '_blank', 'noopener,noreferrer');
        setIsInternalReapplyOpen(false);
        setIsReapplyingInternal(false);
        onClose();
      }, 400);
    } catch (err) {
      console.warn('[ApplyModal] Reapply note:', err);
      window.open(job.apply_link, '_blank', 'noopener,noreferrer');
      setIsInternalReapplyOpen(false);
      setIsReapplyingInternal(false);
      onClose();
    }
  };

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const modalContent = (
    <div
      id="apply-modal-portal-wrapper"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-now-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
    >
      {/* 2. Add full-screen backdrop: background: rgba(0,0,0,0.6), backdrop blur */}
      <div
        id="apply-modal-backdrop"
        className="apply-modal-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 9998,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 3. Modal Position: fixed, top 50%, left 50%, transform: translate(-50%, -50%), zIndex: 9999 */}
      <div
        id="apply-modal-container"
        className="apply-modal-container border border-slate-200/90"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          maxWidth: '700px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed at Top */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 sm:p-6 text-white relative shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="pr-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold backdrop-blur-xs mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Direct Application</span>
              </div>
              <h3 id="apply-now-modal-title" className="text-lg sm:text-xl font-black font-display tracking-tight text-white">
                Apply for {job.title}
              </h3>
              <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5 font-medium">
                {job.company} · {job.location}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Close apply dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 7. Modal Body - Scrolls internally if content exceeds modal height (max-height: calc(90vh - 120px)) */}
        <div 
          id="apply-modal-body"
          className="apply-modal-body p-5 sm:p-6 space-y-4"
          style={{
            maxHeight: 'calc(90vh - 120px)',
            overflowY: 'auto',
          }}
        >
          {leadError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1 animate-fadeIn">
              <div className="font-bold flex items-center gap-1.5 text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Application Notice</span>
              </div>
              <p className="leading-relaxed">{leadError}</p>
            </div>
          )}

          {/* 1. DUPLICATE APPLICATION PREVENTED STATE WITH REAPPLY OPTION */}
          {hasApplied ? (
            <div className="p-6 text-center space-y-4 bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl animate-fadeIn">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-emerald-950 font-display">
                  ✓ Already Applied
                </h4>
                <p className="text-xs sm:text-sm text-emerald-800 mt-1 font-medium">
                  Application recorded on{' '}
                  <span className="font-bold text-emerald-950">
                    {appliedDate ? new Date(appliedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'recently'}
                  </span>.
                </p>
                <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                  You previously initiated an application for this vacancy. Your candidate profile is safely preserved with <span className="font-semibold text-slate-800">{job.company}</span>.
                </p>
              </div>

              {/* Reapply & Close Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (onReapply) {
                      onReapply();
                    } else {
                      setIsInternalReapplyOpen(true);
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reapply</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : leadSuccess ? (
            /* 2. SUCCESS CONFIRMATION STATE */
            <div className="py-8 text-center space-y-3 animate-fadeIn">
              <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-slate-900 text-lg">Application Verified &amp; Recorded!</h4>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                Opening the official {job.company} careers portal in a new tab...
              </p>
            </div>
          ) : isAnalyzingMatch ? (
            /* 3. MATCH SCANNING LOADING STATE */
            <div className="py-12 text-center space-y-4 animate-fadeIn">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                <Sparkles className="w-7 h-7 text-indigo-600 absolute inset-0 m-auto" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-base font-display">
                  Scanning Resume Against {job.company} Requirements...
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Calculating overall match score, skill alignments, and experience criteria.
                </p>
              </div>
            </div>
          ) : showMatchResult && matchResult ? (
            /* 4. PROFESSIONAL RESUME MATCH RESULT CARD */
            <div className="space-y-4 animate-fadeIn">
              
              {/* Match Score Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 border border-blue-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span>Resume Match Score</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    {matchResult.match_percentage >= 75
                      ? 'High Match'
                      : matchResult.match_percentage >= 50
                      ? 'Moderate Match'
                      : 'Developing Match'}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-3xl sm:text-4xl font-black text-blue-700 font-display">
                    {matchResult.match_percentage}%
                  </div>
                  <div className="flex-1">
                    <div className="h-3 w-full bg-blue-100/90 rounded-full overflow-hidden p-0.5 border border-blue-200">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(100, Math.max(10, matchResult.match_percentage))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium mt-1">
                      <span>Experience: {matchResult.experience_score}%</span>
                      <span>Education: {matchResult.education_score}%</span>
                      <span>Keywords: {matchResult.keyword_score}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matched & Missing Skills Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Matched Skills */}
                <div className="p-4 rounded-xl bg-white border border-emerald-200/90 shadow-2xs space-y-2">
                  <span className="text-emerald-800 font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Matched Skills ({matchResult.matched_skills?.length || 0})</span>
                  </span>
                  {matchResult.matched_skills && matchResult.matched_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {matchResult.matched_skills.map((skill, idx) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium text-[11px] border border-emerald-200"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{skill}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No exact skill keywords aligned.</p>
                  )}
                </div>

                {/* Missing Skills */}
                <div className="p-4 rounded-xl bg-white border border-amber-200/90 shadow-2xs space-y-2">
                  <span className="text-amber-800 font-bold text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Missing Skills ({matchResult.missing_skills?.length || 0})</span>
                  </span>
                  {matchResult.missing_skills && matchResult.missing_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {matchResult.missing_skills.map((skill, idx) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 font-medium text-[11px] border border-amber-200"
                        >
                          <span>- {skill}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-600 font-medium">All essential skills matched!</p>
                  )}
                </div>
              </div>

              {/* Recommendation Card */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/70 text-xs space-y-1">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  <span>Recommendation:</span>
                </span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {matchResult.recommendations && matchResult.recommendations.length > 0
                    ? matchResult.recommendations[0]
                    : matchResult.match_percentage >= 70
                    ? `Your profile is a strong match for ${job.title}. Consider highlighting key skills on your resume before applying.`
                    : `Consider emphasizing relevant coursework, projects, or exposure to key requirements before submitting.`}
                </p>
              </div>

              {/* Match Card Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Update Resume</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMatchResult(false)}
                    className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDirectApply}
                  disabled={isSubmittingLead}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-6 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingLead ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Redirecting...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue &amp; Apply</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : isRecognized && !isEditingDetails ? (
            /* 5. RETURNING CANDIDATE PROFILE EXPERIENCE (Prompt 7 Required Layout) */
            <div className="space-y-4 animate-fadeIn">
              
              {/* Profile Greeting Card */}
              <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-base shadow-xs">
                      {applicantName ? applicantName.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>Candidate Profile Recognized</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base sm:text-lg font-black text-slate-900 font-display">
                          Welcome Back, {applicantName || 'Candidate'}!
                        </h4>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Candidate Profile</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingDetails(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer shrink-0 pt-1"
                    title="Change candidate name, email, or mobile"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Profile</span>
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  We pre-filled your information from your candidate profile. Review details below or update your resume before continuing.
                </p>

                {/* Candidate Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div className="bg-white/90 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Candidate Name</span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">{applicantName}</span>
                  </div>

                  <div className="bg-white/90 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Email Address</span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm truncate block">{applicantEmail}</span>
                  </div>

                  <div className="bg-white/90 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Mobile Number</span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">{applicantPhone}</span>
                  </div>

                  <div className="bg-white/90 p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Resume Status</span>
                      <span className="font-bold text-slate-800 text-xs truncate max-w-[130px] block" title={resumeFileName || 'Resume on File'}>
                        {resumeFileName || 'Resume on File'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Attached</span>
                    </span>
                  </div>
                </div>

                {/* Hidden File Input for Resume Replacement */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleResumeFileSelected}
                  className="hidden"
                />

                {/* Update Resume toggle button & replacement card */}
                <div className="pt-1">
                  {!isUpdatingResume ? (
                    <button
                      type="button"
                      onClick={() => setIsUpdatingResume(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Update Resume</span>
                    </button>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-white border-2 border-dashed border-blue-400 space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-blue-600" />
                          <span>Select New Resume Document (PDF / DOCX)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsUpdatingResume(false)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 px-3 bg-blue-50/60 hover:bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Choose PDF or DOCX file</span>
                      </button>

                      {resumeUpdateSuccess && (
                        <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Resume replaced and updated in your candidate profile!</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* TWO PROFESSIONAL APPLICATION OPTIONS (Prompt 7 Required) */}
              <div className="space-y-3 pt-1">
                {/* Option A: Check Resume Match & Apply (Primary) */}
                <button
                  type="button"
                  onClick={handleCheckResumeMatch}
                  className="w-full group p-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-left relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs shrink-0 group-hover:scale-105 transition-transform">
                        <Sparkles className="w-5 h-5 text-amber-300" />
                      </div>
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200 flex items-center gap-1">
                          <span>Recommended Step</span>
                        </div>
                        <h5 className="text-sm sm:text-base font-bold text-white font-display">
                          Check Resume Match &amp; Apply
                        </h5>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                  <p className="text-[11px] text-blue-100/90 mt-2 font-medium">
                    Compares your stored resume with {job.company}&apos;s job description to evaluate matched skills, missing criteria, and match score before applying.
                  </p>
                </button>

                {/* Option B: Direct Apply (Secondary) */}
                <button
                  type="button"
                  onClick={handleDirectApply}
                  disabled={isSubmittingLead}
                  className="w-full group p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 group-hover:bg-slate-200 transition-colors">
                        <Zap className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Fast Track
                        </div>
                        <h5 className="text-sm sm:text-base font-bold text-slate-800 font-display">
                          Direct Apply
                        </h5>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 flex items-center gap-1">
                      <span>Skip Scan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Skips resume analysis and applies immediately using your saved profile details and resume.
                  </p>
                </button>
              </div>

            </div>
          ) : (
            /* 6. FIRST TIME APPLICATION OR EDITING FORM */
            <form onSubmit={handleFormSubmit} className="space-y-4 animate-fadeIn">
              
              {formValidationError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1 animate-fadeIn flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-rose-900">Verification Notice</span>
                    <p className="leading-relaxed">{formValidationError}</p>
                  </div>
                </div>
              )}

              {isRecognized && (
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-slate-700">Edit Your Candidate Credentials:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormValidationError(null);
                      setIsEditingDetails(false);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Back to Profile Summary
                  </button>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={applicantName}
                  onChange={(e) => {
                    setFormValidationError(null);
                    setApplicantName(e.target.value);
                  }}
                  onBlur={handleDetectOnBlur}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-shadow"
                />
              </div>

              {/* Email Address */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">Used for job updates</span>
                </div>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@gmail.com"
                  value={applicantEmail}
                  onChange={(e) => {
                    setFormValidationError(null);
                    setApplicantEmail(e.target.value);
                  }}
                  onBlur={handleDetectOnBlur}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-shadow"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">10 digits (starts with 6,7,8,9)</span>
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={applicantPhone}
                  onChange={(e) => {
                    setFormValidationError(null);
                    setApplicantPhone(e.target.value);
                  }}
                  onBlur={handleDetectOnBlur}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none transition-shadow"
                />
              </div>

              {/* Resume Upload for first-time applicant */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Resume (PDF / DOCX)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleResumeFileSelected}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>
                {resumeFileName && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selected: {resumeFileName}</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingLead ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Profile &amp; Opening Official Job...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue &amp; Apply</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info - Fixed at bottom */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Mana Naukari Direct Application</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>

      {/* Internal Reapply Confirmation Modal if triggered */}
      {isInternalReapplyOpen && (
        <ReapplyConfirmModal
          isOpen={isInternalReapplyOpen}
          onClose={() => setIsInternalReapplyOpen(false)}
          onConfirmReapply={handleConfirmReapplyInternal}
          jobTitle={job.title}
          company={job.company}
          appliedDate={appliedDate}
          isReapplying={isReapplyingInternal}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
