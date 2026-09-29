import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { matchRoute } from './routes/router';

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
          {component}
        </div>
      ) : (
        <MainLayout currentPath={currentPath} onNavigate={handleNavigate}>
          {component}
        </MainLayout>
      )}
    </AuthProvider>
  );
}
