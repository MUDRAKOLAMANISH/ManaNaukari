import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';
import { Loader2, ShieldCheck } from 'lucide-react';

interface UserProtectedRouteProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const UserProtectedRoute: React.FC<UserProtectedRouteProps> = ({ children, currentPath, onNavigate }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      const isAuthPage = currentPath === '/login' ||
        currentPath === '/signup' ||
        currentPath === '/forgot-password' ||
        currentPath === '/update-password' ||
        currentPath.startsWith('/admin');

      if (!isAuthPage) {
        const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
        onNavigate(redirectUrl);
      }
    }
  }, [user, loading, currentPath, onNavigate]);

  // 1. Initial Session Checking State (Full-page brand loader to prevent flash of login screen)
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="space-y-4 max-w-sm w-full bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl flex flex-col items-center">
          <BrandLogo size="lg" showTagline={false} />
          
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 mt-2">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800">
              Verifying Your Session...
            </p>
            <p className="text-[11px] text-slate-500">
              Securing connection with Supabase Auth
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated User (Redirecting to /login)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="space-y-4 max-w-sm w-full bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl flex flex-col items-center">
          <BrandLogo size="lg" showTagline={false} />
          
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 mt-2">
            <ShieldCheck className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800">
              Login Required
            </p>
            <p className="text-[11px] text-slate-500">
              Redirecting to Mana Naukari login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated User
  return <>{children}</>;
};
