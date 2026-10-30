import React, { useState, useEffect } from 'react';
import { supabaseUrl, supabaseAnonKey, supabase } from '../lib/supabase';
import { BrandLogo } from '../components/common/BrandLogo';
import { CheckCircle2, AlertCircle, Loader2, BellOff, ArrowLeft, ShieldCheck, Info } from 'lucide-react';

interface UnsubscribePageProps {
  onNavigate: (path: string) => void;
}

export const UnsubscribePage: React.FC<UnsubscribePageProps> = ({ onNavigate }) => {
  const [token, setToken] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Status states: 'idle' | 'success' | 'already_unsubscribed' | 'error'
  const [statusState, setStatusState] = useState<'idle' | 'success' | 'already_unsubscribed' | 'error'>('idle');
  const [displayMessage, setDisplayMessage] = useState<string>('');
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);

  useEffect(() => {
    // 1. Read token parameter from URL query string (/unsubscribe?token=UUID)
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');

    if (tokenParam) {
      setToken(tokenParam.trim());
    }
  }, []);

  const handleConfirmUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeToken = token.trim();

    if (!activeToken) {
      setStatusState('error');
      setDisplayMessage('No unsubscribe token found in link. Please click the full unsubscribe link from your daily job alert email.');
      return;
    }

    setIsSubmitting(true);
    setStatusState('idle');
    setDisplayMessage('');

    try {
      // 2. Direct HTTP POST request to Edge Function endpoint with publishable/anon key in apikey header
      const endpoint = `${supabaseUrl}/functions/v1/unsubscribe-job-alert`;
      let resData: any = null;
      let isSuccess = false;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ token: activeToken }),
        });

        resData = await response.json();
        if (response.ok && resData && resData.success) {
          isSuccess = true;
        }
      } catch (fetchErr) {
        console.warn('[UnsubscribePage] Direct fetch failed, attempting client.functions fallback:', fetchErr);
      }

      // Fallback: Invoke via Supabase Client SDK if direct fetch was not successful
      if (!isSuccess) {
        const { data: edgeSdkData, error: edgeSdkErr } = await supabase.functions.invoke('unsubscribe-job-alert', {
          body: { token: activeToken },
        });

        if (!edgeSdkErr && edgeSdkData && edgeSdkData.success) {
          resData = edgeSdkData;
          isSuccess = true;
        } else if (edgeSdkData) {
          resData = edgeSdkData;
        }
      }

      // Fallback 2: Token RPC call if function returned not found or network error
      if (!isSuccess && (!resData || resData.status === 'invalid_token')) {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('unsubscribe_job_alert_by_token', {
          target_token: activeToken,
        });

        if (!rpcErr && rpcData && rpcData.success) {
          setStatusState('success');
          setDisplayMessage('You have successfully unsubscribed from ManaCarrier job alerts.');
          return;
        }
      }

      // Process Response
      if (isSuccess && resData) {
        if (resData.email) {
          setConfirmedEmail(resData.email);
        }

        if (resData.status === 'already_unsubscribed') {
          setStatusState('already_unsubscribed');
          setDisplayMessage('You have already unsubscribed from ManaCarrier job alerts.');
        } else {
          setStatusState('success');
          setDisplayMessage('You have successfully unsubscribed from ManaCarrier job alerts.');
        }
        return;
      }

      // Handle Errors
      setStatusState('error');
      setDisplayMessage(
        resData?.message || 'Invalid, expired, or unknown unsubscribe token. Please make sure you clicked the complete link from your latest email.'
      );

    } catch (err: any) {
      console.error('[UnsubscribePage] Caught error during unsubscribe:', err);
      setStatusState('error');
      setDisplayMessage(
        err?.message || 'Failed to connect to unsubscribe service. Please check your link and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 font-sans animate-fadeIn">
      
      {/* Brand Header */}
      <div className="w-full max-w-lg text-center space-y-3 mb-6">
        <button
          onClick={() => onNavigate('/')}
          className="inline-block cursor-pointer focus:outline-none hover:opacity-90 transition-opacity"
        >
          <BrandLogo size="lg" showTagline={true} />
        </button>
      </div>

      {/* Main Unsubscribe Card */}
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/90 shadow-xl p-7 sm:p-9 space-y-6">
        
        {statusState === 'success' || statusState === 'already_unsubscribed' ? (
          /* SUCCESS STATE */
          <div className="text-center py-4 space-y-5 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-slate-900 font-display tracking-tight">
                {statusState === 'already_unsubscribed' ? 'Already Unsubscribed' : 'Unsubscribe Confirmed'}
              </h1>
              
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl text-xs sm:text-sm text-emerald-900 max-w-md mx-auto leading-relaxed">
                <p className="font-bold">
                  {displayMessage || 'You have successfully unsubscribed from ManaCarrier job alerts.'}
                </p>
                {confirmedEmail && (
                  <p className="text-emerald-700 text-xs mt-1 font-normal">
                    Target account: <span className="font-semibold">{confirmedEmail}</span>
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              You will no longer receive daily job opening updates. You can subscribe again anytime on the ManaCarrier homepage.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to ManaCarrier Homepage</span>
              </button>
            </div>
          </div>
        ) : (
          /* CONFIRMATION FORM STEP */
          <>
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200/80 shadow-2xs">
                <BellOff className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 font-display tracking-tight">
                Unsubscribe from Job Alerts
              </h1>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Confirm your request to stop receiving daily job digest notifications from ManaCarrier.
              </p>
            </div>

            {/* Error Message Alert */}
            {statusState === 'error' && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-start gap-3 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Unsubscribe Notice</p>
                  <p>{displayMessage}</p>
                </div>
              </div>
            )}

            {/* Token Info Box */}
            <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verification Token Status</span>
              </div>
              {token ? (
                <p className="text-[11px] text-slate-600 font-mono truncate bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                  Token: {token.slice(0, 10)}...{token.slice(-6)}
                </p>
              ) : (
                <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>No security token detected. Please open the link directly from your job alert email.</span>
                </p>
              )}
            </div>

            <form onSubmit={handleConfirmUnsubscribe} className="space-y-4">
              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="w-full py-3.5 px-4 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Unsubscribing...</span>
                  </>
                ) : (
                  <span>Confirm Unsubscribe</span>
                )}
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                Cancel and return to ManaCarrier
              </button>
            </div>
          </>
        )}

      </div>

    </div>
  );
};
