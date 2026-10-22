import { createClient } from '@supabase/supabase-js';
import { verifyJobAvailability } from '../../src/services/jobVerificationEngine';

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
    let body: any = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      // Body may be empty for batch checks
    }

    const supabaseUrl = (process.env.VITE_SUPABASE_URL || 'https://wasiyzakmkrmbxohzfwg.supabase.co').trim();
    const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_I0QWuGZ7JNjTbG_aJm-Yeg_bCEKOxf1').trim();

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Single Job Verification Mode
    if (body.jobId) {
      console.log(`[Netlify Check Availability] Running single job audit for ID ${body.jobId}`);
      const { data: job, error: fetchErr } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', body.jobId)
        .single();

      if (fetchErr || !job) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: fetchErr?.message || 'Job not found' }),
        };
      }

      const result = await verifyJobAvailability({
        id: job.id,
        title: job.title,
        company: job.company,
        apply_link: job.apply_link,
        posted_date: job.posted_date,
        expiry_date: job.expiry_date,
        status: job.status,
      });

      // Update record in Supabase with resilient fallbacks
      const updatePayload: any = {
        status: result.dbStatus,
        review_reason: result.reason,
        review_date: result.lastChecked,
        verification_confidence: result.confidence,
        verification_evidence: result.evidence.evidenceSummary,
        final_url: result.evidence.finalUrl,
        updated_at: new Date().toISOString(),
      };

      let { error: updateErr } = await supabase
        .from('jobs')
        .update(updatePayload)
        .eq('id', job.id);

      if (updateErr && (
        updateErr.message?.includes('verification_confidence') ||
        updateErr.message?.includes('verification_evidence') ||
        updateErr.message?.includes('final_url') ||
        updateErr.message?.includes('schema cache')
      )) {
        const fallbackRes = await supabase
          .from('jobs')
          .update({
            status: result.dbStatus,
            review_reason: result.reason,
            review_date: result.lastChecked,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        updateErr = fallbackRes.error;
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          jobId: job.id,
          result,
        }),
      };
    }

    // Batch Active Jobs Verification Mode
    const { data: activeJobs, error: fetchErr } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active');

    if (fetchErr) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: fetchErr.message }),
      };
    }

    if (!activeJobs || activeJobs.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          totalChecked: 0,
          openCount: 0,
          closedCount: 0,
          needsReviewCount: 0,
          unverifiedCount: 0,
          errorsCount: 0,
        }),
      };
    }

    console.log(`[Netlify Check Availability] Starting audit of ${activeJobs.length} active jobs...`);
    let openCount = 0;
    let closedCount = 0;
    let needsReviewCount = 0;
    let unverifiedCount = 0;
    let errorsCount = 0;

    const batchSize = 5;
    for (let i = 0; i < activeJobs.length; i += batchSize) {
      const batch = activeJobs.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (job) => {
          try {
            const result = await verifyJobAvailability({
              id: job.id,
              title: job.title,
              company: job.company,
              apply_link: job.apply_link,
              posted_date: job.posted_date,
              expiry_date: job.expiry_date,
              status: job.status,
            });

            if (result.status === 'OPEN') openCount++;
            else if (result.status === 'CLOSED' || result.status === 'EXPIRED') closedCount++;
            else if (result.status === 'NEEDS_REVIEW') needsReviewCount++;
            else if (result.status === 'UNVERIFIED') unverifiedCount++;

            // Update database
            let { error: updateErr } = await supabase
              .from('jobs')
              .update({
                status: result.dbStatus,
                review_reason: result.reason,
                review_date: result.lastChecked,
                verification_confidence: result.confidence,
                verification_evidence: result.evidence.evidenceSummary,
                final_url: result.evidence.finalUrl,
                updated_at: new Date().toISOString(),
              })
              .eq('id', job.id);

            if (updateErr && (
              updateErr.message?.includes('verification_confidence') ||
              updateErr.message?.includes('verification_evidence') ||
              updateErr.message?.includes('final_url') ||
              updateErr.message?.includes('schema cache')
            )) {
              await supabase
                .from('jobs')
                .update({
                  status: result.dbStatus,
                  review_reason: result.reason,
                  review_date: result.lastChecked,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', job.id);
            }
          } catch {
            errorsCount++;
          }
        })
      );
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        totalChecked: activeJobs.length,
        openCount,
        closedCount,
        needsReviewCount: needsReviewCount,
        flaggedCount: closedCount + needsReviewCount,
        unverifiedCount,
        errorsCount,
      }),
    };
  } catch (err: any) {
    console.error('[Netlify Check Availability Exception]:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: err.message || 'Job availability check failed.',
      }),
    };
  }
};
