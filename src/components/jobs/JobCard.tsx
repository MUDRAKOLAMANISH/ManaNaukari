import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Job } from '../../types/database.types';
import { normalizeSkills } from '../../utils/skillUtils';
import { 
  Building2, MapPin, Briefcase, IndianRupee, Calendar, 
  ArrowUpRight, CheckCircle2, Bookmark, Copy, Check, Sparkles
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
      if (diffDays <= 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
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
    <motion.div 
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative rounded-2xl bg-white/95 backdrop-blur-md p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 shadow-xs hover:shadow-xl ${
        job.featured 
          ? 'border border-blue-400/80 ring-1 ring-blue-200/60 bg-gradient-to-br from-blue-50/30 via-white to-indigo-50/20' 
          : 'border border-slate-200/90 hover:border-indigo-300/80 hover:ring-1 hover:ring-indigo-100'
      }`}
    >
      <div>
        {/* Top Header Row: Company Avatar, Title, Bookmark */}
        <div className="flex items-start justify-between gap-3.5 sm:gap-4">
          <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0">
            
            {/* Company Logo or Fallback Monogram with Subtle Glow */}
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden text-slate-800 font-bold text-sm tracking-wider shadow-2xs group-hover:border-indigo-200 group-hover:shadow-xs transition-all">
              {job.company_logo && !imgError ? (
                <img
                  src={job.company_logo}
                  alt={`${job.company} logo`}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain p-1.5"
                />
              ) : (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-display font-extrabold">{initials}</span>
              )}
            </div>

            {/* Title & Company Information */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onViewDetails(job.id)}
                  className="text-left font-display font-bold text-base sm:text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 cursor-pointer focus:outline-none"
                >
                  {job.title}
                </button>
                {job.featured && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                    <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                    <span>Featured</span>
                  </span>
                )}
              </div>

              {/* Company & Verification Trust Elements */}
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 font-medium mt-1 flex-wrap">
                <span className="font-semibold text-slate-900">{job.company}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70" title="Verified Genuine Requisition">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Verified Requisition</span>
                </span>
                {job.source && (
                  <>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="text-xs text-slate-500 font-normal">{job.source}</span>
                  </>
                )}
              </div>

              {/* Core Badges Row: Location, Experience, Salary */}
              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-2 text-xs text-slate-600 mt-3">
                {/* Location Badge */}
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100/90 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{job.location}</span>
                </span>

                {/* Experience Badge */}
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100/90 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                  <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{job.experience || 'Fresher'}</span>
                </span>

                {/* Salary Badge */}
                {job.salary && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/80 shadow-2xs">
                    <IndianRupee className="w-3 h-3 shrink-0" />
                    <span>{job.salary.replace('₹', '')}</span>
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Bookmark / Save Job Button */}
          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer shrink-0 ${
              isSaved
                ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-slate-50'
            }`}
            title={isSaved ? 'Job Saved' : 'Save Job'}
            aria-label="Save Job"
          >
            <Bookmark className={`w-4 h-4 transition-transform ${isSaved ? 'fill-blue-600 scale-110' : ''}`} />
          </button>
        </div>

        {/* Skills Preview Tags */}
        {skills.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {skills.slice(0, 5).map((skill, index) => (
              <span
                key={index}
                className="text-[11px] font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/70 px-2.5 py-0.5 rounded-lg transition-colors"
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
      <div className="mt-5 pt-3.5 border-t border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Category & Job Type Inline Info */}
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <span className="font-semibold text-slate-800">{job.category}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 text-[11px]">
            {job.job_type}
          </span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formatPostedDate(job.posted_date)}
          </span>
        </div>

        {/* Actions: Copy Link & Primary View Details / Apply Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-blue-600 border border-slate-200 rounded-xl transition-all cursor-pointer btn-interactive"
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer btn-glow"
          >
            <span>View Details</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </motion.div>
  );
};
