import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event: any) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  try {
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || 'https://wasiyzakmkrmbxohzfwg.supabase.co').trim();
    const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_I0QWuGZ7JNjTbG_aJm-Yeg_bCEKOxf1').trim();

    console.log('[Netlify Diagnostics] Connecting to Supabase at endpoint:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Fetch active jobs from Supabase
    const { data: activeJobs, error: fetchErr } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active');

    if (fetchErr) {
      console.error('[Netlify Diagnostics] Fetch query error:', fetchErr.message);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: fetchErr.message }),
      };
    }

    if (!activeJobs || activeJobs.length === 0) {
      console.log('[Netlify Diagnostics] No active jobs found.');
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          totalChecked: 0,
          flaggedCount: 0,
          unverifiedCount: 0,
          errorsCount: 0,
        }),
      };
    }

    console.log(`[Netlify Diagnostics] Found ${activeJobs.length} active jobs. Starting availability check.`);
    let flaggedCount = 0;
    let unverifiedCount = 0;
    let errorsCount = 0;

    const closedIndicators = [
      'job is no longer available',
      'this job has expired',
      'job posting has expired',
      'no longer accepting applications',
      'is closed to new applications',
      'application has closed',
      'applications are closed',
      'this position is closed',
      'no longer active',
      'has been filled',
      'job is closed',
      'this job is closed',
      'no longer open',
      'posting is no longer available',
      'has expired',
      'this job opening has been filled',
      'position is no longer open',
      'application closed',
      'vacancy is closed',
      'job expired',
      'no longer accepting responses',
      'closed for applications',
      'submissions are closed'
    ];

    for (const job of activeJobs) {
      const url = job.apply_link;
      const lastChecked = new Date().toISOString();
      let status = 'active';
      let reason = null;

      if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        status = 'needs_review';
        reason = 'Invalid or missing official apply link';
      } else {
        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(10000),
          });

          if (res.status === 404) {
            status = 'needs_review';
            reason = '404 - Page Not Found';
          } else if (res.status >= 500) {
            status = 'active';
            reason = 'Unable to verify (Server Error)';
          } else if (res.status >= 400 && res.status !== 403) {
            status = 'needs_review';
            reason = `HTTP ${res.status} - Access denied or page removed`;
          } else {
            const text = await res.text();
            const cleanText = text
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .toLowerCase();

            let foundIndicator = null;
            for (const indicator of closedIndicators) {
              if (cleanText.includes(indicator)) {
                foundIndicator = indicator;
                break;
              }
            }

            if (foundIndicator) {
              status = 'needs_review';
              reason = `Indicator found: "${foundIndicator}"`;
            }
          }
        } catch (err: any) {
          status = 'active';
          reason = 'Unable to verify';
        }
      }

      if (status === 'needs_review') {
        flaggedCount++;
      } else if (reason === 'Unable to verify') {
        unverifiedCount++;
      }

      // Update status in database with resilient schema fallback retry
      let { error: updateErr } = await supabase
        .from('jobs')
        .update({
          status,
          review_reason: reason,
          review_date: lastChecked,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      // Fallback 1: Schema mismatch fallback retry (if review columns are missing)
      if (updateErr && (updateErr.message?.includes('review_date') || updateErr.message?.includes('review_reason') || updateErr.message?.includes('schema cache'))) {
        console.warn(`[Netlify Diagnostics] Schema columns missing for job ID ${job.id}. Retrying with status only.`);
        let fallbackRes = await supabase
          .from('jobs')
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        
        // Fallback 1b: If status-only update fails due to 'needs_review' check constraint restrict
        if (fallbackRes.error && (fallbackRes.error.message?.includes('check constraint') || fallbackRes.error.message?.includes('jobs_status_check')) && status === 'needs_review') {
          console.warn(`[Netlify Diagnostics] 'needs_review' status restricted by constraint. Falling back to 'expired' status for ID ${job.id}`);
          fallbackRes = await supabase
            .from('jobs')
            .update({
              status: 'expired',
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
        }
        updateErr = fallbackRes.error;
      }

      // Fallback 2: If columns exist, but status 'needs_review' is restricted by constraint
      if (updateErr && (updateErr.message?.includes('check constraint') || updateErr.message?.includes('jobs_status_check')) && status === 'needs_review') {
        console.warn(`[Netlify Diagnostics] 'needs_review' restricted by constraint. Retrying with 'expired' status and metadata for ID ${job.id}`);
        const retryRes = await supabase
          .from('jobs')
          .update({
            status: 'expired',
            review_reason: reason,
            review_date: lastChecked,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        
        if (retryRes.error && (retryRes.error.message?.includes('review_date') || retryRes.error.message?.includes('review_reason') || retryRes.error.message?.includes('schema cache'))) {
          // Columns are also missing, so do status-only with 'expired'
          const finalRes = await supabase
            .from('jobs')
            .update({
              status: 'expired',
              updated_at: new Date().toISOString(),
              })
            .eq('id', job.id);
          updateErr = finalRes.error;
        } else {
          updateErr = retryRes.error;
        }
      }

      if (updateErr) {
        console.error(`[Netlify Diagnostics] Failed to update job ID ${job.id}:`, updateErr.message);
        errorsCount++;
      }
    }

    console.log(`[Netlify Diagnostics] Check completed. Checked: ${activeJobs.length}, Flagged: ${flaggedCount}, Unverified: ${unverifiedCount}, Issues: ${errorsCount}`);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        totalChecked: activeJobs.length,
        flaggedCount,
        unverifiedCount,
        errorsCount,
      }),
    };
  } catch (err: any) {
    console.error('[Netlify Diagnostics Exception] Unexpected error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: err.message || 'Job availability check failed.'
      }),
    };
  }
};
