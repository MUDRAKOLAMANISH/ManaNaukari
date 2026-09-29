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

    // 1. Fetch Job counts (Active vs Expired)
    const [activeJobsRes, expiredJobsRes] = await Promise.all([
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
    ]);

    const activeJobs = activeJobsRes.count || 0;
    const expiredJobs = expiredJobsRes.count || 0;

    // 2. Fetch Applicants counts (Total & Today & Last 14 days)
    const [totalAppsRes, todayAppsRes, recentAppsRes] = await Promise.all([
      supabase.from('applicants').select('id', { count: 'exact', head: true }),
      supabase.from('applicants').select('id', { count: 'exact', head: true }).gte('created_at', startOfToday),
      supabase.from('applicants').select('id, created_at, job_id').gte('created_at', fourteenDaysAgoIso()),
    ]);

    const totalApplications = totalAppsRes.count || 0;
    const todayApplications = todayAppsRes.count || 0;
    const recentApplicantsList = recentAppsRes.data || [];

    // 3. Fetch Visitor Analytics counts
    let totalVisitors = 0;
    let todayVisitors = 0;
    let weeklyVisitors = 0;
    let monthlyVisitors = 0;
    let recentVisitorsList: { created_at: string; session_id: string }[] = [];

    try {
      const [allVisRes, todayVisRes, weekVisRes, monthVisRes, recentVisRes] = await Promise.all([
        supabase.from('visitor_analytics').select('id', { count: 'exact', head: true }),
        supabase.from('visitor_analytics').select('id', { count: 'exact', head: true }).gte('created_at', startOfToday),
        supabase.from('visitor_analytics').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgoIso),
        supabase.from('visitor_analytics').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgoIso),
        supabase.from('visitor_analytics').select('created_at, session_id').gte('created_at', fourteenDaysAgoIso()),
      ]);

      if (allVisRes.error) {
        tablesReady = false;
        tableErrorMessage = allVisRes.error.message;
      } else {
        totalVisitors = allVisRes.count || 0;
        todayVisitors = todayVisRes.count || 0;
        weeklyVisitors = weekVisRes.count || 0;
        monthlyVisitors = monthVisRes.count || 0;
        recentVisitorsList = recentVisRes.data || [];
      }
    } catch (err: any) {
      tablesReady = false;
      tableErrorMessage = err.message || 'visitor_analytics table not found';
    }

    // 4. Fetch Job Views counts & top viewed
    let totalJobViews = 0;
    let jobViewsList: { job_id: string; job_title: string | null; company: string | null }[] = [];

    try {
      const [allJvRes, recentJvRes] = await Promise.all([
        supabase.from('job_views').select('id', { count: 'exact', head: true }),
        supabase.from('job_views').select('job_id, job_title, company').limit(2000),
      ]);

      if (allJvRes.error) {
        tablesReady = false;
        if (!tableErrorMessage) tableErrorMessage = allJvRes.error.message;
      } else {
        totalJobViews = allJvRes.count || 0;
        jobViewsList = recentJvRes.data || [];
      }
    } catch (err: any) {
      tablesReady = false;
      if (!tableErrorMessage) tableErrorMessage = err.message || 'job_views table not found';
    }

    // 5. Calculate Conversion Rate: (Applications / Total Job Views) * 100
    // If job views is 0 but visitors > 0, fallback to applications / visitors
    let conversionRate = 0;
    if (totalJobViews > 0) {
      conversionRate = Number(((totalApplications / totalJobViews) * 100).toFixed(1));
    } else if (totalVisitors > 0) {
      conversionRate = Number(((totalApplications / totalVisitors) * 100).toFixed(1));
    }

    // 6. Aggregate Visitors by Day (Last 7 Days)
    const visitorsByDay = generateDailySeries(7, (dateKey) => {
      return recentVisitorsList.filter((v) => {
        const itemDate = new Date(v.created_at).toISOString().split('T')[0];
        return itemDate === dateKey;
      }).length;
    });

    // 7. Aggregate Applications by Day (Last 7 Days)
    const applicationsByDay = generateDailySeries(7, (dateKey) => {
      return recentApplicantsList.filter((a) => {
        const itemDate = new Date(a.created_at).toISOString().split('T')[0];
        return itemDate === dateKey;
      }).length;
    });

    // 8. Aggregate Top Viewed Jobs
    const jobViewCounts: Record<string, { title: string; company: string; views: number }> = {};
    jobViewsList.forEach((jv) => {
      if (!jv.job_id) return;
      if (!jobViewCounts[jv.job_id]) {
        jobViewCounts[jv.job_id] = {
          title: jv.job_title || 'Software Opportunity',
          company: jv.company || 'Hiring Partner',
          views: 0,
        };
      }
      jobViewCounts[jv.job_id].views += 1;
    });

    // Count applications per job
    const jobAppCounts: Record<string, number> = {};
    recentApplicantsList.forEach((app) => {
      if (app.job_id) {
        jobAppCounts[app.job_id] = (jobAppCounts[app.job_id] || 0) + 1;
      }
    });

    const topViewedJobs: TopViewedJobMetric[] = Object.entries(jobViewCounts)
      .map(([job_id, data]) => {
        const apps = jobAppCounts[job_id] || 0;
        const rate = data.views > 0 ? Number(((apps / data.views) * 100).toFixed(1)) : 0;
        return {
          job_id,
          title: data.title,
          company: data.company,
          views: data.views,
          applications: apps,
          conversionRate: rate,
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    // 8b. Aggregate WhatsApp Community Popup Events
    let whatsAppPopupStats = {
      views: 0,
      joins: 0,
      dismisses: 0,
      conversionRate: 0,
    };

    try {
      const [waViewsRes, waJoinsRes, waDismissRes] = await Promise.all([
        supabase.from('whatsapp_popup_events').select('id', { count: 'exact', head: true }).eq('event_type', 'view'),
        supabase.from('whatsapp_popup_events').select('id', { count: 'exact', head: true }).eq('event_type', 'join_click'),
        supabase.from('whatsapp_popup_events').select('id', { count: 'exact', head: true }).in('event_type', ['close_click', 'maybe_later_click']),
      ]);

      if (!waViewsRes.error) {
        whatsAppPopupStats.views = waViewsRes.count || 0;
        whatsAppPopupStats.joins = waJoinsRes.count || 0;
        whatsAppPopupStats.dismisses = waDismissRes.count || 0;
      } else {
        // Fallback to local storage stats if table not yet created
        const localRaw = typeof window !== 'undefined' ? localStorage.getItem('cv_wa_popup_stats') : null;
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          whatsAppPopupStats.views = parsed.views || 0;
          whatsAppPopupStats.joins = parsed.joins || 0;
          whatsAppPopupStats.dismisses = parsed.dismisses || 0;
        }
      }
    } catch {
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

    return {
      totalVisitors,
      todayVisitors,
      weeklyVisitors,
      monthlyVisitors,
      totalApplications,
      todayApplications,
      activeJobs,
      expiredJobs,
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
