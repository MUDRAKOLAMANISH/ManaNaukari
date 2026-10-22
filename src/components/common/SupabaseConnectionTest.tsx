import React, { useState, useEffect } from 'react';
import { testSupabaseConnection, SupabaseDiagnosticResult } from '../../lib/supabase';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Database,
  ExternalLink,
  ShieldCheck,
  Zap,
  Layers,
  Activity,
  Key,
  Server
} from 'lucide-react';

export const SupabaseConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [diagnostics, setDiagnostics] = useState<SupabaseDiagnosticResult | null>(null);

  const runConnectionTest = async () => {
    setStatus('testing');
    try {
      const res = await testSupabaseConnection();
      setDiagnostics(res);
      if (res.success && res.publicReadAccess) {
        setStatus('connected');
      } else {
        setStatus('error');
      }
    } catch (err: any) {
      console.error('[SupabaseConnectionTest] Diagnostic exception:', err);
      setStatus('error');
      setDiagnostics({
        success: false,
        projectId: 'wasiyzakmkrmbxohzfwg',
        url: 'https://wasiyzakmkrmbxohzfwg.supabase.co',
        maskedKey: 'sb_publishable_I0QWuGZ7JNjTbG...',
        statusCode: 500,
        pingMs: 0,
        publicReadAccess: false,
        totalJobsCount: 0,
        sampleJobTitle: 'N/A',
        tablesVerified: [],
        error: err?.message || 'Network exception pinging Supabase endpoint.',
      });
    }
  };

  useEffect(() => {
    runConnectionTest();
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/90 shadow-lg font-sans animate-fadeIn">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80 shadow-2xs">
            <Database className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-display">
                Supabase Connectivity &amp; Diagnostic Utility
              </h3>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Project: wasiyzakmkrmbxohzfwg
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tests live database ping latency, anon key public read permissions, and record availability.
            </p>
          </div>
        </div>

        {/* Interactive Ping Button */}
        <button
          onClick={runConnectionTest}
          disabled={status === 'testing'}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
        >
          {status === 'testing' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Pinging Database...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ping Database Now</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Live Diagnostic Status Banner */}
      <div className="my-5">
        {status === 'testing' && (
          <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center gap-3 text-xs text-amber-800">
            <Loader2 className="w-5 h-5 text-amber-600 animate-spin shrink-0" />
            <div>
              <div className="font-bold text-amber-900">Executing Live Connection Diagnostic...</div>
              <div className="text-[11px] text-amber-700 mt-0.5">
                Sending HTTP ping request to <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">wasiyzakmkrmbxohzfwg.supabase.co</code>
              </div>
            </div>
          </div>
        )}

        {status === 'connected' && diagnostics && (
          <div className="p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-4 text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                  <span>Connected &amp; Public Read Access Verified</span>
                  <span className="text-[10px] bg-emerald-600 text-white font-mono px-2 py-0.5 rounded-md">
                    HTTP {diagnostics.statusCode} OK
                  </span>
                </div>
                <div className="text-emerald-800 mt-0.5 text-[11px]">
                  Anon key successfully queried the <code className="font-mono font-bold bg-emerald-100 px-1 rounded text-emerald-900">jobs</code> table and fetched public records.
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 text-right shrink-0">
              <div className="text-right">
                <div className="font-mono font-bold text-emerald-700 text-sm">
                  {diagnostics.pingMs} ms
                </div>
                <div className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">
                  Ping Latency
                </div>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && diagnostics && (
          <div className="p-4 bg-rose-50/90 border border-rose-200/90 rounded-2xl flex items-start gap-3 text-xs text-rose-900">
            <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-rose-950 text-sm">
                Supabase Connection Error (HTTP {diagnostics.statusCode || 500})
              </div>
              <p className="text-rose-800 leading-relaxed text-[11px]">
                {diagnostics.error || 'Unable to connect to the Supabase endpoint or public read access was restricted.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Detailed Diagnostics Grid */}
      {diagnostics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Metric 1: Ping Speed */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[10px]">Ping Latency</span>
              <Activity className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-base font-extrabold font-mono text-slate-900">
              {diagnostics.pingMs > 0 ? `${diagnostics.pingMs} ms` : 'Testing...'}
            </div>
            <div className="text-[10px] text-slate-500">Direct HTTP roundtrip time</div>
          </div>

          {/* Metric 2: Public Read Permission */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[10px]">Anon Read Access</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className={`text-sm font-extrabold ${diagnostics.publicReadAccess ? 'text-emerald-700' : 'text-rose-600'}`}>
              {diagnostics.publicReadAccess ? 'Granted (Verified)' : 'Restricted'}
            </div>
            <div className="text-[10px] text-slate-500">Public select query allowed</div>
          </div>

          {/* Metric 3: Total Jobs Count */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[10px]">Database Records</span>
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-base font-extrabold font-mono text-slate-900">
              {diagnostics.totalJobsCount} Jobs
            </div>
            <div className="text-[10px] text-slate-500">Active rows in jobs table</div>
          </div>

          {/* Metric 4: Verified Tables */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[10px]">Verified Tables</span>
              <Server className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <div className="text-xs font-bold text-slate-800 truncate">
              {diagnostics.tablesVerified.join(', ') || 'jobs'}
            </div>
            <div className="text-[10px] text-slate-500">PostgreSQL schema active</div>
          </div>

        </div>
      )}

      {/* 4. Configuration Technical Details */}
      {diagnostics && (
        <div className="mt-5 p-4 bg-slate-900 text-white rounded-2xl space-y-2 text-xs font-mono relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400 font-sans">
            <span className="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              Environment &amp; Project Metadata
            </span>
            <a
              href={`https://supabase.com/dashboard/project/${diagnostics.projectId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1 font-bold"
            >
              <span>Open Supabase Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div>
              <span className="text-slate-500">Project Reference ID: </span>
              <span className="text-amber-300 font-bold">{diagnostics.projectId}</span>
            </div>
            <div>
              <span className="text-slate-500">API Endpoint: </span>
              <span className="text-slate-200">{diagnostics.url}</span>
            </div>
            <div>
              <span className="text-slate-500">Anon Public Key: </span>
              <span className="text-slate-300">{diagnostics.maskedKey}</span>
            </div>
            <div>
              <span className="text-slate-500">Sample Row Title: </span>
              <span className="text-emerald-300 font-sans font-medium truncate inline-block max-w-[200px] align-bottom">
                {diagnostics.sampleJobTitle}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
