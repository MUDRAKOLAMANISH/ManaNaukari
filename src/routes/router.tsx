import React from 'react';
import { HomePage } from '../pages/HomePage';
import { JobsPage } from '../pages/JobsPage';
import { JobDetailsPage } from '../pages/JobDetailsPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { CategoryDetailsPage } from '../pages/CategoryDetailsPage';
import { AboutPage } from '../pages/AboutPage';
import { ContactPage } from '../pages/ContactPage';
import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminJobsListPage } from '../pages/admin/AdminJobsListPage';
import { AddJobPage } from '../pages/admin/AddJobPage';
import { EditJobPage } from '../pages/admin/EditJobPage';
import { ImportJobPage } from '../pages/admin/ImportJobPage';
import { BulkImportPage } from '../pages/admin/BulkImportPage';
import { RecruiterJobsAdminPage } from '../pages/admin/RecruiterJobsAdminPage';
import { AdminAnalyticsPage } from '../pages/admin/AdminAnalyticsPage';
import { AdminResumeOrdersPage } from '../pages/admin/AdminResumeOrdersPage';
import { AdminApplicantsPage } from '../pages/admin/AdminApplicantsPage';
import { AdminKnowledgeBasePage } from '../pages/admin/AdminKnowledgeBasePage';
import { RecruiterPostJobPage } from '../pages/RecruiterPostJobPage';
import { RecruiterDashboardPage } from '../pages/RecruiterDashboardPage';
import { ResumeReviewPage } from '../pages/ResumeReviewPage';
import { PortfolioServicePage } from '../pages/PortfolioServicePage';
import { MaterialsPage } from '../pages/MaterialsPage';
import { AdminMaterialsPage } from '../pages/admin/AdminMaterialsPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { fromSlug } from '../utils/slugUtils';
import { extractJobIdFromSlug } from '../utils/jobUrlUtils';

export interface RouteMatch {
  component: React.ReactNode;
  title: string;
  isBareLayout?: boolean;
}

export function matchRoute(path: string, onNavigate: (targetPath: string) => void): RouteMatch {
  const cleanPath = path.split('?')[0];

  // 1. Admin Authentication Route
  if (cleanPath === '/admin/login') {
    return {
      component: <AdminLoginPage onNavigate={onNavigate} />,
      title: 'Admin Sign In | Mana Naukari',
      isBareLayout: true,
    };
  }

  // 2. Admin Create Job Route
  if (cleanPath === '/admin/jobs/new') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AddJobPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Post New Job | Mana Naukari Admin',
    };
  }

  // 2b. AI Job Import Assistant Route
  if (cleanPath === '/admin/import-job') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <ImportJobPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'AI Job Import Assistant | Mana Naukari Admin',
    };
  }

  // 2c. Bulk Job Import & Broadcast Center Route (Up to 10 URLs)
  if (cleanPath === '/admin/bulk-import' || cleanPath === '/admin/bulk-jobs') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <BulkImportPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Bulk Job Import & Broadcast | Mana Naukari Admin',
    };
  }

  // 3. Admin Edit Job Route: /admin/jobs/edit/:jobId (or legacy /admin/jobs/:id/edit)
  if (cleanPath.startsWith('/admin/jobs/edit/')) {
    const rawId = cleanPath.replace('/admin/jobs/edit/', '').split('/')[0];
    const jobId = decodeURIComponent(rawId || '');
    console.log('[Router] Matched Admin Edit Job Route (/admin/jobs/edit/:jobId) with jobId:', jobId);
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <EditJobPage jobId={jobId} onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Edit Job Opening | Mana Naukari Admin',
    };
  }

  if (cleanPath.startsWith('/admin/jobs/') && cleanPath.endsWith('/edit')) {
    const segments = cleanPath.split('/');
    const jobId = decodeURIComponent(segments[3] || '');
    console.log('[Router] Matched Admin Edit Job Route (/admin/jobs/:id/edit) with jobId:', jobId);
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <EditJobPage jobId={jobId} onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Edit Job Opening | Mana Naukari Admin',
    };
  }

  // 4. Admin Jobs Management Dashboard
  if (cleanPath === '/admin/jobs' || cleanPath === '/admin') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminJobsListPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Job Management | Mana Naukari Admin',
    };
  }

  // 4b. Admin Recruiter Submissions & Approvals
  if (cleanPath === '/admin/recruiters' || cleanPath === '/admin/approvals') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <RecruiterJobsAdminPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Recruiter Job Approvals | Mana Naukari Admin',
    };
  }

  // 4c. Admin Performance Analytics Dashboard
  if (cleanPath === '/admin/analytics') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminAnalyticsPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Platform Analytics | Mana Naukari Admin',
    };
  }

  // 4d. Admin ATS Resume Review Orders Management
  if (cleanPath === '/admin/resume-orders') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminResumeOrdersPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Resume Review Orders | Mana Naukari Admin',
    };
  }

  // 4e. Admin Applicants Management System
  if (cleanPath === '/admin/applicants') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminApplicantsPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Applicants Management | Mana Naukari Admin',
    };
  }

  // 4f. Admin Knowledge Base & AI RAG Management (/admin/knowledge-base)
  if (cleanPath === '/admin/knowledge-base' || cleanPath === '/admin/rag') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminKnowledgeBasePage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Knowledge Base & AI RAG | Mana Naukari Admin',
    };
  }

  // 4g. Admin Study Materials Management (/admin/materials)
  if (cleanPath === '/admin/materials') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminMaterialsPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Study Materials Management | Mana Naukari Admin',
    };
  }

  // 4c. Recruiter Portal Job Submission (/post-job or /recruiter/post-job)
  if (cleanPath === '/post-job' || cleanPath === '/recruiter/post-job') {
    return {
      component: <RecruiterPostJobPage onNavigate={onNavigate} />,
      title: 'Post a Job (Verified Recruiter) | Mana Naukari',
    };
  }

  // 4f. Recruiter Dashboard & Verification Management (/recruiter/dashboard)
  if (cleanPath === '/recruiter/dashboard' || cleanPath === '/recruiter') {
    return {
      component: <RecruiterDashboardPage onNavigate={onNavigate} />,
      title: 'Recruiter Dashboard | Mana Naukari',
    };
  }

  // 5. Dynamic Category Route: /categories/:category
  if (cleanPath.startsWith('/categories/') && cleanPath.length > '/categories/'.length) {
    const categorySlug = cleanPath.replace('/categories/', '');
    const readableTitle = fromSlug(categorySlug);
    return {
      component: <CategoryDetailsPage categorySlug={categorySlug} onNavigate={onNavigate} />,
      title: `${readableTitle} Jobs | Mana Naukari`,
    };
  }

  // 6. Dynamic Public Route: /jobs/:id or /jobs/:slug-:id
  if (cleanPath.startsWith('/jobs/') && cleanPath.length > '/jobs/'.length) {
    const rawParam = cleanPath.replace('/jobs/', '');
    const jobId = extractJobIdFromSlug(rawParam);
    return {
      component: <JobDetailsPage jobId={jobId} onNavigate={onNavigate} />,
      title: 'Job Details | Mana Naukari',
    };
  }

  // 7. Public Pages
  switch (cleanPath) {
    case '/portfolio-service':
      return {
        component: <PortfolioServicePage onNavigate={onNavigate} />,
        title: 'Portfolio Website Service | Mana Naukari',
      };
    case '/internships':
      return {
        component: <JobsPage onNavigate={onNavigate} />,
        title: 'Internships in India | Mana Naukari',
      };
    case '/work-from-home':
    case '/wfh':
      return {
        component: <JobsPage onNavigate={onNavigate} />,
        title: 'Work From Home (Remote) Jobs | Mana Naukari',
      };
    case '/resume-review':
      return {
        component: <ResumeReviewPage onNavigate={onNavigate} />,
        title: 'ATS Resume Review & Optimization | Mana Naukari',
      };
    case '/materials':
      return {
        component: <MaterialsPage onNavigate={onNavigate} />,
        title: 'Study Notes & Materials | Mana Naukari',
      };
    case '/jobs':
      return {
        component: <JobsPage onNavigate={onNavigate} />,
        title: 'Jobs | Mana Naukari',
      };
    case '/categories':
      return {
        component: <CategoriesPage onNavigate={onNavigate} />,
        title: 'Categories | Mana Naukari',
      };
    case '/about':
      return {
        component: <AboutPage onNavigate={onNavigate} />,
        title: 'About Us | Mana Naukari',
      };
    case '/contact':
      return {
        component: <ContactPage onNavigate={onNavigate} />,
        title: 'Contact Us | Mana Naukari',
      };
    case '/':
    default:
      return {
        component: <HomePage onNavigate={onNavigate} />,
        title: 'Mana Naukari | Indian Job Portal for Freshers & Internships',
      };
  }
}
