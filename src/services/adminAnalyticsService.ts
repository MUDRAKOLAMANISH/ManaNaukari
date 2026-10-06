import { supabase } from '../lib/supabase';
import { AnalyticsOverview, DailyMetricPoint, TopViewedJobMetric } from '../types/database.types';

export const adminAnalyticsService = {
  /**
   * Fetches all analytics metrics, time-series, and top jobs directly from Supabase
   */
  async getOverview(): Promise<AnalyticsOverview> {
    const now = new Date();
    
    // Boundary calculations in UTC ISO
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    let tablesReady = true;
    let tableErrorMessage: string | null = null;

    // 1. Fetch Job counts (Active vs Draft vs Needs Review vs Paused vs Expired vs Closed vs Deleted)
    let activeJobs = 0;
    let draftJobs = 0;
    let needsReviewJobs = 0;
    let pausedJobs = 0;
    let expiredJobs = 0;
    let closedJobs = 0;
    let deletedJobs = 0;
    try {
      const [
        activeJobsRes,
        draftJobsRes,
        needsReviewRes,
        pausedJobsRes,
        expiredJobsRes,
        closedJobsRes,
        deletedJobsRes,
      ] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'needs_review'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'paused'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'closed'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'deleted'),
      ]);
      activeJobs = activeJobsRes.count || 0;
      draftJobs = draftJobsRes.count || 0;
      needsReviewJobs = needsReviewRes.count || 0;
      pausedJobs = pausedJobsRes.count || 0;
      expiredJobs = expiredJobsRes.count || 0;
      closedJobs = closedJobsRes.count || 0;
      deletedJobs = deletedJobsRes.count || 0;
    } catch (err: any) {
      console.warn('[AdminAnalyticsService] Jobs count notice:', err);
    }

    // 2. Fetch Applicants counts (Total & Today & Last 14 days)
    let totalApplications = 0;
    let todayApplications = 0;
    let recentApplicantsList: { id: string | number; created_at: string; job_id: string | number }[] = [];

    try {
      const [totalAppsRes, todayAppsRes, recentAppsRes] = await Promise.all([
        supabase.from('applicants').select('id', { count: 'exact', head: true }),
        supabase.from('applicants').select('id', { count: 'exact', head: true }).gte('created_at', startOfToday),
        supabase.from('applicants').select('id, created_at, job_id').gte('created_at', fourteenDaysAgoIso()),
      ]);
      totalApplications = totalAppsRes.count || 0;
      todayApplications = todayAppsRes.count || 0;
      recentApplicantsList = (recentAppsRes.data as any) || [];
    } catch (err: any) {
      console.warn('[AdminAnalyticsService] Applicants count notice:', err);
    }

    // 3. Fetch Visitor Analytics counts (True Unique Visitors per device)
    let totalVisitors = 0;
    let todayVisitors = 0;
    let weeklyVisitors = 0;
    let monthlyVisitors = 0;
    let recentVisitorsList: { visited_at?: string; visit_date?: string; visitor_id?: string }[] = [];

    try {
      let rows: { visitor_id: string; visited_at?: string; visit_date?: string }[] | null = null;
      let error: any = null;

      const firstAttempt = await supabase
        .from('visitor_analytics')
        .select('visitor_id, visited_at, visit_date')
        .limit(50000);

      if (firstAttempt.error) {
        const fallbackAttempt = await supabase
          .from('visitor_analytics')
          .select('visitor_id, visited_at')
          .limit(50000);
        rows = (fallbackAttempt.data as any) || null;
        error = fallbackAttempt.error;
      } else {
        rows = (firstAttempt.data as any) || null;
      }

      if (error) {
        tablesReady = false;
        tableErrorMessage = error.message;
      } else if (rows) {
        recentVisitorsList = rows;

        const totalUniqueSet = new Set<string>();
        const todayUniqueSet = new Set<string>();
        const weekUniqueSet = new Set<string>();
        const monthUniqueSet = new Set<string>();

        const todayDateStr = new Date().toISOString().split('T')[0];

        rows.forEach((row) => {
          const vid = row.visitor_id;
          if (!vid) return;

          totalUniqueSet.add(vid);

          const rawDate = row.visited_at;
          const visitDate = row.visit_date || (rawDate ? new Date(rawDate).toISOString().split('T')[0] : null);

          if (rawDate) {
            if (rawDate >= startOfToday || visitDate === todayDateStr) {
              todayUniqueSet.add(vid);
            }
            if (rawDate >= sevenDaysAgoIso) {
              weekUniqueSet.add(vid);
            }
            if (rawDate >= thirtyDaysAgoIso) {
              monthUniqueSet.add(vid);
            }
          } else if (visitDate) {
            if (visitDate === todayDateStr) {
              todayUniqueSet.add(vid);
            }
            if (visitDate >= sevenDaysAgoIso.split('T')[0]) {
              weekUniqueSet.add(vid);
            }
            if (visitDate >= thirtyDaysAgoIso.split('T')[0]) {
              monthUniqueSet.add(vid);
            }
          }
        });

        totalVisitors = totalUniqueSet.size;
        todayVisitors = todayUniqueSet.size;
        weeklyVisitors = weekUniqueSet.size;
        monthlyVisitors = monthUniqueSet.size;
      }
    } catch (err: any) {
      console.warn('[AdminAnalyticsService] Visitor analytics exception:', err);
      tablesReady = false;
      tableErrorMessage = err.message || 'visitor_analytics table query error';
    }

    // 4. Fetch Job Views counts & top viewed
    let totalJobViews = 0;
    let jobViewsRawList: { id: string | number; job_id: string | number; visitor_id?: string; viewed_at?: string; created_at?: string }[] = [];

    try {
      const [allJvRes, recentJvRes] = await Promise.all([
        supabase.from('job_views').select('id', { count: 'exact', head: true }),
        supabase.from('job_views').select('id, job_id, visitor_id, viewed_at').limit(2000),
      ]);

      if (allJvRes.error) {
        console.debug('[AdminAnalyticsService] Retrying job_views fallback...', allJvRes.error.message);
        const [fbAll, fbRecent] = await Promise.all([
          supabase.from('job_views').select('id', { count: 'exact', head: true }),
          supabase.from('job_views').select('id, job_id').limit(2000),
        ]);
        if (!fbAll.error) {
          totalJobViews = fbAll.count || 0;
          jobViewsRawList = (fbRecent.data as any) || [];
        } else {
          tablesReady = false;
          if (!tableErrorMessage) tableErrorMessage = fbAll.error.message;
        }
      } else {
        totalJobViews = allJvRes.count || 0;
        jobViewsRawList = (recentJvRes.data as any) || [];
      }
    } catch (err: any) {
      console.warn('[AdminAnalyticsService] Job views exception:', err);
      tablesReady = false;
      if (!tableErrorMessage) tableErrorMessage = err.message || 'job_views query error';
    }

    // 5. Calculate Conversion Rate: (Applications / Total Job Views) * 100
    // If job views is 0 but visitors > 0, fallback to applications / visitors
    let conversionRate = 0;
    if (totalJobViews > 0) {
      conversionRate = Number(((totalApplications / totalJobViews) * 100).toFixed(1));
    } else if (totalVisitors > 0) {
      conversionRate = Number(((totalApplications / totalVisitors) * 100).toFixed(1));
    }

    // 6. Aggregate Unique Visitors by Day (Last 7 Days)
    const visitorsByDay = generateDailySeries(7, (dateKey) => {
      const dayUniqueVisitors = new Set<string>();
      recentVisitorsList.forEach((v) => {
        const rawDate = v.visited_at;
        const vDate = v.visit_date || (rawDate ? new Date(rawDate).toISOString().split('T')[0] : null);
        if (vDate === dateKey && v.visitor_id) {
          dayUniqueVisitors.add(v.visitor_id);
        }
      });
      return dayUniqueVisitors.size;
    });

    // 7. Aggregate Applications by Day (Last 7 Days)
    const applicationsByDay = generateDailySeries(7, (dateKey) => {
      return recentApplicantsList.filter((a) => {
        if (!a.created_at) return false;
        const itemDate = new Date(a.created_at).toISOString().split('T')[0];
        return itemDate === dateKey;
      }).length;
    });

    // 8. Aggregate Top Viewed Jobs (Enriching with real titles and companies from jobs table)
    const jobViewCounts: Record<string, number> = {};
    jobViewsRawList.forEach((jv) => {
      if (!jv.job_id) return;
      const key = String(jv.job_id);
      jobViewCounts[key] = (jobViewCounts[key] || 0) + 1;
    });

    const distinctJobIds = Object.keys(jobViewCounts);
    let jobDetailsMap: Record<string, { title: string; company: string }> = {};

    if (distinctJobIds.length > 0) {
      try {
        const { data: jobsInfo } = await supabase
          .from('jobs')
          .select('id, title, company')
          .in('id', distinctJobIds);

        if (jobsInfo) {
          jobsInfo.forEach((j) => {
            jobDetailsMap[String(j.id)] = {
              title: j.title || 'Software Engineering Role',
              company: j.company || 'Hiring Partner',
            };
          });
        }
      } catch (err) {
        console.debug('[AdminAnalyticsService] Could not enrich job titles:', err);
      }
    }

    // Count applications per job
    const jobAppCounts: Record<string, number> = {};
    recentApplicantsList.forEach((app) => {
      if (app.job_id) {
        const key = String(app.job_id);
        jobAppCounts[key] = (jobAppCounts[key] || 0) + 1;
      }
    });

    const topViewedJobs: TopViewedJobMetric[] = Object.entries(jobViewCounts)
      .map(([job_id, views]) => {
        const info = jobDetailsMap[job_id] || { title: `Job Requisition #${job_id}`, company: 'Hiring Company' };
        const apps = jobAppCounts[job_id] || 0;
        const rate = views > 0 ? Number(((apps / views) * 100).toFixed(1)) : 0;
        return {
          job_id,
          title: info.title,
          company: info.company,
          views,
          applications: apps,
          conversionRate: rate,
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    // 8b. Aggregate WhatsApp Community Popup Events with new event types
    let whatsAppPopupStats = {
      views: 0,       // Impressions
      joins: 0,       // Join Clicks
      dismissed: 0,   // Dismissed events
      snoozed: 0,     // Snoozed events
      dismisses: 0,   // Dismissed + Snoozed (for legacy UI support)
      conversionRate: 0,
    };

    try {
      const [waViewsRes, waJoinsRes, waDismissRes, waSnoozeRes] = await Promise.all([
        supabase.from('whatsapp_popup_events').select('id', { count: 'exact', head: true }).in('event_type', ['view', 'popup_impression']),
        supabase.from('whatsapp_popup_events').select('id', { count: 'exact', head: true }).in('event_type', ['join_click', 'popup_join_click']),
        supabase.from('whatsapp_popup_events').select('id', { count: 'exact', head: true }).in('event_type', ['close_click', 'popup_dismiss']),
        supabase.from('whatsapp_popup_events').select('id', { count: 'exact', head: true }).in('event_type', ['maybe_later_click', 'popup_snooze']),
      ]);

      if (waViewsRes.error) {
        console.warn('[AdminAnalyticsService] whatsapp_popup_events query error:', waViewsRes.error);
        if (
          waViewsRes.error.code === '42P01' || 
          waViewsRes.error.message?.includes('does not exist')
        ) {
          tablesReady = false;
          tableErrorMessage = `Database table "whatsapp_popup_events" does not exist. Please run the SQL setup script. Details: ${waViewsRes.error.message}`;
        }
        
        // Load fallback counts from local cache
        const localRaw = typeof window !== 'undefined' ? localStorage.getItem('cv_wa_popup_stats') : null;
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          whatsAppPopupStats.views = parsed.views || 0;
          whatsAppPopupStats.joins = parsed.joins || 0;
          whatsAppPopupStats.dismisses = parsed.dismisses || 0;
        }
      } else {
        whatsAppPopupStats.views = waViewsRes.count || 0;
        whatsAppPopupStats.joins = waJoinsRes.count || 0;
        whatsAppPopupStats.dismissed = waDismissRes.count || 0;
        whatsAppPopupStats.snoozed = waSnoozeRes.count || 0;
        whatsAppPopupStats.dismisses = (waDismissRes.count || 0) + (waSnoozeRes.count || 0);
      }
    } catch (err: any) {
      console.warn('[AdminAnalyticsService] Exception aggregating whatsapp_popup_events:', err);
      const localRaw = typeof window !== 'undefined' ? localStorage.getItem('cv_wa_popup_stats') : null;
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        whatsAppPopupStats.views = parsed.views || 0;
        whatsAppPopupStats.joins = parsed.joins || 0;
        whatsAppPopupStats.dismisses = parsed.dismisses || 0;
      }
    }

    if (whatsAppPopupStats.views > 0) {
      whatsAppPopupStats.conversionRate = Number(
        ((whatsAppPopupStats.joins / whatsAppPopupStats.views) * 100).toFixed(1)
      );
    }

    // 9. Fetch Alert Delivery Statistics (Resend logs & Subscriber count)
    let alertDeliveryStats = undefined;
    try {
      const statsRes = await fetch('/api/alerts/delivery-stats');
      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        if (statsJson.success && statsJson.data) {
          alertDeliveryStats = statsJson.data;
        }
      }
    } catch {
      // In case server route is unavailable or initial mount
    }

    const overviewData: AnalyticsOverview = {
      totalVisitors,
      todayVisitors,
      weeklyVisitors,
      monthlyVisitors,
      totalApplications,
      todayApplications,
      activeJobs,
      draftJobs,
      needsReviewJobs,
      pausedJobs,
      expiredJobs,
      closedJobs,
      deletedJobs,
      totalJobViews,
      conversionRate,
      visitorsByDay,
      applicationsByDay,
      topViewedJobs,
      whatsAppPopupStats,
      alertDeliveryStats,
      tablesReady,
      tableErrorMessage,
    };

    console.log('[AdminAnalyticsService] 📊 Overview data fetched successfully:', {
      totalVisitors,
      todayVisitors,
      weeklyVisitors,
      monthlyVisitors,
      totalJobViews,
      totalApplications,
      activeJobs,
      conversionRate: `${conversionRate}%`,
    });

    return overviewData;
  },
};

function fourteenDaysAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString();
}

/**
 * Helper to build continuous daily dates array for charts
 */
function generateDailySeries(days: number, countFn: (dateKey: string) => number): DailyMetricPoint[] {
  const result: DailyMetricPoint[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const month = monthNames[d.getMonth()];
    const day = d.getDate();
    const label = `${month} ${day}`;
    
    result.push({
      date: dateKey,
      label,
      count: countFn(dateKey),
    });
  }

  return result;
}
