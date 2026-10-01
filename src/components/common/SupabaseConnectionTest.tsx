import React, { useState, useEffect } from 'react';
import { supabase, testSupabaseConnection, SUPABASE_PROD_URL } from '../../lib/supabase';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Database, ExternalLink } from 'lucide-react';

export const SupabaseConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [diagnostics, setDiagnostics] = useState<{
    url: string;
    maskedKey: string;
    sampleJobTitle?: string;
  } | null>(null);

  const runConnectionTest = async () => {
    setStatus('testing');
    setErrorMessage(null);
    setResponseTime(null);

    const startTime = performance.now();

    try {
      const res = await testSupabaseConnection();
      const elapsed = Math.round(performance.now() - startTime);
      setResponseTime(elapsed);

      setDiagnostics({
        url: res.url,
        maskedKey: res.maskedKey,
        sampleJobTitle: res.sampleJobTitle,
      });

      if (!res.success) {
        setStatus('error');
        setErrorMessage(res.error || 'Connection failed.');
      } else {
        setStatus('connected');
      }
    } catch (err: any) {
      console.error('[SupabaseConnectionTest] Exception:', err);
      setStatus('error');
      setErrorMessage(err?.message || 'Unknown network error connecting to Supabase.');
    }
  };

  useEffect(() => {
    runConnectionTest();
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto my-6 p-5 bg-white rounded-3xl border border-slate-200/90 shadow-sm animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border bg-slate-50 border-slate-200">
            <Database className="w-5 h-5 text-slate-700" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 font-display">
                Supabase PostgreSQL Connection
              </h4>
              {status === 'testing' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Testing
                </span>
              )}
              {status === 'connected' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Connected
                </span>
              )}
              {status === 'error' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <XCircle className="w-3 h-3 text-rose-600" />
                  Connection Error
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-0.5">
              Verified query: <code className="font-mono text-slate-700">supabase.from('jobs').select('*').limit(1)</code>
              {responseTime !== null && (
                <span className="ml-2 font-medium text-emerald-600 font-mono">
                  ({responseTime}ms)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Retry Button */}
        <button
          onClick={runConnectionTest}
          disabled={status === 'testing'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${status === 'testing' ? 'animate-spin' : ''}`} />
          <span>Re-test</span>
        </button>
      </div>

      {/* Diagnostics info */}
      {diagnostics && (
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400">Endpoint: </span>
            <span className="font-mono text-slate-700">{diagnostics.url}</span>
          </div>
          <div>
            <span className="text-slate-400">Key: </span>
            <span className="font-mono text-slate-700">{diagnostics.maskedKey}</span>
          </div>
          {diagnostics.sampleJobTitle && (
            <div className="sm:col-span-2">
              <span className="text-slate-400">Sample Row: </span>
              <span className="font-semibold text-slate-800">{diagnostics.sampleJobTitle}</span>
            </div>
          )}
        </div>
      )}

      {/* Error Details if connection failed */}
      {status === 'error' && errorMessage && (
        <div className="mt-3 p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
          <div className="font-semibold">Diagnostic Error:</div>
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-rose-900">
            {errorMessage}
          </pre>
        </div>
      )}
    </div>
  );
};
