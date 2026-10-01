import React, { useState, useEffect } from 'react';
import { adminAnalyticsService } from '../../services/adminAnalyticsService';
import { AnalyticsOverview } from '../../types/database.types';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { AnalyticsMetricCard } from '../../components/admin/analytics/AnalyticsMetricCard';
import { AnalyticsDailyBarChart } from '../../components/admin/analytics/AnalyticsDailyBarChart';
import { TopViewedJobsTable } from '../../components/admin/analytics/TopViewedJobsTable';
import { OFFICIAL_LINKS } from '../../constants/links';
import { 
  Users, UserCheck, Calendar, Clock, FileText, 
  CheckCircle2, Briefcase, AlertCircle, Eye, Percent, 
  RefreshCw, TrendingUp, Database, Copy, Check, ChevronDown, ChevronUp,
  MessageSquare, UserPlus, MousePointerClick, ExternalLink, Mail, Send, BellRing
} from 'lucide-react';

interface AdminAnalyticsPageProps {
  onNavigate: (path: string) => void;
}

export const AdminAnalyticsPage: React.FC<AdminAnalyticsPageProps> = ({ onNavigate }) => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlSetup, setShowSqlSetup] = useState(false);

  const fetchAnalytics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await adminAnalyticsService.getOverview();
      setOverview(data);
      if (!data.tablesReady) {
        setShowSqlSetup(true);
      }
    } catch (err) {
      console.error('[AdminAnalytics] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const sqlSetupScript = `-- Run this in Supabase SQL Editor for visitor_analytics & job_views tables:

CREATE TABLE IF NOT EXISTS public.visitor_analytics (
    id BIGSERIAL PRIMARY KEY,
    page_url TEXT NOT NULL,
    page_name VARCHAR(255),
    session_id VARCHAR(64),
    visitor_id VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Schema upgrades if table already exists:
ALTER TABLE public.visitor_analytics ADD COLUMN IF NOT EXISTS page_name VARCHAR(255);
ALTER TABLE public.visitor_analytics ADD COLUMN IF NOT EXISTS session_id VARCHAR(64);
ALTER TABLE public.visitor_analytics ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.visitor_analytics ADD COLUMN IF NOT EXISTS visited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

CREATE TABLE IF NOT EXISTS public.job_views (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL,
    visitor_id VARCHAR(100) NOT NULL,
    session_id VARCHAR(64),
    job_title VARCHAR(255),
    company VARCHAR(150),
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Schema upgrades if table already exists:
ALTER TABLE public.job_views ADD COLUMN IF NOT EXISTS session_id VARCHAR(64);
ALTER TABLE public.job_views ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE public.job_views ADD COLUMN IF NOT EXISTS company VARCHAR(150);
ALTER TABLE public.job_views ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

CREATE TABLE IF NOT EXISTS public.whatsapp_popup_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'view', 'join_click', 'close_click', 'maybe_later_click'
    path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.job_alert_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    categories TEXT[] DEFAULT '{}',
    frequency VARCHAR(50) DEFAULT 'daily',
    status VARCHAR(20) DEFAULT 'active',
    source VARCHAR(100) DEFAULT 'website_job_alerts_form',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_created ON public.visitor_analytics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_session ON public.visitor_analytics (session_id);
CREATE INDEX IF NOT EXISTS idx_job_views_created ON public.job_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_popup_events_created ON public.whatsapp_popup_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_popup_events_type ON public.whatsapp_popup_events (event_type);

-- Enable RLS
ALTER TABLE public.visitor_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_popup_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow Public Insert
CREATE POLICY "Allow public insert to visitor_analytics" ON public.visitor_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to job_views" ON public.job_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to whatsapp_popup_events" ON public.whatsapp_popup_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to job_alert_subscriptions" ON public.job_alert_subscriptions FOR INSERT WITH CHECK (true);

-- Allow Admin & Service Role Access
CREATE POLICY "Allow full access to admin on visitor_analytics" ON public.visitor_analytics FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Allow full access to admin on job_views" ON public.job_views FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Allow full access to admin on whatsapp_popup_events" ON public.whatsapp_popup_events FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Allow full access to admin on job_alert_subscriptions" ON public.job_alert_subscriptions FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Resume Orders (ATS Review submissions)
CREATE TABLE IF NOT EXISTS public.resume_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    resume_file_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.resume_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert to resume_orders" ON public.resume_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow full access to admin on resume_orders" ON public.resume_orders FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Supabase Storage 'resumes' Bucket & Permissions
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Allow public uploads to resumes bucket" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'resumes');
CREATE POLICY "Allow public read on resumes bucket" ON storage.objects FOR SELECT TO public USING (bucket_id = 'resumes');

-- Applicants table extensions (status, notes, resume_url)
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'New';
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.visitor_profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;
CREATE POLICY "Allow admin full access to applicants" ON public.applicants FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Recruiters & Recruiter Jobs extensions
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS recruiter_name VARCHAR(200);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS recruiter_email VARCHAR(255);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS designation VARCHAR(150);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS company_name VARCHAR(200);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS company_website VARCHAR(255);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS linkedin_profile VARCHAR(255);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS company_logo TEXT;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS registration_doc_url TEXT;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS verified_by VARCHAR(150);
UPDATE public.recruiters SET recruiter_name = name WHERE recruiter_name IS NULL AND name IS NOT NULL;
UPDATE public.recruiters SET name = recruiter_name WHERE name IS NULL AND recruiter_name IS NOT NULL;
UPDATE public.recruiters SET recruiter_email = official_email WHERE recruiter_email IS NULL AND official_email IS NOT NULL;
UPDATE public.recruiters SET official_email = recruiter_email WHERE official_email IS NULL AND recruiter_email IS NOT NULL;
UPDATE public.recruiters SET phone_number = mobile_number WHERE phone_number IS NULL AND mobile_number IS NOT NULL;
UPDATE public.recruiters SET mobile_number = phone_number WHERE mobile_number IS NULL AND phone_number IS NOT NULL;
CREATE POLICY "Allow admin full access to recruiters" ON public.recruiters FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Allow admin full access to recruiter_jobs" ON public.recruiter_jobs FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSetupScript).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    });
  };

  const waStats = overview?.whatsAppPopupStats || {
    views: 0,
    joins: 0,
    dismisses: 0,
    conversionRate: 0,
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation & Header */}
        <AdminHeader
          title="Platform Performance Analytics"
          subtitle="Real-time traffic, candidate engagement, and job conversion metrics"
          onNavigate={onNavigate}
          showAddButton={false}
          showImportButton={false}
        />

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Supabase Telemetry
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Data synchronized with Postgres tables
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSqlSetup(!showSqlSetup)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-slate-600" />
              <span>Database Schema</span>
              {showSqlSetup ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>

        {/* Database Migration helper banner if tables need setup */}
        {showSqlSetup && (
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-lg border border-slate-800 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                <h4 className="text-sm font-bold text-white">
                  PostgreSQL Analytics Migration Script
                </h4>
              </div>
              <button
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-white" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Run this SQL script in your Supabase SQL Editor to provision the <code className="text-blue-300">visitor_analytics</code> and <code className="text-blue-300">job_views</code> tables with row-level security and performance indexes.
            </p>
            <pre className="bg-slate-950 p-4 rounded-xl text-slate-300 text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
              {sqlSetupScript}
            </pre>
          </div>
        )}

        {/* 10 Dashboard Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Card 1: Total Visitors */}
          <AnalyticsMetricCard
            title="Total Visitors"
            value={loading ? '...' : (overview?.totalVisitors ?? 0).toLocaleString()}
            subtitle="All recorded page visits"
            icon={Users}
            colorScheme="blue"
            badge="All Time"
          />

          {/* Card 2: Today's Visitors */}
          <AnalyticsMetricCard
            title="Today's Visitors"
            value={loading ? '...' : (overview?.todayVisitors ?? 0).toLocaleString()}
            subtitle="Visits since UTC 00:00"
            icon={UserCheck}
            colorScheme="indigo"
            badge="Today"
          />

          {/* Card 3: Weekly Visitors */}
          <AnalyticsMetricCard
            title="Weekly Visitors"
            value={loading ? '...' : (overview?.weeklyVisitors ?? 0).toLocaleString()}
            subtitle="Trailing 7-day traffic"
            icon={Calendar}
            colorScheme="teal"
            badge="Last 7d"
          />

          {/* Card 4: Monthly Visitors */}
          <AnalyticsMetricCard
            title="Monthly Visitors"
            value={loading ? '...' : (overview?.monthlyVisitors ?? 0).toLocaleString()}
            subtitle="Trailing 30-day traffic"
            icon={Clock}
            colorScheme="purple"
            badge="Last 30d"
          />

          {/* Card 5: Total Applications */}
          <AnalyticsMetricCard
            title="Total Applications"
            value={loading ? '...' : (overview?.totalApplications ?? 0).toLocaleString()}
            subtitle="All verified candidate leads"
            icon={FileText}
            colorScheme="emerald"
            badge="Leads"
          />

          {/* Card 6: Today's Applications */}
          <AnalyticsMetricCard
            title="Today's Applications"
            value={loading ? '...' : (overview?.todayApplications ?? 0).toLocaleString()}
            subtitle="Submitted in last 24h"
            icon={CheckCircle2}
            colorScheme="emerald"
            badge="Today"
          />

          {/* Card 7: Active Jobs */}
          <AnalyticsMetricCard
            title="Active Jobs"
            value={loading ? '...' : (overview?.activeJobs ?? 0).toLocaleString()}
            subtitle="Live in public portal"
            icon={Briefcase}
            colorScheme="blue"
            badge="Live"
          />

          {/* Card 8: Expired Jobs */}
          <AnalyticsMetricCard
            title="Expired Jobs"
            value={loading ? '...' : (overview?.expiredJobs ?? 0).toLocaleString()}
            subtitle="Archived requisitions"
            icon={AlertCircle}
            colorScheme="amber"
            badge="Archived"
          />

          {/* Card 9: Total Job Views */}
          <AnalyticsMetricCard
            title="Total Job Views"
            value={loading ? '...' : (overview?.totalJobViews ?? 0).toLocaleString()}
            subtitle="Job details opened"
            icon={Eye}
            colorScheme="purple"
            badge="Engagement"
          />

          {/* Card 10: Application Conversion Rate */}
          <AnalyticsMetricCard
            title="Conversion Rate"
            value={loading ? '...' : `${overview?.conversionRate ?? 0}%`}
            subtitle="Applications per Job View"
            icon={Percent}
            colorScheme="rose"
            badge="Efficiency"
          />

        </div>

        {/* WhatsApp Community Growth & Popup Metrics Section */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-emerald-800/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <MessageSquare className="w-5 h-5 fill-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold font-display text-white">
                      WhatsApp Community Growth &amp; Popup Conversion
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Live candidate acquisition telemetry from public WhatsApp Join Popups
                  </p>
                </div>
              </div>

              <a
                href={OFFICIAL_LINKS.WHATSAPP_CHANNEL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-300 hover:bg-emerald-200 rounded-xl transition-colors shrink-0"
              >
                <span>View WhatsApp Channel</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Sub-metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Popup Impressions</span>
                  <Eye className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold font-display text-white mt-2">
                  {loading ? '...' : waStats.views.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-300/80 mt-1">3s trigger after visit</div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Join Clicks</span>
                  <UserPlus className="w-4 h-4 text-teal-400" />
                </div>
                <div className="text-2xl font-extrabold font-display text-white mt-2">
                  {loading ? '...' : waStats.joins.toLocaleString()}
                </div>
                <div className="text-[11px] text-teal-300/80 mt-1">30-day snooze applied</div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Conversion Rate</span>
                  <Percent className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold font-display text-emerald-300 mt-2">
                  {loading ? '...' : `${waStats.conversionRate}%`}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Joins per impression</div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Dismissed / Snoozed</span>
                  <MousePointerClick className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-extrabold font-display text-slate-200 mt-2">
                  {loading ? '...' : waStats.dismisses.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">7-day cooldown active</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid: Visitors by Day & Applications by Day */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsDailyBarChart
            title="Visitors by Day"
            subtitle="Daily platform traffic trend over the past 7 days"
            data={overview?.visitorsByDay || []}
            barColor="blue"
            icon={TrendingUp}
            totalSumLabel="7-Day Visits"
          />

          <AnalyticsDailyBarChart
            title="Applications by Day"
            subtitle="Daily verified job application submissions over the past 7 days"
            data={overview?.applicationsByDay || []}
            barColor="emerald"
            icon={FileText}
            totalSumLabel="7-Day Applications"
          />
        </div>

        {/* Top Viewed Jobs Ranking Table */}
        <TopViewedJobsTable
          jobs={overview?.topViewedJobs || []}
          onNavigate={onNavigate}
        />

        {/* Automatic Job Alerts Email Delivery Statistics & Audit Log */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-slate-900">
                  Automatic Job Alert Email Delivery &amp; Resend Telemetry
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time broadcast tracking when active jobs match candidate category preferences
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Resend Active
              </span>
            </div>
          </div>

          {/* Delivery KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Active Subscribers</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black font-display text-slate-900 mt-2">
                {overview?.alertDeliveryStats ? overview.alertDeliveryStats.activeSubscribers.toLocaleString() : (loading ? '...' : '0')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                of {overview?.alertDeliveryStats ? overview.alertDeliveryStats.totalSubscribers : 0} total registered
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Total Alerts Processed</span>
                <Send className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-black font-display text-slate-900 mt-2">
                {overview?.alertDeliveryStats ? overview.alertDeliveryStats.totalAlertsSent.toLocaleString() : (loading ? '...' : '0')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Dispatches triggered
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Delivered Successfully</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-display text-emerald-700 mt-2">
                {overview?.alertDeliveryStats ? overview.alertDeliveryStats.successfulDeliveries.toLocaleString() : (loading ? '...' : '0')}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                Verified delivery via Resend
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Skipped / Filtered</span>
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black font-display text-slate-700 mt-2">
                {overview?.alertDeliveryStats ? overview.alertDeliveryStats.failedDeliveries.toLocaleString() : (loading ? '...' : '0')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Testing sandbox restrictions / errors
              </div>
            </div>
          </div>

          {/* Recent Delivery Audit Log Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recent Broadcast Delivery Log
              </h4>
              <span className="text-[11px] text-slate-400">
                Auto-refreshed upon job publication
              </span>
            </div>

            {overview?.alertDeliveryStats?.recentDeliveries && overview.alertDeliveryStats.recentDeliveries.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Job Title &amp; Category</th>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overview.alertDeliveryStats.recentDeliveries.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {item.recipient_email}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{item.job_title}</div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                            {item.job_category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {item.company}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Delivered
                            </span>
                          ) : item.status === 'skipped' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title={item.error_message || 'Sandbox recipient'}>
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Sandbox
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200" title={item.error_message || 'Delivery error'}>
                              <AlertCircle className="w-3 h-3 text-red-600" />
                              Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No job alert broadcast logs recorded yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Publish a new Active job in the admin portal to trigger automatic category-matched email notifications.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
