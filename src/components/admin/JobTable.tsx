import React from 'react';
import { Job } from '../../types/database.types';
import { 
  Building2, MapPin, Calendar, Clock, 
  ExternalLink, Edit, Trash2, PowerOff, CheckCircle2, Share2, RotateCcw, Pause, Play 
} from 'lucide-react';

interface JobTableProps {
  jobs: Job[];
  loading: boolean;
  onEdit: (job: Job) => void;
  onToggleExpire: (job: Job) => void;
  onTogglePause?: (job: Job) => void;
  onDelete: (job: Job) => void;
  onRestore?: (job: Job) => void;
  onShare?: (job: Job) => void;
}

export const JobTable: React.FC<JobTableProps> = ({
  jobs,
  loading,
  onEdit,
  onToggleExpire,
  onTogglePause,
  onDelete,
  onRestore,
  onShare,
}) => {
  if (loading) {
    return (
      <div className="p-14 text-center bg-white border border-slate-200 rounded-3xl shadow-xs">
        <div className="w-9 h-9 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-800">Loading jobs from Supabase...</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Fetching latest database records</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-14 text-center bg-white border border-slate-200 rounded-3xl space-y-2 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-300">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No Jobs Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No records match your active query or no jobs have been added yet in the Supabase database.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto max-h-[70vh]">
        <table className="w-full text-left text-xs border-collapse">
          {/* Table Sticky Header */}
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Job Title &amp; Company</th>
              <th className="py-3.5 px-4">Location</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Experience</th>
              <th className="py-3.5 px-4">Job Type</th>
              <th className="py-3.5 px-4">Dates</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100">
            {jobs.map((job) => {
              const isActive = job.status === 'active';
              return (
                <tr key={job.id} className="hover:bg-blue-50/30 transition-colors duration-150">
                  
                  {/* Job Title & Company */}
                  <td className="py-3.5 px-4 min-w-[220px]">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0 border border-blue-100 text-xs">
                        {job.company.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 line-clamp-1 hover:text-blue-600">
                          {job.title}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-700">{job.company}</span>
                          {job.salary && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-emerald-700 font-medium">{job.salary}</span>
                            </>
                          )}
                          {(job.is_featured || job.featured) && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-amber-800 bg-amber-100/90 border border-amber-300/80 px-1.5 py-0.5 rounded text-[10px] font-bold">⭐ Featured</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{job.location}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {job.category}
                    </span>
                  </td>

                  {/* Experience */}
                  <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                    {job.experience || 'Fresher'}
                  </td>

                  {/* Job Type */}
                  <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                    <span className="font-semibold text-blue-700">
                      {job.job_type}
                    </span>
                  </td>

                  {/* Dates (Posted & Expiry) */}
                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Posted: {job.posted_date}</span>
                    </div>
                    {job.expiry_date && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Expires: {job.expiry_date}</span>
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : job.status === 'paused'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : job.status === 'expired'
                          ? 'bg-rose-50 text-rose-900 border-rose-300'
                          : job.status === 'deleted'
                          ? 'bg-slate-100 text-slate-700 border-slate-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      <span>
                        {isActive
                          ? '🟢'
                          : job.status === 'paused'
                          ? '🟡'
                          : job.status === 'expired'
                          ? '🔴'
                          : job.status === 'deleted'
                          ? '🗑️'
                          : '⚪'}
                      </span>
                      <span className="capitalize">{job.status}</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      
                      {/* Restore Job Action if status is deleted */}
                      {job.status === 'deleted' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onRestore?.(job)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                            title="Restore Job back to Active status (Preserves all applications & analytics)"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Restore</span>
                          </button>
                          <button
                            onClick={() => onEdit(job)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Job Requisition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Pause / Resume Button */}
                          {onTogglePause && (
                            <button
                              onClick={() => onTogglePause(job)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                job.status === 'paused'
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-amber-600 hover:bg-amber-50'
                              }`}
                              title={job.status === 'paused' ? 'Resume / Activate Job' : 'Pause Job (Temporarily Disable Applications)'}
                            >
                              {job.status === 'paused' ? (
                                <Play className="w-3.5 h-3.5" />
                              ) : (
                                <Pause className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Share Job Social Button */}
                          {onShare && (
                            <button
                              onClick={() => onShare(job)}
                              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Share to WhatsApp, Telegram, LinkedIn, X, Facebook"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* View External Link */}
                          <a
                            href={job.apply_link}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Open Official Apply Link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* Edit Button */}
                          <button
                            onClick={() => onEdit(job)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Job"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Soft Toggle / Expire Button */}
                          <button
                            onClick={() => onToggleExpire(job)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isActive
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={isActive ? 'Mark as Expired' : 'Activate Job'}
                          >
                            <PowerOff className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button (Soft-Delete) */}
                          <button
                            onClick={() => onDelete(job)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Soft Delete Job (Preserves Applications Permanently)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
