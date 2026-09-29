import React, { useState } from 'react';
import { Menu, X, Briefcase, User, Sparkles, Building2, LogIn, UserPlus } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Exact navigation links requested:
  // Home, Jobs, Internships, Work From Home, Resume Review, Portfolio Service, Recruiter Zone
  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Jobs', path: '/jobs' },
    { label: 'Internships', path: '/jobs?type=Internship', matchPrefix: '/internships' },
    { label: 'Work From Home', path: '/jobs?location=Remote', matchPrefix: '/work-from-home' },
    { label: 'Resume Review', path: '/resume-review' },
    { label: 'Portfolio Service', path: '/portfolio-service' },
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <button
          onClick={() => handleNav('/')}
          className="flex items-center text-left focus:outline-none group cursor-pointer shrink-0"
        >
          <BrandLogo size="md" showTagline={true} />
        </button>

        {/* Desktop Primary Navigation Links */}
        <nav className="hidden xl:flex items-center gap-6 text-sm font-medium text-slate-600">
          {navLinks.map((link) => {
            const active = isLinkActive(link);
            return (
              <button
                key={link.label}
                onClick={() => handleNav(link.path)}
                className={`py-1.5 transition-colors cursor-pointer relative text-[13px] tracking-tight ${
                  active 
                    ? 'text-blue-600 font-semibold' 
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Medium Desktop Navigation (Compact view for lg screens) */}
        <nav className="hidden lg:flex xl:hidden items-center gap-4 text-xs font-medium text-slate-600">
          {navLinks.slice(0, 5).map((link) => {
            const active = isLinkActive(link);
            return (
              <button
                key={link.label}
                onClick={() => handleNav(link.path)}
                className={`py-1 transition-colors cursor-pointer relative ${
                  active 
                    ? 'text-blue-600 font-semibold' 
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute -bottom-[23px] left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Buttons: Login, Sign Up / Post Job */}
        <div className="hidden sm:flex items-center gap-2.5 shrink-0">
          {/* Login button */}
          <button
            onClick={() => handleNav('/admin/login')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100/80 rounded-xl transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-slate-500" />
            <span>Login</span>
          </button>

          {/* Sign Up / Recruiter Join */}
          <button
            onClick={() => handleNav('/post-job')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up / Post Job</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 focus:outline-none rounded-xl cursor-pointer"
          aria-label="Toggle navigation"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-5 pt-3 pb-6 space-y-1.5 animate-fadeIn shadow-xl max-h-[85vh] overflow-y-auto">
          {navLinks.map((link) => {
            const active = isLinkActive(link);
            return (
              <button
                key={link.label}
                onClick={() => handleNav(link.path)}
                className={`block w-full text-left px-3.5 py-2.5 text-sm rounded-xl transition-colors ${
                  active 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                {link.label}
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleNav('/admin/login')}
                className="w-full text-center py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
              <button
                onClick={() => handleNav('/post-job')}
                className="w-full text-center py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </button>
            </div>
            <button
              onClick={() => handleNav('/jobs')}
              className="w-full text-center py-2.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl transition-colors"
            >
              Browse All Verified Jobs
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
