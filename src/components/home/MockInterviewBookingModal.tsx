import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, ShieldCheck, AlertCircle, MessageSquare, ChevronDown } from 'lucide-react';
import {
  mockInterviewService,
  INTERVIEW_TOPICS,
  EXPERIENCE_LEVELS,
  INTERVIEW_MODES,
  MOCK_INTERVIEW_PRICE_INR,
} from '../../services/mockInterviewService';
import { MockInterviewBooking } from '../../types/database.types';

interface MockInterviewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

export const MockInterviewBookingModal: React.FC<MockInterviewBookingModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [interviewTopic, setInterviewTopic] = useState('Python');
  const [customTopic, setCustomTopic] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Fresher');
  const [interviewMode, setInterviewMode] = useState('Technical Interview');
  const [preferredAvailability, setPreferredAvailability] = useState('');
  const [additionalInformation, setAdditionalInformation] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // Status & Validation
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedBooking, setSubmittedBooking] = useState<MockInterviewBooking | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = 'Full Name is required (minimum 2 characters).';
    }

    if (!email.trim() || !email.trim().includes('@') || !email.trim().includes('.')) {
      newErrors.email = 'Please enter a valid email address.';
    }

    const digits = whatsappNumber.replace(/[^\d]/g, '');
    if (!whatsappNumber.trim() || digits.length < 10) {
      newErrors.whatsappNumber = 'Please enter a valid 10-digit WhatsApp mobile number.';
    }

    if (!interviewTopic) {
      newErrors.interviewTopic = 'Please select an interview topic.';
    }

    if (interviewTopic === 'Other' && !customTopic.trim()) {
      newErrors.customTopic = 'Please specify your interview topic.';
    }

    if (!agreedToTerms) {
      newErrors.agreedToTerms = 'You must agree to be contacted via WhatsApp and email.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await mockInterviewService.createBooking({
        fullName,
        email,
        whatsappNumber,
        interviewTopic,
        customTopic,
        experienceLevel,
        interviewMode,
        preferredAvailability,
        additionalInformation,
        agreedToTerms,
      });

      if (res.success && res.data) {
        setSubmittedBooking(res.data);
      } else {
        setErrorMessage(res.message || 'Failed to submit booking. Please try again.');
      }
    } catch (err: any) {
      console.error('[MockInterviewModal] Error submitting form:', err);
      setErrorMessage(err?.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedBooking(null);
    setFullName('');
    setEmail('');
    setWhatsappNumber('');
    setPreferredAvailability('');
    setAdditionalInformation('');
    setErrorMessage(null);
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0 font-bold">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black font-display tracking-tight text-white">
                  Book Mock Interview Session
                </h3>
                <span className="text-[10px] font-extrabold text-slate-950 bg-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  ₹{MOCK_INTERVIEW_PRICE_INR} Only
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                1-on-1 Practice with Feedback &amp; Action Plan
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
          {submittedBooking ? (
            /* Success View */
            <div className="text-center space-y-6 py-4 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-2xl font-black font-display text-slate-900">
                  Booking Request Received!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-semibold leading-relaxed">
                  Thank you, <strong className="text-slate-900">{submittedBooking.full_name}</strong>. Your session for <strong className="text-slate-900">{submittedBooking.interview_topic}</strong> has been registered.
                </p>
              </div>

              {/* Booking Summary Card */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left max-w-md mx-auto space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500 font-medium">Topic:</span>
                  <span className="font-bold text-slate-900">{submittedBooking.interview_topic}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500 font-medium">Session Fee:</span>
                  <span className="font-black text-amber-600">₹{MOCK_INTERVIEW_PRICE_INR}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500 font-medium">WhatsApp:</span>
                  <span className="font-bold text-slate-900">{submittedBooking.whatsapp_number}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500 font-medium">Mode:</span>
                  <span className="font-bold text-slate-900">{submittedBooking.interview_mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Pending Payment
                  </span>
                </div>
              </div>

              {/* Next Steps Banner */}
              <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 text-left max-w-md mx-auto space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  <span>Next Steps</span>
                </h4>
                <ol className="text-xs text-amber-950 font-medium space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Our team will send payment details to <strong className="font-bold">{submittedBooking.whatsapp_number}</strong>.</li>
                  <li>After completing ₹99 payment, your time slot will be confirmed.</li>
                </ol>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={handleResetAndClose}
                  className="px-6 py-2.5 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Booking Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Benefits Checklist Banner */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>1-on-1 Practice + Feedback Report</span>
                </div>
                <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                  ₹99 Flat Fee
                </span>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <span>Full Name</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                  }}
                  placeholder="e.g. Rahul Sharma"
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold ${
                    errors.fullName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                {errors.fullName && <p className="text-[11px] text-rose-600 font-bold">{errors.fullName}</p>}
              </div>

              {/* Email & WhatsApp Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>Email Address</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                    }}
                    placeholder="e.g. rahul@gmail.com"
                    className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold ${
                      errors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    }`}
                  />
                  {errors.email && <p className="text-[11px] text-rose-600 font-bold">{errors.email}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>WhatsApp Number</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => {
                      setWhatsappNumber(e.target.value);
                      if (errors.whatsappNumber) setErrors(prev => ({ ...prev, whatsappNumber: '' }));
                    }}
                    placeholder="e.g. 9876543210"
                    className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold ${
                      errors.whatsappNumber ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    }`}
                  />
                  {errors.whatsappNumber && <p className="text-[11px] text-rose-600 font-bold">{errors.whatsappNumber}</p>}
                </div>
              </div>

              {/* Select Interview Topic */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <span>Select Interview Topic</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={interviewTopic}
                    onChange={(e) => {
                      setInterviewTopic(e.target.value);
                      if (errors.interviewTopic) setErrors(prev => ({ ...prev, interviewTopic: '' }));
                    }}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold appearance-none pr-9 cursor-pointer"
                  >
                    {INTERVIEW_TOPICS.map((topic) => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {interviewTopic === 'Other' && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>Specify Custom Topic</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => {
                      setCustomTopic(e.target.value);
                      if (errors.customTopic) setErrors(prev => ({ ...prev, customTopic: '' }));
                    }}
                    placeholder="e.g. Node.js, AWS, Salesforce..."
                    className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold ${
                      errors.customTopic ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    }`}
                  />
                  {errors.customTopic && <p className="text-[11px] text-rose-600 font-bold">{errors.customTopic}</p>}
                </div>
              )}

              {/* Experience Level & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Experience Level</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold cursor-pointer"
                  >
                    {EXPERIENCE_LEVELS.map((exp) => (
                      <option key={exp} value={exp}>{exp}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Preferred Mode</label>
                  <select
                    value={interviewMode}
                    onChange={(e) => setInterviewMode(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold cursor-pointer"
                  >
                    {INTERVIEW_MODES.map((mode) => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Preferred Date / Time Slots <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={preferredAvailability}
                  onChange={(e) => setPreferredAvailability(e.target.value)}
                  placeholder="e.g. Weekdays after 6 PM or Saturday morning"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              {/* Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (errors.agreedToTerms) setErrors(prev => ({ ...prev, agreedToTerms: '' }));
                    }}
                    className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 font-medium leading-tight">
                    I agree to be contacted via WhatsApp and email for payment instructions.
                  </span>
                </label>
                {errors.agreedToTerms && <p className="text-[11px] text-rose-600 font-bold mt-1">{errors.agreedToTerms}</p>}
              </div>

              {/* Submit CTA */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs sm:text-sm font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Confirm Booking — ₹{MOCK_INTERVIEW_PRICE_INR}</span>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
};
