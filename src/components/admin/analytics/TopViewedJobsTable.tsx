import React from 'react';
import { TopViewedJobMetric } from '../../../types/database.types';
import { Eye, ArrowUpRight, Award, Briefcase, TrendingUp } from 'lucide-react';

interface TopViewedJobsTableProps {
  jobs: TopViewedJobMetric[];
  onNavigate: (path: string) => void;
}

export const TopViewedJobsTable: React.FC<TopViewedJobsTableProps> = ({ jobs, onNavigate }) => {
  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <Eye className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">No Job View Records Yet</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          As candidates browse and open job listings, real-time views and conversion analytics will rank here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Top Viewed Jobs
            </h3>
            <p className="text-xs text-slate-500">Highest traffic job requisitions and candidate conversion</p>
          </div>
        </div>

        <div className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
          Live Rankings
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/75 border-b border-slate-200/70 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
            <tr>
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">Job Title & Company</th>
              <th className="py-3 px-4 text-center">Total Views</th>
              <th className="py-3 px-4 text-center">Applications</th>
              <th className="py-3 px-4 text-center">Conversion</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {jobs.map((job, index) => {
              const rank = index + 1;
              const rankBadge =
                rank === 1
                  ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
                  : rank === 2
                  ? 'bg-slate-200 text-slate-800 border-slate-300 font-bold'
                  : rank === 3
                  ? 'bg-orange-100 text-orange-800 border-orange-300 font-bold'
                  : 'bg-slate-100 text-slate-600';

              return (
                <tr key={job.job_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] border border-transparent ${rankBadge}`}>
                      {rank}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 line-clamp-1">
                      {job.title}
                    </div>
                    <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                      <Briefcase className="w-3 h-3 text-slate-400" />
                      <span>{job.company}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center gap-1 font-bold text-slate-900 bg-slate-100/80 px-2 py-0.5 rounded-md font-mono">
                      <Eye className="w-3 h-3 text-slate-500" />
                      <span>{job.views.toLocaleString()}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-mono">
                      {job.applications.toLocaleString()}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-flex items-center gap-0.5 font-bold px-2 py-0.5 rounded-md text-[11px] ${
                      job.conversionRate >= 10
                        ? 'bg-emerald-50 text-emerald-700'
                        : job.conversionRate > 0
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      <TrendingUp className="w-3 h-3" />
                      <span>{job.conversionRate}%</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onNavigate(`/jobs/${job.job_id}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>View</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
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
