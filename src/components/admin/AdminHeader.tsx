import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, LogOut, Plus, ShieldCheck, Sparkles, UserCheck, Layers, BarChart3, FileText, Users, Database } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  onNavigate: (path: string) => void;
  showAddButton?: boolean;
  showImportButton?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  onNavigate,
  showAddButton = false,
  showImportButton = true,
}) => {
  const { adminProfile, signOut } = useAuth();
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  const handleSignOut = async () => {
    await signOut();
    onNavigate('/admin/login');
  };

  return (
    <div className="bg-white border-b border-slate-200 mb-6 pb-4">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/admin/jobs')}
            className="flex items-center gap-2 text-slate-900 hover:text-blue-600 transition-colors focus:outline-none cursor-pointer"
          >
            <BrandLogo size="sm" iconOnly={true} />
            <span className="font-bold text-base tracking-tight">
              Mana Naukari Admin
            </span>
          </button>

          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Recruiter Console
          </span>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => onNavigate('/admin/jobs')}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer ${
              currentPath === '/admin/jobs' || currentPath === '/admin'
                ? 'text-blue-700 bg-blue-50'
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
            }`}
          >
            All Live Jobs
          </button>
          <button
            onClick={() => onNavigate('/admin/recruiters')}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 ${
              currentPath === '/admin/recruiters' || currentPath === '/admin/approvals'
                ? 'text-blue-700 bg-blue-50'
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Recruiter Approvals</span>
          </button>
          <button
            onClick={() => onNavigate('/admin/applicants')}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 ${
              currentPath === '/admin/applicants'
                ? 'text-blue-700 bg-blue-50 border border-blue-200/60 font-bold'
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Applicants</span>
          </button>
          <button
            onClick={() => onNavigate('/admin/resume-orders')}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 ${
              currentPath === '/admin/resume-orders'
                ? 'text-blue-700 bg-blue-50 border border-blue-200/60 font-bold'
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Resume Orders</span>
          </button>
          <button
            onClick={() => onNavigate('/admin/analytics')}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 ${
              currentPath === '/admin/analytics'
                ? 'text-blue-700 bg-blue-50 border border-blue-200/60 font-bold'
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => onNavigate('/admin/knowledge-base')}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 ${
              currentPath === '/admin/knowledge-base'
                ? 'text-blue-700 bg-blue-50 border border-blue-200/60 font-bold'
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Knowledge Base (RAG)</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {adminProfile && (
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-slate-800">{adminProfile.name}</div>
              <div className="text-[10px] text-slate-400 capitalize">{adminProfile.role.replace('_', ' ')}</div>
            </div>
          )}

          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="View public candidate portal"
          >
            <span>Public Site</span>
          </button>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Sign out of admin session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Title & Action Strip */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {showImportButton && (
            <button
              onClick={() => onNavigate('/admin/import-job')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
              title="Import job automatically via AI from official URL"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>AI Import from URL</span>
            </button>
          )}

          {showAddButton && (
            <button
              onClick={() => onNavigate('/admin/jobs/new')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Job</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
