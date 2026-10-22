import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../../components/common/BrandLogo';
import { Mail, AlertCircle, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';

interface ForgotPasswordPageProps {
  onNavigate: (path: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use real production URL route
      const redirectUrl = `${window.location.origin}/update-password`;
      const { error } = await resetPassword(cleanEmail, redirectUrl);

      if (error) {
        setErrorMessage(error.message || 'Error sending password reset email. Please try again.');
      } else {
        setIsSent(true);
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans animate-fadeIn">
      
      {/* Top Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <button
          onClick={() => onNavigate('/')}
          className="inline-block cursor-pointer focus:outline-none hover:opacity-90 transition-opacity"
        >
          <BrandLogo size="lg" showTagline={true} />
        </button>

        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight flex items-center justify-center gap-2">
            <KeyRound className="w-6 h-6 text-blue-600" />
            <span>Reset Password</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-sm mx-auto">
            Enter your registered email address to receive a secure password reset link.
          </p>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200/80 space-y-6">

          {isSent ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-lg text-slate-900 font-display">Password Reset Link Sent!</h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  We have sent password reset instructions to <span className="font-bold text-slate-900">{email}</span>. Please check your inbox and click the link to set a new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label htmlFor="reset-email" className="block font-bold text-slate-700 mb-1.5">
                    Your Registered Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 active:from-blue-800 disabled:opacity-60 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 btn-glow"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Reset Email...</span>
                      </>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>
                </div>
              </form>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </>
          )}

        </div>

        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Secured with Supabase Password Recovery</span>
        </div>
      </div>

    </div>
  );
};
