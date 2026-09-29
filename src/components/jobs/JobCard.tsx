import React, { useState } from 'react';
import { Job } from '../../types/database.types';
import { normalizeSkills } from '../../utils/skillUtils';
import { 
  Building2, MapPin, Briefcase, IndianRupee, Calendar, 
  ArrowUpRight, CheckCircle2, Bookmark, Copy, Check, ShieldCheck
} from 'lucide-react';

interface JobCardProps {
  job: Job;
  onViewDetails: (jobId: string) => void;
  onCopyLink?: (job: Job) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onViewDetails, onCopyLink }) => {
  const [imgError, setImgError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate consistent initial monogram
  const initials = job.company ? job.company.substring(0, 2).toUpperCase() : 'MN';

  // Format posted date relative or clean date
  const formatPostedDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) return 'Posted today';
      if (diffDays === 2) return 'Posted yesterday';
      if (diffDays <= 7) return `Posted ${diffDays} days ago`;
      return `Posted on ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
    } catch {
      return `Posted ${dateStr}`;
    }
  };

  const skills = normalizeSkills(job.skills_required);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCopyLink) {
      onCopyLink(job);
    } else {
      const path = `/jobs/${job.id}`;
      const url = `${window.location.origin}${path}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div 
      className={`group relative bg-white rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        job.featured 
          ? 'border-blue-300 shadow-xs ring-1 ring-blue-100' 
          : 'border-slate-200/90 shadow-2xs hover:border-blue-200'
      } p-5 sm:p-6 flex flex-col justify-between`}
    >
      <div>
        {/* Top Header Row: Company Avatar, Title, Bookmark */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0">
            
            {/* Company Logo or Fallback Monogram */}
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden text-slate-700 font-bold text-sm tracking-wider shadow-2xs">
              {job.company_logo && !imgError ? (
                <img
                  src={job.company_logo}
                  alt={`${job.company} logo`}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain p-1.5"
                />
              ) : (
                <span className="text-blue-700 font-display font-bold">{initials}</span>
              )}
            </div>

            {/* Title & Company Information */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onViewDetails(job.id)}
                  className="text-left font-display font-bold text-base sm:text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 cursor-pointer focus:outline-none focus:underline"
                >
                  {job.title}
                </button>
                {job.featured && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80 uppercase tracking-wider">
                    Featured
                  </span>
                )}
              </div>

              {/* Company & Verification Trust Elements */}
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 font-medium mt-1 flex-wrap">
                <span className="font-semibold text-slate-900">{job.company}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80" title="Verified Genuine Requisition">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Verified Requisition</span>
                </span>
                {job.source && (
                  <>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="text-xs text-slate-500 font-normal">{job.source}</span>
                  </>
                )}
              </div>

              {/* Core Metadata Row: Location, Experience, Salary */}
              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-600 mt-2.5">
                <div className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{job.location}</span>
                </div>

                <span className="text-slate-300 hidden sm:inline" aria-hidden="true">·</span>

                <div className="flex items-center gap-1 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{job.experience || 'Fresher'}</span>
                </div>

                {job.salary && (
                  <>
                    <span className="text-slate-300 hidden sm:inline" aria-hidden="true">·</span>
                    <div className="flex items-center gap-0.5 text-emerald-700 font-bold bg-emerald-50/60 px-2 py-0.5 rounded-md border border-emerald-100">
                      <IndianRupee className="w-3.5 h-3.5 shrink-0" />
                      <span>{job.salary.replace('₹', '')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Bookmark Button */}
          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isSaved
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white border-slate-200/80 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
            title={isSaved ? 'Job Saved' : 'Save Job'}
            aria-label="Save Job"
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-600' : ''}`} />
          </button>
        </div>

        {/* Skills Preview */}
        {skills.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            {skills.slice(0, 5).map((skill, index) => (
              <span
                key={index}
                className="text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-0.5 rounded-lg transition-colors"
              >
                {skill}
              </span>
            ))}
            {skills.length > 5 && (
              <span className="text-[11px] text-slate-400 font-medium">
                +{skills.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer: Category, Type, Date, Action Buttons */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Category & Job Type Inline Info */}
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <span className="font-semibold text-slate-800">{job.category}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="font-semibold text-blue-700">{job.job_type}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formatPostedDate(job.posted_date)}
          </span>
        </div>

        {/* Actions: Copy Link & Primary View Details Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-blue-600 border border-slate-200/80 rounded-xl transition-colors cursor-pointer"
            title="Copy unique job link to clipboard"
            aria-label="Copy job link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={() => onViewDetails(job.id)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-all duration-150 cursor-pointer"
          >
            <span>View Details</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
