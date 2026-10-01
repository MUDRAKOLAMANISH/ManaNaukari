import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { matchRoute } from './routes/router';
import { analyticsTracker } from './services/analyticsTracker';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Sync with browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Automatic visitor page telemetry across all routes (Homepage, Jobs, Internships, WFH, etc.)
  useEffect(() => {
    analyticsTracker.autoTrackCurrentRoute(currentPath);
  }, [currentPath]);

  const handleNavigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { component, title, isBareLayout } = matchRoute(currentPath, handleNavigate);

  useEffect(() => {
    // For job detail pages, JobDetailsPage sets the high-fidelity dynamic job title + meta tags
    if (!currentPath.startsWith('/jobs/')) {
      document.title = title;
    }
  }, [title, currentPath]);

  return (
    <AuthProvider>
      {isBareLayout ? (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-center">
          <motion.div
            key={currentPath}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {component}
          </motion.div>
        </div>
      ) : (
        <MainLayout currentPath={currentPath} onNavigate={handleNavigate}>
          <motion.div
            key={currentPath}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {component}
          </motion.div>
        </MainLayout>
      )}
    </AuthProvider>
  );
}
