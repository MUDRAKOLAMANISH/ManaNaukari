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
import { AdminWebsiteLeadsPage } from '../pages/admin/AdminWebsiteLeadsPage';
import { RecruiterPostJobPage } from '../pages/RecruiterPostJobPage';
import { RecruiterDashboardPage } from '../pages/RecruiterDashboardPage';
import { ResumeReviewPage } from '../pages/ResumeReviewPage';
import { PortfolioServicePage } from '../pages/PortfolioServicePage';
import { MaterialsPage } from '../pages/MaterialsPage';
import { AdminMaterialsPage } from '../pages/admin/AdminMaterialsPage';
import { MockInterviewPage } from '../pages/MockInterviewPage';
import { AiWebsiteDevelopmentPage } from '../pages/AiWebsiteDevelopmentPage';
import { AdminMockInterviewsPage } from '../pages/admin/AdminMockInterviewsPage';
import { CareerRoadmapPage } from '../pages/CareerRoadmapPage';
import { AdminCareerRoadmapsPage } from '../pages/admin/AdminCareerRoadmapsPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { UnsubscribePage } from '../pages/UnsubscribePage';
import { PrivacyPolicyPage } from '../pages/PrivacyPolicyPage';
import { fromSlug } from '../utils/slugUtils';
import { extractJobIdFromSlug } from '../utils/jobUrlUtils';

export interface RouteMatch {
  component: React.ReactNode;
  title: string;
  isBareLayout?: boolean;
}

function getRedirectQueryParam(pathWithQuery: string): string | undefined {
  const parts = pathWithQuery.split('?');
  if (parts.length > 1) {
    const params = new URLSearchParams(parts[1]);
    const redirect = params.get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('/login')) {
      return redirect;
    }
  }
  return undefined;
}

export function matchRoute(path: string, onNavigate: (targetPath: string) => void): RouteMatch {
  const cleanPath = path.split('?')[0];
  const redirectParam = getRedirectQueryParam(path);

  // ========================================================
  // 1. PUBLIC AUTHENTICATION ROUTES REDIRECTS
  // ========================================================
  if (cleanPath === '/login' || cleanPath === '/signup' || cleanPath === '/register' || cleanPath === '/forgot-password' || cleanPath === '/update-password') {
    // If visitor meant admin login, redirect to /admin/login. Otherwise redirect to Home.
    if (path.includes('redirect=%2Fadmin') || path.includes('redirect=/admin')) {
      return {
        component: <AdminLoginPage onNavigate={onNavigate} />,
        title: 'Admin Sign In | Mana Career',
        isBareLayout: true,
      };
    }
    return {
      component: <HomePage onNavigate={onNavigate} />,
      title: 'Mana Career | Premier Open Tech & Fresher Job Portal',
    };
  }

  if (cleanPath === '/unsubscribe') {
    return {
      component: <UnsubscribePage onNavigate={onNavigate} />,
      title: 'Unsubscribe from Job Alerts | Mana Career',
    };
  }

  // ========================================================
  // 2. ADMIN PORTAL ROUTES (ADMIN AUTHENTICATION)
  // ========================================================
  if (cleanPath === '/admin/login') {
    return {
      component: <AdminLoginPage onNavigate={onNavigate} />,
      title: 'Admin Sign In | Mana Career',
      isBareLayout: true,
    };
  }

  if (cleanPath === '/admin/jobs/new') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AddJobPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Post New Job | Mana Career Admin',
    };
  }

  if (cleanPath === '/admin/import-job') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <ImportJobPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'AI Job Import Assistant | Mana Career Admin',
    };
  }

  if (cleanPath === '/admin/bulk-import' || cleanPath === '/admin/bulk-jobs') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <BulkImportPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Bulk Job Import & Broadcast | Mana Career Admin',
    };
  }

  if (cleanPath.startsWith('/admin/jobs/edit/')) {
    const rawId = cleanPath.replace('/admin/jobs/edit/', '').split('/')[0];
    const jobId = decodeURIComponent(rawId || '');
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <EditJobPage jobId={jobId} onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Edit Job Opening | Mana Career Admin',
    };
  }

  if (cleanPath === '/admin/jobs' || cleanPath === '/admin') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminJobsListPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Manage Job Listings | Mana Career Admin',
    };
  }

  if (cleanPath === '/admin/recruiters' || cleanPath === '/admin/approvals') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <RecruiterJobsAdminPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Recruiter Approvals | Mana Career Admin',
    };
  }

  if (cleanPath === '/admin/website-leads' || cleanPath === '/admin/website-development-leads') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminWebsiteLeadsPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Website Development Leads | Mana Career Admin',
    };
  }

  if (cleanPath === '/admin/analytics') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminAnalyticsPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Platform Analytics | Mana Career Admin',
    };
  }

  if (cleanPath === '/admin/resume-orders') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminResumeOrdersPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Resume Review Orders | Mana Career Admin',
    };
  }

  if (cleanPath === '/admin/applicants') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminApplicantsPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Applicants Management | Mana Career Admin',
    };
  }

  if (cleanPath === '/admin/knowledge-base' || cleanPath === '/admin/rag') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminKnowledgeBasePage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Knowledge Base & AI RAG | Mana Career Admin',
    };
  }

  if (cleanPath === '/admin/materials') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminMaterialsPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Study Materials Management | Mana Career Admin',
    };
  }

  if (cleanPath === '/admin/mock-interviews' || cleanPath === '/admin/mock-interview') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminMockInterviewsPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Mock Interview Bookings | Mana Career Admin',
    };
  }

  if (cleanPath === '/admin/career-roadmaps' || cleanPath === '/admin/roadmaps') {
    return {
      component: (
        <ProtectedRoute onNavigate={onNavigate}>
          <AdminCareerRoadmapsPage onNavigate={onNavigate} />
        </ProtectedRoute>
      ),
      title: 'Career Roadmap Analytics | Mana Career Admin',
    };
  }

  // ========================================================
  // 3. CANDIDATE PORTAL ROUTES (100% OPEN & ANONYMOUS ACCESS)
  // ========================================================

  if (cleanPath === '/post-job' || cleanPath === '/recruiter/post-job') {
    return {
      component: <RecruiterPostJobPage onNavigate={onNavigate} />,
      title: 'Post a Job (Verified Recruiter) | Mana Career',
    };
  }

  if (cleanPath === '/recruiter/dashboard' || cleanPath === '/recruiter') {
    return {
      component: <RecruiterDashboardPage onNavigate={onNavigate} />,
      title: 'Recruiter Dashboard | Mana Career',
    };
  }

  if (cleanPath.startsWith('/categories/') && cleanPath.length > '/categories/'.length) {
    const categorySlug = cleanPath.replace('/categories/', '');
    const readableTitle = fromSlug(categorySlug);
    return {
      component: <CategoryDetailsPage categorySlug={categorySlug} onNavigate={onNavigate} />,
      title: `${readableTitle} Jobs | Mana Career`,
    };
  }

  if (cleanPath.startsWith('/jobs/') && cleanPath.length > '/jobs/'.length) {
    const rawParam = cleanPath.replace('/jobs/', '');
    const jobId = extractJobIdFromSlug(rawParam);
    return {
      component: <JobDetailsPage jobId={jobId} onNavigate={onNavigate} />,
      title: 'Job Details | Mana Career',
    };
  }

  switch (cleanPath) {
    case '/website-development':
    case '/ai-website-development':
      return {
        component: <AiWebsiteDevelopmentPage onNavigate={onNavigate} />,
        title: 'AI Website Development Service (From ₹499) | Mana Career',
      };
    case '/portfolio-service':
      return {
        component: <PortfolioServicePage onNavigate={onNavigate} />,
        title: 'Portfolio Website Service | Mana Career',
      };
    case '/internships':
      return {
        component: <JobsPage onNavigate={onNavigate} />,
        title: 'Internships in India | Mana Career',
      };
    case '/work-from-home':
    case '/wfh':
      return {
        component: <JobsPage onNavigate={onNavigate} />,
        title: 'Work From Home (Remote) Jobs | Mana Career',
      };
    case '/resume-review':
      return {
        component: <ResumeReviewPage onNavigate={onNavigate} />,
        title: 'ATS Resume Review & Optimization | Mana Career',
      };
    case '/materials':
      return {
        component: <MaterialsPage onNavigate={onNavigate} />,
        title: 'Study Notes & Materials | Mana Career',
      };
    case '/career-roadmap':
    case '/career-plan':
    case '/roadmap':
      return {
        component: <CareerRoadmapPage onNavigate={onNavigate} />,
        title: 'Personal Career Roadmap & AI Learning Plan | Mana Career',
      };
    case '/mock-interview':
    case '/mock-interviews':
      return {
        component: <MockInterviewPage onNavigate={onNavigate} />,
        title: 'Tech Mock Interview Practice (₹99) | Mana Career',
      };
    case '/jobs':
      return {
        component: <JobsPage onNavigate={onNavigate} />,
        title: 'Explore All Job Openings | Mana Career',
      };
    case '/categories':
      return {
        component: <CategoriesPage onNavigate={onNavigate} />,
        title: 'Job Categories | Mana Career',
      };
    case '/privacy-policy':
    case '/privacy':
      return {
        component: <PrivacyPolicyPage onNavigate={onNavigate} />,
        title: 'Privacy Policy | Mana Career',
      };
    case '/about':
      return {
        component: <AboutPage onNavigate={onNavigate} />,
        title: 'About Us | Mana Career',
      };
    case '/contact':
      return {
        component: <ContactPage onNavigate={onNavigate} />,
        title: 'Contact & Support | Mana Career',
      };
    case '/':
    default:
      return {
        component: <HomePage onNavigate={onNavigate} />,
        title: 'Mana Career | Premier Tech & Fresher Job Portal',
      };
  }
}
