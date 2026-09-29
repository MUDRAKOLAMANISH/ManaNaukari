import React from 'react';

export const JobCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          {/* Company Logo Skeleton */}
          <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />

          <div className="space-y-2.5 flex-1">
            {/* Title */}
            <div className="h-5 bg-slate-200 rounded-md w-3/4 max-w-sm" />
            
            {/* Company & Location */}
            <div className="flex items-center gap-3">
              <div className="h-4 bg-slate-200 rounded w-28" />
              <div className="h-4 bg-slate-200 rounded w-24" />
            </div>

            {/* Metadata line */}
            <div className="flex items-center gap-3 pt-1">
              <div className="h-3.5 bg-slate-200 rounded w-20" />
              <div className="h-3.5 bg-slate-200 rounded w-24" />
              <div className="h-3.5 bg-slate-200 rounded w-16" />
            </div>
          </div>
        </div>

        {/* Action Button Skeleton */}
        <div className="hidden sm:block w-28 h-9 bg-slate-200 rounded-xl" />
      </div>

      {/* Footer tags skeleton */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 bg-slate-200 rounded w-16" />
          <div className="h-4 bg-slate-200 rounded w-20" />
          <div className="h-4 bg-slate-200 rounded w-16" />
        </div>
        <div className="h-3.5 bg-slate-200 rounded w-20" />
      </div>
    </div>
  );
};
