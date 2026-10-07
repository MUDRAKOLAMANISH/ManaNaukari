import { supabase } from '../lib/supabase';
import { 
  VisitorAnalyticInsert, 
  JobViewInsert, 
  WhatsAppPopupEventType, 
  WhatsAppPopupEventInsert,
  JobAlertSubscriptionInsert 
} from '../types/database.types';

export const VISITOR_ID_KEY = 'visitor_id';
export const LAST_VISIT_DATE_KEY = 'last_visit_date';

/**
 * Returns today's calendar date in YYYY-MM-DD format (local/UTC synchronized)
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a route path is an administrative or internal console page
 * Admin pages are strictly excluded from visitor telemetry.
 */
export function isAdminPath(path?: string): boolean {
  if (!path && typeof window !== 'undefined') {
    path = window.location.pathname;
  }
  if (!path) return false;
  const cleanPath = path.split('?')[0].split('#')[0].toLowerCase();
  return cleanPath.startsWith('/admin') || cleanPath.startsWith('/recruiter/dashboard');
}

/**
 * Anonymous Visitor Identifier Manager
 * Creates or retrieves a persistent visitor token stored in localStorage (key: 'visitor_id')
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'server_visitor';
  let visitorId: string | null = null;
  try {
    visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      // Check legacy key if exists
      visitorId = localStorage.getItem('cv_visitor_id');
    }
    if (!visitorId) {
      visitorId = 'vis_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    }
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
    localStorage.setItem('cv_visitor_id', visitorId); // Keep legacy in sync
  } catch {
    // LocalStorage restricted or in private mode
    if (!visitorId) {
      visitorId = 'vis_temp_' + Math.random().toString(36).substring(2, 11);
    }
  }
  return visitorId;
}

/**
 * Anonymous Session Identifier Manager
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  const STORAGE_KEY = 'cv_session_id';
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    try {
      localStorage.setItem(STORAGE_KEY, sessionId);
    } catch {
      // Storage unavailable
    }
  }
  return sessionId;
}

// In-memory locks to prevent concurrent race-condition inserts during the same page render cycle
let inMemoryDailyVisitLock: string | null = null;
const recentJobHits = new Map<string, number>();
const DEBOUNCE_WINDOW_MS = 3000;

// Helper to resolve human-readable page name from path
export function resolvePageNameFromPath(path: string): string {
  const cleanPath = path.split('?')[0].split('#')[0].toLowerCase();
  
  if (cleanPath === '/' || cleanPath === '') {
    return 'Homepage';
  }
  if (cleanPath === '/jobs') {
    return 'Jobs Page';
  }
  if (cleanPath.startsWith('/jobs/')) {
    return 'Job Details Page';
  }
  if (cleanPath === '/internships') {
    return 'Internships Page';
  }
  if (cleanPath === '/work-from-home' || cleanPath === '/wfh') {
    return 'Work From Home Page';
  }
  if (cleanPath === '/categories') {
    return 'Categories Page';
  }
  if (cleanPath.startsWith('/categories/')) {
    const slug = cleanPath.replace('/categories/', '');
    return `Category: ${slug.replace(/[-_]/g, ' ').toUpperCase()}`;
  }
  if (cleanPath === '/about') {
    return 'About Page';
  }
  if (cleanPath === '/contact') {
    return 'Contact Page';
  }
  if (cleanPath === '/resume-review') {
    return 'Resume Review Page';
  }
  if (cleanPath === '/portfolio-service') {
    return 'Portfolio Service Page';
  }
  if (cleanPath === '/post-job' || cleanPath === '/recruiter/post-job') {
    return 'Post a Job';
  }
  if (cleanPath === '/recruiter/dashboard' || cleanPath === '/recruiter') {
    return 'Recruiter Dashboard';
  }
  if (cleanPath.startsWith('/admin')) {
    return 'Admin Portal';
  }

  return cleanPath;
}

// Helper to update local fallback stats for WhatsApp popup
function updateLocalWhatsAppStats(eventType: WhatsAppPopupEventType) {
  if (typeof window === 'undefined') return;
  const STATS_KEY = 'cv_wa_popup_stats';
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const stats = raw ? JSON.parse(raw) : { views: 0, joins: 0, dismisses: 0, lastUpdated: Date.now() };
    if (eventType === 'view' || eventType === 'popup_impression') {
      stats.views = (stats.views || 0) + 1;
    } else if (eventType === 'join_click' || eventType === 'popup_join_click') {
      stats.joins = (stats.joins || 0) + 1;
    } else if (
      eventType === 'close_click' || 
      eventType === 'maybe_later_click' || 
      eventType === 'popup_dismiss' || 
      eventType === 'popup_snooze'
    ) {
      stats.dismisses = (stats.dismisses || 0) + 1;
    }
    stats.lastUpdated = Date.now();
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    console.log(`[AnalyticsTracker] Updated local fallback stats for event "${eventType}":`, stats);
  } catch (err) {
    console.debug('[Analytics] Local storage stats update notice:', err);
  }
}

export interface TrackPageViewOptions {
  page_name?: string;
  page_url?: string;
  page_type?: 'home' | 'jobs_listing' | 'job_details' | 'category_details' | 'other';
  customPath?: string;
}

export const analyticsTracker = {
  getVisitorId: getOrCreateVisitorId,
  getSessionId: getOrCreateSessionId,
  getTodayDateString,
  isAdminPath,

  /**
   * Tracks a visitor event in `visitor_analytics`.
   * 
   * Strict Visitor Rules:
   * 1. Count one device as one visitor per day.
   * 2. Do not increase visitor count on page refresh.
   * 3. Store a unique visitor_id in localStorage.
   * 4. Store last_visit_date in localStorage.
   * 5. Only create a new visitor record if last_visit_date is different from today's date.
   * 6. Enforces database unique constraint on (visitor_id, visit_date).
   * 7. Exclude admin pages from visitor tracking.
   * 8. Works in AI Studio preview and Netlify production environments.
   */
  trackPageView(optionsOrType?: string | TrackPageViewOptions, maybePath?: string) {
    if (typeof window === 'undefined') return;

    let path = window.location.pathname;
    let pageName = 'Homepage';
    let pageUrl = window.location.href;
    let pageType: 'home' | 'jobs_listing' | 'job_details' | 'category_details' | 'other' = 'other';

    if (typeof optionsOrType === 'string') {
      path = maybePath || window.location.pathname;
      pageUrl = window.location.origin + path;
      pageName = resolvePageNameFromPath(path);
      if (optionsOrType === 'home') pageType = 'home';
      else if (optionsOrType === 'jobs_listing') pageType = 'jobs_listing';
      else if (optionsOrType === 'job_details') pageType = 'job_details';
      else if (optionsOrType === 'category_details') pageType = 'category_details';
    } else if (typeof optionsOrType === 'object' && optionsOrType !== null) {
      if (optionsOrType.customPath) {
        path = optionsOrType.customPath;
        pageUrl = window.location.origin + path;
      }
      if (optionsOrType.page_name) pageName = optionsOrType.page_name;
      if (optionsOrType.page_url) pageUrl = optionsOrType.page_url;
      if (optionsOrType.page_type) pageType = optionsOrType.page_type;
      if (!optionsOrType.page_name) {
        pageName = resolvePageNameFromPath(path);
      }
    } else {
      pageName = resolvePageNameFromPath(path);
    }

    // 1. Exclude admin pages from visitor tracking
    if (isAdminPath(path)) {
      console.log('[AnalyticsTracker] 🛡️ Excluding admin page from visitor tracking:', path);
      return;
    }

    // 2. Count one device as one visitor per day.
    // Check if this device has already been counted today.
    const today = getTodayDateString();
    let lastVisitDate: string | null = null;
    try {
      lastVisitDate = localStorage.getItem(LAST_VISIT_DATE_KEY);
    } catch {
      // Storage unavailable
    }

    // If last_visit_date is the same as today, DO NOT create a new visitor record (prevents page refresh increase)
    if (lastVisitDate === today) {
      console.log('[AnalyticsTracker] ℹ️ Device already recorded for today (' + today + '). Skipping duplicate visitor count on page refresh/navigation.');
      return;
    }

    // In-memory lock for the current JavaScript process
    if (inMemoryDailyVisitLock === today) {
      return;
    }
    inMemoryDailyVisitLock = today;

    // Immediately record last_visit_date in localStorage
    try {
      localStorage.setItem(LAST_VISIT_DATE_KEY, today);
    } catch {
      // Storage restricted
    }

    const sessionId = getOrCreateSessionId();
    const visitorId = getOrCreateVisitorId();
    const timestampIso = new Date().toISOString();

    console.log('[AnalyticsTracker] 🚀 Recording new daily unique visitor:', {
      visitor_id: visitorId,
      visit_date: today,
      page_name: pageName,
      page_url: pageUrl,
      path,
      timestamp: timestampIso,
    });

    // Run asynchronously without blocking UI render
    setTimeout(async () => {
      try {
        const fullPayload: VisitorAnalyticInsert = {
          page_url: pageUrl,
          page_name: pageName,
          session_id: sessionId,
          visitor_id: visitorId,
          visit_date: today,
          timestamp: timestampIso,
          visited_at: timestampIso,
          user_agent: navigator.userAgent ? navigator.userAgent.slice(0, 255) : null,
          page_type: pageType,
          path: path.slice(0, 255),
          referrer: document.referrer ? document.referrer.slice(0, 255) : 'direct',
        };

        // Step 1: Attempt insert with full payload including visit_date
        let { error, data } = await supabase.from('visitor_analytics').insert(fullPayload).select();

        // Step 2: Handle unique constraint violation (database unique constraint on visitor_id, visit_date)
        if (error && (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate key'))) {
          console.log('[AnalyticsTracker] 🔒 Database unique constraint prevented duplicate visitor count for today:', { visitorId, today });
          try {
            localStorage.setItem(LAST_VISIT_DATE_KEY, today);
          } catch {}
          return;
        }

        // Step 3: Resilient Schema Fallback
        // If Supabase returns PGRST204 or 42703 (column visit_date or optional columns do not exist yet)
        if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('schema cache') || error.message?.includes('column'))) {
          console.debug('[AnalyticsTracker] Adapting to baseline database schema:', error.message);
          
          const baselinePayload = {
            page_url: pageUrl,
            visitor_id: visitorId,
            user_agent: navigator.userAgent ? navigator.userAgent.slice(0, 255) : null,
            visited_at: timestampIso,
          };

          const fallbackResult = await supabase.from('visitor_analytics').insert(baselinePayload).select();
          error = fallbackResult.error;
          data = fallbackResult.data;
        }

        if (error) {
          // If unique constraint triggered on fallback
          if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate key')) {
            console.log('[AnalyticsTracker] 🔒 Unique constraint verified in fallback.');
            return;
          }
          console.warn('[AnalyticsTracker] ⚠️ visitor_analytics insert notice:', error.message);
        } else {
          console.log('[AnalyticsTracker] ✅ Daily unique visitor successfully recorded in Supabase visitor_analytics:', {
            visitor_id: visitorId,
            visit_date: today,
            page_name: pageName,
            id: data && data[0] ? data[0].id : 'recorded'
          });
        }
      } catch (err: any) {
        console.debug('[AnalyticsTracker] Visitor tracking exception:', err);
      }
    }, 40);
  },

  /**
   * Tracks a job view event in `job_views`.
   * Supports both trackJobView({ id, title, company }) and trackJobView(jobId, jobTitle, company)
   */
  trackJobView(
    jobIdOrObj: string | number | { id?: string | number; title?: string; company?: string },
    maybeJobTitle?: string,
    maybeCompany?: string
  ) {
    if (typeof window === 'undefined') return;

    let jobId: string | number = '';
    let jobTitle = '';
    let company: string | undefined = undefined;

    if (typeof jobIdOrObj === 'object' && jobIdOrObj !== null) {
      jobId = jobIdOrObj.id || '';
      jobTitle = jobIdOrObj.title || '';
      company = jobIdOrObj.company;
    } else {
      jobId = jobIdOrObj;
      jobTitle = maybeJobTitle || '';
      company = maybeCompany;
    }

    const cacheKey = `job_${jobId}`;
    const now = Date.now();
    const lastHit = recentJobHits.get(cacheKey);

    if (lastHit && now - lastHit < DEBOUNCE_WINDOW_MS) {
      return;
    }
    recentJobHits.set(cacheKey, now);

    const sessionId = getOrCreateSessionId();
    const visitorId = getOrCreateVisitorId();
    const timestampIso = new Date().toISOString();

    const numericJobId = typeof jobId === 'number' ? jobId : parseInt(String(jobId), 10);
    const resolvedJobId = !isNaN(numericJobId) ? numericJobId : jobId;

    setTimeout(async () => {
      try {
        const payload: JobViewInsert = {
          job_id: resolvedJobId,
          visitor_id: visitorId,
          session_id: sessionId,
          job_title: jobTitle ? jobTitle.slice(0, 255) : null,
          company: company ? company.slice(0, 255) : null,
          viewed_at: timestampIso,
        };

        const { error, data } = await supabase.from('job_views').insert(payload).select();

        if (error) {
          console.debug('[AnalyticsTracker] Retrying job_views with baseline columns...', error.message);
          const baselineJobView = {
            job_id: resolvedJobId,
            visitor_id: visitorId,
            viewed_at: timestampIso,
          };
          await supabase.from('job_views').insert(baselineJobView);
        } else {
          console.log('[AnalyticsTracker] ✅ Job view recorded:', {
            job_id: resolvedJobId,
            job_title: jobTitle,
            visitor_id: visitorId,
            id: data && data[0] ? data[0].id : 'recorded'
          });
        }

        // Also evaluate daily page view for this job details page
        analyticsTracker.trackPageView({
          page_name: `Job Details: ${jobTitle}`,
          page_url: window.location.href,
          page_type: 'job_details',
          customPath: window.location.pathname,
        });
      } catch (err: any) {
        console.debug('[AnalyticsTracker] Failed to track job view:', err);
      }
    }, 40);
  },

  /**
   * Automatically tracks current browser route with accurate page name
   * Excludes admin pages automatically.
   */
  autoTrackCurrentRoute(currentPath: string) {
    if (isAdminPath(currentPath)) {
      return;
    }
    const pageName = resolvePageNameFromPath(currentPath);
    analyticsTracker.trackPageView({
      page_name: pageName,
      customPath: currentPath,
      page_url: (typeof window !== 'undefined' ? window.location.origin : '') + currentPath,
    });
  },

  /**
   * Tracks WhatsApp Community Join Popup interactions:
   * Saves to Supabase `whatsapp_popup_events` and caches locally
   */
  trackWhatsAppPopup(eventType: WhatsAppPopupEventType, customPath?: string) {
    if (typeof window === 'undefined') return;

    console.log(`[AnalyticsTracker] 🚀 Initiating event tracking for WhatsApp Popup: "${eventType}"`);
    updateLocalWhatsAppStats(eventType);

    setTimeout(async () => {
      try {
        const sessionId = getOrCreateSessionId();
        const payload: WhatsAppPopupEventInsert = {
          session_id: sessionId,
          event_type: eventType,
          path: (customPath || window.location.pathname).slice(0, 255),
        };

        console.log('[AnalyticsTracker] 📤 Sending event payload to Supabase "whatsapp_popup_events":', payload);
        const { error } = await supabase.from('whatsapp_popup_events').insert(payload);
        if (error) {
          if (error.message?.includes('schema cache') || error.message?.includes('relation')) {
            console.warn('[AnalyticsTracker] ℹ️ Supabase table "whatsapp_popup_events" is missing. Stats are being securely cached in localStorage. To enable live analytics, please run the SQL migration script from the Admin Performance Analytics page.');
          } else {
            console.warn('[AnalyticsTracker] ⚠️ Supabase whatsapp_popup_events insert failed:', error.message);
          }
        } else {
          console.log(`[AnalyticsTracker] 🎉 SUCCESS: WhatsApp popup event "${eventType}" recorded successfully in Supabase!`);
        }
      } catch (err: any) {
        console.error('[AnalyticsTracker] ❌ Exception tracking whatsapp popup event:', err.message || err);
      }
    }, 50);
  },

  /**
   * Subscribes a user to daily job alerts with selected category preferences
   */
  async subscribeJobAlerts(email: string, categories: string[], frequency: string = 'daily') {
    try {
      const payload: JobAlertSubscriptionInsert = {
        email: email.trim().toLowerCase(),
        categories: categories.length > 0 ? categories : ['All Categories'],
        frequency,
        status: 'active',
        source: 'website_job_alerts_form',
      };

      const { data, error } = await supabase
        .from('job_alert_subscriptions')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.debug('[Subscriptions] Notice from Supabase:', error.message);
        const saved = JSON.parse(localStorage.getItem('cv_local_subscriptions') || '[]');
        saved.push({ ...payload, created_at: new Date().toISOString() });
        localStorage.setItem('cv_local_subscriptions', JSON.stringify(saved));
        return { success: true, localOnly: true };
      }

      return { success: true, data };
    } catch (err: any) {
      console.debug('[Subscriptions] Fallback local subscription:', err);
      const saved = JSON.parse(localStorage.getItem('cv_local_subscriptions') || '[]');
      saved.push({ email, categories, frequency, created_at: new Date().toISOString() });
      localStorage.setItem('cv_local_subscriptions', JSON.stringify(saved));
      return { success: true, localOnly: true };
    }
  },
};
