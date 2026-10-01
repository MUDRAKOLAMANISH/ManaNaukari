import { supabase } from '../lib/supabase';
import { 
  VisitorAnalyticInsert, 
  JobViewInsert, 
  WhatsAppPopupEventType, 
  WhatsAppPopupEventInsert,
  JobAlertSubscriptionInsert 
} from '../types/database.types';

/**
 * Anonymous Visitor Identifier Manager
 * Creates or retrieves a persistent visitor token stored in localStorage across browser sessions.
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'server_visitor';
  const STORAGE_KEY = 'cv_visitor_id';
  let visitorId = localStorage.getItem(STORAGE_KEY);
  if (!visitorId) {
    visitorId = 'vis_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    try {
      localStorage.setItem(STORAGE_KEY, visitorId);
    } catch {
      // Storage unavailable (e.g. private/incognito restricted)
    }
  }
  return visitorId;
}

/**
 * Anonymous Session Identifier Manager
 * Creates or retrieves a persistent visitor session token stored in localStorage.
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

// In-memory debounce cache to avoid duplicate hits on quick React re-renders / mount cycles
const recentPageHits = new Map<string, number>();
const recentJobHits = new Map<string, number>();
const DEBOUNCE_WINDOW_MS = 3000; // 3 seconds

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
  if (cleanPath === '/admin/analytics') {
    return 'Admin Analytics';
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
    if (eventType === 'view') {
      stats.views = (stats.views || 0) + 1;
    } else if (eventType === 'join_click') {
      stats.joins = (stats.joins || 0) + 1;
    } else if (eventType === 'close_click' || eventType === 'maybe_later_click') {
      stats.dismisses = (stats.dismisses || 0) + 1;
    }
    stats.lastUpdated = Date.now();
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
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

  /**
   * Tracks a pageview event in `visitor_analytics`.
   * Automatically captures:
   * - page_url
   * - page_name
   * - session_id
   * - visitor_id
   * - timestamp / visited_at
   * 
   * Non-blocking, fails gracefully, debounced, with full console debug logging.
   */
  trackPageView(optionsOrType?: string | TrackPageViewOptions, maybePath?: string) {
    if (typeof window === 'undefined') return;

    let pageName = 'Homepage';
    let pageUrl = window.location.href;
    let path = window.location.pathname;
    let pageType: 'home' | 'jobs_listing' | 'job_details' | 'category_details' | 'other' = 'other';

    if (typeof optionsOrType === 'string') {
      // Legacy signature: trackPageView('home', '/...')
      path = maybePath || window.location.pathname;
      pageUrl = window.location.origin + path;
      pageName = resolvePageNameFromPath(path);
      if (optionsOrType === 'home') pageType = 'home';
      else if (optionsOrType === 'jobs_listing') pageType = 'jobs_listing';
      else if (optionsOrType === 'job_details') pageType = 'job_details';
      else if (optionsOrType === 'category_details') pageType = 'category_details';
    } else if (typeof optionsOrType === 'object' && optionsOrType !== null) {
      if (optionsOrType.page_name) pageName = optionsOrType.page_name;
      if (optionsOrType.page_url) pageUrl = optionsOrType.page_url;
      if (optionsOrType.customPath) {
        path = optionsOrType.customPath;
        pageUrl = window.location.origin + path;
      }
      if (optionsOrType.page_type) pageType = optionsOrType.page_type;
      if (!optionsOrType.page_name) {
        pageName = resolvePageNameFromPath(path);
      }
    } else {
      pageName = resolvePageNameFromPath(path);
    }

    const now = Date.now();
    const cacheKey = `${path}::${pageName}`;
    const lastHit = recentPageHits.get(cacheKey);

    if (lastHit && now - lastHit < DEBOUNCE_WINDOW_MS) {
      // Debounce rapid re-renders
      return;
    }
    recentPageHits.set(cacheKey, now);

    const sessionId = getOrCreateSessionId();
    const visitorId = getOrCreateVisitorId();
    const timestampIso = new Date().toISOString();

    console.log('[AnalyticsTracker] 🚀 Page view triggered:', {
      page_name: pageName,
      page_url: pageUrl,
      path,
      session_id: sessionId,
      visitor_id: visitorId,
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
          timestamp: timestampIso,
          visited_at: timestampIso,
          user_agent: navigator.userAgent ? navigator.userAgent.slice(0, 255) : null,
          page_type: pageType,
          path: path.slice(0, 255),
          referrer: document.referrer ? document.referrer.slice(0, 255) : 'direct',
        };

        // Step 1: Attempt insert with full payload
        let { error, data } = await supabase.from('visitor_analytics').insert(fullPayload).select();

        // Step 2: Resilient Schema Fallback
        // If Supabase returns PGRST204 (column does not exist in schema cache), retry with guaranteed baseline columns
        if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column'))) {
          console.debug('[AnalyticsTracker] Adapting to database schema (omitting unmigrated columns):', error.message);
          
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
          console.warn('[AnalyticsTracker] ⚠️ visitor_analytics insert notice:', error.message);
        } else {
          console.log('[AnalyticsTracker] ✅ Page view successfully recorded in Supabase visitor_analytics:', {
            page_name: pageName,
            visitor_id: visitorId,
            session_id: sessionId,
            id: data && data[0] ? data[0].id : 'recorded'
          });
        }
      } catch (err: any) {
        console.debug('[AnalyticsTracker] Page view tracking exception:', err);
      }
    }, 40);
  },

  /**
   * Tracks a job view event in `job_views` and records `job_details` in `visitor_analytics`.
   * Automatically captures:
   * - job_id (parsed to numeric or uuid)
   * - visitor_id
   * - session_id
   * - timestamp / viewed_at
   * - job_title
   * - company
   */
  trackJobView(job: { id: string | number; title?: string; company?: string }) {
    if (typeof window === 'undefined' || !job?.id) return;

    const rawJobId = job.id;
    // Parse numeric ID if applicable
    const numericJobId = typeof rawJobId === 'number' ? rawJobId : (!isNaN(Number(rawJobId)) ? Number(rawJobId) : rawJobId);

    const now = Date.now();
    const cacheKey = String(numericJobId);
    const lastHit = recentJobHits.get(cacheKey);

    if (lastHit && now - lastHit < DEBOUNCE_WINDOW_MS) {
      return;
    }
    recentJobHits.set(cacheKey, now);

    const sessionId = getOrCreateSessionId();
    const visitorId = getOrCreateVisitorId();
    const timestampIso = new Date().toISOString();
    const jobTitle = (job.title || 'Job Opening').slice(0, 255);
    const company = (job.company || 'Hiring Partner').slice(0, 150);

    console.log('[AnalyticsTracker] 👁️ Job view triggered:', {
      job_id: numericJobId,
      job_title: jobTitle,
      company,
      visitor_id: visitorId,
      session_id: sessionId,
      timestamp: timestampIso,
    });

    setTimeout(async () => {
      try {
        // Step 1: Attempt insert with full columns
        const fullPayload: JobViewInsert = {
          job_id: numericJobId,
          visitor_id: visitorId,
          session_id: sessionId,
          job_title: jobTitle,
          company: company,
          viewed_at: timestampIso,
        };

        let { error, data } = await supabase.from('job_views').insert(fullPayload).select();

        // Step 2: Fallback to baseline columns if schema cache rejects optional columns
        if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column'))) {
          console.debug('[AnalyticsTracker] Adapting to job_views baseline schema:', error.message);
          const baselinePayload = {
            job_id: numericJobId,
            visitor_id: visitorId,
            viewed_at: timestampIso,
          };
          const fallbackResult = await supabase.from('job_views').insert(baselinePayload).select();
          error = fallbackResult.error;
          data = fallbackResult.data;
        }

        if (error) {
          console.warn('[AnalyticsTracker] ⚠️ job_views insert notice:', error.message);
        } else {
          console.log('[AnalyticsTracker] ✅ Job view successfully recorded in Supabase job_views:', {
            job_id: numericJobId,
            visitor_id: visitorId,
            id: data && data[0] ? data[0].id : 'recorded'
          });
        }

        // Also track the page view for this job details page
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
   */
  autoTrackCurrentRoute(currentPath: string) {
    const pageName = resolvePageNameFromPath(currentPath);
    analyticsTracker.trackPageView({
      page_name: pageName,
      customPath: currentPath,
      page_url: window.location.origin + currentPath,
    });
  },

  /**
   * Tracks WhatsApp Community Join Popup interactions:
   * 'view' | 'join_click' | 'close_click' | 'maybe_later_click'
   * Saves to Supabase `whatsapp_popup_events` and caches locally
   */
  trackWhatsAppPopup(eventType: WhatsAppPopupEventType, customPath?: string) {
    if (typeof window === 'undefined') return;

    // Update local synchronized cache
    updateLocalWhatsAppStats(eventType);

    setTimeout(async () => {
      try {
        const sessionId = getOrCreateSessionId();
        const payload: WhatsAppPopupEventInsert = {
          session_id: sessionId,
          event_type: eventType,
          path: (customPath || window.location.pathname).slice(0, 255),
        };

        const { error } = await supabase.from('whatsapp_popup_events').insert(payload);
        if (error) {
          console.debug('[AnalyticsTracker] whatsapp_popup_events notice:', error.message);
        } else {
          console.log('[AnalyticsTracker] ✅ WhatsApp popup event tracked:', eventType);
        }
      } catch (err) {
        console.debug('[AnalyticsTracker] Failed to track whatsapp popup event:', err);
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
        // Fallback: save to localStorage if table is not yet set up
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
