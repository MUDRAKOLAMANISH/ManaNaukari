import React from 'react';
import { AlertTriangle, Trash2, X, EyeOff } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  jobTitle: string;
  isDeleting: boolean;
  onSoftDelete: () => void;
  onHardDelete: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  jobTitle,
  isDeleting,
  onSoftDelete,
  onHardDelete,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="bg-white rounded-[28px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-black font-display text-slate-900">
            Job Removal &amp; Deletion Options
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1 leading-relaxed">
            Choose how you would like to handle the job listing: <strong className="text-slate-900">&quot;{jobTitle}&quot;</strong>
          </p>
        </div>

        <div className="space-y-4">
          {/* Action 1: Soft Delete */}
          <div className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-2xl space-y-2.5 transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center border border-blue-200">
                  <EyeOff className="w-4 h-4" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">1. Remove from Public Site</h4>
              </div>
              <button
                type="button"
                onClick={onSoftDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-[11px] font-extrabold text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-[0.98] border border-blue-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Hide from Public'}
              </button>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed font-semibold">
              This job will be hidden from users but retained in Admin history. All candidate applications, resume records, views, and analytics are preserved.
            </p>
          </div>

          {/* Action 2: Hard Delete */}
          <div className="p-4 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-2xl space-y-2.5 transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-rose-100 text-rose-700 rounded-lg flex items-center justify-center border border-rose-200">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-rose-950">2. Delete Permanently</h4>
              </div>
              <button
                type="button"
                onClick={onHardDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-[11px] font-extrabold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 active:scale-[0.98] rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
            <p className="text-[11px] sm:text-xs text-rose-700/80 leading-relaxed font-semibold">
              This action will permanently remove this job from the database. Applicant history will be preserved. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
