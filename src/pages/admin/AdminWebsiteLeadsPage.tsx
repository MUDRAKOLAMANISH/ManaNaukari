import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe, Search, Filter, Download, MessageSquare, CheckCircle2,
  Clock, AlertCircle, RefreshCw, Trash2, ExternalLink, Cpu, Eye,
  Phone, Mail, FileText, ChevronRight, Check, X, Code2, Sparkles,
  Layers, Edit3, Database
} from 'lucide-react';
import { AdminHeader } from '../../components/admin/AdminHeader';
import {
  websiteDevelopmentService,
  normalizePhoneNumber
} from '../../services/websiteDevelopmentService';
import {
  WebsiteDevelopmentLead,
  WebsiteLeadStatus
} from '../../types/database.types';

interface AdminWebsiteLeadsPageProps {
  onNavigate: (path: string) => void;
}

const SQL_MIGRATION_SCRIPT = `-- Run this in Supabase SQL Editor to provision the website_development_leads table:

CREATE TABLE IF NOT EXISTS public.website_development_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    whatsapp_number VARCHAR(50) NOT NULL,
    website_type VARCHAR(150) NOT NULL,
    website_idea TEXT NOT NULL,
    required_features TEXT,
    number_of_pages VARCHAR(100),
    budget_range VARCHAR(100),
    preferred_delivery_time VARCHAR(100),
    reference_website_url TEXT,
    additional_requirements TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.website_development_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert to website_development_leads" ON public.website_development_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin full access to website_development_leads" ON public.website_development_leads FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
`;

export const AdminWebsiteLeadsPage: React.FC<AdminWebsiteLeadsPageProps> = ({ onNavigate }) => {
  const [leads, setLeads] = useState<WebsiteDevelopmentLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Selected Lead Modal State
  const [selectedLead, setSelectedLead] = useState<WebsiteDevelopmentLead | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [currentStatus, setCurrentStatus] = useState<WebsiteLeadStatus>('new');
  const [updating, setUpdating] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLeads = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, isFallback } = await websiteDevelopmentService.getAllLeads();
      setLeads(data || []);
      setIsFallbackMode(Boolean(isFallback));
    } catch (err: any) {
      console.error('[AdminWebsiteLeads] Exception fetching leads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Calculate Dashboard Counts from Actual Submitted Data
  const stats = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((l) => l.status === 'new').length;
    const contacted = leads.filter((l) => l.status === 'contacted').length;
    const demoInProgress = leads.filter((l) => l.status === 'demo_in_progress').length;
    const demoShared = leads.filter((l) => l.status === 'demo_shared').length;
    const approved = leads.filter((l) => l.status === 'approved').length;
    const completed = leads.filter((l) => l.status === 'completed').length;
    const cancelled = leads.filter((l) => l.status === 'cancelled').length;

    return {
      total,
      newCount,
      contacted,
      demoInProgress,
      demoShared,
      approved,
      completed,
      cancelled,
    };
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Status Filter
      if (statusFilter !== 'all' && lead.status !== statusFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = lead.customer_name?.toLowerCase().includes(q);
        const emailMatch = lead.email?.toLowerCase().includes(q);
        const phoneMatch = lead.whatsapp_number?.toLowerCase().includes(q);
        const typeMatch = lead.website_type?.toLowerCase().includes(q);
        const ideaMatch = lead.website_idea?.toLowerCase().includes(q);
        return nameMatch || emailMatch || phoneMatch || typeMatch || ideaMatch;
      }

      return true;
    });
  }, [leads, statusFilter, searchQuery]);

  // Open Lead Detail Modal
  const handleOpenLeadModal = (lead: WebsiteDevelopmentLead) => {
    setSelectedLead(lead);
    setAdminNotes(lead.admin_notes || '');
    setCurrentStatus(lead.status);
  };

  // Quick Status Update
  const handleQuickStatusChange = async (lead: WebsiteDevelopmentLead, newStatus: WebsiteLeadStatus) => {
    try {
      await websiteDevelopmentService.updateLeadStatus(lead.id, newStatus);
      setLeads((prev) =>
        prev.map((item) => (item.id === lead.id ? { ...item, status: newStatus } : item))
      );
      showToast(`Status updated to ${getFormattedStatusLabel(newStatus)}`, 'success');
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  // Save Modal Changes
  const handleSaveModalChanges = async () => {
    if (!selectedLead) return;
    setUpdating(true);

    try {
      await websiteDevelopmentService.updateLeadStatus(
        selectedLead.id,
        currentStatus,
        adminNotes.trim() || null
      );

      setLeads((prev) =>
        prev.map((item) =>
          item.id === selectedLead.id
            ? { ...item, status: currentStatus, admin_notes: adminNotes.trim() || null }
            : item
        )
      );

      setSelectedLead(null);
      showToast('Lead details & notes updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to save changes', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Delete Lead
  const handleDeleteLead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this enquiry?')) return;

    try {
      await websiteDevelopmentService.deleteLead(id);
      setLeads((prev) => prev.filter((item) => item.id !== id));
      if (selectedLead?.id === id) setSelectedLead(null);
      showToast('Enquiry deleted', 'success');
    } catch (err) {
      showToast('Failed to delete enquiry', 'error');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const csvContent = websiteDevelopmentService.exportToCsv(filteredLeads);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `website_development_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredLeads.length} leads to CSV`, 'success');
  };

  const getFormattedStatusLabel = (s: string) => {
    switch (s) {
      case 'new': return 'New Enquiry';
      case 'contacted': return 'Contacted';
      case 'demo_in_progress': return 'Demo in Progress';
      case 'demo_shared': return 'Demo Shared';
      case 'approved': return 'Approved Project';
      case 'completed': return 'Completed Project';
      case 'cancelled': return 'Cancelled';
      default: return s;
    }
  };

  const getStatusBadgeStyle = (s: string) => {
    switch (s) {
      case 'new':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'contacted':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'demo_in_progress':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'demo_shared':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'approved':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* Toast Banner */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border animate-fadeIn ${
          toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Admin Header */}
      <AdminHeader
        title="Website Development Leads"
        subtitle="Manage and convert AI-powered personalized website enquiries from candidates and clients"
        onNavigate={onNavigate}
        showAddButton={false}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Database Migration Alert Banner */}
        {isFallbackMode && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-amber-900">Supabase Table Sync Status: </span>
                <span>Enquiries are being saved safely in high-reliability storage. Run the SQL snippet to sync with PostgreSQL!</span>
              </div>
            </div>
            <button
              onClick={() => setShowSqlModal(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer shrink-0"
            >
              Get SQL Script
            </button>
          </div>
        )}

        {/* 1. Dashboard Metrics Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Enquiries</div>
            <div className="text-2xl font-extrabold font-display text-slate-900">{stats.total}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-blue-200/80 bg-blue-50/20 shadow-2xs space-y-1">
            <div className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">New Enquiries</div>
            <div className="text-2xl font-extrabold font-display text-blue-700">{stats.newCount}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-purple-200/80 bg-purple-50/20 shadow-2xs space-y-1">
            <div className="text-[11px] font-medium text-purple-600 uppercase tracking-wider">Contacted</div>
            <div className="text-2xl font-extrabold font-display text-purple-700">{stats.contacted}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-amber-200/80 bg-amber-50/20 shadow-2xs space-y-1">
            <div className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">Demo in Progress</div>
            <div className="text-2xl font-extrabold font-display text-amber-700">{stats.demoInProgress}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-indigo-200/80 bg-indigo-50/20 shadow-2xs space-y-1">
            <div className="text-[11px] font-medium text-indigo-600 uppercase tracking-wider">Demos Shared</div>
            <div className="text-2xl font-extrabold font-display text-indigo-700">{stats.demoShared}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-teal-200/80 bg-teal-50/20 shadow-2xs space-y-1">
            <div className="text-[11px] font-medium text-teal-600 uppercase tracking-wider">Approved</div>
            <div className="text-2xl font-extrabold font-display text-teal-700">{stats.approved}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 bg-emerald-50/20 shadow-2xs space-y-1">
            <div className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Completed</div>
            <div className="text-2xl font-extrabold font-display text-emerald-700">{stats.completed}</div>
          </div>
        </div>

        {/* 2. Controls Toolbar: Search, Status Filter, Export, Refresh */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, phone, idea..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto max-w-full">
              {[
                { id: 'all', label: 'All' },
                { id: 'new', label: 'New' },
                { id: 'contacted', label: 'Contacted' },
                { id: 'demo_in_progress', label: 'Demo' },
                { id: 'demo_shared', label: 'Shared' },
                { id: 'approved', label: 'Approved' },
                { id: 'completed', label: 'Completed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer text-xs shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Export filtered enquiries to CSV file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={() => fetchLeads(true)}
              disabled={refreshing}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer shrink-0"
              title="Refresh database records"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3. Main Enquiries Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
              <p className="text-xs font-semibold">Loading Website Development Enquiries...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Cpu className="w-10 h-10 mx-auto text-slate-300" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">No Enquiries Found</p>
                <p className="text-xs text-slate-500">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try resetting your search filters.'
                    : 'When visitors fill out the AI Website form, their enquiries will appear here instantly.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Candidate / Client</th>
                    <th className="py-3.5 px-4">Website Category</th>
                    <th className="py-3.5 px-4">Pages &amp; Budget</th>
                    <th className="py-3.5 px-4">Enquiry Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => {
                    const cleanPhone = normalizePhoneNumber(lead.whatsapp_number);
                    const waMessage = encodeURIComponent(
                      `Hi ${lead.customer_name}! I saw your enquiry for an AI Website (${lead.website_type}). I'm the lead engineer at Mana Naukari. Let's discuss your design blueprint!`
                    );
                    const waUrl = `https://wa.me/${cleanPhone.replace(/[^0-9]/g, '')}?text=${waMessage}`;

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => handleOpenLeadModal(lead)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{lead.customer_name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{lead.email}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-600">{lead.whatsapp_number}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 line-clamp-1">
                            {lead.website_type}
                          </div>
                          <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {lead.website_idea}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{lead.budget_range || '₹499 (Starter)'}</div>
                          <div className="text-[10px] text-slate-500">{lead.number_of_pages || '1 Page'} • {lead.preferred_delivery_time || '24-48h'}</div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(lead.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.status}
                            onChange={(e) => handleQuickStatusChange(lead, e.target.value as WebsiteLeadStatus)}
                            className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] focus:outline-none cursor-pointer ${getStatusBadgeStyle(
                              lead.status
                            )}`}
                          >
                            <option value="new">New Enquiry</option>
                            <option value="contacted">Contacted</option>
                            <option value="demo_in_progress">Demo in Progress</option>
                            <option value="demo_shared">Demo Shared</option>
                            <option value="approved">Approved Project</option>
                            <option value="completed">Completed Project</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                              title="Chat on WhatsApp with pre-filled greeting"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>

                            <button
                              onClick={() => handleOpenLeadModal(lead)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="View Full Enquiry Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={(e) => handleDeleteLead(lead.id, e)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Enquiry"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* 4. Detailed Lead Information & Notes Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8 border border-slate-100 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 font-display">
                    {selectedLead.customer_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Submitted on {new Date(selectedLead.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details & Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Email Address</span>
                </div>
                <div className="text-slate-900 font-semibold">{selectedLead.email}</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp Number</span>
                </div>
                <div className="text-slate-900 font-semibold font-mono flex items-center gap-2">
                  <span>{selectedLead.whatsapp_number}</span>
                  <a
                    href={`https://wa.me/${normalizePhoneNumber(selectedLead.whatsapp_number).replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 hover:underline text-[11px] font-bold"
                  >
                    Chat Now
                  </a>
                </div>
              </div>
            </div>

            {/* Website Specification Requirements Grid */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500">
                Website Idea &amp; Specifications
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Website Type</span>
                  <div className="font-bold text-slate-900">{selectedLead.website_type}</div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Budget Range</span>
                  <div className="font-bold text-slate-900">{selectedLead.budget_range || '₹499 (Starter)'}</div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Pages</span>
                  <div className="font-bold text-slate-900">{selectedLead.number_of_pages || '1 Page'}</div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Delivery Timeline</span>
                  <div className="font-bold text-slate-900">{selectedLead.preferred_delivery_time || '24-48 Hours'}</div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-0.5 col-span-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Required Features</span>
                  <div className="font-medium text-slate-800">{selectedLead.required_features || 'None specified'}</div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="font-bold text-slate-700">Website Idea &amp; Description:</span>
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedLead.website_idea}
                </p>
              </div>

              {selectedLead.reference_website_url && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-blue-900 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-bold">Reference Website:</span>
                  <a
                    href={selectedLead.reference_website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-mono truncate"
                  >
                    {selectedLead.reference_website_url}
                  </a>
                </div>
              )}
            </div>

            {/* Status Workflow Selector & Admin Notes */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                  Update Lead Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { id: 'new', label: 'New' },
                    { id: 'contacted', label: 'Contacted' },
                    { id: 'demo_in_progress', label: 'Demo Building' },
                    { id: 'demo_shared', label: 'Demo Shared' },
                    { id: 'approved', label: 'Approved' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'cancelled', label: 'Cancelled' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setCurrentStatus(s.id as WebsiteLeadStatus)}
                      className={`p-2.5 rounded-xl font-bold border transition-all cursor-pointer ${
                        currentStatus === s.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  Admin Internal Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Record client requirements, Meet link, domain details, or custom notes..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveModalChanges}
                disabled={updating}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {updating ? 'Saving...' : 'Save Lead Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Script Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 font-display">
                Supabase PostgreSQL SQL Migration
              </h3>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Copy and execute this statement in your Supabase SQL Editor to create the <code className="bg-slate-100 px-1 rounded text-slate-800">website_development_leads</code> table:
            </p>

            <pre className="p-4 bg-slate-900 text-slate-200 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-60">
              {SQL_MIGRATION_SCRIPT}
            </pre>

            <div className="pt-2 text-right">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(SQL_MIGRATION_SCRIPT);
                  showToast('SQL copied to clipboard!', 'success');
                  setShowSqlModal(false);
                }}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Copy SQL Script
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
