import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Database } from 'lucide-react';

export const SupabaseConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [testedTable, setTestedTable] = useState<string>('categories');

  const runConnectionTest = async () => {
    setStatus('testing');
    setErrorMessage(null);
    setResponseTime(null);

    const startTime = performance.now();

    try {
      // Test Supabase URL and Key presence
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          'Missing Supabase credentials in environment. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
        );
      }

      // Query categories table first
      let { error, data } = await supabase
        .from('categories')
        .select('id, category_name')
        .limit(1);

      // If categories has an issue or is not created yet, test jobs table
      if (error) {
        setTestedTable('jobs');
        const jobsResult = await supabase
          .from('jobs')
          .select('id, title')
          .limit(1);

        if (jobsResult.error) {
          throw new Error(
            `Connection test failed on both tables:\n• categories: ${error.message} (${error.code || 'NO_CODE'})\n• jobs: ${jobsResult.error.message} (${jobsResult.error.code || 'NO_CODE'})\nDetails: ${jobsResult.error.details || jobsResult.error.hint || 'Check table existence and RLS policies'}`
          );
        }
      } else {
        setTestedTable('categories');
      }

      const elapsed = Math.round(performance.now() - startTime);
      setResponseTime(elapsed);
      setStatus('connected');
    } catch (err: any) {
      console.error('Supabase Connection Test Failure:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Unknown network or authorization failure connecting to Supabase.');
    }
  };

  useEffect(() => {
    runConnectionTest();
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto my-6 p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        
        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-slate-50 border-slate-100">
            <Database className="w-4 h-4 text-slate-600" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Supabase Connection Status:
              </span>
              
              {status === 'testing' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Testing live query...
                </span>
              )}

              {status === 'connected' && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ✅ Supabase Connected
                </span>
              )}

              {status === 'error' && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  ❌ Supabase Not Connected
                </span>
              )}
            </div>

            {status === 'connected' && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Successfully queried table <code className="font-mono text-slate-700 font-semibold">{testedTable}</code> in {responseTime}ms.
              </p>
            )}
          </div>
        </div>

        {/* Retry Button */}
        <button
          onClick={runConnectionTest}
          disabled={status === 'testing'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${status === 'testing' ? 'animate-spin' : ''}`} />
          <span>Test Again</span>
        </button>
      </div>

      {/* Error Output Display */}
      {status === 'error' && errorMessage && (
        <div className="mt-3.5 p-3.5 bg-rose-50/90 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1 animate-fadeIn">
          <div className="font-bold flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Connection Error Details:</span>
          </div>
          <pre className="font-mono text-[11px] whitespace-pre-wrap bg-white/80 p-2.5 rounded-lg border border-rose-200/80 text-rose-900 mt-1 leading-relaxed overflow-x-auto">
            {errorMessage}
          </pre>
          <p className="text-[11px] text-rose-700 pt-1">
            Tip: Ensure your Supabase project URL and Anon key in <code className="font-mono bg-rose-100/70 px-1 py-0.5 rounded">.env</code> are active and that the schema in <code className="font-mono bg-rose-100/70 px-1 py-0.5 rounded">supabase_schema.sql</code> has been applied.
          </p>
        </div>
      )}
    </div>
  );
};
