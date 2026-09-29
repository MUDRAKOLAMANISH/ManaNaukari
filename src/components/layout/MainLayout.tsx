import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { WhatsAppCommunityPopup } from '../common/WhatsAppCommunityPopup';
import { FloatingChatbot } from '../chat/FloatingChatbot';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, currentPath, onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. Global Navigation Bar */}
      <Navbar currentPath={currentPath} onNavigate={onNavigate} />

      {/* 2. Main Page Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* 3. Global WhatsApp Community Join Popup (Public Pages only) */}
      <WhatsAppCommunityPopup currentPath={currentPath} />

      {/* 4. Global Floating AI RAG Chatbot */}
      <FloatingChatbot onNavigate={onNavigate} />

      {/* 5. Global Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
