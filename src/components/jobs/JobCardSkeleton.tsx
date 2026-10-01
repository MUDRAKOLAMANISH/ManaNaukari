import React from 'react';

export const JobCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs relative overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          {/* Company Logo Skeleton with Shimmer */}
          <div className="w-12 h-12 rounded-2xl shimmer-bg shrink-0" />

          <div className="space-y-3 flex-1">
            {/* Title */}
            <div className="h-5 shimmer-bg rounded-lg w-3/4 max-w-sm" />
            
            {/* Company & Location */}
            <div className="flex items-center gap-3">
              <div className="h-4 shimmer-bg rounded-md w-28" />
              <div className="h-4 shimmer-bg rounded-md w-24" />
            </div>

            {/* Metadata line */}
            <div className="flex items-center gap-3 pt-1">
              <div className="h-3.5 shimmer-bg rounded-md w-20" />
              <div className="h-3.5 shimmer-bg rounded-md w-24" />
              <div className="h-3.5 shimmer-bg rounded-md w-16" />
            </div>
          </div>
        </div>

        {/* Action Button Skeleton */}
        <div className="hidden sm:block w-28 h-9 shimmer-bg rounded-xl" />
      </div>

      {/* Footer tags skeleton */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 shimmer-bg rounded-md w-16" />
          <div className="h-4 shimmer-bg rounded-md w-20" />
          <div className="h-4 shimmer-bg rounded-md w-16" />
        </div>
        <div className="h-3.5 shimmer-bg rounded-md w-20" />
      </div>
    </div>
  );
};
