import React from 'react';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { JobForm } from '../../components/admin/JobForm';
import { Sparkles, ArrowRight } from 'lucide-react';

interface AddJobPageProps {
  onNavigate: (path: string) => void;
}

export const AddJobPage: React.FC<AddJobPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <AdminHeader
        title="Post / Add New Job"
        subtitle="Create an official verified job opening stored directly in Supabase"
        onNavigate={onNavigate}
        showAddButton={false}
      />

      {/* AI Assistant Quick Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-display">
              Have an official employer URL?
            </h4>
            <p className="text-[11px] text-slate-600">
              Save time with our AI Job Import Assistant. It parses and auto-fills all parameters instantly.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/admin/import-job')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <span>Use AI Import</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Form Component in Create Mode */}
      <JobForm
        mode="create"
        onNavigate={onNavigate}
        onSaved={(_savedJob) => {
          setTimeout(() => {
            onNavigate('/admin/jobs');
          }, 1000);
        }}
      />
    </div>
  );
};
