import React, { useEffect } from 'react';
import { AdminLoginForm } from '../../components/auth/AdminLoginForm';
import { useAuth } from '../../context/AuthContext';
import { Briefcase, ShieldCheck, ArrowLeft } from 'lucide-react';

interface AdminLoginPageProps {
  onNavigate: (path: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onNavigate }) => {
  const { user, isAdmin, loading } = useAuth();

  // If already authenticated as admin, allow direct transition
  useEffect(() => {
    if (!loading && user && isAdmin) {
      onNavigate('/admin');
    }
  }, [user, isAdmin, loading, onNavigate]);

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-10 px-4 sm:px-6">
      
      {/* Return to website link */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between text-xs">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Candidate Portal</span>
        </button>

        <span className="text-slate-400 font-medium">Internal Gateway</span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-7 sm:p-9 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-sm">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Admin Authentication</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
              Sign In to Mana Naukari
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authorized recruitment officers & platform administrators only
            </p>
          </div>
        </div>

        {/* Form Component */}
        <AdminLoginForm onSuccess={() => onNavigate('/admin')} />

      </div>

      {/* Footer Disclaimer */}
      <div className="mt-8 text-center text-xs text-slate-400 max-w-xs leading-relaxed">
        Unauthorized access attempts to administrative endpoints are monitored and logged according to IT security compliance.
      </div>

    </div>
  );
};
