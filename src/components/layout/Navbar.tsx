import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Menu, Lock, UserPlus, Search, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onToggleMobileSidebar?: () => void;
  onToggleSidebarCollapse?: () => void;
  isSidebarCollapsed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  onNavigate,
  onToggleMobileSidebar,
  onToggleSidebarCollapse,
  isSidebarCollapsed = false,
}) => {
  const { user, isAdmin, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`/jobs?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      onNavigate('/jobs');
    }
  };

  const handleAdminSignOut = async () => {
    await signOut();
    onNavigate('/admin/login');
  };

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left Actions: Mobile Menu Toggle & Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none rounded-xl cursor-pointer transition-colors"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => onNavigate('/')}
            className="flex items-center text-left focus:outline-none cursor-pointer group lg:hidden"
          >
            <BrandLogo size="sm" showTagline={false} />
          </button>
        </div>

        {/* Center: Quick Job Search Input */}
        <div className="flex-1 max-w-md mx-auto hidden sm:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs, skills, or companies..."
              className="w-full pl-9 pr-20 py-2 text-xs bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Right Actions: Admin Portal & Post a Job */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Admin Logged-In Badge / Logout or Admin Login Button */}
          {user && isAdmin ? (
            <div className="flex items-center gap-2">
              <div
                title={`Admin Authenticated (${user.email})`}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-900"
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="max-w-[120px] truncate">{user.email?.split('@')[0]} (Admin)</span>
              </div>

              <button
                onClick={handleAdminSignOut}
                title="Sign out of Admin session"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin Logout</span>
              </button>
            </div>
          ) : (
            <div className="relative group">
              <button
                onClick={() => onNavigate('/admin/login')}
                title="Admin Portal Access"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl transition-all duration-200 cursor-pointer shadow-2xs group"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" />
                <span className="hidden sm:inline">Admin Portal</span>
              </button>
            </div>
          )}

          {/* Post a Job Free CTA */}
          <button
            onClick={() => onNavigate('/post-job')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-xs transition-all duration-200 cursor-pointer btn-glow"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Post a Job</span>
          </button>
        </div>
      </div>
    </header>
  );
};
