import React, { useState, useEffect } from 'react';
import { Job, Category } from '../../types/database.types';
import { adminJobsService } from '../../services/adminJobsService';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { JobTable } from '../../components/admin/JobTable';
import { JobTablePagination } from '../../components/admin/JobTablePagination';
import { DeleteConfirmModal } from '../../components/admin/DeleteConfirmModal';
import { SocialShareModal } from '../../components/admin/SocialShareModal';
import { Search, Filter, RefreshCw, AlertCircle, Plus, CheckCircle2 } from 'lucide-react';

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

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Social share modal state
  const [shareTarget, setShareTarget] = useState<Job | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch categories once on mount
  useEffect(() => {
    const fetchCats = async () => {
      const data = await adminJobsService.getCategories();
      setCategories(data);
    };
    fetchCats();
  }, []);

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
  };

  useEffect(() => {
    loadJobs();
  }, [search, selectedCategory, selectedStatus, currentPage]);

  // Actions
  const handleEdit = (job: Job) => {
    onNavigate(`/admin/jobs/edit/${job.id}`);
  };

  const handleToggleExpire = async (job: Job) => {
    const { success, newStatus, error } = await adminJobsService.toggleExpireJob(job.id, job.status);
    if (success) {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: newStatus as any } : j))
      );
    } else if (error) {
      alert(`Could not toggle status: ${error.message}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    const { success, error } = await adminJobsService.deleteJob(deleteTarget.id);
    setIsDeleting(false);

    if (success) {
      setDeleteTarget(null);
      // Reload current page or step back if last item on page
      if (jobs.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        loadJobs();
      }
    } else if (error) {
      alert(`Error deleting job: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Admin Top Header */}
      <AdminHeader
        title="Job Management"
        subtitle="Manage live requisitions, update details, or expire completed campus drives"
        onNavigate={onNavigate}
        showAddButton={true}
      />

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
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
            <option value="draft">Drafts Only</option>
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
        onDelete={(job) => setDeleteTarget(job)}
        onShare={(job) => setShareTarget(job)}
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        jobTitle={deleteTarget?.title || ''}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
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
