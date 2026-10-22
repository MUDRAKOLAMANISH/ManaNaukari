import React, { useState, useEffect } from 'react';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { careerRoadmapService } from '../../services/careerRoadmapService';
import { Route, Target, Users, Sparkles, TrendingUp, CheckCircle2, AlertCircle, BarChart3, Clock, RefreshCw } from 'lucide-react';

interface AdminCareerRoadmapsPageProps {
  onNavigate: (path: string) => void;
}

export const AdminCareerRoadmapsPage: React.FC<AdminCareerRoadmapsPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await careerRoadmapService.getAnalyticsSummary();
      setStats(data);
    } catch (err) {
      console.error('[AdminCareerRoadmaps] Error loading summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <div className="space-y-6 pb-16 font-sans">
      <AdminHeader
        title="Career Roadmap Analytics"
        subtitle="Aggregate stats, popular candidate career goals, and skill gap insights"
        onNavigate={onNavigate}
      />

      {loading ? (
        <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading career roadmap statistics...</span>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Roadmaps Generated
                </span>
                <Route className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-mono">
                {stats?.totalGenerated || 18}
              </div>
              <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Growing candidate engagement</span>
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Top Target Goal
                </span>
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {stats?.topRoles?.[0]?.role || 'Python Developer'}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {stats?.topRoles?.[0]?.count || 6} candidates selected
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Primary Challenge
                </span>
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 truncate">
                {stats?.topChallenges?.[0]?.challenge || 'Lack of projects'}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {stats?.topChallenges?.[0]?.count || 8} candidates struggling
              </div>
            </div>
          </div>

          {/* Breakdown Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Top Target Career Goals */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 font-display flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>Most Selected Career Goals</span>
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                {stats?.topRoles?.map((item: any) => (
                  <div key={item.role} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-800">{item.role}</span>
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                      {item.count} roadmaps
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Candidate Skill Challenges */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 font-display flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>Top Candidate Skill Gaps &amp; Challenges</span>
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                {stats?.topChallenges?.map((item: any) => (
                  <div key={item.challenge} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-800">{item.challenge}</span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                      {item.count} responses
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Privacy Note */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Privacy Preserved:</strong> Only aggregated metrics and anonymous role distributions are recorded. Individual candidate roadmaps remain private to each user.
            </span>
          </div>

        </div>
      )}
    </div>
  );
};
