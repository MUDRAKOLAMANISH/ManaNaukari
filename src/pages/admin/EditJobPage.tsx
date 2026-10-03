import React, { useState, useEffect } from 'react';
import { Job } from '../../types/database.types';
import { adminJobsService } from '../../services/adminJobsService';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { JobForm } from '../../components/admin/JobForm';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface EditJobPageProps {
  jobId: string;
  onNavigate: (path: string) => void;
}

export const EditJobPage: React.FC<EditJobPageProps> = ({ jobId, onNavigate }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      console.log('[EditJobPage] Fetching job for edit, ID:', jobId);
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await adminJobsService.getJobById(jobId);
      if (fetchErr || !data) {
        console.error('[EditJobPage] Error fetching job from Supabase:', fetchErr);
        setError(fetchErr?.message || 'Job not found in Supabase database.');
      } else {
        console.log('[EditJobPage] Loaded job successfully:', data);
        setJob(data);
      }
      setLoading(false);
    };

    if (jobId) {
      fetchJob();
    } else {
      console.warn('[EditJobPage] No jobId supplied');
      setError('No Job ID specified in URL route.');
      setLoading(false);
    }
  }, [jobId]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <AdminHeader
        title="Edit Job Requisition"
        subtitle={`Update details for requisition ID: ${jobId}`}
        onNavigate={onNavigate}
        showAddButton={false}
      />

      {loading && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-700">Loading job details from Supabase...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Unable to load job</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => onNavigate('/admin/jobs')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Jobs List</span>
          </button>
        </div>
      )}

      {!loading && job && (
        <JobForm
          initialData={job}
          mode="edit"
          onNavigate={onNavigate}
          onSaved={(saved) => {
            console.log('[EditJobPage] Job saved callback triggered:', saved);
            sessionStorage.setItem('admin_job_toast_message', `Job "${saved.title}" updated successfully!`);
            setTimeout(() => {
              onNavigate('/admin/jobs');
            }, 800);
          }}
        />
      )}
    </div>
  );
};
