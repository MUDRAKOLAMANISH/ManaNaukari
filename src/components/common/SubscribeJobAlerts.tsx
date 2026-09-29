import React, { useState } from 'react';
import { Mail, Check, Bell, Sparkles, CheckCircle2, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { jobAlertSubscribersService } from '../../services/supabaseService';

interface SubscribeJobAlertsProps {
  className?: string;
  defaultCategory?: string;
  compact?: boolean;
}

const AVAILABLE_CATEGORIES = [
  'Freshers',
  'Internships',
  'Work From Home',
  'Software Engineer',
  'Frontend / React',
  'Backend / Node',
  'Data Science / AI',
  'DevOps & Cloud',
];

export const SubscribeJobAlerts: React.FC<SubscribeJobAlertsProps> = ({
  className = '',
  defaultCategory,
  compact = false,
}) => {
  const [email, setEmail] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    return defaultCategory ? [defaultCategory] : ['Freshers', 'Internships'];
  });
  const [frequency, setFrequency] = useState<'daily' | 'instant'>('daily');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length === 1) return; // keep at least one
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (selectedCategories.length === 0) {
      setErrorMessage('Please select at least one category for job alerts.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await jobAlertSubscribersService.subscribe({
        email: emailTrimmed,
        categories: selectedCategories,
        frequency,
      });

      if (!result.success) {
        if (result.isDuplicate) {
          setErrorMessage('This email is already subscribed to job alerts.');
        } else {
          setErrorMessage(result.message || 'Unable to save subscription. Please try again.');
        }
        return;
      }

      // Successfully saved to Supabase job_alert_subscribers
      setIsSuccess(true);
      setEmail('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        className={`bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-3xl p-8 sm:p-10 text-center shadow-xs ${className}`}
      >
        <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-emerald-600/20">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold font-display text-slate-900 mb-2">
          Successfully subscribed to job alerts.
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed mb-6">
          We've recorded your preferences for{' '}
          <strong className="text-emerald-800 font-semibold">
            {selectedCategories.join(', ')}
          </strong>
          . You'll receive verified job openings directly in your inbox ({frequency === 'daily' ? 'Daily' : 'Instant'}).
        </p>
        <button
          onClick={() => {
            setIsSuccess(false);
            setErrorMessage(null);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors cursor-pointer"
        >
          <span>Subscribe another email</span>
        </button>
      </div>
    );
  }

  return (
    <section
      className={`bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 relative overflow-hidden ${className}`}
    >
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-50/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50/60 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-2">
              <Bell className="w-3.5 h-3.5 text-blue-600" />
              <span>Free Job Notifications</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold font-display tracking-tight text-slate-900">
              Subscribe to Daily Job Alerts
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Never miss an off-campus drive, walk-in, or internship matching your career goals.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span className="text-xs font-medium text-slate-500">Frequency:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setFrequency('daily')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  frequency === 'daily'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setFrequency('instant')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  frequency === 'instant'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Instant
              </button>
            </div>
          </div>
        </div>

        {/* Category Preference Tags */}
        <div className="py-5 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Select categories you want updates for:</span>
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            {AVAILABLE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-transparent'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter your email address (e.g. name@example.com)"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Subscribing...</span>
                </>
              ) : (
                <>
                  <span>Get Job Alerts</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>🛡️ No spam ever. One-click unsubscribe at any time.</span>
            <span className="hidden sm:inline">Selected: {selectedCategories.length} categories</span>
          </div>
        </form>
      </div>
    </section>
  );
};

