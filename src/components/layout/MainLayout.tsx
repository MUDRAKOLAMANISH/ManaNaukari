import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { WhatsAppCommunityPopup } from '../common/WhatsAppCommunityPopup';
import { FloatingChatbot } from '../chat/FloatingChatbot';
import { FloatingOfferWidget } from '../common/FloatingOfferWidget';
import { TopJobAnnouncementTicker } from '../home/TopJobAnnouncementTicker';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, currentPath, onNavigate }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mana_sidebar_collapsed') === 'true';
    }
    return false;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mana_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Content Wrapper */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header Navbar */}
        <Navbar
          currentPath={currentPath}
          onNavigate={onNavigate}
          onToggleMobileSidebar={toggleMobileSidebar}
          onToggleSidebarCollapse={toggleSidebarCollapse}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Top Job Announcement Ticker (Homepage only) */}
        {(currentPath === '/' || currentPath === '') && (
          <TopJobAnnouncementTicker onNavigate={onNavigate} />
        )}

        {/* Main Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <Footer onNavigate={onNavigate} />
      </div>

      {/* Global Overlays & Floating Widgets */}
      <WhatsAppCommunityPopup currentPath={currentPath} />
      <FloatingChatbot onNavigate={onNavigate} />
      <FloatingOfferWidget onNavigate={onNavigate} />
    </div>
  );
};
