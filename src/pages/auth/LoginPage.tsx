import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../../components/common/BrandLogo';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (path: string) => void;
  redirectPath?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, redirectPath }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await signIn(cleanEmail, password);
      if (error) {
        let msg = error.message || 'Invalid login credentials.';
        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes('invalid login credentials') || lowerMsg.includes('invalid_grant')) {
          msg = 'Incorrect email address or password. Please check your credentials and try again.';
        } else if (lowerMsg.includes('email not confirmed') || lowerMsg.includes('email_not_confirmed') || lowerMsg.includes('not verified')) {
          msg = 'Email address not verified yet. Please check your inbox for the verification email sent by Supabase, click the link to confirm your account, and then try signing in again.';
        } else if (lowerMsg.includes('rate limit') || lowerMsg.includes('too many requests')) {
          msg = 'Too many login attempts. Please wait a few minutes before trying again.';
        }
        setErrorMessage(msg);
      } else {
        const destination = redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('/login')
          ? redirectPath
          : '/';
        onNavigate(destination);
      }
    } catch {
      setErrorMessage('An unexpected authentication error occurred. Please try again.');
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Welcome to Mana Naukari
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Your career journey starts here.
          </p>
        </div>
      </div>

      {/* Main Login Form Box */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200/80 space-y-6">

          {/* Validation Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
            
            {/* Email Field */}
            <div>
              <label htmlFor="user-email" className="block font-bold text-slate-700 mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="user-email"
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

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="user-password" className="block font-bold text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate('/forgot-password')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 active:from-blue-800 disabled:opacity-60 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 btn-glow"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in to Mana Naukari...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Divider */}
          <div className="relative border-t border-slate-200/80 my-4 text-center">
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider relative -top-2.5">
              New to Mana Naukari?
            </span>
          </div>

          {/* Create Account Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => onNavigate('/signup')}
              className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer border border-slate-200"
            >
              Create Free Account
            </button>
          </div>

        </div>

        {/* Security Footer Reassurance */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Secured with Supabase Auth &amp; Encrypted Sessions</span>
        </div>
      </div>

    </div>
  );
};
