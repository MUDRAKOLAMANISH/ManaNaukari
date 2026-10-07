import React, { useState, useEffect } from 'react';
import { Job, Category } from '../../types/database.types';
import { adminJobsService } from '../../services/adminJobsService';
import { supabase } from '../../lib/supabase';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { JobTable } from '../../components/admin/JobTable';
import { JobTablePagination } from '../../components/admin/JobTablePagination';
import { DeleteConfirmModal } from '../../components/admin/DeleteConfirmModal';
import { SocialShareModal } from '../../components/admin/SocialShareModal';
import { 
  Search, RefreshCw, AlertCircle, CheckCircle2, 
  ShieldCheck, Database, Copy, Check, ChevronDown, ChevronUp, RotateCcw, Trash2
} from 'lucide-react';

interface AdminJobsListPageProps {
  onNavigate: (path: string) => void;
}

export const AdminJobsListPage: React.FC<AdminJobsListPageProps> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Status counts for quick summary
  const [statusCounts, setStatusCounts] = useState<{
    all: number;
    active: number;
    draft: number;
    needs_review: number;
    paused: number;
    expired: number;
    closed: number;
    deleted: number;
    checked_today: number;
  }>({
    all: 0,
    active: 0,
    draft: 0,
    needs_review: 0,
    paused: 0,
    expired: 0,
    closed: 0,
    deleted: 0,
    checked_today: 0,
  });

  // Soft Delete Architecture info panel toggle & SQL copy
  const [showArchitectureDetails, setShowArchitectureDetails] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Social share modal state
  const [shareTarget, setShareTarget] = useState<Job | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check for pending toast from job edit/create redirect
  useEffect(() => {
    try {
      const savedToast = sessionStorage.getItem('admin_job_toast_message');
      if (savedToast) {
        console.log('[AdminJobsListPage] Displaying redirect toast:', savedToast);
        setToastMessage(savedToast);
        sessionStorage.removeItem('admin_job_toast_message');
        setTimeout(() => setToastMessage(null), 4500);
      }
    } catch (err) {
      console.warn('[AdminJobsListPage] Storage access warning:', err);
    }
  }, []);

  // Fetch categories once on mount
  useEffect(() => {
    const fetchCats = async () => {
      const data = await adminJobsService.getCategories();
      setCategories(data);
    };
    fetchCats();
  }, []);

  // Fetch status summary counts
  const loadStatusCounts = async () => {
    try {
      const todayPrefix = new Date().toISOString().split('T')[0];
      const [allRes, activeRes, draftRes, needsReviewRes, pausedRes, expiredRes, closedRes, deletedRes] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'needs_review'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'paused'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'closed'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'deleted'),
      ]);

      let checkedTodayCount = 0;
      try {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .gte('review_date', todayPrefix);
        if (!error) {
          checkedTodayCount = count || 0;
        }
      } catch (err) {
        console.warn('Could not query checked_today counts:', err);
      }

      setStatusCounts({
        all: allRes.count || 0,
        active: activeRes.count || 0,
        draft: draftRes.count || 0,
        needs_review: needsReviewRes.count || 0,
        paused: pausedRes.count || 0,
        expired: expiredRes.count || 0,
        closed: closedRes.count || 0,
        deleted: deletedRes.count || 0,
        checked_today: checkedTodayCount,
      });
    } catch (err) {
      console.warn('Could not load job status counts:', err);
    }
  };

  // Fetch jobs on filter/page changes
  const loadJobs = async () => {
    setLoading(true);
    setErrorMessage(null);

    const res = await adminJobsService.getJobs({
      search,
      category: selectedCategory,
      status: selectedStatus,
      page: currentPage,
      pageSize,
    });

    if (res.error) {
      setErrorMessage(res.error.message);
    } else {
      setJobs(res.data);
      setTotalCount(res.totalCount);
    }

    setLoading(false);
    loadStatusCounts();
  };

  useEffect(() => {
    loadJobs();
  }, [search, selectedCategory, selectedStatus, currentPage]);

  // Actions
  const handleEdit = (job: Job) => {
    console.log('[AdminJobsListPage] Edit button clicked for job ID:', job.id, 'Title:', job.title);
    onNavigate(`/admin/jobs/edit/${job.id}`);
  };

  const handleToggleExpire = async (job: Job) => {
    const { success, newStatus, error } = await adminJobsService.toggleExpireJob(job.id, job.status);
    if (success) {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: newStatus as any } : j))
      );
      setToastMessage(
        newStatus === 'expired'
          ? `Job "${job.title}" marked as Expired.`
          : `Job "${job.title}" activated.`
      );
      setTimeout(() => setToastMessage(null), 4000);
      loadStatusCounts();
    } else if (error) {
      alert(`Could not toggle status: ${error.message}`);
    }
  };

  const handleTogglePause = async (job: Job) => {
    const { success, newStatus, error } = await adminJobsService.togglePauseJob(job.id, job.status);
    if (success) {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: newStatus as any } : j))
      );
      setToastMessage(
        newStatus === 'paused'
          ? `Job "${job.title}" has been paused (applications temporarily disabled).`
          : `Job "${job.title}" is now active and accepting applications.`
      );
      setTimeout(() => setToastMessage(null), 4000);
      loadStatusCounts();
    } else if (error) {
      alert(`Could not toggle pause status: ${error.message}`);
    }
  };

  const handleConfirmSoftDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    const { success, error } = await adminJobsService.deleteJob(deleteTarget.id);
    setIsDeleting(false);

    if (success) {
      const deletedTitle = deleteTarget.title;
      setDeleteTarget(null);
      setToastMessage(`Job "${deletedTitle}" was hidden from the public site but retained in history.`);
      setTimeout(() => setToastMessage(null), 4000);
      loadJobs();
      loadStatusCounts();
    } else if (error) {
      alert(`Error soft-deleting job: ${error.message}`);
    }
  };

  const handleConfirmHardDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    const { success, error } = await adminJobsService.deleteJobPermanently(deleteTarget.id);
    setIsDeleting(false);

    if (success) {
      const deletedTitle = deleteTarget.title;
      setDeleteTarget(null);
      setToastMessage('Job permanently deleted.');
      setTimeout(() => setToastMessage(null), 4000);
      loadJobs();
      loadStatusCounts();
    } else if (error) {
      alert(`Error permanently deleting job: ${error.message}`);
    }
  };

  const handleRestoreJob = async (job: Job) => {
    const { success, error } = await adminJobsService.restoreJob(job.id);
    if (success) {
      setToastMessage(`Job "${job.title}" has been restored to Active status!`);
      setTimeout(() => setToastMessage(null), 4000);
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: 'active' } : j))
      );
      loadStatusCounts();
    } else if (error) {
      alert(`Could not restore job: ${error.message}`);
    }
  };

  const [scanning, setScanning] = useState(false);

  const handleRunHealthCheck = async () => {
    setScanning(true);
    setToastMessage('Initiating live job availability checks on active postings...');
    setTimeout(() => setToastMessage(null), 3000);

    try {
      const res = await fetch('/api/admin/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // Defensive Handling: Check response status and Content-Type before parsing JSON
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        console.error('[Admin] Health Check API failure details:', {
          url: '/api/admin/check-availability',
          status: res.status,
          statusText: res.statusText,
          contentType: contentType,
          headers: Array.from(res.headers.entries()).reduce((acc: any, [k, v]) => {
            acc[k] = v;
            return acc;
          }, {}),
        });
        alert("Production API endpoint is not responding correctly.");
        return;
      }

      const data = await res.json();
      if (data.success) {
        setToastMessage(`Job scan complete! Checked ${data.totalChecked} jobs. Flagged ${data.flaggedCount} potential closures.`);
        setTimeout(() => setToastMessage(null), 5000);
        loadJobs();
      } else {
        alert(`Error running health check: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Failed to run availability checks:', err);
      alert(`Network error running health check: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateStatus = async (job: Job, newStatus: string) => {
    const payload: any = { status: newStatus };
    if (newStatus === 'active') {
      payload.review_reason = null;
      payload.review_date = null;
    }

    let { error } = await adminJobsService.updateJob(job.id, payload);
    
    // Fallback if review columns are missing in the remote database schema cache
    if (error && (error.message?.includes('review_date') || error.message?.includes('review_reason') || error.message?.includes('schema cache'))) {
      console.warn('[Admin] Review columns are missing in Supabase schema. Retrying status update only.');
      const fallbackRes = await adminJobsService.updateJob(job.id, { status: newStatus as any });
      error = fallbackRes.error;
    }

    if (!error) {
      setToastMessage(`Job "${job.title}" status updated to "${newStatus}".`);
      setTimeout(() => setToastMessage(null), 4000);
      loadJobs();
    } else {
      alert(`Could not update job status: ${error.message}`);
    }
  };

  const softDeleteSqlMigration = `-- Remove ON DELETE CASCADE & Enforce Soft-Delete Data Preservation
ALTER TABLE public.applicants DROP CONSTRAINT IF EXISTS fk_applicants_job;
ALTER TABLE public.applicants ADD CONSTRAINT fk_applicants_job FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.applicants DROP CONSTRAINT IF EXISTS fk_applicants_visitor;
ALTER TABLE public.applicants ADD CONSTRAINT fk_applicants_visitor FOREIGN KEY (visitor_id) REFERENCES public.visitor_profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.job_views DROP CONSTRAINT IF EXISTS fk_job_views_job;
ALTER TABLE public.job_views ADD CONSTRAINT fk_job_views_job FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE OR REPLACE VIEW public.applications AS SELECT * FROM public.applicants;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(softDeleteSqlMigration);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Admin Top Header */}
      <AdminHeader
        title="Job Management"
        subtitle="Manage live requisitions, review soft-deleted jobs, or restore completed campus drives"
        onNavigate={onNavigate}
        showAddButton={true}
      />

      {/* Production Soft Delete Architecture Guarantee Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-blue-800/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 text-blue-300 flex items-center justify-center shrink-0 border border-blue-400/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm tracking-tight text-white">Production Soft-Delete Architecture Active</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold px-2 py-0.5 rounded-full">
                  Applications Permanently Protected
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5 max-w-2xl leading-relaxed">
                When you delete a job, it is soft-deleted (<code className="text-blue-200">status = &apos;deleted&apos;</code>). All candidate submissions, resumes, recruiter data, and impressions are retained indefinitely and can be restored at any time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setShowArchitectureDetails(!showArchitectureDetails)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer border border-white/10"
            >
              <Database className="w-3.5 h-3.5" />
              <span>SQL Constraints</span>
              {showArchitectureDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Architecture Details & SQL Migration */}
        {showArchitectureDetails && (
          <div className="mt-4 pt-4 border-t border-blue-800/80 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-100 flex items-center gap-1.5">
                <span>PostgreSQL Foreign Key Schema (ON DELETE RESTRICT)</span>
              </span>
              <button
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-950/80 p-3 rounded-xl text-blue-200 font-mono text-[11px] overflow-x-auto border border-blue-900/50">
              {softDeleteSqlMigration}
            </pre>
            <p className="text-[11px] text-blue-300/80 leading-relaxed">
              This migration drops <code className="text-white">ON DELETE CASCADE</code> between <code className="text-white">jobs</code> and <code className="text-white">applicants</code> / <code className="text-white">job_views</code>, and adds a <code className="text-white">public.applications</code> view for backwards compatibility.
            </p>
          </div>
        )}
      </div>

      {/* Automated Availability Checker Dashboard Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Job Availability Automation Control Panel</span>
            </h2>
            <p className="text-xs text-slate-500 max-w-xl">
              Our automated checker daily visits each active job’s official apply link to detect 404 pages, removed postings, or closed applications. Flagged jobs are moved to <span className="font-semibold text-orange-700 bg-orange-50 px-1 py-0.2 rounded border border-orange-200 text-[10px]">Needs Review</span> for human verification.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end lg:self-auto shrink-0">
            <button
              onClick={handleRunHealthCheck}
              disabled={scanning}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl transition-all shadow-xs cursor-pointer ${
                scanning ? 'animate-pulse' : ''
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Scanning Live Postings...' : 'Run Availability Checker Now'}</span>
            </button>
          </div>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          {/* Active Jobs */}
          <div className="bg-slate-50/55 rounded-xl p-4 border border-slate-200/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-[10px]">Active Jobs</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {statusCounts.active}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
              🟢
            </div>
          </div>

          {/* Potentially Closed Jobs */}
          <div className="bg-slate-50/55 rounded-xl p-4 border border-slate-200/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-[10px]">Potentially Closed Jobs</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {statusCounts.needs_review}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center font-bold">
              ⚠️
            </div>
          </div>

          {/* Jobs Checked Today */}
          <div className="bg-slate-50/55 rounded-xl p-4 border border-slate-200/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-[10px]">Jobs Checked Today</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {statusCounts.checked_today}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
              🔍
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status Filter Tabs: Active, Needs Review, Draft, Paused, Expired, Closed, Deleted */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'all', label: 'All Jobs', count: statusCounts.all, emoji: '📋' },
          { key: 'active', label: 'Active', count: statusCounts.active, emoji: '🟢' },
          { key: 'needs_review', label: 'Needs Review', count: statusCounts.needs_review, emoji: '⚠️' },
          { key: 'draft', label: 'Drafts', count: statusCounts.draft, emoji: '📝' },
          { key: 'paused', label: 'Paused', count: statusCounts.paused, emoji: '🟡' },
          { key: 'expired', label: 'Expired', count: statusCounts.expired, emoji: '🔴' },
          { key: 'closed', label: 'Closed', count: statusCounts.closed, emoji: '🔒' },
          { key: 'deleted', label: 'Deleted', count: statusCounts.deleted, emoji: '🗑️' },
        ].map((tab) => {
          const isSelected = selectedStatus === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setSelectedStatus(tab.key);
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected
                    ? 'bg-blue-700/80 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by job title or company..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.category_name}>
                {c.category_name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active (🟢 Live)</option>
            <option value="paused">Paused (🟡 Unavailable)</option>
            <option value="expired">Expired (🔴 Closed)</option>
            <option value="deleted">Deleted (Soft-Deleted)</option>
            <option value="closed">Closed Only</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={loadJobs}
            disabled={loading}
            className="p-2 border border-slate-300 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Reload from Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Table View */}
      <JobTable
        jobs={jobs}
        loading={loading}
        onEdit={handleEdit}
        onToggleExpire={handleToggleExpire}
        onTogglePause={handleTogglePause}
        onDelete={(job) => setDeleteTarget(job)}
        onRestore={handleRestoreJob}
        onShare={(job) => setShareTarget(job)}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Pagination Bar */}
      {!loading && totalCount > 0 && (
        <JobTablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}

      {/* Delete Confirmation Modal (Soft / Permanent Selection) */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        jobTitle={deleteTarget?.title || ''}
        isDeleting={isDeleting}
        onSoftDelete={handleConfirmSoftDelete}
        onHardDelete={handleConfirmHardDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Social Share Modal */}
      <SocialShareModal
        isOpen={Boolean(shareTarget)}
        job={shareTarget}
        onClose={() => setShareTarget(null)}
        onToast={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div className="p-4 rounded-2xl shadow-xl border bg-emerald-600 text-white border-emerald-700 text-xs font-bold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

    </div>
  );
};
