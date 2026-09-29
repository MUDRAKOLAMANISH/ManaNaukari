import { supabase } from '../lib/supabase';
import { 
  VisitorAnalyticInsert, 
  JobViewInsert, 
  WhatsAppPopupEventType, 
  WhatsAppPopupEventInsert,
  JobAlertSubscriptionInsert 
} from '../types/database.types';

/**
 * Anonymous Session Identifier Manager
 * Creates or retrieves a persistent visitor session token stored in localStorage.
 */
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  const STORAGE_KEY = 'cv_session_id';
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = 'cv_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    try {
      localStorage.setItem(STORAGE_KEY, sessionId);
    } catch {
      // Storage unavailable (e.g. incognito/restricted)
    }
  }
  return sessionId;
}

// In-memory debounce cache to avoid duplicate hits on quick re-renders
const recentPageHits = new Map<string, number>();
const recentJobHits = new Map<string, number>();
const DEBOUNCE_WINDOW_MS = 6000; // 6 seconds

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

export const analyticsTracker = {
  /**
   * Tracks a pageview event in `visitor_analytics`
   * Non-blocking, fails gracefully
   */
  trackPageView(pageType: 'home' | 'jobs_listing' | 'job_details' | 'category_details' | 'other', customPath?: string) {
    if (typeof window === 'undefined') return;

    const path = customPath || window.location.pathname;
    const now = Date.now();
    const lastHit = recentPageHits.get(path);

    if (lastHit && now - lastHit < DEBOUNCE_WINDOW_MS) {
      return; // Debounce rapid identical visits
    }
    recentPageHits.set(path, now);

    // Run asynchronously without blocking UI render
    setTimeout(async () => {
      try {
        const sessionId = getOrCreateSessionId();
        const payload: VisitorAnalyticInsert = {
          session_id: sessionId,
          page_type: pageType,
          path: path.slice(0, 255),
          referrer: document.referrer ? document.referrer.slice(0, 255) : 'direct',
          user_agent: navigator.userAgent ? navigator.userAgent.slice(0, 255) : null,
        };

        const { error } = await supabase.from('visitor_analytics').insert(payload);
        if (error) {
          // Table might not exist yet before SQL migration is applied
          console.debug('[Analytics] visitor_analytics recording notice:', error.message);
        }
      } catch (err) {
        console.debug('[Analytics] Failed to track page view:', err);
      }
    }, 50);
  },

  /**
   * Tracks a job view event in `job_views` and records `job_details` in `visitor_analytics`
   */
  trackJobView(job: { id: string; title: string; company: string }) {
    if (typeof window === 'undefined' || !job?.id) return;

    const now = Date.now();
    const lastHit = recentJobHits.get(job.id);

    if (lastHit && now - lastHit < DEBOUNCE_WINDOW_MS) {
      return;
    }
    recentJobHits.set(job.id, now);

    setTimeout(async () => {
      try {
        const sessionId = getOrCreateSessionId();

        // 1. Record in job_views
        const jobViewPayload: JobViewInsert = {
          job_id: job.id,
          session_id: sessionId,
          job_title: job.title.slice(0, 255),
          company: job.company.slice(0, 150),
        };

        const { error: jvError } = await supabase.from('job_views').insert(jobViewPayload);
        if (jvError) {
          console.debug('[Analytics] job_views recording notice:', jvError.message);
        }

        // 2. Also record pageview in visitor_analytics
        analyticsTracker.trackPageView('job_details', window.location.pathname);
      } catch (err) {
        console.debug('[Analytics] Failed to track job view:', err);
      }
    }, 50);
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
          console.debug('[Analytics] whatsapp_popup_events notice:', error.message);
        }
      } catch (err) {
        console.debug('[Analytics] Failed to track whatsapp popup event:', err);
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
