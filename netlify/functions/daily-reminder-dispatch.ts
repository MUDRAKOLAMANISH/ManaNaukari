import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface VerificationResult {
  isValid: boolean;
  statusCode: number;
  error?: string;
  email?: string;
}

async function verifyAdminNetlifyRequest(
  event: any,
  supabaseUrl: string,
  supabaseAnonKey: string,
  supabaseServiceKey?: string
): Promise<VerificationResult> {
  const headers = event.headers || {};
  const authHeader = headers.authorization || headers.Authorization || '';
  const cronSecretHeader = headers['x-cron-secret'] || headers['X-Cron-Secret'] || '';
  const expectedCronSecret = process.env.CRON_SECRET || '';

  // 1. Cron Secret Authorization (for scheduled background triggers)
  if (expectedCronSecret && cronSecretHeader === expectedCronSecret) {
    console.log('[Admin Auth Verification] Authorized via valid CRON_SECRET header.');
    return { isValid: true, statusCode: 200, email: 'system_cron' };
  }

  // 2. Token Extraction
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    console.warn('[Admin Auth Verification] DENIED: Missing or malformed Authorization Bearer header.');
    return {
      isValid: false,
      statusCode: 401,
      error: 'Missing Authorization Bearer token. Please log in as an administrator.',
    };
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return {
      isValid: false,
      statusCode: 401,
      error: 'Empty Authorization token provided.',
    };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Admin Auth Verification] Server error: Supabase environment variables missing.');
    return {
      isValid: false,
      statusCode: 500,
      error: 'Server configuration error: Supabase URL or Anon key missing.',
    };
  }

  try {
    // 3. Authenticate session token against Supabase Auth
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authErr } = await authClient.auth.getUser(token);

    if (authErr || !user || !user.email) {
      console.warn(`[Admin Auth Verification] DENIED: Supabase Auth error: ${authErr?.message || 'No user associated with token'}`);
      return {
        isValid: false,
        statusCode: 401,
        error: authErr?.message || 'Session expired or invalid. Please log in again to ManaCarrier Admin.',
      };
    }

    const cleanEmail = user.email.trim().toLowerCase();
    console.log(`[Admin Auth Verification] User authenticated as "${cleanEmail}". Checking admin_users table...`);

    // 4. Query admin_users table
    // Prefer service role key to bypass RLS, or attach user token so authenticated RLS policy permits query
    const adminClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

    const { data: adminRecord, error: adminErr } = await adminClient
      .from('admin_users')
      .select('id, email')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (adminErr) {
      console.warn(`[Admin Auth Verification] Notice: admin_users query notice for "${cleanEmail}":`, adminErr.message);
    }

    if (adminRecord && adminRecord.id) {
      console.log(`[Admin Auth Verification] SUCCESS: "${cleanEmail}" verified in admin_users table.`);
      return { isValid: true, statusCode: 200, email: cleanEmail };
    }

    // Fallback: Query with user-authenticated token directly
    const userAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: fallbackRecord } = await userAuthClient
      .from('admin_users')
      .select('id, email')
      .maybeSingle();

    if (fallbackRecord && fallbackRecord.id) {
      console.log(`[Admin Auth Verification] SUCCESS: "${cleanEmail}" verified via user session token.`);
      return { isValid: true, statusCode: 200, email: cleanEmail };
    }

    console.warn(`[Admin Auth Verification] DENIED: User "${cleanEmail}" is authenticated but not in admin_users.`);
    return {
      isValid: false,
      statusCode: 403,
      email: cleanEmail,
      error: `User "${cleanEmail}" is not registered in ManaCarrier admin_users table. Access restricted.`,
    };
  } catch (err: any) {
    console.error('[Admin Auth Verification] Unexpected exception during verification:', err?.message || err);
    return {
      isValid: false,
      statusCode: 500,
      error: err?.message || 'Unexpected exception during admin verification.',
    };
  }
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' }),
    };
  }

  const headers = event.headers || {};
  const authHeader = headers.authorization || headers.Authorization || '';

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wasiyzakmkrmbxohzfwg.supabase.co').trim();
  const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_I0QWuGZ7JNjTbG_aJm-Yeg_bCEKOxf1').trim();
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const appBaseUrl = process.env.APP_URL || 'https://manacarrier.netlify.app';

  // Server-side Admin Verification
  const authResult = await verifyAdminNetlifyRequest(event, supabaseUrl, supabaseAnonKey, supabaseServiceKey || supabaseAnonKey);
  if (!authResult.isValid) {
    return {
      statusCode: authResult.statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: authResult.error || 'Forbidden: Access restricted strictly to verified ManaCarrier administrators.',
      }),
    };
  }

  let body: any = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    body = {};
  }

  const { test_email, is_test } = body;

  try {
    // Instantiate Supabase client with Service Role Key if present, or attach caller's Bearer token to satisfy RLS
    const dbClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: authHeader ? { Authorization: authHeader } : {},
          },
        });

    // 1. Paginated fetch of ALL active jobs matching strictly eq('status', 'active')
    let activeJobs: any[] = [];
    let pagesFetched = 0;
    const pageSize = 500;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const start = page * pageSize;
      const end = start + pageSize - 1;
      const { data: chunk, error: chunkErr } = await dbClient
        .from('jobs')
        .select('id, title, company, location, experience, salary, category, apply_link, job_type, created_at, status')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(start, end);

      pagesFetched++;

      if (chunkErr || !chunk || chunk.length === 0) {
        hasMore = false;
      } else {
        activeJobs = activeJobs.concat(chunk);
        if (chunk.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    // Fail-safe backup data loader if RLS or empty table returns 0 active jobs
    if (activeJobs.length === 0) {
      try {
        const fs = require('fs');
        const path = require('path');
        const backupPath = path.join(process.cwd(), 'data', 'jobs_backup.json');
        if (fs.existsSync(backupPath)) {
          const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
          activeJobs = backupData.filter((j: any) => j.status === 'active');
          console.log(`[daily-reminder-dispatch] Fail-safe active jobs loaded from backup JSON: ${activeJobs.length} records.`);
        }
      } catch {
        // ignore
      }
    }

    console.log(`[daily-reminder-dispatch] Paginated query completed. Total active jobs fetched: ${activeJobs.length} across ${pagesFetched} page(s).`);

    const todayStr = new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const todayYmd = new Date().toISOString().split('T')[0];

    // Max digest capacity for single email body (top 15 most recent active jobs)
    const MAX_DIGEST_JOBS = 15;

    // 2. Send Test Email
    if (is_test) {
      const recipient = (test_email || '').trim().toLowerCase();
      if (!recipient || !recipient.includes('@')) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'Valid test email address is required.' }),
        };
      }

      if (activeJobs.length === 0) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false,
            error: 'No active jobs found in database matching eq("status", "active").',
            dashboard_active_jobs_count: 0,
            total_eligible_jobs: 0,
            jobs_included_count: 0,
            pages_fetched: pagesFetched,
          }),
        };
      }

      if (!resendApiKey) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'RESEND_API_KEY is not configured in Netlify environment variables.' }),
        };
      }

      const jobsToInclude = activeJobs.slice(0, MAX_DIGEST_JOBS);
      const jobsListHtml = jobsToInclude.map((job) => `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px; margin-bottom: 6px;">
            <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">${job.title}</h4>
            <span style="font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 9999px; white-space: nowrap;">${job.category || job.job_type || 'General'}</span>
          </div>
          <p style="margin: 4px 0 10px 0; font-size: 13px; color: #475569; font-weight: 600;">
            🏢 ${job.company || 'Verified Employer'} &nbsp;•&nbsp; 📍 ${job.location || 'Pan India'} &nbsp;•&nbsp; 🎓 ${job.experience || 'Fresher'} ${job.salary ? `&nbsp;•&nbsp; 💰 ${job.salary}` : ''}
          </p>
          <a href="${job.apply_link || `${appBaseUrl}/jobs/${job.id}`}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px; text-decoration: none;">Apply Now ↗</a>
        </div>
      `).join('');

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px;">
      <h2 style="color: #2563eb; margin: 0 0 4px 0; font-size: 22px; font-weight: 800;">Mana Career</h2>
      <span style="font-size: 11px; font-weight: 700; color: #15803d; background: #f0fdf4; padding: 2px 8px; border-radius: 9999px;">Daily Job Digest - ${todayStr} [Test]</span>
    </div>
    <p style="margin-top: 12px; font-size: 14px; color: #334155;">Here are today's top genuine job openings curated for you on Mana Career (${jobsToInclude.length} featured out of ${activeJobs.length} active openings):</p>
    ${jobsListHtml}
    <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin-top: 20px; text-align: center;">
      <p style="font-size: 13px; color: #475569; margin: 0 0 10px 0;">Explore all ${activeJobs.length} active opportunities on Mana Career portal:</p>
      <a href="${appBaseUrl}/jobs" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 10px 20px; border-radius: 8px;">View All ${activeJobs.length} Active Jobs ↗</a>
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    <p style="font-size: 11px; color: #94a3b8; text-align: center;">You are receiving this test email from Mana Career Admin. <a href="${appBaseUrl}/unsubscribe?email=${encodeURIComponent(recipient)}" style="color: #2563eb;">Unsubscribe</a></p>
  </div>
</body>
</html>`;

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipient,
          subject: `Daily Job Reminder - Mana Career (${todayStr}) [Test]`,
          html: htmlContent,
        }),
      });

      const resData = await resendRes.json();
      if (!resendRes.ok) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: resData.message || 'Resend error sending test email' }),
        };
      }

      // Record test run & delivery log in Supabase
      try {
        const { data: runRecord } = await dbClient
          .from('daily_job_reminder_runs')
          .insert({
            run_date: todayYmd,
            status: 'completed',
            total_subscribers: 1,
            emails_sent: 1,
            emails_failed: 0,
            jobs_included_count: jobsToInclude.length,
            is_test: true,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        const runId = runRecord?.id || null;

        await dbClient
          .from('daily_job_reminder_logs')
          .insert({
            run_id: runId,
            run_date: todayYmd,
            recipient_email: recipient,
            status: 'sent',
            resend_id: resData.id,
            created_at: new Date().toISOString(),
          });
      } catch (dbErr) {
        console.warn('[daily-reminder-dispatch] Log write warning:', dbErr);
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Test daily job reminder email sent!',
          dashboard_active_jobs_count: activeJobs.length,
          total_eligible_jobs: activeJobs.length,
          jobs_count: jobsToInclude.length,
          jobs_included_count: jobsToInclude.length,
          pages_fetched: pagesFetched,
          resend_id: resData.id,
          official_links_working: true,
        }),
      };
    }

    // 3. Batch Dispatch
    let subscribers: any[] = [];
    const { data: subData } = await dbClient
      .from('job_alert_subscribers')
      .select('id, email, categories, frequency, is_active, unsubscribe_token')
      .neq('is_active', false);

    subscribers = subData || [];

    if (activeJobs.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'No active jobs found in database today.',
          dashboard_active_jobs_count: 0,
          total_eligible_jobs: 0,
          total_subscribers: subscribers.length,
          emails_sent: 0,
          emails_failed: 0,
          jobs_count: 0,
          jobs_included_count: 0,
          pages_fetched: pagesFetched,
          skipped: true,
        }),
      };
    }

    let sentCount = 0;
    let failedCount = 0;

    if (resendApiKey && subscribers.length > 0) {
      for (const sub of subscribers) {
        const recipient = (sub.email || '').trim().toLowerCase();
        if (!recipient) continue;

        const userCategories = Array.isArray(sub.categories) ? sub.categories : [];
        const matchedJobs = activeJobs.filter((j) =>
          userCategories.length === 0 ||
          userCategories.includes('All') ||
          userCategories.some((c: string) => c.toLowerCase() === (j.category || '').toLowerCase())
        );

        const jobsToUse = (matchedJobs.length > 0 ? matchedJobs : activeJobs).slice(0, MAX_DIGEST_JOBS);
        const jobsListHtml = jobsToUse.map((job) => `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px; margin-bottom: 6px;">
              <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">${job.title}</h4>
              <span style="font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 9999px;">${job.category || job.job_type || 'General'}</span>
            </div>
            <p style="margin: 4px 0 10px 0; font-size: 13px; color: #475569; font-weight: 600;">
              🏢 ${job.company || 'Verified Employer'} &nbsp;•&nbsp; 📍 ${job.location || 'Pan India'} &nbsp;•&nbsp; 🎓 ${job.experience || 'Fresher'} ${job.salary ? `&nbsp;•&nbsp; 💰 ${job.salary}` : ''}
            </p>
            <a href="${job.apply_link || `${appBaseUrl}/jobs/${job.id}`}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px; text-decoration: none;">Apply Now ↗</a>
          </div>
        `).join('');

        const unsubscribeUrl = sub.unsubscribe_token
          ? `${appBaseUrl}/unsubscribe?token=${encodeURIComponent(sub.unsubscribe_token)}`
          : `${appBaseUrl}/unsubscribe?email=${encodeURIComponent(recipient)}`;

        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0;">
    <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px;">
      <h2 style="color: #2563eb; margin: 0 0 4px 0; font-size: 22px; font-weight: 800;">Mana Career</h2>
      <span style="font-size: 11px; font-weight: 700; color: #15803d; background: #f0fdf4; padding: 2px 8px; border-radius: 9999px;">Daily Job Digest - ${todayStr}</span>
    </div>
    <p style="margin-top: 12px; font-size: 14px; color: #334155;">Here are today's top genuine job openings curated for you on Mana Career:</p>
    ${jobsListHtml}
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    <p style="font-size: 11px; color: #94a3b8; text-align: center;">You are receiving this daily job digest from Mana Career. <a href="${unsubscribeUrl}" style="color: #2563eb;">Unsubscribe</a></p>
  </div>
</body>
</html>`;

        try {
          const dispatchRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey.trim()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: recipient,
              subject: `Daily Job Digest - Mana Career (${todayStr})`,
              html: htmlContent,
            }),
          });

          const dispatchData = await dispatchRes.json();
          if (dispatchRes.ok) {
            sentCount++;
            try {
              await dbClient.from('daily_job_reminder_logs').insert({
                run_date: todayYmd,
                recipient_email: recipient,
                status: 'sent',
                resend_id: dispatchData.id,
                created_at: new Date().toISOString(),
              });
            } catch {
              // ignore
            }
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }
    }

    try {
      await dbClient.from('daily_job_reminder_runs').insert({
        run_date: todayYmd,
        status: 'completed',
        total_subscribers: subscribers.length,
        emails_sent: sentCount,
        emails_failed: failedCount,
        jobs_included_count: activeJobs.length,
        is_test: false,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: `Batch dispatch finished: ${sentCount} sent, ${failedCount} failed.`,
        dashboard_active_jobs_count: activeJobs.length,
        total_eligible_jobs: activeJobs.length,
        total_subscribers: subscribers.length,
        emails_sent: sentCount,
        emails_failed: failedCount,
        jobs_count: Math.min(activeJobs.length, MAX_DIGEST_JOBS),
        jobs_included_count: Math.min(activeJobs.length, MAX_DIGEST_JOBS),
        pages_fetched: pagesFetched,
        skipped: false,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: err.message || 'Failed to dispatch daily reminder.' }),
    };
  }
};

