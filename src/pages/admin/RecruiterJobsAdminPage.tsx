import React, { useState, useEffect } from 'react';
import { 
  Building2, User, Mail, Phone, Globe, Linkedin, Briefcase, 
  MapPin, DollarSign, Layers, Tag, Link2, CheckCircle2, XCircle, 
  Clock, ShieldCheck, Search, Filter, RefreshCw, AlertCircle, 
  ExternalLink, Eye, Check, X, CreditCard, ChevronRight
} from 'lucide-react';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { recruiterService } from '../../services/recruiterService';
import { RecruiterJob, RecruiterJobStatus } from '../../types/database.types';

interface RecruiterJobsAdminPageProps {
  onNavigate: (path: string) => void;
}

export const RecruiterJobsAdminPage: React.FC<RecruiterJobsAdminPageProps> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<RecruiterJob | null>(null);

  // Approval / Rejection action state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingJobId, setProcessingJobId] = useState<string | number | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    const res = await recruiterService.getRecruiterJobs(statusFilter);
    setJobs(res.data);
    setCounts(res.counts);
    setLoading(false);
  };

  useEffect(() => {
    loadJobs();
  }, [statusFilter]);

  // Handle Approve
  const handleApprove = async (job: RecruiterJob) => {
    console.log('[Approve Click] 1. Click handler fired for job:', {
      id: job.id,
      title: job.title,
      company: job.company || job.company_name,
      currentStatus: job.status,
    });

    setIsProcessing(true);
    setProcessingJobId(job.id);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    // Optimistic UI update: immediately change status to 'Approved' in state
    setJobs((prevJobs) =>
      prevJobs.map((j) =>
        String(j.id) === String(job.id) ? { ...j, status: 'Approved' as RecruiterJobStatus } : j
      )
    );
    if (selectedJob && String(selectedJob.id) === String(job.id)) {
      setSelectedJob((prev) => (prev ? { ...prev, status: 'Approved' as RecruiterJobStatus } : null));
    }

    try {
      console.log('[Approve Workflow] 2. Calling recruiterService.approveJob for ID:', job.id);
      const res = await recruiterService.approveJob(job.id, 'Admin');
      console.log('[Approve Workflow] 3. recruiterService.approveJob returned:', res);

      if (res.success) {
        setActionSuccessMsg(`Job "${job.title}" by ${job.company || job.company_name} was successfully approved and published to the live jobs portal!`);
        console.log('[Approve Workflow] 4. Automatically reloading jobs from database...');
        await loadJobs();
      } else {
        const errorMsg = res.error?.message || 'Could not approve job requisition';
        console.error('[Approve Workflow] 4. Approval failed:', errorMsg);
        setActionErrorMsg(`Approval error: ${errorMsg}`);
        await loadJobs();
      }
    } catch (err: any) {
      console.error('[Approve Workflow] 4. Uncaught error:', err);
      setActionErrorMsg(`Approval error: ${err?.message || err}`);
      await loadJobs();
    } finally {
      setIsProcessing(false);
      setProcessingJobId(null);
    }
  };

  // Open Reject Modal
  const openRejectModal = (job: RecruiterJob) => {
    setSelectedJob(job);
    setRejectReason('Does not meet verification criteria or invalid official apply link.');
    setRejectModalOpen(true);
  };

  // Confirm Reject
  const handleConfirmReject = async () => {
    if (!selectedJob) return;

    console.log('[Reject Click] Confirm reject fired for job ID:', selectedJob.id);
    setIsProcessing(true);
    setProcessingJobId(selectedJob.id);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      const res = await recruiterService.rejectJob(selectedJob.id, rejectReason, 'Admin');
      console.log('[Reject Workflow] Result from rejectJob:', res);

      if (res.success) {
        setRejectModalOpen(false);
        setActionSuccessMsg(`Requisition #${selectedJob.id} has been rejected.`);
        setSelectedJob(null);
        await loadJobs();
      } else {
        setActionErrorMsg(`Rejection error: ${res.error?.message || 'Could not reject'}`);
      }
    } catch (err: any) {
      setActionErrorMsg(`Rejection error: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
      setProcessingJobId(null);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const company = (j.company || j.company_name || '').toLowerCase();
    return (
      j.title.toLowerCase().includes(term) ||
      company.includes(term) ||
      (j.recruiter?.name && j.recruiter.name.toLowerCase().includes(term)) ||
      (j.recruiter?.recruiter_name && j.recruiter.recruiter_name.toLowerCase().includes(term)) ||
      (j.recruiter?.official_email && j.recruiter.official_email.toLowerCase().includes(term)) ||
      (j.recruiter?.email && j.recruiter.email.toLowerCase().includes(term))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved & Live
          </span>
        );
      case 'Pending Review':
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Review
          </span>
        );
      case 'Pending Payment':
      case 'pending_payment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            Pending Payment
          </span>
        );
      case 'Rejected':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      
      {/* Header */}
      <AdminHeader
        title="Recruiter Submissions & Approvals"
        subtitle="Review recruiter company verification, authenticity credentials, and approve verified openings"
        onNavigate={onNavigate}
        showAddButton={false}
      />

      {/* Action Notification Message */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button 
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Error Message */}
      {actionErrorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{actionErrorMsg}</span>
          </div>
          <button 
            onClick={() => setActionErrorMsg(null)}
            className="text-rose-700 hover:text-rose-950 font-bold ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Status Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'all', label: 'All Postings', count: counts.all || 0 },
          { key: 'Pending Review', label: 'Pending Review', count: counts['Pending Review'] || 0, highlight: 'amber' },
          { key: 'Approved', label: 'Approved & Live', count: counts.Approved || 0, highlight: 'emerald' },
          { key: 'Pending Payment', label: 'Pending Payment', count: counts['Pending Payment'] || 0 },
          { key: 'Rejected', label: 'Rejected', count: counts.Rejected || 0 },
        ].map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <span className={`text-[11px] block uppercase font-bold tracking-wider ${
                isActive ? 'text-blue-100' : 'text-slate-400'
              }`}>
                {tab.label}
              </span>
              <span className="text-xl sm:text-2xl font-extrabold font-display mt-0.5 block">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by job title, hiring company, recruiter name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none"
          />
        </div>

        <button
          onClick={loadJobs}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Table & Details Split */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
            Loading submitted recruiter requisitions...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-2">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-sm text-slate-700">No submissions found</p>
            <p className="text-slate-400">No recruiter jobs match the current filter or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Role & Company</th>
                  <th className="py-3.5 px-4">Recruiter Profile</th>
                  <th className="py-3.5 px-4">Posting Tier</th>
                  <th className="py-3.5 px-4">Review Status</th>
                  <th className="py-3.5 px-4">Submitted</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Role & Company */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {job.title}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">{job.company}</span>
                        <span>•</span>
                        <span>{job.location}</span>
                      </div>
                      {job.salary && (
                        <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-block">
                          {job.salary}
                        </span>
                      )}
                    </td>

                    {/* Recruiter Profile */}
                    <td className="py-4 px-4">
                      {job.recruiter ? (
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <span>{job.recruiter.name}</span>
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                              Verified
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {job.recruiter.official_email}
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            {job.recruiter.mobile_number}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No recruiter record</span>
                      )}
                    </td>

                    {/* Posting Tier Verification */}
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          Free Launch
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {job.payment?.transaction_id || 'TIER_LAUNCH_FREE'}
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      {getStatusBadge(job.status)}
                      {job.status === 'Rejected' && job.rejection_reason && (
                        <p className="text-[11px] text-rose-600 mt-1 max-w-xs truncate" title={job.rejection_reason}>
                          Reason: {job.rejection_reason}
                        </p>
                      )}
                    </td>

                    {/* Submitted Date */}
                    <td className="py-4 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(job.created_at || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        
                        {/* Quick View Button */}
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Inspect complete requisition & recruiter credentials"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          <span>Inspect</span>
                        </button>

                        {/* Direct Approval Button for Pending Review */}
                        {(job.status === 'Pending Review' || job.status === 'pending_review') && (
                          <>
                            <button
                              onClick={() => handleApprove(job)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              title="Approve and publish directly to public portal"
                            >
                              {isProcessing && processingJobId === job.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>{isProcessing && processingJobId === job.id ? 'Approving...' : 'Approve'}</span>
                            </button>

                            <button
                              onClick={() => openRejectModal(job)}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Reject requisition with feedback reason"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Modal Drawer: Inspect Requisition & Recruiter Dossier */}
      {selectedJob && !rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-scaleUp">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-mono text-slate-400">
                  ID: {selectedJob.id}
                </span>
                <h3 className="text-xl font-bold font-display text-slate-900 mt-0.5">
                  {selectedJob.title}
                </h3>
                <p className="text-xs text-slate-500">{selectedJob.company} • {selectedJob.location}</p>
              </div>

              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                ✕
              </button>
            </div>

            {/* Recruiter Dossier */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-xs space-y-2">
              <h4 className="font-bold text-blue-900 flex items-center gap-1.5 font-display">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Verified Recruiter Dossier</span>
              </h4>

              {selectedJob.recruiter ? (
                <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Contact Person</span>
                    <span className="font-semibold">{selectedJob.recruiter.name || selectedJob.recruiter.recruiter_name}</span>
                    {selectedJob.recruiter.designation && (
                      <span className="text-slate-500 block text-[11px] font-normal">{selectedJob.recruiter.designation}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Official Work Email</span>
                    <span className="font-semibold">{selectedJob.recruiter.official_email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Mobile Phone</span>
                    <span className="font-semibold">{selectedJob.recruiter.mobile_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Company Website</span>
                    <a 
                      href={selectedJob.recruiter.company_website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>{selectedJob.recruiter.company_website}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-blue-100">
                    <span className="text-slate-400 block text-[10px]">Recruiter LinkedIn</span>
                    <a 
                      href={selectedJob.recruiter.linkedin_profile} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>{selectedJob.recruiter.linkedin_profile}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Admin Verification Controls for this Recruiter */}
                  <div className="col-span-2 pt-2 border-t border-blue-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Account Status</span>
                      <div className="font-bold text-slate-800 text-xs">
                        {selectedJob.recruiter.verification_status || 'Pending'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={async () => {
                          if (!selectedJob.recruiter) return;
                          await recruiterService.setRecruiterVerificationStatus(selectedJob.recruiter.id, 'Verified');
                          setActionSuccessMsg(`Recruiter ${selectedJob.recruiter.company_name} is now Verified!`);
                          loadJobs();
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                      >
                        Verify Recruiter
                      </button>
                      <button
                        onClick={async () => {
                          if (!selectedJob.recruiter) return;
                          await recruiterService.setRecruiterVerificationStatus(selectedJob.recruiter.id, 'Rejected', 'Verification criteria not met.');
                          setActionSuccessMsg(`Recruiter ${selectedJob.recruiter.company_name} verification status set to Rejected.`);
                          loadJobs();
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={async () => {
                          if (!selectedJob.recruiter) return;
                          await recruiterService.setRecruiterVerificationStatus(selectedJob.recruiter.id, 'Suspended', 'Account suspended by admin.');
                          setActionSuccessMsg(`Recruiter ${selectedJob.recruiter.company_name} account suspended.`);
                          loadJobs();
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200 cursor-pointer"
                      >
                        Suspend
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400">No recruiter profile attached.</p>
              )}
            </div>

            {/* Job Details Preview */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Category</span>
                  <span className="font-semibold text-slate-800">{selectedJob.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Job Type</span>
                  <span className="font-semibold text-slate-800">{selectedJob.job_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Experience</span>
                  <span className="font-semibold text-slate-800">{selectedJob.experience || 'Fresher'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Salary</span>
                  <span className="font-semibold text-slate-800">{selectedJob.salary || 'Undisclosed'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] mb-1">Official Application Link</span>
                <a 
                  href={selectedJob.apply_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1 text-xs break-all"
                >
                  <span>{selectedJob.apply_link}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] mb-1">Job Description</span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedJob.description}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Close
              </button>

              {(selectedJob.status === 'Pending Review' || selectedJob.status === 'pending_review') && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openRejectModal(selectedJob)}
                    disabled={isProcessing}
                    className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Reject Requisition
                  </button>

                  <button
                    onClick={() => handleApprove(selectedJob)}
                    disabled={isProcessing}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    {isProcessing && processingJobId === selectedJob.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>{isProcessing && processingJobId === selectedJob.id ? 'Approving...' : 'Approve & Publish to Live'}</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Reject Modal with Reason Input */}
      {rejectModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <h3 className="text-base font-bold font-display text-slate-900">
              Reject Requisition: {selectedJob.title}
            </h3>
            <p className="text-xs text-slate-500">
              State the reason for rejecting this job posting. This feedback will be logged for recruiter audit.
            </p>

            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Invalid company domain, third-party unverified consultancy, or suspicious apply link."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isProcessing || !rejectReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
