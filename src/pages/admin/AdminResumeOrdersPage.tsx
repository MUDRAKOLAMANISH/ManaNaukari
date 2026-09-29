import React, { useState, useEffect, useMemo } from 'react';
import { resumeReviewService } from '../../services/resumeReviewService';
import { ResumeOrder } from '../../types/database.types';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { 
  FileText, Search, Filter, Download, MessageSquare, 
  CheckCircle2, Clock, AlertCircle, RefreshCw, Trash2, 
  ExternalLink, Layers, ArrowUpRight, Eye, PhoneCall,
  UserCheck, ShieldCheck, HelpCircle
} from 'lucide-react';

interface AdminResumeOrdersPageProps {
  onNavigate: (path: string) => void;
}

type StatusFilter = 'all' | 'new' | 'in_progress' | 'completed';

export const AdminResumeOrdersPage: React.FC<AdminResumeOrdersPageProps> = ({ onNavigate }) => {
  const [orders, setOrders] = useState<ResumeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Load Real Data from Supabase
  const fetchOrders = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await resumeReviewService.getAllOrders();
      if (error) {
        console.error('[AdminResumeOrders] Error fetching orders:', error);
      } else {
        setOrders(data || []);
      }
    } catch (err) {
      console.error('[AdminResumeOrders] Exception:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to normalize status representation
  // 'pending' or 'new' -> considered "New"
  const getNormalizedStatus = (status?: string): 'new' | 'in_progress' | 'completed' => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'in_progress' || s === 'inprogress' || s === 'progress') return 'in_progress';
    if (s === 'completed' || s === 'done' || s === 'reviewed') return 'completed';
    return 'new'; // 'pending' or default
  };

  // Status Update Actions
  const handleUpdateStatus = async (id: string, newStatus: 'in_progress' | 'completed') => {
    setActionLoadingId(id);
    try {
      console.log(`[AdminResumeOrdersPage] Updating order ${id} status to '${newStatus}' in resume_orders table...`);
      const { success, error } = await resumeReviewService.updateOrderStatus(id, newStatus);
      
      if (!success || error) {
        console.error('[AdminResumeOrdersPage] ❌ Failed to update order status in Supabase resume_orders table:', error);
        showToast(`Failed to update status: ${error?.message || error?.details || 'Database error'}`);
        return;
      }

      // Optimistic update of local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, status: newStatus, updated_at: new Date().toISOString() } : order
        )
      );

      showToast(newStatus === 'in_progress' ? 'Marked as In Progress' : 'Marked as Completed');

      // Refresh the table immediately from Supabase after a successful update
      console.log('[AdminResumeOrdersPage] 🔄 Refreshing orders table from Supabase immediately...');
      await fetchOrders(true);
    } catch (err: any) {
      console.error('[AdminResumeOrdersPage] ❌ Unexpected error updating order status:', err);
      showToast(err?.message || 'Error updating order status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Action
  const handleDeleteOrder = async (id: string, candidateName: string) => {
    if (!window.confirm(`Are you sure you want to delete the resume submission from "${candidateName}"?`)) {
      return;
    }

    setActionLoadingId(id);
    try {
      const { success, error } = await resumeReviewService.deleteOrder(id);
      if (!success || error) {
        showToast(`Delete failed: ${error?.message || 'Database error'}`);
        return;
      }

      setOrders((prev) => prev.filter((order) => order.id !== id));
      showToast('Resume order deleted successfully');
    } catch (err: any) {
      showToast(err?.message || 'Error deleting order');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Clean WhatsApp number link
  const getWhatsAppUrl = (phone: string, candidateName: string) => {
    // Strip non-digits
    let clean = phone.replace(/\D/g, '');
    // If Indian 10 digits without country code, prefix 91
    if (clean.length === 10) {
      clean = `91${clean}`;
    }
    const defaultText = encodeURIComponent(
      `Hello ${candidateName}, this is regarding your ATS Resume Review request on Mana Naukari.`
    );
    return `https://wa.me/${clean}?text=${defaultText}`;
  };

  // Clean / Direct Download or Open URL
  const handleOpenResume = (url: string, candidateName?: string) => {
    if (!url) return;

    if (url.startsWith('pending_storage://')) {
      alert('This order has a legacy pending_storage placeholder. Real uploads are saved with direct Supabase Storage URLs.');
      return;
    }

    try {
      // Create a temporary link to open or download the real Supabase storage URL
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const fileExt = url.split('.').pop()?.split('?')[0] || 'pdf';
      const cleanName = (candidateName || 'candidate_resume').replace(/\s+/g, '_');
      link.download = `${cleanName}_resume.${fileExt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Statistics calculation
  const stats = useMemo(() => {
    const total = orders.length;
    let newCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;

    orders.forEach((o) => {
      const norm = getNormalizedStatus(o.status);
      if (norm === 'new') newCount++;
      else if (norm === 'in_progress') inProgressCount++;
      else if (norm === 'completed') completedCount++;
    });

    return {
      total,
      newCount,
      inProgressCount,
      completedCount,
    };
  }, [orders]);

  // Search & Filter Pipeline
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status Filter
      if (statusFilter !== 'all') {
        const norm = getNormalizedStatus(order.status);
        if (norm !== statusFilter) return false;
      }

      // 2. Search Query (Name, Email, Phone)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (order.full_name || '').toLowerCase().includes(q);
        const matchesEmail = (order.email || '').toLowerCase().includes(q);
        const matchesPhone = (order.phone || '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesPhone;
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation & Admin Header */}
        <AdminHeader
          title="Resume Review Orders"
          subtitle="Manage candidate ATS resume audit submissions, review statuses, and WhatsApp feedback"
          onNavigate={onNavigate}
          showAddButton={false}
          showImportButton={false}
        />

        {/* Toast feedback */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs sm:text-sm font-semibold py-3 px-5 rounded-2xl shadow-xl border border-slate-700 animate-slideUp flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Dashboard Statistics Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Orders */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Total Orders</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-display text-slate-900 mt-2">
              {loading ? '...' : stats.total}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              All candidate submissions
            </div>
          </div>

          {/* Card 2: New Orders */}
          <div className="bg-white border border-blue-200/80 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-blue-600 font-bold uppercase tracking-wider">
              <span>New Orders</span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-display text-blue-700 mt-2">
              {loading ? '...' : stats.newCount}
            </div>
            <div className="text-[11px] text-blue-600/80 mt-1">
              Awaiting review
            </div>
          </div>

          {/* Card 3: In Progress Orders */}
          <div className="bg-white border border-amber-200/80 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-amber-700 font-bold uppercase tracking-wider">
              <span>In Progress</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <RefreshCw className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-display text-amber-700 mt-2">
              {loading ? '...' : stats.inProgressCount}
            </div>
            <div className="text-[11px] text-amber-600/80 mt-1">
              Being audited / discussed
            </div>
          </div>

          {/* Card 4: Completed Orders */}
          <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-emerald-700 font-bold uppercase tracking-wider">
              <span>Completed</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-display text-emerald-700 mt-2">
              {loading ? '...' : stats.completedCount}
            </div>
            <div className="text-[11px] text-emerald-600/80 mt-1">
              Feedback shared on WhatsApp
            </div>
          </div>

        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Box: Name, Email, Phone */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by candidate name, email, or WhatsApp number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Filter Pill Buttons: All, New, In Progress, Completed */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('new')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'new'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              New ({stats.newCount})
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'in_progress'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              In Progress ({stats.inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Completed ({stats.completedCount})
            </button>

            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing || loading}
              className="ml-2 p-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Resume Orders Table */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading real candidate submissions from Supabase...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center space-y-3 max-w-sm mx-auto px-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Resume Orders Found</h4>
              <p className="text-xs text-slate-500">
                {searchQuery || statusFilter !== 'all'
                  ? 'No submissions match your active filter or search keywords.'
                  : 'No candidate has submitted a resume review yet. Submissions from /resume-review will appear here live.'}
              </p>
              {(searchQuery || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-4 px-4 sm:px-6">Order ID &amp; Date</th>
                    <th className="py-4 px-4">Candidate Details</th>
                    <th className="py-4 px-4">WhatsApp Contact</th>
                    <th className="py-4 px-4">Resume File</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const normStatus = getNormalizedStatus(order.status);
                    const formattedDate = order.created_at
                      ? new Date(order.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Recently';

                    const formattedTime = order.created_at
                      ? new Date(order.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    const isActionLoading = actionLoadingId === order.id;

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        
                        {/* 1. Order ID & Created Date */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="font-mono font-bold text-slate-800 text-[11px]">
                            #{order.id != null ? String(order.id).substring(0, 8).toUpperCase() : 'NEW'}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                            {formattedDate} • {formattedTime}
                          </div>
                        </td>

                        {/* 2. Full Name & Email */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {order.full_name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            <a
                              href={`mailto:${order.email}`}
                              className="hover:text-blue-600 transition-colors"
                            >
                              {order.email}
                            </a>
                          </div>
                        </td>

                        {/* 3. WhatsApp Number & Quick Chat Action */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{order.phone}</span>
                            <a
                              href={getWhatsAppUrl(order.phone, order.full_name)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shrink-0"
                              title="Open chat on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                              <span>WhatsApp</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>
                          </div>
                        </td>

                        {/* 4. Resume Download Button */}
                        <td className="py-4 px-4">
                          {order.resume_file_url ? (
                            <button
                              onClick={() => handleOpenResume(order.resume_file_url, order.full_name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                              title="Download or view candidate resume"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Resume</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No file attached</span>
                          )}
                        </td>

                        {/* 5. Status Badge */}
                        <td className="py-4 px-4">
                          {normStatus === 'new' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                              New
                            </span>
                          )}
                          {normStatus === 'in_progress' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                              In Progress
                            </span>
                          )}
                          {normStatus === 'completed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Completed
                            </span>
                          )}
                        </td>

                        {/* 6. Status Actions: Mark In Progress / Completed */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {normStatus !== 'in_progress' && (
                              <button
                                disabled={isActionLoading}
                                onClick={() => order.id != null && handleUpdateStatus(String(order.id), 'in_progress')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
                                title="Mark order as In Progress"
                              >
                                Mark In Progress
                              </button>
                            )}

                            {normStatus !== 'completed' && (
                              <button
                                disabled={isActionLoading}
                                onClick={() => order.id != null && handleUpdateStatus(String(order.id), 'completed')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
                                title="Mark order as Completed"
                              >
                                Mark Completed
                              </button>
                            )}

                            <button
                              disabled={isActionLoading}
                              onClick={() => order.id != null && handleDeleteOrder(String(order.id), order.full_name)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete submission"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
