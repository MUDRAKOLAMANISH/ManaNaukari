import React, { useState, useRef } from 'react';
import { resumeReviewService } from '../services/resumeReviewService';
import { RESUME_PLANS, ResumePlan, ResumeServiceCard } from '../components/home/ResumeServiceCard';
import { 
  FileText, UploadCloud, CheckCircle2, AlertCircle, 
  MessageSquare, Sparkles, ShieldCheck, Check, Clock,
  ArrowRight, FileCheck, X, PhoneCall, HelpCircle, ChevronRight
} from 'lucide-react';

interface ResumeReviewPageProps {
  onNavigate: (path: string) => void;
}

export const ResumeReviewPage: React.FC<ResumeReviewPageProps> = ({ onNavigate }) => {
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // UI State
  const [selectedPlan, setSelectedPlan] = useState<ResumePlan>(RESUME_PLANS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Validation
  const handleFileChange = (file: File | null) => {
    setErrorMessage(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Allowed extensions: pdf, doc, docx
    const allowedExtensions = ['pdf', 'doc', 'docx'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      setErrorMessage('Please upload a valid resume file in PDF, DOC, or DOCX format.');
      setSelectedFile(null);
      return;
    }

    // Max size: 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMessage('File size exceeds 10MB limit. Please upload a smaller file.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Drag & Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your Full Name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    // Validate phone number (basic international or Indian 10 digits)
    const phoneClean = phone.replace(/[\s-]/g, '');
    if (!phoneClean || phoneClean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit WhatsApp phone number.');
      return;
    }

    if (!selectedFile) {
      setErrorMessage('Please upload your resume file (PDF, DOC, or DOCX).');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resumeReviewService.submitOrder({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phoneClean,
        file: selectedFile,
      });

      if (!result.success) {
        setErrorMessage(result.message || 'Unable to submit your resume. Please try again.');
        return;
      }

      setIsSuccess(true);
      // Reset form
      setFullName('');
      setEmail('');
      setPhone('');
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'A network error occurred while submitting your resume.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <button 
            onClick={() => onNavigate('/')} 
            className="hover:text-blue-600 transition-colors cursor-pointer"
          >
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-800 font-semibold">Resume Review</span>
        </nav>

        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Official Candidate Career Service</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 font-display tracking-tight leading-tight">
            ATS Resume Review &amp; Optimization
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Get your resume reviewed by hiring specialists to beat Applicant Tracking Systems (ATS), fix formatting flaws, and secure 3x more interview callbacks.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">ATS Score Analysis</h4>
              <p className="text-xs text-slate-500 mt-1">Detailed keyword match, section parsability, and formatting audit.</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">WhatsApp Feedback</h4>
              <p className="text-xs text-slate-500 mt-1">Receive direct suggestions and personalized feedback directly on WhatsApp.</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">100% Confidential</h4>
              <p className="text-xs text-slate-500 mt-1">Your data and resumes are stored securely and never shared with third parties.</p>
            </div>
          </div>
        </div>

        {/* Resume Service Pricing & Deliverable Cards */}
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900">
              Select Your Resume Optimization Tier
            </h2>
            <p className="text-xs text-slate-500">
              Choose the package that fits your career goals. You can upload your CV below for any selected plan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {RESUME_PLANS.map((plan) => (
              <ResumeServiceCard
                key={plan.id}
                plan={plan}
                onSelect={(p) => {
                  setSelectedPlan(p);
                  const formEl = document.getElementById('resume-submit-form');
                  formEl?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            ))}
          </div>
        </div>

        {/* Main Form Container */}
        <div id="resume-submit-form" className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xs relative overflow-hidden">
          
          {isSuccess ? (
            /* Success State Confirmation */
            <div className="py-8 text-center space-y-6 animate-fadeIn max-w-lg mx-auto">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold font-display text-slate-900">
                  Submission Received!
                </h3>
                <p className="text-sm text-slate-700 font-medium bg-emerald-50 border border-emerald-200/80 py-3 px-4 rounded-xl leading-relaxed">
                  Your resume has been submitted successfully. Our team will contact you on WhatsApp.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200/60 text-xs text-slate-600 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Next Steps:</span>
                </div>
                <ul className="space-y-1.5 list-disc pl-4 text-slate-600">
                  <li>Our technical recruiters will analyze your resume against top ATS filters.</li>
                  <li>You will receive an actionable feedback breakdown on your WhatsApp number within 24-48 hours.</li>
                </ul>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSuccess(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Submit Another Resume
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/jobs')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Explore Open Jobs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Resume Review Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="border-b border-slate-100 pb-5">
                <h2 className="text-xl font-bold font-display text-slate-900">
                  Submit Your Resume for Review
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Fill in your details below and upload your current resume. There are no fees or payments required.
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error: </span>
                    {errorMessage}
                  </div>
                </div>
              )}

              {/* Input: Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                />
              </div>

              {/* Grid: Email & WhatsApp Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Input: Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul.sharma@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                  />
                  <p className="text-[11px] text-slate-400">
                    Used to send a copy of your review report.
                  </p>
                </div>

                {/* Input: WhatsApp Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none">
                      <MessageSquare className="w-4 h-4 fill-emerald-100" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Our team will contact you directly on this WhatsApp number.
                  </p>
                </div>
              </div>

              {/* Input: Resume Upload Area (Drag & Drop) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Resume Upload (PDF / DOC / DOCX) <span className="text-red-500">*</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                  className="hidden"
                />

                {!selectedFile ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
                        : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      Click to upload or drag &amp; drop
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Supported formats: <strong>PDF, DOC, DOCX</strong> (Up to 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.name.split('.').pop()?.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1.5 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm sm:text-base rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Uploading &amp; Submitting Resume...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Resume</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-400">
                🔒 No payment required. Your contact details will only be used to communicate your resume audit findings.
              </p>
            </form>
          )}

        </div>

        {/* Informational FAQ / Value Strip */}
        <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200/60 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>Why ATS Optimization Matters for Freshers &amp; Students</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
            <div>
              <p className="font-semibold text-slate-800 mb-1">Over 75% of resumes are filtered out by automated bots</p>
              Top companies (TCS, Infosys, Wipro, Amazon, Google) use automated parsers to match skills and experience before any recruiter views the document.
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">Direct feedback from career experts</p>
              We inspect header formatting, typography, action verbs, and quantifiable impact metrics to elevate your profile for active campus and off-campus drives.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
