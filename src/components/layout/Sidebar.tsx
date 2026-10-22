import React from 'react';
import {
  Home,
  Briefcase,
  GraduationCap,
  Laptop,
  Video,
  FileCheck2,
  FileCode2,
  BookOpen,
  Building2,
  Lock,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Route,
  Mail,
  X
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
  badge?: string;
  badgeColor?: string;
  tooltip?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const handleNav = (path: string) => {
    onNavigate(path);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const isLinkActive = (path: string, matchPrefix?: string) => {
    if (path === '/') {
      return currentPath === '/';
    }
    if (path.includes('?')) {
      const [basePath, targetQuery] = path.split('?');
      const currentQuery = typeof window !== 'undefined' ? window.location.search.replace('?', '') : '';
      return currentPath === basePath && currentQuery.includes(targetQuery);
    }
    if (matchPrefix && currentPath.startsWith(matchPrefix)) {
      return true;
    }
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  const navSections: NavSection[] = [
    {
      title: 'MAIN MENU',
      items: [
        { label: 'Home', path: '/', icon: Home },
        { label: 'All Jobs', path: '/jobs', icon: Briefcase },
        {
          label: 'Internships',
          path: '/jobs?type=Internship',
          matchPrefix: '/internships',
          icon: GraduationCap,
          badge: 'Popular',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        },
        {
          label: 'Work From Home',
          path: '/jobs?location=Remote',
          matchPrefix: '/work-from-home',
          icon: Laptop,
          badge: 'Remote',
          badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        },
      ],
    },
    {
      title: 'CAREER BOOST',
      items: [
        {
          label: 'Personal Career Roadmap',
          path: '/career-roadmap',
          icon: Route,
          badge: 'AI Plan',
          badgeColor: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-2xs',
        },
        {
          label: 'Mock Interview',
          path: '/mock-interview',
          icon: Video,
          badge: '₹99',
          badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-2xs',
        },
        {
          label: 'Resume Review',
          path: '/resume-review',
          icon: FileCheck2,
          badge: 'Free ATS',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200/80',
        },
        {
          label: 'AI Website Dev',
          path: '/website-development',
          icon: Cpu,
          badge: 'New ₹499',
          badgeColor: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-extrabold shadow-2xs',
        },
        {
          label: 'Portfolio Service',
          path: '/portfolio-service',
          icon: FileCode2,
          badge: 'From ₹499',
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200/80',
        },
      ],
    },
    {
      title: 'RESOURCES',
      items: [
        {
          label: 'Gmail Outreach Studio',
          path: '/gmail',
          icon: Mail,
          badge: 'Gmail API',
          badgeColor: 'bg-red-50 text-red-700 border-red-200/80',
        },
        {
          label: 'Study Materials',
          path: '/materials',
          icon: BookOpen,
          badge: 'Free PDF',
          badgeColor: 'bg-teal-50 text-teal-700 border-teal-200/80',
        },
      ],
    },
    {
      title: 'RECRUITER & ADMIN',
      items: [
        {
          label: 'Recruiter Zone',
          path: '/recruiter/dashboard',
          matchPrefix: '/recruiter',
          icon: Building2,
        },
        {
          label: 'Admin Portal',
          path: '/admin/login',
          icon: Lock,
          tooltip: 'Admin & Recruiter Access Only',
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-slate-900 border-r border-slate-200/90 shadow-2xs select-none">
      {/* 1. Sidebar Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 shrink-0">
        <button
          onClick={() => handleNav('/')}
          className="flex items-center text-left focus:outline-none group cursor-pointer overflow-hidden"
        >
          {isCollapsed ? (
            <BrandLogo size="md" iconOnly={true} />
          ) : (
            <BrandLogo size="md" showTagline={true} />
          )}
        </button>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Desktop Collapse Toggle */}
        {onToggleCollapse && !onCloseMobile && (
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200/60 transition-all cursor-pointer shrink-0"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* 2. Navigation Items List */}
      <div className="flex-1 sidebar-scroll px-3 py-4 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {/* Section Header */}
            {!isCollapsed && (
              <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {section.title}
              </div>
            )}

            {section.items.map((item) => {
              const active = isLinkActive(item.path, item.matchPrefix);
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  onClick={() => handleNav(item.path)}
                  title={isCollapsed ? `${item.label}${item.tooltip ? ` (${item.tooltip})` : ''}` : item.tooltip}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer group relative ${
                    active
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      active ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'
                    }`}
                  />

                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="text-[13px] tracking-tight truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md border text-nowrap font-bold ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Active Indicator Bar on left for collapsed mode */}
                  {isCollapsed && active && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full" />
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Post a Job Free Button in Navigation */}
        <div className="pt-2">
          <button
            onClick={() => handleNav('/post-job')}
            className={`w-full flex items-center gap-2.5 ${
              isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
            } text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-xs transition-all duration-200 cursor-pointer btn-glow`}
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Post a Job Free</span>}
          </button>
        </div>
      </div>

      {/* 3. Promotional Sidebar Bottom Card */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-100 shrink-0">
          <div className="p-3.5 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-2xl text-white relative overflow-hidden shadow-sm">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px] uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Special Offer</span>
            </div>
            <h4 className="text-xs font-extrabold text-white leading-tight mb-1">
              1-on-1 Mock Interview
            </h4>
            <p className="text-[11px] text-slate-300 mb-3 leading-snug">
              Practice with IT experts for <span className="text-amber-300 font-bold">₹99</span> &amp; get hired faster.
            </p>
            <button
              onClick={() => handleNav('/mock-interview')}
              className="w-full py-1.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-[11px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
            >
              <span>Book Slot</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Bottom Verified Badge */}
      <div className="p-3 border-t border-slate-100 text-center text-[11px] text-slate-500 shrink-0 bg-slate-50/50">
        {!isCollapsed ? (
          <div className="flex items-center justify-center gap-1.5 font-medium text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>100% Verified Job Links</span>
          </div>
        ) : (
          <div title="100% Verified Job Links">
            <ShieldCheck className="w-4 h-4 mx-auto text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobile}
          />

          {/* Drawer Window */}
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl z-10 flex flex-col transform transition-transform duration-300 ease-out">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
