import React from 'react';
import { Job } from '../../types/database.types';
import { 
  Building2, MapPin, Calendar, Clock, 
  ExternalLink, Edit, Trash2, PowerOff, CheckCircle2 
} from 'lucide-react';

interface JobTableProps {
  jobs: Job[];
  loading: boolean;
  onEdit: (job: Job) => void;
  onToggleExpire: (job: Job) => void;
  onDelete: (job: Job) => void;
}

export const JobTable: React.FC<JobTableProps> = ({
  jobs,
  loading,
  onEdit,
  onToggleExpire,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-700">Loading jobs from Supabase...</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Fetching latest database records</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-2">
        <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-sm font-bold text-slate-800">No Jobs Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No records match your active query or no jobs have been added yet in the Supabase database.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          {/* Table Header */}
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Job Title & Company</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Experience</th>
              <th className="py-3 px-4">Job Type</th>
              <th className="py-3 px-4">Dates</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100">
            {jobs.map((job) => {
              const isActive = job.status === 'active';
              return (
                <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                  
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
                          {job.featured && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded text-[10px] font-semibold">Featured</span>
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
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span className="capitalize">{job.status}</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      
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

                      {/* Delete Button */}
                      <button
                        onClick={() => onDelete(job)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Job Permanently"
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
    </div>
  );
};
