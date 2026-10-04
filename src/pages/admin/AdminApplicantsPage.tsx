import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { applicantsService } from '../../services/supabaseService';
import { Applicant, ApplicantStatus } from '../../types/database.types';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { 
  Users, Search, Filter, Download, ExternalLink, 
  FileText, Calendar, Clock, CheckCircle2, XCircle, 
  Clock3, AlertCircle, RefreshCw, X, MessageSquare, 
  Briefcase, Building2, MapPin, Mail, Phone, 
  BarChart3, TrendingUp, Layers, ChevronRight, FileSpreadsheet,
  Edit3, Save
} from 'lucide-react';

interface AdminApplicantsPageProps {
  onNavigate: (path: string) => void;
}

type DateFilter = 'all' | 'today' | 'week' | 'month';
type StatusFilter = 'all' | 'New' | 'Reviewed' | 'Shortlisted' | 'Rejected';

export const AdminApplicantsPage: React.FC<AdminApplicantsPageProps> = ({ onNavigate }) => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Selected Applicant for Drawer View
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);

  // Inline Note Editing in Drawer
  const [drawerNote, setDrawerNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Sync drawer note state when applicant changes
  useEffect(() => {
    if (selectedApplicant) {
      setDrawerNote(selectedApplicant.notes || '');
    }
  }, [selectedApplicant]);

  // Load Real Data from Supabase
  const fetchApplicants = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      // First attempt: Select applicants with joined candidate_profiles, visitor_profiles and jobs
      let { data, error } = await supabase
        .from('applicants')
        .select(`
          id,
          visitor_id,
          candidate_profile_id,
          job_id,
          status,
          notes,
          resume_url,
          created_at,
          candidate:candidate_profiles(id, name, email, mobile, resume_url, resume_file_name, email_verified, verified_at, created_at),
          visitor:visitor_profiles(id, name, email, phone, created_at),
          job:jobs(id, title, company, location, category, job_type, salary, experience, status)
        `)
        .order('created_at', { ascending: false });

      // Fallback 1: If candidate_profile_id / candidate_profiles relation not yet present
      if (error) {
        console.warn('[AdminApplicantsPage] Primary candidate_profiles query failed, running standard fallback:', error.message);
        const fallback1 = await supabase
          .from('applicants')
          .select(`
            id,
            visitor_id,
            job_id,
            status,
            notes,
            resume_url,
            created_at,
            visitor:visitor_profiles(id, name, email, phone, created_at),
            job:jobs(id, title, company, location, category, job_type, salary, experience, status)
          `)
          .order('created_at', { ascending: false });

        data = fallback1.data as any;
        error = fallback1.error;
      }

      // Fallback 2: If status/notes columns missing in legacy instance
      if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
        console.warn('[AdminApplicantsPage] Standard query failed due to missing columns, running legacy schema fallback:', error.message);
        const fallbackRes = await supabase
          .from('applicants')
          .select(`
            id,
            visitor_id,
            job_id,
            created_at,
            visitor:visitor_profiles(id, name, email, phone, created_at),
            job:jobs(id, title, company, location, category, job_type, salary, experience, status)
          `)
          .order('created_at', { ascending: false });

        data = fallbackRes.data as any;
        error = fallbackRes.error;
      }

      if (error) {
        console.error('[AdminApplicantsPage] Error loading applicants:', error);
      } else if (data) {
        // Normalize single vs array foreign key joins from PostgREST and unify candidate profile
        const normalized: Applicant[] = (data as any[]).map((row) => {
          const cand = Array.isArray(row.candidate) ? row.candidate[0] : row.candidate;
          const vis = Array.isArray(row.visitor) ? row.visitor[0] : row.visitor;

          // Consolidated unified profile
          const unifiedVisitor = {
            id: cand?.id || vis?.id || row.candidate_profile_id || row.visitor_id,
            name: cand?.name || vis?.name || 'Anonymous Candidate',
            email: cand?.email || vis?.email || 'N/A',
            phone: cand?.mobile || vis?.phone || 'N/A',
            resume_url: cand?.resume_url || row.resume_url || vis?.resume_url || null,
            created_at: cand?.created_at || vis?.created_at || row.created_at,
          };

          return {
            ...row,
            candidate_profile_id: row.candidate_profile_id || cand?.id || null,
            status: row.status || 'New',
            notes: row.notes || null,
            resume_url: cand?.resume_url || row.resume_url || vis?.resume_url || null,
            resume_file_name: cand?.resume_file_name || row.resume_file_name || null,
            visitor: unifiedVisitor,
            candidate: cand || null,
            job: Array.isArray(row.job) ? row.job[0] : row.job,
          };
        });
        setApplicants(normalized);
      } else {
        setApplicants([]);
      }
    } catch (err) {
      console.error('[AdminApplicantsPage] Exception loading applicants:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  // Candidate applications map to display profile history and count
  const candidateApplicationsMap = useMemo(() => {
    const map = new Map<string, Applicant[]>();
    applicants.forEach((app) => {
      const emailKey = (app.visitor?.email || app.candidate?.email || '').toLowerCase().trim();
      if (emailKey && emailKey !== 'n/a' && emailKey !== 'no email provided') {
        const list = map.get(emailKey) || [];
        list.push(app);
        map.set(emailKey, list);
      }
    });
    return map;
  }, [applicants]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to normalize status representation
  const getNormalizedStatus = (status?: string): 'New' | 'Reviewed' | 'Shortlisted' | 'Rejected' => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'reviewed') return 'Reviewed';
    if (s === 'shortlisted') return 'Shortlisted';
    if (s === 'rejected') return 'Rejected';
    return 'New'; // default if empty or 'new'
  };

  // Status Update Handler
  const handleUpdateStatus = async (id: string | number, newStatus: 'New' | 'Reviewed' | 'Shortlisted' | 'Rejected') => {
    setIsUpdatingStatus(true);
    try {
      const { success, error } = await applicantsService.updateStatus(id, newStatus);
      if (!success || error) {
        showToast(`Failed to update status: ${error?.message || 'Database error'}`);
        return;
      }

      setApplicants((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus, updated_at: new Date().toISOString() } : app))
      );
      if (selectedApplicant?.id === id) {
        setSelectedApplicant((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      showToast(`Applicant status changed to ${newStatus}`);
    } catch (err: any) {
      showToast(err?.message || 'Error updating status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Save Admin Note
  const handleSaveNote = async () => {
    if (!selectedApplicant) return;
    setIsSavingNote(true);
    try {
      const { success, error } = await applicantsService.updateNotes(selectedApplicant.id, drawerNote);
      if (!success || error) {
        showToast(`Failed to save notes: ${error?.message || 'Database error'}`);
        return;
      }

      setApplicants((prev) =>
        prev.map((app) => (app.id === selectedApplicant.id ? { ...app, notes: drawerNote } : app))
      );
      setSelectedApplicant((prev) => (prev ? { ...prev, notes: drawerNote } : null));
      showToast('Admin internal notes saved');
    } catch (err: any) {
      showToast(err?.message || 'Error saving notes');
    } finally {
      setIsSavingNote(false);
    }
  };

  // Open / Download Resume
  const handleOpenResume = (e: React.MouseEvent, url?: string | null, candidateName?: string) => {
    e.stopPropagation();
    if (!url) return;
    try {
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

  // WhatsApp quick contact
  const getWhatsAppUrl = (phone?: string, name?: string, jobTitle?: string) => {
    if (!phone) return '#';
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10) clean = `91${clean}`;
    const text = encodeURIComponent(
      `Hello ${name || 'Candidate'}, we noticed your application for ${jobTitle || 'the position'} on Mana Naukari. We would love to discuss the opportunity with you.`
    );
    return `https://wa.me/${clean}?text=${text}`;
  };

  // Export to CSV Functionality
  const handleExportCSV = () => {
    if (filteredApplicants.length === 0) {
      showToast('No applicants available to export');
      return;
    }

    const headers = [
      'Application ID',
      'Applicant Name',
      'Email',
      'Mobile Number',
      'Applied Job Title',
      'Company',
      'Job Location',
      'Job Category',
      'Status',
      'Applied Date',
      'Resume URL',
      'Internal Notes',
    ];

    const rows = filteredApplicants.map((app) => {
      const name = app.visitor?.name || 'Anonymous Candidate';
      const email = app.visitor?.email || '';
      const phone = app.visitor?.phone || '';
      const jobTitle = app.job?.title || 'Open Role';
      const company = app.job?.company || 'Verified Employer';
      const location = app.job?.location || 'Pan India';
      const category = app.job?.category || 'General';
      const status = getNormalizedStatus(app.status);
      const appliedDate = app.created_at ? new Date(app.created_at).toISOString() : '';
      const resumeUrl = app.resume_url || app.visitor?.resume_url || '';
      const notes = (app.notes || '').replace(/[\r\n]+/g, ' ');

      return [
        `"${app.id}"`,
        `"${name.replace(/"/g, '""')}"`,
        `"${email.replace(/"/g, '""')}"`,
        `"${phone.replace(/"/g, '""')}"`,
        `"${jobTitle.replace(/"/g, '""')}"`,
        `"${company.replace(/"/g, '""')}"`,
        `"${location.replace(/"/g, '""')}"`,
        `"${category.replace(/"/g, '""')}"`,
        `"${status}"`,
        `"${appliedDate}"`,
        `"${resumeUrl}"`,
        `"${notes.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mana_naukari_applicants_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${filteredApplicants.length} applicants to CSV`);
  };

  // Dashboard Statistics Cards
  const stats = useMemo(() => {
    const total = applicants.length;
    const now = new Date();
    
    // Start of Today (local)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    // Start of This Week (last 7 days)
    const weekStart = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    
    // Start of This Month (last 30 days)
    const monthStart = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    applicants.forEach((app) => {
      if (!app.created_at) return;
      const t = new Date(app.created_at).getTime();
      if (t >= todayStart) todayCount++;
      if (t >= weekStart) weekCount++;
      if (t >= monthStart) monthCount++;
    });

    return {
      total,
      today: todayCount,
      week: weekCount,
      month: monthCount,
    };
  }, [applicants]);

  // Analytics Computations
  const analyticsData = useMemo(() => {
    // 1. Most Applied Jobs
    const jobCountMap: Record<string, { title: string; company: string; count: number }> = {};
    // 2. Applications by Category
    const categoryCountMap: Record<string, number> = {};
    // 3. Applications per Day (last 7 active days)
    const dayCountMap: Record<string, number> = {};

    applicants.forEach((app) => {
      // Job counting
      const jobId = app.job_id || 'unknown';
      const jobTitle = app.job?.title || 'Open Position';
      const company = app.job?.company || 'Company';
      if (!jobCountMap[jobId]) {
        jobCountMap[jobId] = { title: jobTitle, company, count: 0 };
      }
      jobCountMap[jobId].count++;

      // Category counting
      const category = app.job?.category || 'General';
      categoryCountMap[category] = (categoryCountMap[category] || 0) + 1;

      // Day counting
      if (app.created_at) {
        const dateKey = new Date(app.created_at).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
        });
        dayCountMap[dateKey] = (dayCountMap[dateKey] || 0) + 1;
      }
    });

    const mostAppliedJobs = Object.values(jobCountMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const categoriesList = Object.entries(categoryCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const daysList = Object.entries(dayCountMap)
      .slice(0, 7)
      .map(([day, count]) => ({ day, count }));

    return {
      mostAppliedJobs,
      categoriesList,
      daysList,
    };
  }, [applicants]);

  // Search & Filter Pipeline
  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      // 1. Date Filter
      if (dateFilter !== 'all' && app.created_at) {
        const t = new Date(app.created_at).getTime();
        const now = Date.now();
        if (dateFilter === 'today') {
          const midnight = new Date().setHours(0, 0, 0, 0);
          if (t < midnight) return false;
        } else if (dateFilter === 'week') {
          if (now - t > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (dateFilter === 'month') {
          if (now - t > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        const norm = getNormalizedStatus(app.status);
        if (norm !== statusFilter) return false;
      }

      // 3. Search Query (Name, Email, Phone, Job Title)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (app.visitor?.name || '').toLowerCase();
        const email = (app.visitor?.email || '').toLowerCase();
        const phone = (app.visitor?.phone || '').toLowerCase();
        const jobTitle = (app.job?.title || '').toLowerCase();
        const company = (app.job?.company || '').toLowerCase();

        return (
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          jobTitle.includes(q) ||
          company.includes(q)
        );
      }

      return true;
    });
  }, [applicants, dateFilter, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Navigation & Admin Header */}
        <AdminHeader
          title="Applicants Management System"
          subtitle="Track real candidate applications, update candidate pipelines, review resumes, and manage hiring notes"
          onNavigate={onNavigate}
          showAddButton={false}
          showImportButton={false}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs sm:text-sm font-semibold py-3 px-5 rounded-2xl shadow-xl border border-slate-700 animate-slideUp flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. Dashboard Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Applications */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Total Applications</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-display text-slate-900 mt-2">
              {loading ? '...' : stats.total.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              All candidates recorded
            </div>
          </div>

          {/* Card 2: Applications Today */}
          <div className="bg-white border border-blue-200/80 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-blue-600 font-bold uppercase tracking-wider">
              <span>Today</span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-display text-blue-700 mt-2">
              {loading ? '...' : stats.today.toLocaleString()}
            </div>
            <div className="text-[11px] text-blue-600/80 mt-1">
              Applied since 00:00 today
            </div>
          </div>

          {/* Card 3: Applications This Week */}
          <div className="bg-white border border-indigo-200/80 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-indigo-700 font-bold uppercase tracking-wider">
              <span>This Week</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-display text-indigo-700 mt-2">
              {loading ? '...' : stats.week.toLocaleString()}
            </div>
            <div className="text-[11px] text-indigo-600/80 mt-1">
              Past 7 calendar days
            </div>
          </div>

          {/* Card 4: Applications This Month */}
          <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-emerald-700 font-bold uppercase tracking-wider">
              <span>This Month</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-display text-emerald-700 mt-2">
              {loading ? '...' : stats.month.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-600/80 mt-1">
              Past 30 calendar days
            </div>
          </div>

        </div>

        {/* 10. Analytics Highlights Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Most Applied Jobs */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>Most Applied Jobs</span>
            </div>
            {analyticsData.mostAppliedJobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No application data yet.</p>
            ) : (
              <div className="space-y-2">
                {analyticsData.mostAppliedJobs.map((job, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <div className="truncate pr-2">
                      <span className="font-semibold text-slate-800 block truncate">{job.title}</span>
                      <span className="text-[10px] text-slate-400">{job.company}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] shrink-0">
                      {job.count} apps
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Applications by Category */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Applications by Category</span>
            </div>
            {analyticsData.categoriesList.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No category data yet.</p>
            ) : (
              <div className="space-y-2">
                {analyticsData.categoriesList.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-700 truncate pr-2">{cat.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px] shrink-0">
                      {cat.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Applications Velocity / Recent Days */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Recent Application Flow</span>
            </div>
            {analyticsData.daysList.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No recent dates recorded.</p>
            ) : (
              <div className="space-y-2">
                {analyticsData.daysList.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-600 font-medium">{d.day}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full" 
                          style={{ width: `${Math.min(100, (d.count / (stats.total || 1)) * 100 * 3)}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-800 text-[11px]">{d.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* 3 & 4. Filter & Search Control Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Box: Name, Email, Phone, Job Title */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by candidate name, email, mobile, or job title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Time Filters & Status Filters & Export */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            
            {/* Date Filters: Today, Week, Month, All */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  dateFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDateFilter('today')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  dateFilter === 'today' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateFilter('week')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  dateFilter === 'week' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setDateFilter('month')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  dateFilter === 'month' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                This Month
              </button>
            </div>

            {/* Status Select Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="New">New</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Rejected">Rejected</option>
            </select>

            {/* 7. Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer shadow-2xs"
              title="Export displayed records to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchApplicants(true)}
              disabled={refreshing || loading}
              className="p-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh applications list"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

          </div>

        </div>

        {/* 2. Applicants Table */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading candidate applications from Supabase...</p>
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="py-20 text-center space-y-3 max-w-sm mx-auto px-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Applicants Found</h4>
              <p className="text-xs text-slate-500">
                {searchQuery || dateFilter !== 'all' || statusFilter !== 'all'
                  ? 'No applications match your search keywords or active filters.'
                  : 'No candidate has applied to jobs yet. When candidates apply on job details pages, records appear here live.'}
              </p>
              {(searchQuery || dateFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDateFilter('all');
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
                    <th className="py-4 px-4 sm:px-6">Applicant Name</th>
                    <th className="py-4 px-4">Email &amp; Mobile</th>
                    <th className="py-4 px-4">Applied Job Title</th>
                    <th className="py-4 px-4">Company &amp; Location</th>
                    <th className="py-4 px-4">Resume</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4">Applied Date</th>
                    <th className="py-4 px-4 sm:px-6 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApplicants.map((app) => {
                    const normStatus = getNormalizedStatus(app.status);
                    const resumeUrl = app.resume_url || app.visitor?.resume_url;
                    const formattedDate = app.created_at
                      ? new Date(app.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Recently';

                    return (
                      <tr 
                        key={app.id} 
                        onClick={() => setSelectedApplicant(app)}
                        className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                          selectedApplicant?.id === app.id ? 'bg-blue-50/60' : ''
                        }`}
                      >
                        
                        {/* 1. Applicant Name */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{app.visitor?.name || 'Anonymous Candidate'}</span>
                            {(() => {
                              const emailKey = (app.visitor?.email || '').toLowerCase().trim();
                              const historyCount = candidateApplicationsMap.get(emailKey)?.length || 1;
                              return historyCount > 1 ? (
                                <span 
                                  className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200"
                                  title={`Candidate profile has ${historyCount} total applications across postings`}
                                >
                                  📋 {historyCount} Applications
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                            <span>ID: #{app.id ? String(app.id).substring(0, 8).toUpperCase() : 'APP'}</span>
                            {app.candidate?.email_verified ? (
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold border border-emerald-200">✓ Verified Email</span>
                            ) : app.candidate_profile_id ? (
                              <span className="text-indigo-600 bg-indigo-50 px-1 rounded text-[9px]">Recognized Profile</span>
                            ) : null}
                          </div>
                        </td>

                        {/* 2. Email & Mobile Number */}
                        <td className="py-4 px-4">
                          <div className="text-slate-800 font-medium">
                            <a
                              href={`mailto:${app.visitor?.email || ''}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-blue-600 transition-colors"
                            >
                              {app.visitor?.email || 'No email provided'}
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                            <span>{app.visitor?.phone || 'No phone'}</span>
                            {app.visitor?.phone && (
                              <a
                                href={getWhatsAppUrl(app.visitor?.phone, app.visitor?.name, app.job?.title)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold"
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare className="w-2.5 h-2.5 fill-emerald-600" />
                                <span>WA</span>
                              </a>
                            )}
                          </div>
                        </td>

                        {/* 3. Applied Job Title */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                            <span>{app.job?.title || 'Open Role'}</span>
                            {app.job?.status === 'paused' && (
                              <span className="text-[10px] bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded font-bold border border-amber-300">
                                🟡 Paused
                              </span>
                            )}
                            {app.job?.status === 'expired' && (
                              <span className="text-[10px] bg-rose-50 text-rose-900 px-1.5 py-0.5 rounded font-bold border border-rose-300">
                                🔴 Expired
                              </span>
                            )}
                            {app.job?.status === 'deleted' && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold border border-slate-300">
                                🗑️ Deleted Job
                              </span>
                            )}
                            {app.job?.status === 'closed' && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold border border-slate-200">
                                Closed Job
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {app.job?.category || 'General'}
                          </div>
                        </td>

                        {/* 4. Company & Location */}
                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-800">
                            {app.job?.company || 'Verified Employer'}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{app.job?.location || 'Pan India'}</span>
                          </div>
                        </td>

                        {/* 5. Resume Access: View / Download */}
                        <td className="py-4 px-4">
                          {resumeUrl ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => handleOpenResume(e, resumeUrl, app.visitor?.name)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                                title="View or Download Candidate Resume"
                              >
                                <Download className="w-3 h-3" />
                                <span>Resume</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No file</span>
                          )}
                        </td>

                        {/* 6. Status Management */}
                        <td className="py-4 px-4">
                          <div onClick={(e) => e.stopPropagation()}>
                            <select
                              value={normStatus}
                              onChange={(e) => handleUpdateStatus(app.id, e.target.value as any)}
                              className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                                normStatus === 'New'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : normStatus === 'Reviewed'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : normStatus === 'Shortlisted'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              <option value="New">New</option>
                              <option value="Reviewed">Reviewed</option>
                              <option value="Shortlisted">Shortlisted</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </div>
                        </td>

                        {/* 7. Applied Date */}
                        <td className="py-4 px-4 whitespace-nowrap text-[11px] text-slate-500">
                          {formattedDate}
                        </td>

                        {/* Action / View Drawer Trigger */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <button
                            onClick={() => setSelectedApplicant(app)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View Applicant Details Drawer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
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

      {/* 6. Applicant Details Drawer Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-y-auto animate-slideLeft">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div>
                <div className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                  Applicant Profile
                </div>
                <h3 className="text-xl font-bold font-display text-slate-900 mt-0.5">
                  {selectedApplicant.visitor?.name || 'Anonymous Candidate'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1">
              
              {/* Status Update Quick Bar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Application Status
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['New', 'Reviewed', 'Shortlisted', 'Rejected'] as const).map((st) => {
                    const isSelected = getNormalizedStatus(selectedApplicant.status) === st;
                    return (
                      <button
                        key={st}
                        disabled={isUpdatingStatus}
                        onClick={() => handleUpdateStatus(selectedApplicant.id, st)}
                        className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? st === 'New'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : st === 'Reviewed'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                              : st === 'Shortlisted'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Candidate Contact Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Contact Information
                </h4>
                
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3 text-xs">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[10px] block">Email Address</span>
                      <a 
                        href={`mailto:${selectedApplicant.visitor?.email}`}
                        className="font-semibold text-slate-800 hover:text-blue-600"
                      >
                        {selectedApplicant.visitor?.email || 'Not available'}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-slate-400 text-[10px] block">Mobile Number</span>
                        <span className="font-semibold text-slate-800">
                          {selectedApplicant.visitor?.phone || 'Not available'}
                        </span>
                      </div>
                    </div>

                    {selectedApplicant.visitor?.phone && (
                      <a
                        href={getWhatsAppUrl(
                          selectedApplicant.visitor?.phone,
                          selectedApplicant.visitor?.name,
                          selectedApplicant.job?.title
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 fill-emerald-600" />
                        <span>WhatsApp Candidate</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Applied Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Requisition Applied For
                </h4>
                
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedApplicant.job?.title || 'Open Requisition'}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {selectedApplicant.job?.company || 'Verified Employer'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {selectedApplicant.job?.location || 'Pan India'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                      {selectedApplicant.job?.category || 'General'}
                    </span>
                    {selectedApplicant.job?.job_type && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                        {selectedApplicant.job?.job_type}
                      </span>
                    )}
                    {selectedApplicant.job?.experience && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                        {selectedApplicant.job?.experience}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Resume Access */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Resume Attachment
                </h4>
                
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  {(selectedApplicant.resume_url || selectedApplicant.visitor?.resume_url) ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-slate-800">Candidate_Resume.pdf</div>
                          <div className="text-[10px] text-slate-400">Uploaded via Supabase Storage</div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleOpenResume(
                          e,
                          selectedApplicant.resume_url || selectedApplicant.visitor?.resume_url,
                          selectedApplicant.visitor?.name
                        )}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Resume</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Candidate did not upload an independent resume file with this direct requisition.
                    </p>
                  )}
                </div>
              </div>

              {/* 7b. Candidate Application History (Profile Reference) */}
              {(() => {
                const emailKey = (selectedApplicant.visitor?.email || '').toLowerCase().trim();
                const historyList = candidateApplicationsMap.get(emailKey) || [selectedApplicant];
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                        Candidate Application History ({historyList.length})
                      </h4>
                      <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Profile: {selectedApplicant.candidate_profile_id ? `ID #${String(selectedApplicant.candidate_profile_id).substring(0, 8)}` : 'Recognized'}
                      </span>
                    </div>

                    <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                      {historyList.map((hApp) => (
                        <div 
                          key={hApp.id} 
                          className={`p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 text-xs ${
                            hApp.id === selectedApplicant.id 
                              ? 'bg-blue-50/80 border-blue-300' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {hApp.job?.title || 'Open Requisition'}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                              <span className="font-medium text-slate-700">{hApp.job?.company || 'Employer'}</span>
                              <span>&bull;</span>
                              <span>{hApp.created_at ? new Date(hApp.created_at).toLocaleDateString() : 'Recent'}</span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              hApp.status === 'Shortlisted' ? 'bg-emerald-100 text-emerald-800' :
                              hApp.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                              hApp.status === 'Reviewed' ? 'bg-purple-100 text-purple-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {hApp.status || 'New'}
                            </span>
                            {hApp.id === selectedApplicant.id && (
                              <span className="text-[10px] font-bold text-blue-600">Current</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 8. Admin Internal Notes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    Internal Recruiter Notes
                  </h4>
                  <span className="text-[10px] text-slate-400">Visible only to admins</span>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={4}
                    placeholder="Enter internal evaluation notes, interview schedules, candidate salary expectations, or screening remarks..."
                    value={drawerNote}
                    onChange={(e) => setDrawerNote(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      disabled={isSavingNote}
                      onClick={handleSaveNote}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5 text-blue-400" />
                      <span>{isSavingNote ? 'Saving Notes...' : 'Save Notes'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Application Timestamp */}
              <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Application ID: #{selectedApplicant.id}</span>
                <span>
                  {selectedApplicant.created_at
                    ? new Date(selectedApplicant.created_at).toLocaleString('en-IN')
                    : ''}
                </span>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
