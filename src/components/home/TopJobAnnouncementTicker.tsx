import React, { useState, useEffect, useCallback } from 'react';
import { Job } from '../../types/database.types';
import { jobsService } from '../../services/supabaseService';
import { generateJobUrlPath } from '../../utils/jobUrlUtils';
import { supabase } from '../../lib/supabase';
import { 
  Flame, Sparkles, MapPin, Building2, 
  ArrowRight, ExternalLink, Briefcase, IndianRupee,
  Megaphone
} from 'lucide-react';

interface TopJobAnnouncementTickerProps {
  onNavigate: (path: string) => void;
}

export const TopJobAnnouncementTicker: React.FC<TopJobAnnouncementTickerProps> = ({ onNavigate }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnnouncementJob = useCallback(async () => {
    try {
      const res = await jobsService.getTopAnnouncementJob();
      if (res.job) {
        setJob(res.job);
        setIsFeatured(res.isFeatured);
      } else {
        setJob(null);
      }
    } catch (err) {
      console.warn('[TopJobAnnouncementTicker] Error fetching top job:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncementJob();

    // 6. Auto-Update: Subscribe to real-time changes in jobs table
    // If admin marks another job as featured or adds a job, immediately refresh
    const channel = supabase
      .channel('announcement_ticker_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => {
          console.log('[TopJobAnnouncementTicker] Realtime job update detected, refreshing ticker...');
          fetchAnnouncementJob();
        }
      )
      .subscribe();

    // Also poll every 30 seconds for background tab updates
    const interval = setInterval(fetchAnnouncementJob, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchAnnouncementJob]);

  // If no job exists or still loading without job, render nothing
  if (!job) {
    return null;
  }

  const handleTickerClick = () => {
    onNavigate(generateJobUrlPath(job));
  };

  const labelText = isFeatured ? '🔥 Featured Job' : '🆕 New Job';

  // Render a single job announcement item
  const renderJobItem = (keyPrefix: string) => (
    <div
      key={keyPrefix}
      className="inline-flex items-center gap-3 sm:gap-4 px-4 sm:px-6 cursor-pointer select-none"
    >
      {/* 4. Label: 🔥 Featured Job or 🆕 New Job */}
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-black tracking-wide shrink-0 shadow-2xs border ${
          isFeatured
            ? 'bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-red-500/25 text-amber-200 border-amber-400/40 shadow-amber-500/10'
            : 'bg-gradient-to-r from-emerald-500/25 via-teal-500/20 to-cyan-500/25 text-emerald-200 border-emerald-400/40 shadow-emerald-500/10'
        }`}
      >
        {isFeatured ? (
          <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span>{labelText}</span>
      </span>

      {/* Job Title */}
      <span className="font-extrabold text-white text-xs sm:text-sm tracking-tight hover:underline flex items-center gap-1.5">
        <span>{job.title}</span>
      </span>

      {/* Company Name */}
      <span className="inline-flex items-center gap-1 text-slate-300 text-xs sm:text-sm font-medium">
        <span className="text-slate-500">at</span>
        <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="font-bold text-slate-100">{job.company}</span>
      </span>

      {/* Location */}
      <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-normal">
        <span className="text-slate-600 hidden sm:inline">&bull;</span>
        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
        <span>{job.location}</span>
      </span>

      {/* Salary (if provided) */}
      {job.salary && (
        <span className="hidden md:inline-flex items-center gap-1 text-emerald-300 text-xs font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
          <span>{job.salary}</span>
        </span>
      )}

      {/* Direct Call to Action */}
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-300 hover:text-white bg-blue-600/30 hover:bg-blue-600/50 px-2.5 py-0.5 rounded-lg border border-blue-400/30 transition-colors ml-1">
        <span>View Details</span>
        <ArrowRight className="w-3 h-3" />
      </span>

      {/* Elegant Separator */}
      <span className="text-slate-700 text-sm font-light select-none mx-2">✦</span>
    </div>
  );

  return (
    <div
      role="region"
      aria-label="Top Job Announcement"
      className="relative w-full bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white border-b border-indigo-900/40 shadow-xs overflow-hidden z-20 group"
      onClick={handleTickerClick}
    >
      <div className="max-w-7xl mx-auto flex items-center">
        
        {/* Left Fixed Badge on medium+ screens for strong branding */}
        <div className="hidden sm:flex items-center gap-2 pl-4 pr-3 py-2.5 bg-slate-950/80 backdrop-blur-xs border-r border-slate-800/80 shrink-0 z-10 shadow-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-display">
            <Megaphone className="w-3.5 h-3.5 text-blue-400" />
            <span>Spotlight</span>
          </span>
        </div>

        {/* 5. Smooth Marquee Scrolling Track (Pauses on Hover) */}
        <div className="relative flex-1 overflow-hidden py-2 sm:py-2.5">
          {/* Subtle fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 to-transparent z-10 hidden sm:block" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-indigo-950 to-transparent z-10" />

          <div 
            className="flex items-center whitespace-nowrap animate-ticker group-hover:[animation-play-state:paused]"
            title="Click to view full job description and apply"
          >
            {/* Exactly ONE job displayed, repeated across the continuous loop track */}
            {renderJobItem('item-1')}
            {renderJobItem('item-2')}
            {renderJobItem('item-3')}
            {renderJobItem('item-4')}
          </div>
        </div>

        {/* Right CTA Action Button */}
        <div className="hidden md:flex items-center pr-4 pl-3 py-2 bg-slate-950/60 shrink-0 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTickerClick();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-2xs cursor-pointer"
          >
            <span>Apply Now</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

      </div>
    </div>
  );
};
