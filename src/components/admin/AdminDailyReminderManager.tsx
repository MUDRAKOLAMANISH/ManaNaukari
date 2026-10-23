import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Bell, Mail, Send, Users, CheckCircle2, AlertCircle, Loader2,
  RefreshCw, Play, ShieldCheck, Database, FileText, ChevronDown, ChevronUp, Copy, Check
} from 'lucide-react';

interface RunRecord {
  id: string;
  run_date: string;
  status: string;
  total_subscribers: number;
  emails_sent: number;
  emails_failed: number;
  jobs_included_count: number;
  started_at: string;
  completed_at?: string;
}

interface LogRecord {
  id: string;
  run_date: string;
  recipient_email: string;
  status: string;
  resend_id?: string;
  error_message?: string;
  created_at: string;
}

export const AdminDailyReminderManager: React.FC = () => {
  const [activeSubscribersCount, setActiveSubscribersCount] = useState<number>(0);
  const [totalSubscribersCount, setTotalSubscribersCount] = useState<number>(0);
  const [unsubscribedCount, setUnsubscribedCount] = useState<number>(0);
  const [activeJobsCount, setActiveJobsCount] = useState<number>(0);
  const [lastRun, setLastRun] = useState<RunRecord | null>(null);
  const [recentLogs, setRecentLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Test Email State
  const [testEmailInput, setTestEmailInput] = useState<string>('manishmudrakola8@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [testErrorMessage, setTestErrorMessage] = useState<string | null>(null);

  // Batch Run State
  const [isDispatchingBatch, setIsDispatchingBatch] = useState<boolean>(false);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);
  const [batchErrorMessage, setBatchErrorMessage] = useState<string | null>(null);

  // SQL Toggle
  const [showSql, setShowSql] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch Subscriber Counts
      const { data: subsData } = await supabase
        .from('job_alert_subscribers')
        .select('id, is_active');

      if (subsData) {
        setTotalSubscribersCount(subsData.length);
        const active = subsData.filter((s: any) => s.is_active !== false).length;
        setActiveSubscribersCount(active);
        setUnsubscribedCount(subsData.length - active);
      }

      // 2. Fetch Active Jobs Count
      const { count: jobsCount } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      setActiveJobsCount(jobsCount || 0);

      // 3. Fetch Last Run Record
      const { data: runData } = await supabase
        .from('daily_job_reminder_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setLastRun(runData as RunRecord | null);

      // 4. Fetch Recent Delivery Logs
      const { data: logsData } = await supabase
        .from('daily_job_reminder_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentLogs((logsData as LogRecord[]) || []);
    } catch (err) {
      console.warn('[AdminDailyReminderManager] Fetch notice:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handler: Send Test Email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestSuccessMessage(null);
    setTestErrorMessage(null);

    const email = testEmailInput.trim();
    if (!email || !email.includes('@')) {
      setTestErrorMessage('Please enter a valid recipient email address.');
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetch('/api/admin/daily-reminder-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_email: email,
          is_test: true,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to send test email.');
      }

      setTestSuccessMessage(`Test daily job reminder sent successfully to ${email} with ${result.jobs_count || 0} active jobs!`);
      fetchData(true);
    } catch (err: any) {
      console.error('[SendTestEmail] Error:', err);
      setTestErrorMessage(err.message || 'Failed to dispatch test email.');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Handler: Trigger Batch Dispatch
  const handleTriggerBatchDispatch = async () => {
    if (!window.confirm(`Are you sure you want to trigger daily job reminder emails for ${activeSubscribersCount} active subscribers now?`)) {
      return;
    }

    setBatchSuccessMessage(null);
    setBatchErrorMessage(null);
    setIsDispatchingBatch(true);

    try {
      const res = await fetch('/api/admin/daily-reminder-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          force_run: true,
          is_test: false,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to dispatch daily reminder batch.');
      }

      if (result.skipped) {
        setBatchSuccessMessage(`Run skipped: ${result.message}`);
      } else {
        setBatchSuccessMessage(`Batch dispatch completed! Sent: ${result.emails_sent}, Failed: ${result.emails_failed}, Jobs included: ${result.jobs_count}`);
      }
      fetchData(true);
    } catch (err: any) {
      console.error('[BatchDispatch] Error:', err);
      setBatchErrorMessage(err.message || 'Failed to dispatch batch daily reminders.');
    } finally {
      setIsDispatchingBatch(false);
    }
  };

  const sqlSetup = `-- Supabase Cron Setup Script (9:00 AM IST = 03:30 UTC):
SELECT cron.schedule(
  'daily-job-reminder-9am-ist',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wasiyzakmkrmbxohzfwg.supabase.co/functions/v1/daily-job-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
  $$
);`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold font-display text-slate-900">
                Automated Daily Job Reminder System
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                n8n Replaced
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Powered by Supabase Edge Functions, Supabase Cron (9:00 AM IST), &amp; Resend API
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
          <div className="text-xs font-bold text-slate-500">Active Subscribers</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {loading ? '...' : activeSubscribersCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total: {totalSubscribersCount}</div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
          <div className="text-xs font-bold text-slate-500">Active Jobs to Send</div>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {loading ? '...' : activeJobsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Genuine jobs in database</div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
          <div className="text-xs font-bold text-slate-500">Last Execution Date</div>
          <div className="text-base font-extrabold text-slate-900 mt-2 truncate">
            {lastRun ? lastRun.run_date : 'No runs logged'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {lastRun?.status === 'completed' ? '✔ Completed' : lastRun?.status || 'Pending'}
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
          <div className="text-xs font-bold text-slate-500">Last Run Sent / Failed</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {lastRun ? `${lastRun.emails_sent} / ${lastRun.emails_failed}` : '0 / 0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Emails delivered</div>
        </div>
      </div>

      {/* Action Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Box A: Send Test Email */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 font-display">
              1. Send Test Daily Reminder to Admin Email
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Preview the exact HTML email format containing genuine active jobs before sending to subscribers.
          </p>

          {testSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{testSuccessMessage}</span>
            </div>
          )}

          {testErrorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{testErrorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSendTestEmail} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recipient Test Email
              </label>
              <input
                type="email"
                required
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              disabled={isSendingTest}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl transition-colors cursor-pointer"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Test Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Test Daily Email Now</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Box B: Trigger Batch Dispatch Now */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 font-display">
              2. Manual Batch Dispatch to Active Subscribers
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Trigger a manual daily reminder batch right now for all <strong>{activeSubscribersCount}</strong> active subscribers.
          </p>

          {batchSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{batchSuccessMessage}</span>
            </div>
          )}

          {batchErrorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{batchErrorMessage}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleTriggerBatchDispatch}
              disabled={isDispatchingBatch || activeSubscribersCount === 0}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {isDispatchingBatch ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Daily Reminders...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Trigger Batch Dispatch Now ({activeSubscribersCount} Subscribers)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* SQL Setup Instructions Accordion */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowSql(!showSql)}
          className="w-full p-4 bg-slate-900 text-white flex items-center justify-between text-xs font-bold cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span>View Supabase Cron Schedule SQL Script (9:00 AM IST)</span>
          </div>
          {showSql ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showSql && (
          <div className="p-4 bg-slate-950 text-slate-300 text-[11px] font-mono space-y-3">
            <p className="text-slate-400 font-sans">
              Run this SQL script in your Supabase SQL Editor to enable automatic daily execution at 9:00 AM IST (03:30 UTC):
            </p>
            <pre className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-slate-200 overflow-x-auto">
              {sqlSetup}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
};
