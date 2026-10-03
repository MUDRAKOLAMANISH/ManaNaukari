import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, 
  Sparkles, RefreshCw, X, Check, Target, Briefcase, GraduationCap, 
  Key, ShieldCheck, ChevronRight, AlertCircle, Loader2, Award, Zap
} from 'lucide-react';
import { Job } from '../../types/database.types';
import { AtsMatchResult } from '../../types/ats.types';
import { resumeMatchService } from '../../services/resumeMatchService';

interface AtsResumeMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  initialApplicantName?: string;
  initialApplicantEmail?: string;
  initialApplicantPhone?: string;
  onContinueToApply: (candidateInfo: {
    name: string;
    email: string;
    phone: string;
    resumeFileName?: string;
  }) => void;
}

export const AtsResumeMatchModal: React.FC<AtsResumeMatchModalProps> = ({
  isOpen,
  onClose,
  job,
  initialApplicantName = '',
  initialApplicantEmail = '',
  initialApplicantPhone = '',
  onContinueToApply,
}) => {
  // Stepper: 'upload' | 'analyzing' | 'dashboard'
  const [step, setStep] = useState<'upload' | 'analyzing' | 'dashboard'>('upload');
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Candidate details pre-fill
  const [candidateName, setCandidateName] = useState(initialApplicantName);
  const [candidateEmail, setCandidateEmail] = useState(initialApplicantEmail);
  const [candidatePhone, setCandidatePhone] = useState(initialApplicantPhone);

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState<AtsMatchResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'skills' | 'recommendations' | 'breakdown'>('skills');

  // Retain window scroll position when modal closes
  const scrollYRef = useRef<number>(0);

  // Prevent background scroll while keeping scroll position
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

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync initial candidate fields if they change
  useEffect(() => {
    if (initialApplicantName) setCandidateName(initialApplicantName);
    if (initialApplicantEmail) setCandidateEmail(initialApplicantEmail);
    if (initialApplicantPhone) setCandidatePhone(initialApplicantPhone);
  }, [initialApplicantName, initialApplicantEmail, initialApplicantPhone]);

  if (!isOpen) return null;

  // File Drop Handler
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectedFile = (selectedFile: File) => {
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const hasValidExt = validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setAnalysisError('Please upload a valid resume in PDF or Word (.docx) format.');
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setAnalysisError('File size exceeds 15MB limit. Please upload a smaller document.');
      return;
    }

    setAnalysisError(null);
    setFile(selectedFile);
  };

  // Run ATS Resume Match Analysis
  const handleRunAnalysis = async () => {
    if (!file) {
      setAnalysisError('Please select or upload your resume file first.');
      return;
    }

    setStep('analyzing');
    setAnalysisError(null);

    try {
      const { data, error } = await resumeMatchService.analyzeResumeMatch(file, {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        description: job.description,
        skillsRequired: job.skills_required || undefined,
        experience: job.experience || 'Fresher',
        jobType: job.job_type,
        category: job.category,
        candidateName,
        candidateEmail,
        candidatePhone,
      });

      if (error || !data) {
        throw error || new Error('Could not parse resume');
      }

      setAnalysisResult(data);
      setStep('dashboard');
    } catch (err: any) {
      console.error('[AtsResumeMatchModal] Analysis error:', err);
      setAnalysisError(err.message || 'Error scanning resume. You can still proceed with direct application.');
      setStep('upload');
    }
  };

  // Continue Application Handler
  const handleContinue = () => {
    onContinueToApply({
      name: candidateName,
      email: candidateEmail,
      phone: candidatePhone,
      resumeFileName: file?.name,
    });
  };

  // Reset to Upload Step
  const handleReset = () => {
    setStep('upload');
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  // Match score tier styles & labels
  const getScoreTheme = (score: number) => {
    if (score >= 75) {
      return {
        label: 'Strong Match',
        subtext: 'High probability of clearing automated ATS filters',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        ring: 'ring-emerald-500/20',
        bar: 'from-emerald-500 to-teal-500',
        badgeBg: 'bg-emerald-100 text-emerald-800',
      };
    }
    if (score >= 50) {
      return {
        label: 'Good Match',
        subtext: 'Moderate alignment; adding missing keywords will strengthen profile',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        ring: 'ring-amber-500/20',
        bar: 'from-amber-500 to-orange-500',
        badgeBg: 'bg-amber-100 text-amber-800',
      };
    }
    return {
      label: 'Needs Optimization',
      subtext: 'Consider adding required skills and experience keywords before applying',
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      ring: 'ring-rose-500/20',
      bar: 'from-rose-500 to-red-500',
      badgeBg: 'bg-rose-100 text-rose-800',
    };
  };

  const modalContent = (
    <div
      id="ats-resume-match-portal-wrapper"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ats-match-title"
    >
      {/* Full-screen backdrop */}
      <div
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

      {/* Modal Window: Fixed at center */}
      <div
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
          borderRadius: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        className="border border-slate-200/90"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar with LinkedIn-style Branding */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-5 sm:p-6 flex items-start justify-between gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>ATS Resume Intelligence</span>
                </span>
                <span className="text-[11px] text-slate-300 font-medium hidden sm:inline">
                  Compare against {job.company}&apos;s requisition
                </span>
              </div>
              <h2 id="ats-match-title" className="text-lg sm:text-xl font-black font-display tracking-tight text-white mt-1">
                {step === 'dashboard' ? 'ATS Match Analysis & Optimization' : `Scan Resume for ${job.title}`}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {job.company} · {job.location} · {job.experience || 'Fresher'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Modal Content */}
          <div 
            style={{
              maxHeight: 'calc(90vh - 130px)',
              overflowY: 'auto',
            }}
            className="overflow-y-auto flex-1 p-5 sm:p-7 space-y-6"
          >
            
            {/* STEP 1: UPLOAD SCREEN */}
            {step === 'upload' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Information Header Card */}
                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900 leading-relaxed">
                    <span className="font-bold">Enterprise ATS Simulator: </span>
                    We scan your resume using the same criteria enterprise recruiters at TCS, Infosys, Accenture, and Amazon use—comparing required skills, job description keywords, experience, and educational background.
                  </div>
                </div>

                {/* Drag & Drop File Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
                    isDragOver
                      ? 'border-blue-600 bg-blue-50/60 ring-4 ring-blue-100'
                      : file
                      ? 'border-emerald-400 bg-emerald-50/30'
                      : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {file ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-900">{file.name}</div>
                      <div className="text-xs text-slate-500 font-medium">
                        {(file.size / 1024).toFixed(1)} KB · Ready for ATS analysis
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="text-xs text-blue-600 hover:underline font-semibold pt-1 inline-block"
                      >
                        Choose a different file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center border border-blue-100 shadow-2xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-blue-600 hover:underline">
                          Click to upload your resume
                        </span>
                        <span className="text-sm text-slate-600"> or drag and drop</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Supports PDF, Word (.docx), or Text (Up to 15MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Candidate Pre-fill Information (Optional but convenient) */}
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Applicant Contact Info (Optional)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Auto-fills the next application step
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      placeholder="Your Full Name"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <input
                      type="tel"
                      placeholder="Mobile Number"
                      value={candidatePhone}
                      onChange={(e) => setCandidatePhone(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {analysisError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{analysisError}</span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: ANALYZING SPINNER */}
            {step === 'analyzing' && (
              <div className="py-12 px-4 text-center space-y-6 animate-fadeIn">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-ping opacity-75" />
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg relative z-10">
                    <Loader2 className="w-9 h-9 animate-spin" />
                  </div>
                </div>

                <div className="space-y-1.5 max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Scanning Resume with ATS AI Engine...
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Analyzing technical skill overlap, work history relevance, educational qualifications, and keyword density for {job.company}.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span>Extracting document text &bull; Calculating score</span>
                </div>
              </div>
            )}

            {/* STEP 3: ATS DASHBOARD */}
            {step === 'dashboard' && analysisResult && (
              <div className="space-y-6 animate-fadeIn">
                {(() => {
                  const theme = getScoreTheme(analysisResult.match_percentage);
                  return (
                    <>
                      {/* Overall Score Hero Card */}
                      <div className={`p-5 sm:p-6 rounded-3xl ${theme.bg} border ${theme.border} shadow-xs ring-4 ${theme.ring} relative overflow-hidden`}>
                        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 text-center sm:text-left">
                          
                          {/* Radial / Numerical Score Display */}
                          <div className="flex items-center gap-4">
                            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                              {/* Circular Progress Ring */}
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                  className="text-slate-200/80"
                                  strokeWidth="3.5"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className={analysisResult.match_percentage >= 75 ? 'text-emerald-500' : analysisResult.match_percentage >= 50 ? 'text-amber-500' : 'text-rose-500'}
                                  strokeDasharray={`${analysisResult.match_percentage}, 100`}
                                  strokeWidth="3.8"
                                  strokeLinecap="round"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-2xl font-black font-display ${theme.color}`}>
                                  {analysisResult.match_percentage}%
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Match
                                </span>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-center sm:justify-start gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${theme.badgeBg}`}>
                                  {theme.label}
                                </span>
                                {analysisResult.analysis_source === 'ai' && (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>AI Powered</span>
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base font-extrabold text-slate-900 mt-1 font-display">
                                Requisition Match Score
                              </h3>
                              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-md">
                                {theme.subtext}
                              </p>
                            </div>
                          </div>

                          {/* Quick Summary Pill */}
                          <div className="w-full sm:w-auto bg-white/90 p-3 rounded-2xl border border-slate-200/80 text-left text-xs space-y-1">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>{file?.name || 'Resume Analyzed'}</span>
                            </span>
                            <div className="text-[11px] text-slate-500">
                              {analysisResult.matched_skills.length} skills matched &bull; {analysisResult.missing_skills.length} gaps identified
                            </div>
                          </div>

                        </div>

                        {/* Overall Progress Bar */}
                        <div className="mt-4 pt-4 border-t border-slate-200/60">
                          <div className="w-full h-2 rounded-full bg-slate-200/90 overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r ${theme.bar} transition-all duration-700 rounded-full`}
                              style={{ width: `${analysisResult.match_percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 4 Sub-Metrics Grid: Skills, Experience, Education, Keywords */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        
                        {/* Skills */}
                        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-blue-600" />
                              <span>Skills</span>
                            </span>
                            <span className="font-bold text-slate-900">{analysisResult.skills_score}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${analysisResult.skills_score}%` }} />
                          </div>
                        </div>

                        {/* Experience */}
                        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Experience</span>
                            </span>
                            <span className="font-bold text-slate-900">{analysisResult.experience_score}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${analysisResult.experience_score}%` }} />
                          </div>
                        </div>

                        {/* Education */}
                        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Education</span>
                            </span>
                            <span className="font-bold text-slate-900">{analysisResult.education_score}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${analysisResult.education_score}%` }} />
                          </div>
                        </div>

                        {/* Keywords */}
                        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Key className="w-3.5 h-3.5 text-purple-600" />
                              <span>Keywords</span>
                            </span>
                            <span className="font-bold text-slate-900">{analysisResult.keyword_score}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-600 rounded-full" style={{ width: `${analysisResult.keyword_score}%` }} />
                          </div>
                        </div>

                      </div>

                      {/* Tab Navigation */}
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('skills')}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            activeTab === 'skills'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Skills Analysis ({analysisResult.matched_skills.length + analysisResult.missing_skills.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('recommendations')}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            activeTab === 'recommendations'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Recommendations ({analysisResult.recommendations.length})
                        </button>
                      </div>

                      {/* Tab 1: Skills Analysis */}
                      {activeTab === 'skills' && (
                        <div className="space-y-4 animate-fadeIn">
                          
                          {/* Matched Skills */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Matched Skills ({analysisResult.matched_skills.length})</span>
                              </span>
                              <span className="text-[11px] text-slate-400">Found in both resume &amp; requisition</span>
                            </div>
                            
                            {analysisResult.matched_skills.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {analysisResult.matched_skills.map((skill, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                                  >
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>{skill}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                No direct keyword match found. Consider explicitly adding your technical skills.
                              </p>
                            )}
                          </div>

                          {/* Missing / Desirable Skills */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <span>Missing Skills &amp; Keywords ({analysisResult.missing_skills.length})</span>
                              </span>
                              <span className="text-[11px] text-slate-400">Highlight these to boost rank</span>
                            </div>

                            {analysisResult.missing_skills.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {analysisResult.missing_skills.map((skill, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span>{skill}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                                <Award className="w-4 h-4 text-emerald-600" />
                                <span>Zero skill gaps! Your resume covers all key job prerequisites.</span>
                              </div>
                            )}
                          </div>

                        </div>
                      )}

                      {/* Tab 2: Recommendations */}
                      {activeTab === 'recommendations' && (
                        <div className="space-y-3 animate-fadeIn">
                          {analysisResult.recommendations.map((rec, index) => (
                            <div
                              key={index}
                              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-start gap-3"
                            >
                              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs border border-indigo-100 mt-0.5">
                                {index + 1}
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {rec}
                              </p>
                            </div>
                          ))}

                          {analysisResult.strengths && analysisResult.strengths.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-purple-600" />
                                <span>Candidate Key Strengths Identified</span>
                              </span>
                              <div className="space-y-1.5">
                                {analysisResult.strengths.map((str, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                    <span>{str}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {step === 'upload' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <div className="w-full sm:w-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onContinueToApply({
                        name: candidateName,
                        email: candidateEmail,
                        phone: candidatePhone,
                      });
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Direct Apply Instead
                  </button>

                  <button
                    type="button"
                    disabled={!file}
                    onClick={handleRunAnalysis}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer btn-glow"
                  >
                    <span>Analyze Resume Match</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}

            {step === 'dashboard' && (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Another Resume</span>
                </button>

                <div className="w-full sm:w-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleContinue}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 rounded-xl shadow-md transition-all cursor-pointer btn-glow"
                  >
                    <span>Continue Application</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };
