import React, { useState } from 'react';
import { Menu, X, Briefcase, User, Sparkles, Building2, Lock, UserPlus, ArrowRight } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Exact navigation links preserved:
  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Jobs', path: '/jobs' },
    { label: 'Internships', path: '/jobs?type=Internship', matchPrefix: '/internships' },
    { label: 'Work From Home', path: '/jobs?location=Remote', matchPrefix: '/work-from-home' },
    { label: 'Resume Review', path: '/resume-review' },
    { label: 'Portfolio Service', path: '/portfolio-service' },
    { label: 'Study Materials', path: '/materials' },
    { label: 'Recruiter Zone', path: '/recruiter/dashboard', matchPrefix: '/recruiter' },
  ];

  const handleNav = (path: string) => {
    onNavigate(path);
    setIsMobileMenuOpen(false);
  };

  const isLinkActive = (link: typeof navLinks[0]) => {
    if (link.path === '/') {
      return currentPath === '/';
    }
    if (link.path.includes('?')) {
      const targetQuery = link.path.split('?')[1];
      const currentQuery = typeof window !== 'undefined' ? window.location.search.replace('?', '') : '';
      return currentPath === '/jobs' && currentQuery.includes(targetQuery);
    }
    if (link.matchPrefix && currentPath.startsWith(link.matchPrefix)) {
      return true;
    }
    return currentPath === link.path || currentPath.startsWith(`${link.path}/`);
  };

  return (
    <header className="sticky top-0 z-40 glass-nav shadow-xs transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <button
          onClick={() => handleNav('/')}
          className="flex items-center text-left focus:outline-none group cursor-pointer shrink-0 transition-transform duration-200 hover:scale-[1.02]"
        >
          <BrandLogo size="md" showTagline={true} />
        </button>

        {/* Desktop Primary Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-100/70 p-1 rounded-2xl border border-slate-200/60">
          {navLinks.map((link) => {
            const active = isLinkActive(link);
            return (
              <button
                key={link.label}
                onClick={() => handleNav(link.path)}
                className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer text-[13px] tracking-tight ${
                  active 
                    ? 'bg-white text-blue-600 font-semibold shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Medium Desktop Navigation (Compact view for lg screens) */}
        <nav className="hidden lg:flex xl:hidden items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100/70 p-1 rounded-2xl border border-slate-200/60">
          {navLinks.slice(0, 7).map((link) => {
            const active = isLinkActive(link);
            return (
              <button
                key={link.label}
                onClick={() => handleNav(link.path)}
                className={`px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  active 
                    ? 'bg-white text-blue-600 font-semibold shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Action Buttons: Admin Portal, Sign Up / Post Job */}
        <div className="hidden sm:flex items-center gap-2.5 shrink-0">
          {/* Admin Portal Button with Tooltip */}
          <div className="relative group">
            <button
              onClick={() => handleNav('/admin/login')}
              title="Admin & Recruiter Access Only"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/90 rounded-xl transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs group"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" />
              <span>Admin Portal</span>
            </button>

            {/* Hover Tooltip: Admin & Recruiter Access Only */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
              Admin &amp; Recruiter Access Only
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
            </div>
          </div>

          {/* Sign Up / Recruiter Join */}
          <button
            onClick={() => handleNav('/post-job')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-xs transition-all duration-200 cursor-pointer btn-glow"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Post a Job Free</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none rounded-xl cursor-pointer transition-colors"
          aria-label="Toggle navigation"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-5 pt-3 pb-6 space-y-1.5 animate-fadeIn shadow-xl max-h-[85vh] overflow-y-auto">
          {navLinks.map((link) => {
            const active = isLinkActive(link);
            return (
              <button
                key={link.label}
                onClick={() => handleNav(link.path)}
                className={`block w-full text-left px-4 py-2.5 text-sm rounded-xl transition-all duration-200 ${
                  active 
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100' 
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                {link.label}
              </button>
            );
          })}

          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleNav('/admin/login')}
                title="Admin & Recruiter Access Only"
                className="w-full text-center py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Admin Portal</span>
              </button>
              <button
                onClick={() => handleNav('/post-job')}
                className="w-full text-center py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Post Job</span>
              </button>
            </div>
            <button
              onClick={() => handleNav('/jobs')}
              className="w-full text-center py-2.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Browse All Verified Jobs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
